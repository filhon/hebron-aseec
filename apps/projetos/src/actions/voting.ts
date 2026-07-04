"use server";

import { z } from "zod";
import { eq, and, count, countDistinct, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  votes,
  projects,
  projectVersions,
  roleAssignments,
} from "@hebron/db/schema";
import { VALID_STAGE_TRANSITIONS } from "@hebron/db/schema";
import { conselheiroDiretorAction, superAdminAction } from "../lib/safe-action";
import { logProjectAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// Helpers — take an explicit db/tx executor so they can run either against
// the singleton `db` or inside a `db.transaction(...)` callback.
// ---------------------------------------------------------------------------

// `Pick`, not `typeof db` directly: a `tx` from `db.transaction(...)` lacks
// the `$client` property that the full `PostgresJsDatabase` type carries,
// but has the same query-builder methods — which is all these helpers need.
type DbExecutor = Pick<typeof db, "select" | "update" | "insert">;

async function getVotingProject(executor: DbExecutor, projectId: string) {
  const rows = await executor
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId)))
    .limit(1);

  const project = rows[0];
  if (!project) throw new Error("Projeto não encontrado");
  if (project.stage !== "votacao")
    throw new Error("Projeto não está em fase de votação");
  return project;
}

// Conta PESSOAS distintas, não atribuições de papel (F2-P5): um usuário com
// diretor+conselheiro simultaneamente não pode contar duas vezes no quórum
// nem no total de elegíveis do fechamento automático.
async function countEligibleVoters(executor: DbExecutor): Promise<number> {
  const result = await executor
    .select({ count: countDistinct(roleAssignments.userId) })
    .from(roleAssignments)
    .where(inArray(roleAssignments.role, ["diretor", "conselheiro"]));

  return result[0]?.count ?? 0;
}

interface VoteResult {
  totalEligible: number;
  totalVoted: number;
  inFavor: number;
  against: number;
  quorumMet: boolean;
  approved: boolean | null;
}

async function computeVoteResult(
  executor: DbExecutor,
  projectId: string,
): Promise<VoteResult> {
  const totalEligible = await countEligibleVoters(executor);

  const projectVotes = await executor
    .select({ value: votes.value })
    .from(votes)
    .where(eq(votes.projectId, projectId));

  const totalVoted = projectVotes.length;
  const inFavor = projectVotes.filter((v) => v.value).length;
  const against = totalVoted - inFavor;

  // Quorum: ≥ 50% of eligible voters cast their vote
  const quorumMet = totalVoted >= Math.ceil(totalEligible / 2);

  // Simple majority among votes cast; null if quorum not met
  const approved = quorumMet ? inFavor > against : null;

  return { totalEligible, totalVoted, inFavor, against, quorumMet, approved };
}

async function getNextVersionNumber(
  executor: DbExecutor,
  projectId: string,
): Promise<number> {
  const result = await executor
    .select({ count: count() })
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId));

  return (result[0]?.count ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// castVote — secret vote; voter identity never exposed to other participants
//
// Votação é governança dual (decisão F3-Q4): o voto, a eventual transição de
// estágio e as entradas de audit correspondentes são atômicos — se o audit
// falhar, nada do voto é persistido.
// ---------------------------------------------------------------------------

export const castVote = conselheiroDiretorAction
  .schema(
    z.object({
      projectId: z.string().uuid("Projeto inválido"),
      // true = "Sinto paz em investir", false = "Não sinto paz"
      value: z.boolean(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    return db.transaction(async (tx) => {
      const project = await getVotingProject(tx, parsedInput.projectId);

      // Insert — unique constraint (project_id, user_id) blocks double voting
      await tx
        .insert(votes)
        .values({
          projectId: parsedInput.projectId,
          userId: ctx.actorId,
          value: parsedInput.value,
        })
        .onConflictDoNothing();

      // After every vote, re-check if quorum is now met and all eligible have voted
      const result = await computeVoteResult(tx, parsedInput.projectId);

      let stageTransitioned = false;

      if (result.quorumMet && result.approved !== null) {
        // All eligible voted or quorum reached with decisive majority — auto-close
        const totalEligible = await countEligibleVoters(tx);
        if (result.totalVoted >= totalEligible) {
          const newStage = result.approved
            ? "homologacao"
            : ("reprovado" as const);

          const validNextStages = VALID_STAGE_TRANSITIONS[project.stage];
          if ((validNextStages as string[]).includes(newStage)) {
            const versionNumber = await getNextVersionNumber(
              tx,
              parsedInput.projectId,
            );

            await tx
              .update(projects)
              .set({ stage: newStage, updatedAt: new Date() })
              .where(eq(projects.id, parsedInput.projectId));

            await tx.insert(projectVersions).values({
              projectId: parsedInput.projectId,
              versionNumber,
              stage: newStage,
              data: {
                trigger: "vote_complete",
                result,
                transitionedAt: new Date().toISOString(),
              },
              createdBy: ctx.actorId,
            });

            stageTransitioned = true;

            await logProjectAudit(
              {
                actorId: ctx.actorId,
                action: "project.stage_transition",
                entity: "project",
                entityId: parsedInput.projectId,
                diff: {
                  from: project.stage,
                  to: newStage,
                  trigger: "vote_complete",
                  result,
                },
              },
              tx,
            );
          }
        }
      }

      // Audit the vote itself (no user ID in diff — secret ballot)
      await logProjectAudit(
        {
          actorId: ctx.actorId,
          action: "vote.cast",
          entity: "vote",
          entityId: parsedInput.projectId,
          diff: {
            projectId: parsedInput.projectId,
            value: parsedInput.value,
            resultAfterVote: {
              totalVoted: result.totalVoted,
              quorumMet: result.quorumMet,
            },
          },
        },
        tx,
      );

      return { ok: true, result, stageTransitioned };
    });
  });

// ---------------------------------------------------------------------------
// closeVoting — super_admin fecha manualmente uma votação com quórum já
// atingido (F2-P6, decisão F2-Q5).
//
// Diferente de triggerPanicButton (a válvula de escape do BRAIN para "sem
// quórum"), closeVoting é o caminho comum: quórum atingido e maioria
// formada, mas turnout < 100% — sem isso a votação ficava aberta para
// sempre (nenhum job agendado força o fechamento). Exige quórum; se não
// atingido, orienta o uso do botão de pânico em vez de duplicar sua lógica.
// ---------------------------------------------------------------------------

export const closeVoting = superAdminAction
  .schema(
    z.object({
      projectId: z.string().uuid("Projeto inválido"),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    return db.transaction(async (tx) => {
      const project = await getVotingProject(tx, parsedInput.projectId);
      const result = await computeVoteResult(tx, parsedInput.projectId);

      if (!result.quorumMet) {
        throw new Error(
          "Quórum não atingido — use o botão de pânico para forçar o encerramento.",
        );
      }

      const newStage = result.approved
        ? ("homologacao" as const)
        : ("reprovado" as const);

      const versionNumber = await getNextVersionNumber(
        tx,
        parsedInput.projectId,
      );

      await tx
        .update(projects)
        .set({ stage: newStage, updatedAt: new Date() })
        .where(eq(projects.id, parsedInput.projectId));

      await tx.insert(projectVersions).values({
        projectId: parsedInput.projectId,
        versionNumber,
        stage: newStage,
        data: {
          trigger: "manual_close",
          actorId: ctx.actorId,
          result,
          transitionedAt: new Date().toISOString(),
        },
        createdBy: ctx.actorId,
      });

      await logProjectAudit(
        {
          actorId: ctx.actorId,
          action: "project.stage_transition",
          entity: "project",
          entityId: parsedInput.projectId,
          diff: {
            from: project.stage,
            to: newStage,
            trigger: "manual_close",
            result,
          },
        },
        tx,
      );

      return { ok: true, newStage, result };
    });
  });

// ---------------------------------------------------------------------------
// triggerPanicButton — super_admin force-closes voting
// "maioria+1 dos existentes": computes result from existing votes and closes
// ---------------------------------------------------------------------------

export const triggerPanicButton = superAdminAction
  .schema(
    z.object({
      projectId: z.string().uuid("Projeto inválido"),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    return db.transaction(async (tx) => {
      const project = await getVotingProject(tx, parsedInput.projectId);

      const result = await computeVoteResult(tx, parsedInput.projectId);

      // Force-decide: whichever side has majority among existing votes wins;
      // tie resolves to reprovado (conservative default).
      const approved = result.inFavor > result.against;
      const newStage = approved
        ? ("homologacao" as const)
        : ("reprovado" as const);

      const versionNumber = await getNextVersionNumber(
        tx,
        parsedInput.projectId,
      );

      await tx
        .update(projects)
        .set({ stage: newStage, updatedAt: new Date() })
        .where(eq(projects.id, parsedInput.projectId));

      await tx.insert(projectVersions).values({
        projectId: parsedInput.projectId,
        versionNumber,
        stage: newStage,
        data: {
          trigger: "panic_button",
          actorId: ctx.actorId,
          result,
          transitionedAt: new Date().toISOString(),
        },
        createdBy: ctx.actorId,
      });

      await logProjectAudit(
        {
          actorId: ctx.actorId,
          action: "vote.panic",
          entity: "project",
          entityId: parsedInput.projectId,
          diff: {
            from: project.stage,
            to: newStage,
            trigger: "panic_button",
            result,
          },
        },
        tx,
      );

      return { ok: true, newStage, result };
    });
  });

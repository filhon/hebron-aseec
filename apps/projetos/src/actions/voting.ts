"use server";

import { z } from "zod";
import { eq, and, count, countDistinct, inArray, isNull } from "drizzle-orm";
import {
  withAuthenticatedContext,
  withSystemRole,
  type AuthenticatedTx,
} from "@hebron/db/authenticated";
import {
  votes,
  projects,
  projectVersions,
  roleAssignments,
} from "@hebron/db/schema";
import { VALID_STAGE_TRANSITIONS } from "@hebron/db/schema";
import { conselheiroDiretorAction, superAdminAction } from "../lib/safe-action";
import { logProjectAudit } from "../lib/audit";
import {
  computeVoteResult,
  computeMajority,
  type VoteResult,
} from "../lib/vote-result";

// ---------------------------------------------------------------------------
// Helpers — take an explicit tx executor from withAuthenticatedContext.
// ---------------------------------------------------------------------------

type DbExecutor = Pick<AuthenticatedTx, "select" | "update" | "insert">;

async function getVotingProject(executor: DbExecutor, projectId: string) {
  const rows = await executor
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  const project = rows[0];
  if (!project) throw new Error("Projeto não encontrado");
  if (project.stage !== "votacao")
    throw new Error("Projeto não está em fase de votação");
  return project;
}

// Conta PESSOAS distintas, não atribuições de papel (F2-P5): um usuário com
// diretor+conselheiro simultaneamente não pode contar duas vezes no quórum
// nem no total de elegíveis do fechamento automático. `revokedAt IS NULL`
// (P-2.8b): um papel revogado não deve contar no denominador — o mesmo
// filtro de "papel ativo" usado por resolveSession/has_role, que já barra o
// voto desse usuário no gate da action.
async function countEligibleVoters(executor: DbExecutor): Promise<number> {
  const result = await executor
    .select({ count: countDistinct(roleAssignments.userId) })
    .from(roleAssignments)
    .where(
      and(
        inArray(roleAssignments.role, ["diretor", "conselheiro"]),
        isNull(roleAssignments.revokedAt),
      ),
    );

  return result[0]?.count ?? 0;
}

// Busca os números no banco e delega o cálculo (quórum, maioria, decisão)
// a computeVoteResult (lib/vote-result.ts) — única definição da fórmula no
// repositório, importada também pelos testes (P-2.12b).
async function getVoteResult(
  executor: AuthenticatedTx,
  projectId: string,
): Promise<VoteResult> {
  const totalEligible = await countEligibleVoters(executor);

  // O SELECT em votes é restrito a super_admin por RLS ("cédula secreta" —
  // nem o próprio diretor lê a cédula que lançou, migration 0009). Sem
  // isso, getVoteResult rodando no contexto autenticado de um
  // diretor/conselheiro comum sempre veria 0 votos, e o auto-close de
  // castVote nunca dispararia a não ser que o voto decisivo fosse de um
  // super_admin (achado P-2.8b). withSystemRole eleva só esta leitura
  // agregada, dentro da mesma transação — nunca expõe quem votou o quê,
  // só o total/maioria retornados aqui.
  const projectVotes = await withSystemRole(executor, (sysTx) =>
    sysTx
      .select({ value: votes.value })
      .from(votes)
      .where(eq(votes.projectId, projectId)),
  );

  const totalVoted = projectVotes.length;
  const inFavor = projectVotes.filter((v) => v.value).length;

  return computeVoteResult(totalEligible, totalVoted, inFavor);
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
// falhar, nada do voto é persistido. withSystemRole escapa a RLS só para o
// INSERT em admin.audit_log (policy é TO service_role), dentro da mesma tx.
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
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
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
      const result = await getVoteResult(tx, parsedInput.projectId);

      let stageTransitioned = false;

      if (result.quorumMet && result.approved !== null) {
        // All eligible voted or quorum reached with decisive majority — auto-close
        const totalEligible = await countEligibleVoters(tx);
        if (result.totalVoted >= totalEligible) {
          // O mapa de estágios (VALID_STAGE_TRANSITIONS) não permite
          // votacao → reprovado direto — toda votação conclusiva
          // (aprovação OU reprovação) entra em homologação; a reprovação se
          // confirma lá se ninguém contestar em 7 dias, no lugar de ficar
          // presa em votação sem decisão nenhuma (P-2.8b).
          const newStage = "homologacao" as const;

          const validNextStages = VALID_STAGE_TRANSITIONS[project.stage];
          if (!(validNextStages as string[]).includes(newStage)) {
            throw new Error(
              `Transição inválida: ${project.stage} → ${newStage}. ` +
                `Próximos estágios válidos: ${validNextStages.join(", ")}`,
            );
          }

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
              // Decisão real da votação — distinta de result.approved, que
              // é null quando o quórum não foi atingido (não é o caso
              // aqui, mas mantém o campo com o mesmo nome usado por
              // triggerPanicButton). Consultado por
              // runHomologacaoAutoApprove (packages/jobs) para não
              // aprovar por omissão uma votação que reprovou.
              voteApproved: result.approved,
              transitionedAt: new Date().toISOString(),
            },
            createdBy: ctx.actorId,
          });

          stageTransitioned = true;

          await withSystemRole(tx, (sysTx) =>
            logProjectAudit(
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
              sysTx,
            ),
          );
        }
      }

      // Audit the vote itself (no user ID in diff — secret ballot)
      await withSystemRole(tx, (sysTx) =>
        logProjectAudit(
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
          sysTx,
        ),
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
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const project = await getVotingProject(tx, parsedInput.projectId);
      const result = await getVoteResult(tx, parsedInput.projectId);

      if (!result.quorumMet) {
        throw new Error(
          "Quórum não atingido — use o botão de pânico para forçar o encerramento.",
        );
      }

      // Mesma regra de castVote: o mapa não permite votacao → reprovado
      // direto (P-2.8b).
      const newStage = "homologacao" as const;

      const validNextStages = VALID_STAGE_TRANSITIONS[project.stage];
      if (!(validNextStages as string[]).includes(newStage)) {
        throw new Error(
          `Transição inválida: ${project.stage} → ${newStage}. ` +
            `Próximos estágios válidos: ${validNextStages.join(", ")}`,
        );
      }

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
          voteApproved: result.approved,
          transitionedAt: new Date().toISOString(),
        },
        createdBy: ctx.actorId,
      });

      await withSystemRole(tx, (sysTx) =>
        logProjectAudit(
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
          sysTx,
        ),
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
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const project = await getVotingProject(tx, parsedInput.projectId);

      const result = await getVoteResult(tx, parsedInput.projectId);

      // Force-decide: whichever side has majority among existing votes wins;
      // tie resolves to reprovado (conservative default). A decisão é
      // aplicada em homologação, não escrita direto — mesmo mapa de
      // castVote/closeVoting (P-2.8b). Note que `approved` aqui é a decisão
      // FORÇADA (maioria entre os votos existentes, ignorando quórum) —
      // diferente de `result.approved`, que é null quando o quórum não foi
      // atingido (o caso normal de uso do botão de pânico).
      const approved = computeMajority(result.inFavor, result.against);
      const newStage = "homologacao" as const;

      const validNextStages = VALID_STAGE_TRANSITIONS[project.stage];
      if (!(validNextStages as string[]).includes(newStage)) {
        throw new Error(
          `Transição inválida: ${project.stage} → ${newStage}. ` +
            `Próximos estágios válidos: ${validNextStages.join(", ")}`,
        );
      }

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
          voteApproved: approved,
          transitionedAt: new Date().toISOString(),
        },
        createdBy: ctx.actorId,
      });

      await withSystemRole(tx, (sysTx) =>
        logProjectAudit(
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
          sysTx,
        ),
      );

      return { ok: true, newStage, result };
    });
  });

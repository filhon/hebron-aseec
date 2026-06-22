"use server";

import { z } from "zod";
import { eq, and, count, inArray } from "drizzle-orm";
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
// Helpers
// ---------------------------------------------------------------------------

async function getVotingProject(projectId: string) {
  const rows = await db
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

async function countEligibleVoters(): Promise<number> {
  const result = await db
    .select({ count: count() })
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

async function computeVoteResult(projectId: string): Promise<VoteResult> {
  const totalEligible = await countEligibleVoters();

  const projectVotes = await db
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

async function getNextVersionNumber(projectId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId));

  return (result[0]?.count ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// castVote — secret vote; voter identity never exposed to other participants
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
    const project = await getVotingProject(parsedInput.projectId);

    // Insert — unique constraint (project_id, user_id) blocks double voting
    await db
      .insert(votes)
      .values({
        projectId: parsedInput.projectId,
        userId: ctx.actorId,
        value: parsedInput.value,
      })
      .onConflictDoNothing();

    // After every vote, re-check if quorum is now met and all eligible have voted
    const result = await computeVoteResult(parsedInput.projectId);

    let stageTransitioned = false;

    if (result.quorumMet && result.approved !== null) {
      // All eligible voted or quorum reached with decisive majority — auto-close
      const totalEligible = await countEligibleVoters();
      if (result.totalVoted >= totalEligible) {
        const newStage = result.approved
          ? "homologacao"
          : ("reprovado" as const);

        const validNextStages = VALID_STAGE_TRANSITIONS[project.stage];
        if ((validNextStages as string[]).includes(newStage)) {
          const versionNumber = await getNextVersionNumber(
            parsedInput.projectId,
          );

          await db
            .update(projects)
            .set({ stage: newStage, updatedAt: new Date() })
            .where(eq(projects.id, parsedInput.projectId));

          await db.insert(projectVersions).values({
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

          await logProjectAudit({
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
          });
        }
      }
    }

    // Audit the vote itself (no user ID in diff — secret ballot)
    await logProjectAudit({
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
    });

    return { ok: true, result, stageTransitioned };
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
    const project = await getVotingProject(parsedInput.projectId);

    const result = await computeVoteResult(parsedInput.projectId);

    // Force-decide: whichever side has majority among existing votes wins;
    // tie resolves to reprovado (conservative default).
    const approved = result.inFavor > result.against;
    const newStage = approved
      ? ("homologacao" as const)
      : ("reprovado" as const);

    const versionNumber = await getNextVersionNumber(parsedInput.projectId);

    await db
      .update(projects)
      .set({ stage: newStage, updatedAt: new Date() })
      .where(eq(projects.id, parsedInput.projectId));

    await db.insert(projectVersions).values({
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

    await logProjectAudit({
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
    });

    return { ok: true, newStage, result };
  });

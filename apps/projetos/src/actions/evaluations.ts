"use server";

import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { evaluations, projects } from "@hebron/db/schema";
import { createEvaluationSchema } from "@hebron/validators/projetos";
import { diretorAction, projetosAction } from "../lib/safe-action";
import { logProjectAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const assignEvaluatorSchema = z.object({
  projectId: z.string().uuid("Projeto inválido"),
  evaluatorId: z.string().uuid("Avaliador inválido"),
});

const submitEvaluationSchema = createEvaluationSchema.extend({
  score: z.number().min(0).max(100).optional().nullable(),
  scoreBreakdown: z.record(z.number()).optional().nullable(),
});

// ---------------------------------------------------------------------------
// assignEvaluator — diretor/super_admin designates an evaluator
// ---------------------------------------------------------------------------

export const assignEvaluator = diretorAction
  .schema(assignEvaluatorSchema)
  .action(async ({ parsedInput, ctx }) => {
    const evaluation = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        // Verify project is in validacao stage
        const projectRows = await tx
          .select({ stage: projects.stage, deletedAt: projects.deletedAt })
          .from(projects)
          .where(eq(projects.id, parsedInput.projectId))
          .limit(1);

        const project = projectRows[0];
        if (!project) throw new Error("Projeto não encontrado");
        if (project.deletedAt) throw new Error("Projeto excluído");
        if (project.stage !== "validacao") {
          throw new Error(
            `Avaliadores só podem ser designados durante a validação (estágio atual: ${project.stage})`,
          );
        }

        // Insert or update evaluation record for this evaluator
        const existingRows = await tx
          .select({ id: evaluations.id })
          .from(evaluations)
          .where(
            and(
              eq(evaluations.projectId, parsedInput.projectId),
              eq(evaluations.evaluatorId, parsedInput.evaluatorId),
            ),
          )
          .limit(1);

        if (existingRows[0]) {
          throw new Error("Este avaliador já foi designado para este projeto");
        }

        const inserted = await tx
          .insert(evaluations)
          .values({
            projectId: parsedInput.projectId,
            evaluatorId: parsedInput.evaluatorId,
          })
          .returning();

        const evaluation = inserted[0];
        if (!evaluation) throw new Error("Falha ao designar avaliador");
        return evaluation;
      },
    );

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "evaluation.assigned",
      entity: "evaluation",
      entityId: evaluation.id,
      diff: {
        projectId: parsedInput.projectId,
        evaluatorId: parsedInput.evaluatorId,
        assignedBy: ctx.actorId,
      },
    });

    return { evaluation };
  });

// ---------------------------------------------------------------------------
// submitEvaluation — the designated evaluator submits their opinion
// ---------------------------------------------------------------------------

export const submitEvaluation = projetosAction
  .schema(submitEvaluationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const finalEvaluation = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        // Find the evaluation assigned to this actor for this project
        const evalRows = await tx
          .select()
          .from(evaluations)
          .where(
            and(
              eq(evaluations.projectId, parsedInput.projectId),
              eq(evaluations.evaluatorId, ctx.actorId),
              isNull(evaluations.submittedAt),
            ),
          )
          .limit(1);

        const evaluation = evalRows[0];
        if (!evaluation) {
          throw new Error(
            "Avaliação não encontrada ou você não é o avaliador designado",
          );
        }

        // Verify project is still in validacao
        const projectRows = await tx
          .select({ stage: projects.stage, deletedAt: projects.deletedAt })
          .from(projects)
          .where(eq(projects.id, parsedInput.projectId))
          .limit(1);

        const project = projectRows[0];
        if (!project) throw new Error("Projeto não encontrado");
        if (project.deletedAt) throw new Error("Projeto excluído");
        if (project.stage !== "validacao") {
          throw new Error(
            "O projeto não está mais em fase de validação — avaliação encerrada",
          );
        }

        const now = new Date();

        const updated = await tx
          .update(evaluations)
          .set({
            recommendation: parsedInput.recommendation,
            notes: parsedInput.notes,
            score: parsedInput.score?.toString() ?? null,
            scoreBreakdown: parsedInput.scoreBreakdown ?? null,
            submittedAt: now,
            updatedAt: now,
          })
          .where(eq(evaluations.id, evaluation.id))
          .returning();

        const finalEvaluation = updated[0];
        if (!finalEvaluation) throw new Error("Falha ao registrar avaliação");
        return finalEvaluation;
      },
    );

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "evaluation.submitted",
      entity: "evaluation",
      entityId: finalEvaluation.id,
      diff: {
        projectId: parsedInput.projectId,
        recommendation: parsedInput.recommendation,
        score: parsedInput.score,
        submittedAt:
          finalEvaluation.submittedAt?.toISOString() ??
          new Date().toISOString(),
      },
    });

    return { evaluation: finalEvaluation };
  });

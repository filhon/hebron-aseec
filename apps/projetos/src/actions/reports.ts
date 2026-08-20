"use server";

import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  type AuthenticatedTx,
} from "@hebron/db/authenticated";
import { reports, reportAttachments, projects } from "@hebron/db/schema";
import { createReportSchema } from "@hebron/validators/projetos";
import { diretorAction, projetosAction } from "../lib/safe-action";
import { logProjectAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const submitReportSchema = z.object({
  reportId: z.string().uuid("Relatório inválido"),
  content: z
    .string()
    .min(100, "Relatório deve ter pelo menos 100 caracteres")
    .max(10000),
  attachments: z
    .array(
      z.object({
        fileUrl: z.string().url("URL do arquivo inválida"),
        fileName: z.string().min(1).max(255),
        fileSize: z.number().int().positive().optional(),
      }),
    )
    .optional(),
});

const reviewReportSchema = z
  .object({
    reportId: z.string().uuid("Relatório inválido"),
    decision: z.enum(["approved", "rejected"], {
      required_error: "Decisão obrigatória",
    }),
    notes: z.string().max(2000).optional(),
  })
  .refine(
    (data) =>
      data.decision !== "rejected" || (data.notes?.trim().length ?? 0) > 0,
    {
      message: "Parecer obrigatório para rejeitar um relatório",
      path: ["notes"],
    },
  );

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getProjectForReport(
  tx: AuthenticatedTx,
  projectId: string,
  actorId: string,
  roles: string[],
) {
  const projectRows = await tx
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  const project = projectRows[0];
  if (!project) throw new BusinessError("Projeto não encontrado");

  if (project.stage !== "em_execucao" && project.stage !== "concluido") {
    throw new BusinessError(
      "Relatórios só podem ser criados para projetos em execução ou concluídos",
    );
  }

  const isSuperAdmin = roles.includes("super_admin");
  const isDiretor = roles.includes("diretor");
  const isSubmitter = project.submitterId === actorId;

  if (!isSuperAdmin && !isDiretor && !isSubmitter) {
    throw new BusinessError(
      "Acesso negado: apenas o submissor ou a diretoria podem gerenciar relatórios",
    );
  }

  return project;
}

// ---------------------------------------------------------------------------
// createReport — diretor creates the report shell; submissor fills it
// ---------------------------------------------------------------------------

export const createReport = diretorAction
  .schema(createReportSchema)
  .action(async ({ parsedInput, ctx }) => {
    const report = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const projectRows = await tx
          .select({
            id: projects.id,
            stage: projects.stage,
            deletedAt: projects.deletedAt,
          })
          .from(projects)
          .where(
            and(
              eq(projects.id, parsedInput.projectId),
              isNull(projects.deletedAt),
            ),
          )
          .limit(1);

        const project = projectRows[0];
        if (!project) throw new BusinessError("Projeto não encontrado");
        if (project.stage !== "em_execucao" && project.stage !== "concluido") {
          throw new BusinessError(
            "Relatórios só podem ser criados para projetos em execução",
          );
        }

        const inserted = await tx
          .insert(reports)
          .values({
            projectId: parsedInput.projectId,
            periodStart: parsedInput.periodStart,
            periodEnd: parsedInput.periodEnd,
            dueDate: parsedInput.dueDate,
            content: parsedInput.content ?? null,
            status: "pendente",
          })
          .returning();

        const report = inserted[0];
        if (!report) throw new BusinessError("Falha ao criar relatório");
        return report;
      },
    );

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "report.created",
      entity: "report",
      entityId: report.id,
      diff: {
        projectId: parsedInput.projectId,
        periodStart: parsedInput.periodStart,
        periodEnd: parsedInput.periodEnd,
        dueDate: parsedInput.dueDate,
      },
    });

    return { report };
  });

// ---------------------------------------------------------------------------
// submitReport — submissor fills and submits the report
// ---------------------------------------------------------------------------

export const submitReport = projetosAction
  .schema(submitReportSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { finalReport, projectId, now } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        // Fetch report
        const reportRows = await tx
          .select()
          .from(reports)
          .where(eq(reports.id, parsedInput.reportId))
          .limit(1);

        const report = reportRows[0];
        if (!report) throw new BusinessError("Relatório não encontrado");
        if (report.status !== "pendente") {
          throw new BusinessError(
            "Apenas relatórios pendentes podem ser submetidos",
          );
        }

        // Verify actor is the project's submitter OR diretor/super_admin
        await getProjectForReport(tx, report.projectId, ctx.actorId, ctx.roles);

        const now = new Date();

        const updated = await tx
          .update(reports)
          .set({
            content: parsedInput.content,
            status: "submitted",
            submittedBy: ctx.actorId,
            submittedAt: now,
            updatedAt: now,
          })
          .where(eq(reports.id, parsedInput.reportId))
          .returning();

        const finalReport = updated[0];
        if (!finalReport)
          throw new BusinessError("Falha ao submeter relatório");

        // Insert attachments if provided
        if (parsedInput.attachments && parsedInput.attachments.length > 0) {
          await tx.insert(reportAttachments).values(
            parsedInput.attachments.map((a) => ({
              reportId: parsedInput.reportId,
              fileUrl: a.fileUrl,
              fileName: a.fileName,
              fileSize: a.fileSize ?? null,
              uploadedBy: ctx.actorId,
            })),
          );
        }

        return { finalReport, projectId: report.projectId, now };
      },
    );

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "report.submitted",
      entity: "report",
      entityId: parsedInput.reportId,
      diff: {
        projectId,
        status: { before: "pendente", after: "submitted" },
        attachmentCount: parsedInput.attachments?.length ?? 0,
        submittedAt: now.toISOString(),
      },
    });

    return { report: finalReport };
  });

// ---------------------------------------------------------------------------
// reviewReport — diretor approves or rejects a submitted report
// ---------------------------------------------------------------------------

export const reviewReport = diretorAction
  .schema(reviewReportSchema)
  .action(async ({ parsedInput, ctx }) => {
    const notes = parsedInput.notes?.trim() || null;

    const { finalReport, projectId, now } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const reportRows = await tx
          .select()
          .from(reports)
          .where(eq(reports.id, parsedInput.reportId))
          .limit(1);

        const report = reportRows[0];
        if (!report) throw new BusinessError("Relatório não encontrado");
        if (report.status !== "submitted") {
          throw new BusinessError(
            "Apenas relatórios submetidos podem ser revisados",
          );
        }

        // Rejeição reabre o ciclo: o relatório volta a "pendente" (não fica
        // em "rejected", estado terminal) para que o submissor possa
        // reenviar e o cron de inadimplência — que só olha status
        // "pendente" — continue alcançando o projeto (P-2.6b).
        const newStatus =
          parsedInput.decision === "approved" ? "approved" : "pendente";
        const now = new Date();

        const updated = await tx
          .update(reports)
          .set({
            status: newStatus,
            reviewedBy: ctx.actorId,
            reviewedAt: now,
            reviewNotes: notes,
            // Limpa o envio anterior ao reabrir: "submitted_at" também é o
            // portão da policy de RLS que libera UPDATE para o submissor
            // (reports_update_own_or_admin exige submitted_at IS NULL) — sem
            // isso o relatório reaberto ficaria com status "pendente" mas
            // ainda travado para reenvio. O envio original permanece
            // recuperável via admin.audit_log (report.submitted), que é
            // imutável.
            ...(newStatus === "pendente"
              ? { submittedAt: null, submittedBy: null }
              : {}),
            updatedAt: now,
          })
          .where(eq(reports.id, parsedInput.reportId))
          .returning();

        const finalReport = updated[0];
        if (!finalReport) throw new BusinessError("Falha ao revisar relatório");

        return { finalReport, projectId: report.projectId, now };
      },
    );

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "report.reviewed",
      entity: "report",
      entityId: parsedInput.reportId,
      diff: {
        projectId,
        status: { before: "submitted", after: finalReport.status },
        decision: parsedInput.decision,
        notes,
        reviewedAt: now.toISOString(),
      },
    });

    return { report: finalReport };
  });

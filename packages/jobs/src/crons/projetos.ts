import { and, eq, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  contestations,
  evaluations,
  meetingSessions,
  projects,
  projectVersions,
  reports,
} from "@hebron/db/schema";
import {
  generatePaymentSchedule,
  onProjectApproved,
} from "@hebron/db/projetos-approval";
import { getSystemActorId } from "@hebron/db/system-actor";
import { logAudit } from "@hebron/db/audit";
import type { ReportReminderType } from "@hebron/email/templates/report-reminder";
import {
  notifyPendingEvaluations,
  notifyProjectDecision,
  notifyReportReminder,
} from "../notify/projetos";
import { inngest } from "../client";

const HOMOLOGACAO_WINDOW_DAYS = 7;

/**
 * Dias de carência após o vencimento de um relatório até o prazo final de
 * "expiração" (após o qual pagamentos podem ser bloqueados permanentemente
 * — ver `notifyProjectBlocked`, ainda não automatizado). Não havia decisão
 * prévia do Filipe sobre este número; fixado em 30 dias (documentado aqui,
 * não silencioso) — o lembrete "seven_days_before_expiry" dispara 7 dias
 * antes desse limite, ou seja, `dueDate + 23 dias`.
 */
const REPORT_EXPIRY_GRACE_DAYS = 30;

function dateOnlyUTC(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  const iso = d.toISOString().split("T")[0];
  if (!iso) throw new Error("Invalid date");
  return iso;
}

// ---------------------------------------------------------------------------
// Lembretes de relatório — fecha o critério [~] de P-2.10 ("Relatório
// pendente: 3 lembretes (7d antes, no dia, 7d antes de expirar)").
// `notifyReportReminder` já existia pronta (apps/projetos, P-2.10), sem
// scheduler — movida para packages/jobs/src/notify/projetos.ts (P-0.14).
// ---------------------------------------------------------------------------

async function findPendingReportsDueOn(dueDate: string) {
  return db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.status, "pendente"), eq(reports.dueDate, dueDate)));
}

export async function runReportReminders(): Promise<void> {
  const windows: [ReportReminderType, string][] = [
    ["seven_days_before", dateOnlyUTC(7)],
    ["due_today", dateOnlyUTC(0)],
    ["seven_days_before_expiry", dateOnlyUTC(-(REPORT_EXPIRY_GRACE_DAYS - 7))],
  ];

  for (const [reminderType, dueDate] of windows) {
    const pending = await findPendingReportsDueOn(dueDate);
    for (const report of pending) {
      await notifyReportReminder(report.id, reminderType);
    }
  }
}

export const reportRemindersCron = inngest.createFunction(
  {
    id: "projetos-report-reminders",
    name: "Projetos: lembretes de relatório pendente",
  },
  { cron: "0 8 * * *" },
  async ({ step }) => step.run("run-report-reminders", runReportReminders),
);

// ---------------------------------------------------------------------------
// Lembrete de avaliações pendentes 7 dias antes da reunião — fecha o
// segundo critério [~] de P-2.10.
// ---------------------------------------------------------------------------

export async function runEvaluationReminders(): Promise<void> {
  const windowStart = new Date(dateOnlyUTC(HOMOLOGACAO_WINDOW_DAYS));
  const windowEnd = new Date(windowStart);
  windowEnd.setUTCHours(23, 59, 59, 999);

  const upcomingMeetings = await db
    .select({ id: meetingSessions.id, date: meetingSessions.date })
    .from(meetingSessions)
    .where(
      and(
        eq(meetingSessions.type, "mensal"),
        eq(meetingSessions.status, "scheduled"),
      ),
    );

  const meeting = upcomingMeetings.find(
    (m) => m.date >= windowStart && m.date <= windowEnd,
  );
  if (!meeting) return;

  const pending = await db
    .select({
      evaluatorId: evaluations.evaluatorId,
      projectTitle: projects.title,
    })
    .from(evaluations)
    .innerJoin(projects, eq(projects.id, evaluations.projectId))
    .where(and(isNull(evaluations.submittedAt), isNull(projects.deletedAt)));

  const byEvaluator = new Map<string, string[]>();
  for (const row of pending) {
    const list = byEvaluator.get(row.evaluatorId) ?? [];
    list.push(row.projectTitle);
    byEvaluator.set(row.evaluatorId, list);
  }

  for (const [evaluatorId, titles] of byEvaluator) {
    await notifyPendingEvaluations(evaluatorId, meeting.date, titles);
  }
}

export const evaluationRemindersCron = inngest.createFunction(
  {
    id: "projetos-evaluation-reminders",
    name: "Projetos: lembrete de avaliações pendentes (7 dias antes da reunião)",
  },
  { cron: "0 8 * * *" },
  async ({ step }) =>
    step.run("run-evaluation-reminders", runEvaluationReminders),
);

// ---------------------------------------------------------------------------
// Homologação automática após 7 dias sem contestação — CS de P-2.8: a
// notificação de entrada em homologação já prometia isso desde P-2.6
// (`notifyHomologacao`, apps/projetos/src/actions/projects.ts) mas nenhum
// executor existia (achado da auditoria, AUDIT/01-specs.md:107). A idade em
// homologação é derivada de `project_versions` (snapshot criado em toda
// transição, inclusive a de entrada em homologação — não há coluna
// dedicada). Replica o ramo "aprovado" de `transitionProjectStage`
// (apps/projetos/src/actions/projects.ts) usando o ator sistema.
//
// P-2.8b: votacao → homologacao é o único destino que o mapa de estágios
// permite, mesmo quando a votação REPROVA (castVote/closeVoting/
// triggerPanicButton, apps/projetos/src/actions/voting.ts). Esses três
// caminhos gravam `voteApproved: false` no snapshot de entrada em
// homologação. Sem esse ramo, este cron aprovaria por omissão qualquer
// projeto reprovado que ninguém lembrasse de contestar manualmente em 7
// dias — invertendo o resultado da votação. Snapshots sem o campo (entrada
// manual via transitionProjectStage) preservam o comportamento histórico
// de aprovação automática.
// ---------------------------------------------------------------------------

async function getNextVersionNumber(projectId: string): Promise<number> {
  const rows = await db
    .select({ versionNumber: projectVersions.versionNumber })
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId));
  return rows.length + 1;
}

export async function runHomologacaoAutoApprove(): Promise<{
  approved: string[];
  rejected: string[];
}> {
  const actorId = await getSystemActorId();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - HOMOLOGACAO_WINDOW_DAYS);

  const candidates = await db
    .select()
    .from(projects)
    .where(and(eq(projects.stage, "homologacao"), isNull(projects.deletedAt)));

  const approved: string[] = [];
  const rejected: string[] = [];

  for (const project of candidates) {
    const [existingContestation] = await db
      .select({ id: contestations.id })
      .from(contestations)
      .where(eq(contestations.projectId, project.id))
      .limit(1);
    if (existingContestation) continue; // defensivo — createContestation já reverte para votacao

    const [latestHomologVersion] = await db
      .select({
        createdAt: projectVersions.createdAt,
        data: projectVersions.data,
      })
      .from(projectVersions)
      .where(
        and(
          eq(projectVersions.projectId, project.id),
          eq(projectVersions.stage, "homologacao"),
        ),
      )
      .orderBy(projectVersions.versionNumber)
      .limit(1);

    // Sem snapshot de entrada em homologação (dado inconsistente) ou ainda
    // dentro da janela de contestação — não é elegível.
    if (!latestHomologVersion || latestHomologVersion.createdAt > cutoff)
      continue;

    const now = new Date();
    const snapshotData = latestHomologVersion.data as {
      voteApproved?: boolean;
    };

    if (snapshotData.voteApproved === false) {
      const [updated] = await db
        .update(projects)
        .set({ stage: "reprovado", updatedAt: now })
        .where(eq(projects.id, project.id))
        .returning();
      if (!updated) continue;

      const versionNumber = await getNextVersionNumber(project.id);
      await db.insert(projectVersions).values({
        projectId: project.id,
        versionNumber,
        stage: "reprovado",
        data: {
          ...updated,
          _source: "homologacao-auto-resolve-cron",
          transitionedAt: now.toISOString(),
          transitionedBy: actorId,
        },
        createdBy: actorId,
      });

      await logAudit({
        actorId,
        action: "project.stage_transition",
        entity: "project",
        entityId: project.id,
        diff: {
          from: "homologacao",
          to: "reprovado",
          notes: `Reprovação confirmada automaticamente após ${HOMOLOGACAO_WINDOW_DAYS} dias sem contestação.`,
          transitionedAt: now.toISOString(),
        },
      });

      await notifyProjectDecision(project.id, false);
      rejected.push(project.id);
      continue;
    }

    const [updated] = await db
      .update(projects)
      .set({ stage: "aprovado", approvedAt: now, updatedAt: now })
      .where(eq(projects.id, project.id))
      .returning();
    if (!updated) continue;

    const versionNumber = await getNextVersionNumber(project.id);
    await db.insert(projectVersions).values({
      projectId: project.id,
      versionNumber,
      stage: "aprovado",
      data: {
        ...updated,
        _source: "homologacao-auto-approve-cron",
        transitionedAt: now.toISOString(),
        transitionedBy: actorId,
      },
      createdBy: actorId,
    });

    if (updated.parcelas && updated.meses && updated.budgetTotal) {
      await generatePaymentSchedule(updated);
    }
    onProjectApproved(project.id).catch((err: unknown) =>
      console.error("[jobs/projetos] onProjectApproved failed:", err),
    );

    await logAudit({
      actorId,
      action: "project.stage_transition",
      entity: "project",
      entityId: project.id,
      diff: {
        from: "homologacao",
        to: "aprovado",
        notes: `Aprovação automática após ${HOMOLOGACAO_WINDOW_DAYS} dias sem contestação.`,
        transitionedAt: now.toISOString(),
      },
    });

    await notifyProjectDecision(project.id, true);
    approved.push(project.id);
  }

  return { approved, rejected };
}

export const homologacaoAutoApproveCron = inngest.createFunction(
  {
    id: "projetos-homologacao-auto-approve",
    name: "Projetos: resolução automática de homologação após 7 dias sem contestação",
  },
  { cron: "0 3 * * *" },
  async ({ step }) =>
    step.run("run-homologacao-auto-approve", runHomologacaoAutoApprove),
);

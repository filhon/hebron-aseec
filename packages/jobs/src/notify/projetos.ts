import * as React from "react";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { projects, reports, roleAssignments, users } from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { ProjectStatusChangeEmail } from "@hebron/email/templates/project-status-change";
import type { ProjectStatusEvent } from "@hebron/email/templates/project-status-change";
import { ReportReminderEmail } from "@hebron/email/templates/report-reminder";
import type { ReportReminderType } from "@hebron/email/templates/report-reminder";
import { EvaluationReminderEmail } from "@hebron/email/templates/evaluation-reminder";
import { getDbTemplate, applyVars } from "../lib/templates";

const PROJETOS_BASE_URL =
  process.env.NEXT_PUBLIC_PROJETOS_URL ?? "https://projetos.hebronaseec.com.br";

// Rotas reais do app (P-2.10b — não existe `/projetos/<id>`): submissor em
// `(submissor)/[id]`, diretoria em `(diretoria)/pipeline/[id]`.
function submissorHref(projectId: string): string {
  return `/${projectId}`;
}

function diretoriaHref(projectId: string): string {
  return `/pipeline/${projectId}`;
}

function buildSubmissorProjectUrl(projectId: string): string {
  return `${PROJETOS_BASE_URL}${submissorHref(projectId)}`;
}

function buildDiretoriaProjectUrl(projectId: string): string {
  return `${PROJETOS_BASE_URL}${diretoriaHref(projectId)}`;
}

const makeInsert = makeNotificationInserter;

type UserRecord = { id: string; fullName: string | null; email: string };

async function getUsersByRoles(
  roles: Array<(typeof roleAssignments.role.enumValues)[number]>,
): Promise<UserRecord[]> {
  const ids = await db
    .selectDistinct({ userId: roleAssignments.userId })
    .from(roleAssignments)
    .where(inArray(roleAssignments.role, roles));

  if (!ids.length) return [];

  return db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(
      and(
        inArray(
          users.id,
          ids.map((r) => r.userId),
        ),
        isNull(users.suspendedAt),
      ),
    );
}

/**
 * Movida de `apps/projetos/src/lib/notifications.ts` (P-0.14) — sem nenhum
 * caller na app (o módulo inteiro daquele arquivo ainda não é chamado por
 * nada — achado desta sessão, fora do escopo de P-0.14 consertar). Agora é a
 * notificação disparada pelo cron de homologação automática
 * (`../crons/projetos.ts`), que também chama esta função para a mesma
 * decisão que um `closeVoting` manual (futuro, P-2.9c) precisaria notificar.
 */
export async function notifyProjectDecision(
  projectId: string,
  approved: boolean,
): Promise<void> {
  const [project] = await db
    .select({
      title: projects.title,
      submitterId: projects.submitterId,
      submitterName: users.fullName,
      submitterEmail: users.email,
    })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.submitterId))
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return;

  const url = buildSubmissorProjectUrl(projectId);
  const resendApiKey = process.env.RESEND_API_KEY;
  const statusEvent: ProjectStatusEvent = approved ? "aprovado" : "reprovado";
  const displayName = project.submitterName ?? project.submitterEmail;
  const subject = approved
    ? `Projeto aprovado: ${project.title}`
    : `Atualização sobre seu projeto: ${project.title}`;
  const tpl = await getDbTemplate(
    approved ? "projetos-approved" : "projetos-rejected",
  );
  const emailOpts = tpl
    ? applyVars(tpl, { nome: displayName, titulo: project.title, link: url })
    : null;

  await createNotification({
    insert: makeInsert(),
    resendApiKey,
    data: {
      userId: project.submitterId,
      channel: "email",
      type: approved ? "project.approved" : "project.rejected",
      title: subject,
      body: approved
        ? "Seu projeto foi aprovado pela diretoria."
        : "Seu projeto não foi aprovado neste ciclo.",
      payload: {
        module: "projetos",
        projectId,
        href: submissorHref(projectId),
      },
    },
    email: emailOpts
      ? { to: project.submitterEmail, ...emailOpts }
      : {
          to: project.submitterEmail,
          subject,
          template: React.createElement(ProjectStatusChangeEmail, {
            recipientName: displayName,
            projectTitle: project.title,
            statusEvent,
            projectUrl: url,
          }),
        },
  });
}

/** Movida de `apps/projetos/src/lib/notifications.ts` (P-0.14) — sem
 * nenhum caller na app; agora é chamada pelo cron diário de lembrete de
 * relatório (`../crons/projetos.ts`), que fecha o critério [~] de P-2.10. */
export async function notifyReportReminder(
  reportId: string,
  reminderType: ReportReminderType,
): Promise<void> {
  const [row] = await db
    .select({
      dueDate: reports.dueDate,
      projectId: reports.projectId,
      projectTitle: projects.title,
      submitterId: projects.submitterId,
      submitterName: users.fullName,
      submitterEmail: users.email,
    })
    .from(reports)
    .innerJoin(projects, eq(projects.id, reports.projectId))
    .innerJoin(users, eq(users.id, projects.submitterId))
    .where(eq(reports.id, reportId))
    .limit(1);

  if (!row) return;

  const url = buildSubmissorProjectUrl(row.projectId);
  const href = submissorHref(row.projectId);
  const resendApiKey = process.env.RESEND_API_KEY;
  const dueDate = row.dueDate ? new Date(row.dueDate) : new Date();
  const displayName = row.submitterName ?? row.submitterEmail;

  const REMINDER_SLUGS: Record<ReportReminderType, string> = {
    seven_days_before: "report-reminder-7d-before",
    due_today: "report-reminder-due-today",
    seven_days_before_expiry: "report-reminder-expiry",
  };
  const TITLES: Record<ReportReminderType, string> = {
    seven_days_before: `Relatório vence em 7 dias: ${row.projectTitle}`,
    due_today: `Relatório vence hoje: ${row.projectTitle}`,
    seven_days_before_expiry: `Relatório em atraso: ${row.projectTitle}`,
  };
  const title = TITLES[reminderType];
  const tpl = await getDbTemplate(REMINDER_SLUGS[reminderType]);
  const dueDateStr = dueDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const emailOpts = tpl
    ? applyVars(tpl, {
        nome: displayName,
        titulo: row.projectTitle,
        prazo: dueDateStr,
        link: url,
      })
    : null;

  await Promise.allSettled([
    createNotification({
      insert: makeInsert(),
      data: {
        userId: row.submitterId,
        channel: "in_app",
        type: `report.reminder.${reminderType}`,
        title,
        body: `Verifique o prazo do relatório do projeto ${row.projectTitle}.`,
        payload: {
          module: "projetos",
          projectId: row.projectId,
          reportId,
          href,
        },
      },
    }),
    createNotification({
      insert: makeInsert(),
      resendApiKey,
      data: {
        userId: row.submitterId,
        channel: "email",
        type: `report.reminder.${reminderType}`,
        title,
        body: `Verifique o prazo do relatório do projeto ${row.projectTitle}.`,
        payload: {
          module: "projetos",
          projectId: row.projectId,
          reportId,
          href,
        },
      },
      email: emailOpts
        ? { to: row.submitterEmail, ...emailOpts }
        : {
            to: row.submitterEmail,
            subject: title,
            template: React.createElement(ReportReminderEmail, {
              recipientName: displayName,
              projectTitle: row.projectTitle,
              reminderType,
              dueDate,
              projectUrl: url,
            }),
          },
    }),
  ]);
}

/**
 * Nova (P-0.14) — fecha o segundo critério [~] de P-2.10: "Lista de projetos
 * designados → avaliador (7d antes da reunião)". Um avaliador com avaliações
 * pendentes (`evaluations.submittedAt IS NULL`) recebe a lista de títulos
 * dos projetos que faltam avaliar antes da próxima reunião mensal.
 */
export async function notifyPendingEvaluations(
  evaluatorId: string,
  meetingDate: Date,
  projectTitles: string[],
): Promise<void> {
  const [evaluator] = await db
    .select({ fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, evaluatorId))
    .limit(1);

  if (!evaluator || !projectTitles.length) return;

  const resendApiKey = process.env.RESEND_API_KEY;
  const displayName = evaluator.fullName ?? evaluator.email;
  const meetingDateStr = meetingDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const title = `Avaliações pendentes para a reunião de ${meetingDateStr}`;
  const body = `Você tem ${projectTitles.length} avaliação(ões) pendente(s): ${projectTitles.join(", ")}.`;
  const tpl = await getDbTemplate("projetos-evaluation-reminder");
  const emailOpts = tpl
    ? applyVars(tpl, {
        nome: displayName,
        reuniao: meetingDateStr,
        projetos: projectTitles.join(", "),
        quantidade: String(projectTitles.length),
      })
    : null;

  await createNotification({
    insert: makeInsert(),
    resendApiKey,
    data: {
      userId: evaluatorId,
      channel: "email",
      type: "project.evaluation.reminder",
      title,
      body,
      // Sem projectIds neste payload (só títulos, para exibição no email) —
      // não há um único projeto para linkar; aponta para a lista da
      // diretoria. module/href em todo produtor deste módulo, mesmo em
      // canal email (P-2.10b, mesma regra de P-0.6c para payload.module).
      payload: {
        module: "projetos",
        meetingDate: meetingDate.toISOString(),
        projectTitles,
        href: "/pipeline",
      },
    },
    email: emailOpts
      ? { to: evaluator.email, ...emailOpts }
      : {
          to: evaluator.email,
          subject: title,
          template: React.createElement(EvaluationReminderEmail, {
            recipientName: displayName,
            meetingDateStr,
            projectTitles,
            projetosUrl: PROJETOS_BASE_URL,
          }),
        },
  });
}

// ---------------------------------------------------------------------------
// Project blocked (missing report) → submissor + super_admins (in_app +
// email). Movida de `apps/projetos/src/lib/notifications.ts` (P-2.10b) —
// único chamador é o cron de inadimplência (`../crons/projetos-
// inadimplencia.ts`), que roda sem sessão HTTP; mesma razão de
// notifyProjectDecision/notifyReportReminder acima (P-0.14).
// ---------------------------------------------------------------------------

export async function notifyProjectBlocked(projectId: string): Promise<void> {
  const [project] = await db
    .select({
      title: projects.title,
      submitterId: projects.submitterId,
      submitterName: users.fullName,
      submitterEmail: users.email,
    })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.submitterId))
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return;

  const admins = await getUsersByRoles(["super_admin"]);
  const resendApiKey = process.env.RESEND_API_KEY;
  const title = `Projeto bloqueado: ${project.title}`;
  const body =
    "O projeto foi bloqueado por falta de relatório. Os pagamentos estão suspensos.";
  const dbTpl = await getDbTemplate("projetos-blocked");

  const recipients: UserRecord[] = [
    {
      id: project.submitterId,
      fullName: project.submitterName,
      email: project.submitterEmail,
    },
    ...admins.filter((a) => a.id !== project.submitterId),
  ];

  await Promise.allSettled(
    recipients.flatMap((recipient) => {
      const isSubmitter = recipient.id === project.submitterId;
      const url = isSubmitter
        ? buildSubmissorProjectUrl(projectId)
        : buildDiretoriaProjectUrl(projectId);
      const href = isSubmitter
        ? submissorHref(projectId)
        : diretoriaHref(projectId);
      const emailOpts = dbTpl
        ? applyVars(dbTpl, {
            nome: recipient.fullName ?? recipient.email,
            titulo: project.title,
            link: url,
          })
        : null;
      return [
        createNotification({
          insert: makeInsert(),
          data: {
            userId: recipient.id,
            channel: "in_app",
            type: "project.blocked",
            title,
            body,
            payload: { module: "projetos", projectId, href },
          },
        }),
        createNotification({
          insert: makeInsert(),
          resendApiKey,
          data: {
            userId: recipient.id,
            channel: "email",
            type: "project.blocked",
            title,
            body,
            payload: { module: "projetos", projectId, href },
          },
          email: emailOpts
            ? { to: recipient.email, ...emailOpts }
            : {
                to: recipient.email,
                subject: title,
                template: React.createElement(ProjectStatusChangeEmail, {
                  recipientName: recipient.fullName ?? recipient.email,
                  projectTitle: project.title,
                  statusEvent: "bloqueado" satisfies ProjectStatusEvent,
                  projectUrl: url,
                }),
              },
        }),
      ];
    }),
  );
}

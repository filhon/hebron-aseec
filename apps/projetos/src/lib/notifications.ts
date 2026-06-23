import * as React from "react";
import { db } from "@hebron/db/client";
import { createNotification } from "@hebron/email";
import type { InsertNotificationFn } from "@hebron/email";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  notifications,
  users,
  roleAssignments,
  projects,
  organizations,
  reports,
  paymentSchedules,
  emailTemplates,
} from "@hebron/db/schema";
import { ProjectSubmittedEmail } from "@hebron/email/templates/project-submitted";
import { ProjectStatusChangeEmail } from "@hebron/email/templates/project-status-change";
import { ReportReminderEmail } from "@hebron/email/templates/report-reminder";
import { PaymentConfirmationEmail } from "@hebron/email/templates/payment-confirmation";
import type { ProjectStatusEvent } from "@hebron/email/templates/project-status-change";
import type { ReportReminderType } from "@hebron/email/templates/report-reminder";

// ---------------------------------------------------------------------------
// Template override helpers
// ---------------------------------------------------------------------------

const PROJECT_TYPE_LABELS: Record<string, string> = {
  pontual: "Pontual (emergencial)",
  anual: "Anual",
};

async function getDbTemplate(
  slug: string,
): Promise<{ subject: string; bodyHtml: string } | null> {
  const [row] = await db
    .select({
      subject: emailTemplates.subject,
      bodyHtml: emailTemplates.bodyHtml,
    })
    .from(emailTemplates)
    .where(eq(emailTemplates.slug, slug))
    .limit(1);
  return row ?? null;
}

function applyVars(
  tpl: { subject: string; bodyHtml: string },
  vars: Record<string, string>,
): { subject: string; html: string } {
  const sub = (t: string) =>
    t.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? `{{${k}}}`);
  return { subject: sub(tpl.subject), html: sub(tpl.bodyHtml) };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const PROJETOS_BASE_URL =
  process.env.NEXT_PUBLIC_PROJETOS_URL ?? "https://projetos.hebronaseec.com.br";

function buildProjectUrl(projectId: string) {
  return `${PROJETOS_BASE_URL}/projetos/${projectId}`;
}

function makeInsert(): InsertNotificationFn {
  return async (data) => {
    const [record] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        channel: data.channel,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        payload: (data.payload ?? null) as Record<string, unknown> | null,
        sentAt: data.sentAt ? new Date(data.sentAt) : null,
      })
      .returning({ id: notifications.id });
    if (!record)
      throw new Error("[projetos/notifications] DB insert returned no row");
    return record;
  };
}

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

// ---------------------------------------------------------------------------
// Project submitted → super_admins (in_app + email)
// ---------------------------------------------------------------------------

export async function notifyProjectSubmitted(projectId: string): Promise<void> {
  const [project] = await db
    .select({
      title: projects.title,
      tipo: projects.tipo,
      submitterName: users.fullName,
      orgName: organizations.nome,
    })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.submitterId))
    .leftJoin(organizations, eq(organizations.id, projects.organizationId))
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return;

  const admins = await getUsersByRoles(["super_admin"]);
  if (!admins.length) return;

  const url = buildProjectUrl(projectId);
  const resendApiKey = process.env.RESEND_API_KEY;
  const dbTpl = await getDbTemplate("projetos-submitted");

  await Promise.allSettled(
    admins.flatMap((admin) => {
      const emailOpts = dbTpl
        ? applyVars(dbTpl, {
            nome: admin.fullName ?? admin.email,
            titulo: project.title,
            submissor: project.submitterName ?? "Desconhecido",
            tipo: PROJECT_TYPE_LABELS[project.tipo] ?? project.tipo,
            organizacao: project.orgName ?? "",
            link: url,
          })
        : null;
      return [
        createNotification({
          insert: makeInsert(),
          data: {
            userId: admin.id,
            channel: "in_app",
            type: "project.submitted",
            title: `Nova submissão: ${project.title}`,
            body: `${project.submitterName ?? "Um submissor"} submeteu um novo projeto.`,
            payload: { projectId, href: `/projetos/${projectId}` },
          },
        }),
        createNotification({
          insert: makeInsert(),
          resendApiKey,
          data: {
            userId: admin.id,
            channel: "email",
            type: "project.submitted",
            title: `Nova submissão: ${project.title}`,
            body: `${project.submitterName ?? "Um submissor"} submeteu um novo projeto.`,
            payload: { projectId, href: `/projetos/${projectId}` },
          },
          email: emailOpts
            ? { to: admin.email, ...emailOpts }
            : {
                to: admin.email,
                subject: `Nova submissão de projeto: ${project.title}`,
                template: React.createElement(ProjectSubmittedEmail, {
                  recipientName: admin.fullName ?? admin.email,
                  projectTitle: project.title,
                  submitterName:
                    project.submitterName ?? "Submissor desconhecido",
                  projectType: project.tipo,
                  organizationName: project.orgName ?? null,
                  projectUrl: url,
                }),
              },
        }),
      ];
    }),
  );
}

// ---------------------------------------------------------------------------
// Project in validation → submissor (in_app + email)
// ---------------------------------------------------------------------------

export async function notifyProjectInValidation(
  projectId: string,
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

  const url = buildProjectUrl(projectId);
  const resendApiKey = process.env.RESEND_API_KEY;
  const displayName = project.submitterName ?? project.submitterEmail;
  const tpl = await getDbTemplate("projetos-in-validation");
  const emailOpts = tpl
    ? applyVars(tpl, { nome: displayName, titulo: project.title, link: url })
    : null;

  await Promise.allSettled([
    createNotification({
      insert: makeInsert(),
      data: {
        userId: project.submitterId,
        channel: "in_app",
        type: "project.in_validation",
        title: `Projeto em análise: ${project.title}`,
        body: "Seu projeto foi recebido e está sendo analisado.",
        payload: { projectId, href: `/projetos/${projectId}` },
      },
    }),
    createNotification({
      insert: makeInsert(),
      resendApiKey,
      data: {
        userId: project.submitterId,
        channel: "email",
        type: "project.in_validation",
        title: `Projeto em análise: ${project.title}`,
        body: "Seu projeto foi recebido e está sendo analisado.",
        payload: { projectId, href: `/projetos/${projectId}` },
      },
      email: emailOpts
        ? { to: project.submitterEmail, ...emailOpts }
        : {
            to: project.submitterEmail,
            subject: `Projeto em análise: ${project.title}`,
            template: React.createElement(ProjectStatusChangeEmail, {
              recipientName: displayName,
              projectTitle: project.title,
              statusEvent: "validacao" satisfies ProjectStatusEvent,
              projectUrl: url,
            }),
          },
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Voting open → diretores + conselheiros (in_app + email)
// ---------------------------------------------------------------------------

export async function notifyVotingOpen(projectId: string): Promise<void> {
  const [project] = await db
    .select({ title: projects.title })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return;

  const voters = await getUsersByRoles(["diretor", "conselheiro"]);
  if (!voters.length) return;

  const url = buildProjectUrl(projectId);
  const resendApiKey = process.env.RESEND_API_KEY;
  const dbTpl = await getDbTemplate("projetos-voting-open");

  await Promise.allSettled(
    voters.flatMap((voter) => {
      const emailOpts = dbTpl
        ? applyVars(dbTpl, {
            nome: voter.fullName ?? voter.email,
            titulo: project.title,
            link: url,
          })
        : null;
      return [
        createNotification({
          insert: makeInsert(),
          data: {
            userId: voter.id,
            channel: "in_app",
            type: "project.voting_open",
            title: `Votação aberta: ${project.title}`,
            body: "Um projeto aguarda sua avaliação.",
            payload: { projectId, href: `/projetos/${projectId}` },
          },
        }),
        createNotification({
          insert: makeInsert(),
          resendApiKey,
          data: {
            userId: voter.id,
            channel: "email",
            type: "project.voting_open",
            title: `Votação aberta: ${project.title}`,
            body: "Um projeto aguarda sua avaliação.",
            payload: { projectId, href: `/projetos/${projectId}` },
          },
          email: emailOpts
            ? { to: voter.email, ...emailOpts }
            : {
                to: voter.email,
                subject: `Votação aberta: ${project.title}`,
                template: React.createElement(ProjectStatusChangeEmail, {
                  recipientName: voter.fullName ?? voter.email,
                  projectTitle: project.title,
                  statusEvent: "votacao_aberta" satisfies ProjectStatusEvent,
                  projectUrl: url,
                }),
              },
        }),
      ];
    }),
  );
}

// ---------------------------------------------------------------------------
// Project approved / rejected → submissor (email only)
// ---------------------------------------------------------------------------

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

  const url = buildProjectUrl(projectId);
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
      payload: { projectId, href: `/projetos/${projectId}` },
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

// ---------------------------------------------------------------------------
// Report reminder → submissor (in_app + email)
// ---------------------------------------------------------------------------

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

  const url = buildProjectUrl(row.projectId);
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
          projectId: row.projectId,
          reportId,
          href: `/projetos/${row.projectId}`,
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
          projectId: row.projectId,
          reportId,
          href: `/projetos/${row.projectId}`,
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

// ---------------------------------------------------------------------------
// Payment made → submissor (email only)
// ---------------------------------------------------------------------------

export async function notifyPaymentMade(
  paymentScheduleId: string,
  receiptUrl?: string,
): Promise<void> {
  const [payment] = await db
    .select({
      amount: paymentSchedules.amount,
      dueDate: paymentSchedules.dueDate,
      month: paymentSchedules.month,
      projectId: paymentSchedules.projectId,
      projectTitle: projects.title,
      submitterId: projects.submitterId,
      submitterName: users.fullName,
      submitterEmail: users.email,
    })
    .from(paymentSchedules)
    .innerJoin(projects, eq(projects.id, paymentSchedules.projectId))
    .innerJoin(users, eq(users.id, projects.submitterId))
    .where(eq(paymentSchedules.id, paymentScheduleId))
    .limit(1);

  if (!payment) return;

  const url = buildProjectUrl(payment.projectId);
  const resendApiKey = process.env.RESEND_API_KEY;
  const displayName = payment.submitterName ?? payment.submitterEmail;
  const paymentDate = payment.dueDate ? new Date(payment.dueDate) : new Date();
  const subject = `Pagamento realizado: ${payment.projectTitle}`;
  const tpl = await getDbTemplate("projetos-payment-made");
  const emailOpts = tpl
    ? applyVars(tpl, {
        nome: displayName,
        titulo: payment.projectTitle,
        valor: parseFloat(payment.amount).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
        data: paymentDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        link: url,
      })
    : null;

  await createNotification({
    insert: makeInsert(),
    resendApiKey,
    data: {
      userId: payment.submitterId,
      channel: "email",
      type: "payment.made",
      title: subject,
      body: "Um pagamento do seu projeto foi processado.",
      payload: {
        projectId: payment.projectId,
        paymentScheduleId,
        href: `/projetos/${payment.projectId}`,
      },
    },
    email: emailOpts
      ? { to: payment.submitterEmail, ...emailOpts }
      : {
          to: payment.submitterEmail,
          subject,
          template: React.createElement(PaymentConfirmationEmail, {
            recipientName: displayName,
            projectTitle: payment.projectTitle,
            amount: payment.amount,
            paymentDate,
            paymentMonth: payment.month,
            projectUrl: url,
            receiptUrl: receiptUrl ?? null,
          }),
        },
  });
}

// ---------------------------------------------------------------------------
// Project blocked (missing report) → submissor + super_admins (in_app + email)
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
  const url = buildProjectUrl(projectId);
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
            payload: { projectId, href: `/projetos/${projectId}` },
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
            payload: { projectId, href: `/projetos/${projectId}` },
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

// ---------------------------------------------------------------------------
// Contestation → all diretores + conselheiros (in_app + email)
// ---------------------------------------------------------------------------

export async function notifyContestation(
  projectId: string,
  contestorName: string,
): Promise<void> {
  const [project] = await db
    .select({ title: projects.title })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return;

  const voters = await getUsersByRoles(["diretor", "conselheiro"]);
  if (!voters.length) return;

  const url = buildProjectUrl(projectId);
  const resendApiKey = process.env.RESEND_API_KEY;
  const title = `Contestação registrada: ${project.title}`;
  const body = `${contestorName} registrou uma contestação. O projeto retorna para votação.`;
  const dbTpl = await getDbTemplate("projetos-contested");

  await Promise.allSettled(
    voters.flatMap((voter) => {
      const emailOpts = dbTpl
        ? applyVars(dbTpl, {
            nome: voter.fullName ?? voter.email,
            titulo: project.title,
            contestador: contestorName,
            link: url,
          })
        : null;
      return [
        createNotification({
          insert: makeInsert(),
          data: {
            userId: voter.id,
            channel: "in_app",
            type: "project.contested",
            title,
            body,
            payload: { projectId, href: `/projetos/${projectId}` },
          },
        }),
        createNotification({
          insert: makeInsert(),
          resendApiKey,
          data: {
            userId: voter.id,
            channel: "email",
            type: "project.contested",
            title,
            body,
            payload: { projectId, href: `/projetos/${projectId}` },
          },
          email: emailOpts
            ? { to: voter.email, ...emailOpts }
            : {
                to: voter.email,
                subject: `Contestação de projeto: ${project.title}`,
                template: React.createElement(ProjectStatusChangeEmail, {
                  recipientName: voter.fullName ?? voter.email,
                  projectTitle: project.title,
                  statusEvent: "contestacao" satisfies ProjectStatusEvent,
                  extra: contestorName,
                  projectUrl: url,
                }),
              },
        }),
      ];
    }),
  );
}

// ---------------------------------------------------------------------------
// Evaluator designated → avaliador (in_app + email, 7d before meeting)
// ---------------------------------------------------------------------------

export async function notifyEvaluatorDesignated(
  evaluatorId: string,
  projectIds: string[],
  meetingDate: Date,
): Promise<void> {
  if (!projectIds.length) return;

  const [evaluator] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, evaluatorId))
    .limit(1);

  if (!evaluator) return;

  const projectRows = await db
    .select({ title: projects.title })
    .from(projects)
    .where(inArray(projects.id, projectIds));

  const firstTitle = projectRows[0]?.title ?? "projeto designado";
  const displayName = evaluator.fullName ?? evaluator.email;
  const firstProjectId = projectIds[0] as string;
  const url = buildProjectUrl(firstProjectId);
  const resendApiKey = process.env.RESEND_API_KEY;
  const meetingDateStr = meetingDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const titleLabel =
    projectIds.length === 1
      ? `Projeto designado para avaliação: ${firstTitle}`
      : `${projectIds.length} projetos designados para avaliação`;

  const projectTitleForEmail =
    projectIds.length === 1
      ? firstTitle
      : `${firstTitle} e mais ${projectIds.length - 1} projeto(s)`;

  const tpl = await getDbTemplate("projetos-evaluator-designated");
  const emailOpts = tpl
    ? applyVars(tpl, {
        nome: displayName,
        titulo: projectTitleForEmail,
        reuniao: meetingDateStr,
        link: url,
      })
    : null;

  await Promise.allSettled([
    createNotification({
      insert: makeInsert(),
      data: {
        userId: evaluator.id,
        channel: "in_app",
        type: "project.evaluator_designated",
        title: titleLabel,
        body: `Reunião de votação em ${meetingDateStr}.`,
        payload: { projectIds, href: "/projetos" },
      },
    }),
    createNotification({
      insert: makeInsert(),
      resendApiKey,
      data: {
        userId: evaluator.id,
        channel: "email",
        type: "project.evaluator_designated",
        title: titleLabel,
        body: `Reunião de votação em ${meetingDateStr}.`,
        payload: { projectIds, href: "/projetos" },
      },
      email: emailOpts
        ? { to: evaluator.email, ...emailOpts }
        : {
            to: evaluator.email,
            subject: titleLabel,
            template: React.createElement(ProjectStatusChangeEmail, {
              recipientName: displayName,
              projectTitle: projectTitleForEmail,
              statusEvent: "designado" satisfies ProjectStatusEvent,
              projectUrl: url,
            }),
          },
    }),
  ]);
}

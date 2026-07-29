import * as React from "react";
import { db } from "@hebron/db/client";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  users,
  roleAssignments,
  projects,
  organizations,
  emailTemplates,
} from "@hebron/db/schema";
import { ProjectSubmittedEmail } from "@hebron/email/templates/project-submitted";
import { ProjectStatusChangeEmail } from "@hebron/email/templates/project-status-change";
import type { ProjectStatusEvent } from "@hebron/email/templates/project-status-change";

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

// Rotas reais do app (P-2.10b — não existe `/projetos/<id>`): o submissor
// vê o próprio projeto em `(submissor)/[id]`, a diretoria em
// `(diretoria)/pipeline/[id]`. Toda notificação escolhe uma das duas
// conforme o papel do destinatário — nunca um caminho único para os dois
// públicos.
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

  const url = buildDiretoriaProjectUrl(projectId);
  const href = diretoriaHref(projectId);
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
            payload: {
              module: "projetos",
              projectId,
              href,
            },
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
            payload: {
              module: "projetos",
              projectId,
              href,
            },
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

  const url = buildSubmissorProjectUrl(projectId);
  const href = submissorHref(projectId);
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
        payload: {
          module: "projetos",
          projectId,
          href,
        },
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
        payload: {
          module: "projetos",
          projectId,
          href,
        },
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

  const url = buildDiretoriaProjectUrl(projectId);
  const href = diretoriaHref(projectId);
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
            payload: {
              module: "projetos",
              projectId,
              href,
            },
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
            payload: {
              module: "projetos",
              projectId,
              href,
            },
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

// notifyProjectDecision e notifyReportReminder movidas para
// packages/jobs/src/notify/projetos.ts (P-0.14); notifyProjectBlocked
// movida para o mesmo arquivo em P-2.10b (único chamador é o cron de
// inadimplência, que não tem sessão HTTP — mesma razão das duas primeiras).
// notifyPaymentMade migrou para packages/integrations/src/financeiro.ts em
// P-2.10b: quem sabe que um pagamento aconteceu é o Financeiro
// (markPayableAsPaid), não este app — decisão registrada em SESSIONS.md.

// ---------------------------------------------------------------------------
// Contestation → all diretores + conselheiros (in_app + email)
// ---------------------------------------------------------------------------

export async function notifyContestation(
  projectId: string,
  contestorId: string,
): Promise<void> {
  const [project] = await db
    .select({ title: projects.title })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return;

  const [contestor] = await db
    .select({ fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, contestorId))
    .limit(1);
  const contestorName = contestor?.fullName ?? contestor?.email ?? "Alguém";

  const voters = await getUsersByRoles(["diretor", "conselheiro"]);
  if (!voters.length) return;

  const url = buildDiretoriaProjectUrl(projectId);
  const href = diretoriaHref(projectId);
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
            payload: {
              module: "projetos",
              projectId,
              href,
            },
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
            payload: {
              module: "projetos",
              projectId,
              href,
            },
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
  const url = buildDiretoriaProjectUrl(firstProjectId);
  const href = diretoriaHref(firstProjectId);
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
        payload: { module: "projetos", projectIds, href },
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
        payload: { module: "projetos", projectIds, href },
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

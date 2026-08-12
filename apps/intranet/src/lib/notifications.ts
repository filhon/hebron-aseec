import * as React from "react";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { emailTemplates, roleAssignments, users } from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { UrgentAnnouncementEmail } from "@hebron/email/templates/urgent-announcement";
import type { Role } from "@hebron/types/roles";

const insertNotification = makeNotificationInserter();

const INTRANET_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hebronaseec.com.br";

// ---------------------------------------------------------------------------
// Template override helpers — mesmo padrão de
// apps/financeiro/src/lib/notifications.ts / packages/jobs/src/lib/templates.ts
// (override editável no Admin, fallback para o componente React Email).
// Duplicado deliberadamente aqui em vez de extraído (mesma nota de
// packages/jobs/src/lib/templates.ts: extrair criaria uma dependência de
// @hebron/email sobre @hebron/db, invertendo a que já existe).
// ---------------------------------------------------------------------------

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

function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// mapWithConcurrency — teto explícito de conexões simultâneas ao Resend.
// Publicar um anúncio urgente abre até ~150 envios (INTERNAL_ROLES, CLAUDE.md
// "~150 usuários ativos"); um Promise.all sobre todos eles de dentro do
// request estoura o limite de requisições/segundo da conta Resend, o 429
// vira exceção não tratada e — antes desta correção — derrubava a
// publicação inteira (achado #3, P-5.10b). Processa com um pool de tamanho
// fixo em vez de abrir uma conexão por destinatário.
// ---------------------------------------------------------------------------
const URGENT_ANNOUNCEMENT_EMAIL_CONCURRENCY = 10;

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function runNext(): Promise<void> {
    const index = cursor++;
    if (index >= items.length) return;
    results[index] = await worker(items[index] as T);
    return runNext();
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runNext),
  );
  return results;
}

// Mesmo conjunto de (dashboard)/layout.tsx::INTERNAL_ROLES — "equipe interna"
// (super_admin/diretor/conselheiro/colaborador). Não importado diretamente
// porque layout.tsx não exporta a constante; duplicado deliberadamente aqui.
const INTERNAL_ROLES: Role[] = [
  "super_admin",
  "diretor",
  "conselheiro",
  "colaborador",
];

// Diretoria — mesmo papel de boardAction (lib/safe-action.ts) e de quem tem
// SELECT em intranet.meeting_decisions (0037_intranet_rls.sql:
// meeting_decisions_select_board) + super_admin.
const BOARD_ROLES: Role[] = ["diretor", "conselheiro", "super_admin"];

/**
 * Notifica o super_admin que enviou o convite quando ele é aceito (in_app).
 */
export async function notifyInvitationAccepted(
  adminId: string,
  inviteeEmail: string,
): Promise<void> {
  await createNotification({
    insert: (data) => insertNotification(data),
    data: {
      userId: adminId,
      channel: "in_app",
      type: "invitation.accepted",
      title: "Convite aceito",
      body: `${inviteeEmail} aceitou o convite e já tem acesso à plataforma.`,
      payload: { module: "intranet", inviteeEmail },
    },
  });
}

/**
 * Notifica todos os super_admin de um novo cadastro aguardando aprovação
 * (in_app) — disparado ao final do wizard de auto-signup, quando o usuário
 * já vinculou uma instituição.
 */
export async function notifySignupPendingReview(
  userEmail: string,
  userName: string,
  organizationName: string,
): Promise<void> {
  const superAdmins = await db
    .selectDistinct({ userId: roleAssignments.userId })
    .from(roleAssignments)
    .where(eq(roleAssignments.role, "super_admin"));

  if (!superAdmins.length) return;

  await Promise.all(
    superAdmins.map((admin) =>
      createNotification({
        insert: (data) => insertNotification(data),
        data: {
          userId: admin.userId,
          channel: "in_app",
          type: "user.signup_requested",
          title: "Novo cadastro aguardando aprovação",
          body: `${userName} (${userEmail}) solicitou acesso vinculado a ${organizationName}.`,
          payload: { module: "intranet", userEmail, organizationName },
        },
      }),
    ),
  );
}

export interface NotifyUrgentAnnouncementResult {
  /** Quantos internos ativos eram elegíveis para receber. */
  recipients: number;
  /** Quantos, dentre esses, tiveram o email malsucedido (in_app foi gravado mesmo assim). */
  emailFailures: number;
}

/**
 * Anúncio urgente (priority = "urgente"): in_app + email imediato a todos os
 * papéis internos (INTERNAL_ROLES) — comunicação operacional, isenta de
 * opt-in (PATCH P-5.10, CS-9). Anúncio normal/importante NÃO chama esta
 * função — fica só no feed in_app (critério de aceite P-5.10).
 *
 * A metade in_app nunca depende do email ter saído (achado #1, P-5.10b):
 * cada destinatário é tratado isoladamente e uma falha de envio grava a
 * notificação como in_app (sem sentAt) em vez de sumir. `send.ts` não muda —
 * a ordem "envia, depois insere" é contrato compartilhado pelos nove apps; a
 * correção mora aqui, em quem chama.
 */
export async function notifyUrgentAnnouncement(announcement: {
  id: string;
  title: string;
  body: string;
  authorName: string;
  publishedAt: Date;
}): Promise<NotifyUrgentAnnouncementResult> {
  const recipientRows = await db
    .selectDistinct({
      userId: roleAssignments.userId,
      email: users.email,
      fullName: users.fullName,
    })
    .from(roleAssignments)
    .innerJoin(users, eq(users.id, roleAssignments.userId))
    .where(
      and(
        inArray(roleAssignments.role, INTERNAL_ROLES),
        isNull(users.suspendedAt),
      ),
    );

  if (!recipientRows.length) return { recipients: 0, emailFailures: 0 };

  const resendApiKey = process.env.RESEND_API_KEY;
  const intranetUrl = `${INTRANET_BASE_URL}/anuncios`;
  const dbTpl = await getDbTemplate("intranet-urgent-announcement");
  const publishedAtLabel = formatDateTime(announcement.publishedAt);

  const outcomes = await mapWithConcurrency(
    recipientRows,
    URGENT_ANNOUNCEMENT_EMAIL_CONCURRENCY,
    async (recipient) => {
      const displayName = recipient.fullName ?? recipient.email;
      const payload = {
        module: "intranet",
        announcementId: announcement.id,
        href: "/anuncios",
      };

      const emailOpts = dbTpl
        ? {
            to: recipient.email,
            ...applyVars(dbTpl, {
              nome: displayName,
              titulo: announcement.title,
              corpo: announcement.body,
              autor: announcement.authorName,
              dataPublicacao: publishedAtLabel,
              link: intranetUrl,
            }),
          }
        : {
            to: recipient.email,
            subject: `[Urgente] ${announcement.title}`,
            template: React.createElement(UrgentAnnouncementEmail, {
              recipientName: displayName,
              title: announcement.title,
              body: announcement.body,
              authorName: announcement.authorName,
              publishedAt: announcement.publishedAt,
              intranetUrl,
            }),
          };

      try {
        await createNotification({
          insert: (data) => insertNotification(data),
          resendApiKey,
          data: {
            userId: recipient.userId,
            channel: "email",
            type: "announcement.urgent",
            title: announcement.title,
            body: announcement.body,
            payload,
          },
          email: emailOpts,
        });
        return { emailSent: true };
      } catch {
        await insertNotification({
          userId: recipient.userId,
          channel: "in_app",
          type: "announcement.urgent",
          title: announcement.title,
          body: announcement.body,
          payload,
        });
        return { emailSent: false };
      }
    },
  );

  const emailFailures = outcomes.filter((o) => !o.emailSent).length;
  return { recipients: recipientRows.length, emailFailures };
}

/**
 * Decisão de reunião: in_app para a diretoria (BOARD_ROLES) — critério de
 * aceite P-5.10 ("in_app para diretores"). Sem email (fora do escopo do
 * prompt: só anúncio urgente dispara email em massa).
 */
export async function notifyMeetingDecisionCreated(decision: {
  id: string;
  description: string;
}): Promise<void> {
  const boardMembers = await db
    .selectDistinct({ userId: roleAssignments.userId })
    .from(roleAssignments)
    .where(inArray(roleAssignments.role, BOARD_ROLES));

  if (!boardMembers.length) return;

  await Promise.all(
    boardMembers.map((member) =>
      createNotification({
        insert: (data) => insertNotification(data),
        data: {
          userId: member.userId,
          channel: "in_app",
          type: "meeting_decision.created",
          title: "Nova decisão de reunião registrada",
          body: decision.description,
          payload: {
            module: "intranet",
            meetingDecisionId: decision.id,
            href: "/reunioes",
          },
        },
      }),
    ),
  );
}

import * as React from "react";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { roleAssignments, users } from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { UrgentAnnouncementEmail } from "@hebron/email/templates/urgent-announcement";
import type { Role } from "@hebron/types/roles";

const insertNotification = makeNotificationInserter();

const INTRANET_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hebronaseec.com.br";

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

/**
 * Anúncio urgente (priority = "urgente"): in_app + email imediato a todos os
 * papéis internos (INTERNAL_ROLES) — comunicação operacional, isenta de
 * opt-in (PATCH P-5.10, CS-9). Anúncio normal/importante NÃO chama esta
 * função — fica só no feed in_app (critério de aceite P-5.10).
 */
export async function notifyUrgentAnnouncement(announcement: {
  id: string;
  title: string;
  body: string;
  authorName: string;
  publishedAt: Date;
}): Promise<void> {
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

  if (!recipientRows.length) return;

  const resendApiKey = process.env.RESEND_API_KEY;
  const intranetUrl = `${INTRANET_BASE_URL}/anuncios`;

  await Promise.all(
    recipientRows.map((recipient) =>
      createNotification({
        insert: (data) => insertNotification(data),
        resendApiKey,
        data: {
          userId: recipient.userId,
          channel: "email",
          type: "announcement.urgent",
          title: announcement.title,
          body: announcement.body,
          payload: {
            module: "intranet",
            announcementId: announcement.id,
            href: "/anuncios",
          },
        },
        email: {
          to: recipient.email,
          subject: `[Urgente] ${announcement.title}`,
          template: React.createElement(UrgentAnnouncementEmail, {
            recipientName: recipient.fullName ?? recipient.email,
            title: announcement.title,
            body: announcement.body,
            authorName: announcement.authorName,
            publishedAt: announcement.publishedAt,
            intranetUrl,
          }),
        },
      }),
    ),
  );
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

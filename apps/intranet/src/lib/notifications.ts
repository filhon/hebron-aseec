import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { roleAssignments } from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";

const insertNotification = makeNotificationInserter();

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
      payload: { inviteeEmail },
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
          payload: { userEmail, organizationName },
        },
      }),
    ),
  );
}

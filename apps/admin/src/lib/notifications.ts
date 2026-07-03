import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";

// ──────────────────────────────────────────────────────────────────────────────
// Labels
// ──────────────────────────────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  global: "todos os módulos",
  admin: "Admin",
  projetos: "Projetos",
  plataforma: "Plataforma",
  radio: "Rádio",
  financeiro: "Financeiro",
  intranet: "Intranet",
  documentos: "Documentos",
  flats: "Flats",
  tarefas: "Tarefas",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  diretor: "Diretor",
  conselheiro: "Conselheiro",
  colaborador: "Colaborador",
  submissor: "Submissor",
  aluno: "Aluno",
  hospede: "Hóspede",
  ouvinte: "Ouvinte",
};

// ──────────────────────────────────────────────────────────────────────────────
// Internal insert helper
// ──────────────────────────────────────────────────────────────────────────────

const insertNotification = makeNotificationInserter();

// ──────────────────────────────────────────────────────────────────────────────
// Exported notification helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Notifica o super_admin quando um convite é aceito (in_app).
 *
 * Deve ser chamado pela lógica de aceitação de convite, passando o id do admin
 * que enviou o convite original.
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
 * Notifica o usuário suspenso sobre a suspensão do seu acesso (in_app).
 *
 * Deve ser chamado após suspendUser bem-sucedido com o id do usuário suspenso.
 */
export async function notifyUserSuspended(
  userId: string,
  modules: string[],
): Promise<void> {
  const isGlobal = modules.includes("global");
  const modulesText = isGlobal
    ? "todos os módulos"
    : modules.map((m) => MODULE_LABELS[m] ?? m).join(", ");

  await createNotification({
    insert: (data) => insertNotification(data),
    data: {
      userId,
      channel: "in_app",
      type: "user.suspended",
      title: "Acesso suspenso",
      body: `Seu acesso foi suspenso em: ${modulesText}. Entre em contato com a administração para mais informações.`,
      payload: { modules },
    },
  });
}

/**
 * Notifica o usuário quando um papel é atribuído ou removido (in_app).
 *
 * Deve ser chamado após assignRole ou revokeRole bem-sucedido.
 * O parâmetro `action` indica se o papel foi concedido ("granted") ou removido ("revoked").
 */
export async function notifyRoleChanged(
  userId: string,
  role: string,
  action: "granted" | "revoked",
): Promise<void> {
  const roleLabel = ROLE_LABELS[role] ?? role;
  const isGranted = action === "granted";

  await createNotification({
    insert: (data) => insertNotification(data),
    data: {
      userId,
      channel: "in_app",
      type: "role.changed",
      title: isGranted ? "Papel atribuído" : "Papel removido",
      body: isGranted
        ? `O papel ${roleLabel} foi atribuído à sua conta.`
        : `O papel ${roleLabel} foi removido da sua conta.`,
      payload: { role, action },
    },
  });
}

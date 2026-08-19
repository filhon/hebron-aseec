import { createRoleGate } from "@hebron/auth/role-gate";

/**
 * Gate para o app inteiro: só super_admin passa. Sem sessão ou sem o papel
 * correto redireciona para o login canônico — nunca renderiza a página por
 * trás (F2-A1: app inteiro legível por anônimo via superuser).
 */
export const requireAdminSession = createRoleGate({
  allowedRoles: ["super_admin"],
});

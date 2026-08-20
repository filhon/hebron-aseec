import { createSafeActionClient } from "next-safe-action";
import {
  BusinessError,
  handleServerError,
} from "@hebron/auth/safe-action-error";
import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";
import type { Role } from "@hebron/types/roles";

// ---------------------------------------------------------------------------
// Base authenticated action — any role
// ---------------------------------------------------------------------------

const baseAction = createSafeActionClient({ handleServerError }).use(
  async ({ next }) => {
    const cookieStore = await cookies();
    const { actorId, roles } = await resolveSession(cookieStore);
    return next({ ctx: { actorId, roles } });
  },
);

export { baseAction as tarefasAction };

// ---------------------------------------------------------------------------
// Role-specific action clients — espelham exatamente as policies de RLS de
// 0033_tarefas_rls.sql (defense in depth, G6 do CLAUDE.md).
// ---------------------------------------------------------------------------

/**
 * Requires colaborador, diretor, conselheiro OU super_admin — transparência
 * interna (BRAIN §6.9): toda a equipe lê tudo, mesmo sem ser dono/assignee.
 */
export const staffAction = baseAction.use(async ({ next, ctx }) => {
  const allowed: Role[] = [
    "colaborador",
    "diretor",
    "conselheiro",
    "super_admin",
  ];
  if (!ctx.roles.some((r) => allowed.includes(r))) {
    throw new BusinessError("Acesso negado: papel da equipe obrigatório");
  }
  return next({ ctx });
});

/**
 * Requires colaborador OU super_admin — dono das tarefas operacionais.
 * Diretor/conselheiro NUNCA recebem tarefa operacional (BRAIN §6.9): só
 * respondem approval_requests, por isso não entram aqui.
 */
export const colaboradorAction = baseAction.use(async ({ next, ctx }) => {
  const allowed: Role[] = ["colaborador", "super_admin"];
  if (!ctx.roles.some((r) => allowed.includes(r))) {
    throw new BusinessError("Acesso negado: papel colaborador obrigatório");
  }
  return next({ ctx });
});

/** Requires diretor, conselheiro OU super_admin — resolve pedidos de aprovação. */
export const diretorAction = baseAction.use(async ({ next, ctx }) => {
  const allowed: Role[] = ["diretor", "conselheiro", "super_admin"];
  if (!ctx.roles.some((r) => allowed.includes(r))) {
    throw new BusinessError("Acesso negado: papel diretor obrigatório");
  }
  return next({ ctx });
});

/** Requires super_admin exclusively — ex.: atribuição manual de tarefa automática. */
export const superAdminAction = baseAction.use(async ({ next, ctx }) => {
  if (!ctx.roles.includes("super_admin")) {
    throw new BusinessError("Acesso negado: apenas super_admin");
  }
  return next({ ctx });
});

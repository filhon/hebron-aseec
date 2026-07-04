import { createSafeActionClient } from "next-safe-action";
import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";
import type { DesignationType, Role } from "@hebron/types/roles";

// ---------------------------------------------------------------------------
// Base authenticated action — any role
// ---------------------------------------------------------------------------

const baseAction = createSafeActionClient().use(async ({ next }) => {
  const cookieStore = await cookies();
  const { actorId, roles, designations } = await resolveSession(cookieStore);
  return next({ ctx: { actorId, roles, designations } });
});

export { baseAction as financeiroAction };

// ---------------------------------------------------------------------------
// Role-specific action clients
// ---------------------------------------------------------------------------

/** Requires colaborador OR diretor OR super_admin */
export const colaboradorAction = baseAction.use(async ({ next, ctx }) => {
  const allowed: Role[] = ["colaborador", "diretor", "super_admin"];
  if (!ctx.roles.some((r) => allowed.includes(r))) {
    throw new Error("Acesso negado: papel colaborador obrigatório");
  }
  return next({ ctx });
});

/** Requires diretor OR super_admin */
export const diretorAction = baseAction.use(async ({ next, ctx }) => {
  const allowed: Role[] = ["diretor", "super_admin"];
  if (!ctx.roles.some((r) => allowed.includes(r))) {
    throw new Error("Acesso negado: papel diretor obrigatório");
  }
  return next({ ctx });
});

/** Requires super_admin exclusively */
export const superAdminAction = baseAction.use(async ({ next, ctx }) => {
  if (!ctx.roles.includes("super_admin")) {
    throw new Error("Acesso negado: apenas super_admin");
  }
  return next({ ctx });
});

/**
 * Requires diretor com a designation informada (gestor/autorizador —
 * BRAIN §6.5), OU super_admin como bypass operacional (escala atual da
 * ONG: 2 super_admins dedicados, designations podem não estar configuradas
 * ainda para todo mundo).
 */
export function diretorWithDesignationAction(designation: DesignationType) {
  return diretorAction.use(async ({ next, ctx }) => {
    if (ctx.roles.includes("super_admin")) return next({ ctx });
    if (!ctx.designations.includes(designation)) {
      throw new Error(`Acesso negado: requer designação "${designation}"`);
    }
    return next({ ctx });
  });
}

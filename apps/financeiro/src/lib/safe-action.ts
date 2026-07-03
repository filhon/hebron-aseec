import { createSafeActionClient } from "next-safe-action";
import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";
import type { Role } from "@hebron/types/roles";

// ---------------------------------------------------------------------------
// Base authenticated action — any role
// ---------------------------------------------------------------------------

const baseAction = createSafeActionClient().use(async ({ next }) => {
  const cookieStore = await cookies();
  const { actorId, roles } = await resolveSession(cookieStore);
  return next({ ctx: { actorId, roles } });
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

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

export { baseAction as projetosAction };

// ---------------------------------------------------------------------------
// Role-specific action clients
// ---------------------------------------------------------------------------

/** Requires submissor OR super_admin */
export const submissorAction = baseAction.use(async ({ next, ctx }) => {
  const allowed: Role[] = ["submissor", "super_admin"];
  if (!ctx.roles.some((r) => allowed.includes(r))) {
    throw new BusinessError("Acesso negado: papel submissor obrigatório");
  }
  return next({ ctx });
});

/** Requires diretor OR super_admin */
export const diretorAction = baseAction.use(async ({ next, ctx }) => {
  const allowed: Role[] = ["diretor", "super_admin"];
  if (!ctx.roles.some((r) => allowed.includes(r))) {
    throw new BusinessError("Acesso negado: papel diretor obrigatório");
  }
  return next({ ctx });
});

/** Requires diretor OR conselheiro OR super_admin (eligible voters) */
export const conselheiroDiretorAction = baseAction.use(
  async ({ next, ctx }) => {
    const allowed: Role[] = ["diretor", "conselheiro", "super_admin"];
    if (!ctx.roles.some((r) => allowed.includes(r))) {
      throw new BusinessError(
        "Acesso negado: papel diretor ou conselheiro obrigatório",
      );
    }
    return next({ ctx });
  },
);

/** Requires super_admin exclusively */
export const superAdminAction = baseAction.use(async ({ next, ctx }) => {
  if (!ctx.roles.includes("super_admin")) {
    throw new BusinessError("Acesso negado: apenas super_admin");
  }
  return next({ ctx });
});

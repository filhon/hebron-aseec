import { createSafeActionClient } from "next-safe-action";
import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";

/**
 * Base authenticated action — resolves the real session via @hebron/auth
 * (createServerClient from @supabase/ssr).
 */
const baseAction = createSafeActionClient().use(async ({ next }) => {
  const cookieStore = await cookies();
  const { actorId, roles } = await resolveSession(cookieStore);
  return next({ ctx: { actorId, roles } });
});

/** authenticatedAction: qualquer usuário autenticado */
export { baseAction as authenticatedAction };

/** editor: super_admin, diretor, conselheiro, colaborador */
export const editorAction = baseAction.use(async ({ next, ctx }) => {
  const editorRoles = ["super_admin", "diretor", "conselheiro", "colaborador"];
  if (!ctx.roles.some((r) => editorRoles.includes(r))) {
    throw new Error("Acesso negado: papel insuficiente para esta operação");
  }
  return next({ ctx });
});

/** adminDocAction: super_admin ou diretor (para editais com implicações jurídicas) */
export const adminDocAction = baseAction.use(async ({ next, ctx }) => {
  const adminRoles = ["super_admin", "diretor"];
  if (!ctx.roles.some((r) => adminRoles.includes(r))) {
    throw new Error("Acesso negado: apenas super_admin ou diretor");
  }
  return next({ ctx });
});

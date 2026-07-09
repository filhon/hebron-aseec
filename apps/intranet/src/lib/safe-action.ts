import { createSafeActionClient } from "next-safe-action";
import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";
import type { Role } from "@hebron/types/roles";

/**
 * Base authenticated action — resolves the real session via @hebron/auth
 * (createServerClient from @supabase/ssr). Ver packages/auth/src/server.ts
 * para o porquê de não existir uma alternativa manual.
 */
const baseAction = createSafeActionClient().use(async ({ next }) => {
  const cookieStore = await cookies();
  const { actorId, roles } = await resolveSession(cookieStore);
  return next({ ctx: { actorId, roles } });
});

/** authenticatedAction: qualquer usuário com sessão válida (papel algum exigido). */
export { baseAction as authenticatedAction };

/**
 * Public safe-action client — sem autenticação.
 * Usar apenas em actions que aceitam tokens públicos (ex.: aceitação de convite).
 */
export const publicAction = createSafeActionClient();

/**
 * staffAction: colaborador, diretor, conselheiro ou super_admin — "equipe
 * interna" (0037_intranet_rls.sql: announcements_select_staff,
 * dashboard_configs_write_own, kpi_snapshots_select_staff). Papéis externos
 * (submissor, aluno, hospede, ouvinte) nunca passam neste gate.
 */
export const staffAction = baseAction.use(async ({ next, ctx }) => {
  const allowed: Role[] = [
    "colaborador",
    "diretor",
    "conselheiro",
    "super_admin",
  ];
  if (!ctx.roles.some((r) => allowed.includes(r))) {
    throw new Error("Acesso negado: acesso restrito à equipe interna");
  }
  return next({ ctx });
});

/**
 * boardAction: diretor, conselheiro ou super_admin — diretoria
 * (0037_intranet_rls.sql: announcements_insert_board).
 */
export const boardAction = baseAction.use(async ({ next, ctx }) => {
  const allowed: Role[] = ["diretor", "conselheiro", "super_admin"];
  if (!ctx.roles.some((r) => allowed.includes(r))) {
    throw new Error("Acesso negado: papel de diretoria obrigatório");
  }
  return next({ ctx });
});

/** superAdminAction: exclusivamente super_admin. */
export const superAdminAction = baseAction.use(async ({ next, ctx }) => {
  if (!ctx.roles.includes("super_admin")) {
    throw new Error("Acesso negado: apenas super_admin");
  }
  return next({ ctx });
});

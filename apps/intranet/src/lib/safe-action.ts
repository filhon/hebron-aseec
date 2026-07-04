import { createSafeActionClient } from "next-safe-action";
import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";

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

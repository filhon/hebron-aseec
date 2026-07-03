import { createSafeActionClient } from "next-safe-action";
import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";

/**
 * Base authenticated action — resolves the real session via @hebron/auth
 * (createServerClient from @supabase/ssr). A raw createClient() forwarding
 * a Cookie header never parses Supabase's session cookies and silently
 * denies everyone — see packages/auth/src/server.ts for why.
 */
const baseAction = createSafeActionClient().use(async ({ next }) => {
  const cookieStore = await cookies();
  const { actorId, roles } = await resolveSession(cookieStore);
  return next({ ctx: { actorId, roles } });
});

/** admin: super_admin exclusivamente. */
export const adminAction = baseAction.use(async ({ next, ctx }) => {
  if (!ctx.roles.includes("super_admin")) {
    throw new Error(
      "Acesso negado: apenas super_admin pode executar esta ação",
    );
  }
  return next({ ctx });
});

/**
 * Public safe-action client — sem autenticação.
 * Usar apenas em actions que aceitam tokens públicos (ex.: aceitação de convite).
 */
export const publicAction = createSafeActionClient();

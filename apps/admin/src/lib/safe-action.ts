import { createSafeActionClient } from "next-safe-action";
import {
  BusinessError,
  handleServerError,
} from "@hebron/auth/safe-action-error";
import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";
import type { Role } from "@hebron/types/roles";

/**
 * Base authenticated action — resolves the real session via @hebron/auth
 * (createServerClient from @supabase/ssr). A raw createClient() forwarding
 * a Cookie header never parses Supabase's session cookies and silently
 * denies everyone — see packages/auth/src/server.ts for why.
 *
 * Admin has no submissor/aluno/hóspede-facing area (unlike the other 8
 * apps), so unlike them it must NOT run actions as "what the impersonated
 * user sees" — it's the control tower impersonation is managed FROM (banner
 * + stop control, PACOTE 6). `resolveSession` swaps `actorId`/`roles` to the
 * impersonated user while `impersonatedBy` is set; left unhandled here every
 * admin action would 403 against the target's roles right after starting a
 * session. `impersonatedBy`'s presence alone proves that real actor already
 * holds super_admin (resolveSession only sets it after re-verifying that).
 */
const baseAction = createSafeActionClient({ handleServerError }).use(
  async ({ next }) => {
    const cookieStore = await cookies();
    const session = await resolveSession(cookieStore);
    const actorId = session.impersonatedBy ?? session.actorId;
    const roles: Role[] = session.impersonatedBy
      ? ["super_admin"]
      : session.roles;
    return next({ ctx: { actorId, roles } });
  },
);

/** admin: super_admin exclusivamente. */
export const adminAction = baseAction.use(async ({ next, ctx }) => {
  if (!ctx.roles.includes("super_admin")) {
    throw new BusinessError(
      "Acesso negado: apenas super_admin pode executar esta ação",
    );
  }
  return next({ ctx });
});

/**
 * Public safe-action client — sem autenticação.
 * Usar apenas em actions que aceitam tokens públicos (ex.: aceitação de convite).
 */
export const publicAction = createSafeActionClient({ handleServerError });

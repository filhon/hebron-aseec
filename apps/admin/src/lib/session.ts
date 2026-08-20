import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSession, type ActionSession } from "@hebron/auth/server";
import { CANONICAL_LOGIN_URL } from "@hebron/auth/middleware";

/**
 * Gate for the whole app: only super_admin passes — including a super_admin
 * who is currently impersonating someone else.
 *
 * Deliberately NOT built on `createRoleGate` (unlike every other app's
 * gates): Admin has no submissor/aluno/hóspede-facing area, so unlike the
 * other 8 apps it must NOT show "what the impersonated user sees" — it's the
 * control tower impersonation is managed FROM (banner + stop control,
 * PACOTE 6 / BRAIN §6.1). `resolveSession` swaps `actorId`/`roles` to the
 * impersonated user while `impersonatedBy` is set (by design, so the other
 * apps' gates see the real "view as" — see @hebron/auth/server); left
 * unhandled here, that swap would lock the operator out of Admin itself
 * (`allowedRoles: ["super_admin"]` failing against the impersonated target's
 * roles) right after starting a session, and would misattribute `actorId`
 * on `logPiiAccess` calls (usuarios/[id]/page.tsx) to the impersonated user
 * instead of the real one. So this gate always returns the REAL actor's
 * identity — `impersonatedBy` presence alone proves that actor already holds
 * super_admin (resolveSession only sets it after re-verifying that).
 */
export async function requireAdminSession(): Promise<ActionSession> {
  const cookieStore = await cookies();

  let session: ActionSession;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }

  if (session.impersonatedBy) {
    return {
      actorId: session.impersonatedBy,
      roles: ["super_admin"],
      designations: [],
    };
  }

  if (!session.roles.includes("super_admin")) {
    redirect(CANONICAL_LOGIN_URL);
  }

  return session;
}

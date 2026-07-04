import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSession } from "@hebron/auth/server";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import type { ActionSession } from "@hebron/auth/server";

const EDITOR_ROLES = ["super_admin", "diretor", "conselheiro", "colaborador"];

/**
 * Resolves the current actor id without throwing — used by public pages to
 * pick which Postgres role `withAuthenticatedContext` should read as
 * (`anon` vs `authenticated`), without gating the page itself.
 */
export async function getOptionalActorId(): Promise<string | null> {
  const cookieStore = await cookies();
  try {
    const { actorId } = await resolveSession(cookieStore);
    return actorId;
  } catch {
    return null;
  }
}

/**
 * Gate para a área editorial: redireciona ao login canônico sem sessão ou
 * sem papel editorial. Mirror de `requireAdminSession` (apps/admin) — antes
 * disto o layout editorial não tinha nenhuma checagem, só um texto
 * decorativo ("Acesso restrito"), e rascunhos/KPIs renderizavam para
 * anônimos (F2-D2).
 */
export async function requireEditorSession(): Promise<ActionSession> {
  const cookieStore = await cookies();
  let session: ActionSession;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }
  if (!session.roles.some((r) => EDITOR_ROLES.includes(r))) {
    redirect(CANONICAL_LOGIN_URL);
  }
  return session;
}

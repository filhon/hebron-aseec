import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSession } from "@hebron/auth/server";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import type { ActionSession } from "@hebron/auth/server";

/**
 * Gate para a área (submissor): submissor OU super_admin. Sem sessão ou sem
 * o papel correto redireciona para o login canônico — antes desta sessão o
 * layout só checava `getAuthUser() !== null`, deixando qualquer autenticado
 * (inclusive diretor/conselheiro) entrar na área do submissor.
 */
export async function requireSubmissorSession(): Promise<ActionSession> {
  const cookieStore = await cookies();

  let session: ActionSession;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }

  const allowed = ["submissor", "super_admin"];
  if (!session.roles.some((r) => allowed.includes(r))) {
    redirect(CANONICAL_LOGIN_URL);
  }

  return session;
}

/**
 * Gate para a área (diretoria): diretor, conselheiro OU super_admin.
 *
 * F2-P4 (CRÍTICO): `(diretoria)/layout.tsx` verificava apenas
 * `getAuthUser() !== null` — nenhuma checagem de papel — permitindo que um
 * submissor autenticado navegasse para `/pipeline/<id>` e visse score IA,
 * breakdown, versão compacta e contagem de votos de qualquer projeto.
 */
export async function requireDiretorSession(): Promise<ActionSession> {
  const cookieStore = await cookies();

  let session: ActionSession;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }

  const allowed = ["diretor", "conselheiro", "super_admin"];
  if (!session.roles.some((r) => allowed.includes(r))) {
    redirect(CANONICAL_LOGIN_URL);
  }

  return session;
}

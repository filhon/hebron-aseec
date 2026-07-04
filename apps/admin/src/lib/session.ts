import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSession } from "@hebron/auth/server";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import type { ActionSession } from "@hebron/auth/server";

/**
 * Gate para o app inteiro: só super_admin passa. Sem sessão ou sem o papel
 * correto redireciona para o login canônico — nunca renderiza a página por
 * trás (F2-A1: app inteiro legível por anônimo via superuser).
 */
export async function requireAdminSession(): Promise<ActionSession> {
  const cookieStore = await cookies();

  let session: ActionSession;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }

  if (!session.roles.includes("super_admin")) {
    redirect(CANONICAL_LOGIN_URL);
  }

  return session;
}

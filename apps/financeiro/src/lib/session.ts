import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSession } from "@hebron/auth/server";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import type { ActionSession } from "@hebron/auth/server";

/**
 * Gate para páginas RSC do Financeiro que exigem papel colaborador+ (mesmo
 * conjunto de `colaboradorAction` em lib/safe-action.ts). O dashboard do
 * Financeiro ainda não tem gate de papel em `shell.tsx`/`layout.tsx`
 * (débito de P-3.9) — páginas novas que fazem leitura/mutação real (P-3.8b)
 * não esperam por isso e checam inline, mesmo padrão de
 * apps/projetos/src/lib/session.ts.
 */
export async function requireColaboradorSession(): Promise<ActionSession> {
  const cookieStore = await cookies();

  let session: ActionSession;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }

  const allowed = ["colaborador", "diretor", "super_admin"];
  if (!session.roles.some((r) => allowed.includes(r))) {
    redirect(CANONICAL_LOGIN_URL);
  }

  return session;
}

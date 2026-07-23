import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSession } from "@hebron/auth/server";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import type { Role } from "@hebron/types/roles";
import { getAuthUser } from "../../lib/queries";
import DiretoriaShell from "../(diretoria)/shell";
import SubmissorShell from "../(submissor)/shell";
import { NotificacoesContent } from "./notificacoes-content";

const DIRETORIA_ROLES: Role[] = ["diretor", "conselheiro", "super_admin"];

/**
 * Rota compartilhada entre (diretoria) e (submissor): route groups não podem
 * ter dois page.tsx resolvendo para o mesmo /notificacoes (erro de build do
 * Next.js — "two parallel pages that resolve to the same path"). Como as
 * duas áreas mapeiam para a raiz do app, a central de notificações vive fora
 * dos dois grupos e escolhe o shell certo por papel (mesma checagem de
 * requireDiretorSession/requireSubmissorSession, combinada). Decisão
 * registrada em SESSIONS.md (P-0.6c).
 */
export default async function NotificacoesPage() {
  const cookieStore = await cookies();

  let session;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }

  const isDiretoria = session.roles.some((r) => DIRETORIA_ROLES.includes(r));
  const isSubmissor = session.roles.includes("submissor");

  if (!isDiretoria && !isSubmissor) redirect(CANONICAL_LOGIN_URL);

  const user = await getAuthUser();
  if (!user) redirect(CANONICAL_LOGIN_URL);

  const Shell = isDiretoria ? DiretoriaShell : SubmissorShell;

  return (
    <Shell user={user}>
      <NotificacoesContent />
    </Shell>
  );
}

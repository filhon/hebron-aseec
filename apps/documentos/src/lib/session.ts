import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";
import { createRoleGate } from "@hebron/auth/role-gate";
import type { Role } from "@hebron/types/roles";

/** Papéis que navegam a área editorial (todos, inclusive somente-leitura). */
export const EDITOR_ROLES: Role[] = [
  "super_admin",
  "diretor",
  "conselheiro",
  "colaborador",
];

/**
 * Papéis que podem escrever (criar/editar/publicar/remover) documentos.
 * `conselheiro` navega a área editorial mas só lê — decisão P-1.19b (item 3),
 * registrada em SESSIONS.md: o conjunto do portão (editorAction) tinha
 * herdado conselheiro de S-61 por conveniência, mas nenhuma policy de
 * escrita de documentos.* em 0005_documentos_rls.sql jamais o incluiu.
 * Único lugar que define este conjunto — consumido por `editorAction`
 * (safe-action.ts) e pela UI (esconder ações de escrita em vez de deixá-las
 * falhar no clique).
 */
export const DOCUMENT_WRITE_ROLES: Role[] = [
  "super_admin",
  "diretor",
  "colaborador",
];

export function hasDocumentWriteRole(roles: string[]): boolean {
  return DOCUMENT_WRITE_ROLES.some((writer) => roles.includes(writer));
}

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
export const requireEditorSession = createRoleGate({
  allowedRoles: EDITOR_ROLES,
});

/**
 * Gate das telas de escrita da área editorial (`/editorial/novo`,
 * `/editorial/[id]/editar`): exige `DOCUMENT_WRITE_ROLES`, não apenas
 * `EDITOR_ROLES`. Sem ele o conselheiro que digitasse a URL direto via
 * `requireEditorSession` recebia o formulário inteiro e só descobria a
 * recusa no submit, pelo "Acesso negado" do `editorAction` (P-1.19c).
 * A recusa é o redirect padrão do `createRoleGate`, como em qualquer
 * outro gate de papel do monorepo.
 */
export const requireDocumentWriterSession = createRoleGate({
  allowedRoles: DOCUMENT_WRITE_ROLES,
});

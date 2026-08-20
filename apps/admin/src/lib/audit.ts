import { logAudit as sharedLogAudit, computeDiff } from "@hebron/db/audit";
import type { LogAuditParams, AuditAction } from "@hebron/db/audit";
import { getActiveImpersonation } from "@hebron/auth/impersonation-server";

export type { AuditAction };
export { computeDiff };

/**
 * Registra uma entrada no admin.audit_log. Deve ser chamado em toda mutação
 * admin.
 *
 * Detecta automaticamente uma sessão de impersonação ativa via cookie
 * (a menos que o chamador já tenha passado `realActorId`, ex.:
 * startImpersonationAction/stopImpersonationAction, cujo `params.actorId` já
 * é o ator real) e repassa para @hebron/db/audit's `logAudit`, que grava o
 * super_admin real como `actorId` e preserva o impersonado em
 * `_impersonatedId` no diff (PACOTE 6 / BRAIN §6.1) — sempre "critical"
 * (aborta em falha), como já era o comportamento deste módulo.
 */
export async function logAudit(
  params: Omit<LogAuditParams, "criticality">,
): Promise<void> {
  const realActorId =
    params.realActorId ?? (await getActiveImpersonation())?.actorId;

  await sharedLogAudit({ ...params, realActorId, criticality: "critical" });
}

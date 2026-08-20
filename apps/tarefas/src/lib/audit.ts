import { logAudit } from "@hebron/db/audit";
import type { AuditDbHandle } from "@hebron/db/audit";
import { getActiveImpersonation } from "@hebron/auth/impersonation-server";

// ---------------------------------------------------------------------------
// Tarefas-specific audit action types — valores já existem em admin.audit_action
// desde a migration 0032_tarefas_audit_actions.sql (P-4.6, G6.3).
// ---------------------------------------------------------------------------

export type TarefasAuditAction =
  | "task.approval_requested"
  | "task.approved"
  | "task.rejected";

export interface LogTarefasAuditParams {
  actorId: string;
  action: TarefasAuditAction;
  entity: string;
  entityId?: string;
  diff?: Record<string, unknown>;
}

/**
 * Writes a tarefas-module governance event to admin.audit_log via @hebron/db/audit.
 *
 * Aprovações de diretor (tarefas.approval_requests) são mutação crítica
 * (BRAIN §6.9, G6.3) — falha ao gravar o audit ABORTA a operação. Passar
 * `dbHandle` (um `tx` de `db.transaction(...)`) para que a mutação e o
 * registro de audit sejam atômicos.
 */
export async function logTarefasAudit(
  params: LogTarefasAuditParams,
  dbHandle?: AuditDbHandle,
): Promise<void> {
  const realActorId = (await getActiveImpersonation())?.actorId;
  await logAudit({ ...params, realActorId, criticality: "critical" }, dbHandle);
}

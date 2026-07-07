import { logAudit } from "@hebron/db/audit";
import type { AuditDbHandle } from "@hebron/db/audit";

// ---------------------------------------------------------------------------
// Financeiro-specific audit action types (values live in the shared DB enum
// — added via ALTER TYPE alongside this module's tables in P-0.7)
// ---------------------------------------------------------------------------

export type FinanceiroAuditAction =
  | "financeiro.payable.created"
  | "financeiro.payable.cancelled"
  | "financeiro.payable.approved"
  | "financeiro.payable.authorized"
  | "financeiro.payable.paid"
  | "financeiro.receivable.created"
  | "financeiro.receivable.received"
  | "financeiro.transaction.created"
  | "financeiro.transaction.reversed"
  | "financeiro.import.confirmed"
  | "financeiro.import.row.reconciled"
  | "financeiro.batch.created"
  | "financeiro.batch.approved"
  | "financeiro.batch.authorized"
  | "financeiro.category.created"
  | "financeiro.category.updated"
  | "financeiro.category.deleted"
  | "financeiro.budget.created"
  | "financeiro.budget.updated"
  | "financeiro.budget.deleted"
  | "financeiro.organization_budget.created"
  | "financeiro.organization_budget.updated"
  | "financeiro.account.created"
  | "financeiro.report.exported"
  | "financeiro.payable.blocked"
  | "financeiro.payable.block_overridden";

export interface LogFinanceiroAuditParams {
  actorId: string;
  action: FinanceiroAuditAction;
  entity: string;
  entityId?: string;
  diff?: Record<string, unknown>;
}

/**
 * Writes a financeiro-module event to admin.audit_log via @hebron/db/audit.
 *
 * Financeiro is a governance module (decision F3-Q4): a failure to write
 * the audit entry ABORTS the caller — this used to be swallowed in a
 * try/catch, which meant money-moving mutations could succeed with no
 * durable trail. That is exactly the bug this shared function fixes.
 *
 * Pass `dbHandle` (a `tx` from `db.transaction(...)`) for governance flows
 * that need the mutation and its audit entry to commit or roll back
 * together (see approveBatch / authorizeBatch / markPayableAsPaid).
 */
export async function logFinanceiroAudit(
  params: LogFinanceiroAuditParams,
  dbHandle?: AuditDbHandle,
): Promise<void> {
  await logAudit({ ...params, criticality: "critical" }, dbHandle);
}

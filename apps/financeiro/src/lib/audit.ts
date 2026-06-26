import { db } from "@hebron/db/client";
import { auditLog } from "@hebron/db/schema";
import type { NewAuditLog } from "@hebron/db/schema";

// ---------------------------------------------------------------------------
// Financeiro-specific audit action types (cast at insert — values added to
// the DB enum via migration alongside this module's tables in P-3.6)
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
  | "financeiro.budget.deleted";

export interface LogFinanceiroAuditParams {
  actorId: string;
  action: FinanceiroAuditAction;
  entity: string;
  entityId?: string;
  diff?: Record<string, unknown>;
}

/**
 * Writes a financeiro-module event to admin.audit_log.
 * Wrapped in try/catch so a logging failure never breaks the main operation.
 */
export async function logFinanceiroAudit(
  params: LogFinanceiroAuditParams,
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorId: params.actorId,
      action: params.action as unknown as NewAuditLog["action"],
      entity: params.entity,
      entityId: params.entityId,
      diff: params.diff ?? null,
    });
  } catch (err) {
    console.error("[financeiro/audit] Failed to write audit log entry:", err);
  }
}

import { logAudit } from "@hebron/db/audit";
import type { LogAuditParams } from "@hebron/db/audit";

export type { AuditAction } from "@hebron/db/audit";

/**
 * Grava entrada no admin.audit_log via @hebron/db/audit (default: critical,
 * aborta a mutação em caso de falha de escrita do audit).
 */
export async function logIntranetAudit(
  params: Omit<LogAuditParams, "criticality">,
): Promise<void> {
  await logAudit(params);
}

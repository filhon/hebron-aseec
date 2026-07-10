import { logAudit } from "@hebron/db/audit";
import type { AuditDbHandle, LogAuditParams } from "@hebron/db/audit";

export type { AuditAction } from "@hebron/db/audit";

/**
 * Grava entrada no admin.audit_log via @hebron/db/audit (default: critical,
 * aborta a mutação em caso de falha de escrita do audit).
 *
 * Passar `dbHandle` (um `tx` sob `RESET ROLE`/`withSystemRole` — P-0.17)
 * para que a mutação e o registro de audit sejam atômicos.
 */
export async function logIntranetAudit(
  params: Omit<LogAuditParams, "criticality">,
  dbHandle?: AuditDbHandle,
): Promise<void> {
  await logAudit(params, dbHandle);
}

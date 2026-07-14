import { logAudit } from "@hebron/db/audit";
import type { AuditDbHandle } from "@hebron/db/audit";

// ---------------------------------------------------------------------------
// Plataforma-specific audit action types. Valores já existem no enum
// compartilhado (admin.audit_log.action) desde a migration de P-6.6
// (0020_plataforma_audit_actions.sql) — G6.3.
// ---------------------------------------------------------------------------

export type PlataformaAuditAction = "course.published" | "certificate.issued";

export interface LogPlataformaAuditParams {
  actorId: string;
  action: PlataformaAuditAction;
  entity: string;
  entityId?: string;
  diff?: Record<string, unknown>;
}

/**
 * Writes a plataforma-module event to admin.audit_log via @hebron/db/audit.
 *
 * Publicação de curso e emissão de certificado são os dois eventos com
 * audit central pedidos pelo escopo de P-6.8 — criticality "critical"
 * (default de logAudit): falha ao gravar o audit ABORTA a operação, mesmo
 * padrão de logFinanceiroAudit (decisão F3-Q4).
 */
export async function logPlataformaAudit(
  params: LogPlataformaAuditParams,
  dbHandle?: AuditDbHandle,
): Promise<void> {
  await logAudit({ ...params, criticality: "critical" }, dbHandle);
}

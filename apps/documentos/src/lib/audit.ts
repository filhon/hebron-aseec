import { logAudit } from "@hebron/db/audit";

export type DocumentAuditAction =
  | "document.created"
  | "document.updated"
  | "document.published"
  | "document.unpublished"
  | "document.deleted"
  | "category.created"
  | "category.updated"
  | "category.deleted"
  | "edital.created"
  | "edital.updated";

/**
 * Grava entrada no admin.audit_log via @hebron/db/audit (default: aborta em
 * falha). Os valores acima já existem no enum admin.audit_action.
 */
export async function logDocumentAudit(params: {
  actorId: string;
  action: DocumentAuditAction;
  entity: string;
  entityId: string;
  diff?: Record<string, unknown>;
}): Promise<void> {
  await logAudit(params);
}

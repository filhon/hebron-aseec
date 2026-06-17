import { sql } from "drizzle-orm";
import { db } from "@hebron/db/client";

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
 * Grava entrada no admin.audit_log via SQL bruto.
 * Requer que a migration de extensão do enum admin.audit_action
 * inclua os valores acima (ex.: document.created, document.published etc.).
 */
export async function logDocumentAudit(params: {
  actorId: string;
  action: DocumentAuditAction;
  entity: string;
  entityId: string;
  diff?: Record<string, unknown>;
}): Promise<void> {
  const diffJson = JSON.stringify(params.diff ?? {});
  await db.execute(sql`
    INSERT INTO admin.audit_log
      (id, actor_id, action, entity, entity_id, diff, created_at)
    VALUES (
      gen_random_uuid(),
      ${params.actorId}::uuid,
      ${params.action}::text::admin.audit_action,
      ${params.entity},
      ${params.entityId}::uuid,
      ${diffJson}::jsonb,
      now()
    )
  `);
}

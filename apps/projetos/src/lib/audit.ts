import { db } from "@hebron/db/client";
import { auditLog } from "@hebron/db/schema";
import type { NewAuditLog } from "@hebron/db/schema";

// ---------------------------------------------------------------------------
// Project-specific audit action types
// (values were added to the DB enum via ALTER TYPE in P-2.8)
// ---------------------------------------------------------------------------

export type ProjectAuditAction =
  | "project.created"
  | "project.updated"
  | "project.submitted"
  | "project.stage_transition"
  | "project.deleted"
  | "vote.cast"
  | "vote.panic"
  | "evaluation.assigned"
  | "evaluation.submitted"
  | "contestation.created"
  | "report.created"
  | "report.submitted"
  | "organization.created"
  | "organization.updated";

export interface LogProjectAuditParams {
  actorId: string;
  action: ProjectAuditAction;
  entity: string;
  entityId?: string;
  diff?: Record<string, unknown>;
}

/**
 * Writes a project-module event to admin.audit_log.
 * Wrapped in try/catch so a logging failure never breaks the main operation.
 * The action values are cast because the TS enum predates the projetos module
 * (they exist in the DB — added via ALTER TYPE in P-2.8 migration).
 */
export async function logProjectAudit(
  params: LogProjectAuditParams,
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
    console.error("[projetos/audit] Failed to write audit log entry:", err);
  }
}

/**
 * Returns only the changed fields between two plain objects.
 */
export function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { before: unknown; after: unknown }> {
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diff[key] = { before: before[key], after: after[key] };
    }
  }
  return diff;
}

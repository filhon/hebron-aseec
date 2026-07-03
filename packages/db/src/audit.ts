import { db as defaultDb } from "./client";
import { auditLog } from "./schema/admin";
import type { NewAuditLog } from "./schema/admin";

export type AuditAction = NewAuditLog["action"];

/**
 * Minimal database handle accepted by `logAudit` — either the app-wide
 * singleton `db` or a `tx` yielded by `db.transaction(...)`, so a mutation
 * and its audit entry can be committed or rolled back together.
 */
export interface AuditDbHandle {
  insert: (typeof defaultDb)["insert"];
}

export interface LogAuditParams {
  actorId: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  diff?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
  /**
   * "critical" (default): a failure to write the audit entry throws,
   * aborting the caller's action. Required for governance modules
   * (financeiro, votação) — decision F3-Q4: a mutation must never succeed
   * without a durable audit trail.
   * "best_effort": failure is logged to console and swallowed. Reserved for
   * high-volume, non-governance events where availability matters more than
   * the trail (e.g. document views).
   */
  criticality?: "critical" | "best_effort";
}

/**
 * Writes a single entry to `admin.audit_log`. Shared by every app so audit
 * semantics (and the abort-on-failure guarantee for governance modules)
 * live in exactly one place instead of four divergent copies.
 *
 * Pass `dbHandle` as a `tx` from `db.transaction(...)` when the audit entry
 * must be atomic with the mutation it describes.
 */
export async function logAudit(
  params: LogAuditParams,
  dbHandle: AuditDbHandle = defaultDb,
): Promise<void> {
  const criticality = params.criticality ?? "critical";
  try {
    await dbHandle.insert(auditLog).values({
      actorId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      diff: params.diff ?? null,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
    });
  } catch (err) {
    if (criticality === "critical") throw err;
    console.error(
      `[audit] Failed to write best-effort audit log entry (${params.action}):`,
      err,
    );
  }
}

/** Returns only the fields that changed between two plain objects. */
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

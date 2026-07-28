import { logAudit } from "@hebron/db/audit";
import type { AuditDbHandle } from "@hebron/db/audit";

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
  | "report.reviewed"
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
 * Writes a project-module event to admin.audit_log via @hebron/db/audit.
 *
 * Votação é um módulo de governança (decisão F3-Q4): uma falha ao gravar o
 * audit ABORTA o chamador — antes isso era engolido em um try/catch, o que
 * permitia um voto ser computado sem nenhuma trilha durável.
 *
 * Passe `dbHandle` (um `tx` de `db.transaction(...)`) nos fluxos de votação
 * que precisam que a mutação e o audit sejam atômicos (ver castVote /
 * triggerPanicButton).
 */
export async function logProjectAudit(
  params: LogProjectAuditParams,
  dbHandle?: AuditDbHandle,
): Promise<void> {
  await logAudit({ ...params, criticality: "critical" }, dbHandle);
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

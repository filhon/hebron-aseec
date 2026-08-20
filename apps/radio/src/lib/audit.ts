import { logAudit } from "@hebron/db/audit";
import type { AuditDbHandle } from "@hebron/db/audit";
import { getActiveImpersonation } from "@hebron/auth/impersonation-server";

// ---------------------------------------------------------------------------
// Radio-specific audit action types — valores adicionados a
// admin.audit_action via 0051_radio_audit_actions.sql (G6.3).
// ---------------------------------------------------------------------------

export type RadioAuditAction =
  | "author.created"
  | "author.updated"
  | "author.deleted"
  | "series.created"
  | "series.updated"
  | "series.deleted"
  | "track.created"
  | "playlist.created"
  | "playlist.updated"
  | "playlist.deleted"
  | "playlist.activated"
  | "material.created"
  | "term.accepted";

export interface LogRadioAuditParams {
  actorId: string;
  action: RadioAuditAction;
  entity: string;
  entityId?: string;
  diff?: Record<string, unknown>;
}

/**
 * Writes a radio-module event to admin.audit_log via @hebron/db/audit.
 *
 * Catálogo (autores/séries/faixas/playlists/materiais) e aceite de termo
 * são mutações administrativas/legais — falha ao gravar o audit ABORTA a
 * operação (criticality "critical", mesmo padrão de logFlatsAudit).
 */
export async function logRadioAudit(
  params: LogRadioAuditParams,
  dbHandle?: AuditDbHandle,
): Promise<void> {
  const realActorId = (await getActiveImpersonation())?.actorId;
  await logAudit({ ...params, realActorId, criticality: "critical" }, dbHandle);
}

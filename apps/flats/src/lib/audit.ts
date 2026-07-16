import { logAudit } from "@hebron/db/audit";
import type { AuditDbHandle } from "@hebron/db/audit";

// ---------------------------------------------------------------------------
// Flats-specific audit action types — valores já existem em
// admin.audit_action desde 0022_flats_audit_actions.sql (P-7.6) e
// 0047_flats_audit_actions_p78.sql (P-7.8, G6.3).
// ---------------------------------------------------------------------------

export type FlatsAuditAction =
  | "reservation.submitted"
  | "reservation.approved"
  | "reservation.rejected"
  | "reservation.confirmed"
  | "reservation.cancelled"
  | "reservation.checked_in"
  | "reservation.checked_out"
  | "aid.requested"
  | "aid.approved"
  | "aid.rejected";

export interface LogFlatsAuditParams {
  actorId: string;
  action: FlatsAuditAction;
  entity: string;
  entityId?: string;
  diff?: Record<string, unknown>;
}

/**
 * Writes a flats-module event to admin.audit_log via @hebron/db/audit.
 *
 * O ciclo de vida de reserva e auxílio é mutação crítica (BRAIN §6.8, G6.3):
 * falha ao gravar o audit ABORTA a operação. Passar `dbHandle` (um `tx` de
 * `db.transaction(...)`/`withAuthenticatedContext`) para que a mutação e o
 * registro de audit sejam atômicos — o INSERT em admin.audit_log em si
 * precisa rodar com o papel do sistema (`withSystemRole`), já que
 * `authenticated` não tem policy de INSERT na tabela (F3-15/S-57).
 */
export async function logFlatsAudit(
  params: LogFlatsAuditParams,
  dbHandle?: AuditDbHandle,
): Promise<void> {
  await logAudit({ ...params, criticality: "critical" }, dbHandle);
}

import { cookies } from "next/headers";
import { logAudit as sharedLogAudit, computeDiff } from "@hebron/db/audit";
import type { LogAuditParams, AuditAction } from "@hebron/db/audit";
import {
  IMPERSONATION_COOKIE_NAME,
  parseImpersonationState,
} from "@hebron/auth/impersonation";

export type { AuditAction };
export { computeDiff };

/**
 * Registra uma entrada no audit log.
 * Deve ser chamado em toda mutação admin.
 *
 * Detecta automaticamente sessão de impersonação ativa via cookie e
 * inclui `_impersonatedId` no diff — garantindo trilha completa:
 * quem agiu (actorId) + em nome de quem (_impersonatedId).
 *
 * Delega a escrita para @hebron/db/audit — sempre "critical" (aborta em
 * falha), como já era o comportamento deste módulo.
 */
export async function logAudit(
  params: Omit<LogAuditParams, "criticality">,
): Promise<void> {
  let impersonatedId: string | undefined;
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value;
    if (raw) {
      const state = parseImpersonationState(raw);
      impersonatedId = state?.impersonatedId;
    }
  } catch {
    // cookies() is unavailable outside of a request context (e.g., tests)
  }

  const diff =
    impersonatedId !== undefined
      ? { ...params.diff, _impersonatedId: impersonatedId }
      : params.diff;

  await sharedLogAudit({ ...params, diff, criticality: "critical" });
}

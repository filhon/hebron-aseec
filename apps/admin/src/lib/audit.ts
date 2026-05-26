import { cookies } from "next/headers";
import { db } from "@hebron/db/client";
import { auditLog } from "@hebron/db/schema";
import type { NewAuditLog } from "@hebron/db/schema";
import {
  IMPERSONATION_COOKIE_NAME,
  parseImpersonationState,
} from "@hebron/auth/impersonation";

export type AuditAction = NewAuditLog["action"];

export interface LogAuditParams {
  actorId: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  diff?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Registra uma entrada no audit log.
 * Deve ser chamado em toda mutação admin.
 * Usa conexão direta (DATABASE_URL = superuser postgres) que contorna RLS.
 *
 * Detecta automaticamente sessão de impersonação ativa via cookie e
 * inclui `_impersonatedId` no diff — garantindo trilha completa:
 * quem agiu (actorId) + em nome de quem (_impersonatedId).
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  // Detect active impersonation session to annotate every log entry
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

  await db.insert(auditLog).values({
    actorId: params.actorId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    diff: diff ?? null,
    ip: params.ip ?? null,
    userAgent: params.userAgent ?? null,
  });
}

/**
 * Calcula o diff entre dois objetos (before/after).
 * Retorna apenas os campos que mudaram.
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

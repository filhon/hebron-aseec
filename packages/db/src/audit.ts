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
      diff: params.diff ? redactSensitiveFields(params.diff) : null,
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

/**
 * Nomes de campo (em qualquer schema, camelCase como aparecem nos objetos
 * TS) tratados como PII/dado sensível para fins de audit trail (LGPD,
 * P-0.13 — S1-03/F3-09). Um prompt que adicionar campo de PII a qualquer
 * tabela deve incluir o nome aqui.
 */
export const SENSITIVE_AUDIT_FIELDS = new Set([
  "email",
  "fullName",
  "phone",
  "documentCpf",
  "responsavelLegal",
  "telefone",
  "endereco",
  "name",
  "cpf",
  "birthDate",
  "plate",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Substitui, recursivamente, o valor de qualquer chave presente em
 * `SENSITIVE_AUDIT_FIELDS` por `{ redacted: true }` — o diff registra que o
 * campo mudou, nunca o valor antes/depois. Usada por `computeDiff` (para
 * diffs `{ campo: { before, after } }`) e por chamadas que montam o diff à
 * mão (ex.: `{ after: { email, fullName } }`), já que a varredura é por
 * nome de chave em qualquer profundidade.
 */
export function redactSensitiveFields<T extends Record<string, unknown>>(
  diff: T,
): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(diff)) {
    if (SENSITIVE_AUDIT_FIELDS.has(key)) {
      result[key] = { redacted: true };
    } else if (isPlainObject(value)) {
      result[key] = redactSensitiveFields(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Returns only the fields that changed between two plain objects. Campos de
 * PII (`SENSITIVE_AUDIT_FIELDS`) têm o valor redigido antes de retornar —
 * o audit_log é imutável e particionado até 2027, então nunca deve reter
 * o valor antes/depois de um campo sensível (P-0.13).
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
  return redactSensitiveFields(diff);
}

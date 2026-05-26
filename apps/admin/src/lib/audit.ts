import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { auditLog } from "@hebron/db/schema";
import type { NewAuditLog } from "@hebron/db/schema";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurado");
  const client = postgres(url, { prepare: false });
  return drizzle(client);
}

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
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  const db = getDb();
  await db.insert(auditLog).values({
    actorId: params.actorId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    diff: params.diff,
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

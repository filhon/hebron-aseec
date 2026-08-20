/**
 * audit.test.ts
 *
 * Testa logAudit e computeDiff diretamente contra o banco real.
 * Verifica que toda mutação gera uma entrada no audit_log e que o diff
 * é calculado corretamente.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, auditLog } from "@hebron/db/schema";
import { computeDiff } from "../lib/audit";

// ── Mock Next.js server-only modules ────────────────────────────────────────
// logAudit tenta ler cookies() para detectar impersonação; fora do contexto
// Next.js isso lança — o try/catch interno já trata, mas o mock previne ruído.
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
  }),
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────
const ACTOR_ID = "a0000000-0000-0000-0000-000000000001";
const ACTOR_EMAIL = "audit-actor@test.hebron";

async function seedActor(): Promise<void> {
  await db.delete(users).where(eq(users.id, ACTOR_ID)); // reset limpo
  await db
    .insert(users)
    .values({ id: ACTOR_ID, email: ACTOR_EMAIL, fullName: "Audit Actor" });
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  await seedActor();
});

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR_ID));
  await db.delete(users).where(eq(users.id, ACTOR_ID));
});

// ── Helper para inserir e rastrear entrada de auditoria ──────────────────────
async function insertAuditEntry(params: {
  action: (typeof auditLog.$inferInsert)["action"];
  entity: string;
  entityId?: string;
  diff?: Record<string, unknown>;
}): Promise<typeof auditLog.$inferSelect> {
  const { logAudit } = await import("../lib/audit");
  await logAudit({
    actorId: ACTOR_ID,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    diff: params.diff,
  });

  // Busca o registro mais recente inserido por esse ator + action
  const rows = await db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.actorId, ACTOR_ID),
        eq(auditLog.action, params.action),
        eq(auditLog.entity, params.entity),
      ),
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(1);

  const entry = rows[0];
  if (!entry)
    throw new Error("Entrada de auditoria não encontrada após insert");
  return entry;
}

// ── Testes: computeDiff ───────────────────────────────────────────────────────

describe("computeDiff", () => {
  it("retorna apenas campos alterados", () => {
    // "title" (não "name") — desde D8-003, "name" é PII conhecida
    // (flats.guests.name) e SENSITIVE_AUDIT_FIELDS redige o valor; esse
    // comportamento é coberto à parte em audit-pii-redaction.test.ts. Este
    // teste cobre só a mecânica de before/after do computeDiff.
    const before = { title: "Alice", age: 30, email: "a@b.com" };
    const after = { title: "Alice Souza", age: 30, email: "a@b.com" };

    const diff = computeDiff(before, after);

    expect(diff).toEqual({
      title: { before: "Alice", after: "Alice Souza" },
    });
  });

  it("retorna diff vazio quando nada mudou", () => {
    const obj = { x: 1, y: "foo" };
    expect(computeDiff(obj, obj)).toEqual({});
  });

  it("detecta campo adicionado (before=undefined)", () => {
    const before = { a: 1 };
    const after = { a: 1, b: 2 };
    const diff = computeDiff(before, after);
    expect(diff["b"]).toEqual({ before: undefined, after: 2 });
  });

  it("detecta campo removido (after=undefined)", () => {
    const before = { a: 1, b: 2 };
    const after = { a: 1 };
    const diff = computeDiff(before, after);
    expect(diff["b"]).toEqual({ before: 2, after: undefined });
  });

  it("compara objetos aninhados por JSON stringify", () => {
    const before = { config: { x: 1 } };
    const after = { config: { x: 2 } };
    const diff = computeDiff(before, after);
    expect(diff["config"]).toEqual({
      before: { x: 1 },
      after: { x: 2 },
    });
  });
});

// ── Testes: logAudit → banco ──────────────────────────────────────────────────

describe("logAudit — persistência no banco", () => {
  it("registra user.created com diff correto e redige PII (email)", async () => {
    const entry = await insertAuditEntry({
      action: "user.created",
      entity: "user",
      entityId: ACTOR_ID,
      diff: { after: { email: ACTOR_EMAIL } },
    });

    expect(entry.actorId).toBe(ACTOR_ID);
    expect(entry.action).toBe("user.created");
    expect(entry.entity).toBe("user");
    // P-0.13: e-mail é PII — logAudit nunca persiste o valor, só que mudou.
    expect(entry.diff).toMatchObject({ after: { email: { redacted: true } } });
  });

  it("registra role.granted com campos obrigatórios", async () => {
    const entry = await insertAuditEntry({
      action: "role.granted",
      entity: "role_assignment",
      diff: { after: { role: "colaborador", scope: "global" } },
    });

    expect(entry.action).toBe("role.granted");
    expect(entry.diff).toMatchObject({
      after: { role: "colaborador", scope: "global" },
    });
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  it("registra invitation.created", async () => {
    const entry = await insertAuditEntry({
      action: "invitation.created",
      entity: "invitation",
      diff: {
        after: { email: "convidado@test.hebron", roles: ["colaborador"] },
      },
    });

    expect(entry.action).toBe("invitation.created");
    expect(entry.diff).toMatchObject({
      after: { roles: ["colaborador"] },
    });
  });

  it("registra user.suspended com modules corretos", async () => {
    const entry = await insertAuditEntry({
      action: "user.suspended",
      entity: "user",
      entityId: ACTOR_ID,
      diff: {
        suspendedModules: { before: [], after: ["admin"] },
      },
    });

    expect(entry.action).toBe("user.suspended");
    expect(entry.diff).toMatchObject({
      suspendedModules: { before: [], after: ["admin"] },
    });
  });

  it("PACOTE 6: grava o super_admin real como actorId e preserva o impersonado em _impersonatedId", async () => {
    // Pós-PACOTE 6, resolveSession já resolve `actorId` como o usuário
    // IMPERSONADO enquanto uma sessão está ativa (é isso que faz "ver como o
    // usuário" ser real nos outros apps) — então uma action chamando logAudit
    // durante impersonação passa actorId = alvo. O cookie continua guardando
    // o ator real em `actorId` (nome mantido por compat com o payload
    // assinado) — é dele que a auto-detecção em lib/audit.ts lê realActorId.
    const IMPERSONATED_ID = "b0000000-0000-0000-0000-000000000099";
    const { serializeImpersonationState } =
      await import("@hebron/auth/impersonation");
    const cookieValue = serializeImpersonationState({
      actorId: ACTOR_ID,
      actorName: "Super Admin",
      impersonatedId: IMPERSONATED_ID,
      impersonatedName: "Alvo",
      startedAt: new Date().toISOString(),
    });

    // Re-mock cookies() para retornar o cookie de impersonação
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValueOnce({
      getAll: vi.fn().mockReturnValue([]),
      get: vi.fn().mockImplementation((name: string) => {
        if (name === "hb-impersonation") return { name, value: cookieValue };
        return undefined;
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { logAudit } = await import("../lib/audit");
    await logAudit({
      actorId: IMPERSONATED_ID,
      action: "user.updated",
      entity: "user",
      entityId: IMPERSONATED_ID,
      diff: { fullName: { before: "Old", after: "New" } },
    });

    const rows = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.actorId, ACTOR_ID),
          eq(auditLog.action, "user.updated"),
        ),
      )
      .orderBy(desc(auditLog.createdAt))
      .limit(1);

    const last = rows[0];
    expect(last).toBeDefined();
    if (!last) throw new Error("Expected audit entry to be defined");
    // O audit NUNCA nomeia o impersonado como ator — sempre o super_admin real.
    expect(last.actorId).toBe(ACTOR_ID);
    expect((last.diff as Record<string, unknown>)["_impersonatedId"]).toBe(
      IMPERSONATED_ID,
    );
  });

  it("audit_log não possui policy UPDATE/DELETE (imutabilidade via RLS)", async () => {
    // Verifica via catálogo do sistema que não há políticas de UPDATE/DELETE.
    const result = await db.execute(sql`
      SELECT pg_policy.polcmd AS cmd
      FROM   pg_policy
      JOIN   pg_class     ON pg_class.oid      = pg_policy.polrelid
      JOIN   pg_namespace ON pg_namespace.oid  = pg_class.relnamespace
      WHERE  pg_namespace.nspname = 'admin'
        AND  pg_class.relname     = 'audit_log'
        AND  pg_policy.polcmd    IN ('w', 'd')
    `);
    // drizzle retorna array de rows
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[]).length).toBe(0);
  });
});

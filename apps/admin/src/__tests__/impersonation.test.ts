/**
 * impersonation.test.ts
 *
 * Testa o fluxo de impersonação:
 *   - startImpersonationAction → registra audit com event: "start"
 *   - stopImpersonationAction  → registra audit com event: "stop" + durationMs
 *   - Não permite auto-impersonação
 *
 * Como startImpersonationAction e stopImpersonationAction chamam redirect(),
 * o mock captura o redirect e os testes verificam o estado do banco.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, roleAssignments, auditLog } from "@hebron/db/schema";
import {
  serializeImpersonationState,
  IMPERSONATION_COOKIE_NAME,
} from "@hebron/auth/impersonation";

// ── IDs fixos ────────────────────────────────────────────────────────────────
const ACTOR_ID = "e1000000-0000-0000-0000-000000000001";
const TARGET_ID = "e1000000-0000-0000-0000-000000000002";

// ── Estado do mock de cookies ────────────────────────────────────────────────
// Simula uma cookie store mutável para os testes de start/stop.
const cookieStore: Map<string, string> = new Map();

const mockCookies = {
  getAll: vi.fn().mockReturnValue([]),
  get: vi.fn().mockImplementation((name: string) => {
    const value = cookieStore.get(name);
    return value !== undefined ? { name, value } : undefined;
  }),
  // Next.js signature: set(name, value, options?)
  set: vi
    .fn()
    .mockImplementation((name: string, value: string, _opts?: unknown) => {
      cookieStore.set(name, value);
    }),
  // Next.js signature: delete(name | { name, path, domain })
  delete: vi.fn().mockImplementation((opts: { name: string } | string) => {
    const name = typeof opts === "string" ? opts : opts.name;
    cookieStore.delete(name);
  }),
};

// ── Mocks globais ────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  redirect: vi.fn(), // captura chamadas; não redireciona de verdade
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookies),
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// Mock Supabase auth para retornar ACTOR_ID
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: ACTOR_ID, email: "imp-actor@test.hebron" } },
        error: null,
      }),
    },
  }),
}));

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  // Seed: actor (super_admin) e target
  await db
    .insert(users)
    .values({
      id: ACTOR_ID,
      email: "imp-actor@test.hebron",
      fullName: "Impersonation Actor",
    })
    .onConflictDoNothing();

  await db
    .insert(users)
    .values({
      id: TARGET_ID,
      email: "imp-target@test.hebron",
      fullName: "Impersonation Target",
    })
    .onConflictDoNothing();

  // Actor deve ser super_admin para startImpersonationAction passar
  await db
    .insert(roleAssignments)
    .values({ userId: ACTOR_ID, role: "super_admin", grantedBy: ACTOR_ID })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR_ID));
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, ACTOR_ID));
  await db.delete(users).where(eq(users.id, TARGET_ID));
  await db.delete(users).where(eq(users.id, ACTOR_ID));
  cookieStore.clear();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function lastImpersonationAudit(): Promise<
  typeof auditLog.$inferSelect | undefined
> {
  const rows = await db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.actorId, ACTOR_ID),
        eq(auditLog.action, "user.impersonated"),
      ),
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(1);
  return rows[0];
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("startImpersonationAction", () => {
  it("registra audit com event: start e nomes do ator e alvo", async () => {
    const { startImpersonationAction } =
      await import("../actions/impersonation");

    const formData = new FormData();
    formData.set("userId", TARGET_ID);

    // Captura o redirect (que lança internamente no Next.js) — o mock o engole
    try {
      await startImpersonationAction(formData);
    } catch {
      // redirect() em Next.js lança — ignorado no contexto de teste
    }

    const entry = await lastImpersonationAudit();
    expect(entry).toBeDefined();
    if (!entry) throw new Error("Expected audit entry");
    expect(entry.entityId).toBe(TARGET_ID);

    const diff = entry.diff as Record<string, unknown>;
    expect(diff["event"]).toBe("start");
    expect(diff["impersonatedName"]).toBe("Impersonation Target");
    expect(diff["actorName"]).toBe("Impersonation Actor");
  });

  it("define o cookie de impersonação com os dados corretos", async () => {
    const cookieValue = cookieStore.get(IMPERSONATION_COOKIE_NAME);
    expect(cookieValue).toBeDefined();
    if (!cookieValue) throw new Error("Expected cookie value");

    const { parseImpersonationState } =
      await import("@hebron/auth/impersonation");
    const state = parseImpersonationState(cookieValue);

    expect(state).not.toBeNull();
    if (!state) throw new Error("Expected state to be parsed");
    expect(state.actorId).toBe(ACTOR_ID);
    expect(state.impersonatedId).toBe(TARGET_ID);
    expect(typeof state.startedAt).toBe("string");
  });

  it("rejeita auto-impersonação (actor === target)", async () => {
    const { startImpersonationAction } =
      await import("../actions/impersonation");

    const formData = new FormData();
    formData.set("userId", ACTOR_ID); // mesmo ID do actor

    await expect(startImpersonationAction(formData)).rejects.toThrow(
      /impersonar a si mesmo/i,
    );
  });

  it("rejeita target inexistente no banco", async () => {
    const { startImpersonationAction } =
      await import("../actions/impersonation");

    const formData = new FormData();
    formData.set("userId", "00000000-0000-0000-0000-000000000099");

    await expect(startImpersonationAction(formData)).rejects.toThrow(
      /não encontrado/i,
    );
  });
});

describe("stopImpersonationAction", () => {
  it("registra audit com event: stop e durationMs numérico", async () => {
    const { stopImpersonationAction } =
      await import("../actions/impersonation");

    // Garante que o cookie de impersonação existe (pode ter sido setado pelo teste anterior)
    // Caso contrário, simula um cookie com startedAt no passado
    if (!cookieStore.has(IMPERSONATION_COOKIE_NAME)) {
      const pastStart = new Date(Date.now() - 5000).toISOString(); // 5s atrás
      const cookie = serializeImpersonationState({
        actorId: ACTOR_ID,
        actorName: "Impersonation Actor",
        impersonatedId: TARGET_ID,
        impersonatedName: "Impersonation Target",
        startedAt: pastStart,
      });
      cookieStore.set(IMPERSONATION_COOKIE_NAME, cookie);
    }

    try {
      await stopImpersonationAction(new FormData());
    } catch {
      // redirect() pode lançar — ignorado
    }

    const entry = await lastImpersonationAudit();
    expect(entry).toBeDefined();
    if (!entry) throw new Error("Expected audit entry");

    const diff = entry.diff as Record<string, unknown>;
    expect(diff["event"]).toBe("stop");
    expect(typeof diff["durationMs"]).toBe("number");
    expect(diff["durationMs"] as number).toBeGreaterThanOrEqual(0);
    expect(typeof diff["durationLabel"]).toBe("string");
  });

  it("após stop, o cookie de impersonação é removido", () => {
    expect(cookieStore.has(IMPERSONATION_COOKIE_NAME)).toBe(false);
  });
});

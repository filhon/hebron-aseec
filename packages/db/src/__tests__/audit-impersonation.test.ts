/**
 * audit-impersonation.test.ts — PACOTE 6 (AUDIT/04-BACKLOG-CORRECAO.md).
 *
 * logAudit's `realActorId` is the single choke point that keeps the audit
 * trail honest while a super_admin is impersonating: every app's action
 * still calls its local lib/audit.ts wrapper with `actorId` set to whatever
 * `resolveSession` resolved (the impersonated user, by design — see
 * @hebron/auth/server), and each wrapper now auto-fills `realActorId` from
 * the impersonation cookie. This test covers the override itself, not the
 * cookie plumbing (see packages/auth's server-impersonation.test.ts for that).
 */
import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, auditLog } from "@hebron/db/schema";
import { logAudit } from "@hebron/db/audit";

const REAL_ACTOR_ID = "d2000000-0000-0000-0000-000000000001";
const IMPERSONATED_ID = "d2000000-0000-0000-0000-000000000002";

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorId, REAL_ACTOR_ID));
  await db.delete(users).where(eq(users.id, REAL_ACTOR_ID));
  await db.delete(users).where(eq(users.id, IMPERSONATED_ID));
});

describe("logAudit — realActorId (impersonation)", () => {
  it("writes realActorId as the row's actorId and keeps the impersonated id in the diff", async () => {
    await db.insert(users).values([
      {
        id: REAL_ACTOR_ID,
        email: "audit-imp-real@test.hebron",
        fullName: "Real Actor",
      },
      {
        id: IMPERSONATED_ID,
        email: "audit-imp-target@test.hebron",
        fullName: "Impersonated User",
      },
    ]);

    await logAudit({
      actorId: IMPERSONATED_ID,
      realActorId: REAL_ACTOR_ID,
      action: "user.updated",
      entity: "user",
      entityId: IMPERSONATED_ID,
      diff: { status: { before: "active", after: "suspended" } },
    });

    const rows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.actorId, REAL_ACTOR_ID));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.actorId).toBe(REAL_ACTOR_ID);
    expect(rows[0]?.diff).toEqual({
      status: { before: "active", after: "suspended" },
      _impersonatedId: IMPERSONATED_ID,
    });
  });

  it("leaves actorId untouched when realActorId is absent (no impersonation)", async () => {
    await logAudit({
      actorId: REAL_ACTOR_ID,
      action: "user.updated",
      entity: "user",
      entityId: REAL_ACTOR_ID,
      diff: { status: { before: "active", after: "suspended" } },
    });

    const rows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.actorId, REAL_ACTOR_ID));

    expect(rows).toHaveLength(2);
    const plain = rows.find((r) => r.entityId === REAL_ACTOR_ID);
    expect(plain?.diff).toEqual({
      status: { before: "active", after: "suspended" },
    });
  });

  it("leaves actorId untouched when realActorId equals actorId", async () => {
    await logAudit({
      actorId: REAL_ACTOR_ID,
      realActorId: REAL_ACTOR_ID,
      action: "user.updated",
      entity: "user",
      entityId: REAL_ACTOR_ID,
      diff: { status: { before: "suspended", after: "active" } },
    });

    const rows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.actorId, REAL_ACTOR_ID));

    expect(rows).toHaveLength(3);
    const noOverride = rows.find(
      (r) =>
        (r.diff as Record<string, unknown> | null)?.["_impersonatedId"] ===
        undefined,
    );
    expect(noOverride).toBeDefined();
  });
});

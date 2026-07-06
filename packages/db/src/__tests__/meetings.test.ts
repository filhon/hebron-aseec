/**
 * meetings.test.ts — ensureMonthlyMeetings (P-0.14)
 *
 * Núcleo extraído de apps/admin/src/actions/meetings.ts::autoCreateMonthlyMeetings.
 * Testa idempotência (não duplica reunião mensal já existente) e criação
 * para os próximos N meses.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq, gte } from "drizzle-orm";
import { db } from "../client";
import { users, roleAssignments } from "../schema/public";
import { meetingSessions, auditLog } from "../schema/admin";
import { ensureMonthlyMeetings } from "../meetings";

const ACTOR_ID = "eeaa0000-0000-0000-0000-000000000001";

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: ACTOR_ID,
      email: "meetings-test@test.hebron",
      fullName: "Meetings Test",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: ACTOR_ID, role: "super_admin" })
    .onConflictDoNothing();
});

afterAll(async () => {
  const today = new Date();
  await db
    .delete(meetingSessions)
    .where(
      and(eq(meetingSessions.type, "mensal"), gte(meetingSessions.date, today)),
    );
  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR_ID));
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, ACTOR_ID));
  await db.delete(users).where(eq(users.id, ACTOR_ID));
});

describe("ensureMonthlyMeetings", () => {
  it("cria reuniões mensais para os próximos meses", async () => {
    const { created, count } = await ensureMonthlyMeetings(
      { monthsAhead: 2 },
      ACTOR_ID,
    );
    expect(count).toBeGreaterThan(0);
    expect(created.every((m) => m.type === "mensal")).toBe(true);
  });

  it("é idempotente — segunda chamada não duplica meses já cobertos", async () => {
    await ensureMonthlyMeetings({ monthsAhead: 2 }, ACTOR_ID);
    const { count: secondCount } = await ensureMonthlyMeetings(
      { monthsAhead: 2 },
      ACTOR_ID,
    );
    expect(secondCount).toBe(0);
  });
});

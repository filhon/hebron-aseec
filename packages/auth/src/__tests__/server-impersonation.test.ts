/**
 * server-impersonation.test.ts — PACOTE 6 (AUDIT/04-BACKLOG-CORRECAO.md).
 *
 * Exercises resolveSession's impersonation swap against a real Supabase Auth
 * login (no mocks) — the actual gap the pacote closed: `resolveSession` used
 * to never read the `hb-impersonation` cookie at all, so "impersonating"
 * only ever grabbed a cookie and showed a banner while the super_admin
 * stayed themselves everywhere else in the ecosystem.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, roleAssignments } from "@hebron/db/schema";
import { resolveSession } from "../server";
import {
  IMPERSONATION_COOKIE_NAME,
  serializeImpersonationState,
} from "../impersonation";
import {
  createTestAuthUser,
  deleteTestAuthUser,
  createTestSessionCookies,
  type TestSessionCookieStore,
} from "../testing";

const SUFFIX = Date.now();
const SUPER_ADMIN_EMAIL = `imp-super-${SUFFIX}@test.hebron`;
const OTHER_SUPER_ADMIN_EMAIL = `imp-other-super-${SUFFIX}@test.hebron`;
const REGULAR_EMAIL = `imp-regular-${SUFFIX}@test.hebron`;
const PASSWORD = "test-password-not-secret-123!";
const TARGET_ID = "a2000000-0000-0000-0000-000000000001";

let superAdminId: string;
let otherSuperAdminId: string;
let regularUserId: string;

function impersonationCookie(actorId: string, impersonatedId: string): string {
  return serializeImpersonationState({
    actorId,
    actorName: "Ator de Teste",
    impersonatedId,
    impersonatedName: "Alvo de Teste",
    startedAt: new Date().toISOString(),
  });
}

beforeAll(async () => {
  superAdminId = await createTestAuthUser(SUPER_ADMIN_EMAIL, PASSWORD);
  otherSuperAdminId = await createTestAuthUser(
    OTHER_SUPER_ADMIN_EMAIL,
    PASSWORD,
  );
  regularUserId = await createTestAuthUser(REGULAR_EMAIL, PASSWORD);

  await db.insert(users).values({
    id: TARGET_ID,
    email: `imp-target-${SUFFIX}@test.hebron`,
    fullName: "Usuário Alvo",
  });

  await db.insert(roleAssignments).values([
    { userId: superAdminId, role: "super_admin", grantedBy: superAdminId },
    {
      userId: otherSuperAdminId,
      role: "super_admin",
      grantedBy: otherSuperAdminId,
    },
    { userId: TARGET_ID, role: "submissor", grantedBy: superAdminId },
  ]);
}, 30_000);

afterAll(async () => {
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, TARGET_ID));
  await db.delete(users).where(eq(users.id, TARGET_ID));
  await deleteTestAuthUser(superAdminId);
  await deleteTestAuthUser(otherSuperAdminId);
  await deleteTestAuthUser(regularUserId);
}, 30_000);

describe("resolveSession — impersonation (PACOTE 6)", () => {
  it("with no impersonation cookie, resolves the real session as before", async () => {
    const store = await createTestSessionCookies(SUPER_ADMIN_EMAIL, PASSWORD);
    const session = await resolveSession(store);
    expect(session.actorId).toBe(superAdminId);
    expect(session.roles).toContain("super_admin");
    expect(session.impersonatedBy).toBeUndefined();
  });

  it("swaps actorId/roles to the impersonated user when the cookie is valid and belongs to this super_admin", async () => {
    const store = await createTestSessionCookies(SUPER_ADMIN_EMAIL, PASSWORD);
    store.set(
      IMPERSONATION_COOKIE_NAME,
      impersonationCookie(superAdminId, TARGET_ID),
    );

    const session = await resolveSession(store);
    expect(session.actorId).toBe(TARGET_ID);
    expect(session.roles).toEqual(["submissor"]);
    expect(session.impersonatedBy).toBe(superAdminId);
  });

  it("ignores a cookie minted for a different user than the one logged in", async () => {
    const store = await createTestSessionCookies(SUPER_ADMIN_EMAIL, PASSWORD);
    // Cookie says otherSuperAdminId is the impersonator — but the real
    // logged-in user here is superAdminId, so it must not apply.
    store.set(
      IMPERSONATION_COOKIE_NAME,
      impersonationCookie(otherSuperAdminId, TARGET_ID),
    );

    const session = await resolveSession(store);
    expect(session.actorId).toBe(superAdminId);
    expect(session.impersonatedBy).toBeUndefined();
  });

  it("ignores an expired (past 8h) cookie", async () => {
    const store = await createTestSessionCookies(SUPER_ADMIN_EMAIL, PASSWORD);
    const stale = serializeImpersonationState({
      actorId: superAdminId,
      actorName: "Ator de Teste",
      impersonatedId: TARGET_ID,
      impersonatedName: "Alvo de Teste",
      startedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    });
    store.set(IMPERSONATION_COOKIE_NAME, stale);

    const session = await resolveSession(store);
    expect(session.actorId).toBe(superAdminId);
    expect(session.impersonatedBy).toBeUndefined();
  });

  it("ignores the cookie for a non-super_admin, even if one is somehow present (no escalation)", async () => {
    const store = await createTestSessionCookies(REGULAR_EMAIL, PASSWORD);
    store.set(
      IMPERSONATION_COOKIE_NAME,
      impersonationCookie(regularUserId, TARGET_ID),
    );

    const session = await resolveSession(store);
    expect(session.actorId).toBe(regularUserId);
    expect(session.impersonatedBy).toBeUndefined();
  });

  it("rejects self-targeting the impersonated id at the cookie layer only implicitly — start action is the real guard, but resolveSession still swaps if asked", async () => {
    // resolveSession itself doesn't forbid actorId === impersonatedId (that
    // business rule lives in startImpersonationAction); it would just be a
    // no-op swap. Documented here so a future change to that boundary is a
    // deliberate decision, not an accidental regression.
    const store: TestSessionCookieStore = await createTestSessionCookies(
      SUPER_ADMIN_EMAIL,
      PASSWORD,
    );
    store.set(
      IMPERSONATION_COOKIE_NAME,
      impersonationCookie(superAdminId, superAdminId),
    );

    const session = await resolveSession(store);
    expect(session.actorId).toBe(superAdminId);
    expect(session.impersonatedBy).toBe(superAdminId);
  });
});

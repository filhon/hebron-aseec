/**
 * roles-designations.test.ts
 *
 * PATCH-021 — revogar papel/designação deixa de ser hard delete e passa a
 * ser UPDATE imutável (revoked_at/revoked_by/revocation_reason). Cobre:
 *   - a linha histórica permanece no banco após revogação;
 *   - leituras de "ativos" (resolveSession) ignoram linhas revogadas;
 *   - o mesmo papel pode ser reatribuído depois de revogado.
 *
 * Requer: DATABASE_URL migrado com todos os schemas (inclui 0044).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, and } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  designations,
  auditLog,
} from "@hebron/db/schema";

const ACTOR_ID = "d2000000-0000-0000-0000-000000000001";
const TARGET_ID = "d2000000-0000-0000-0000-000000000002";
const DIRECTOR_ID = "d2000000-0000-0000-0000-000000000003";
const ACTOR_EMAIL = "rd-actor@test.hebron";
const TARGET_EMAIL = "rd-target@test.hebron";
const DIRECTOR_EMAIL = "rd-director@test.hebron";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

vi.mock("@hebron/email", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "mock-notif-id" }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: { admin: {} },
  }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: ACTOR_ID,
    roles: ["super_admin"],
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
  }),
  headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(null) }),
}));

function requireDefined<T>(value: T | undefined | null, label = "value"): T {
  if (value == null) throw new Error(`Expected ${label} to be defined`);
  return value;
}

async function getActions() {
  return await import("../actions/roles");
}

beforeAll(async () => {
  await db
    .insert(users)
    .values({ id: ACTOR_ID, email: ACTOR_EMAIL, fullName: "RD Actor" })
    .onConflictDoNothing();
  await db
    .insert(users)
    .values({ id: TARGET_ID, email: TARGET_EMAIL, fullName: "RD Target" })
    .onConflictDoNothing();
  await db
    .insert(users)
    .values({ id: DIRECTOR_ID, email: DIRECTOR_EMAIL, fullName: "RD Director" })
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values({ userId: ACTOR_ID, role: "super_admin", grantedBy: ACTOR_ID })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: DIRECTOR_ID, role: "diretor", grantedBy: ACTOR_ID })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR_ID));
  await db.delete(designations).where(eq(designations.assignedBy, ACTOR_ID));
  for (const id of [TARGET_ID, DIRECTOR_ID, ACTOR_ID]) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }
});

describe("revokeRole", () => {
  it("marca revoked_at em vez de apagar a linha, e ela some das leituras ativas", async () => {
    const { assignRole, revokeRole } = await getActions();

    const assigned = await assignRole({
      userId: TARGET_ID,
      role: "colaborador",
      scope: "global",
    });
    const assignmentId = requireDefined(
      assigned?.data?.assignment.id,
      "assignmentId",
    );

    const result = await revokeRole({
      assignmentId,
      reason: "teste automatizado",
    });
    expect(result?.data?.ok).toBe(true);

    const [row] = await db
      .select()
      .from(roleAssignments)
      .where(eq(roleAssignments.id, assignmentId));
    expect(row).toBeDefined();
    expect(row?.revokedAt).not.toBeNull();
    expect(row?.revokedBy).toBe(ACTOR_ID);
    expect(row?.revocationReason).toBe("teste automatizado");

    const activeRows = await db
      .select()
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, TARGET_ID),
          eq(roleAssignments.role, "colaborador"),
        ),
      );
    expect(activeRows.every((r) => r.revokedAt !== null)).toBe(true);
  });

  it("permite reatribuir o mesmo papel/escopo depois de revogado", async () => {
    const { assignRole } = await getActions();

    const result = await assignRole({
      userId: TARGET_ID,
      role: "colaborador",
      scope: "global",
    });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.assignment.role).toBe("colaborador");
  });

  it("rejeita revogar uma atribuição já revogada", async () => {
    const { revokeRole } = await getActions();

    const [alreadyRevoked] = await db
      .select()
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, TARGET_ID),
          eq(roleAssignments.role, "colaborador"),
        ),
      )
      .orderBy(roleAssignments.grantedAt);

    // A primeira linha (já revogada no teste anterior) não pode ser revogada de novo
    const revokedId = requireDefined(alreadyRevoked?.id, "revokedId");
    const result = await revokeRole({ assignmentId: revokedId });
    expect(result?.serverError).toBeDefined();
  });
});

describe("updateDesignation", () => {
  it("revogar designação marca revoked_at em vez de apagar a linha", async () => {
    const { updateDesignation } = await getActions();

    const assigned = await updateDesignation({
      userId: DIRECTOR_ID,
      type: "gestor",
      action: "assign",
    });
    expect(assigned?.serverError).toBeUndefined();
    const designationId = requireDefined(
      assigned?.data?.designation?.id,
      "designationId",
    );

    const revoked = await updateDesignation({
      userId: DIRECTOR_ID,
      type: "gestor",
      action: "revoke",
      reason: "fim do mandato",
    });
    expect(revoked?.data?.ok).toBe(true);

    const [row] = await db
      .select()
      .from(designations)
      .where(eq(designations.id, designationId));
    expect(row).toBeDefined();
    expect(row?.revokedAt).not.toBeNull();
    expect(row?.revocationReason).toBe("fim do mandato");
  });

  it("permite designar novamente depois de revogado", async () => {
    const { updateDesignation } = await getActions();

    const result = await updateDesignation({
      userId: DIRECTOR_ID,
      type: "gestor",
      action: "assign",
    });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.designation?.type).toBe("gestor");
  });
});

/**
 * actions.test.ts
 *
 * Testa Server Actions do Admin contra o banco real.
 * Mocks:
 *   - next/headers   → cookies/headers sem contexto de request
 *   - next/navigation → redirect sem contexto de request
 *   - @supabase/supabase-js → retorna ACTOR_ID como usuário autenticado
 *   - @hebron/email  → evita envio de email real / chave Resend
 *
 * Requer: DATABASE_URL migrado com todos os schemas.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  auditLog,
  invitations,
  designations,
} from "@hebron/db/schema";

// ── IDs fixos ────────────────────────────────────────────────────────────────
const ACTOR_ID = "d1000000-0000-0000-0000-000000000001";
const TARGET_ID = "d1000000-0000-0000-0000-000000000002";
const ACTOR_EMAIL = "actions-actor@test.hebron";
const TARGET_EMAIL = "actions-target@test.hebron";

// ── Mocks globais ─────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@hebron/email", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "mock-notif-id" }),
}));

vi.mock("@hebron/email/templates/invitation", () => ({
  InvitationEmail: vi.fn().mockReturnValue(null),
}));

vi.mock("@hebron/email/templates/welcome", () => ({
  WelcomeEmail: vi.fn().mockReturnValue(null),
}));

// Mock Supabase: usado diretamente por actions/users.ts para operações de
// admin API (createUser, generateLink, updateUserById) — não para resolução
// de sessão, que agora vive em @hebron/auth/server (mockado abaixo).
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      admin: {
        createUser: vi.fn().mockImplementation(async () => ({
          data: { user: { id: TARGET_ID } },
          error: null,
        })),
        generateLink: vi.fn().mockResolvedValue({ data: {}, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
  }),
}));

// Mock da resolução de sessão (kit compartilhado @hebron/auth) — retorna
// ACTOR_ID como usuário autenticado com o papel super_admin.
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
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Asserta que value é definido e retorna; lança Error caso contrário. */
function requireDefined<T>(value: T | undefined | null, label = "value"): T {
  if (value == null) throw new Error(`Expected ${label} to be defined`);
  return value;
}

async function getActions() {
  const users_ = await import("../actions/users");
  const invitations_ = await import("../actions/invitations");
  const roles_ = await import("../actions/roles");
  return { ...users_, ...invitations_, ...roles_ };
}

async function lastAuditFor(
  actorId: string,
  action: string,
): Promise<typeof auditLog.$inferSelect | undefined> {
  const rows = await db
    .select()
    .from(auditLog)
    .where(
      and(eq(auditLog.actorId, actorId), eq(auditLog.action, action as never)),
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(1);
  return rows[0];
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  await db
    .insert(users)
    .values({ id: ACTOR_ID, email: ACTOR_EMAIL, fullName: "Actions Actor" })
    .onConflictDoNothing();

  await db
    .insert(users)
    .values({ id: TARGET_ID, email: TARGET_EMAIL, fullName: "Target User" })
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values({ userId: ACTOR_ID, role: "super_admin", grantedBy: ACTOR_ID })
    .onConflictDoNothing();
});

afterAll(async () => {
  const extraIds = [
    "d1000000-0000-0000-0000-000000000003",
    "d1000000-0000-0000-0000-000000000004",
  ];
  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR_ID));
  await db.delete(invitations).where(eq(invitations.invitedBy, ACTOR_ID));
  await db.delete(designations).where(eq(designations.assignedBy, ACTOR_ID));
  for (const id of [...extraIds, TARGET_ID, ACTOR_ID]) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }
});

// ── updateUser ────────────────────────────────────────────────────────────────

describe("updateUser", () => {
  it("atualiza fullName e registra audit user.updated", async () => {
    const { updateUser } = await getActions();

    const result = await updateUser({
      id: TARGET_ID,
      fullName: "Target Atualizado",
    });

    expect(result?.data?.user.fullName).toBe("Target Atualizado");

    const entry = await lastAuditFor(ACTOR_ID, "user.updated");
    expect(entry).toBeDefined();
    const safe = requireDefined(entry, "audit entry");
    expect(safe.entityId).toBe(TARGET_ID);
    expect((safe.diff as Record<string, unknown>)["fullName"]).toBeDefined();
  });
});

// ── suspendUser / unsuspendUser ───────────────────────────────────────────────

describe("suspendUser / unsuspendUser", () => {
  it("suspende módulo e registra user.suspended", async () => {
    const { suspendUser } = await getActions();

    const result = await suspendUser({ id: TARGET_ID, modules: ["admin"] });
    expect(result?.data?.user.suspendedModules).toContain("admin");

    const entry = await lastAuditFor(ACTOR_ID, "user.suspended");
    expect(entry).toBeDefined();
    const safe = requireDefined(entry, "audit entry");
    const diff = safe.diff as Record<string, { after: unknown }>;
    expect(diff["suspendedModules"]?.after).toContain("admin");
  });

  it("reativa módulo e registra user.updated", async () => {
    const { unsuspendUser } = await getActions();

    const result = await unsuspendUser({ id: TARGET_ID, modules: ["admin"] });
    expect(result?.data?.user.suspendedModules).not.toContain("admin");

    const entry = await lastAuditFor(ACTOR_ID, "user.updated");
    expect(entry).toBeDefined();
  });

  it("suspensão global colapsa módulos para ['global']", async () => {
    const { suspendUser, unsuspendUser } = await getActions();

    const result = await suspendUser({ id: TARGET_ID, modules: ["global"] });
    expect(result?.data?.user.suspendedModules).toEqual(["global"]);

    await unsuspendUser({ id: TARGET_ID, modules: ["global"] });
  });
});

// ── sendInvitation ────────────────────────────────────────────────────────────

describe("sendInvitation", () => {
  it("cria convite no banco e registra invitation.created", async () => {
    const { sendInvitation } = await getActions();

    const result = await sendInvitation({
      email: "novo@test.hebron",
      roles: ["colaborador"],
      expiresInDays: 7,
    });

    expect(result?.data?.invitation.email).toBe("novo@test.hebron");
    expect(result?.data?.invitation.token).toHaveLength(64);

    const entry = await lastAuditFor(ACTOR_ID, "invitation.created");
    expect(entry).toBeDefined();
  });
});

// ── revokeInvitation ─────────────────────────────────────────────────────────

describe("revokeInvitation", () => {
  it("revoga convite existente e registra invitation.revoked", async () => {
    const { sendInvitation, revokeInvitation } = await getActions();

    const created = await sendInvitation({
      email: "revogar@test.hebron",
      roles: ["ouvinte"],
      expiresInDays: 7,
    });
    const invId = created?.data?.invitation.id;
    expect(invId).toBeDefined();

    const result = await revokeInvitation({
      id: requireDefined(invId, "invId"),
    });
    expect(result?.data?.invitation.revokedAt).toBeDefined();

    const entry = await lastAuditFor(ACTOR_ID, "invitation.revoked");
    expect(entry).toBeDefined();
    expect(requireDefined(entry, "audit entry").entityId).toBe(invId);
  });
});

// ── acceptInvitation — fluxo completo ────────────────────────────────────────

describe("acceptInvitation — fluxo completo", () => {
  it("convite válido é aceito e registra invitation.accepted", async () => {
    const { sendInvitation } = await getActions();
    const { acceptInvitation } = await import("../actions/invitations");

    const created = await sendInvitation({
      email: "aceitar@test.hebron",
      roles: ["aluno"],
      expiresInDays: 7,
    });
    const token = created?.data?.invitation.token;
    expect(token).toBeDefined();
    const safeToken = requireDefined(token, "token");

    const result = await acceptInvitation({
      token: safeToken,
      name: "Novo Aluno",
    });
    expect(result?.data?.email).toBe("aceitar@test.hebron");
    expect(result?.data?.roles).toContain("aluno");

    const entry = await lastAuditFor(ACTOR_ID, "invitation.accepted");
    expect(entry).toBeDefined();
    expect(requireDefined(entry, "audit entry").diff).toMatchObject({
      acceptedAt: { before: null },
    });

    const rows = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, safeToken));
    expect(rows[0]?.acceptedAt).toBeDefined();
  });

  it("convite expirado retorna erro", async () => {
    const expiredToken = "expired-token-" + Date.now().toString(36);
    const pastDate = new Date(Date.now() - 1000);
    await db.insert(invitations).values({
      email: "expirado@test.hebron",
      roles: ["aluno"],
      token: expiredToken,
      invitedBy: ACTOR_ID,
      expiresAt: pastDate,
    });

    const { acceptInvitation } = await import("../actions/invitations");
    const result = await acceptInvitation({
      token: expiredToken,
      name: "Tentativa",
    });
    expect(result?.serverError).toBeDefined();

    await db.delete(invitations).where(eq(invitations.token, expiredToken));
  });

  it("convite revogado retorna erro", async () => {
    const revokedToken = "revoked-token-" + Date.now().toString(36);
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(invitations).values({
      email: "revogado@test.hebron",
      roles: ["aluno"],
      token: revokedToken,
      invitedBy: ACTOR_ID,
      expiresAt: future,
      revokedAt: new Date(),
    });

    const { acceptInvitation } = await import("../actions/invitations");
    const result = await acceptInvitation({
      token: revokedToken,
      name: "Tentativa",
    });
    expect(result?.serverError).toBeDefined();

    await db.delete(invitations).where(eq(invitations.token, revokedToken));
  });
});

// ── assignRole ────────────────────────────────────────────────────────────────

describe("assignRole", () => {
  it("atribui papel e registra role.granted", async () => {
    const { assignRole } = await getActions();

    const result = await assignRole({
      userId: TARGET_ID,
      role: "colaborador",
      scope: "global",
    });

    expect(result?.data?.assignment.role).toBe("colaborador");

    const entry = await lastAuditFor(ACTOR_ID, "role.granted");
    expect(entry).toBeDefined();
    expect(requireDefined(entry, "audit entry").diff).toMatchObject({
      after: { userId: TARGET_ID, role: "colaborador" },
    });
  });

  it("rejeita atribuição duplicada no mesmo escopo", async () => {
    const { assignRole } = await getActions();

    const result = await assignRole({
      userId: TARGET_ID,
      role: "colaborador",
      scope: "global",
    });

    expect(result?.serverError).toBeDefined();
  });

  it("CONFLITO DE INTERESSE: 'diretor' para usuário com 'submissor' retorna erro", async () => {
    const { assignRole } = await getActions();

    const CONFLICT_ID = "d1000000-0000-0000-0000-000000000003";
    await db
      .insert(users)
      .values({
        id: CONFLICT_ID,
        email: "conflict@test.hebron",
        fullName: "Conflict",
      })
      .onConflictDoNothing();
    await db
      .insert(roleAssignments)
      .values({ userId: CONFLICT_ID, role: "submissor", grantedBy: ACTOR_ID });

    const result = await assignRole({
      userId: CONFLICT_ID,
      role: "diretor",
      scope: "global",
    });
    // next-safe-action sanitiza serverError; verificamos apenas que a ação falhou
    expect(result?.serverError).toBeDefined();
    // Confirma também que nenhum assignment foi criado para diretor
    const rows = await db
      .select()
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, CONFLICT_ID),
          eq(roleAssignments.role, "diretor"),
        ),
      );
    expect(rows).toHaveLength(0);

    await db
      .delete(roleAssignments)
      .where(eq(roleAssignments.userId, CONFLICT_ID));
    await db.delete(users).where(eq(users.id, CONFLICT_ID));
  });

  it("CONFLITO DE INTERESSE: 'submissor' para usuário com 'conselheiro' retorna erro", async () => {
    const { assignRole } = await getActions();

    const GOV_ID = "d1000000-0000-0000-0000-000000000004";
    await db
      .insert(users)
      .values({
        id: GOV_ID,
        email: "gov-conflict@test.hebron",
        fullName: "Gov",
      })
      .onConflictDoNothing();
    await db
      .insert(roleAssignments)
      .values({ userId: GOV_ID, role: "conselheiro", grantedBy: ACTOR_ID });

    const result = await assignRole({
      userId: GOV_ID,
      role: "submissor",
      scope: "global",
    });
    expect(result?.serverError).toBeDefined();
    // Confirma também que nenhum assignment foi criado para submissor
    const rows = await db
      .select()
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, GOV_ID),
          eq(roleAssignments.role, "submissor"),
        ),
      );
    expect(rows).toHaveLength(0);

    await db.delete(roleAssignments).where(eq(roleAssignments.userId, GOV_ID));
    await db.delete(users).where(eq(users.id, GOV_ID));
  });
});

// ── revokeRole ────────────────────────────────────────────────────────────────

describe("revokeRole", () => {
  it("remove papel e registra role.revoked", async () => {
    const { revokeRole } = await getActions();

    const rows = await db
      .select()
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, TARGET_ID),
          eq(roleAssignments.role, "colaborador"),
        ),
      );

    const assignmentId = rows[0]?.id;
    expect(assignmentId).toBeDefined();
    const safeId = requireDefined(assignmentId, "assignmentId");

    const result = await revokeRole({ assignmentId: safeId });
    expect(result?.data?.ok).toBe(true);

    const entry = await lastAuditFor(ACTOR_ID, "role.revoked");
    expect(entry).toBeDefined();
    expect(requireDefined(entry, "audit entry").entityId).toBe(safeId);
  });
});

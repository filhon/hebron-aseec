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
import type * as EmailModule from "@hebron/email";
import {
  users,
  roleAssignments,
  auditLog,
  invitations,
  designations,
  dataDeletionRequests,
} from "@hebron/db/schema";

// ── IDs fixos ────────────────────────────────────────────────────────────────
const ACTOR_ID = "d1000000-0000-0000-0000-000000000001";
const TARGET_ID = "d1000000-0000-0000-0000-000000000002";
const PENDING_ID = "d1000000-0000-0000-0000-000000000005";
const PENDING_REJECT_ID = "d1000000-0000-0000-0000-000000000006";
const LGPD_EXEC_ID = "d1000000-0000-0000-0000-000000000007";
const LGPD_REJECT_ID = "d1000000-0000-0000-0000-000000000008";
const ACTOR_EMAIL = "actions-actor@test.hebron";
const TARGET_EMAIL = "actions-target@test.hebron";
const PENDING_EMAIL = "actions-pending@test.hebron";
const PENDING_REJECT_EMAIL = "actions-pending-reject@test.hebron";
const LGPD_EXEC_EMAIL = "actions-lgpd-exec@test.hebron";
const LGPD_REJECT_EMAIL = "actions-lgpd-reject@test.hebron";

// ── Mocks globais ─────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// P-1.10c: interpolateStoredTemplate fica real (importOriginal) — só
// createNotification é mockado, para exercitar o seam DB → email de fato
// contra admin.email_templates (seed real de P-1.10b) sem enviar via Resend.
vi.mock("@hebron/email", async (importOriginal) => {
  const actual = await importOriginal<typeof EmailModule>();
  return {
    ...actual,
    createNotification: vi.fn().mockResolvedValue({ id: "mock-notif-id" }),
  };
});

vi.mock("@hebron/email/templates/invitation", () => ({
  InvitationEmail: vi.fn().mockReturnValue(null),
}));

vi.mock("@hebron/email/templates/welcome", () => ({
  WelcomeEmail: vi.fn().mockReturnValue(null),
}));

vi.mock("@hebron/email/templates/signup-rejected", () => ({
  SignupRejectedEmail: vi.fn().mockReturnValue(null),
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
        generateLink: vi.fn().mockResolvedValue({
          data: {
            properties: { action_link: "https://example.com/reset?token=mock" },
          },
          error: null,
        }),
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

let lgpdExecRequestId = "";
let lgpdRejectRequestId = "";

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
    .insert(users)
    .values({
      id: PENDING_ID,
      email: PENDING_EMAIL,
      fullName: "Pending User",
      status: "pending_approval",
    })
    .onConflictDoNothing();

  await db
    .insert(users)
    .values({
      id: PENDING_REJECT_ID,
      email: PENDING_REJECT_EMAIL,
      fullName: "Pending Reject User",
      status: "pending_approval",
    })
    .onConflictDoNothing();

  await db
    .insert(users)
    .values({ id: LGPD_EXEC_ID, email: LGPD_EXEC_EMAIL, fullName: "LGPD Exec" })
    .onConflictDoNothing();

  await db
    .insert(users)
    .values({
      id: LGPD_REJECT_ID,
      email: LGPD_REJECT_EMAIL,
      fullName: "LGPD Reject",
    })
    .onConflictDoNothing();

  const [execRequest] = await db
    .insert(dataDeletionRequests)
    .values({ userId: LGPD_EXEC_ID, status: "pending" })
    .returning();
  lgpdExecRequestId = requireDefined(execRequest, "execRequest").id;

  const [rejectRequest] = await db
    .insert(dataDeletionRequests)
    .values({ userId: LGPD_REJECT_ID, status: "pending" })
    .returning();
  lgpdRejectRequestId = requireDefined(rejectRequest, "rejectRequest").id;

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
  for (const id of [
    ...extraIds,
    TARGET_ID,
    PENDING_ID,
    PENDING_REJECT_ID,
    LGPD_EXEC_ID,
    LGPD_REJECT_ID,
    ACTOR_ID,
  ]) {
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

// ── resetPassword ─────────────────────────────────────────────────────────────
// Regressão para F2-A2: resetPassword gerava o link via generateLink mas nunca
// o enviava a lugar nenhum — no-op do ponto de vista do usuário.

describe("resetPassword", () => {
  it("envia e-mail com o link de redefinição via createNotification", async () => {
    const { resetPassword } = await getActions();
    const { createNotification } = await import("@hebron/email");

    const result = await resetPassword({ id: TARGET_ID });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.ok).toBe(true);

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ channel: "email" }),
        email: expect.objectContaining({
          to: TARGET_EMAIL,
        }),
      }),
    );

    const entry = await lastAuditFor(ACTOR_ID, "user.updated");
    expect(entry).toBeDefined();
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

// acceptInvitation moved to apps/intranet (P-1.26) — its integration test
// lives at apps/intranet/src/__tests__/invitations.test.ts now.

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

// ── approveSignup / rejectSignup ───────────────────────────────────────────────
// Regressão para O-1/S1-16: "pending_approval" não era derivável do schema,
// então o botão de aprovação da fila de auto-signup foi omitido da UI.

describe("approveSignup / rejectSignup", () => {
  it("approveSignup ativa a conta, atribui submissor e registra user.approved", async () => {
    const { approveSignup } = await getActions();

    const result = await approveSignup({ id: PENDING_ID });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.ok).toBe(true);

    const [row] = await db.select().from(users).where(eq(users.id, PENDING_ID));
    expect(row?.status).toBe("active");

    const roles = await db
      .select()
      .from(roleAssignments)
      .where(eq(roleAssignments.userId, PENDING_ID));
    expect(roles.map((r) => r.role)).toContain("submissor");

    const entry = await lastAuditFor(ACTOR_ID, "user.approved");
    expect(entry).toBeDefined();
    expect(requireDefined(entry, "audit entry").entityId).toBe(PENDING_ID);
  });

  it("approveSignup rejeita cadastro que não está pending_approval", async () => {
    const { approveSignup } = await getActions();

    // PENDING_ID já foi aprovado pelo teste anterior — não está mais pending.
    const result = await approveSignup({ id: PENDING_ID });
    expect(result?.serverError).toBeDefined();
  });

  it("rejectSignup marca status=rejected, não atribui papel e registra user.rejected", async () => {
    const { rejectSignup } = await getActions();

    const result = await rejectSignup({ id: PENDING_REJECT_ID });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.ok).toBe(true);

    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, PENDING_REJECT_ID));
    expect(row?.status).toBe("rejected");

    const roles = await db
      .select()
      .from(roleAssignments)
      .where(eq(roleAssignments.userId, PENDING_REJECT_ID));
    expect(roles).toHaveLength(0);

    const entry = await lastAuditFor(ACTOR_ID, "user.rejected");
    expect(entry).toBeDefined();
    expect(requireDefined(entry, "audit entry").entityId).toBe(
      PENDING_REJECT_ID,
    );
  });
});

// ── resolveDeletionRequest / rejectDeletionRequest (D8-001) ────────────────
// Regressão para D8-001: `executeDataDeletion`/`rejectDataDeletion` existiam
// como primitiva testada (packages/auth) sem nenhum caminho de produto que
// as chamasse. Este bloco testa o caminho de produto — as Server Actions do
// Admin — não a primitiva em isolado.

describe("resolveDeletionRequest", () => {
  it("anonimiza a PII de verdade, desativa o login e conclui o ticket", async () => {
    const { resolveDeletionRequest } = await import("../actions/lgpd");
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseMock = createClient("url", "key");

    const result = await resolveDeletionRequest({
      requestId: lgpdExecRequestId,
    });
    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, LGPD_EXEC_ID));
    expect(row?.email).not.toBe(LGPD_EXEC_EMAIL);
    expect(row?.fullName).toBe("Usuário anonimizado");
    expect(row?.anonymizedAt).not.toBeNull();

    const [request] = await db
      .select()
      .from(dataDeletionRequests)
      .where(eq(dataDeletionRequests.id, lgpdExecRequestId));
    expect(request?.status).toBe("completed");
    expect(request?.resolvedBy).toBe(ACTOR_ID);

    // disableLogin foi chamado via Supabase Admin API com o usuário certo.
    expect(supabaseMock.auth.admin.updateUserById).toHaveBeenCalledWith(
      LGPD_EXEC_ID,
      { ban_duration: "876000h" },
    );

    const entry = await lastAuditFor(ACTOR_ID, "data.deletion_executed");
    expect(entry).toBeDefined();
    expect(requireDefined(entry, "audit entry").entityId).toBe(
      lgpdExecRequestId,
    );
  });

  it("é idempotente — reexecutar um pedido já concluído não falha nem duplica a anonimização", async () => {
    const { resolveDeletionRequest } = await import("../actions/lgpd");

    // lgpdExecRequestId já foi concluído pelo teste anterior — anonymizeUser
    // (P-0.13) é idempotente por design, então isso converge sem erro em vez
    // de recusar (só "rejected" é um estado terminal que recusa reexecução).
    const result = await resolveDeletionRequest({
      requestId: lgpdExecRequestId,
    });
    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, LGPD_EXEC_ID));
    expect(row?.fullName).toBe("Usuário anonimizado");
  });
});

describe("rejectDeletionRequest", () => {
  it("recusa com justificativa, registra resolutionNotes e notifica o titular", async () => {
    const { rejectDeletionRequest } = await import("../actions/lgpd");
    const { createNotification } = await import("@hebron/email");

    const notes = "Obrigação contábil em curso — retenção exigida por lei.";
    const result = await rejectDeletionRequest({
      requestId: lgpdRejectRequestId,
      notes,
    });
    expect(result?.serverError).toBeUndefined();

    const [request] = await db
      .select()
      .from(dataDeletionRequests)
      .where(eq(dataDeletionRequests.id, lgpdRejectRequestId));
    expect(request?.status).toBe("rejected");
    expect(request?.resolutionNotes).toBe(notes);
    expect(request?.resolvedBy).toBe(ACTOR_ID);

    // O titular (não anonimizado) continua com a PII intacta.
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, LGPD_REJECT_ID));
    expect(row?.anonymizedAt).toBeNull();

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: LGPD_REJECT_ID,
          body: expect.stringContaining(notes),
        }),
      }),
    );

    const entry = await lastAuditFor(ACTOR_ID, "data.deletion_rejected");
    expect(entry).toBeDefined();
    expect(requireDefined(entry, "audit entry").entityId).toBe(
      lgpdRejectRequestId,
    );
  });

  it("exige justificativa com pelo menos 10 caracteres", async () => {
    const { rejectDeletionRequest } = await import("../actions/lgpd");

    const result = await rejectDeletionRequest({
      requestId: lgpdRejectRequestId,
      notes: "curto",
    });
    expect(result?.validationErrors).toBeDefined();
  });
});

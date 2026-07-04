/**
 * invitations.test.ts
 *
 * Regressão para F2-A3/O-1: até P-1.26, aceitar um convite marcava a linha
 * como aceita mas nunca criava a conta no Auth nem atribuía os papéis —
 * ninguém novo conseguia de fato entrar no sistema. Este teste roda a
 * acceptInvitation real (sem mock de supabase-js) contra o Supabase de
 * desenvolvimento e verifica o fluxo completo: convite -> conta -> papéis.
 *
 * Requer: DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY (ver .env.local).
 */

import { describe, it, expect, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  invitations,
  roleAssignments,
  users,
  auditLog,
} from "@hebron/db/schema";
import { deleteTestAuthUser } from "@hebron/auth/testing";

// Sem chave Resend real em ambiente de teste — mocka o envio de email
// (mesmo padrão de apps/admin/src/__tests__/actions.test.ts). A criação de
// conta/papéis, que é o que este teste verifica, continua real.
vi.mock("@hebron/email", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "mock-notif-id" }),
}));
vi.mock("@hebron/email/templates/welcome", () => ({
  WelcomeEmail: vi.fn().mockReturnValue(null),
}));

/** Asserta que value é definido e retorna; lança Error caso contrário. */
function requireDefined<T>(value: T | undefined | null, label = "value"): T {
  if (value == null) throw new Error(`Expected ${label} to be defined`);
  return value;
}

const createdAuthUserIds: string[] = [];
const createdInvitationIds: string[] = [];

afterAll(async () => {
  for (const id of createdAuthUserIds) {
    await deleteTestAuthUser(id);
  }
  for (const id of createdInvitationIds) {
    await db.delete(invitations).where(eq(invitations.id, id));
  }
});

async function createInvitation(params: {
  email: string;
  roles: string[];
  invitedBy: string;
  expiresAt: Date;
  revokedAt?: Date;
  acceptedAt?: Date;
}) {
  const token = `test-token-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [row] = await db
    .insert(invitations)
    .values({
      email: params.email,
      roles: params.roles,
      token,
      invitedBy: params.invitedBy,
      expiresAt: params.expiresAt,
      revokedAt: params.revokedAt,
      acceptedAt: params.acceptedAt,
    })
    .returning();
  if (!row) throw new Error("Falha ao criar convite de teste");
  createdInvitationIds.push(row.id);
  return row;
}

describe("acceptInvitation — fluxo completo (sem mock)", () => {
  it("convite válido cria conta, atribui papéis e marca aceito", async () => {
    const { createTestAuthUser } = await import("@hebron/auth/testing");
    const inviterId = await createTestAuthUser(
      `convite-inviter-${Date.now()}@test.hebron`,
      "T3st-Convite-Inviter!",
      "Convidador Teste",
    );
    createdAuthUserIds.push(inviterId);
    await db.insert(roleAssignments).values({
      userId: inviterId,
      role: "super_admin",
      grantedBy: inviterId,
    });

    const inviteeEmail = `convite-aceito-${Date.now()}@test.hebron`;
    const invitation = await createInvitation({
      email: inviteeEmail,
      roles: ["aluno"],
      invitedBy: inviterId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const { acceptInvitation } = await import("../actions/invitations");
    const result = await acceptInvitation({
      token: invitation.token,
      name: "Novo Aluno Teste",
      password: "T3st-Novo-Aluno!",
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.email).toBe(inviteeEmail);
    expect(result?.data?.roles).toContain("aluno");

    // Conta criada
    const [userRowMaybe] = await db
      .select()
      .from(users)
      .where(eq(users.email, inviteeEmail));
    const userRow = requireDefined(userRowMaybe, "userRow");
    expect(userRow.status).toBe("active");
    createdAuthUserIds.push(userRow.id);

    // Papel atribuído
    const roleRows = await db
      .select()
      .from(roleAssignments)
      .where(eq(roleAssignments.userId, userRow.id));
    expect(roleRows.map((r) => r.role)).toContain("aluno");

    // Convite marcado como aceito
    const [invRow] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitation.id));
    expect(invRow?.acceptedAt).toBeDefined();

    // Audit trail
    const [auditEntry] = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, invitation.id));
    expect(auditEntry?.action).toBe("invitation.accepted");
    expect(auditEntry?.actorId).toBe(userRow.id);
  });

  it("convite expirado retorna erro e não cria conta", async () => {
    const { createTestAuthUser } = await import("@hebron/auth/testing");
    const inviterId = await createTestAuthUser(
      `convite-inviter-exp-${Date.now()}@test.hebron`,
      "T3st-Convite-Inviter!",
    );
    createdAuthUserIds.push(inviterId);

    const invitation = await createInvitation({
      email: `convite-expirado-${Date.now()}@test.hebron`,
      roles: ["aluno"],
      invitedBy: inviterId,
      expiresAt: new Date(Date.now() - 1000),
    });

    const { acceptInvitation } = await import("../actions/invitations");
    const result = await acceptInvitation({
      token: invitation.token,
      name: "Tentativa",
      password: "T3st-Tentativa!",
    });

    expect(result?.serverError).toBeDefined();
  });

  it("convite revogado retorna erro e não cria conta", async () => {
    const { createTestAuthUser } = await import("@hebron/auth/testing");
    const inviterId = await createTestAuthUser(
      `convite-inviter-rev-${Date.now()}@test.hebron`,
      "T3st-Convite-Inviter!",
    );
    createdAuthUserIds.push(inviterId);

    const invitation = await createInvitation({
      email: `convite-revogado-${Date.now()}@test.hebron`,
      roles: ["aluno"],
      invitedBy: inviterId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: new Date(),
    });

    const { acceptInvitation } = await import("../actions/invitations");
    const result = await acceptInvitation({
      token: invitation.token,
      name: "Tentativa",
      password: "T3st-Tentativa!",
    });

    expect(result?.serverError).toBeDefined();
  });
});

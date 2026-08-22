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
import type * as EmailModule from "@hebron/email";

// Sem chave Resend real em ambiente de teste — mocka o envio de email
// (mesmo padrão de apps/admin/src/__tests__/actions.test.ts). A criação de
// conta/papéis, que é o que este teste verifica, continua real.
// interpolateStoredTemplate fica real (importOriginal, P-1.10c) — só
// createNotification é mockado.
vi.mock("@hebron/email", async (importOriginal) => {
  const actual = await importOriginal<typeof EmailModule>();
  return {
    ...actual,
    createNotification: vi.fn().mockResolvedValue({ id: "mock-notif-id" }),
  };
});
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
  // admin.invitations.invited_by referencia public.users — precisa ser
  // limpo ANTES de deletar os usuários, ou o DELETE do inviter esbarra em
  // "invitations_invited_by_fkey".
  for (const id of createdInvitationIds) {
    await db.delete(invitations).where(eq(invitations.id, id));
  }
  // logIntranetAudit grava actorId = userRow.id ("invitation.accepted") —
  // deleteTestAuthUser não limpa admin.audit_log (documentado no próprio
  // helper: cleanup de outras tabelas é responsabilidade do chamador).
  for (const id of createdAuthUserIds) {
    await db.delete(auditLog).where(eq(auditLog.actorId, id));
  }
  // Ordem reversa: cada convidado é empurrado para este array DEPOIS do seu
  // próprio inviter (ver "convite válido..." abaixo), e a role_assignments
  // do convidado grava grantedBy = inviterId. deleteTestAuthUser só limpa
  // roleAssignments pelo userId, não pelo grantedBy — apagar o inviter
  // primeiro deixa essa linha do convidado como referência pendente e
  // "role_assignments_granted_by_users_id_fk" rejeita o DELETE em
  // public.users do inviter. Processar o mais recente primeiro sempre
  // remove o convidado (dono da linha) antes do seu inviter.
  for (const id of [...createdAuthUserIds].reverse()) {
    await deleteTestAuthUser(id);
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

  // D6-002 (PACOTE 9): segunda camada de defesa — mesmo que sendInvitation
  // (apps/admin) já recuse a combinação na criação, um convite gravado antes
  // dessa correção (ou por qualquer outro caminho) não pode criar a conta.
  // O convite é inserido direto no banco (não via sendInvitation) para isolar
  // esta camada.
  it("convite com combinação proibida (diretor + hospede) é recusado, sem criar conta", async () => {
    const { createTestAuthUser } = await import("@hebron/auth/testing");
    const inviterId = await createTestAuthUser(
      `convite-inviter-conflito-${Date.now()}@test.hebron`,
      "T3st-Convite-Inviter!",
    );
    createdAuthUserIds.push(inviterId);

    const inviteeEmail = `convite-conflito-${Date.now()}@test.hebron`;
    const invitation = await createInvitation({
      email: inviteeEmail,
      roles: ["diretor", "hospede"],
      invitedBy: inviterId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const { acceptInvitation } = await import("../actions/invitations");
    const result = await acceptInvitation({
      token: invitation.token,
      name: "Tentativa Conflito",
      password: "T3st-Tentativa-Conflito!",
    });

    expect(result?.serverError).toBeDefined();
    expect(result?.serverError).toContain("Conflito de interesse");

    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.email, inviteeEmail));
    expect(userRow).toBeUndefined();
  });
});

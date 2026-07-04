/**
 * designation-governance.test.ts
 *
 * Regressão para F2-F1/F2-F2 (P-3.8b): approveBatch/authorizeBatch checavam
 * apenas papel (diretor/super_admin), nunca a designation (gestor/autorizador)
 * exigida pelo BRAIN §6.5 — e authorizeBatch, antes desta sessão, exigia
 * super_admin exclusivamente (nenhum diretor autorizador conseguia autorizar
 * no sistema). createWeeklyBatch notificava todos os diretores; agora vai
 * para o(s) gestor(es) (To) com o(s) autorizador(es) em cópia.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, and } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  designations,
  payables,
  batchApprovals,
  batchApprovalItems,
  auditLog,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

const createNotificationMock = vi.fn().mockResolvedValue({ id: "mock-id" });
vi.mock("@hebron/email", () => ({
  createNotification: (...args: unknown[]) => createNotificationMock(...args),
}));

const IDS = {
  gestor: "fdaa0000-0000-0000-0000-000000000001",
  autorizador: "fdaa0000-0000-0000-0000-000000000002",
  plainDiretor: "fdaa0000-0000-0000-0000-000000000003",
  superAdmin: "fdaa0000-0000-0000-0000-000000000004",
} as const;

async function actingAs(
  userId: string,
  roles: string[],
  userDesignations: string[],
) {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId: userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roles: roles as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    designations: userDesignations as any,
  });
}

// Cada chamada usa uma semana distinta e distante (2099) para não colidir
// com o UNIQUE (week_start, week_end) de outros testes/lotes reais.
let weekCounter = 0;

async function seedPayableAndBatch(payableId: string, batchId: string) {
  weekCounter++;
  const day = String(weekCounter).padStart(2, "0");
  const weekStart = `2099-08-${day}`;
  const weekEnd = `2099-08-${String(weekCounter + 20).padStart(2, "0")}`;

  await db.insert(payables).values({
    id: payableId,
    description: `Designation Governance Test ${payableId}`,
    amount: "500.00",
    dueDate: weekStart,
    status: "pendente",
    createdBy: IDS.gestor,
  });
  await db.insert(batchApprovals).values({
    id: batchId,
    weekStart,
    weekEnd,
  });
  await db.insert(batchApprovalItems).values({
    batchApprovalId: batchId,
    payableId,
  });
}

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.gestor,
        email: "gov-gestor@test.hebron",
        fullName: "Gov Gestor",
      },
      {
        id: IDS.autorizador,
        email: "gov-autorizador@test.hebron",
        fullName: "Gov Autorizador",
      },
      {
        id: IDS.plainDiretor,
        email: "gov-plain-diretor@test.hebron",
        fullName: "Gov Plain Diretor",
      },
      {
        id: IDS.superAdmin,
        email: "gov-super-admin@test.hebron",
        fullName: "Gov Super Admin",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      { userId: IDS.gestor, role: "diretor", grantedBy: IDS.gestor },
      { userId: IDS.autorizador, role: "diretor", grantedBy: IDS.gestor },
      { userId: IDS.plainDiretor, role: "diretor", grantedBy: IDS.gestor },
      { userId: IDS.superAdmin, role: "super_admin", grantedBy: IDS.gestor },
    ])
    .onConflictDoNothing();

  await db
    .insert(designations)
    .values([
      { type: "gestor", userId: IDS.gestor, assignedBy: IDS.gestor },
      {
        type: "autorizador",
        userId: IDS.autorizador,
        assignedBy: IDS.gestor,
      },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  // Duas fases: apagar todas as dependências de todos os users antes de
  // apagar qualquer user — designations.assigned_by referencia IDS.gestor a
  // partir de OUTRO user (autorizador), então apagar gestor cedo demais
  // (dentro de um loop por-usuário) viola designations_assigned_by_users_id_fk.
  for (const uid of Object.values(IDS)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, uid));
    await db.delete(designations).where(eq(designations.userId, uid));
    await db.delete(designations).where(eq(designations.assignedBy, uid));
    // approveBatch/authorizeBatch/createWeeklyBatch gravam audit_log — precisa
    // limpar antes de apagar o user, senão a FK audit_log_actor_id_fkey barra.
    await db.delete(auditLog).where(eq(auditLog.actorId, uid));
  }
  for (const uid of Object.values(IDS)) {
    await db.delete(users).where(eq(users.id, uid));
  }
});

describe("approveBatch — designation gestor (F2-F1)", () => {
  const payableId = "fdbb0000-0000-0000-0000-000000000001";
  const batchId = "fdcc0000-0000-0000-0000-000000000001";

  beforeAll(() => seedPayableAndBatch(payableId, batchId));
  afterAll(async () => {
    await db
      .delete(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, batchId));
    await db.delete(batchApprovals).where(eq(batchApprovals.id, batchId));
    await db.delete(payables).where(eq(payables.id, payableId));
  });

  it("diretor sem designation gestor → rejeitado", async () => {
    await actingAs(IDS.plainDiretor, ["diretor"], []);
    const { approveBatch } = await import("../actions/approval");
    const result = await approveBatch({ batchId });
    expect(result?.serverError).toBeDefined();

    const [batch] = await db
      .select()
      .from(batchApprovals)
      .where(eq(batchApprovals.id, batchId));
    expect(batch?.approvedBy).toBeNull();
  });

  it("diretor com designation gestor → aprova", async () => {
    await actingAs(IDS.gestor, ["diretor"], ["gestor"]);
    const { approveBatch } = await import("../actions/approval");
    const result = await approveBatch({ batchId });
    expect(result?.serverError).toBeUndefined();

    const [batch] = await db
      .select()
      .from(batchApprovals)
      .where(eq(batchApprovals.id, batchId));
    expect(batch?.approvedBy).toBe(IDS.gestor);
  });
});

describe("authorizeBatch — designation autorizador (F2-F1, BRAIN §6.5 passo 6)", () => {
  it("diretor sem designation autorizador → rejeitado", async () => {
    const payableId = "fdbb0000-0000-0000-0000-000000000002";
    const batchId = "fdcc0000-0000-0000-0000-000000000002";
    await seedPayableAndBatch(payableId, batchId);
    await db
      .update(batchApprovals)
      .set({ approvedBy: IDS.gestor, approvedAt: new Date() })
      .where(eq(batchApprovals.id, batchId));

    await actingAs(IDS.plainDiretor, ["diretor"], []);
    const { authorizeBatch } = await import("../actions/approval");
    const result = await authorizeBatch({ batchId });
    expect(result?.serverError).toBeDefined();

    await db
      .delete(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, batchId));
    await db.delete(batchApprovals).where(eq(batchApprovals.id, batchId));
    await db.delete(payables).where(eq(payables.id, payableId));
  });

  it("diretor com designation autorizador, diferente do aprovador → autoriza", async () => {
    const payableId = "fdbb0000-0000-0000-0000-000000000003";
    const batchId = "fdcc0000-0000-0000-0000-000000000003";
    await seedPayableAndBatch(payableId, batchId);
    await db
      .update(batchApprovals)
      .set({ approvedBy: IDS.gestor, approvedAt: new Date() })
      .where(eq(batchApprovals.id, batchId));

    await actingAs(IDS.autorizador, ["diretor"], ["autorizador"]);
    const { authorizeBatch } = await import("../actions/approval");
    const result = await authorizeBatch({ batchId });
    expect(result?.serverError).toBeUndefined();

    const [batch] = await db
      .select()
      .from(batchApprovals)
      .where(eq(batchApprovals.id, batchId));
    expect(batch?.authorizedBy).toBe(IDS.autorizador);

    await db
      .delete(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, batchId));
    await db.delete(batchApprovals).where(eq(batchApprovals.id, batchId));
    await db.delete(payables).where(eq(payables.id, payableId));
  });

  it("mesma pessoa que aprovou (mesmo com designation autorizador) → rejeitado (governança dual)", async () => {
    const payableId = "fdbb0000-0000-0000-0000-000000000004";
    const batchId = "fdcc0000-0000-0000-0000-000000000004";
    await seedPayableAndBatch(payableId, batchId);
    await db
      .update(batchApprovals)
      .set({ approvedBy: IDS.autorizador, approvedAt: new Date() })
      .where(eq(batchApprovals.id, batchId));

    await actingAs(IDS.autorizador, ["diretor"], ["autorizador"]);
    const { authorizeBatch } = await import("../actions/approval");
    const result = await authorizeBatch({ batchId });
    expect(result?.serverError).toBeDefined();

    await db
      .delete(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, batchId));
    await db.delete(batchApprovals).where(eq(batchApprovals.id, batchId));
    await db.delete(payables).where(eq(payables.id, payableId));
  });

  it("super_admin sem designation → autoriza (bypass confirmado)", async () => {
    const payableId = "fdbb0000-0000-0000-0000-000000000005";
    const batchId = "fdcc0000-0000-0000-0000-000000000005";
    await seedPayableAndBatch(payableId, batchId);
    await db
      .update(batchApprovals)
      .set({ approvedBy: IDS.gestor, approvedAt: new Date() })
      .where(eq(batchApprovals.id, batchId));

    await actingAs(IDS.superAdmin, ["super_admin"], []);
    const { authorizeBatch } = await import("../actions/approval");
    const result = await authorizeBatch({ batchId });
    expect(result?.serverError).toBeUndefined();

    const [batch] = await db
      .select()
      .from(batchApprovals)
      .where(eq(batchApprovals.id, batchId));
    expect(batch?.authorizedBy).toBe(IDS.superAdmin);

    await db
      .delete(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, batchId));
    await db.delete(batchApprovals).where(eq(batchApprovals.id, batchId));
    await db.delete(payables).where(eq(payables.id, payableId));
  });
});

describe("createWeeklyBatch — email vai ao gestor com autorizador em CC (F2-F2)", () => {
  it("com designations configuradas: To = gestor, Cc = autorizador", async () => {
    const referenceDate = new Date();
    const dayOfWeek = referenceDate.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(referenceDate);
    monday.setUTCDate(referenceDate.getUTCDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    function fmt(d: Date): string {
      const isoDate = d.toISOString().split("T")[0];
      if (!isoDate) throw new Error("Falha ao formatar data");
      return isoDate;
    }
    const weekStart = fmt(monday);
    const weekEnd = fmt(sunday);

    // Limpa qualquer lote pré-existente para a semana corrente (evita que uma
    // execução anterior faça createWeeklyBatch tomar o caminho "já existe" e
    // pular o envio de e-mail).
    const existing = await db
      .select({ id: batchApprovals.id })
      .from(batchApprovals)
      .where(
        and(
          eq(batchApprovals.weekStart, weekStart),
          eq(batchApprovals.weekEnd, weekEnd),
        ),
      );
    for (const b of existing) {
      await db
        .delete(batchApprovalItems)
        .where(eq(batchApprovalItems.batchApprovalId, b.id));
      await db.delete(batchApprovals).where(eq(batchApprovals.id, b.id));
    }

    const payableId = "fdbb0000-0000-0000-0000-000000000006";
    await db.insert(payables).values({
      id: payableId,
      description: "Weekly Batch Email Test",
      amount: "777.00",
      dueDate: weekStart,
      status: "pendente",
      createdBy: IDS.gestor,
    });

    createNotificationMock.mockClear();
    await actingAs(IDS.superAdmin, ["super_admin"], []);
    const { createWeeklyBatch } = await import("../actions/approval");
    const result = await createWeeklyBatch({ weekOffset: 0 });
    expect(result?.serverError).toBeUndefined();

    expect(createNotificationMock).toHaveBeenCalledTimes(1);
    const call = createNotificationMock.mock.calls[0]?.[0] as {
      data: { userId: string };
      email: { to: string; cc?: string[] };
    };
    expect(call.data.userId).toBe(IDS.gestor);
    expect(call.email.cc).toEqual(
      expect.arrayContaining(["gov-autorizador@test.hebron"]),
    );

    const createdBatch = result?.data?.batch;
    if (createdBatch) {
      await db
        .delete(batchApprovalItems)
        .where(eq(batchApprovalItems.batchApprovalId, createdBatch.id));
      await db
        .delete(batchApprovals)
        .where(eq(batchApprovals.id, createdBatch.id));
    }
    await db.delete(payables).where(eq(payables.id, payableId));
  });
});

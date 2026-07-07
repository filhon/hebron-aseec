/**
 * payables-override-block.test.ts — overrideBlock (P-3.11)
 *
 * "action de override auditada, exclusiva de super_admin, com justificativa
 * obrigatória" (BRAIN §6.2: "Inadimplência bloqueia pagamentos, super_admin
 * pode sobrescrever"). Cobre: papel exigido, justificativa obrigatória (via
 * schema Zod), transição bloqueado → pendente, e audit trail.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, roleAssignments, payables, auditLog } from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const SUPER_ADMIN_ID = "eeaa0000-0000-0000-0000-000000000001";
const DIRETOR_ID = "eeaa0000-0000-0000-0000-000000000002";

let currentSession = {
  actorId: SUPER_ADMIN_ID,
  roles: ["super_admin"] as string[],
  designations: [] as string[],
};

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(async () => currentSession),
}));

const IDS = {
  blockedPayable: "eebb0000-0000-0000-0000-000000000001",
  pendingPayable: "eebb0000-0000-0000-0000-000000000002",
};

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: SUPER_ADMIN_ID,
        email: "override-super@test.hebron",
        fullName: "Override SuperAdmin",
      },
      {
        id: DIRETOR_ID,
        email: "override-dir@test.hebron",
        fullName: "Override Diretor",
      },
    ])
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values([
      { userId: SUPER_ADMIN_ID, role: "super_admin" },
      { userId: DIRETOR_ID, role: "diretor" },
    ])
    .onConflictDoNothing();

  await db.insert(payables).values([
    {
      id: IDS.blockedPayable,
      description: "Payable bloqueado — teste override",
      amount: "500.00",
      dueDate: "2099-01-01",
      status: "bloqueado",
      blockedAt: new Date(),
      blockReason: "relatorio_vencido",
      createdBy: SUPER_ADMIN_ID,
    },
    {
      id: IDS.pendingPayable,
      description: "Payable pendente — não bloqueado",
      amount: "500.00",
      dueDate: "2099-01-01",
      status: "pendente",
      createdBy: SUPER_ADMIN_ID,
    },
  ]);
});

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.entityId, IDS.blockedPayable));
  await db.delete(payables).where(eq(payables.id, IDS.blockedPayable));
  await db.delete(payables).where(eq(payables.id, IDS.pendingPayable));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, SUPER_ADMIN_ID));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, DIRETOR_ID));
  await db.delete(users).where(eq(users.id, SUPER_ADMIN_ID));
  await db.delete(users).where(eq(users.id, DIRETOR_ID));
});

describe("overrideBlock", () => {
  it("rejeita diretor (não super_admin)", async () => {
    currentSession = {
      actorId: DIRETOR_ID,
      roles: ["diretor"],
      designations: [],
    };
    const { overrideBlock } = await import("../actions/payables");
    const result = await overrideBlock({
      payableId: IDS.blockedPayable,
      justification: "Justificativa com mais de vinte caracteres.",
    });
    expect(result?.serverError).toBeDefined();

    const [payable] = await db
      .select()
      .from(payables)
      .where(eq(payables.id, IDS.blockedPayable));
    expect(payable?.status).toBe("bloqueado");
  });

  it("rejeita justificativa curta (validação Zod)", async () => {
    currentSession = {
      actorId: SUPER_ADMIN_ID,
      roles: ["super_admin"],
      designations: [],
    };
    const { overrideBlock } = await import("../actions/payables");
    const result = await overrideBlock({
      payableId: IDS.blockedPayable,
      justification: "curta",
    });
    expect(result?.validationErrors).toBeDefined();
  });

  it("rejeita payable que não está bloqueado", async () => {
    currentSession = {
      actorId: SUPER_ADMIN_ID,
      roles: ["super_admin"],
      designations: [],
    };
    const { overrideBlock } = await import("../actions/payables");
    const result = await overrideBlock({
      payableId: IDS.pendingPayable,
      justification: "Justificativa com mais de vinte caracteres.",
    });
    expect(result?.serverError).toBeDefined();
  });

  it("super_admin com justificativa válida: libera o payable e audita", async () => {
    currentSession = {
      actorId: SUPER_ADMIN_ID,
      roles: ["super_admin"],
      designations: [],
    };
    const { overrideBlock } = await import("../actions/payables");
    const result = await overrideBlock({
      payableId: IDS.blockedPayable,
      justification: "Relatório entregue fisicamente, aguardando registro.",
    });
    expect(result?.serverError).toBeUndefined();

    const [payable] = await db
      .select()
      .from(payables)
      .where(eq(payables.id, IDS.blockedPayable));
    expect(payable?.status).toBe("pendente");
    expect(payable?.overriddenBy).toBe(SUPER_ADMIN_ID);
    expect(payable?.overrideJustification).toBeTruthy();

    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, IDS.blockedPayable));
    expect(
      audits.some((a) => a.action === "financeiro.payable.block_overridden"),
    ).toBe(true);
  });
});

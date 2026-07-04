/**
 * audit-abort.test.ts
 *
 * Regressão para CS-4/F3-Q4: financeiro é um módulo de governança — uma
 * falha ao gravar o audit deve ABORTAR a aprovação (não apenas logar e
 * seguir em frente, como o antigo try/catch em lib/audit.ts fazia).
 * approveBatch agora roda dentro de um db.transaction junto com o audit,
 * então a falha simulada abaixo deve não só fazer a action falhar, como
 * também garantir que a aprovação não fique parcialmente aplicada
 * (rollback real, não apenas erro reportado com dado órfão no banco).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  payables,
  batchApprovals,
  batchApprovalItems,
  auditLog,
} from "@hebron/db/schema";
import type * as AuditModule from "@hebron/db/audit";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const DIRETOR_ID = "faaa0000-0000-0000-0000-000000000001";

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: DIRETOR_ID,
    roles: ["diretor"],
    designations: ["gestor"],
  }),
}));

vi.mock("@hebron/db/audit", async (importOriginal) => {
  const actual = await importOriginal<typeof AuditModule>();
  return { ...actual, logAudit: vi.fn(actual.logAudit) };
});

const IDS = {
  diretor: DIRETOR_ID,
  payable: "fabb0000-0000-0000-0000-000000000001",
  batch: "facc0000-0000-0000-0000-000000000001",
} as const;

// Semana distante para não colidir com o UNIQUE (week_start, week_end) de
// lotes reais gerados por createWeeklyBatch.
const WEEK_START = "2099-01-05";
const WEEK_END = "2099-01-11";

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: IDS.diretor,
      email: "abort-fin-dir@test.hebron",
      fullName: "Abort Financeiro Diretor",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: IDS.diretor, role: "diretor", grantedBy: IDS.diretor })
    .onConflictDoNothing();

  await db.insert(payables).values({
    id: IDS.payable,
    description: "Payable Audit Abort Test",
    amount: "1234.56",
    dueDate: "2099-01-08",
    status: "pendente",
    createdBy: IDS.diretor,
  });

  await db.insert(batchApprovals).values({
    id: IDS.batch,
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
  });

  await db.insert(batchApprovalItems).values({
    batchApprovalId: IDS.batch,
    payableId: IDS.payable,
  });
});

afterAll(async () => {
  await db
    .delete(batchApprovalItems)
    .where(eq(batchApprovalItems.batchApprovalId, IDS.batch));
  await db.delete(batchApprovals).where(eq(batchApprovals.id, IDS.batch));
  await db.delete(payables).where(eq(payables.id, IDS.payable));
  await db.delete(auditLog).where(eq(auditLog.actorId, IDS.diretor));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.diretor));
  await db.delete(users).where(eq(users.id, IDS.diretor));
});

describe("approveBatch — falha de audit aborta a aprovação (governança dual)", () => {
  it("audit falhando: action retorna erro E nada foi aplicado (rollback real)", async () => {
    const { logAudit } = await import("@hebron/db/audit");
    vi.mocked(logAudit).mockRejectedValueOnce(
      new Error("audit boom (simulado)"),
    );

    const { approveBatch } = await import("../actions/approval");
    const result = await approveBatch({ batchId: IDS.batch });

    expect(result?.serverError).toBeDefined();

    const [batch] = await db
      .select()
      .from(batchApprovals)
      .where(eq(batchApprovals.id, IDS.batch));
    expect(batch?.approvedBy).toBeNull();

    const [payable] = await db
      .select()
      .from(payables)
      .where(eq(payables.id, IDS.payable));
    expect(payable?.status).toBe("pendente");
  });

  it("controle: com audit funcionando, a aprovação é aplicada normalmente", async () => {
    const { approveBatch } = await import("../actions/approval");
    const result = await approveBatch({ batchId: IDS.batch });

    expect(result?.serverError).toBeUndefined();

    const [batch] = await db
      .select()
      .from(batchApprovals)
      .where(eq(batchApprovals.id, IDS.batch));
    expect(batch?.approvedBy).toBe(IDS.diretor);

    const [payable] = await db
      .select()
      .from(payables)
      .where(eq(payables.id, IDS.payable));
    expect(payable?.status).toBe("aprovado");
  });
});

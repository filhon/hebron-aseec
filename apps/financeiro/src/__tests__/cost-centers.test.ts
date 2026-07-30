/**
 * cost-centers.test.ts — P-3.11b (CORRETIVO).
 *
 * financeiro.cost_centers.project_id era NOT NULL UNIQUE — um centro de
 * custo só nascia de um projeto aprovado (onProjectApproved). Não havia
 * createCostCenter em action nenhuma, e o selo "Geral" em centros-custo/
 * page.tsx era um estado inalcançável. Saída (a) escolhida com o Filipe:
 * project_id vira opcional (unicidade por projeto preservada via índice
 * único parcial) e createCostCenter/updateCostCenter passam a existir,
 * gate diretor+ (0071_financeiro_cost_center_administrativo.sql alinha a
 * RLS ao mesmo gate — cost_centers só tinha "FOR ALL ... super_admin" de
 * 0010, nunca coberta pelo alinhamento de 0070).
 *
 * Este arquivo cobre os dois critérios de aceite da saída (a):
 * 1. criar centro de custo administrativo pela tela (action) — aparece em
 *    getCostCenterOptions, e checkBudgetAlert dispara sobre ele.
 * 2. o gate diretorAction é o gate real (colaborador é negado).
 * A idempotência de onProjectApproved para centro de projeto já tem
 * cobertura própria em packages/db/src/__tests__/projetos-approval.test.ts
 * (não duplicada aqui).
 *
 * Cleanup: financeiro.transactions é imutável (trigger de 0010_financeiro,
 * ver transactions.test.ts) — a transação seedada para o teste de
 * checkBudgetAlert nunca é apagada, e por isso o centro de custo, a conta
 * bancária e o ator que a referenciam (via RESTRICT/FK) também não são
 * (mesmo padrão documentado em transactions.test.ts). O código do centro é
 * gerado por execução (não fixo) para que o teste de "cruza 80%" comece
 * sempre de uma base zerada, mesmo reexecutando contra o mesmo banco
 * compartilhado de dev. O orçamento (budgets), sem trigger de imutabilidade
 * e sem nada mais referenciando aquela linha, é removido no teardown.
 */

import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  bankAccounts,
  costCenters,
  budgets,
  transactions,
} from "@hebron/db/schema";
import type { Role } from "@hebron/types/roles";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

// checkBudgetAlert envia notificação por email ao(s) super_admin(s) — mockado
// para não depender de RESEND_API_KEY (mesmo padrão de governance.test.ts).
const createNotificationMock = vi.fn().mockResolvedValue({ id: "mock-id" });
vi.mock("@hebron/email", () => ({
  createNotification: (...args: unknown[]) => createNotificationMock(...args),
}));

const IDS = {
  actor: "cc3b0000-0000-0000-0000-000000000001",
  superAdmin: "cc3b0000-0000-0000-0000-000000000002",
  account: "cc3b0000-0000-0000-0000-000000000010",
} as const;

const CODE = `P311B-ADM-${randomUUID().slice(0, 8).toUpperCase()}`;

async function actingAs(roles: Role[]) {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId: IDS.actor,
    roles,
    designations: [],
  });
}

let budgetId = "";

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.actor,
        email: "cost-centers-test-actor@test.hebron",
        fullName: "Cost Centers Test Actor",
      },
      {
        id: IDS.superAdmin,
        email: "cost-centers-test-admin@test.hebron",
        fullName: "Cost Centers Test Admin",
      },
    ])
    .onConflictDoNothing();

  // "diretor" cobre cost_centers_insert_staff/update_staff (RLS real, lida
  // via has_role() dentro da transação — não o array mockado de
  // resolveSession).
  await db
    .insert(roleAssignments)
    .values([
      { userId: IDS.actor, role: "diretor", grantedBy: IDS.actor },
      { userId: IDS.superAdmin, role: "super_admin", grantedBy: IDS.actor },
    ])
    .onConflictDoNothing();

  await db
    .insert(bankAccounts)
    .values({
      id: IDS.account,
      bankName: "Banco Teste",
      nickname: "Conta Teste P-3.11b",
      accountType: "corrente",
      initialBalance: "0",
      createdBy: IDS.actor,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  if (budgetId) {
    await db.delete(budgets).where(eq(budgets.id, budgetId));
  }
});

describe("createCostCenter — centro de custo administrativo (P-3.11b)", () => {
  it("diretor cria um centro sem projeto associado, visível em getCostCenterOptions", async () => {
    const { createCostCenter } = await import("../actions/cost-centers");
    const { getCostCenterOptions } = await import("../lib/queries");

    await actingAs(["diretor"]);
    const created = await createCostCenter({
      code: CODE,
      name: "Aluguel e manutenção predial — Teste P-3.11b",
      budgetTotal: 1000,
    });
    expect(created?.serverError).toBeUndefined();
    expect(created?.data?.costCenter.projectId).toBeNull();

    await actingAs(["diretor"]);
    const options = await getCostCenterOptions();
    const option = options.find((o) => o.code === CODE);
    expect(option).toBeTruthy();
    expect(option?.projectId).toBeNull();
  });

  it("colaborador (sem papel diretor) é negado pelo gate de aplicação", async () => {
    const { createCostCenter } = await import("../actions/cost-centers");
    const deniedCode = `${CODE}-DENIED`;

    await actingAs(["colaborador"]);
    const denied = await createCostCenter({
      code: deniedCode,
      name: "Não deveria ser criado",
      budgetTotal: 0,
    });
    expect(denied?.serverError).toBeTruthy();

    const rows = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(eq(costCenters.code, deniedCode));
    expect(rows.length).toBe(0);
  });

  it("checkBudgetAlert dispara ao cruzar 80% de execução de um centro sem projeto", async () => {
    const { checkBudgetAlert } = await import("../lib/notifications");

    const [costCenter] = await db
      .select()
      .from(costCenters)
      .where(eq(costCenters.code, CODE));
    if (!costCenter) throw new Error("Centro de custo de teste não encontrado");

    const year = new Date().getFullYear();
    const [budget] = await db
      .insert(budgets)
      .values({
        name: "Orçamento Teste P-3.11b",
        year,
        costCenterId: costCenter.id,
        totalAmount: "1000.00",
        createdBy: IDS.actor,
      })
      .returning();
    budgetId = budget?.id ?? "";

    const today = new Date().toISOString().split("T")[0] ?? "";
    await db.insert(transactions).values({
      type: "debito",
      amount: "900.00",
      description: "Lançamento Teste P-3.11b",
      date: today,
      accountId: IDS.account,
      costCenterId: costCenter.id,
      createdBy: IDS.actor,
    });

    createNotificationMock.mockClear();
    await checkBudgetAlert({
      costCenterId: costCenter.id,
      transactionDate: today,
      newTransactionAmount: 900,
    });

    expect(createNotificationMock).toHaveBeenCalled();
    const call = createNotificationMock.mock.calls.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (args: any[]) => args[0]?.data?.payload?.costCenterId === costCenter.id,
    );
    expect(call).toBeTruthy();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((call as any)[0].data.channel).toBe("email");
  });
});

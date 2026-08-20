/**
 * integrations-financeiro-execution.test.ts — getProjectBudgetExecution (P-3.11)
 *
 * "Financeiro → Projetos: executado vs orçado em tempo real" — query
 * cross-schema exposta em packages/integrations/src/financeiro.ts, somando
 * os débitos lançados no centro de custo do projeto.
 *
 * financeiro.transactions é um ledger imutável (trigger de banco bloqueia
 * UPDATE/DELETE — 0010_financeiro.sql) e tudo que ela referencia via FK
 * RESTRICT (cost_center, bank_account, e transitivamente project/user) não
 * pode mais ser apagado depois que uma transação existe. Por isso este
 * fixture é permanente (idempotente via onConflictDoNothing/checagem prévia,
 * nunca via afterAll) — mesmo padrão do ator sistema em system-actor.test.ts.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  organizations,
  projects,
  costCenters,
  transactions,
  bankAccounts,
} from "@hebron/db/schema";
import { getProjectBudgetExecution } from "@hebron/integrations/financeiro";

const IDS = {
  submitter: "ecbb0000-0000-0000-0000-000000000001",
  org: "ecbb0000-0000-0000-0000-000000000002",
  project: "ecbb0000-0000-0000-0000-000000000003",
  projectNoCostCenter: "ecbb0000-0000-0000-0000-000000000004",
  account: "ecbb0000-0000-0000-0000-000000000005",
};

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: IDS.submitter,
      email: "integ-exec-sub@test.hebron",
      fullName: "Integ Execution Submissor",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: IDS.submitter, role: "submissor" })
    .onConflictDoNothing();
  await db
    .insert(organizations)
    .values({
      id: IDS.org,
      nome: "Org Integ Execution",
      createdBy: IDS.submitter,
    })
    .onConflictDoNothing();
  await db
    .insert(projects)
    .values([
      {
        id: IDS.project,
        title: "Projeto com execução",
        tipo: "anual",
        stage: "aprovado",
        submitterId: IDS.submitter,
        organizationId: IDS.org,
        budgetTotal: "10000.00",
        evaluationYear: new Date().getFullYear(),
      },
      {
        id: IDS.projectNoCostCenter,
        title: "Projeto sem centro de custo",
        tipo: "anual",
        stage: "validacao",
        submitterId: IDS.submitter,
        organizationId: IDS.org,
        budgetTotal: "5000.00",
        evaluationYear: new Date().getFullYear(),
      },
    ])
    .onConflictDoNothing();
  await db
    .insert(costCenters)
    .values({
      projectId: IDS.project,
      code: `TEST-EXEC-${IDS.project.slice(-8)}`,
      name: "Centro de custo teste",
      budgetTotal: "10000.00",
      status: "ativo",
    })
    .onConflictDoNothing();
  await db
    .insert(bankAccounts)
    .values({
      id: IDS.account,
      bankName: "Banco Teste",
      nickname: "Conta Teste",
      createdBy: IDS.submitter,
    })
    .onConflictDoNothing();

  const [costCenter] = await db
    .select({ id: costCenters.id })
    .from(costCenters)
    .where(eq(costCenters.projectId, IDS.project));
  if (!costCenter) throw new Error("Fixture: centro de custo não criado");

  // Ledger imutável: inserir só na primeira execução, para o total executado
  // (4500) não crescer a cada rerun da suíte.
  const existing = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.costCenterId, costCenter.id));
  if (existing.length === 0) {
    await db.insert(transactions).values([
      {
        type: "debito",
        amount: "3000.00",
        description: "Débito 1",
        date: "2026-01-15",
        accountId: IDS.account,
        costCenterId: costCenter.id,
        createdBy: IDS.submitter,
      },
      {
        type: "debito",
        amount: "1500.00",
        description: "Débito 2",
        date: "2026-02-15",
        accountId: IDS.account,
        costCenterId: costCenter.id,
        createdBy: IDS.submitter,
      },
      {
        // crédito não deve contar como execução de orçamento
        type: "credito",
        amount: "500.00",
        description: "Crédito irrelevante",
        date: "2026-02-20",
        accountId: IDS.account,
        costCenterId: costCenter.id,
        createdBy: IDS.submitter,
      },
    ]);
  }
});

describe("getProjectBudgetExecution (via @hebron/integrations/financeiro)", () => {
  it("soma apenas débitos do centro de custo do projeto", async () => {
    const result = await getProjectBudgetExecution(IDS.project);
    expect(result).toBeTruthy();
    if (!result) return;
    expect(result.budgetTotal).toBe(10000);
    expect(result.executedTotal).toBe(4500);
    expect(result.remaining).toBe(5500);
    expect(result.percentExecuted).toBeCloseTo(45, 5);
  });

  it("retorna null quando o projeto ainda não tem centro de custo", async () => {
    const result = await getProjectBudgetExecution(IDS.projectNoCostCenter);
    expect(result).toBeNull();
  });
});

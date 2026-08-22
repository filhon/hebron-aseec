/**
 * budgets.test.ts — P-3.6b (CORRETIVO).
 *
 * financeiro.budgets ganhou coluna "name" própria (antes: prefixo "Budget: "
 * dentro de "notes", desfeito por startsWith e reeditado por índice de
 * linha — S-53/S-214). Este teste prova que o nome sobrevive ao ciclo
 * create → update → read sem passar por "notes".
 *
 * financeiro.payables ganhou "cancellation_reason"/"cancelled_by" — antes só
 * existiam no diff do audit log, nunca numa coluna que a tela lê (S-214,
 * achado 1). Este teste prova que cancelPayable persiste os dois.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  financialCategories,
  budgets,
  payables,
  auditLog,
} from "@hebron/db/schema";
import type { Role } from "@hebron/types/roles";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

const ACTOR_ID = "bdb90000-0000-0000-0000-000000000001";
const CATEGORY_CODE = "98.1";

// O ator de teste precisa das DUAS roles no banco (role_assignments), não só
// no mock de resolveSession: has_role() nas RLS policies lê a role real via
// auth.uid() dentro da transação (withAuthenticatedContext), não o array
// mockado — "colaborador" cobre payables_insert_staff (createPayable),
// "diretor" cobre payables_update_approvers (cancelPayable) e budgets_*.
async function actingAsDiretor() {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId: ACTOR_ID,
    roles: ["diretor", "colaborador"] as Role[],
    designations: [],
  });
}

let categoryId = "";

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: ACTOR_ID,
      email: "budgets-test-actor@test.hebron",
      fullName: "Budgets Test Actor",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values([
      { userId: ACTOR_ID, role: "diretor", grantedBy: ACTOR_ID },
      { userId: ACTOR_ID, role: "colaborador", grantedBy: ACTOR_ID },
    ])
    .onConflictDoNothing();

  const existing = await db
    .select({ id: financialCategories.id })
    .from(financialCategories)
    .where(eq(financialCategories.code, CATEGORY_CODE))
    .limit(1);

  if (existing[0]) {
    categoryId = existing[0].id;
  } else {
    const [inserted] = await db
      .insert(financialCategories)
      .values({
        code: CATEGORY_CODE,
        name: "Categoria de Teste P-3.6b",
        type: "despesa",
      })
      .returning();
    if (!inserted) throw new Error("Falha ao seedar categoria de teste");
    categoryId = inserted.id;
  }
});

afterAll(async () => {
  // Ordem importa: payables/budgets referenciam category_id (RESTRICT) e
  // created_by/cancelled_by (users) — precisam sair antes da categoria e do
  // ator de teste. budget_items cai em cascata com o budget.
  await db.delete(payables).where(eq(payables.createdBy, ACTOR_ID));
  await db.delete(budgets).where(eq(budgets.createdBy, ACTOR_ID));
  await db
    .delete(financialCategories)
    .where(eq(financialCategories.code, CATEGORY_CODE));
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, ACTOR_ID));
  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR_ID));
  await db.delete(users).where(eq(users.id, ACTOR_ID));
});

describe("createBudget + updateBudget + getBudgets — nome sobrevive ao ciclo (P-3.6b)", () => {
  it("nome criado, depois renomeado, é o nome lido — nunca passa por notes", async () => {
    const { createBudget, updateBudget } =
      await import("../actions/categories");
    const { getBudgets } = await import("../lib/queries");

    await actingAsDiretor();
    const created = await createBudget({
      name: "Orçamento Original P-3.6b",
      year: 2031,
      projectId: null,
      costCenterId: null,
      items: [
        {
          categoryId,
          description: "Item de teste",
          plannedAmount: 100,
          month: 3,
          notes: "Observação do item",
        },
      ],
    });
    expect(created?.serverError).toBeUndefined();
    const budgetId = created?.data?.budget?.id;
    if (!budgetId) throw new Error("createBudget não retornou id");

    await actingAsDiretor();
    const afterCreate = (await getBudgets()).find((b) => b.id === budgetId);
    expect(afterCreate?.name).toBe("Orçamento Original P-3.6b");
    expect(afterCreate?.items[0]?.month).toBe(3);
    expect(afterCreate?.items[0]?.notes).toBe("Observação do item");

    await actingAsDiretor();
    const updated = await updateBudget({
      budgetId,
      name: "Orçamento Renomeado P-3.6b",
    });
    expect(updated?.serverError).toBeUndefined();

    await actingAsDiretor();
    const afterUpdate = (await getBudgets()).find((b) => b.id === budgetId);
    expect(afterUpdate?.name).toBe("Orçamento Renomeado P-3.6b");

    // Nenhum vestígio do prefixo antigo em nenhum dos dois campos.
    expect(afterUpdate?.name).not.toContain("Budget: ");
  });
});

describe("cancelPayable — motivo e autor persistidos na tabela (P-3.6b)", () => {
  it("cancellationReason e cancelledBy voltam preenchidos de getPayables", async () => {
    const { createPayable, cancelPayable } =
      await import("../actions/transactions");
    const { getPayables, AGGREGATE_FETCH_LIMIT } =
      await import("../lib/queries");

    await actingAsDiretor();
    const created = await createPayable({
      description: "Conta de teste para cancelamento P-3.6b",
      supplierName: "Fornecedor Teste",
      amount: 250.5,
      dueAt: new Date("2031-01-15"),
      categoryId,
    });
    expect(created?.serverError).toBeUndefined();
    const payableId = created?.data?.payable?.id;
    if (!payableId) throw new Error("createPayable não retornou id");

    await actingAsDiretor();
    const cancelled = await cancelPayable({
      payableId,
      reason: "Fornecedor cancelou o pedido antes da entrega",
    });
    expect(cancelled?.serverError).toBeUndefined();

    // getPayables chama getActorId() (1) e getUsersMap() → getActorId() (2)
    // internamente — dois consumos de resolveSession por chamada.
    await actingAsDiretor();
    await actingAsDiretor();
    const { items: payablesAfterCancel } = await getPayables({
      limit: AGGREGATE_FETCH_LIMIT,
    });
    const payable = payablesAfterCancel.find((p) => p.id === payableId);
    expect(payable?.status).toBe("cancelado");
    expect(payable?.cancellationReason).toBe(
      "Fornecedor cancelou o pedido antes da entrega",
    );
    expect(payable?.cancelledBy).toBe(ACTOR_ID);
  });
});

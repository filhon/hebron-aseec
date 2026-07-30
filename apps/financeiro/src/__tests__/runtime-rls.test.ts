/**
 * runtime-rls.test.ts — PATCH-016/P-0.17: prova que as Server Actions de
 * governança do módulo financeiro (approval.ts) rodam sob o papel
 * `authenticated` (withAuthenticatedContext, decisão B/P-0.10), não sob a
 * conexão superuser de `@hebron/db/client`.
 *
 * Mesmo padrão de apps/tarefas e apps/intranet: o cenário de negação usa um
 * ator cujo claim de designation (devolvido por `resolveSession`, mockado)
 * diverge da verdade em `public.designations` — só a RLS barra esse ator, o
 * gate JS (`diretorWithDesignationAction`) confiaria nele.
 *
 * Cobre também a descoberta feita ao ativar RLS de verdade nesta sessão:
 * `financeiro.batch_approvals_update_gestor` (0011_financeiro_rls.sql) só
 * concede UPDATE a diretor com designation 'gestor' (+ super_admin) — não
 * cobre o autorizador (segundo papel da governança dual), então
 * `authorizeBatch` precisou de `withSystemRole` para o UPDATE de
 * `batch_approvals` especificamente (ver comentário em actions/approval.ts).
 * O teste "autorizador real autoriza" abaixo prova que esse caminho continua
 * funcionando fim-a-fim pela action real, não apenas que a policy existe.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  designations,
  payables,
  batchApprovals,
  batchApprovalItems,
  auditLog,
  bankAccounts,
  financialCategories,
  budgets,
  budgetItems,
  bankImports,
  bankImportRows,
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

async function actingAs(
  userId: string,
  roles: string[],
  userDesignations: string[],
): Promise<void> {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId: userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roles: roles as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    designations: userDesignations as any,
  });
}

const IDS = {
  // Claim de "gestor" via resolveSession mockado, sem designation real —
  // simula gate de aplicação desatualizado; só a RLS barra.
  ghostGestor: "f1000000-0000-0000-0000-000000000001",
  realGestor: "f1000000-0000-0000-0000-000000000002",
  realAutorizador: "f1000000-0000-0000-0000-000000000003",
  // P-3.7b — mesmo padrão "claim vs. realidade": ghost* tem role reivindicada
  // só no resolveSession mockado (satisfaz o gate JS), sem nenhuma linha real
  // em public.role_assignments (só a RLS pode barrar).
  realColaborador: "f1000000-0000-0000-0000-000000000004",
  ghostColaborador: "f1000000-0000-0000-0000-000000000005",
  realDiretorStaff: "f1000000-0000-0000-0000-000000000006",
  ghostDiretorStaff: "f1000000-0000-0000-0000-000000000007",
} as const;

let weekCounter = 0;

async function seedPayableAndBatch(
  payableId: string,
  batchId: string,
): Promise<void> {
  weekCounter++;
  const day = String(weekCounter).padStart(2, "0");
  const weekStart = `2099-09-${day}`;
  const weekEnd = `2099-09-${String(weekCounter + 15).padStart(2, "0")}`;

  await db.insert(payables).values({
    id: payableId,
    description: `Runtime RLS Test ${payableId}`,
    amount: "777.00",
    dueDate: weekStart,
    status: "pendente",
    createdBy: IDS.realGestor,
  });
  await db.insert(batchApprovals).values({ id: batchId, weekStart, weekEnd });
  await db
    .insert(batchApprovalItems)
    .values({ batchApprovalId: batchId, payableId });
}

beforeAll(async () => {
  await db
    .insert(users)
    .values(
      Object.entries(IDS).map(([key, id]) => ({
        id,
        email: `runtime-rls-${key}@test.hebron`,
        fullName: `Runtime RLS ${key}`,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      { userId: IDS.realGestor, role: "diretor", grantedBy: IDS.realGestor },
      {
        userId: IDS.realAutorizador,
        role: "diretor",
        grantedBy: IDS.realGestor,
      },
      // ghostColaborador/ghostDiretorStaff DELIBERADAMENTE não recebem
      // linha real — é o ponto dos testes de recusa pelo banco (P-3.7b).
      {
        userId: IDS.realColaborador,
        role: "colaborador",
        grantedBy: IDS.realGestor,
      },
      {
        userId: IDS.realDiretorStaff,
        role: "diretor",
        grantedBy: IDS.realGestor,
      },
    ])
    .onConflictDoNothing();

  // ghostGestor DELIBERADAMENTE não recebe designation real — é o ponto
  // do primeiro teste.
  await db
    .insert(designations)
    .values([
      {
        type: "gestor",
        userId: IDS.realGestor,
        assignedBy: IDS.realGestor,
      },
      {
        type: "autorizador",
        userId: IDS.realAutorizador,
        assignedBy: IDS.realGestor,
      },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  for (const uid of Object.values(IDS)) {
    await db.delete(auditLog).where(eq(auditLog.actorId, uid));
    await db.delete(designations).where(eq(designations.userId, uid));
    await db.delete(designations).where(eq(designations.assignedBy, uid));
  }
  await db
    .delete(roleAssignments)
    .where(inArray(roleAssignments.userId, Object.values(IDS)));
  await db.delete(users).where(inArray(users.id, Object.values(IDS)));
});

describe("approveBatch — UPDATE em financeiro.batch_approvals roda sob RLS real", () => {
  const payableId = "f2000000-0000-0000-0000-000000000001";
  const batchId = "f3000000-0000-0000-0000-000000000001";

  beforeAll(() => seedPayableAndBatch(payableId, batchId));
  afterAll(async () => {
    await db
      .delete(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, batchId));
    await db.delete(batchApprovals).where(eq(batchApprovals.id, batchId));
    await db.delete(payables).where(eq(payables.id, payableId));
  });

  it("ator sem designation real é barrado pela RLS mesmo com claim de gestor no gate JS", async () => {
    await actingAs(IDS.ghostGestor, ["diretor"], ["gestor"]);
    const { approveBatch } = await import("../actions/approval");

    const result = await approveBatch({ batchId });

    expect(result?.serverError).toBeDefined();

    const [batch] = await db
      .select({ approvedBy: batchApprovals.approvedBy })
      .from(batchApprovals)
      .where(eq(batchApprovals.id, batchId));
    expect(batch?.approvedBy).toBeNull();
  });

  it("gestor com designation real aprova: lote e payables avançam, audit gravado", async () => {
    await actingAs(IDS.realGestor, ["diretor"], ["gestor"]);
    const { approveBatch } = await import("../actions/approval");

    const result = await approveBatch({ batchId });

    expect(result?.serverError).toBeUndefined();

    const [batch] = await db
      .select({ approvedBy: batchApprovals.approvedBy })
      .from(batchApprovals)
      .where(eq(batchApprovals.id, batchId));
    expect(batch?.approvedBy).toBe(IDS.realGestor);

    const [payable] = await db
      .select({ status: payables.status })
      .from(payables)
      .where(eq(payables.id, payableId));
    expect(payable?.status).toBe("aprovado");

    const [audit] = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(eq(auditLog.entityId, batchId));
    expect(audit?.action).toBe("financeiro.batch.approved");
  });
});

describe("authorizeBatch — batch_approvals_update_gestor não cobre autorizador; withSystemRole fecha o caminho", () => {
  const payableId = "f2000000-0000-0000-0000-000000000002";
  const batchId = "f3000000-0000-0000-0000-000000000002";

  beforeAll(async () => {
    await seedPayableAndBatch(payableId, batchId);
    // Pré-aprovado pelo gestor real via SQL direto — o foco deste describe é
    // authorizeBatch, não repetir a aprovação já coberta acima.
    await db
      .update(batchApprovals)
      .set({ approvedBy: IDS.realGestor, approvedAt: new Date() })
      .where(eq(batchApprovals.id, batchId));
    await db
      .update(payables)
      .set({ status: "aprovado", approvedBy: IDS.realGestor })
      .where(eq(payables.id, payableId));
  });

  afterAll(async () => {
    await db
      .delete(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, batchId));
    await db.delete(batchApprovals).where(eq(batchApprovals.id, batchId));
    await db.delete(payables).where(eq(payables.id, payableId));
  });

  it("autorizador real (diferente do gestor) autoriza: lote e payables avançam, audit atômico via withSystemRole", async () => {
    await actingAs(IDS.realAutorizador, ["diretor"], ["autorizador"]);
    const { authorizeBatch } = await import("../actions/approval");

    const result = await authorizeBatch({ batchId });

    expect(result?.serverError).toBeUndefined();

    const [batch] = await db
      .select({ authorizedBy: batchApprovals.authorizedBy })
      .from(batchApprovals)
      .where(eq(batchApprovals.id, batchId));
    expect(batch?.authorizedBy).toBe(IDS.realAutorizador);

    const [payable] = await db
      .select({ status: payables.status })
      .from(payables)
      .where(eq(payables.id, payableId));
    expect(payable?.status).toBe("autorizado");

    const [audit] = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(eq(auditLog.entityId, batchId));
    expect(audit?.action).toBe("financeiro.batch.authorized");
  });
});

// ===========================================================================
// P-3.7b — accounts/categories/budgets/budget_items: policies "*_mutate_admin"
// (FOR ALL super_admin-only) substituídas por policies por operação
// (0070_financeiro_rls_alinhada.sql). createBankAccount/createCategory/
// updateCategory/createBudget/updateBudget não usam mais withSystemRole —
// rodam sob RLS real, com o ator autenticado como authenticated.
// ===========================================================================

function requireId(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} não foi definido pela action`);
  return value;
}

describe("createBankAccount — INSERT em financeiro.accounts roda sob RLS real (colaborador)", () => {
  let createdAccountId: string | undefined;

  afterAll(async () => {
    if (createdAccountId) {
      await db
        .delete(bankAccounts)
        .where(eq(bankAccounts.id, createdAccountId));
    }
  });

  it("colaborador real cadastra conta bancária sem withSystemRole", async () => {
    await actingAs(IDS.realColaborador, ["colaborador"], []);
    const { createBankAccount } = await import("../actions/accounts");

    const result = await createBankAccount({
      name: "Conta RLS Test",
      bank: "Banco Teste",
      agency: "0001",
      accountNumber: "123456-7",
      type: "corrente",
      initialBalance: 100,
    });

    expect(result?.serverError).toBeUndefined();
    createdAccountId = result?.data?.account.id;
    expect(createdAccountId).toBeDefined();

    const [row] = await db
      .select()
      .from(bankAccounts)
      .where(
        eq(bankAccounts.id, requireId(createdAccountId, "createdAccountId")),
      );
    expect(row?.createdBy).toBe(IDS.realColaborador);
  });

  it("papel sem acesso ao módulo é recusado pelo banco, mesmo com claim de colaborador no gate JS", async () => {
    await actingAs(IDS.ghostColaborador, ["colaborador"], []);
    const { createBankAccount } = await import("../actions/accounts");

    const result = await createBankAccount({
      name: "Conta Ghost",
      bank: "Banco Ghost",
      agency: "0002",
      accountNumber: "999999-9",
      type: "corrente",
      initialBalance: 0,
    });

    expect(result?.serverError).toBeDefined();

    const rows = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.createdBy, IDS.ghostColaborador));
    expect(rows).toHaveLength(0);
  });
});

describe("createCategory/createBudget — INSERT/UPDATE em financeiro.categories/budgets roda sob RLS real (diretor)", () => {
  let createdCategoryId: string | undefined;
  let createdBudgetId: string | undefined;

  afterAll(async () => {
    if (createdBudgetId) {
      await db
        .delete(budgetItems)
        .where(eq(budgetItems.budgetId, createdBudgetId));
      await db.delete(budgets).where(eq(budgets.id, createdBudgetId));
    }
    if (createdCategoryId) {
      await db
        .delete(financialCategories)
        .where(eq(financialCategories.id, createdCategoryId));
    }
  });

  it("diretor real cria categoria sem withSystemRole", async () => {
    await actingAs(IDS.realDiretorStaff, ["diretor"], []);
    const { createCategory } = await import("../actions/categories");

    const result = await createCategory({
      code: "971",
      name: "Categoria RLS Test",
      type: "despesa",
      parentId: null,
    });

    expect(result?.serverError).toBeUndefined();
    createdCategoryId = result?.data?.category.id;
    expect(createdCategoryId).toBeDefined();
  });

  it("diretor real atualiza a categoria criada sem withSystemRole", async () => {
    await actingAs(IDS.realDiretorStaff, ["diretor"], []);
    const { updateCategory } = await import("../actions/categories");

    const categoryId = requireId(createdCategoryId, "createdCategoryId");
    const result = await updateCategory({
      categoryId,
      name: "Categoria RLS Test (renomeada)",
    });

    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(financialCategories)
      .where(eq(financialCategories.id, categoryId));
    expect(row?.name).toBe("Categoria RLS Test (renomeada)");
  });

  it("diretor real cria orçamento (budgets + budget_items) sem withSystemRole", async () => {
    await actingAs(IDS.realDiretorStaff, ["diretor"], []);
    const { createBudget } = await import("../actions/categories");

    const result = await createBudget({
      name: "Orçamento RLS Test",
      year: 2031,
      projectId: null,
      costCenterId: null,
      items: [
        {
          categoryId: requireId(createdCategoryId, "createdCategoryId"),
          description: "Item RLS Test",
          plannedAmount: 1000,
          month: null,
          notes: null,
        },
      ],
    });

    expect(result?.serverError).toBeUndefined();
    createdBudgetId = result?.data?.budget.id;
    expect(createdBudgetId).toBeDefined();

    const items = await db
      .select()
      .from(budgetItems)
      .where(
        eq(budgetItems.budgetId, requireId(createdBudgetId, "createdBudgetId")),
      );
    expect(items).toHaveLength(1);
  });

  it("papel sem acesso ao módulo é recusado pelo banco, mesmo com claim de diretor no gate JS", async () => {
    await actingAs(IDS.ghostDiretorStaff, ["diretor"], []);
    const { createCategory } = await import("../actions/categories");

    const result = await createCategory({
      code: "972",
      name: "Categoria Ghost",
      type: "despesa",
      parentId: null,
    });

    expect(result?.serverError).toBeDefined();

    const rows = await db
      .select()
      .from(financialCategories)
      .where(eq(financialCategories.code, "972"));
    expect(rows).toHaveLength(0);
  });
});

describe("reconcileRow — UPDATE em financeiro.bank_imports.matched_count roda sob RLS real (colaborador)", () => {
  const accountId = "f4000000-0000-0000-0000-000000000001";
  const bankImportId = "f4000000-0000-0000-0000-000000000002";
  const rowId = "f4000000-0000-0000-0000-000000000003";

  beforeAll(async () => {
    await db.insert(bankAccounts).values({
      id: accountId,
      bankName: "Banco Teste",
      nickname: "Conta Import Test",
      accountType: "corrente",
      createdBy: IDS.realColaborador,
    });
    await db.insert(bankImports).values({
      id: bankImportId,
      accountId,
      fileUrl: "https://example.com/fake.ofx",
      format: "ofx",
      importedBy: IDS.realColaborador,
      rowCount: 1,
      matchedCount: 0,
    });
    await db.insert(bankImportRows).values({
      id: rowId,
      bankImportId,
      date: "2031-01-05",
      amount: "150.00",
      description: "Lançamento RLS Test",
      status: "unmatched",
    });
  });

  afterAll(async () => {
    await db
      .delete(bankImportRows)
      .where(eq(bankImportRows.bankImportId, bankImportId));
    await db.delete(bankImports).where(eq(bankImports.id, bankImportId));
    await db.delete(bankAccounts).where(eq(bankAccounts.id, accountId));
  });

  it("colaborador real ignora a linha: matched_count é incrementado via authenticated, sem withSystemRole", async () => {
    await actingAs(IDS.realColaborador, ["colaborador"], []);
    const { reconcileRow } = await import("../actions/conciliation");

    const result = await reconcileRow({
      bankImportItemId: rowId,
      action: "ignorar",
    });

    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select({ status: bankImportRows.status })
      .from(bankImportRows)
      .where(eq(bankImportRows.id, rowId));
    expect(row?.status).toBe("ignored");

    const [importRow] = await db
      .select({ matchedCount: bankImports.matchedCount })
      .from(bankImports)
      .where(eq(bankImports.id, bankImportId));
    expect(importRow?.matchedCount).toBe(1);
  });
});

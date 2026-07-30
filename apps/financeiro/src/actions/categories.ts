"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import {
  financialCategories,
  budgets,
  budgetItems,
  costCenters,
} from "@hebron/db/schema";
import {
  createAccountCategorySchema,
  createBudgetSchema,
} from "@hebron/validators/financeiro";
import { diretorAction, superAdminAction } from "../lib/safe-action";
import { logFinanceiroAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// createCategory — create a node in the chart of accounts (plano de contas)
// System categories (is_system = true) are seeded in the migration and cannot
// be deleted. User-created categories can be deleted only if unused.
// ---------------------------------------------------------------------------

export const createCategory = diretorAction
  .schema(createAccountCategorySchema)
  .action(async ({ parsedInput: input, ctx }) => {
    // withSystemRole: "categories_mutate_admin" (0010_financeiro.sql) só
    // concede INSERT/UPDATE/DELETE a super_admin — não cobre diretor, que é
    // o gate de aplicação desta action (diretorAction). Mesmo padrão de
    // exceção documentado para admin.audit_log (F3-15/S-57): débito de RLS
    // registrado em SESSIONS.md, não corrigido aqui (fora de escopo alterar
    // policy).
    const category = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        withSystemRole(tx, async (sysTx) => {
          // Validate parent exists and is same type
          if (input.parentId) {
            const parentRows = await sysTx
              .select()
              .from(financialCategories)
              .where(eq(financialCategories.id, input.parentId))
              .limit(1);

            const parent = parentRows[0];
            if (!parent) throw new Error("Categoria pai não encontrada");

            if (parent.type !== input.type) {
              throw new Error(
                "A categoria filha deve ter o mesmo tipo (receita/despesa) que a categoria pai",
              );
            }
          }

          // Code uniqueness guard is enforced by DB unique constraint;
          // surface a friendlier error here
          const existingCode = await sysTx
            .select({ id: financialCategories.id })
            .from(financialCategories)
            .where(eq(financialCategories.code, input.code))
            .limit(1);

          if (existingCode.length > 0) {
            throw new Error(
              `Código "${input.code}" já existe no plano de contas`,
            );
          }

          const inserted = await sysTx
            .insert(financialCategories)
            .values({
              code: input.code,
              name: input.name,
              type: input.type,
              parentId: input.parentId ?? null,
              isSystem: false,
            })
            .returning();

          const category = inserted[0];
          if (!category) throw new Error("Falha ao criar categoria");
          return category;
        }),
    );

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.category.created",
      entity: "financial_category",
      entityId: category.id,
      diff: {
        code: category.code,
        name: category.name,
        type: category.type,
        parentId: category.parentId,
      },
    });

    return { category };
  });

// ---------------------------------------------------------------------------
// updateCategory — rename or re-parent a non-system category
// ---------------------------------------------------------------------------

const updateCategorySchema = z.object({
  categoryId: z.string().uuid("Categoria inválida"),
  name: z.string().min(3).max(200).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateCategory = diretorAction
  .schema(updateCategorySchema)
  .action(async ({ parsedInput: input, ctx }) => {
    // withSystemRole: mesmo débito de RLS de createCategory acima.
    const updated = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        withSystemRole(tx, async (sysTx) => {
          const rows = await sysTx
            .select()
            .from(financialCategories)
            .where(eq(financialCategories.id, input.categoryId))
            .limit(1);

          const category = rows[0];
          if (!category) throw new Error("Categoria não encontrada");

          if (category.isSystem) {
            throw new Error("Categorias do sistema não podem ser alteradas");
          }

          const patch: Partial<typeof financialCategories.$inferInsert> = {
            updatedAt: new Date(),
          };
          if (input.name !== undefined) patch.name = input.name;
          if (input.parentId !== undefined) patch.parentId = input.parentId;

          return sysTx
            .update(financialCategories)
            .set(patch)
            .where(eq(financialCategories.id, input.categoryId))
            .returning();
        }),
    );

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.category.updated",
      entity: "financial_category",
      entityId: input.categoryId,
      diff: { name: input.name, parentId: input.parentId },
    });

    return { category: updated[0] };
  });

// ---------------------------------------------------------------------------
// deleteCategory — soft-delete by checking it is not a system category
// and is not referenced by any payable, receivable, transaction, or budget item.
// ---------------------------------------------------------------------------

const deleteCategorySchema = z.object({
  categoryId: z.string().uuid("Categoria inválida"),
});

export const deleteCategory = superAdminAction
  .schema(deleteCategorySchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const category = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const rows = await tx
          .select()
          .from(financialCategories)
          .where(eq(financialCategories.id, input.categoryId))
          .limit(1);

        const category = rows[0];
        if (!category) throw new Error("Categoria não encontrada");

        if (category.isSystem) {
          throw new Error(
            "Categorias do sistema não podem ser removidas. Entre em contato com o administrador técnico.",
          );
        }

        // Check for children
        const children = await tx
          .select({ id: financialCategories.id })
          .from(financialCategories)
          .where(eq(financialCategories.parentId, input.categoryId))
          .limit(1);

        if (children.length > 0) {
          throw new Error(
            "Remova ou re-categorize todas as subcategorias antes de excluir esta categoria",
          );
        }

        // Hard-delete since there is no deletedAt on financialCategories.
        // FK constraints (onDelete: "restrict") on payables, receivables,
        // transactions, and budget_items will reject the delete if referenced.
        try {
          await tx
            .delete(financialCategories)
            .where(eq(financialCategories.id, input.categoryId));
        } catch {
          throw new Error(
            "Não é possível excluir esta categoria pois ela está em uso por lançamentos ou orçamentos",
          );
        }

        return category;
      },
    );

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.category.deleted",
      entity: "financial_category",
      entityId: input.categoryId,
      diff: { code: category.code, name: category.name },
    });

    return { ok: true };
  });

// ---------------------------------------------------------------------------
// createBudget — create an annual budget with line items
// totalAmount is derived from the sum of all items' plannedAmount.
// ---------------------------------------------------------------------------

export const createBudget = diretorAction
  .schema(createBudgetSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const totalAmount = input.items.reduce(
      (acc, item) => acc + item.plannedAmount,
      0,
    );

    // withSystemRole: mesmo débito de RLS de createCategory acima
    // ("budgets_mutate_admin"/"budget_items_mutate_admin" só concedem
    // INSERT/UPDATE/DELETE a super_admin — não cobrem diretor).
    const { budget, costCenterId } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        withSystemRole(tx, async (sysTx) => {
          // Resolve costCenterId from projectId if provided
          let costCenterId = input.costCenterId ?? null;

          if (!costCenterId && input.projectId) {
            const ccRows = await sysTx
              .select({ id: costCenters.id })
              .from(costCenters)
              .where(eq(costCenters.projectId, input.projectId))
              .limit(1);
            costCenterId = ccRows[0]?.id ?? null;
          }

          const budgetInserted = await sysTx
            .insert(budgets)
            .values({
              name: input.name,
              year: input.year,
              costCenterId,
              totalAmount: totalAmount.toFixed(2),
              createdBy: ctx.actorId,
            })
            .returning();

          const budget = budgetInserted[0];
          if (!budget) throw new Error("Falha ao criar orçamento");

          // Insert budget items
          await sysTx.insert(budgetItems).values(
            input.items.map((item) => ({
              budgetId: budget.id,
              categoryId: item.categoryId,
              plannedAmount: item.plannedAmount.toFixed(2),
              description: item.description,
              month: item.month,
              notes: item.notes,
            })),
          );

          return { budget, costCenterId };
        }),
    );

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.budget.created",
      entity: "budget",
      entityId: budget.id,
      diff: {
        name: input.name,
        year: input.year,
        costCenterId,
        totalAmount: totalAmount.toFixed(2),
        itemCount: input.items.length,
      },
    });

    return { budget, totalAmount };
  });

// ---------------------------------------------------------------------------
// updateBudget — update budget metadata (name, notes) — items not changed here
// ---------------------------------------------------------------------------

const updateBudgetSchema = z.object({
  budgetId: z.string().uuid("Orçamento inválido"),
  name: z.string().min(3).max(200).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateBudget = diretorAction
  .schema(updateBudgetSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    // withSystemRole: mesmo débito de RLS de createCategory acima.
    const updated = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        withSystemRole(tx, async (sysTx) => {
          const rows = await sysTx
            .select()
            .from(budgets)
            .where(eq(budgets.id, input.budgetId))
            .limit(1);

          const budget = rows[0];
          if (!budget) throw new Error("Orçamento não encontrado");

          const patch: Partial<typeof budgets.$inferInsert> = {
            updatedAt: new Date(),
          };
          if (input.name !== undefined) patch.name = input.name;
          if (input.notes !== undefined) patch.notes = input.notes;

          return sysTx
            .update(budgets)
            .set(patch)
            .where(eq(budgets.id, input.budgetId))
            .returning();
        }),
    );

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.budget.updated",
      entity: "budget",
      entityId: input.budgetId,
      diff: { name: input.name, notes: input.notes },
    });

    return { budget: updated[0] };
  });

// ---------------------------------------------------------------------------
// deleteBudget — remove a budget and its items (cascade in DB)
// Guard: cannot delete if year is the current year (protect active budgets).
// ---------------------------------------------------------------------------

const deleteBudgetSchema = z.object({
  budgetId: z.string().uuid("Orçamento inválido"),
});

export const deleteBudget = superAdminAction
  .schema(deleteBudgetSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const budget = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const rows = await tx
          .select()
          .from(budgets)
          .where(eq(budgets.id, input.budgetId))
          .limit(1);

        const budget = rows[0];
        if (!budget) throw new Error("Orçamento não encontrado");

        const currentYear = new Date().getFullYear();
        if (budget.year === currentYear) {
          throw new Error(
            "Não é possível excluir o orçamento do ano corrente. Contate o super_admin para uma exceção.",
          );
        }

        // budgetItems cascade-delete via FK
        await tx.delete(budgets).where(eq(budgets.id, input.budgetId));

        return budget;
      },
    );

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.budget.deleted",
      entity: "budget",
      entityId: input.budgetId,
      diff: { name: budget.name, year: budget.year },
    });

    return { ok: true };
  });

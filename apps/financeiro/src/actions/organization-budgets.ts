"use server";

import { and, eq } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { organizationBudgets } from "@hebron/db/schema";
import {
  createOrganizationBudgetSchema,
  updateOrganizationBudgetSchema,
} from "@hebron/validators/financeiro";
import { colaboradorAction } from "../lib/safe-action";
import { logFinanceiroAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// createOrganizationBudget — teto de orçamento por instituição/ano (S1-01).
// Fonte de verdade para checkOrganizationBudget (apps/projetos), substituindo
// o workaround em admin.system_settings.
// ---------------------------------------------------------------------------

export const createOrganizationBudget = colaboradorAction
  .schema(createOrganizationBudgetSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const budget = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const existing = await tx
          .select({ id: organizationBudgets.id })
          .from(organizationBudgets)
          .where(
            and(
              eq(organizationBudgets.organizationId, input.organizationId),
              eq(organizationBudgets.year, input.year),
            ),
          )
          .limit(1);

        if (existing[0]) {
          throw new Error(
            "Já existe um orçamento cadastrado para esta instituição neste ano — edite o valor existente",
          );
        }

        const inserted = await tx
          .insert(organizationBudgets)
          .values({
            organizationId: input.organizationId,
            year: input.year,
            amount: input.amount.toFixed(2),
            createdBy: ctx.actorId,
          })
          .returning();

        const budget = inserted[0];
        if (!budget) throw new Error("Falha ao criar orçamento da instituição");
        return budget;
      },
    );

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.organization_budget.created",
      entity: "organization_budget",
      entityId: budget.id,
      diff: {
        organizationId: input.organizationId,
        year: input.year,
        amount: input.amount.toFixed(2),
      },
    });

    return { budget };
  });

// ---------------------------------------------------------------------------
// updateOrganizationBudget — corrige o valor de um orçamento já cadastrado.
// Sem action de delete (imutabilidade — corrigir via UPDATE, não remover).
// ---------------------------------------------------------------------------

export const updateOrganizationBudget = colaboradorAction
  .schema(updateOrganizationBudgetSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const { budget, updated } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const rows = await tx
          .select()
          .from(organizationBudgets)
          .where(eq(organizationBudgets.id, input.organizationBudgetId))
          .limit(1);

        const budget = rows[0];
        if (!budget) throw new Error("Orçamento não encontrado");

        const updated = await tx
          .update(organizationBudgets)
          .set({ amount: input.amount.toFixed(2), updatedAt: new Date() })
          .where(eq(organizationBudgets.id, input.organizationBudgetId))
          .returning();

        return { budget, updated };
      },
    );

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.organization_budget.updated",
      entity: "organization_budget",
      entityId: input.organizationBudgetId,
      diff: {
        amount: { from: budget.amount, to: input.amount.toFixed(2) },
      },
    });

    return { budget: updated[0] };
  });

"use server";

import { eq } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { costCenters } from "@hebron/db/schema";
import {
  createCostCenterSchema,
  updateCostCenterSchema,
} from "@hebron/validators/financeiro";
import { diretorAction } from "../lib/safe-action";
import { logFinanceiroAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// createCostCenter — centro de custo administrativo (P-3.11b), sem projeto
// associado (aluguel, folha, energia, manutenção). Centros ligados a projeto
// continuam nascendo só de onProjectApproved (packages/db/src/
// projetos-approval.ts) — esta action nunca seta projectId.
// ---------------------------------------------------------------------------

export const createCostCenter = diretorAction
  .schema(createCostCenterSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    // "cost_centers_insert_staff" (0071_financeiro_cost_center_
    // administrativo.sql) cobre diretor — o gate de aplicação desta action
    // (diretorAction).
    const costCenter = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const existingCode = await tx
          .select({ id: costCenters.id })
          .from(costCenters)
          .where(eq(costCenters.code, input.code))
          .limit(1);

        if (existingCode.length > 0) {
          throw new Error(`Código "${input.code}" já está em uso`);
        }

        const inserted = await tx
          .insert(costCenters)
          .values({
            projectId: null,
            code: input.code,
            name: input.name,
            budgetTotal: input.budgetTotal.toFixed(2),
            status: "ativo",
          })
          .returning();

        const costCenter = inserted[0];
        if (!costCenter) throw new Error("Falha ao criar centro de custo");
        return costCenter;
      },
    );

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.cost_center.created",
      entity: "cost_center",
      entityId: costCenter.id,
      diff: {
        code: costCenter.code,
        name: costCenter.name,
        budgetTotal: costCenter.budgetTotal,
      },
    });

    return { costCenter };
  });

// ---------------------------------------------------------------------------
// updateCostCenter — renomeia, reorçamenta ou muda o status de um centro
// administrativo já existente (também funciona para um centro de projeto,
// mas não altera projectId — esse vínculo é imutável após a criação).
// ---------------------------------------------------------------------------

export const updateCostCenter = diretorAction
  .schema(updateCostCenterSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    // "cost_centers_update_staff" (0071_financeiro_cost_center_
    // administrativo.sql) cobre diretor — mesmo gate de aplicação de
    // createCostCenter acima.
    const updated = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const rows = await tx
          .select()
          .from(costCenters)
          .where(eq(costCenters.id, input.costCenterId))
          .limit(1);

        const costCenter = rows[0];
        if (!costCenter) throw new Error("Centro de custo não encontrado");

        const patch: Partial<typeof costCenters.$inferInsert> = {
          updatedAt: new Date(),
        };
        if (input.name !== undefined) patch.name = input.name;
        if (input.budgetTotal !== undefined)
          patch.budgetTotal = input.budgetTotal.toFixed(2);
        if (input.status !== undefined) patch.status = input.status;

        return tx
          .update(costCenters)
          .set(patch)
          .where(eq(costCenters.id, input.costCenterId))
          .returning();
      },
    );

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.cost_center.updated",
      entity: "cost_center",
      entityId: input.costCenterId,
      diff: {
        name: input.name,
        budgetTotal: input.budgetTotal,
        status: input.status,
      },
    });

    return { costCenter: updated[0] };
  });

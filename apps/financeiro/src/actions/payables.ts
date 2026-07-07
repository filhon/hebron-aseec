"use server";

import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { payables } from "@hebron/db/schema";
import { superAdminAction } from "../lib/safe-action";
import { logFinanceiroAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// overrideBlock — super_admin sobrescreve o bloqueio de um payable por
// inadimplência de relatório (BRAIN §6.2: "super_admin pode sobrescrever").
// Justificativa obrigatória, mutação + audit atômicas (governança —
// G6.3): devolve o payable a "pendente", de onde retoma o fluxo normal de
// aprovação + autorização.
// ---------------------------------------------------------------------------

const overrideBlockSchema = z.object({
  payableId: z.string().uuid("Conta a pagar inválida"),
  justification: z
    .string()
    .min(20, "Descreva o motivo da liberação (mín. 20 caracteres)")
    .max(1000),
});

export const overrideBlock = superAdminAction
  .schema(overrideBlockSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const now = new Date();

    await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(payables)
        .where(
          and(eq(payables.id, input.payableId), isNull(payables.deletedAt)),
        )
        .limit(1);

      const payable = rows[0];
      if (!payable) throw new Error("Conta a pagar não encontrada");

      if (payable.status !== "bloqueado") {
        throw new Error(
          `Apenas contas bloqueadas podem ter o bloqueio sobrescrito. ` +
            `Status atual: "${payable.status}"`,
        );
      }

      await tx
        .update(payables)
        .set({
          status: "pendente",
          overriddenBy: ctx.actorId,
          overriddenAt: now,
          overrideJustification: input.justification,
          updatedAt: now,
        })
        .where(eq(payables.id, input.payableId));

      await logFinanceiroAudit(
        {
          actorId: ctx.actorId,
          action: "financeiro.payable.block_overridden",
          entity: "payable",
          entityId: input.payableId,
          diff: {
            status: { from: "bloqueado", to: "pendente" },
            justification: input.justification,
            blockReason: payable.blockReason,
          },
        },
        tx,
      );
    });

    return { ok: true };
  });

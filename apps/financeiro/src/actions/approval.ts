"use server";

import { z } from "zod";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  payables,
  batchApprovals,
  batchApprovalItems,
  transactions,
  notifications,
  roleAssignments,
  users,
} from "@hebron/db/schema";
import { createNotification } from "@hebron/email";
import type { InsertNotificationFn } from "@hebron/email";
import { diretorAction, superAdminAction } from "../lib/safe-action";
import { logFinanceiroAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// Shared insert helper for createNotification
// ---------------------------------------------------------------------------

const insertNotification: InsertNotificationFn = async (data) => {
  const inserted = await db
    .insert(notifications)
    .values({
      userId: data.userId,
      channel: data.channel as "in_app" | "email",
      type: data.type,
      title: data.title,
      body: data.body ?? null,
      payload: data.payload ?? null,
      sentAt: data.sentAt ? new Date(data.sentAt) : null,
    })
    .returning({ id: notifications.id });
  const row = inserted[0];
  if (!row) throw new Error("Falha ao inserir notificação");
  return { id: row.id };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getISOWeekBounds(date: Date): { weekStart: string; weekEnd: string } {
  const d = new Date(date);
  // ISO week: Monday = day 1
  const dayOfWeek = d.getUTCDay(); // 0 = Sunday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = (dt: Date) => dt.toISOString().split("T")[0] ?? "";
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

// ---------------------------------------------------------------------------
// createWeeklyBatch — grupos payables pendentes da semana atual em lote
// Idempotente: se já existe um lote para esta semana, retorna o existente.
// Após criar, notifica os diretores via in_app para aprovação.
// ---------------------------------------------------------------------------

const createWeeklyBatchSchema = z.object({
  weekOffset: z.number().int().min(-4).max(0).default(0),
});

export const createWeeklyBatch = superAdminAction
  .schema(createWeeklyBatchSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const referenceDate = new Date();
    referenceDate.setDate(referenceDate.getDate() + input.weekOffset * 7);
    const { weekStart, weekEnd } = getISOWeekBounds(referenceDate);

    // Check if batch already exists for this week
    const existing = await db
      .select()
      .from(batchApprovals)
      .where(
        and(
          eq(batchApprovals.weekStart, weekStart),
          eq(batchApprovals.weekEnd, weekEnd),
        ),
      )
      .limit(1);

    if (existing[0]) {
      return { batch: existing[0], isNew: false };
    }

    // Find pending payables with dueDate within the week
    const pendingPayables = await db
      .select()
      .from(payables)
      .where(
        and(
          eq(payables.status, "pendente"),
          isNull(payables.deletedAt),
          sql`${payables.dueDate} >= ${weekStart}`,
          sql`${payables.dueDate} <= ${weekEnd}`,
        ),
      );

    if (pendingPayables.length === 0) {
      throw new Error(
        `Nenhuma conta a pagar pendente para a semana de ${weekStart} a ${weekEnd}`,
      );
    }

    // Create batch
    const batchInserted = await db
      .insert(batchApprovals)
      .values({ weekStart, weekEnd })
      .returning();

    const batch = batchInserted[0];
    if (!batch) throw new Error("Falha ao criar lote de aprovação");

    // Create batch items
    await db.insert(batchApprovalItems).values(
      pendingPayables.map((p) => ({
        batchApprovalId: batch.id,
        payableId: p.id,
      })),
    );

    // Notify all diretores via email
    const diretorRows = await db
      .select({ userId: roleAssignments.userId, email: users.email })
      .from(roleAssignments)
      .innerJoin(users, eq(users.id, roleAssignments.userId))
      .where(eq(roleAssignments.role, "diretor"));

    const totalAmount = pendingPayables
      .reduce((sum, p) => sum + parseFloat(p.amount), 0)
      .toFixed(2);

    const emailHtml = `
<p>Olá,</p>
<p>Um lote de pagamentos foi criado para a semana de <strong>${weekStart}</strong> a <strong>${weekEnd}</strong> e aguarda sua aprovação.</p>
<ul>
  <li>Contas a pagar: <strong>${pendingPayables.length}</strong></li>
  <li>Valor total: <strong>R$ ${totalAmount}</strong></li>
</ul>
<p>Acesse o módulo financeiro para aprovar o lote.</p>
<p style="font-style:italic;color:#666;">Hebron Aseec — Sistema Financeiro</p>
`.trim();

    for (const d of diretorRows) {
      await createNotification({
        insert: insertNotification,
        data: {
          userId: d.userId,
          channel: "email",
          type: "financeiro.batch.created",
          title: `Lote de pagamentos aguarda aprovação (${weekStart})`,
          body:
            `${pendingPayables.length} conta(s) totalizando R$ ${totalAmount} ` +
            `aguardam aprovação — semana ${weekStart} a ${weekEnd}.`,
          payload: { batchId: batch.id, weekStart, weekEnd },
        },
        email: {
          to: d.email,
          subject: `[Financeiro] Lote de pagamentos aguarda aprovação — ${weekStart}`,
          html: emailHtml,
        },
        resendApiKey: process.env.RESEND_API_KEY,
      });
    }

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.batch.created",
      entity: "batch_approval",
      entityId: batch.id,
      diff: { weekStart, weekEnd, payableCount: pendingPayables.length },
    });

    return { batch, isNew: true, payableCount: pendingPayables.length };
  });

// ---------------------------------------------------------------------------
// approveBatch — diretor gestor approves a weekly batch (1st layer)
// All payables in the batch move from "pendente" → "aprovado".
// Notifies super_admin to proceed with authorization.
// ---------------------------------------------------------------------------

const approveBatchSchema = z.object({
  batchId: z.string().uuid("Lote inválido"),
});

export const approveBatch = diretorAction
  .schema(approveBatchSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const batchRows = await db
      .select()
      .from(batchApprovals)
      .where(eq(batchApprovals.id, input.batchId))
      .limit(1);

    const batch = batchRows[0];
    if (!batch) throw new Error("Lote de aprovação não encontrado");

    if (batch.approvedBy) {
      throw new Error("Este lote já foi aprovado");
    }

    const now = new Date();

    // Update batch
    await db
      .update(batchApprovals)
      .set({ approvedBy: ctx.actorId, approvedAt: now })
      .where(eq(batchApprovals.id, input.batchId));

    // Move all batch payables to "aprovado"
    const batchItems = await db
      .select({ payableId: batchApprovalItems.payableId })
      .from(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, input.batchId));

    const payableIds = batchItems.map((i) => i.payableId);

    if (payableIds.length > 0) {
      await db
        .update(payables)
        .set({
          status: "aprovado",
          approvedBy: ctx.actorId,
          approvedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            inArray(payables.id, payableIds),
            eq(payables.status, "pendente"),
          ),
        );
    }

    // Notify super_admins for authorization
    const superAdminRows = await db
      .select({ userId: roleAssignments.userId })
      .from(roleAssignments)
      .where(eq(roleAssignments.role, "super_admin"));

    if (superAdminRows.length > 0) {
      await db.insert(notifications).values(
        superAdminRows.map((sa) => ({
          userId: sa.userId,
          channel: "in_app" as const,
          type: "financeiro.batch.approved",
          title: `Lote aprovado — aguarda inclusão no banco`,
          body:
            `O lote da semana de ${batch.weekStart} a ${batch.weekEnd} foi aprovado ` +
            `e aguarda sua autorização para inclusão no banco.`,
          payload: { batchId: batch.id, approvedBy: ctx.actorId },
        })),
      );
    }

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.batch.approved",
      entity: "batch_approval",
      entityId: input.batchId,
      diff: { approvedAt: now.toISOString(), payableCount: payableIds.length },
    });

    return { ok: true, approvedPayables: payableIds.length };
  });

// ---------------------------------------------------------------------------
// authorizeBatch — super_admin authorizes a batch (2nd layer)
// Guard: authorizedBy must differ from approvedBy (dual governance).
// Moves payables from "aprovado" → "autorizado".
// ---------------------------------------------------------------------------

const authorizeBatchSchema = z.object({
  batchId: z.string().uuid("Lote inválido"),
});

export const authorizeBatch = superAdminAction
  .schema(authorizeBatchSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const batchRows = await db
      .select()
      .from(batchApprovals)
      .where(eq(batchApprovals.id, input.batchId))
      .limit(1);

    const batch = batchRows[0];
    if (!batch) throw new Error("Lote de aprovação não encontrado");

    if (!batch.approvedBy) {
      throw new Error(
        "O lote precisa ser aprovado pelo diretor antes de ser autorizado",
      );
    }

    if (batch.authorizedBy) {
      throw new Error("Este lote já foi autorizado");
    }

    // Dual governance: authorizer must differ from approver
    if (batch.approvedBy === ctx.actorId) {
      throw new Error(
        "O autorizador deve ser uma pessoa diferente do aprovador (governança dual)",
      );
    }

    const now = new Date();

    await db
      .update(batchApprovals)
      .set({ authorizedBy: ctx.actorId, authorizedAt: now })
      .where(eq(batchApprovals.id, input.batchId));

    // Move all batch payables to "autorizado"
    const batchItems = await db
      .select({ payableId: batchApprovalItems.payableId })
      .from(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, input.batchId));

    const payableIds = batchItems.map((i) => i.payableId);

    if (payableIds.length > 0) {
      await db
        .update(payables)
        .set({
          status: "autorizado",
          authorizedBy: ctx.actorId,
          authorizedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            inArray(payables.id, payableIds),
            eq(payables.status, "aprovado"),
          ),
        );
    }

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.batch.authorized",
      entity: "batch_approval",
      entityId: input.batchId,
      diff: {
        authorizedAt: now.toISOString(),
        payableCount: payableIds.length,
      },
    });

    return { ok: true, authorizedPayables: payableIds.length };
  });

// ---------------------------------------------------------------------------
// markPayableAsPaid — super_admin marks an authorized payable as paid and
// creates an immutable debit transaction in the ledger.
// ---------------------------------------------------------------------------

const markPayableAsPaidSchema = z.object({
  payableId: z.string().uuid("Conta a pagar inválida"),
  bankAccountId: z.string().uuid("Conta bancária inválida"),
  paidDate: z.coerce.date().optional(),
});

export const markPayableAsPaid = superAdminAction
  .schema(markPayableAsPaidSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const payableRows = await db
      .select()
      .from(payables)
      .where(and(eq(payables.id, input.payableId), isNull(payables.deletedAt)))
      .limit(1);

    const payable = payableRows[0];
    if (!payable) throw new Error("Conta a pagar não encontrada");

    if (payable.status !== "autorizado") {
      throw new Error(
        `Apenas contas com status "autorizado" podem ser marcadas como pagas. ` +
          `Status atual: "${payable.status}"`,
      );
    }

    const now = new Date();
    const paidDate = input.paidDate ?? now;
    const dateStr = paidDate.toISOString().split("T")[0] ?? "";

    // Create immutable debit transaction
    const txInserted = await db
      .insert(transactions)
      .values({
        type: "debito",
        amount: payable.amount,
        description: `PGTO — ${payable.description}`,
        date: dateStr,
        accountId: input.bankAccountId,
        costCenterId: payable.costCenterId ?? null,
        categoryId: payable.categoryId ?? null,
        referenceType: "payable",
        referenceId: payable.id,
        createdBy: ctx.actorId,
      })
      .returning();

    const tx = txInserted[0];
    if (!tx) throw new Error("Falha ao criar transação de pagamento");

    // Update payable
    await db
      .update(payables)
      .set({
        status: "pago",
        paidBy: ctx.actorId,
        paidAt: paidDate,
        accountId: input.bankAccountId,
        updatedAt: now,
      })
      .where(eq(payables.id, input.payableId));

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.payable.paid",
      entity: "payable",
      entityId: input.payableId,
      diff: {
        status: { from: "autorizado", to: "pago" },
        transactionId: tx.id,
        paidDate: dateStr,
        bankAccountId: input.bankAccountId,
      },
    });

    return {
      payable: { id: input.payableId, status: "pago" },
      transaction: tx,
    };
  });

"use server";

import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  payables,
  receivables,
  transactions,
  transactionReversals,
} from "@hebron/db/schema";
import {
  createPayableSchema,
  cancelPayableSchema,
  createReceivableSchema,
  createTransactionSchema,
  createReversalSchema,
} from "@hebron/validators/financeiro";
import { colaboradorAction, superAdminAction } from "../lib/safe-action";
import { logFinanceiroAudit } from "../lib/audit";
import { checkBudgetAlert } from "../lib/notifications";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0] ?? "";
}

async function getPayableOrThrow(payableId: string) {
  const rows = await db
    .select()
    .from(payables)
    .where(and(eq(payables.id, payableId), isNull(payables.deletedAt)))
    .limit(1);

  const payable = rows[0];
  if (!payable) throw new Error("Conta a pagar não encontrada");
  return payable;
}

async function getTransactionOrThrow(transactionId: string) {
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

  const tx = rows[0];
  if (!tx) throw new Error("Transação não encontrada");
  return tx;
}

// ---------------------------------------------------------------------------
// createPayable — colaborador creates a new payable (conta a pagar)
// Status starts at "pendente" and follows the dual-governance lifecycle.
// Immutable after creation — corrections via cancelPayable + new entry.
// ---------------------------------------------------------------------------

export const createPayable = colaboradorAction
  .schema(createPayableSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const notesLines: string[] = [];
    if (input.supplierCnpj) notesLines.push(`CNPJ: ${input.supplierCnpj}`);
    if (input.notes) notesLines.push(input.notes);

    const inserted = await db
      .insert(payables)
      .values({
        description: input.description,
        amount: input.amount.toString(),
        dueDate: toDateString(input.dueAt),
        supplier: input.supplierName,
        notes: notesLines.length > 0 ? notesLines.join("\n") : null,
        categoryId: input.categoryId,
        costCenterId: input.costCenterId ?? null,
        status: "pendente",
        createdBy: ctx.actorId,
      })
      .returning();

    const payable = inserted[0];
    if (!payable) throw new Error("Falha ao criar conta a pagar");

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.payable.created",
      entity: "payable",
      entityId: payable.id,
      diff: {
        description: payable.description,
        amount: payable.amount,
        dueDate: payable.dueDate,
        supplier: payable.supplier,
        status: "pendente",
      },
    });

    return { payable };
  });

// ---------------------------------------------------------------------------
// cancelPayable — colaborador or diretor cancels a payable before payment
// Soft-delete: sets deletedAt + status = "cancelado". Never hard-delete.
// ---------------------------------------------------------------------------

export const cancelPayable = colaboradorAction
  .schema(cancelPayableSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const payable = await getPayableOrThrow(input.payableId);

    if (payable.status === "pago") {
      throw new Error(
        "Não é possível cancelar uma conta já paga. Use o estorno de transação.",
      );
    }

    const isDiretor = ctx.roles.includes("diretor");
    const isSuperAdmin = ctx.roles.includes("super_admin");
    const isCreator = payable.createdBy === ctx.actorId;

    if (!isSuperAdmin && !isDiretor && !isCreator) {
      throw new Error("Apenas o criador da conta ou a diretoria pode cancelar");
    }

    const now = new Date();
    await db
      .update(payables)
      .set({ status: "cancelado", deletedAt: now, updatedAt: now })
      .where(eq(payables.id, input.payableId));

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.payable.cancelled",
      entity: "payable",
      entityId: input.payableId,
      diff: { reason: input.reason, previousStatus: payable.status },
    });

    return { ok: true };
  });

// ---------------------------------------------------------------------------
// createReceivable — colaborador creates a new receivable (conta a receber)
// ---------------------------------------------------------------------------

export const createReceivable = colaboradorAction
  .schema(createReceivableSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const notesLines: string[] = [];
    if (input.payerCnpj) notesLines.push(`CNPJ pagador: ${input.payerCnpj}`);
    if (input.notes) notesLines.push(input.notes);

    const inserted = await db
      .insert(receivables)
      .values({
        description: `${input.description} — ${input.payerName}`,
        amount: input.amount.toString(),
        expectedDate: toDateString(input.expectedAt),
        accountId: input.bankAccountId ?? null,
        costCenterId: input.costCenterId ?? null,
        categoryId: input.categoryId,
        source: "outro",
        notes: notesLines.length > 0 ? notesLines.join("\n") : null,
        status: "pendente",
        createdBy: ctx.actorId,
      })
      .returning();

    const receivable = inserted[0];
    if (!receivable) throw new Error("Falha ao criar conta a receber");

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.receivable.created",
      entity: "receivable",
      entityId: receivable.id,
      diff: {
        description: receivable.description,
        amount: receivable.amount,
        expectedDate: receivable.expectedDate,
        status: "pendente",
      },
    });

    return { receivable };
  });

// ---------------------------------------------------------------------------
// markReceivableReceived — colaborador marks a receivable as received and
// creates an immutable credit transaction in the ledger.
// ---------------------------------------------------------------------------

const markReceivableReceivedSchema = z.object({
  receivableId: z.string().uuid("Conta a receber inválida"),
  bankAccountId: z.string().uuid("Conta bancária inválida"),
  receivedDate: z.coerce.date(),
  notes: z.string().max(500).optional(),
});

export const markReceivableReceived = colaboradorAction
  .schema(markReceivableReceivedSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const rows = await db
      .select()
      .from(receivables)
      .where(
        and(
          eq(receivables.id, input.receivableId),
          isNull(receivables.deletedAt),
        ),
      )
      .limit(1);

    const receivable = rows[0];
    if (!receivable) throw new Error("Conta a receber não encontrada");

    if (receivable.status !== "pendente") {
      throw new Error(`Conta já está com status "${receivable.status}"`);
    }

    const now = new Date();
    const dateStr = toDateString(input.receivedDate);

    // Create immutable credit transaction
    const txInserted = await db
      .insert(transactions)
      .values({
        type: "credito",
        amount: receivable.amount,
        description: receivable.description,
        date: dateStr,
        accountId: input.bankAccountId,
        costCenterId: receivable.costCenterId ?? null,
        categoryId: receivable.categoryId ?? null,
        referenceType: "receivable",
        referenceId: receivable.id,
        createdBy: ctx.actorId,
      })
      .returning();

    const tx = txInserted[0];
    if (!tx) throw new Error("Falha ao criar transação de recebimento");

    // Update receivable status
    await db
      .update(receivables)
      .set({
        status: "recebido",
        receivedDate: dateStr,
        receivedBy: ctx.actorId,
        accountId: input.bankAccountId,
        updatedAt: now,
      })
      .where(eq(receivables.id, input.receivableId));

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.receivable.received",
      entity: "receivable",
      entityId: input.receivableId,
      diff: {
        status: { from: "pendente", to: "recebido" },
        transactionId: tx.id,
        receivedDate: dateStr,
      },
    });

    return { receivable: { id: input.receivableId, transactionId: tx.id } };
  });

// ---------------------------------------------------------------------------
// createManualTransaction — colaborador creates an ad-hoc immutable ledger entry
// INSERT ONLY — no update or delete path (enforced by DB trigger).
// ---------------------------------------------------------------------------

export const createManualTransaction = colaboradorAction
  .schema(createTransactionSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    // Determine referenceType from linked entity
    let referenceType: "payable" | "receivable" | "manual" = "manual";
    let referenceId: string | null = null;

    if (input.payableId) {
      referenceType = "payable";
      referenceId = input.payableId;
    } else if (input.receivableId) {
      referenceType = "receivable";
      referenceId = input.receivableId;
    }

    const inserted = await db
      .insert(transactions)
      .values({
        type: input.type,
        amount: input.amount.toString(),
        description: input.description,
        date: toDateString(input.occurredAt),
        accountId: input.bankAccountId,
        costCenterId: input.costCenterId ?? null,
        categoryId: input.categoryId ?? null,
        referenceType,
        referenceId,
        createdBy: ctx.actorId,
      })
      .returning();

    const tx = inserted[0];
    if (!tx) throw new Error("Falha ao criar transação");

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.transaction.created",
      entity: "transaction",
      entityId: tx.id,
      diff: {
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        referenceType,
        referenceId,
      },
    });

    // Alerta de orçamento (P-3.10) — best-effort, só para débitos com centro
    // de custo vinculado (é o que consome orçamento).
    if (tx.type === "debito" && tx.costCenterId) {
      await checkBudgetAlert({
        costCenterId: tx.costCenterId,
        transactionDate: tx.date,
        newTransactionAmount: parseFloat(tx.amount),
      });
    }

    return { transaction: tx };
  });

// ---------------------------------------------------------------------------
// createReversal — super_admin reverses an immutable transaction
// Flow:
//   1. Create a counter-transaction (opposite type, same amount)
//   2. Create a transactionReversals audit record linking both
// The original transaction is NEVER modified — immutability preserved.
// ---------------------------------------------------------------------------

export const createReversal = superAdminAction
  .schema(createReversalSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const original = await getTransactionOrThrow(input.originalTransactionId);

    // Guard: cannot reverse an already-reversed transaction
    const existingReversal = await db
      .select({ id: transactionReversals.id })
      .from(transactionReversals)
      .where(
        eq(
          transactionReversals.originalTransactionId,
          input.originalTransactionId,
        ),
      )
      .limit(1);

    if (existingReversal.length > 0) {
      throw new Error("Esta transação já possui um estorno registrado");
    }

    // Counter-transaction: opposite type
    const reversalType = original.type === "debito" ? "credito" : "debito";

    const reversalTxInserted = await db
      .insert(transactions)
      .values({
        type: reversalType,
        amount: original.amount,
        description: `ESTORNO — ${original.description}`,
        date: new Date().toISOString().split("T")[0] ?? "",
        accountId: original.accountId,
        costCenterId: original.costCenterId ?? null,
        categoryId: original.categoryId ?? null,
        referenceType: "reversal",
        referenceId: original.id,
        createdBy: ctx.actorId,
      })
      .returning();

    const reversalTx = reversalTxInserted[0];
    if (!reversalTx) throw new Error("Falha ao criar transação de estorno");

    // Audit record
    const reversalRecord = await db
      .insert(transactionReversals)
      .values({
        originalTransactionId: input.originalTransactionId,
        reversalTransactionId: reversalTx.id,
        justification: input.reason,
        createdBy: ctx.actorId,
      })
      .returning();

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.transaction.reversed",
      entity: "transaction",
      entityId: input.originalTransactionId,
      diff: {
        reversalTransactionId: reversalTx.id,
        reason: input.reason,
        originalAmount: original.amount,
        originalType: original.type,
      },
    });

    return {
      reversalTransaction: reversalTx,
      reversalRecord: reversalRecord[0],
    };
  });

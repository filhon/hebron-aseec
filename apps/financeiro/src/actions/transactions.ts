"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import {
  payables,
  receivables,
  transactions,
  transactionReversals,
  financialAttachments,
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
import { getPayableOrThrow, getTransactionOrThrow } from "../lib/queries";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0] ?? "";
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

    const payable = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
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
        if (!row) throw new BusinessError("Falha ao criar conta a pagar");

        // Comprovante já foi enviado ao bucket financeiro-recibos pelo
        // formulário antes do submit — aqui só gravamos a referência. Mesma
        // transação/audit da criação do payable: a linha em attachments só
        // existe se o payable existir, e vice-versa (P-3.4b).
        let attachmentId: string | null = null;
        if (input.attachment) {
          const [attachmentRow] = await tx
            .insert(financialAttachments)
            .values({
              refType: "payable",
              refId: row.id,
              fileUrl: input.attachment.path,
              fileName: input.attachment.fileName,
              fileSize: input.attachment.fileSize,
              uploadedBy: ctx.actorId,
            })
            .returning();
          if (!attachmentRow)
            throw new BusinessError("Falha ao registrar o comprovante");
          attachmentId = attachmentRow.id;
        }

        await withSystemRole(tx, (sysTx) =>
          logFinanceiroAudit(
            {
              actorId: ctx.actorId,
              action: "financeiro.payable.created",
              entity: "payable",
              entityId: row.id,
              diff: {
                description: row.description,
                amount: row.amount,
                dueDate: row.dueDate,
                supplier: row.supplier,
                status: "pendente",
                ...(attachmentId ? { attachmentId } : {}),
              },
            },
            sysTx,
          ),
        );

        return row;
      },
    );

    return { payable };
  });

// ---------------------------------------------------------------------------
// cancelPayable — colaborador or diretor cancels a payable before payment.
// Status-only transition (status = "cancelado"), sem tocar deletedAt: essa
// coluna é o que "payables_select_staff"/"payables_update_staff" (RLS) usam
// para decidir se a linha existe para quem lê — e o Postgres aplica a USING
// da policy de SELECT também sobre a linha NOVA de um UPDATE. Setar
// deletedAt aqui faz a própria linha que acabou de ser cancelada deixar de
// bater no WITH CHECK da policy de UPDATE, e o UPDATE inteiro é rejeitado
// com "new row violates row-level security policy" — reproduzido isolado
// numa tabela mínima com o mesmo padrão USING/WITH CHECK, fora do escopo
// deste módulo. Na prática isso significa que cancelPayable NUNCA
// funcionou sob RLS real (só passava despercebido porque nenhum teste
// chamava a action pelo pipeline autenticado — mesmo padrão do achado que
// P-0.3c fechou para submitReport). status já carrega o estado; "cancelado"
// seguir visível para o staff é também o que P-3.9c (S-214, achado 4) pede.
// ---------------------------------------------------------------------------

export const cancelPayable = colaboradorAction
  .schema(cancelPayableSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const now = new Date();

    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const payable = await getPayableOrThrow(tx, input.payableId);

      if (payable.status === "pago") {
        throw new BusinessError(
          "Não é possível cancelar uma conta já paga. Use o estorno de transação.",
        );
      }

      const isDiretor = ctx.roles.includes("diretor");
      const isSuperAdmin = ctx.roles.includes("super_admin");
      const isCreator = payable.createdBy === ctx.actorId;

      if (!isSuperAdmin && !isDiretor && !isCreator) {
        throw new BusinessError(
          "Apenas o criador da conta ou a diretoria pode cancelar",
        );
      }

      await tx
        .update(payables)
        .set({
          status: "cancelado",
          cancellationReason: input.reason,
          cancelledBy: ctx.actorId,
          updatedAt: now,
        })
        .where(eq(payables.id, input.payableId));

      await withSystemRole(tx, (sysTx) =>
        logFinanceiroAudit(
          {
            actorId: ctx.actorId,
            action: "financeiro.payable.cancelled",
            entity: "payable",
            entityId: input.payableId,
            diff: { reason: input.reason, previousStatus: payable.status },
          },
          sysTx,
        ),
      );
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

    const receivable = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
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
        if (!row) throw new BusinessError("Falha ao criar conta a receber");

        // Mesmo padrão de createPayable: comprovante já está no bucket, só
        // gravamos a referência na mesma transação/audit da criação.
        let attachmentId: string | null = null;
        if (input.attachment) {
          const [attachmentRow] = await tx
            .insert(financialAttachments)
            .values({
              refType: "receivable",
              refId: row.id,
              fileUrl: input.attachment.path,
              fileName: input.attachment.fileName,
              fileSize: input.attachment.fileSize,
              uploadedBy: ctx.actorId,
            })
            .returning();
          if (!attachmentRow)
            throw new BusinessError("Falha ao registrar o comprovante");
          attachmentId = attachmentRow.id;
        }

        await withSystemRole(tx, (sysTx) =>
          logFinanceiroAudit(
            {
              actorId: ctx.actorId,
              action: "financeiro.receivable.created",
              entity: "receivable",
              entityId: row.id,
              diff: {
                description: row.description,
                amount: row.amount,
                expectedDate: row.expectedDate,
                status: "pendente",
                ...(attachmentId ? { attachmentId } : {}),
              },
            },
            sysTx,
          ),
        );

        return row;
      },
    );

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
    const now = new Date();
    const dateStr = toDateString(input.receivedDate);

    const tx = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (authTx) => {
        const rows = await authTx
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
        if (!receivable)
          throw new BusinessError("Conta a receber não encontrada");

        if (receivable.status !== "pendente") {
          throw new BusinessError(
            `Conta já está com status "${receivable.status}"`,
          );
        }

        // Create immutable credit transaction
        const txInserted = await authTx
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

        const ledgerTx = txInserted[0];
        if (!ledgerTx)
          throw new BusinessError("Falha ao criar transação de recebimento");

        // Update receivable status
        await authTx
          .update(receivables)
          .set({
            status: "recebido",
            receivedDate: dateStr,
            receivedBy: ctx.actorId,
            accountId: input.bankAccountId,
            updatedAt: now,
          })
          .where(eq(receivables.id, input.receivableId));

        await withSystemRole(authTx, (sysTx) =>
          logFinanceiroAudit(
            {
              actorId: ctx.actorId,
              action: "financeiro.receivable.received",
              entity: "receivable",
              entityId: input.receivableId,
              diff: {
                status: { from: "pendente", to: "recebido" },
                transactionId: ledgerTx.id,
                receivedDate: dateStr,
              },
            },
            sysTx,
          ),
        );

        return ledgerTx;
      },
    );

    return { receivable: { id: input.receivableId, transactionId: tx.id } };
  });

// ---------------------------------------------------------------------------
// cancelReceivable — colaborador or diretor cancels a receivable before it's
// received. Mesmo padrão de cancelPayable acima: status-only transition,
// NUNCA seta deletedAt (RLS de "receivables_select_staff" filtra por
// deleted_at IS NULL, e assim o cancelado continua visível ao staff — o
// mesmo bug de invisibilidade que S-215 corrigiu para payables). Sem coluna
// própria para o motivo (financeiro.receivables não tem
// cancellation_reason), o motivo é concatenado em notes — mesmo padrão já
// usado por createPayable/createReceivable para CNPJ.
// ---------------------------------------------------------------------------

const cancelReceivableSchema = z.object({
  receivableId: z.string().uuid("Conta a receber inválida"),
  reason: z
    .string()
    .min(10, "Informe o motivo do cancelamento (mínimo 10 caracteres)")
    .max(500),
});

export const cancelReceivable = colaboradorAction
  .schema(cancelReceivableSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const now = new Date();

    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const rows = await tx
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
      if (!receivable)
        throw new BusinessError("Conta a receber não encontrada");

      if (receivable.status === "recebido") {
        throw new BusinessError(
          "Não é possível cancelar uma conta já recebida. Use o estorno de transação.",
        );
      }

      const isDiretor = ctx.roles.includes("diretor");
      const isSuperAdmin = ctx.roles.includes("super_admin");
      const isCreator = receivable.createdBy === ctx.actorId;

      if (!isSuperAdmin && !isDiretor && !isCreator) {
        throw new BusinessError(
          "Apenas o criador da conta ou a diretoria pode cancelar",
        );
      }

      const notesLines = receivable.notes ? [receivable.notes] : [];
      notesLines.push(`Cancelado: ${input.reason}`);

      await tx
        .update(receivables)
        .set({
          status: "cancelado",
          notes: notesLines.join("\n"),
          updatedAt: now,
        })
        .where(eq(receivables.id, input.receivableId));

      await withSystemRole(tx, (sysTx) =>
        logFinanceiroAudit(
          {
            actorId: ctx.actorId,
            action: "financeiro.receivable.cancelled",
            entity: "receivable",
            entityId: input.receivableId,
            diff: { reason: input.reason, previousStatus: receivable.status },
          },
          sysTx,
        ),
      );
    });

    return { ok: true };
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

    const tx = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (authTx) => {
        const [row] = await authTx
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
        if (!row) throw new BusinessError("Falha ao criar transação");

        await withSystemRole(authTx, (sysTx) =>
          logFinanceiroAudit(
            {
              actorId: ctx.actorId,
              action: "financeiro.transaction.created",
              entity: "transaction",
              entityId: row.id,
              diff: {
                type: row.type,
                amount: row.amount,
                date: row.date,
                referenceType,
                referenceId,
              },
            },
            sysTx,
          ),
        );

        return row;
      },
    );

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
    const { reversalTx, reversalRecord } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const original = await getTransactionOrThrow(
          tx,
          input.originalTransactionId,
        );

        // Guard: cannot reverse an already-reversed transaction
        const existingReversal = await tx
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
          throw new BusinessError(
            "Esta transação já possui um estorno registrado",
          );
        }

        // Counter-transaction: opposite type
        const reversalType = original.type === "debito" ? "credito" : "debito";

        const reversalTxInserted = await tx
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

        const insertedReversalTx = reversalTxInserted[0];
        if (!insertedReversalTx)
          throw new BusinessError("Falha ao criar transação de estorno");

        // Audit record
        const reversalRecordInserted = await tx
          .insert(transactionReversals)
          .values({
            originalTransactionId: input.originalTransactionId,
            reversalTransactionId: insertedReversalTx.id,
            justification: input.reason,
            createdBy: ctx.actorId,
          })
          .returning();

        await withSystemRole(tx, (sysTx) =>
          logFinanceiroAudit(
            {
              actorId: ctx.actorId,
              action: "financeiro.transaction.reversed",
              entity: "transaction",
              entityId: input.originalTransactionId,
              diff: {
                reversalTransactionId: insertedReversalTx.id,
                reason: input.reason,
                originalAmount: original.amount,
                originalType: original.type,
              },
            },
            sysTx,
          ),
        );

        return {
          reversalTx: insertedReversalTx,
          reversalRecord: reversalRecordInserted[0],
        };
      },
    );

    return {
      reversalTransaction: reversalTx,
      reversalRecord,
    };
  });

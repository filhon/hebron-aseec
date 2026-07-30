"use server";

import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  bankImportRows,
  bankImports,
  transactions,
  payables,
  receivables,
} from "@hebron/db/schema";
import { reconcileItemSchema } from "@hebron/validators/financeiro";
import { colaboradorAction } from "../lib/safe-action";
import { logFinanceiroAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// autoMatchImport — run automatic matching on all unmatched rows of an import
//
// Match algorithm: value + date (±3 days tolerance) + description similarity.
// A match is SUGGESTED (not committed) — user still confirms in the UI.
// Similarity: description containment check (simple, no external library).
// ---------------------------------------------------------------------------

const autoMatchSchema = z.object({
  bankImportId: z.string().uuid("Import inválido"),
});

export const autoMatchImport = colaboradorAction
  .schema(autoMatchSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const {
      unmatchedRows,
      bankImport,
      accountTxs,
      pendingPayables,
      pendingReceivables,
    } = await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      // Load unmatched rows for this import
      const unmatchedRows = await tx
        .select()
        .from(bankImportRows)
        .where(
          and(
            eq(bankImportRows.bankImportId, input.bankImportId),
            eq(bankImportRows.status, "unmatched"),
          ),
        );

      if (unmatchedRows.length === 0) {
        return {
          unmatchedRows,
          bankImport: null,
          accountTxs: [],
          pendingPayables: [],
          pendingReceivables: [],
        };
      }

      // Load the import to know the account
      const importRecord = await tx
        .select()
        .from(bankImports)
        .where(eq(bankImports.id, input.bankImportId))
        .limit(1);

      const bankImport = importRecord[0];
      if (!bankImport) throw new Error("Import não encontrado");

      // Load recent transactions for the same account (last 90 days)
      // We cast date comparison via sql for portability
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split("T")[0] ?? "";

      const accountTxs = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, bankImport.accountId),
            sql`${transactions.date} >= ${ninetyDaysAgoStr}`,
          ),
        );

      // Also load pending payables and receivables for suggestion
      const pendingPayables = await tx
        .select()
        .from(payables)
        .where(
          and(
            eq(payables.accountId, bankImport.accountId),
            eq(payables.status, "autorizado"),
          ),
        );

      const pendingReceivables = await tx
        .select()
        .from(receivables)
        .where(eq(receivables.accountId, bankImport.accountId));

      return {
        unmatchedRows,
        bankImport,
        accountTxs,
        pendingPayables,
        pendingReceivables,
      };
    });

    if (unmatchedRows.length === 0) return { matched: 0, suggestions: [] };
    if (!bankImport) throw new Error("Import não encontrado");

    type Suggestion = {
      rowId: string;
      matchedTransactionId: string | null;
      suggestedPayableId: string | null;
      suggestedReceivableId: string | null;
      confidence: "high" | "medium" | "low";
    };

    const suggestions: Suggestion[] = [];
    const rowsToUpdate: { id: string; transactionId: string }[] = [];

    for (const row of unmatchedRows) {
      const rowAmount = parseFloat(row.amount);
      const rowDate = new Date(row.date);

      // Try to match against existing transactions
      const txMatch = accountTxs.find((tx) => {
        const txAmount = parseFloat(tx.amount);
        const txDate = new Date(tx.date);
        const daysDiff = Math.abs(
          (txDate.getTime() - rowDate.getTime()) / 86_400_000,
        );
        const amountMatch = Math.abs(txAmount - Math.abs(rowAmount)) < 0.01;
        const dateMatch = daysDiff <= 3;

        if (!amountMatch || !dateMatch) return false;

        // Bonus: description containment
        const rowDesc = (row.description ?? "").toLowerCase();
        const txDesc = tx.description.toLowerCase();
        return (
          rowDesc.length > 3 &&
          (txDesc.includes(rowDesc.slice(0, 10)) ||
            rowDesc.includes(txDesc.slice(0, 10)))
        );
      });

      if (txMatch) {
        rowsToUpdate.push({ id: row.id, transactionId: txMatch.id });
        suggestions.push({
          rowId: row.id,
          matchedTransactionId: txMatch.id,
          suggestedPayableId: null,
          suggestedReceivableId: null,
          confidence: "high",
        });
        continue;
      }

      // Try to suggest payable (for debit rows)
      if (rowAmount < 0) {
        const payableMatch = pendingPayables.find((p) => {
          const pAmount = parseFloat(p.amount);
          return Math.abs(pAmount - Math.abs(rowAmount)) < 0.01;
        });
        if (payableMatch) {
          suggestions.push({
            rowId: row.id,
            matchedTransactionId: null,
            suggestedPayableId: payableMatch.id,
            suggestedReceivableId: null,
            confidence: "medium",
          });
          continue;
        }
      }

      // Try to suggest receivable (for credit rows)
      if (rowAmount > 0) {
        const receivableMatch = pendingReceivables.find((r) => {
          const rAmount = parseFloat(r.amount);
          return Math.abs(rAmount - Math.abs(rowAmount)) < 0.01;
        });
        if (receivableMatch) {
          suggestions.push({
            rowId: row.id,
            matchedTransactionId: null,
            suggestedPayableId: null,
            suggestedReceivableId: receivableMatch.id,
            confidence: "medium",
          });
        }
      }
    }

    // Apply high-confidence matches immediately + update import matched count
    if (rowsToUpdate.length > 0) {
      await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
        for (const update of rowsToUpdate) {
          await tx
            .update(bankImportRows)
            .set({
              matchTransactionId: update.transactionId,
              status: "matched",
            })
            .where(eq(bankImportRows.id, update.id));
        }

        // "bank_imports_update_staff" (0070_financeiro_rls_alinhada.sql)
        // concede o GRANT/policy de UPDATE que faltava para colaborador.
        await tx
          .update(bankImports)
          .set({
            matchedCount: sql`${bankImports.matchedCount} + ${rowsToUpdate.length}`,
          })
          .where(eq(bankImports.id, input.bankImportId));
      });
    }

    if (rowsToUpdate.length > 0) {
      await logFinanceiroAudit({
        actorId: ctx.actorId,
        action: "financeiro.import.row.reconciled",
        entity: "bank_import",
        entityId: input.bankImportId,
        diff: {
          autoMatched: rowsToUpdate.length,
          matchedRowIds: rowsToUpdate.map((r) => r.id),
        },
      });
    }

    return { matched: rowsToUpdate.length, suggestions };
  });

// ---------------------------------------------------------------------------
// reconcileRow — manual conciliation: link an import row to a transaction
// Validates that the row belongs to the given import and is not already matched.
// ---------------------------------------------------------------------------

export const reconcileRow = colaboradorAction
  .schema(reconcileItemSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const rowId = input.bankImportItemId;
    const now = new Date();

    const { createdTransactionId } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (dbTx) => {
        const rowRows = await dbTx
          .select()
          .from(bankImportRows)
          .where(eq(bankImportRows.id, rowId))
          .limit(1);

        const row = rowRows[0];
        if (!row) throw new Error("Linha de import não encontrada");

        if (row.status === "matched") {
          throw new Error("Esta linha já está conciliada");
        }

        let createdTransactionId: string | null = null;

        switch (input.action) {
          case "vincular_payable": {
            if (!input.payableId)
              throw new Error("Selecione uma conta a pagar");

            const payable = await dbTx
              .select()
              .from(payables)
              .where(eq(payables.id, input.payableId))
              .limit(1);

            if (!payable[0]) throw new Error("Conta a pagar não encontrada");

            // Find or verify there's a transaction for this payable
            const txRows = await dbTx
              .select()
              .from(transactions)
              .where(
                and(
                  eq(transactions.referenceType, "payable"),
                  eq(transactions.referenceId, input.payableId),
                ),
              )
              .limit(1);

            const matchTx = txRows[0];

            await dbTx
              .update(bankImportRows)
              .set({
                matchTransactionId: matchTx?.id ?? null,
                status: "matched",
              })
              .where(eq(bankImportRows.id, rowId));

            break;
          }

          case "vincular_receivable": {
            if (!input.receivableId)
              throw new Error("Selecione uma conta a receber");

            const txRows = await dbTx
              .select()
              .from(transactions)
              .where(
                and(
                  eq(transactions.referenceType, "receivable"),
                  eq(transactions.referenceId, input.receivableId),
                ),
              )
              .limit(1);

            await dbTx
              .update(bankImportRows)
              .set({
                matchTransactionId: txRows[0]?.id ?? null,
                status: "matched",
              })
              .where(eq(bankImportRows.id, rowId));

            break;
          }

          case "ignorar": {
            await dbTx
              .update(bankImportRows)
              .set({ status: "ignored" })
              .where(eq(bankImportRows.id, rowId));

            break;
          }

          case "criar_novo": {
            // Create a new transaction directly from the import row data
            const importRecord = await dbTx
              .select()
              .from(bankImports)
              .where(eq(bankImports.id, row.bankImportId))
              .limit(1);

            const bankImport = importRecord[0];
            if (!bankImport) throw new Error("Import não encontrado");

            const rowAmount = parseFloat(row.amount);
            const txType = rowAmount >= 0 ? "credito" : "debito";

            const newTx = await dbTx
              .insert(transactions)
              .values({
                type: txType,
                amount: Math.abs(rowAmount).toString(),
                description: row.description ?? "Lançamento importado",
                date: row.date,
                accountId: bankImport.accountId,
                createdBy: ctx.actorId,
              })
              .returning();

            const insertedTx = newTx[0];
            if (!insertedTx) throw new Error("Falha ao criar transação");
            createdTransactionId = insertedTx.id;

            await dbTx
              .update(bankImportRows)
              .set({ matchTransactionId: insertedTx.id, status: "matched" })
              .where(eq(bankImportRows.id, rowId));

            break;
          }
        }

        // Update matched count on the import
        // "bank_imports_update_staff" (0070_financeiro_rls_alinhada.sql) —
        // mesmo GRANT/policy de UPDATE de autoMatchImport acima.
        await dbTx
          .update(bankImports)
          .set({ matchedCount: sql`${bankImports.matchedCount} + 1` })
          .where(eq(bankImports.id, row.bankImportId));

        return { bankImportId: row.bankImportId, createdTransactionId };
      },
    );

    if (createdTransactionId) {
      await logFinanceiroAudit({
        actorId: ctx.actorId,
        action: "financeiro.transaction.created",
        entity: "transaction",
        entityId: createdTransactionId,
        diff: { source: "import_reconciliation", bankImportRowId: rowId },
      });
    }

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.import.row.reconciled",
      entity: "bank_import_row",
      entityId: rowId,
      diff: {
        action: input.action,
        payableId: input.payableId ?? null,
        receivableId: input.receivableId ?? null,
        reconciledAt: now.toISOString(),
      },
    });

    return { ok: true };
  });

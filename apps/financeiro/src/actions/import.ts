"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { bankImports, bankImportRows, transactions } from "@hebron/db/schema";
import { colaboradorAction } from "../lib/safe-action";
import { logFinanceiroAudit } from "../lib/audit";
import { parseFileContent } from "../lib/import-parsers";

// ---------------------------------------------------------------------------
// parseImportFile — parse file content and return preview rows (no DB write)
// The client sends the file content as a string after reading via FileReader.
// ---------------------------------------------------------------------------

const parseImportFileSchema = z.object({
  content: z
    .string()
    .min(1, "Conteúdo do arquivo não pode ser vazio")
    .max(2_000_000, "Arquivo excede 2 MB"),
  format: z.enum(["ofx", "csv"]),
});

export const parseImportFile = colaboradorAction
  .schema(parseImportFileSchema)
  .action(async ({ parsedInput: input }) => {
    const rows = parseFileContent(input.content, input.format);

    if (rows.length === 0) {
      throw new Error(
        "Nenhuma transação encontrada no arquivo. Verifique o formato.",
      );
    }

    return { rows, totalCount: rows.length };
  });

// ---------------------------------------------------------------------------
// confirmImport — persist a parsed import: creates bank_import + rows + auto-match
// Called after user reviews the preview and clicks "Confirmar importação".
//
// F3-11: o cliente costumava reenviar as `rows` já parseadas no preview —
// adulteráveis entre o preview e a confirmação. Agora o servidor re-parseia
// `content` do zero; o cliente nunca mais fornece linhas diretamente.
// ---------------------------------------------------------------------------

const confirmImportSchema = z.object({
  bankAccountId: z.string().uuid("Conta bancária inválida"),
  format: z.enum(["ofx", "csv"]),
  content: z
    .string()
    .min(1, "Conteúdo do arquivo não pode ser vazio")
    .max(2_000_000, "Arquivo excede 2 MB"),
  fileUrl: z.string().min(1, "Arquivo não foi enviado ao Storage"),
  runAutoMatch: z.boolean().default(true),
});

export const confirmImport = colaboradorAction
  .schema(confirmImportSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const rows = parseFileContent(input.content, input.format);

    if (rows.length === 0) {
      throw new Error(
        "Nenhuma transação encontrada no arquivo. Verifique o formato.",
      );
    }

    const { bankImport, matchedCount } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        // Create the import record
        const importInserted = await tx
          .insert(bankImports)
          .values({
            accountId: input.bankAccountId,
            fileUrl: input.fileUrl,
            format: input.format,
            importedBy: ctx.actorId,
            rowCount: rows.length,
            matchedCount: 0,
          })
          .returning();

        const bankImport = importInserted[0];
        if (!bankImport) throw new Error("Falha ao criar registro de import");

        // Bulk-insert import rows
        const rowValues = rows.map((row) => ({
          bankImportId: bankImport.id,
          date: row.date,
          amount: row.amount.toString(),
          description: row.description,
          status: "unmatched" as const,
        }));

        await tx.insert(bankImportRows).values(rowValues);

        // Auto-match: compare each row against existing transactions for the account
        let matchedCount = 0;

        if (input.runAutoMatch) {
          const accountTxs = await tx
            .select()
            .from(transactions)
            .where(eq(transactions.accountId, input.bankAccountId));

          const txMap = new Map(
            accountTxs.map((t) => [
              `${t.date}|${parseFloat(t.amount).toFixed(2)}`,
              t.id,
            ]),
          );

          const insertedRows = await tx
            .select()
            .from(bankImportRows)
            .where(eq(bankImportRows.bankImportId, bankImport.id));

          for (const row of insertedRows) {
            const rowAmount = parseFloat(row.amount);
            // Check exact date + amount match
            const key = `${row.date}|${Math.abs(rowAmount).toFixed(2)}`;
            const matchedTxId = txMap.get(key);

            if (matchedTxId) {
              await tx
                .update(bankImportRows)
                .set({ matchTransactionId: matchedTxId, status: "matched" })
                .where(eq(bankImportRows.id, row.id));
              matchedCount++;
            }
          }

          if (matchedCount > 0) {
            // "bank_imports_update_staff" (0070_financeiro_rls_alinhada.sql)
            // concede o GRANT/policy de UPDATE que faltava para colaborador.
            await tx
              .update(bankImports)
              .set({
                matchedCount: sql`${bankImports.matchedCount} + ${matchedCount}`,
              })
              .where(eq(bankImports.id, bankImport.id));
          }
        }

        return { bankImport, matchedCount };
      },
    );

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.import.confirmed",
      entity: "bank_import",
      entityId: bankImport.id,
      diff: {
        bankAccountId: input.bankAccountId,
        format: input.format,
        fileUrl: input.fileUrl,
        rowCount: rows.length,
        autoMatchedCount: matchedCount,
      },
    });

    return {
      bankImport,
      totalRows: rows.length,
      matchedCount,
      unmatchedCount: rows.length - matchedCount,
    };
  });

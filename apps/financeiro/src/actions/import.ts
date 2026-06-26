"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { bankImports, bankImportRows, transactions } from "@hebron/db/schema";
import { colaboradorAction } from "../lib/safe-action";
import { logFinanceiroAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedImportRow {
  date: string; // YYYY-MM-DD
  amount: number; // positive = credit, negative = debit
  description: string;
}

// ---------------------------------------------------------------------------
// OFX / CSV parsers (pure functions — no side effects)
// ---------------------------------------------------------------------------

function parseOFX(content: string): ParsedImportRow[] {
  const rows: ParsedImportRow[] = [];
  // OFX SGML: <STMTTRN>...</STMTTRN> blocks
  const txRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  while ((match = txRegex.exec(content)) !== null) {
    const block = match[1] ?? "";

    const getField = (tag: string): string | null => {
      const m = new RegExp(`<${tag}>([^<\r\n]+)`, "i").exec(block);
      return m?.[1]?.trim() ?? null;
    };

    const dtPosted = getField("DTPOSTED");
    const trnAmt = getField("TRNAMT");
    const memo = getField("MEMO") ?? getField("NAME") ?? "";

    if (!dtPosted || !trnAmt) continue;

    // YYYYMMDD[HH[MM[SS]]] → YYYY-MM-DD
    const year = dtPosted.slice(0, 4);
    const month = dtPosted.slice(4, 6);
    const day = dtPosted.slice(6, 8);
    const dateStr = `${year}-${month}-${day}`;

    const amount = parseFloat(trnAmt.replace(",", "."));
    if (isNaN(amount)) continue;

    rows.push({ date: dateStr, amount, description: memo });
  }
  return rows;
}

function parseCSV(content: string): ParsedImportRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headerLine = lines[0];
  if (!headerLine) return [];

  const headers = headerLine
    .split(",")
    .map((h) => h.toLowerCase().trim().replace(/"/g, ""));

  const dateIdx = headers.findIndex((h) => h.includes("data") || h === "date");
  const amountIdx = headers.findIndex(
    (h) =>
      h.includes("valor") ||
      h === "amount" ||
      h.includes("vlr") ||
      h.includes("lanc"),
  );
  const descIdx = headers.findIndex(
    (h) =>
      h.includes("descr") ||
      h.includes("memo") ||
      h.includes("histor") ||
      h.includes("complement"),
  );

  const rows: ParsedImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

    const rawDate = dateIdx >= 0 ? (cols[dateIdx] ?? "") : "";
    const rawAmount = amountIdx >= 0 ? (cols[amountIdx] ?? "") : "";
    const desc = descIdx >= 0 ? (cols[descIdx] ?? "") : "";

    if (!rawDate || !rawAmount) continue;

    // Normalize date formats: DD/MM/YYYY → YYYY-MM-DD
    let dateStr = rawDate;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
      const parts = rawDate.split("/");
      dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
      const parts = rawDate.split("-");
      dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const amount = parseFloat(
      rawAmount
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.-]/g, ""),
    );

    if (isNaN(amount)) continue;

    rows.push({ date: dateStr, amount, description: desc });
  }

  return rows;
}

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
    const rows =
      input.format === "ofx"
        ? parseOFX(input.content)
        : parseCSV(input.content);

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
// ---------------------------------------------------------------------------

const importRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  amount: z.number(),
  description: z.string().max(500),
});

const confirmImportSchema = z.object({
  bankAccountId: z.string().uuid("Conta bancária inválida"),
  format: z.enum(["ofx", "csv"]),
  fileName: z.string().min(1).max(255),
  rows: z.array(importRowSchema).min(1, "Nenhuma transação para importar"),
  runAutoMatch: z.boolean().default(true),
});

export const confirmImport = colaboradorAction
  .schema(confirmImportSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    // Create the import record
    const importInserted = await db
      .insert(bankImports)
      .values({
        accountId: input.bankAccountId,
        fileUrl: input.fileName, // URL stored after Supabase Storage upload; using fileName as placeholder
        format: input.format,
        importedBy: ctx.actorId,
        rowCount: input.rows.length,
        matchedCount: 0,
      })
      .returning();

    const bankImport = importInserted[0];
    if (!bankImport) throw new Error("Falha ao criar registro de import");

    // Bulk-insert import rows
    const rowValues = input.rows.map((row) => ({
      bankImportId: bankImport.id,
      date: row.date,
      amount: row.amount.toString(),
      description: row.description,
      status: "unmatched" as const,
    }));

    await db.insert(bankImportRows).values(rowValues);

    // Auto-match: compare each row against existing transactions for the account
    let matchedCount = 0;

    if (input.runAutoMatch) {
      const accountTxs = await db
        .select()
        .from(transactions)
        .where(eq(transactions.accountId, input.bankAccountId));

      const txMap = new Map(
        accountTxs.map((tx) => [
          `${tx.date}|${parseFloat(tx.amount).toFixed(2)}`,
          tx.id,
        ]),
      );

      const insertedRows = await db
        .select()
        .from(bankImportRows)
        .where(eq(bankImportRows.bankImportId, bankImport.id));

      for (const row of insertedRows) {
        const rowAmount = parseFloat(row.amount);
        // Check exact date + amount match
        const key = `${row.date}|${Math.abs(rowAmount).toFixed(2)}`;
        const matchedTxId = txMap.get(key);

        if (matchedTxId) {
          await db
            .update(bankImportRows)
            .set({ matchTransactionId: matchedTxId, status: "matched" })
            .where(eq(bankImportRows.id, row.id));
          matchedCount++;
        }
      }

      if (matchedCount > 0) {
        await db
          .update(bankImports)
          .set({
            matchedCount: sql`${bankImports.matchedCount} + ${matchedCount}`,
          })
          .where(eq(bankImports.id, bankImport.id));
      }
    }

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.import.confirmed",
      entity: "bank_import",
      entityId: bankImport.id,
      diff: {
        bankAccountId: input.bankAccountId,
        format: input.format,
        fileName: input.fileName,
        rowCount: input.rows.length,
        autoMatchedCount: matchedCount,
      },
    });

    return {
      bankImport,
      totalRows: input.rows.length,
      matchedCount,
      unmatchedCount: input.rows.length - matchedCount,
    };
  });

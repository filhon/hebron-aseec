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

// Tokeniza uma linha CSV respeitando aspas (campos com vírgula/ponto-e-vírgula
// dentro de aspas não devem ser quebrados — formato comum de extrato
// bancário brasileiro: `"PAGTO FORNECEDOR, REF 123"`). F3-19.
export function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Aspas escapadas ("") dentro de um campo entre aspas
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cols.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cols.push(current.trim());

  return cols.map((c) => c.replace(/^"|"$/g, ""));
}

// Detecta o delimitador (`,` ou `;`) contando ocorrências fora de aspas na
// linha de cabeçalho — bancos brasileiros exportam com `;` frequentemente.
function detectDelimiter(headerLine: string): "," | ";" {
  let commaCount = 0;
  let semicolonCount = 0;
  let inQuotes = false;

  for (const char of headerLine) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && char === ",") commaCount++;
    else if (!inQuotes && char === ";") semicolonCount++;
  }

  return semicolonCount > commaCount ? ";" : ",";
}

export function parseCSV(content: string): ParsedImportRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headerLine = lines[0];
  if (!headerLine) return [];

  const delimiter = detectDelimiter(headerLine);

  const headers = splitDelimitedLine(headerLine, delimiter).map((h) =>
    h.toLowerCase().trim(),
  );

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

    const cols = splitDelimitedLine(line, delimiter);

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

function parseFileContent(
  content: string,
  format: "ofx" | "csv",
): ParsedImportRow[] {
  return format === "ofx" ? parseOFX(content) : parseCSV(content);
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

    // Create the import record
    const importInserted = await db
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

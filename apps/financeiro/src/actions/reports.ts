"use server";

import * as React from "react";
import { PassThrough } from "node:stream";
import { z } from "zod";
import { and, eq, gte, inArray, lte, or } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import archiver from "archiver";
import ExcelJS from "exceljs";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  Document,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { financialAttachments, payables, receivables } from "@hebron/db/schema";
import { getCategories, getTransactions } from "../lib/queries";
import { superAdminAction } from "../lib/safe-action";
import { logFinanceiroAudit } from "../lib/audit";

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new BusinessError("Variáveis Supabase não configuradas");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ---------------------------------------------------------------------------
// PDF (categoria x total) — mesma estrutura do relatório mensal automático
// (packages/jobs/src/crons/financeiro.ts); duplicado aqui porque apps/* não
// importa de packages/jobs (a lógica de geração de relatório não é
// compartilhada entre os dois pontos de disparo — cron vs. export manual).
// ---------------------------------------------------------------------------

const pdfStyles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 24, marginBottom: 20 },
  summaryLabel: { color: "#6B7280", fontSize: 9 },
  summaryValue: { fontSize: 12, fontWeight: 700 },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1 solid #111827",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #E5E7EB",
    paddingVertical: 4,
  },
  colCategory: { width: "50%" },
  colType: { width: "20%" },
  colTotal: { width: "30%", textAlign: "right" },
});

interface CategoryTotal {
  categoryName: string;
  type: "receita" | "despesa";
  total: number;
}

function buildReportPdfDocument(params: {
  year: number;
  month: number;
  totalRevenue: number;
  totalExpense: number;
  categoryTotals: CategoryTotal[];
}) {
  const monthName = MONTH_NAMES[params.month - 1] ?? String(params.month);
  return React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "A4", style: pdfStyles.page },
      React.createElement(
        Text,
        { style: pdfStyles.title },
        `Relatório financeiro — ${monthName} de ${params.year}`,
      ),
      React.createElement(
        View,
        { style: pdfStyles.summaryRow },
        React.createElement(
          View,
          {},
          React.createElement(
            Text,
            { style: pdfStyles.summaryLabel },
            "Receitas",
          ),
          React.createElement(
            Text,
            { style: pdfStyles.summaryValue },
            fmtBRL(params.totalRevenue),
          ),
        ),
        React.createElement(
          View,
          {},
          React.createElement(
            Text,
            { style: pdfStyles.summaryLabel },
            "Despesas",
          ),
          React.createElement(
            Text,
            { style: pdfStyles.summaryValue },
            fmtBRL(params.totalExpense),
          ),
        ),
        React.createElement(
          View,
          {},
          React.createElement(
            Text,
            { style: pdfStyles.summaryLabel },
            "Resultado",
          ),
          React.createElement(
            Text,
            { style: pdfStyles.summaryValue },
            fmtBRL(params.totalRevenue - params.totalExpense),
          ),
        ),
      ),
      React.createElement(
        View,
        { style: pdfStyles.tableHeader },
        React.createElement(
          Text,
          { style: pdfStyles.colCategory },
          "Categoria",
        ),
        React.createElement(Text, { style: pdfStyles.colType }, "Tipo"),
        React.createElement(Text, { style: pdfStyles.colTotal }, "Total"),
      ),
      ...params.categoryTotals.map((c) =>
        React.createElement(
          View,
          { style: pdfStyles.tableRow, key: c.categoryName },
          React.createElement(
            Text,
            { style: pdfStyles.colCategory },
            c.categoryName,
          ),
          React.createElement(
            Text,
            { style: pdfStyles.colType },
            c.type === "receita" ? "Receita" : "Despesa",
          ),
          React.createElement(
            Text,
            { style: pdfStyles.colTotal },
            fmtBRL(c.total),
          ),
        ),
      ),
    ),
  );
}

async function buildReportXlsxBuffer(params: {
  totalRevenue: number;
  totalExpense: number;
  categoryTotals: CategoryTotal[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatório mensal");
  sheet.columns = [
    { header: "Categoria", key: "name", width: 32 },
    { header: "Tipo", key: "type", width: 12 },
    { header: "Total (R$)", key: "total", width: 16 },
  ];
  for (const c of params.categoryTotals) {
    sheet.addRow({
      name: c.categoryName,
      type: c.type === "receita" ? "Receita" : "Despesa",
      total: c.total,
    });
  }
  sheet.addRow({});
  sheet.addRow({ name: "Receita total", total: params.totalRevenue });
  sheet.addRow({ name: "Despesa total", total: params.totalExpense });
  sheet.addRow({
    name: "Resultado",
    total: params.totalRevenue - params.totalExpense,
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function buildZipBuffer(
  entries: { name: string; content: Buffer }[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    const stream = new PassThrough();
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", (err) => reject(err));
    archive.pipe(stream);
    for (const entry of entries)
      archive.append(entry.content, { name: entry.name });
    void archive.finalize();
  });
}

// ---------------------------------------------------------------------------
// exportMonthlyReport — super_admin exporta PDF+XLSX+recibos do mês em ZIP
// (BRAIN §6.5: "mensal com recibos exportado como PDF+XLSX+ZIP pelo
// super_admin"). Retorna o ZIP em base64 (sem bucket dedicado a exports —
// suposição registrada em SESSIONS.md) para download direto no client.
// ---------------------------------------------------------------------------

const exportMonthlyReportSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export const exportMonthlyReport = superAdminAction
  .schema(exportMonthlyReportSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const monthStr = String(input.month).padStart(2, "0");
    const daysInMonth = new Date(
      Date.UTC(input.year, input.month, 0),
    ).getUTCDate();
    const dateStartStr = `${input.year}-${monthStr}-01`;
    const dateEndStr = `${input.year}-${monthStr}-${String(daysInMonth).padStart(2, "0")}`;
    const rangeStart = new Date(`${dateStartStr}T00:00:00.000Z`);
    const rangeEnd = new Date(`${dateEndStr}T23:59:59.999Z`);

    const [allTransactions, categories] = await Promise.all([
      getTransactions(),
      getCategories(),
    ]);

    const monthTransactions = allTransactions.filter(
      (t) => t.occurredAt >= rangeStart && t.occurredAt <= rangeEnd,
    );

    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

    let totalRevenue = 0;
    let totalExpense = 0;
    const totalsByCategory = new Map<string, CategoryTotal>();

    for (const t of monthTransactions) {
      if (t.type === "credito") totalRevenue += t.amount;
      else totalExpense += t.amount;

      if (!t.categoryId) continue;
      const categoryName =
        categoryNameById.get(t.categoryId) ?? "Sem categoria";
      const entryType: "receita" | "despesa" =
        t.type === "credito" ? "receita" : "despesa";
      const existing = totalsByCategory.get(t.categoryId);
      if (existing) {
        existing.total += t.amount;
      } else {
        totalsByCategory.set(t.categoryId, {
          categoryName,
          type: entryType,
          total: t.amount,
        });
      }
    }

    const categoryTotals = Array.from(totalsByCategory.values()).sort(
      (a, b) => b.total - a.total,
    );

    const pdfBuffer = await renderToBuffer(
      buildReportPdfDocument({
        year: input.year,
        month: input.month,
        totalRevenue,
        totalExpense,
        categoryTotals,
      }),
    );
    const xlsxBuffer = await buildReportXlsxBuffer({
      totalRevenue,
      totalExpense,
      categoryTotals,
    });

    // Recibos do mês — anexos vinculados a transações do mês, a payables
    // pagos no mês ou a receivables recebidos no mês (referência polimórfica
    // em financeiro.attachments).
    const txIds = monthTransactions.map((t) => t.id);

    const attachmentRows = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const paidPayableRows = await tx
          .select({ id: payables.id })
          .from(payables)
          .where(
            and(
              gte(payables.paidAt, rangeStart),
              lte(payables.paidAt, rangeEnd),
            ),
          );
        const paidPayableIds = paidPayableRows.map((r) => r.id);

        const receivedRows = await tx
          .select({ id: receivables.id })
          .from(receivables)
          .where(
            and(
              gte(receivables.receivedDate, dateStartStr),
              lte(receivables.receivedDate, dateEndStr),
            ),
          );
        const receivedReceivableIds = receivedRows.map((r) => r.id);

        const attachmentConditions = [];
        if (txIds.length > 0) {
          attachmentConditions.push(
            and(
              eq(financialAttachments.refType, "transaction"),
              inArray(financialAttachments.refId, txIds),
            ),
          );
        }
        if (paidPayableIds.length > 0) {
          attachmentConditions.push(
            and(
              eq(financialAttachments.refType, "payable"),
              inArray(financialAttachments.refId, paidPayableIds),
            ),
          );
        }
        if (receivedReceivableIds.length > 0) {
          attachmentConditions.push(
            and(
              eq(financialAttachments.refType, "receivable"),
              inArray(financialAttachments.refId, receivedReceivableIds),
            ),
          );
        }

        return attachmentConditions.length > 0
          ? tx
              .select()
              .from(financialAttachments)
              .where(or(...attachmentConditions))
          : [];
      },
    );

    const supabase = getSupabaseAdmin();
    const receiptEntries: { name: string; content: Buffer }[] = [];

    for (const attachment of attachmentRows) {
      const { data, error } = await supabase.storage
        .from("financeiro-recibos")
        .download(attachment.fileUrl);
      // Best-effort: um recibo ausente/corrompido não deve derrubar o export
      // inteiro — ele só fica de fora do ZIP.
      if (error || !data) continue;
      const arrayBuffer = await data.arrayBuffer();
      receiptEntries.push({
        name: `recibos/${attachment.fileName}`,
        content: Buffer.from(arrayBuffer),
      });
    }

    const fileSuffix = `${monthStr}-${input.year}`;
    const zipBuffer = await buildZipBuffer([
      { name: `relatorio-financeiro-${fileSuffix}.pdf`, content: pdfBuffer },
      { name: `relatorio-financeiro-${fileSuffix}.xlsx`, content: xlsxBuffer },
      ...receiptEntries,
    ]);

    await withAuthenticatedContext({ actorId: ctx.actorId }, (tx) =>
      withSystemRole(tx, (sysTx) =>
        logFinanceiroAudit(
          {
            actorId: ctx.actorId,
            action: "financeiro.report.exported",
            entity: "monthly_report",
            diff: {
              year: input.year,
              month: input.month,
              receiptCount: receiptEntries.length,
            },
          },
          sysTx,
        ),
      ),
    );

    return {
      fileName: `relatorio-financeiro-${fileSuffix}.zip`,
      base64: zipBuffer.toString("base64"),
    };
  });

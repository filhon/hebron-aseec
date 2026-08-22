import * as React from "react";
import {
  Document,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import ExcelJS from "exceljs";
import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  batchApprovals,
  batchApprovalItems,
  financialCategories,
  payables,
  receivables,
  roleAssignments,
  transactions,
  users,
} from "@hebron/db/schema";
import { logAudit } from "@hebron/db/audit";
import { getSystemActorId } from "@hebron/db/system-actor";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { BatchApprovalEmail } from "@hebron/email/templates/batch-approval";
import { MonthlyFinancialReportEmail } from "@hebron/email/templates/monthly-financial-report";
import type { MonthlyFinancialReportCategoryTotal } from "@hebron/email/templates/monthly-financial-report";
import {
  getWeeklyBatchWindow,
  findExistingWeeklyBatch,
  selectWeeklyBatchPendingPayables,
  resolveWeeklyBatchRecipients,
} from "@hebron/integrations/financeiro";
import { inngest } from "../client";
import { getDbTemplate, applyVars } from "../lib/templates";

const FINANCEIRO_BASE_URL =
  process.env.NEXT_PUBLIC_FINANCEIRO_URL ??
  "https://financeiro.hebronaseec.com.br";

const makeInsert = makeNotificationInserter;

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

function dateOnlyUTC(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  const iso = d.toISOString().split("T")[0];
  if (!iso) throw new Error("Invalid date");
  return iso;
}

// ---------------------------------------------------------------------------
// createWeeklyBatch / notifyWeeklyBatchRecipients — D5-001: o cron era um
// único step.run cobrindo criação do lote + envio de e-mail + audit. Se o
// Resend falhasse no segundo destinatário de três, o retry do Inngest
// reexecutava o step inteiro — e a guarda de idempotência original ("existe
// lote da semana?") fazia o retry retornar cedo, sem nunca notificar os
// destinatários restantes nem gravar o audit. Variante pior: se o INSERT dos
// itens falhasse, sobrava um batch_approvals vazio que bloqueava toda
// tentativa futura daquela semana (a guarda via "existe lote?" nunca deixava
// tentar de novo).
//
// A correção separa em dois steps (ver weeklyBatchCreationCron abaixo) e
// desloca a guarda de "existe lote?" para duas perguntas independentes: "o
// lote tem os itens da semana?" (createWeeklyBatch completa um lote
// encontrado sem itens em vez de considerá-lo pronto) e "os destinatários já
// foram avisados?" (notifiedAt, checado só depois que o laço de e-mail
// termina sem lançar — batch_approvals.notified_at).
// ---------------------------------------------------------------------------

export interface CreateWeeklyBatchResult {
  batchId: string | null;
  payableCount: number;
}

export async function createWeeklyBatch(): Promise<CreateWeeklyBatchResult> {
  const window = getWeeklyBatchWindow(new Date());
  const { weekStart, weekEnd } = window;

  const existing = await findExistingWeeklyBatch(window);

  if (existing) {
    const existingItems = await db
      .select({ payableId: batchApprovalItems.payableId })
      .from(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, existing.id));

    if (existingItems.length > 0) {
      return { batchId: existing.id, payableCount: existingItems.length };
    }

    // Lote existe mas ficou sem itens (falha parcial de uma tentativa
    // anterior) — completa em vez de tratar como "nada a fazer".
    const pendingPayables = await selectWeeklyBatchPendingPayables(window);
    if (pendingPayables.length === 0) {
      return { batchId: existing.id, payableCount: 0 };
    }
    await db.insert(batchApprovalItems).values(
      pendingPayables.map((p) => ({
        batchApprovalId: existing.id,
        payableId: p.id,
      })),
    );
    return { batchId: existing.id, payableCount: pendingPayables.length };
  }

  const pendingPayables = await selectWeeklyBatchPendingPayables(window);
  if (pendingPayables.length === 0) return { batchId: null, payableCount: 0 };

  const [batch] = await db
    .insert(batchApprovals)
    .values({ weekStart, weekEnd })
    .returning();
  if (!batch) throw new Error("Falha ao criar lote de aprovação (cron)");

  await db.insert(batchApprovalItems).values(
    pendingPayables.map((p) => ({
      batchApprovalId: batch.id,
      payableId: p.id,
    })),
  );

  return { batchId: batch.id, payableCount: pendingPayables.length };
}

export async function notifyWeeklyBatchRecipients(
  batchId: string,
): Promise<void> {
  const batchRows = await db
    .select()
    .from(batchApprovals)
    .where(eq(batchApprovals.id, batchId))
    .limit(1);
  const batch = batchRows[0];
  if (!batch) throw new Error("Lote não encontrado para notificação (cron)");
  if (batch.notifiedAt) return;

  const { weekStart, weekEnd } = batch;

  const itemRows = await db
    .select({ payableId: batchApprovalItems.payableId })
    .from(batchApprovalItems)
    .where(eq(batchApprovalItems.batchApprovalId, batchId));
  if (itemRows.length === 0) return;

  const payableRows = await db
    .select({ amount: payables.amount })
    .from(payables)
    .where(
      inArray(
        payables.id,
        itemRows.map((i) => i.payableId),
      ),
    );

  const { recipients, usingGestorRecipients, autorizadorEmails } =
    await resolveWeeklyBatchRecipients();

  const totalAmount = payableRows.reduce(
    (sum, p) => sum + parseFloat(p.amount),
    0,
  );
  const resendApiKey = process.env.RESEND_API_KEY;
  const dbTpl = await getDbTemplate("financeiro-batch-approval");

  for (const d of recipients) {
    const displayName = d.fullName ?? d.email;
    const emailOpts = dbTpl
      ? applyVars(dbTpl, {
          nome: displayName,
          semanaInicio: weekStart,
          semanaFim: weekEnd,
          quantidade: String(itemRows.length),
          valorTotal: totalAmount.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
          link: FINANCEIRO_BASE_URL,
        })
      : null;

    await createNotification({
      insert: makeInsert(),
      resendApiKey,
      data: {
        userId: d.userId,
        channel: "email",
        type: "financeiro.batch.created",
        title: `Lote de pagamentos aguarda aprovação (${weekStart})`,
        body:
          `${itemRows.length} conta(s) totalizando ` +
          `R$ ${totalAmount.toFixed(2)} aguardam aprovação — semana ` +
          `${weekStart} a ${weekEnd}.`,
        payload: { batchId: batch.id, weekStart, weekEnd },
      },
      email: {
        to: d.email,
        cc: usingGestorRecipients ? autorizadorEmails : undefined,
        ...(emailOpts ?? {
          subject: `[Financeiro] Lote de pagamentos aguarda aprovação — ${weekStart}`,
          template: React.createElement(BatchApprovalEmail, {
            recipientName: displayName,
            weekStart,
            weekEnd,
            payableCount: itemRows.length,
            totalAmount,
            financeiroUrl: FINANCEIRO_BASE_URL,
          }),
        }),
      },
    });
  }

  await db
    .update(batchApprovals)
    .set({ notifiedAt: new Date() })
    .where(eq(batchApprovals.id, batchId));

  const actorId = await getSystemActorId();
  await logAudit({
    actorId,
    action: "financeiro.batch.created",
    entity: "batch_approval",
    entityId: batch.id,
    diff: { weekStart, weekEnd, payableCount: itemRows.length },
    criticality: "critical",
  });
}

// Composto usado por chamadores diretos (fora do Inngest — ex.: testes) que
// esperam criação + notificação em uma única chamada síncrona.
export async function runWeeklyBatchCreation(): Promise<CreateWeeklyBatchResult> {
  const result = await createWeeklyBatch();
  if (result.batchId) await notifyWeeklyBatchRecipients(result.batchId);
  return result;
}

export const weeklyBatchCreationCron = inngest.createFunction(
  {
    id: "financeiro-lote-semanal",
    name: "Financeiro: lote semanal de aprovação de pagamentos",
  },
  { cron: "0 8 * * 1" },
  async ({ step }) => {
    const result = await step.run("create-batch", createWeeklyBatch);
    if (result.batchId) {
      await step.run("notify-recipients", () =>
        notifyWeeklyBatchRecipients(result.batchId as string),
      );
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// runDueDateReminders — in_app 3 dias antes do vencimento de contas a pagar
// (dueDate) e a receber (expectedDate) ainda não liquidadas.
// ---------------------------------------------------------------------------

export async function runDueDateReminders(): Promise<void> {
  const targetDate = dateOnlyUTC(3);

  const duePayables = await db
    .select({
      id: payables.id,
      description: payables.description,
      amount: payables.amount,
      createdBy: payables.createdBy,
    })
    .from(payables)
    .where(
      and(
        inArray(payables.status, ["pendente", "aprovado", "autorizado"]),
        isNull(payables.deletedAt),
        eq(payables.dueDate, targetDate),
      ),
    );

  for (const p of duePayables) {
    await createNotification({
      insert: makeInsert(),
      data: {
        userId: p.createdBy,
        channel: "in_app",
        type: "financeiro.payable.due_soon",
        title: `Conta a pagar vence em 3 dias: ${p.description}`,
        body: `Vencimento em ${targetDate} — R$ ${parseFloat(p.amount).toFixed(2)}.`,
        payload: {
          module: "financeiro",
          payableId: p.id,
          href: "/contas-pagar",
        },
      },
    });
  }

  const dueReceivables = await db
    .select({
      id: receivables.id,
      description: receivables.description,
      amount: receivables.amount,
      createdBy: receivables.createdBy,
    })
    .from(receivables)
    .where(
      and(
        eq(receivables.status, "pendente"),
        isNull(receivables.deletedAt),
        eq(receivables.expectedDate, targetDate),
      ),
    );

  for (const r of dueReceivables) {
    await createNotification({
      insert: makeInsert(),
      data: {
        userId: r.createdBy,
        channel: "in_app",
        type: "financeiro.receivable.due_soon",
        title: `Conta a receber vence em 3 dias: ${r.description}`,
        body: `Previsão em ${targetDate} — R$ ${parseFloat(r.amount).toFixed(2)}.`,
        payload: {
          module: "financeiro",
          receivableId: r.id,
          href: "/contas-receber",
        },
      },
    });
  }
}

export const dueDateRemindersCron = inngest.createFunction(
  {
    id: "financeiro-vencimento-proximo",
    name: "Financeiro: contas a pagar/receber vencendo em breve",
  },
  { cron: "0 8 * * *" },
  async ({ step }) => step.run("run-due-date-reminders", runDueDateReminders),
);

// ---------------------------------------------------------------------------
// runMonthlyReport — relatório financeiro consolidado do mês anterior,
// enviado por email (PDF + XLSX anexados, decisão D-6) a diretores e
// conselheiros. Roda no dia 1 de cada mês.
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

function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MonthlyReportPdfDocument({
  year,
  month,
  totalRevenue,
  totalExpense,
  categoryTotals,
}: {
  year: number;
  month: number;
  totalRevenue: number;
  totalExpense: number;
  categoryTotals: MonthlyFinancialReportCategoryTotal[];
}) {
  const monthName = MONTH_NAMES[month - 1] ?? String(month);
  return React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "A4", style: pdfStyles.page },
      React.createElement(
        Text,
        { style: pdfStyles.title },
        `Relatório financeiro — ${monthName} de ${year}`,
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
            fmtBRL(totalRevenue),
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
            fmtBRL(totalExpense),
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
            fmtBRL(totalRevenue - totalExpense),
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
      ...categoryTotals.map((c) =>
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

async function buildMonthlyReportXlsxBuffer(params: {
  year: number;
  month: number;
  totalRevenue: number;
  totalExpense: number;
  categoryTotals: MonthlyFinancialReportCategoryTotal[];
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

export async function runMonthlyReport(): Promise<void> {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // mês anterior, já 0-based → 1-based do mês anterior
  if (month === 0) {
    month = 12;
    year -= 1;
  }

  const monthStr = String(month).padStart(2, "0");
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dateStart = `${year}-${monthStr}-01`;
  const dateEnd = `${year}-${monthStr}-${String(daysInMonth).padStart(2, "0")}`;

  const txRows = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
      categoryId: transactions.categoryId,
    })
    .from(transactions)
    .where(
      and(gte(transactions.date, dateStart), lte(transactions.date, dateEnd)),
    );

  const categoryRows = await db
    .select({ id: financialCategories.id, name: financialCategories.name })
    .from(financialCategories);
  const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name]));

  let totalRevenue = 0;
  let totalExpense = 0;
  const totalsByCategory = new Map<
    string,
    { categoryName: string; type: "receita" | "despesa"; total: number }
  >();

  for (const t of txRows) {
    const amount = parseFloat(t.amount);
    if (t.type === "credito") totalRevenue += amount;
    else totalExpense += amount;

    if (!t.categoryId) continue;
    const categoryName = categoryNameById.get(t.categoryId) ?? "Sem categoria";
    const key = t.categoryId;
    const existing = totalsByCategory.get(key);
    const entryType: "receita" | "despesa" =
      t.type === "credito" ? "receita" : "despesa";
    if (existing) {
      existing.total += amount;
    } else {
      totalsByCategory.set(key, {
        categoryName,
        type: entryType,
        total: amount,
      });
    }
  }

  const categoryTotals = Array.from(totalsByCategory.values()).sort(
    (a, b) => b.total - a.total,
  );

  const pdfBuffer = await renderToBuffer(
    MonthlyReportPdfDocument({
      year,
      month,
      totalRevenue,
      totalExpense,
      categoryTotals,
    }),
  );
  const xlsxBuffer = await buildMonthlyReportXlsxBuffer({
    year,
    month,
    totalRevenue,
    totalExpense,
    categoryTotals,
  });

  const recipientRows = await db
    .select({
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(roleAssignments)
    .innerJoin(users, eq(users.id, roleAssignments.userId))
    .where(
      and(
        inArray(roleAssignments.role, ["diretor", "conselheiro"]),
        isNull(users.suspendedAt),
      ),
    );

  const seen = new Set<string>();
  const recipients = recipientRows.filter((r) => {
    if (seen.has(r.userId)) return false;
    seen.add(r.userId);
    return true;
  });

  const resendApiKey = process.env.RESEND_API_KEY;
  const monthName = MONTH_NAMES[month - 1] ?? String(month);
  const title = `Relatório financeiro de ${monthName}/${year}`;
  const fileSuffix = `${monthStr}-${year}`;
  const reportUrl = `${FINANCEIRO_BASE_URL}/relatorios`;
  const dbTpl = await getDbTemplate("financeiro-monthly-report");

  for (const r of recipients) {
    const displayName = r.fullName ?? r.email;
    const emailOpts = dbTpl
      ? applyVars(dbTpl, {
          nome: displayName,
          mes: monthName,
          ano: String(year),
          receitas: fmtBRL(totalRevenue),
          despesas: fmtBRL(totalExpense),
          resultado: fmtBRL(totalRevenue - totalExpense),
          link: reportUrl,
        })
      : null;

    await createNotification({
      insert: makeInsert(),
      resendApiKey,
      data: {
        userId: r.userId,
        channel: "email",
        type: "financeiro.report.monthly",
        title,
        body: `Receitas: ${fmtBRL(totalRevenue)} · Despesas: ${fmtBRL(totalExpense)}`,
        payload: { year, month },
      },
      email: {
        to: r.email,
        ...(emailOpts ?? {
          subject: title,
          template: React.createElement(MonthlyFinancialReportEmail, {
            recipientName: displayName,
            month,
            year,
            totalRevenue,
            totalExpense,
            categoryTotals,
            financeiroUrl: reportUrl,
          }),
        }),
        attachments: [
          {
            filename: `relatorio-financeiro-${fileSuffix}.pdf`,
            content: pdfBuffer,
          },
          {
            filename: `relatorio-financeiro-${fileSuffix}.xlsx`,
            content: xlsxBuffer,
          },
        ],
      },
    });
  }
}

export const monthlyReportCron = inngest.createFunction(
  {
    id: "financeiro-relatorio-mensal",
    name: "Financeiro: relatório mensal consolidado",
  },
  { cron: "0 8 1 * *" },
  async ({ step }) => step.run("run-monthly-report", runMonthlyReport),
);

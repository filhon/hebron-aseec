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
  designations,
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
import { inngest } from "../client";

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

function getISOWeekBounds(date: Date): { weekStart: string; weekEnd: string } {
  const d = new Date(date);
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
// runWeeklyBatchCreation — cron equivalente ao "createWeeklyBatch" manual
// (apps/financeiro/src/actions/approval.ts, P-3.9), rodando com o ator
// sistema em vez de um super_admin logado (packages/jobs não importa código
// de apps/* — G6.5 — por isso a resolução de destinatários é replicada aqui,
// no mesmo espírito de runHomologacaoAutoApprove em crons/projetos.ts).
// Idempotente: um lote já existente para a semana corrente não é duplicado.
// ---------------------------------------------------------------------------

export async function runWeeklyBatchCreation(): Promise<{
  batchId: string | null;
  payableCount: number;
}> {
  const actorId = await getSystemActorId();
  const { weekStart, weekEnd } = getISOWeekBounds(new Date());

  const existing = await db
    .select({ id: batchApprovals.id })
    .from(batchApprovals)
    .where(
      and(
        eq(batchApprovals.weekStart, weekStart),
        eq(batchApprovals.weekEnd, weekEnd),
      ),
    )
    .limit(1);

  if (existing[0]) return { batchId: existing[0].id, payableCount: 0 };

  const pendingPayables = await db
    .select()
    .from(payables)
    .where(
      and(
        eq(payables.status, "pendente"),
        isNull(payables.deletedAt),
        gte(payables.dueDate, weekStart),
        lte(payables.dueDate, weekEnd),
      ),
    );

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

  const gestorRows = await db
    .select({
      userId: designations.userId,
      email: users.email,
      fullName: users.fullName,
    })
    .from(designations)
    .innerJoin(users, eq(users.id, designations.userId))
    .where(eq(designations.type, "gestor"));

  const autorizadorEmails = (
    await db
      .select({ email: users.email })
      .from(designations)
      .innerJoin(users, eq(users.id, designations.userId))
      .where(eq(designations.type, "autorizador"))
  ).map((r) => r.email);

  const diretorRows = await db
    .select({
      userId: roleAssignments.userId,
      email: users.email,
      fullName: users.fullName,
    })
    .from(roleAssignments)
    .innerJoin(users, eq(users.id, roleAssignments.userId))
    .where(eq(roleAssignments.role, "diretor"));

  const usingGestorRecipients = gestorRows.length > 0;
  const recipients = usingGestorRecipients ? gestorRows : diretorRows;

  const totalAmount = pendingPayables.reduce(
    (sum, p) => sum + parseFloat(p.amount),
    0,
  );
  const resendApiKey = process.env.RESEND_API_KEY;

  for (const d of recipients) {
    const displayName = d.fullName ?? d.email;
    await createNotification({
      insert: makeInsert(),
      resendApiKey,
      data: {
        userId: d.userId,
        channel: "email",
        type: "financeiro.batch.created",
        title: `Lote de pagamentos aguarda aprovação (${weekStart})`,
        body:
          `${pendingPayables.length} conta(s) totalizando ` +
          `R$ ${totalAmount.toFixed(2)} aguardam aprovação — semana ` +
          `${weekStart} a ${weekEnd}.`,
        payload: { batchId: batch.id, weekStart, weekEnd },
      },
      email: {
        to: d.email,
        cc: usingGestorRecipients ? autorizadorEmails : undefined,
        subject: `[Financeiro] Lote de pagamentos aguarda aprovação — ${weekStart}`,
        template: React.createElement(BatchApprovalEmail, {
          recipientName: displayName,
          weekStart,
          weekEnd,
          payableCount: pendingPayables.length,
          totalAmount,
          financeiroUrl: FINANCEIRO_BASE_URL,
        }),
      },
    });
  }

  await logAudit({
    actorId,
    action: "financeiro.batch.created",
    entity: "batch_approval",
    entityId: batch.id,
    diff: { weekStart, weekEnd, payableCount: pendingPayables.length },
    criticality: "critical",
  });

  return { batchId: batch.id, payableCount: pendingPayables.length };
}

export const weeklyBatchCreationCron = inngest.createFunction(
  {
    id: "financeiro-lote-semanal",
    name: "Financeiro: lote semanal de aprovação de pagamentos",
  },
  { cron: "0 8 * * 1" },
  async ({ step }) =>
    step.run("run-weekly-batch-creation", runWeeklyBatchCreation),
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
        payload: { payableId: p.id, href: "/contas-pagar" },
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
        payload: { receivableId: r.id, href: "/contas-receber" },
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

  for (const r of recipients) {
    const displayName = r.fullName ?? r.email;
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
        subject: title,
        template: React.createElement(MonthlyFinancialReportEmail, {
          recipientName: displayName,
          month,
          year,
          totalRevenue,
          totalExpense,
          categoryTotals,
          financeiroUrl: `${FINANCEIRO_BASE_URL}/relatorios`,
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

import * as React from "react";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  budgets,
  costCenters,
  emailTemplates,
  payables,
  roleAssignments,
  transactions,
  users,
} from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { BudgetAlertEmail } from "@hebron/email/templates/budget-alert";

const FINANCEIRO_BASE_URL =
  process.env.NEXT_PUBLIC_FINANCEIRO_URL ??
  "https://financeiro.hebronaseec.com.br";

const makeInsert = makeNotificationInserter;

// ---------------------------------------------------------------------------
// Template override helpers — mesmo padrão de
// apps/projetos/src/lib/notifications.ts / packages/jobs/src/lib/templates.ts
// (override editável no Admin, fallback para o componente React Email).
// ---------------------------------------------------------------------------

export async function getDbTemplate(
  slug: string,
): Promise<{ subject: string; bodyHtml: string } | null> {
  const [row] = await db
    .select({
      subject: emailTemplates.subject,
      bodyHtml: emailTemplates.bodyHtml,
    })
    .from(emailTemplates)
    .where(eq(emailTemplates.slug, slug))
    .limit(1);
  return row ?? null;
}

export function applyVars(
  tpl: { subject: string; bodyHtml: string },
  vars: Record<string, string>,
): { subject: string; html: string } {
  const sub = (t: string) =>
    t.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? `{{${k}}}`);
  return { subject: sub(tpl.subject), html: sub(tpl.bodyHtml) };
}

// ---------------------------------------------------------------------------
// notifyPayablePaid — in_app ao criador da conta quando ela é marcada como
// paga (P-3.10, escopo "Pagamento pago (in_app)").
// ---------------------------------------------------------------------------

export async function notifyPayablePaid(payableId: string): Promise<void> {
  const [row] = await db
    .select({
      description: payables.description,
      amount: payables.amount,
      createdBy: payables.createdBy,
    })
    .from(payables)
    .where(eq(payables.id, payableId))
    .limit(1);

  if (!row) return;

  const amount = parseFloat(row.amount).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  await createNotification({
    insert: makeInsert(),
    data: {
      userId: row.createdBy,
      channel: "in_app",
      type: "financeiro.payable.paid",
      title: `Pagamento realizado: ${row.description}`,
      body: `O pagamento de ${amount} foi processado.`,
      payload: { module: "financeiro", payableId, href: "/contas-pagar" },
    },
  });
}

// ---------------------------------------------------------------------------
// checkBudgetAlert — dispara alerta (in_app + email) ao(s) super_admin(s)
// quando a execução do orçamento de um centro de custo cruza 80% do total
// orçado para o ano (P-3.10, escopo "Orçamento >80% executado").
//
// Detecção de cruzamento: compara o total executado ANTES e DEPOIS da nova
// transação de débito já commitada — dispara só na transição <80% → ≥80%,
// para não reenviar o alerta a cada lançamento subsequente. Não há coluna de
// estado dedicada (suposição registrada em SESSIONS.md); em uso concorrente
// raro, duas transações simultâneas poderiam ambas computar o "antes" abaixo
// de 80% e disparar duas vezes — aceitável na escala desta ONG (~150
// usuários, 2 super_admins).
// ---------------------------------------------------------------------------

export async function checkBudgetAlert(params: {
  costCenterId: string;
  /** Data da transação recém-criada (YYYY-MM-DD) */
  transactionDate: string;
  newTransactionAmount: number;
}): Promise<void> {
  const year = parseInt(params.transactionDate.slice(0, 4), 10);
  if (!Number.isFinite(year)) return;

  const [budget] = await db
    .select({ totalAmount: budgets.totalAmount })
    .from(budgets)
    .where(
      and(
        eq(budgets.costCenterId, params.costCenterId),
        eq(budgets.year, year),
      ),
    )
    .limit(1);

  if (!budget) return;

  const planned = parseFloat(budget.totalAmount);
  if (!(planned > 0)) return;

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const executedRows = await db
    .select({ amount: transactions.amount })
    .from(transactions)
    .where(
      and(
        eq(transactions.costCenterId, params.costCenterId),
        eq(transactions.type, "debito"),
        gte(transactions.date, yearStart),
        lte(transactions.date, yearEnd),
      ),
    );

  const executedAfter = executedRows.reduce(
    (sum, r) => sum + parseFloat(r.amount),
    0,
  );
  const executedBefore = executedAfter - params.newTransactionAmount;

  const pctBefore = executedBefore / planned;
  const pctAfter = executedAfter / planned;

  if (pctBefore >= 0.8 || pctAfter < 0.8) return;

  const [costCenter] = await db
    .select({ name: costCenters.name })
    .from(costCenters)
    .where(eq(costCenters.id, params.costCenterId))
    .limit(1);

  if (!costCenter) return;

  const superAdmins = await db
    .select({ userId: users.id, email: users.email, fullName: users.fullName })
    .from(roleAssignments)
    .innerJoin(users, eq(users.id, roleAssignments.userId))
    .where(
      and(eq(roleAssignments.role, "super_admin"), isNull(users.suspendedAt)),
    );

  const resendApiKey = process.env.RESEND_API_KEY;
  const pctDisplay = pctAfter * 100;
  const title = `Orçamento de ${costCenter.name} acima de 80% executado`;
  const url = `${FINANCEIRO_BASE_URL}/orcamento`;
  const dbTpl = await getDbTemplate("financeiro-budget-alert");

  for (const admin of superAdmins) {
    const emailOpts = dbTpl
      ? applyVars(dbTpl, {
          nome: admin.fullName ?? admin.email,
          centroCusto: costCenter.name,
          ano: String(year),
          valorOrcado: planned.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
          valorExecutado: executedAfter.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
          percentual: pctDisplay.toFixed(0),
          link: url,
        })
      : null;

    await createNotification({
      insert: makeInsert(),
      resendApiKey,
      data: {
        userId: admin.userId,
        channel: "email",
        type: "financeiro.budget.alert",
        title,
        body: `Execução em ${pctDisplay.toFixed(0)}% do orçado para ${year}.`,
        payload: {
          module: "financeiro",
          costCenterId: params.costCenterId,
          year,
          pct: pctDisplay,
        },
      },
      email: emailOpts
        ? { to: admin.email, ...emailOpts }
        : {
            to: admin.email,
            subject: title,
            template: React.createElement(BudgetAlertEmail, {
              costCenterName: costCenter.name,
              year,
              plannedAmount: planned,
              executedAmount: executedAfter,
              pct: pctDisplay,
              financeiroUrl: url,
            }),
          },
    });
  }
}

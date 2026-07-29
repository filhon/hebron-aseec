import * as React from "react";
import { and, eq, sum } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  costCenters,
  transactions,
  payables,
  reservations,
  aidRequests,
  paymentSchedules,
  projects,
  users,
  emailTemplates,
} from "@hebron/db/schema";
import { logAudit } from "@hebron/db/audit";
import { getSystemActorId } from "@hebron/db/system-actor";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { PaymentConfirmationEmail } from "@hebron/email/templates/payment-confirmation";

// ---------------------------------------------------------------------------
// getProjectBudgetExecution — Financeiro → Projetos
//
// Executado vs orçado em tempo real para o centro de custo de um projeto
// aprovado. "Executado" soma os lançamentos de débito (financeiro.
// transactions) vinculados ao centro de custo — a mesma fonte usada pelo
// alerta de 80% de execução orçamentária (checkBudgetAlert, P-3.10). Não há
// centro de custo até o projeto ser aprovado (onProjectApproved) — retorna
// null nesse caso, cabendo ao chamador decidir como exibir "sem execução".
// ---------------------------------------------------------------------------

export interface ProjectBudgetExecution {
  projectId: string;
  costCenterId: string;
  budgetTotal: number;
  executedTotal: number;
  remaining: number;
  percentExecuted: number;
}

export async function getProjectBudgetExecution(
  projectId: string,
): Promise<ProjectBudgetExecution | null> {
  const [costCenter] = await db
    .select({ id: costCenters.id, budgetTotal: costCenters.budgetTotal })
    .from(costCenters)
    .where(eq(costCenters.projectId, projectId))
    .limit(1);

  if (!costCenter) return null;

  const [result] = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(
      and(
        eq(transactions.costCenterId, costCenter.id),
        eq(transactions.type, "debito"),
      ),
    );

  const budgetTotal = parseFloat(costCenter.budgetTotal);
  const executedTotal = parseFloat(result?.total ?? "0");

  return {
    projectId,
    costCenterId: costCenter.id,
    budgetTotal,
    executedTotal,
    remaining: budgetTotal - executedTotal,
    percentExecuted: budgetTotal > 0 ? (executedTotal / budgetTotal) * 100 : 0,
  };
}

// ---------------------------------------------------------------------------
// onFlatsAssistanceApproved — Flats → Financeiro (P-7.8)
//
// Auxílio (ajuda de custo) aprovado cria uma despesa automática no
// Financeiro (financeiro.payables), NÃO aprovada — segue o fluxo normal de
// governança dual (lote semanal → gestor aprova → autorizador autoriza,
// decisão D-4). dueDate = dia anterior ao início do período confirmado da
// reserva (BRAIN §6.8 / Respostas7.md Q139).
//
// Um único payable cobre diária + transporte (o schema de aid_requests só
// tem uma coluna financeiroExpenseId para a referência de volta — decisão
// mais simples que criar dois payables e escolher qual referenciar).
//
// Roda pelo ator sistema com a conexão privilegiada (`db`, não uma tx
// `withAuthenticatedContext`) — mesmo padrão de onProjectApproved
// (packages/db/src/projetos-approval.ts): a policy `payables_insert_staff`
// só concede INSERT a super_admin/colaborador, nunca a diretor/gestor de
// Flats, então a escrita cross-schema precisa contornar RLS pelo ator
// sistema em vez de rodar na sessão do gestor que aprovou o auxílio.
//
// O chamador deve `await` (nunca fire-and-forget), mesmo que a decisão de
// negócio seja não bloquear a aprovação do auxílio por causa de uma falha
// aqui (mesmo padrão documentado em onProjectSubmitted, projetos-tarefas.ts).
// ---------------------------------------------------------------------------

export interface FlatsAssistanceApprovedParams {
  reservationId: string;
  aidRequestId: string;
  dailyAllowanceAmount: number | null;
  transportAmount: number | null;
}

export async function onFlatsAssistanceApproved(
  params: FlatsAssistanceApprovedParams,
): Promise<{ payableId: string } | null> {
  const totalAmount =
    (params.dailyAllowanceAmount ?? 0) + (params.transportAmount ?? 0);
  if (totalAmount <= 0) return null;

  const [reservation] = await db
    .select({ selectedPeriod: reservations.selectedPeriod })
    .from(reservations)
    .where(eq(reservations.id, params.reservationId))
    .limit(1);

  if (!reservation?.selectedPeriod) {
    throw new Error(
      "Reserva sem período confirmado — não é possível gerar a despesa de auxílio",
    );
  }

  const startDate = new Date(`${reservation.selectedPeriod.start}T00:00:00Z`);
  const dueDate = new Date(startDate);
  dueDate.setUTCDate(dueDate.getUTCDate() - 1);
  const dueDateStr = dueDate.toISOString().split("T")[0];
  if (!dueDateStr) throw new Error("Data de vencimento inválida");

  const parts: string[] = [];
  if (params.dailyAllowanceAmount) parts.push("diária fixa");
  if (params.transportAmount) parts.push("transporte");

  const actorId = await getSystemActorId();

  const payable = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(payables)
      .values({
        description: `Auxílio Flats (${parts.join(" + ")}) — reserva ${params.reservationId}`,
        amount: totalAmount.toFixed(2),
        dueDate: dueDateStr,
        status: "pendente",
        createdBy: actorId,
      })
      .returning();

    if (!inserted) {
      throw new Error("Falha ao criar despesa de auxílio no Financeiro");
    }

    await tx
      .update(aidRequests)
      .set({ financeiroExpenseId: inserted.id })
      .where(eq(aidRequests.id, params.aidRequestId));

    await logAudit(
      {
        actorId,
        action: "financeiro.payable.created",
        entity: "payable",
        entityId: inserted.id,
        diff: {
          source: "flats-aid-approval",
          reservationId: params.reservationId,
          aidRequestId: params.aidRequestId,
          amount: inserted.amount,
          dueDate: inserted.dueDate,
        },
      },
      tx,
    );

    return inserted;
  });

  return { payableId: payable.id };
}

// ---------------------------------------------------------------------------
// notifyProjectPaymentMade — Financeiro → Projetos (P-2.10b)
//
// Movida de `apps/projetos/src/lib/notifications.ts`, onde vivia sem
// chamador (P-2.10). Quem sabe que um pagamento aconteceu é o Financeiro
// (`markPayableAsPaid`, apps/financeiro/src/actions/approval.ts) — chama
// esta função pelo `payment_schedule_id` do payable (FK 1:1 —
// `financeiro.payables.payment_schedule_id` — só existe quando o payable
// nasceu de um projeto aprovado, `generatePaymentSchedule`/
// `onProjectApproved`). Distinta de `notifyPayablePaid`, que já vive no
// mesmo `approval.ts`: aquela avisa in_app quem CRIOU o payable no
// Financeiro; esta avisa por email o SUBMISSOR do projeto — públicos e
// canais diferentes, portanto não duplicam o mesmo aviso para o mesmo
// evento (decisão registrada em SESSIONS.md).
// ---------------------------------------------------------------------------

const PROJETOS_BASE_URL =
  process.env.NEXT_PUBLIC_PROJETOS_URL ?? "https://projetos.hebronaseec.com.br";

async function getEmailTemplateOverride(
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

function applyEmailVars(
  tpl: { subject: string; bodyHtml: string },
  vars: Record<string, string>,
): { subject: string; html: string } {
  const sub = (t: string) =>
    t.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? `{{${k}}}`);
  return { subject: sub(tpl.subject), html: sub(tpl.bodyHtml) };
}

export async function notifyProjectPaymentMade(
  paymentScheduleId: string,
  receiptUrl?: string,
): Promise<void> {
  const [payment] = await db
    .select({
      amount: paymentSchedules.amount,
      dueDate: paymentSchedules.dueDate,
      month: paymentSchedules.month,
      projectId: paymentSchedules.projectId,
      projectTitle: projects.title,
      submitterId: projects.submitterId,
      submitterName: users.fullName,
      submitterEmail: users.email,
    })
    .from(paymentSchedules)
    .innerJoin(projects, eq(projects.id, paymentSchedules.projectId))
    .innerJoin(users, eq(users.id, projects.submitterId))
    .where(eq(paymentSchedules.id, paymentScheduleId))
    .limit(1);

  if (!payment) return;

  // Rota real do submissor — (submissor)/[id], não /projetos/<id> (P-2.10b).
  const href = `/${payment.projectId}`;
  const url = `${PROJETOS_BASE_URL}${href}`;
  const resendApiKey = process.env.RESEND_API_KEY;
  const displayName = payment.submitterName ?? payment.submitterEmail;
  const paymentDate = payment.dueDate ? new Date(payment.dueDate) : new Date();
  const subject = `Pagamento realizado: ${payment.projectTitle}`;
  const tpl = await getEmailTemplateOverride("projetos-payment-made");
  const emailOpts = tpl
    ? applyEmailVars(tpl, {
        nome: displayName,
        titulo: payment.projectTitle,
        valor: parseFloat(payment.amount).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
        data: paymentDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        link: url,
      })
    : null;

  await createNotification({
    insert: makeNotificationInserter(),
    resendApiKey,
    data: {
      userId: payment.submitterId,
      channel: "email",
      type: "payment.made",
      title: subject,
      body: "Um pagamento do seu projeto foi processado.",
      payload: {
        module: "projetos",
        projectId: payment.projectId,
        paymentScheduleId,
        href,
      },
    },
    email: emailOpts
      ? { to: payment.submitterEmail, ...emailOpts }
      : {
          to: payment.submitterEmail,
          subject,
          template: React.createElement(PaymentConfirmationEmail, {
            recipientName: displayName,
            projectTitle: payment.projectTitle,
            amount: payment.amount,
            paymentDate,
            paymentMonth: payment.month,
            projectUrl: url,
            receiptUrl: receiptUrl ?? null,
          }),
        },
  });
}

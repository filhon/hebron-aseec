"use server";

import * as React from "react";
import { z } from "zod";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import {
  payables,
  batchApprovals,
  batchApprovalItems,
  transactions,
  notifications,
  roleAssignments,
  designations,
  users,
} from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { BatchApprovalEmail } from "@hebron/email/templates/batch-approval";
import {
  diretorWithDesignationAction,
  superAdminAction,
} from "../lib/safe-action";
import { logFinanceiroAudit } from "../lib/audit";
import { checkBudgetAlert, notifyPayablePaid } from "../lib/notifications";

const FINANCEIRO_BASE_URL =
  process.env.NEXT_PUBLIC_FINANCEIRO_URL ??
  "https://financeiro.hebronaseec.com.br";

// ---------------------------------------------------------------------------
// Shared insert helper for createNotification
// ---------------------------------------------------------------------------

const insertNotification = makeNotificationInserter();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getISOWeekBounds(date: Date): { weekStart: string; weekEnd: string } {
  const d = new Date(date);
  // ISO week: Monday = day 1
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
// createWeeklyBatch — grupos payables pendentes da semana atual em lote
// Idempotente: se já existe um lote para esta semana, retorna o existente.
// Após criar, notifica os diretores via in_app para aprovação.
// ---------------------------------------------------------------------------

const createWeeklyBatchSchema = z.object({
  weekOffset: z.number().int().min(-4).max(0).default(0),
});

export const createWeeklyBatch = superAdminAction
  .schema(createWeeklyBatchSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const referenceDate = new Date();
    referenceDate.setDate(referenceDate.getDate() + input.weekOffset * 7);
    const { weekStart, weekEnd } = getISOWeekBounds(referenceDate);

    // Check if batch already exists for this week
    const existing = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .select()
          .from(batchApprovals)
          .where(
            and(
              eq(batchApprovals.weekStart, weekStart),
              eq(batchApprovals.weekEnd, weekEnd),
            ),
          )
          .limit(1),
    );

    if (existing[0]) {
      return { batch: existing[0], isNew: false };
    }

    // Find pending payables with dueDate within the week
    const pendingPayables = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .select()
          .from(payables)
          .where(
            and(
              eq(payables.status, "pendente"),
              isNull(payables.deletedAt),
              sql`${payables.dueDate} >= ${weekStart}`,
              sql`${payables.dueDate} <= ${weekEnd}`,
            ),
          ),
    );

    if (pendingPayables.length === 0) {
      throw new Error(
        `Nenhuma conta a pagar pendente para a semana de ${weekStart} a ${weekEnd}`,
      );
    }

    // Create batch + items
    const batch = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .insert(batchApprovals)
          .values({ weekStart, weekEnd })
          .returning();
        if (!row) throw new Error("Falha ao criar lote de aprovação");

        await tx.insert(batchApprovalItems).values(
          pendingPayables.map((p) => ({
            batchApprovalId: row.id,
            payableId: p.id,
          })),
        );

        return row;
      },
    );

    // Governança dual (BRAIN §6.5, passo 2): o lote vai para o(s) diretor(es)
    // gestor (To), com o(s) autorizador(es) em cópia. Se nenhuma designation
    // "gestor" estiver configurada ainda, cai de volta para todos os
    // diretores — rede de segurança para não deixar o lote sem notificados.
    const { gestorRows, autorizadorEmails, diretorRows } =
      await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
        const gestorRows = await tx
          .select({
            userId: designations.userId,
            email: users.email,
            fullName: users.fullName,
          })
          .from(designations)
          .innerJoin(users, eq(users.id, designations.userId))
          .where(eq(designations.type, "gestor"));

        const autorizadorEmails = (
          await tx
            .select({ email: users.email })
            .from(designations)
            .innerJoin(users, eq(users.id, designations.userId))
            .where(eq(designations.type, "autorizador"))
        ).map((r) => r.email);

        const diretorRows = await tx
          .select({
            userId: roleAssignments.userId,
            email: users.email,
            fullName: users.fullName,
          })
          .from(roleAssignments)
          .innerJoin(users, eq(users.id, roleAssignments.userId))
          .where(eq(roleAssignments.role, "diretor"));

        return { gestorRows, autorizadorEmails, diretorRows };
      });

    const usingGestorRecipients = gestorRows.length > 0;
    const recipients = usingGestorRecipients ? gestorRows : diretorRows;

    const totalAmount = pendingPayables.reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0,
    );

    for (const d of recipients) {
      const displayName = d.fullName ?? d.email;
      await createNotification({
        insert: insertNotification,
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
          // CC só faz sentido quando o destinatário é de fato o gestor —
          // o fallback (todos os diretores) já inclui o(s) autorizador(es).
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
        resendApiKey: process.env.RESEND_API_KEY,
      });
    }

    await withAuthenticatedContext({ actorId: ctx.actorId }, (tx) =>
      withSystemRole(tx, (sysTx) =>
        logFinanceiroAudit(
          {
            actorId: ctx.actorId,
            action: "financeiro.batch.created",
            entity: "batch_approval",
            entityId: batch.id,
            diff: { weekStart, weekEnd, payableCount: pendingPayables.length },
          },
          sysTx,
        ),
      ),
    );

    return { batch, isNew: true, payableCount: pendingPayables.length };
  });

// ---------------------------------------------------------------------------
// approveBatch — diretor gestor approves a weekly batch (1st layer)
// All payables in the batch move from "pendente" → "aprovado".
// Notifies super_admin to proceed with authorization.
// ---------------------------------------------------------------------------

const approveBatchSchema = z.object({
  batchId: z.string().uuid("Lote inválido"),
});

export const approveBatch = diretorWithDesignationAction("gestor")
  .schema(approveBatchSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const now = new Date();

    // Governança dual (BRAIN §6.5): a mudança de status e a entrada de
    // audit são atômicas — se o audit falhar, a aprovação é revertida.
    const { payableIds, weekStart, weekEnd } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const batchRows = await tx
          .select()
          .from(batchApprovals)
          .where(eq(batchApprovals.id, input.batchId))
          .limit(1);

        const batch = batchRows[0];
        if (!batch) throw new Error("Lote de aprovação não encontrado");

        if (batch.approvedBy) {
          throw new Error("Este lote já foi aprovado");
        }

        // Update batch
        await tx
          .update(batchApprovals)
          .set({ approvedBy: ctx.actorId, approvedAt: now })
          .where(eq(batchApprovals.id, input.batchId));

        // Move all batch payables to "aprovado"
        const batchItems = await tx
          .select({ payableId: batchApprovalItems.payableId })
          .from(batchApprovalItems)
          .where(eq(batchApprovalItems.batchApprovalId, input.batchId));

        const ids = batchItems.map((i) => i.payableId);

        if (ids.length > 0) {
          await tx
            .update(payables)
            .set({
              status: "aprovado",
              approvedBy: ctx.actorId,
              approvedAt: now,
              updatedAt: now,
            })
            .where(
              and(inArray(payables.id, ids), eq(payables.status, "pendente")),
            );
        }

        await withSystemRole(tx, (sysTx) =>
          logFinanceiroAudit(
            {
              actorId: ctx.actorId,
              action: "financeiro.batch.approved",
              entity: "batch_approval",
              entityId: input.batchId,
              diff: {
                approvedAt: now.toISOString(),
                payableCount: ids.length,
              },
            },
            sysTx,
          ),
        );

        return {
          payableIds: ids,
          weekStart: batch.weekStart,
          weekEnd: batch.weekEnd,
        };
      },
    );

    // Notify super_admins for authorization — best-effort, outside the
    // governance transaction (a notification failure must not undo an
    // already-audited approval).
    const superAdminRows = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .select({ userId: roleAssignments.userId })
          .from(roleAssignments)
          .where(eq(roleAssignments.role, "super_admin")),
    );

    if (superAdminRows.length > 0) {
      // Exceção service-level (G6.3/F3-15): "notifications_insert_service"
      // (0014_grants_authenticated.sql) só concede INSERT a service_role —
      // authenticated não tem GRANT nenhum na tabela. db (superuser) é o
      // único caminho possível aqui, igual ao padrão já usado em
      // admin/actions/users.ts para o mesmo motivo.
      await db.insert(notifications).values(
        superAdminRows.map((sa) => ({
          userId: sa.userId,
          channel: "in_app" as const,
          type: "financeiro.batch.approved",
          title: `Lote aprovado — aguarda inclusão no banco`,
          body:
            `O lote da semana de ${weekStart} a ${weekEnd} foi aprovado ` +
            `e aguarda sua autorização para inclusão no banco.`,
          payload: { batchId: input.batchId, approvedBy: ctx.actorId },
        })),
      );
    }

    return { ok: true, approvedPayables: payableIds.length };
  });

// ---------------------------------------------------------------------------
// authorizeBatch — super_admin authorizes a batch (2nd layer)
// Guard: authorizedBy must differ from approvedBy (dual governance).
// Moves payables from "aprovado" → "autorizado".
// ---------------------------------------------------------------------------

const authorizeBatchSchema = z.object({
  batchId: z.string().uuid("Lote inválido"),
});

export const authorizeBatch = diretorWithDesignationAction("autorizador")
  .schema(authorizeBatchSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const now = new Date();

    // Governança dual (BRAIN §6.5): a mudança de status e a entrada de
    // audit são atômicas — se o audit falhar, a autorização é revertida.
    const payableIds = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const batchRows = await tx
          .select()
          .from(batchApprovals)
          .where(eq(batchApprovals.id, input.batchId))
          .limit(1);

        const batch = batchRows[0];
        if (!batch) throw new Error("Lote de aprovação não encontrado");

        if (!batch.approvedBy) {
          throw new Error(
            "O lote precisa ser aprovado pelo diretor antes de ser autorizado",
          );
        }

        if (batch.authorizedBy) {
          throw new Error("Este lote já foi autorizado");
        }

        // Dual governance: authorizer must differ from approver
        if (batch.approvedBy === ctx.actorId) {
          throw new Error(
            "O autorizador deve ser uma pessoa diferente do aprovador (governança dual)",
          );
        }

        // financeiro.batch_approvals_update_gestor (0011_financeiro_rls.sql)
        // só concede UPDATE a diretor com designation 'gestor' (+ super_admin)
        // — não cobre o autorizador, que é o segundo papel da governança
        // dual e nunca tem designation 'gestor'. Gate de aplicação já
        // validou acima quem pode chegar aqui (diretorWithDesignationAction
        // "autorizador" + approvedBy !== ctx.actorId); mesmo raciocínio do
        // audit log (withSystemRole) — débito de RLS registrado em
        // SESSIONS.md/PATCH-016, não corrigido aqui (fora de escopo alterar
        // policy).
        await withSystemRole(tx, (sysTx) =>
          sysTx
            .update(batchApprovals)
            .set({ authorizedBy: ctx.actorId, authorizedAt: now })
            .where(eq(batchApprovals.id, input.batchId)),
        );

        // Move all batch payables to "autorizado"
        const batchItems = await tx
          .select({ payableId: batchApprovalItems.payableId })
          .from(batchApprovalItems)
          .where(eq(batchApprovalItems.batchApprovalId, input.batchId));

        const ids = batchItems.map((i) => i.payableId);

        if (ids.length > 0) {
          await tx
            .update(payables)
            .set({
              status: "autorizado",
              authorizedBy: ctx.actorId,
              authorizedAt: now,
              updatedAt: now,
            })
            .where(
              and(inArray(payables.id, ids), eq(payables.status, "aprovado")),
            );
        }

        await withSystemRole(tx, (sysTx) =>
          logFinanceiroAudit(
            {
              actorId: ctx.actorId,
              action: "financeiro.batch.authorized",
              entity: "batch_approval",
              entityId: input.batchId,
              diff: {
                authorizedAt: now.toISOString(),
                payableCount: ids.length,
              },
            },
            sysTx,
          ),
        );

        return ids;
      },
    );

    return { ok: true, authorizedPayables: payableIds.length };
  });

// ---------------------------------------------------------------------------
// markPayableAsPaid — super_admin marks an authorized payable as paid and
// creates an immutable debit transaction in the ledger.
// ---------------------------------------------------------------------------

const markPayableAsPaidSchema = z.object({
  payableId: z.string().uuid("Conta a pagar inválida"),
  bankAccountId: z.string().uuid("Conta bancária inválida"),
  paidDate: z.coerce.date().optional(),
});

export const markPayableAsPaid = superAdminAction
  .schema(markPayableAsPaidSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    // O lançamento contábil, a mudança de status e o audit são atômicos —
    // se qualquer um falhar, nenhum pagamento fica registrado pela metade.
    const paymentTx = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (dbTx) => {
        const payableRows = await dbTx
          .select()
          .from(payables)
          .where(
            and(eq(payables.id, input.payableId), isNull(payables.deletedAt)),
          )
          .limit(1);

        const payable = payableRows[0];
        if (!payable) throw new Error("Conta a pagar não encontrada");

        if (payable.status !== "autorizado") {
          throw new Error(
            `Apenas contas com status "autorizado" podem ser marcadas como pagas. ` +
              `Status atual: "${payable.status}"`,
          );
        }

        const now = new Date();
        const paidDate = input.paidDate ?? now;
        const dateStr = paidDate.toISOString().split("T")[0] ?? "";

        // Create immutable debit transaction
        const txInserted = await dbTx
          .insert(transactions)
          .values({
            type: "debito",
            amount: payable.amount,
            description: `PGTO — ${payable.description}`,
            date: dateStr,
            accountId: input.bankAccountId,
            costCenterId: payable.costCenterId ?? null,
            categoryId: payable.categoryId ?? null,
            referenceType: "payable",
            referenceId: payable.id,
            createdBy: ctx.actorId,
          })
          .returning();

        const ledgerTx = txInserted[0];
        if (!ledgerTx) throw new Error("Falha ao criar transação de pagamento");

        // Update payable
        await dbTx
          .update(payables)
          .set({
            status: "pago",
            paidBy: ctx.actorId,
            paidAt: paidDate,
            accountId: input.bankAccountId,
            updatedAt: now,
          })
          .where(eq(payables.id, input.payableId));

        await withSystemRole(dbTx, (sysTx) =>
          logFinanceiroAudit(
            {
              actorId: ctx.actorId,
              action: "financeiro.payable.paid",
              entity: "payable",
              entityId: input.payableId,
              diff: {
                status: { from: "autorizado", to: "pago" },
                transactionId: ledgerTx.id,
                paidDate: dateStr,
                bankAccountId: input.bankAccountId,
              },
            },
            sysTx,
          ),
        );

        return { ledgerTx, costCenterId: payable.costCenterId };
      },
    );

    // Notificações (P-3.10) — best-effort, fora da transação de governança:
    // a falha de um email/in_app não deve desfazer um pagamento já auditado.
    await notifyPayablePaid(input.payableId);
    if (paymentTx.costCenterId) {
      await checkBudgetAlert({
        costCenterId: paymentTx.costCenterId,
        transactionDate: paymentTx.ledgerTx.date,
        newTransactionAmount: parseFloat(paymentTx.ledgerTx.amount),
      });
    }

    return {
      payable: { id: input.payableId, status: "pago" },
      transaction: paymentTx.ledgerTx,
    };
  });

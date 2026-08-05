"use server";

import { and, eq, isNull } from "drizzle-orm";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { approvalRequests, tasks, users } from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import {
  requestApprovalSchema,
  resolveApprovalRequestSchema,
} from "@hebron/validators/tarefas";
import { colaboradorAction, diretorAction } from "../lib/safe-action";
import { logTarefasAudit } from "../lib/audit";
import { notifyApprovalRequested } from "../lib/notifications";

const insertNotification = makeNotificationInserter();

// ---------------------------------------------------------------------------
// requestApproval — colaborador pede a um diretor/conselheiro para avançar o
// status de uma tarefa (BRAIN §6.9: diretores não têm tarefa operacional,
// só respondem pedidos de aprovação). Mutação crítica (G6.3): o audit é
// atômico com a criação do pedido.
// ---------------------------------------------------------------------------

export const requestApproval = colaboradorAction
  .schema(requestApprovalSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const request = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [task] = await tx
          .select({ id: tasks.id, title: tasks.title })
          .from(tasks)
          .where(and(eq(tasks.id, input.taskId), isNull(tasks.deletedAt)))
          .limit(1);
        if (!task) throw new Error("Tarefa não encontrada");

        // Guarda de aplicação (P-4.8c): sem ela, nada impede um segundo
        // pedido 'pendente' na mesma tarefa — depois de resolvido (aprovado/
        // rejeitado) o pedido seguinte é normal (é assim que se pede de novo
        // após uma rejeição). Sozinha, é corrida entre duas abas — o índice
        // único parcial de approval_requests_task_pending_uniq (migration
        // 0076) é a segunda camada.
        const [existingPending] = await tx
          .select({ id: approvalRequests.id })
          .from(approvalRequests)
          .where(
            and(
              eq(approvalRequests.taskId, input.taskId),
              eq(approvalRequests.status, "pendente"),
            ),
          )
          .limit(1);
        if (existingPending) {
          throw new Error(
            "Já existe um pedido de aprovação pendente para esta tarefa.",
          );
        }

        // Exceção service-level (mesmo padrão de getUsersMap em
        // apps/tarefas/src/lib/queries.ts): users_select_own/_admin não
        // cobrem colaborador lendo a linha do aprovador escolhido — só
        // confirma existência, nenhum dado de terceiro sai da action.
        const [approver] = await withSystemRole(tx, (sysTx) =>
          sysTx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, input.approverId))
            .limit(1),
        );
        if (!approver) throw new Error("Aprovador não encontrado");

        const [row] = await tx
          .insert(approvalRequests)
          .values({
            taskId: input.taskId,
            requestedStatus: input.requestedStatus,
            requestedBy: ctx.actorId,
            approverId: input.approverId,
            notes: input.notes,
          })
          .returning();
        if (!row) throw new Error("Falha ao criar pedido de aprovação");

        await withSystemRole(tx, (sysTx) =>
          logTarefasAudit(
            {
              actorId: ctx.actorId,
              action: "task.approval_requested",
              entity: "approval_request",
              entityId: row.id,
              diff: {
                taskId: input.taskId,
                requestedStatus: input.requestedStatus,
                approverId: input.approverId,
              },
            },
            sysTx,
          ),
        );

        return row;
      },
    );

    // Notificação best-effort, fora da transação de governança — falha em
    // notificar não deve desfazer um pedido já auditado. In_app + email ao
    // diretor (P-4.10).
    await notifyApprovalRequested(request.id);

    return { request };
  });

// ---------------------------------------------------------------------------
// resolveApprovalRequest — o diretor/conselheiro endereçado aprova/rejeita.
// Aprovar avança o status real da tarefa. Mutação crítica (G6.3).
// ---------------------------------------------------------------------------

export const resolveApprovalRequest = diretorAction
  .schema(resolveApprovalRequestSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const result = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [existing] = await tx
          .select()
          .from(approvalRequests)
          .where(eq(approvalRequests.id, input.approvalRequestId))
          .limit(1);
        if (!existing) throw new Error("Pedido de aprovação não encontrado");

        if (
          existing.approverId !== ctx.actorId &&
          !ctx.roles.includes("super_admin")
        ) {
          throw new Error(
            "Apenas o diretor designado pode responder este pedido",
          );
        }
        if (existing.status !== "pendente") {
          throw new Error("Este pedido já foi respondido");
        }

        const now = new Date();
        const [updated] = await tx
          .update(approvalRequests)
          .set({
            status: input.decision,
            notes: input.notes ?? existing.notes,
            resolvedAt: now,
          })
          .where(eq(approvalRequests.id, input.approvalRequestId))
          .returning();
        if (!updated) throw new Error("Falha ao atualizar pedido de aprovação");

        if (input.decision === "aprovado") {
          // tarefas.tasks_update_creator_or_assignee (0033_tarefas_rls.sql) não
          // concede UPDATE a diretor/conselheiro — só creator/assignee/
          // super_admin. Avançar o status é um efeito colateral do sistema
          // sobre um approval_request já resolvido (autorização real já
          // verificada acima: approverId === ctx.actorId), não uma edição
          // direta de tarefa por quem não é dono — mesmo raciocínio do audit
          // log (withSystemRole).
          await withSystemRole(tx, (sysTx) =>
            sysTx
              .update(tasks)
              .set({
                status: existing.requestedStatus,
                updatedAt: now,
                completedAt:
                  existing.requestedStatus === "concluido" ? now : null,
              })
              .where(eq(tasks.id, existing.taskId)),
          );
        }

        await withSystemRole(tx, (sysTx) =>
          logTarefasAudit(
            {
              actorId: ctx.actorId,
              action:
                input.decision === "aprovado"
                  ? "task.approved"
                  : "task.rejected",
              entity: "approval_request",
              entityId: updated.id,
              diff: {
                taskId: existing.taskId,
                requestedStatus: existing.requestedStatus,
                decision: input.decision,
              },
            },
            sysTx,
          ),
        );

        return {
          updated,
          taskId: existing.taskId,
          requestedBy: existing.requestedBy,
        };
      },
    );

    await createNotification({
      insert: insertNotification,
      data: {
        userId: result.requestedBy,
        channel: "in_app",
        type: `task.${input.decision}`,
        title:
          input.decision === "aprovado"
            ? "Pedido de aprovação aprovado"
            : "Pedido de aprovação rejeitado",
        body: input.notes ?? undefined,
        payload: {
          taskId: result.taskId,
          approvalRequestId: result.updated.id,
        },
      },
    });

    return { request: result.updated };
  });

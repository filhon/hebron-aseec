"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
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
    const [task] = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(and(eq(tasks.id, input.taskId), isNull(tasks.deletedAt)))
      .limit(1);
    if (!task) throw new Error("Tarefa não encontrada");

    const [approver] = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, input.approverId))
      .limit(1);
    if (!approver) throw new Error("Aprovador não encontrado");

    const request = await db.transaction(async (tx) => {
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

      await logTarefasAudit(
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
        tx,
      );

      return row;
    });

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
    const result = await db.transaction(async (tx) => {
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
        await tx
          .update(tasks)
          .set({
            status: existing.requestedStatus,
            updatedAt: now,
            completedAt: existing.requestedStatus === "concluido" ? now : null,
          })
          .where(eq(tasks.id, existing.taskId));
      }

      await logTarefasAudit(
        {
          actorId: ctx.actorId,
          action:
            input.decision === "aprovado" ? "task.approved" : "task.rejected",
          entity: "approval_request",
          entityId: updated.id,
          diff: {
            taskId: existing.taskId,
            requestedStatus: existing.requestedStatus,
            decision: input.decision,
          },
        },
        tx,
      );

      return {
        updated,
        taskId: existing.taskId,
        requestedBy: existing.requestedBy,
      };
    });

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

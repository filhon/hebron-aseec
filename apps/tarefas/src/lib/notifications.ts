import * as React from "react";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { TaskAssignedEmail } from "@hebron/email/templates/task-assigned";
import { ApprovalRequestEmail } from "@hebron/email/templates/approval-request";
import { approvalRequests, tasks, users, workspaces } from "@hebron/db/schema";
import type {
  TaskPriority,
  TaskStatus,
  Workspace,
} from "@hebron/types/tarefas";

// ---------------------------------------------------------------------------
// Rótulos — mesmos mapas usados nos componentes de UI (task-form.tsx,
// approval-request-form.tsx), duplicados aqui porque este arquivo não pode
// importar de componentes client-only.
// ---------------------------------------------------------------------------

const WORKSPACE_LABEL: Record<Workspace, string> = {
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  contabil_fiscal: "Contábil e Fiscal",
  eclesiastico: "Eclesiástico",
  comunicacao: "Comunicação",
  tecnologia_inovacao: "Tecnologia e Inovação",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  a_fazer: "A Fazer",
  em_progresso: "Em Progresso",
  em_revisao: "Em Revisão",
  concluido: "Concluído",
};

const TAREFAS_BASE_URL =
  process.env.NEXT_PUBLIC_TAREFAS_URL ?? "https://tarefas.hebronaseec.com.br";

const makeInsert = makeNotificationInserter;

function taskUrl(taskId: string): string {
  return `${TAREFAS_BASE_URL}/tarefa/${taskId}`;
}

// ---------------------------------------------------------------------------
// notifyTaskAssigned — in_app + email para cada novo responsável (BRAIN §6.9:
// diretores não recebem tarefa operacional, então esta notificação é só para
// quem de fato entra em `assignees`). Quem se autoatribui não é notificado.
// ---------------------------------------------------------------------------

export async function notifyTaskAssigned(
  taskId: string,
  assigneeIds: string[],
  assignedByUserId: string,
): Promise<void> {
  if (assigneeIds.length === 0) return;

  const [task] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      workspaceId: tasks.workspaceId,
    })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);
  if (!task) return;

  const [workspace] = await db
    .select({ slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, task.workspaceId))
    .limit(1);
  const workspaceLabel = workspace ? WORKSPACE_LABEL[workspace.slug] : "—";

  const recipientIds = assigneeIds.filter((id) => id !== assignedByUserId);
  if (recipientIds.length === 0) return;

  const recipients = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(inArray(users.id, recipientIds));

  const [assignedBy] = await db
    .select({ fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, assignedByUserId))
    .limit(1);
  const assignedByName = assignedBy
    ? (assignedBy.fullName ?? assignedBy.email)
    : null;

  const url = taskUrl(task.id);
  const resendApiKey = process.env.RESEND_API_KEY;
  const priorityLabel = PRIORITY_LABEL[task.priority];
  const title = `Você foi atribuído à tarefa "${task.title}"`;
  const body = assignedByName ? `Atribuído por ${assignedByName}` : undefined;

  await Promise.allSettled(
    recipients.flatMap((recipient) => [
      createNotification({
        insert: makeInsert(),
        data: {
          userId: recipient.id,
          channel: "in_app",
          type: "task.assigned",
          title,
          body,
          payload: {
            module: "tarefas",
            taskId: task.id,
            href: `/tarefa/${task.id}`,
          },
        },
      }),
      createNotification({
        insert: makeInsert(),
        resendApiKey,
        data: {
          userId: recipient.id,
          channel: "email",
          type: "task.assigned",
          title,
          body,
          payload: {
            module: "tarefas",
            taskId: task.id,
            href: `/tarefa/${task.id}`,
          },
        },
        email: {
          to: recipient.email,
          subject: title,
          template: React.createElement(TaskAssignedEmail, {
            recipientName: recipient.fullName ?? recipient.email,
            taskTitle: task.title,
            workspaceLabel,
            priorityLabel,
            dueDate: task.dueDate,
            assignedByName,
            taskUrl: url,
          }),
        },
      }),
    ]),
  );
}

// ---------------------------------------------------------------------------
// notifyApprovalRequested — in_app + email ao diretor/conselheiro designado
// (BRAIN §6.9). Notificação best-effort: chamada fora da transação de
// governança em approvals.ts, falha aqui não desfaz o pedido já auditado.
// ---------------------------------------------------------------------------

export async function notifyApprovalRequested(
  approvalRequestId: string,
): Promise<void> {
  const [request] = await db
    .select({
      id: approvalRequests.id,
      taskId: approvalRequests.taskId,
      requestedStatus: approvalRequests.requestedStatus,
      notes: approvalRequests.notes,
      approverId: approvalRequests.approverId,
      requestedBy: approvalRequests.requestedBy,
    })
    .from(approvalRequests)
    .where(eq(approvalRequests.id, approvalRequestId))
    .limit(1);
  if (!request) return;

  const [task] = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(eq(tasks.id, request.taskId))
    .limit(1);
  if (!task) return;

  const [approver] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, request.approverId))
    .limit(1);
  if (!approver) return;

  const [requester] = await db
    .select({ fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, request.requestedBy))
    .limit(1);
  const requesterName =
    requester?.fullName ?? requester?.email ?? "Um colaborador";

  const url = taskUrl(request.taskId);
  const resendApiKey = process.env.RESEND_API_KEY;
  const requestedStatusLabel = STATUS_LABEL[request.requestedStatus];
  const title = `Pedido de aprovação: ${task.title}`;
  const body = `Avançar para "${requestedStatusLabel}"`;

  await Promise.allSettled([
    createNotification({
      insert: makeInsert(),
      data: {
        userId: approver.id,
        channel: "in_app",
        type: "task.approval_requested",
        title,
        body,
        payload: {
          module: "tarefas",
          taskId: request.taskId,
          approvalRequestId: request.id,
        },
      },
    }),
    createNotification({
      insert: makeInsert(),
      resendApiKey,
      data: {
        userId: approver.id,
        channel: "email",
        type: "task.approval_requested",
        title,
        body,
        payload: {
          module: "tarefas",
          taskId: request.taskId,
          approvalRequestId: request.id,
        },
      },
      email: {
        to: approver.email,
        subject: title,
        template: React.createElement(ApprovalRequestEmail, {
          recipientName: approver.fullName ?? approver.email,
          taskTitle: task.title,
          requestedByName: requesterName,
          requestedStatusLabel,
          notes: request.notes,
          taskUrl: url,
        }),
      },
    }),
  ]);
}

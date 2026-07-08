import { and, eq, gte, isNull, lte, ne } from "drizzle-orm";
import * as React from "react";
import { db } from "@hebron/db/client";
import { assignees, tasks, users, workspaces } from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { TaskOverdueEmail } from "@hebron/email/templates/task-overdue";
import { inngest } from "../client";

const TAREFAS_BASE_URL =
  process.env.NEXT_PUBLIC_TAREFAS_URL ?? "https://tarefas.hebronaseec.com.br";

const makeInsert = makeNotificationInserter;

// Duplicado deliberadamente de apps/tarefas/src/components/task-form.tsx —
// jobs nunca importa código de apps (G6.5 do CLAUDE.md).
const WORKSPACE_LABEL: Record<string, string> = {
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  contabil_fiscal: "Contábil e Fiscal",
  eclesiastico: "Eclesiástico",
  comunicacao: "Comunicação",
  tecnologia_inovacao: "Tecnologia e Inovação",
};

function dayWindow(daysFromNow: number): { start: Date; end: Date } {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + daysFromNow);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

interface DueTaskRow {
  id: string;
  title: string;
  dueDate: Date | null;
  createdBy: string;
  workspaceSlug: string;
}

async function findTasksDueInWindow(
  start: Date,
  end: Date,
): Promise<DueTaskRow[]> {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      createdBy: tasks.createdBy,
      workspaceSlug: workspaces.slug,
    })
    .from(tasks)
    .innerJoin(workspaces, eq(workspaces.id, tasks.workspaceId))
    .where(
      and(
        isNull(tasks.deletedAt),
        ne(tasks.status, "concluido"),
        gte(tasks.dueDate, start),
        lte(tasks.dueDate, end),
      ),
    );
}

type Recipient = { id: string; fullName: string | null; email: string };

/** Responsáveis da tarefa (assignees); sem responsável, cai para quem criou. */
async function resolveRecipients(
  taskId: string,
  createdBy: string,
): Promise<Recipient[]> {
  const assigneeRows = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(assignees)
    .innerJoin(users, eq(users.id, assignees.userId))
    .where(eq(assignees.taskId, taskId));

  if (assigneeRows.length > 0) return assigneeRows;

  const [creator] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, createdBy))
    .limit(1);
  return creator ? [creator] : [];
}

// ---------------------------------------------------------------------------
// runTarefasPrazos — prazo próximo (1 dia antes do vencimento, in_app) e
// prazo vencido (venceu ontem, in_app + email). Idempotência: sem coluna de
// "já lembrado", cada janela é de ~24h (mesmo padrão de
// runEditalClosingReminders em crons/documentos.ts) — no máximo 1 lembrete
// por tarefa por dia.
// ---------------------------------------------------------------------------

export async function runTarefasPrazos(): Promise<{
  dueSoon: number;
  overdue: number;
}> {
  const dueSoonWindow = dayWindow(1);
  const overdueWindow = dayWindow(-1);

  const dueSoonTasks = await findTasksDueInWindow(
    dueSoonWindow.start,
    dueSoonWindow.end,
  );
  for (const task of dueSoonTasks) {
    const recipients = await resolveRecipients(task.id, task.createdBy);
    for (const recipient of recipients) {
      await createNotification({
        insert: makeInsert(),
        data: {
          userId: recipient.id,
          channel: "in_app",
          type: "task.due_soon",
          title: `Prazo próximo: "${task.title}" vence amanhã`,
          payload: { taskId: task.id, href: `/tarefa/${task.id}` },
        },
      });
    }
  }

  const overdueTasks = await findTasksDueInWindow(
    overdueWindow.start,
    overdueWindow.end,
  );
  const resendApiKey = process.env.RESEND_API_KEY;
  for (const task of overdueTasks) {
    const recipients = await resolveRecipients(task.id, task.createdBy);
    const workspaceLabel =
      WORKSPACE_LABEL[task.workspaceSlug] ?? task.workspaceSlug;
    const dueDate = task.dueDate ?? overdueWindow.start;
    const url = `${TAREFAS_BASE_URL}/tarefa/${task.id}`;
    const title = `Tarefa em atraso: "${task.title}"`;

    await Promise.allSettled(
      recipients.flatMap((recipient) => [
        createNotification({
          insert: makeInsert(),
          data: {
            userId: recipient.id,
            channel: "in_app",
            type: "task.overdue",
            title,
            payload: { taskId: task.id, href: `/tarefa/${task.id}` },
          },
        }),
        createNotification({
          insert: makeInsert(),
          resendApiKey,
          data: {
            userId: recipient.id,
            channel: "email",
            type: "task.overdue",
            title,
            payload: { taskId: task.id, href: `/tarefa/${task.id}` },
          },
          email: {
            to: recipient.email,
            subject: title,
            template: React.createElement(TaskOverdueEmail, {
              recipientName: recipient.fullName ?? recipient.email,
              taskTitle: task.title,
              workspaceLabel,
              dueDate,
              taskUrl: url,
            }),
          },
        }),
      ]),
    );
  }

  return { dueSoon: dueSoonTasks.length, overdue: overdueTasks.length };
}

export const tarefasPrazosCron = inngest.createFunction(
  { id: "tarefas-prazos", name: "Tarefas: prazo próximo e prazo vencido" },
  { cron: "0 7 * * *" },
  async ({ step }) => step.run("run-tarefas-prazos", runTarefasPrazos),
);

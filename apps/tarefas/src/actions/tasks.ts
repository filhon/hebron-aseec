"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createSupabaseServerActionClient } from "@hebron/auth/server";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import type { AuthenticatedTx } from "@hebron/db/authenticated";
import {
  tasks,
  assignees,
  taskTags,
  subtasks,
  workspaces,
  taskEvents,
  taskAttachments,
  comments,
} from "@hebron/db/schema";
import {
  createTaskSchema,
  updateTaskStatusSchema,
  createSubtaskSchema,
  toggleSubtaskSchema,
  createAttachmentSchema,
  taskPriorityEnum,
} from "@hebron/validators/tarefas";
import {
  colaboradorAction,
  staffAction,
  superAdminAction,
} from "../lib/safe-action";
import { notifyTaskAssigned } from "../lib/notifications";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Espelha tarefas.can_manage_task (0033_tarefas_rls.sql) para dar um erro
 * amigável antes de a RLS simplesmente devolver 0 linhas atualizadas. */
async function canManageTask(
  tx: AuthenticatedTx,
  taskId: string,
  actorId: string,
): Promise<boolean> {
  const [task] = await tx
    .select({ id: tasks.id, createdBy: tasks.createdBy })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);
  if (!task) return false;
  if (task.createdBy === actorId) return true;
  const [assignee] = await tx
    .select({ id: assignees.id })
    .from(assignees)
    .where(and(eq(assignees.taskId, taskId), eq(assignees.userId, actorId)))
    .limit(1);
  return !!assignee;
}

async function logTaskEvent(
  params: {
    taskId: string;
    actorId: string;
    eventType: string;
    diff?: Record<string, unknown>;
  },
  tx: AuthenticatedTx,
): Promise<void> {
  await tx.insert(taskEvents).values({
    taskId: params.taskId,
    actorId: params.actorId,
    eventType: params.eventType,
    diff: params.diff ?? null,
  });
}

async function resolveCommentTaskId(
  tx: AuthenticatedTx,
  commentId: string,
): Promise<string | null> {
  const [row] = await tx
    .select({ taskId: comments.taskId })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  return row?.taskId ?? null;
}

// ---------------------------------------------------------------------------
// createTask
// ---------------------------------------------------------------------------
// Suposição registrada em SESSIONS.md: createTaskSchema.recurrenceRule não é
// persistido aqui — o schema de banco (P-4.6) modela recorrência presa a um
// task_template (tarefas.recurrence_rules.task_template_id NOT NULL), não a
// uma tarefa avulsa. Recorrência real passa por createRecurrenceRule
// (recurrence.ts), amarrada a um template criado via templates.ts.

export const createTask = colaboradorAction
  .schema(createTaskSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const task = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [ws] = await tx
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.slug, input.workspace))
          .limit(1);
        if (!ws) throw new Error("Módulo inválido");

        const [row] = await tx
          .insert(tasks)
          .values({
            title: input.title,
            description: input.description,
            workspaceId: ws.id,
            priority: input.priority,
            dueDate: input.dueDate,
            source: "manual",
            createdBy: ctx.actorId,
          })
          .returning();
        if (!row) throw new Error("Falha ao criar tarefa");

        if (input.assigneeIds.length > 0) {
          await tx
            .insert(assignees)
            .values(
              input.assigneeIds.map((userId) => ({ taskId: row.id, userId })),
            );
        }
        if (input.tagIds.length > 0) {
          await tx
            .insert(taskTags)
            .values(input.tagIds.map((tagId) => ({ taskId: row.id, tagId })));
        }

        await logTaskEvent(
          { taskId: row.id, actorId: ctx.actorId, eventType: "created" },
          tx,
        );

        return row;
      },
    );

    // Notificação best-effort, fora da transação — falha em notificar não
    // deve desfazer a tarefa já criada (P-4.10).
    if (input.assigneeIds.length > 0) {
      await notifyTaskAssigned(task.id, input.assigneeIds, ctx.actorId);
    }

    return { task };
  });

// ---------------------------------------------------------------------------
// updateTask — edição geral (não inclui mudança de status/coluna, ver
// updateTaskStatus abaixo).
// ---------------------------------------------------------------------------

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  priority: taskPriorityEnum.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const updateTask = colaboradorAction
  .schema(updateTaskSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.dueDate !== undefined) patch.dueDate = input.dueDate;

    let newAssigneeIds: string[] = [];

    const task = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        if (
          !ctx.roles.includes("super_admin") &&
          !(await canManageTask(tx, input.taskId, ctx.actorId))
        ) {
          throw new Error(
            "Você só pode editar tarefas que criou ou das quais é responsável",
          );
        }

        const [row] = await tx
          .update(tasks)
          .set(patch)
          .where(eq(tasks.id, input.taskId))
          .returning();
        if (!row) throw new Error("Tarefa não encontrada");

        if (input.assigneeIds !== undefined) {
          const previousAssignees = await tx
            .select({ userId: assignees.userId })
            .from(assignees)
            .where(eq(assignees.taskId, input.taskId));
          const previousIds = new Set(previousAssignees.map((a) => a.userId));
          newAssigneeIds = input.assigneeIds.filter(
            (userId) => !previousIds.has(userId),
          );

          await tx.delete(assignees).where(eq(assignees.taskId, input.taskId));
          if (input.assigneeIds.length > 0) {
            await tx.insert(assignees).values(
              input.assigneeIds.map((userId) => ({
                taskId: input.taskId,
                userId,
              })),
            );
          }
        }
        if (input.tagIds !== undefined) {
          await tx.delete(taskTags).where(eq(taskTags.taskId, input.taskId));
          if (input.tagIds.length > 0) {
            await tx
              .insert(taskTags)
              .values(
                input.tagIds.map((tagId) => ({ taskId: input.taskId, tagId })),
              );
          }
        }

        await logTaskEvent(
          {
            taskId: input.taskId,
            actorId: ctx.actorId,
            eventType: "updated",
            diff: patch,
          },
          tx,
        );

        return row;
      },
    );

    // Notificação best-effort, só para responsáveis novos (evita renotificar
    // a cada edição quem já era responsável) — P-4.10.
    if (newAssigneeIds.length > 0) {
      await notifyTaskAssigned(task.id, newAssigneeIds, ctx.actorId);
    }

    return { task };
  });

// ---------------------------------------------------------------------------
// updateTaskStatus — mover entre colunas do Kanban (drag-drop).
// ---------------------------------------------------------------------------

export const updateTaskStatus = colaboradorAction
  .schema(updateTaskStatusSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const now = new Date();
    const task = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        if (
          !ctx.roles.includes("super_admin") &&
          !(await canManageTask(tx, input.taskId, ctx.actorId))
        ) {
          throw new Error(
            "Você só pode mover tarefas que criou ou das quais é responsável",
          );
        }

        const [row] = await tx
          .update(tasks)
          .set({
            status: input.status,
            updatedAt: now,
            completedAt: input.status === "concluido" ? now : null,
          })
          .where(eq(tasks.id, input.taskId))
          .returning();
        if (!row) throw new Error("Tarefa não encontrada");

        await logTaskEvent(
          {
            taskId: input.taskId,
            actorId: ctx.actorId,
            eventType: "status_changed",
            diff: { status: input.status },
          },
          tx,
        );

        return row;
      },
    );

    return { task };
  });

// ---------------------------------------------------------------------------
// deleteTask — soft-delete (nunca hard delete, BRAIN — imutabilidade).
// ---------------------------------------------------------------------------

const deleteTaskSchema = z.object({ taskId: z.string().uuid() });

export const deleteTask = colaboradorAction
  .schema(deleteTaskSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const task = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        if (
          !ctx.roles.includes("super_admin") &&
          !(await canManageTask(tx, input.taskId, ctx.actorId))
        ) {
          throw new Error(
            "Você só pode remover tarefas que criou ou das quais é responsável",
          );
        }

        const [row] = await tx
          .update(tasks)
          .set({ deletedAt: new Date() })
          .where(eq(tasks.id, input.taskId))
          .returning();
        if (!row) throw new Error("Tarefa não encontrada");

        await logTaskEvent(
          { taskId: input.taskId, actorId: ctx.actorId, eventType: "deleted" },
          tx,
        );

        return row;
      },
    );

    return { task };
  });

// ---------------------------------------------------------------------------
// assignTaskManually — fecha o ciclo de createAutoTask (BRAIN §6.9: tarefas
// automáticas nascem sem responsável; super_admin atribui manualmente).
// ---------------------------------------------------------------------------

const assignTaskManuallySchema = z.object({
  taskId: z.string().uuid(),
  assigneeIds: z
    .array(z.string().uuid())
    .min(1, "Selecione ao menos um responsável"),
});

export const assignTaskManually = superAdminAction
  .schema(assignTaskManuallySchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const task = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        await tx
          .insert(assignees)
          .values(
            input.assigneeIds.map((userId) => ({
              taskId: input.taskId,
              userId,
            })),
          )
          .onConflictDoNothing();

        const [row] = await tx
          .update(tasks)
          .set({ needsManualAssignment: false, updatedAt: new Date() })
          .where(eq(tasks.id, input.taskId))
          .returning();
        if (!row) throw new Error("Tarefa não encontrada");

        await logTaskEvent(
          {
            taskId: input.taskId,
            actorId: ctx.actorId,
            eventType: "assigned_manually",
            diff: { assigneeIds: input.assigneeIds },
          },
          tx,
        );

        return row;
      },
    );

    // Notificação best-effort — fecha o ciclo de createAutoTask (P-4.10).
    await notifyTaskAssigned(input.taskId, input.assigneeIds, ctx.actorId);

    return { task };
  });

// ---------------------------------------------------------------------------
// createSubtask / toggleSubtask — progresso agregado é derivado em leitura
// (contagem de subtasks.completed), não armazenado nesta camada de mutação.
// ---------------------------------------------------------------------------

export const createSubtask = colaboradorAction
  .schema(createSubtaskSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const subtask = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        if (
          !ctx.roles.includes("super_admin") &&
          !(await canManageTask(tx, input.taskId, ctx.actorId))
        ) {
          throw new Error(
            "Você só pode adicionar subtarefas em tarefas que criou ou das quais é responsável",
          );
        }

        const [countRow] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(subtasks)
          .where(eq(subtasks.taskId, input.taskId));

        const [row] = await tx
          .insert(subtasks)
          .values({
            taskId: input.taskId,
            title: input.title,
            assigneeId: input.assigneeId,
            order: countRow?.count ?? 0,
          })
          .returning();
        if (!row) throw new Error("Falha ao criar subtarefa");

        await logTaskEvent(
          {
            taskId: input.taskId,
            actorId: ctx.actorId,
            eventType: "subtask_created",
            diff: { title: input.title },
          },
          tx,
        );

        return row;
      },
    );

    return { subtask };
  });

export const toggleSubtask = colaboradorAction
  .schema(toggleSubtaskSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const subtask = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [existing] = await tx
          .select({ taskId: subtasks.taskId })
          .from(subtasks)
          .where(eq(subtasks.id, input.subtaskId))
          .limit(1);
        if (!existing) throw new Error("Subtarefa não encontrada");

        if (
          !ctx.roles.includes("super_admin") &&
          !(await canManageTask(tx, existing.taskId, ctx.actorId))
        ) {
          throw new Error(
            "Você só pode atualizar subtarefas de tarefas que criou ou das quais é responsável",
          );
        }

        const [row] = await tx
          .update(subtasks)
          .set({
            completed: input.isDone,
            completedAt: input.isDone ? new Date() : null,
          })
          .where(eq(subtasks.id, input.subtaskId))
          .returning();
        if (!row) throw new Error("Falha ao atualizar subtarefa");

        await logTaskEvent(
          {
            taskId: existing.taskId,
            actorId: ctx.actorId,
            eventType: "subtask_toggled",
            diff: { subtaskId: input.subtaskId, isDone: input.isDone },
          },
          tx,
        );

        return row;
      },
    );

    return { subtask };
  });

// ---------------------------------------------------------------------------
// createAttachment — gera URL de upload assinada (client faz o PUT direto ao
// Storage) e registra o anexo. Usa o client de sessão (@hebron/auth/server,
// G6.1) em vez de service_role — o bucket `tarefas-anexos` (migration
// 0034_tarefas_storage.sql) tem policy de INSERT para `authenticated` na
// própria pasta do usuário, mesmo padrão de `project-attachments` (0020).
// ---------------------------------------------------------------------------

export const createAttachment = staffAction
  .schema(createAttachmentSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    // Leitura de checagem (existência/visibilidade da tarefa-alvo) roda numa
    // transação autenticada própria, separada da chamada de Storage (I/O
    // externo, não pode viver dentro de uma transação SQL) e da transação de
    // escrita abaixo.
    const taskId = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const resolvedTaskId =
          input.parentType === "task"
            ? input.parentId
            : await resolveCommentTaskId(tx, input.parentId);
        if (!resolvedTaskId) throw new Error("Referência inválida para anexo");

        const [task] = await tx
          .select({ id: tasks.id })
          .from(tasks)
          .where(and(eq(tasks.id, resolvedTaskId), isNull(tasks.deletedAt)))
          .limit(1);
        if (!task) throw new Error("Tarefa não encontrada");

        return resolvedTaskId;
      },
    );

    const ext = input.fileName.split(".").pop() ?? "bin";
    const storageKey = `${ctx.actorId}/${crypto.randomUUID()}.${ext}`;

    const cookieStore = await cookies();
    const supabase = createSupabaseServerActionClient({
      getAll: () => cookieStore.getAll(),
    });
    const { data, error } = await supabase.storage
      .from("tarefas-anexos")
      .createSignedUploadUrl(storageKey);
    if (error)
      throw new Error(`Falha ao gerar URL de upload: ${error.message}`);

    const attachment = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .insert(taskAttachments)
          .values({
            parentType: input.parentType,
            parentId: input.parentId,
            storageKey,
            fileName: input.fileName,
            fileSizeBytes: input.fileSizeBytes,
            mimeType: input.mimeType,
            uploadedBy: ctx.actorId,
          })
          .returning();
        if (!row) throw new Error("Falha ao registrar anexo");

        await logTaskEvent(
          {
            taskId,
            actorId: ctx.actorId,
            eventType: "attachment_added",
            diff: { fileName: input.fileName },
          },
          tx,
        );

        return row;
      },
    );

    return { attachment, uploadUrl: data.signedUrl };
  });

"use server";

import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  taskTemplates,
  templateItems,
  tasks,
  subtasks,
  workspaces,
} from "@hebron/db/schema";
import {
  createTaskTemplateSchema,
  updateTaskTemplateSchema,
  toggleTaskTemplateSchema,
} from "@hebron/validators/tarefas";
import type { Workspace } from "@hebron/types/tarefas";
import { colaboradorAction } from "../lib/safe-action";

async function resolveWorkspaceId(slug: Workspace): Promise<string> {
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!ws) throw new Error("Módulo inválido");
  return ws.id;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// ---------------------------------------------------------------------------
// createTaskTemplate — template configurável (BRAIN §6.9), com suas tarefas
// pré-definidas (template_items).
// ---------------------------------------------------------------------------

export const createTaskTemplate = colaboradorAction
  .schema(createTaskTemplateSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const workspaceId = await resolveWorkspaceId(input.workspace);

    const template = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .insert(taskTemplates)
          .values({
            name: input.name,
            description: input.description,
            workspaceId,
            triggerSourceModule: input.trigger?.sourceModule ?? null,
            triggerEvent: input.trigger?.event ?? null,
            createdBy: ctx.actorId,
          })
          .returning();
        if (!row) throw new Error("Falha ao criar template");

        await tx.insert(templateItems).values(
          input.tasks.map((item, index) => ({
            taskTemplateId: row.id,
            title: item.title,
            description: item.description,
            priority: item.priority,
            dueOffsetDays: item.dueOffsetDays,
            subtasks: item.subtasks,
            order: index,
          })),
        );

        return row;
      },
    );

    return { template };
  });

// ---------------------------------------------------------------------------
// updateTaskTemplate — edita o template e substitui seus template_items por
// completo (P-4.9b). Mesmo gate de papel de createTaskTemplate.
// ---------------------------------------------------------------------------

export const updateTaskTemplate = colaboradorAction
  .schema(updateTaskTemplateSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const workspaceId = await resolveWorkspaceId(input.workspace);

    const template = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .update(taskTemplates)
          .set({
            name: input.name,
            description: input.description,
            workspaceId,
            triggerSourceModule: input.trigger?.sourceModule ?? null,
            triggerEvent: input.trigger?.event ?? null,
            updatedAt: new Date(),
          })
          .where(eq(taskTemplates.id, input.templateId))
          .returning();
        if (!row) throw new Error("Template não encontrado");

        // Substitui a lista de tarefas pré-definidas por completo — a UI
        // envia o conjunto final, não um diff.
        await tx
          .delete(templateItems)
          .where(eq(templateItems.taskTemplateId, input.templateId));
        await tx.insert(templateItems).values(
          input.tasks.map((item, index) => ({
            taskTemplateId: input.templateId,
            title: item.title,
            description: item.description,
            priority: item.priority,
            dueOffsetDays: item.dueOffsetDays,
            subtasks: item.subtasks,
            order: index,
          })),
        );

        return row;
      },
    );

    return { template };
  });

// ---------------------------------------------------------------------------
// toggleTaskTemplate — ativa/desativa. Template inativo não instancia
// (guard em instantiateTaskTemplate).
// ---------------------------------------------------------------------------

export const toggleTaskTemplate = colaboradorAction
  .schema(toggleTaskTemplateSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const template = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .update(taskTemplates)
          .set({ isActive: input.isActive, updatedAt: new Date() })
          .where(eq(taskTemplates.id, input.templateId))
          .returning();
        if (!row) throw new Error("Template não encontrado");
        return row;
      },
    );

    return { template };
  });

// ---------------------------------------------------------------------------
// instantiateTaskTemplate — cria todas as tarefas filhas de um template
// (uma tarefa por template_item, com subtarefas pré-definidas).
// ---------------------------------------------------------------------------

const instantiateTaskTemplateSchema = z.object({
  templateId: z.string().uuid(),
});

export const instantiateTaskTemplate = colaboradorAction
  .schema(instantiateTaskTemplateSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const [template] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, input.templateId))
      .limit(1);
    if (!template) throw new Error("Template não encontrado");
    if (!template.isActive) throw new Error("Template está inativo");

    const items = await db
      .select()
      .from(templateItems)
      .where(eq(templateItems.taskTemplateId, template.id))
      .orderBy(asc(templateItems.order));
    if (items.length === 0) {
      throw new Error("Template não possui tarefas definidas");
    }

    const createdTaskIds = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const ids: string[] = [];
        for (const item of items) {
          const dueDate =
            item.dueOffsetDays !== null
              ? addDays(new Date(), item.dueOffsetDays)
              : null;

          const [task] = await tx
            .insert(tasks)
            .values({
              title: item.title,
              description: item.description,
              workspaceId: template.workspaceId,
              priority: item.priority,
              dueDate,
              source: "manual",
              createdBy: ctx.actorId,
            })
            .returning();
          if (!task) continue;
          ids.push(task.id);

          if (item.subtasks.length > 0) {
            await tx.insert(subtasks).values(
              item.subtasks.map((title, index) => ({
                taskId: task.id,
                title,
                order: index,
              })),
            );
          }
        }
        return ids;
      },
    );

    return { taskIds: createdTaskIds };
  });

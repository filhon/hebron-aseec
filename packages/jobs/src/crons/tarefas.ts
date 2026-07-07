import { and, asc, eq, gte, lte, or, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  recurrenceRules,
  taskTemplates,
  templateItems,
  tasks,
  subtasks,
} from "@hebron/db/schema";
import { inngest } from "../client";

// ---------------------------------------------------------------------------
// computeNextRun — duplicado deliberadamente de
// apps/tarefas/src/actions/recurrence.ts::computeNextRun (jobs nunca importa
// de um app, G6.5 do CLAUDE.md) — mesma lógica, mesma limitação documentada
// lá (overflow de dia em meses curtos não é tratado).
// ---------------------------------------------------------------------------

interface RulePattern {
  type: "diaria" | "semanal" | "mensal" | "anual";
  interval: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
}

function computeNextRun(rule: RulePattern, from: Date): Date {
  const next = new Date(from);
  switch (rule.type) {
    case "diaria":
      next.setUTCDate(next.getUTCDate() + rule.interval);
      break;
    case "semanal": {
      const target = rule.dayOfWeek ?? next.getUTCDay();
      next.setUTCDate(next.getUTCDate() + 1);
      while (next.getUTCDay() !== target)
        next.setUTCDate(next.getUTCDate() + 1);
      next.setUTCDate(next.getUTCDate() + (rule.interval - 1) * 7);
      break;
    }
    case "mensal":
      next.setUTCMonth(next.getUTCMonth() + rule.interval);
      if (rule.dayOfMonth) next.setUTCDate(rule.dayOfMonth);
      break;
    case "anual":
      next.setUTCFullYear(next.getUTCFullYear() + rule.interval);
      if (rule.dayOfMonth) next.setUTCDate(rule.dayOfMonth);
      break;
  }
  return next;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// ---------------------------------------------------------------------------
// instantiateTemplate — mesma lógica de
// apps/tarefas/src/actions/templates.ts::instantiateTaskTemplate, duplicada
// pela mesma razão acima. createdBy é o dono do template (quem configurou a
// recorrência), não um ator sistema — a tarefa gerada é dele.
// ---------------------------------------------------------------------------

async function instantiateTemplate(
  templateId: string,
  workspaceId: string,
  createdBy: string,
): Promise<string[]> {
  const items = await db
    .select()
    .from(templateItems)
    .where(eq(templateItems.taskTemplateId, templateId))
    .orderBy(asc(templateItems.order));

  const createdTaskIds: string[] = [];
  for (const item of items) {
    const dueDate =
      item.dueOffsetDays !== null
        ? addDays(new Date(), item.dueOffsetDays)
        : null;

    const [task] = await db
      .insert(tasks)
      .values({
        title: item.title,
        description: item.description,
        workspaceId,
        priority: item.priority,
        dueDate,
        source: "manual",
        createdBy,
        recurrenceParentId: templateId,
      })
      .returning();
    if (!task) continue;
    createdTaskIds.push(task.id);

    if (item.subtasks.length > 0) {
      await db.insert(subtasks).values(
        item.subtasks.map((title, index) => ({
          taskId: task.id,
          title,
          order: index,
        })),
      );
    }
  }
  return createdTaskIds;
}

// ---------------------------------------------------------------------------
// runTarefasRecurrence — lê recurrence_rules com next_run_at vencido,
// instancia o template correspondente e agenda a próxima execução. Regras
// com end_date já vencido são puladas (não avançam mais).
// ---------------------------------------------------------------------------

export async function runTarefasRecurrence(): Promise<{ created: number }> {
  const now = new Date();

  const dueRules = await db
    .select()
    .from(recurrenceRules)
    .where(
      and(
        lte(recurrenceRules.nextRunAt, now),
        or(isNull(recurrenceRules.endDate), gte(recurrenceRules.endDate, now)),
      ),
    );

  let created = 0;

  for (const rule of dueRules) {
    const [template] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, rule.taskTemplateId))
      .limit(1);

    if (template?.isActive) {
      const ids = await instantiateTemplate(
        rule.taskTemplateId,
        template.workspaceId,
        template.createdBy,
      );
      created += ids.length;
    }

    const nextRunAt = computeNextRun(rule, rule.nextRunAt ?? now);
    await db
      .update(recurrenceRules)
      .set({ nextRunAt })
      .where(eq(recurrenceRules.id, rule.id));
  }

  return { created };
}

export const tarefasRecurrenceCron = inngest.createFunction(
  { id: "tarefas-recorrencia", name: "Tarefas: recorrência de tarefas" },
  { cron: "0 6 * * *" },
  async ({ step }) => step.run("run-tarefas-recurrence", runTarefasRecurrence),
);

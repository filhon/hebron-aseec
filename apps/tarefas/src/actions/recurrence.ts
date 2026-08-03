"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { recurrenceRules, taskTemplates } from "@hebron/db/schema";
import { recurrenceRuleSchema } from "@hebron/validators/tarefas";
import { computeNextRun } from "@hebron/integrations/tarefas";
import { colaboradorAction } from "../lib/safe-action";

// ---------------------------------------------------------------------------
// createRecurrenceRule — amarra uma regra a um task_template já existente
// (schema P-4.6: tarefas.recurrence_rules.task_template_id NOT NULL). O cron
// de packages/jobs/src/crons/tarefas.ts lê next_run_at para instanciar.
// ---------------------------------------------------------------------------

const createRecurrenceRuleSchema = z.object({
  taskTemplateId: z.string().uuid(),
  rule: recurrenceRuleSchema,
});

export const createRecurrenceRule = colaboradorAction
  .schema(createRecurrenceRuleSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const nextRunAt = computeNextRun(input.rule, new Date());

    const rule = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [template] = await tx
          .select({ id: taskTemplates.id })
          .from(taskTemplates)
          .where(eq(taskTemplates.id, input.taskTemplateId))
          .limit(1);
        if (!template) throw new Error("Template não encontrado");

        const [row] = await tx
          .insert(recurrenceRules)
          .values({
            taskTemplateId: input.taskTemplateId,
            type: input.rule.type,
            interval: input.rule.interval,
            dayOfWeek: input.rule.dayOfWeek,
            dayOfMonth: input.rule.dayOfMonth,
            month: input.rule.month,
            endDate: input.rule.endDate,
            nextRunAt,
          })
          .returning();
        if (!row) throw new Error("Falha ao criar regra de recorrência");
        return row;
      },
    );

    return { rule };
  });

// ---------------------------------------------------------------------------
// updateRecurrenceRule — edita uma regra existente e recalcula next_run_at.
// ---------------------------------------------------------------------------

const updateRecurrenceRuleSchema = z.object({
  recurrenceRuleId: z.string().uuid(),
  rule: recurrenceRuleSchema,
});

export const updateRecurrenceRule = colaboradorAction
  .schema(updateRecurrenceRuleSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const nextRunAt = computeNextRun(input.rule, new Date());

    const rule = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .update(recurrenceRules)
          .set({
            type: input.rule.type,
            interval: input.rule.interval,
            dayOfWeek: input.rule.dayOfWeek,
            dayOfMonth: input.rule.dayOfMonth,
            month: input.rule.month,
            endDate: input.rule.endDate,
            nextRunAt,
          })
          .where(eq(recurrenceRules.id, input.recurrenceRuleId))
          .returning();
        if (!row) throw new Error("Regra de recorrência não encontrada");
        return row;
      },
    );

    return { rule };
  });

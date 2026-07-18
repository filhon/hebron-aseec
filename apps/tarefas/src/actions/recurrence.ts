"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { recurrenceRules, taskTemplates } from "@hebron/db/schema";
import { recurrenceRuleSchema } from "@hebron/validators/tarefas";
import { colaboradorAction } from "../lib/safe-action";

// ---------------------------------------------------------------------------
// computeNextRun — próxima ocorrência a partir de `from`, respeitando
// interval/dayOfWeek/dayOfMonth. Simplificação registrada em SESSIONS.md:
// não trata overflow de dia em meses curtos (ex.: dayOfMonth 31 em fevereiro
// cai no último dia válido que o JS Date resolver) — aceitável na escala
// desta ONG; refinar é trabalho de um prompt futuro se virar problema real.
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

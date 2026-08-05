"use server";

import { z } from "zod";
import { and, eq, gte, isNull, ne, or } from "drizzle-orm";
import {
  withAuthenticatedContext,
  type AuthenticatedTx,
} from "@hebron/db/authenticated";
import { recurrenceRules, taskTemplates } from "@hebron/db/schema";
import { recurrenceRuleSchema } from "@hebron/validators/tarefas";
import { computeNextRun } from "@hebron/integrations/tarefas";
import { colaboradorAction } from "../lib/safe-action";

// ---------------------------------------------------------------------------
// assertNoOtherActiveRule (P-4.9d) — uma regra é "ativa" enquanto ainda pode
// gerar tarefa: sem end_date, ou com end_date no futuro (mesmo predicado do
// cron, packages/jobs/src/crons/tarefas.ts::runTarefasRecurrence). Sem esta
// guarda nada impedia duas regras vencendo para o mesmo template — o cron
// instancia uma vez por regra vencida, e assembleTasks (lib/queries.ts)
// escolhia uma entre elas por sobrescrita de Map. Guarda sozinha é corrida
// entre duas abas — o índice único parcial de recurrence_rules (migration
// 0077, caso comum: sem end_date) é a segunda camada.
// ---------------------------------------------------------------------------

async function assertNoOtherActiveRule(
  tx: AuthenticatedTx,
  taskTemplateId: string,
  excludeRuleId?: string,
): Promise<void> {
  const now = new Date();
  const conditions = [
    eq(recurrenceRules.taskTemplateId, taskTemplateId),
    or(isNull(recurrenceRules.endDate), gte(recurrenceRules.endDate, now)),
  ];
  if (excludeRuleId) conditions.push(ne(recurrenceRules.id, excludeRuleId));

  const [existingActive] = await tx
    .select({ id: recurrenceRules.id })
    .from(recurrenceRules)
    .where(and(...conditions))
    .limit(1);
  if (existingActive) {
    throw new Error(
      "Este template já tem uma regra de recorrência ativa. Encerre-a antes de criar outra.",
    );
  }
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

        await assertNoOtherActiveRule(tx, input.taskTemplateId);

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
        const [existing] = await tx
          .select({ taskTemplateId: recurrenceRules.taskTemplateId })
          .from(recurrenceRules)
          .where(eq(recurrenceRules.id, input.recurrenceRuleId))
          .limit(1);
        if (!existing) throw new Error("Regra de recorrência não encontrada");

        await assertNoOtherActiveRule(
          tx,
          existing.taskTemplateId,
          input.recurrenceRuleId,
        );

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

// ---------------------------------------------------------------------------
// endRecurrenceRule — encerra a geração sem depender do template: grava
// end_date = agora. O cron já pula regras com end_date vencido
// (crons/tarefas.ts, `gte(recurrenceRules.endDate, now)`); nenhuma coluna
// nova é necessária e nada é apagado (imutabilidade, CLAUDE.md). O template
// continua instanciável à mão (toggleTaskTemplate/instantiateTaskTemplate,
// actions/templates.ts) — encerrar a regra não mexe nele.
// ---------------------------------------------------------------------------

const endRecurrenceRuleSchema = z.object({
  recurrenceRuleId: z.string().uuid(),
});

export const endRecurrenceRule = colaboradorAction
  .schema(endRecurrenceRuleSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const rule = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .update(recurrenceRules)
          .set({ endDate: new Date() })
          .where(eq(recurrenceRules.id, input.recurrenceRuleId))
          .returning();
        if (!row) throw new Error("Regra de recorrência não encontrada");
        return row;
      },
    );

    return { rule };
  });

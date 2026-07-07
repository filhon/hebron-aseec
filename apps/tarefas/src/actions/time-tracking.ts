"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { timeEntries } from "@hebron/db/schema";
import { createTimeEntrySchema } from "@hebron/validators/tarefas";
import { colaboradorAction } from "../lib/safe-action";

// Time tracking é opcional por tarefa (BRAIN §6.9, "features v1") — sempre em
// nome do próprio usuário (RLS time_entries_write_own, 0033_tarefas_rls.sql).

function diffMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

// ---------------------------------------------------------------------------
// startTimeEntry — inicia o cronômetro para a tarefa. Bloqueia um segundo
// cronômetro simultâneo do mesmo usuário (endedAt null).
// ---------------------------------------------------------------------------

const startTimeEntrySchema = z.object({ taskId: z.string().uuid() });

export const startTimeEntry = colaboradorAction
  .schema(startTimeEntrySchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const [open] = await db
      .select({ id: timeEntries.id })
      .from(timeEntries)
      .where(
        and(eq(timeEntries.userId, ctx.actorId), isNull(timeEntries.endedAt)),
      )
      .limit(1);
    if (open) {
      throw new Error(
        "Você já tem um cronômetro em andamento — pare-o antes de iniciar outro",
      );
    }

    const [entry] = await db
      .insert(timeEntries)
      .values({
        taskId: input.taskId,
        userId: ctx.actorId,
        startedAt: new Date(),
      })
      .returning();
    if (!entry) throw new Error("Falha ao iniciar cronômetro");

    return { entry };
  });

// ---------------------------------------------------------------------------
// stopTimeEntry — encerra o cronômetro e calcula a duração.
// ---------------------------------------------------------------------------

const stopTimeEntrySchema = z.object({ timeEntryId: z.string().uuid() });

export const stopTimeEntry = colaboradorAction
  .schema(stopTimeEntrySchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const [existing] = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.id, input.timeEntryId),
          eq(timeEntries.userId, ctx.actorId),
        ),
      )
      .limit(1);
    if (!existing) throw new Error("Registro de tempo não encontrado");
    if (existing.endedAt) throw new Error("Este cronômetro já foi finalizado");

    const endedAt = new Date();
    const durationMinutes = diffMinutes(existing.startedAt, endedAt);

    const [entry] = await db
      .update(timeEntries)
      .set({ endedAt, durationMinutes })
      .where(eq(timeEntries.id, input.timeEntryId))
      .returning();
    if (!entry) throw new Error("Falha ao finalizar cronômetro");

    return { entry };
  });

// ---------------------------------------------------------------------------
// createManualTimeEntry — lançamento manual (intervalo já conhecido).
// ---------------------------------------------------------------------------

export const createManualTimeEntry = colaboradorAction
  .schema(createTimeEntrySchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const durationMinutes = input.endedAt
      ? diffMinutes(input.startedAt, input.endedAt)
      : null;

    const [entry] = await db
      .insert(timeEntries)
      .values({
        taskId: input.taskId,
        userId: ctx.actorId,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        durationMinutes,
        notes: input.notes,
      })
      .returning();
    if (!entry) throw new Error("Falha ao registrar tempo");

    return { entry };
  });

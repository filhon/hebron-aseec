"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { meetingSessions } from "@hebron/db/schema";
import { ensureMonthlyMeetings } from "@hebron/db/meetings";
import { adminAction } from "../lib/safe-action";
import { logAudit, computeDiff } from "../lib/audit";

// ─── createMeeting ────────────────────────────────────────────────────────────

export const createMeeting = adminAction
  .schema(
    z.object({
      date: z.string().min(1, "Selecione a data da reunião"),
      type: z.enum(["mensal", "ordinaria", "extraordinaria"]),
      chairUserId: z.string().uuid().optional(),
      notes: z.string().max(2000).optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const inserted = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .insert(meetingSessions)
          .values({
            date: new Date(parsedInput.date),
            type: parsedInput.type,
            chairUserId: parsedInput.chairUserId ?? null,
            notes: parsedInput.notes ?? null,
            status: "scheduled",
          })
          .returning(),
    );

    const meeting = inserted[0];
    if (!meeting) throw new Error("Falha ao criar reunião");

    await logAudit({
      actorId: ctx.actorId,
      action: "meeting.created",
      entity: "meeting_session",
      entityId: meeting.id,
      diff: {
        after: {
          date: meeting.date,
          type: meeting.type,
          status: meeting.status,
        },
      },
    });

    return { meeting };
  });

// ─── updateMeeting ────────────────────────────────────────────────────────────

export const updateMeeting = adminAction
  .schema(
    z.object({
      id: z.string().uuid(),
      date: z.string().optional(),
      type: z.enum(["mensal", "ordinaria", "extraordinaria"]).optional(),
      chairUserId: z.string().uuid().nullable().optional(),
      status: z
        .enum(["scheduled", "in_progress", "concluded", "cancelled"])
        .optional(),
      notes: z.string().max(2000).nullable().optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { before, updated } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const beforeRows = await tx
          .select()
          .from(meetingSessions)
          .where(eq(meetingSessions.id, parsedInput.id));

        const before = beforeRows[0];
        if (!before) throw new Error("Reunião não encontrada");

        const patch: Partial<typeof meetingSessions.$inferInsert> = {
          updatedAt: new Date(),
        };

        if (parsedInput.date !== undefined)
          patch.date = new Date(parsedInput.date);
        if (parsedInput.type !== undefined) patch.type = parsedInput.type;
        if (parsedInput.chairUserId !== undefined)
          patch.chairUserId = parsedInput.chairUserId;
        if (parsedInput.status !== undefined) patch.status = parsedInput.status;
        if (parsedInput.notes !== undefined) patch.notes = parsedInput.notes;

        const updatedRows = await tx
          .update(meetingSessions)
          .set(patch)
          .where(eq(meetingSessions.id, parsedInput.id))
          .returning();

        const updated = updatedRows[0];
        if (!updated) throw new Error("Falha ao atualizar reunião");

        return { before, updated };
      },
    );

    await logAudit({
      actorId: ctx.actorId,
      action: "meeting.updated",
      entity: "meeting_session",
      entityId: parsedInput.id,
      diff: computeDiff(
        before as Record<string, unknown>,
        updated as Record<string, unknown>,
      ),
    });

    return { meeting: updated };
  });

// ─── autoCreateMonthlyMeetings ────────────────────────────────────────────────
// Cria reuniões mensais (1ª quarta-feira) para os próximos N meses,
// pulando meses em que já existe uma reunião mensal agendada.
// Ref: BRAIN.md 6.1 — auto-criação mensal.
//
// Núcleo extraído para @hebron/db/meetings (P-0.14) — o cron mensal
// registrado em packages/jobs chama a mesma função com o ator sistema,
// sem depender de uma sessão HTTP.

export const autoCreateMonthlyMeetings = adminAction
  .schema(
    z.object({
      monthsAhead: z.number().int().min(1).max(12).default(3),
      chairUserId: z.string().uuid().optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) =>
    ensureMonthlyMeetings(parsedInput, ctx.actorId),
  );

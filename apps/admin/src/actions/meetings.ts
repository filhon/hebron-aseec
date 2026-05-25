"use server";

import { z } from "zod";
import { and, eq, gte, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { meetingSessions } from "@hebron/db/schema";
import { adminAction } from "../lib/safe-action";
import { logAudit, computeDiff } from "../lib/audit";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurado");
  const client = postgres(url, { prepare: false });
  return drizzle(client);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Retorna a data da primeira quarta-feira de um dado mês/ano (UTC).
 * Ref: BRAIN.md 6.1 — reunião mensal na 1ª quarta-feira.
 */
function firstWednesdayOf(year: number, month: number): Date {
  // month is 0-indexed (January = 0)
  const date = new Date(Date.UTC(year, month, 1));
  // getUTCDay(): 0 = Sunday, 3 = Wednesday
  const dayOfWeek = date.getUTCDay();
  const daysUntilWednesday = (3 - dayOfWeek + 7) % 7;
  date.setUTCDate(1 + daysUntilWednesday);
  return date;
}

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
    const db = getDb();

    const inserted = await db
      .insert(meetingSessions)
      .values({
        date: new Date(parsedInput.date),
        type: parsedInput.type,
        chairUserId: parsedInput.chairUserId ?? null,
        notes: parsedInput.notes ?? null,
        status: "scheduled",
      })
      .returning();

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
    const db = getDb();

    const beforeRows = await db
      .select()
      .from(meetingSessions)
      .where(eq(meetingSessions.id, parsedInput.id));

    const before = beforeRows[0];
    if (!before) throw new Error("Reunião não encontrada");

    const patch: Partial<typeof meetingSessions.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsedInput.date !== undefined) patch.date = new Date(parsedInput.date);
    if (parsedInput.type !== undefined) patch.type = parsedInput.type;
    if (parsedInput.chairUserId !== undefined)
      patch.chairUserId = parsedInput.chairUserId;
    if (parsedInput.status !== undefined) patch.status = parsedInput.status;
    if (parsedInput.notes !== undefined) patch.notes = parsedInput.notes;

    const updatedRows = await db
      .update(meetingSessions)
      .set(patch)
      .where(eq(meetingSessions.id, parsedInput.id))
      .returning();

    const updated = updatedRows[0];
    if (!updated) throw new Error("Falha ao atualizar reunião");

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

export const autoCreateMonthlyMeetings = adminAction
  .schema(
    z.object({
      monthsAhead: z.number().int().min(1).max(12).default(3),
      chairUserId: z.string().uuid().optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const db = getDb();
    const today = new Date();
    const created: (typeof meetingSessions.$inferSelect)[] = [];

    for (let i = 0; i < parsedInput.monthsAhead; i++) {
      const rawMonth = today.getUTCMonth() + i;
      const year = today.getUTCFullYear() + Math.floor(rawMonth / 12);
      const month = rawMonth % 12;

      const wednesday = firstWednesdayOf(year, month);

      // Skip dates already past
      if (wednesday < today) continue;

      const monthStart = new Date(Date.UTC(year, month, 1));
      const monthEnd = new Date(Date.UTC(year, month + 1, 1));

      // Check if a monthly meeting already exists in this calendar month
      const existingRows = await db
        .select({ id: meetingSessions.id })
        .from(meetingSessions)
        .where(
          and(
            eq(meetingSessions.type, "mensal"),
            gte(meetingSessions.date, monthStart),
            lt(meetingSessions.date, monthEnd),
          ),
        );

      if (existingRows[0]) continue;

      const inserted = await db
        .insert(meetingSessions)
        .values({
          date: wednesday,
          type: "mensal",
          chairUserId: parsedInput.chairUserId ?? null,
          status: "scheduled",
        })
        .returning();

      const meeting = inserted[0];
      if (!meeting) continue;

      await logAudit({
        actorId: ctx.actorId,
        action: "meeting.created",
        entity: "meeting_session",
        entityId: meeting.id,
        diff: {
          after: {
            date: meeting.date,
            type: "mensal",
            status: "scheduled",
            autoCreated: true,
          },
        },
      });

      created.push(meeting);
    }

    return { created, count: created.length };
  });

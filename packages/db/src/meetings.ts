import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "./client";
import { meetingSessions } from "./schema/admin";
import { logAudit } from "./audit";

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

export interface EnsureMonthlyMeetingsParams {
  monthsAhead: number;
  chairUserId?: string;
}

/**
 * Cria reuniões mensais (1ª quarta-feira) para os próximos N meses, pulando
 * meses em que já existe uma reunião mensal agendada. Extraído de
 * `apps/admin/src/actions/meetings.ts::autoCreateMonthlyMeetings` (P-0.14) —
 * a action manual passa a delegar aqui, e o cron mensal registrado em
 * `packages/jobs` (com o ator sistema, `getSystemActorId`) chama esta mesma
 * função sem depender de uma sessão HTTP.
 */
export async function ensureMonthlyMeetings(
  params: EnsureMonthlyMeetingsParams,
  actorId: string,
): Promise<{
  created: (typeof meetingSessions.$inferSelect)[];
  count: number;
}> {
  const today = new Date();
  const created: (typeof meetingSessions.$inferSelect)[] = [];

  for (let i = 0; i < params.monthsAhead; i++) {
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
        chairUserId: params.chairUserId ?? null,
        status: "scheduled",
      })
      .returning();

    const meeting = inserted[0];
    if (!meeting) continue;

    await logAudit({
      actorId,
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
}

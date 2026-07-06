import { and, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { documents, editals } from "@hebron/db/schema";
import { notifyEditalClosing } from "../notify/documentos";
import { inngest } from "../client";

const REMINDER_DAYS = 7;

/**
 * Movida de `apps/documentos/src/jobs/edital-closing-reminders.ts` (P-0.14,
 * S-30/S1-06/CS-5) — a função já estava pronta desde P-1.27, só esperando o
 * cron diário que a invoca. Idempotência: como não há coluna de controle de
 * "já lembrado", rodar mais de uma vez no mesmo dia reenviaria o lembrete no
 * mesmo dia (mas não em dias seguintes, pois a janela é de ~24h) — o cron
 * abaixo garante no máximo 1x/dia.
 */
export async function runEditalClosingReminders(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() + REMINDER_DAYS);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setHours(23, 59, 59, 999);

  const rows = await db
    .select({ id: editals.id })
    .from(editals)
    .innerJoin(documents, eq(editals.id, documents.id))
    .where(
      and(
        isNull(documents.deletedAt),
        isNotNull(documents.publishedAt),
        gte(editals.closesAt, windowStart),
        lte(editals.closesAt, windowEnd),
      ),
    );

  for (const row of rows) {
    await notifyEditalClosing(row.id, REMINDER_DAYS);
  }
}

export const editalClosingRemindersCron = inngest.createFunction(
  {
    id: "documentos-edital-closing-reminders",
    name: "Documentos: lembrete de encerramento de edital (7 dias)",
  },
  { cron: "0 8 * * *" },
  async ({ step }) =>
    step.run("run-edital-closing-reminders", runEditalClosingReminders),
);

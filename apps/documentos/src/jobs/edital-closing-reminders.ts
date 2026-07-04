import { and, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { documents, editals } from "@hebron/db/schema";
import { notifyEditalClosing } from "../lib/notifications";

const REMINDER_DAYS = 7;

/**
 * Envia o lembrete de encerramento (7 dias antes) para os editais anuais
 * publicados cujo `closesAt` cai na janela de 24h em torno de "hoje + 7
 * dias". Pensado para rodar 1x/dia via um scheduler externo — nenhum existe
 * ainda no monorepo (S1-06/CS-5), então esta função não é chamada por
 * ninguém até `packages/jobs` (P-0.14) existir e registrar o cron diário
 * que a invoca.
 *
 * Idempotência: como não há coluna de controle de "já lembrado", rodar esta
 * função mais de uma vez no mesmo dia reenvia o lembrete no mesmo dia (mas
 * não em dias seguintes, pois a janela é de ~24h) — aceitável para um cron
 * diário único; P-0.14 deve garantir que o job rode no máximo 1x/dia.
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

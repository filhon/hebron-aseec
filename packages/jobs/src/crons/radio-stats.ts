import { sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { listenerHeartbeats, listenerStats } from "@hebron/db/schema";
import { inngest } from "../client";

const HEARTBEAT_SECONDS = 60;
const MIN_HEARTBEATS_PER_LISTENER = 2;

interface SessionHeartbeatCount {
  sessionId: string;
  heartbeatCount: number;
}

function yesterdayISO(now: Date): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - 1);
  const iso = d.toISOString().split("T")[0];
  if (!iso) throw new Error("Data inválida");
  return iso;
}

// ---------------------------------------------------------------------------
// runRadioStatsAggregation — agregação diária de audiência (BRAIN §6.6/§6.9,
// D-3 — PROMPTS.md P-8.11). Roda 1x/dia (01:00 UTC) sobre TODO o conteúdo
// bruto acumulado em radio.listener_heartbeats desde a última execução
// (que, em operação normal, é ~1 dia) e grava sob a data de ONTEM (o dia que
// acabou de se completar quando o cron dispara logo após a virada). Semântica:
// "ouvinte" = sessão com >= 2 heartbeats; hoursListened soma TODOS os
// heartbeats (1 heartbeat ≈ 60s), não só os de sessões-ouvinte — reflete o
// tempo de reprodução real, mesmo de sessões abaixo do limiar. Upsert por
// `date` (idempotente — reprocessar o mesmo dia substitui o valor, não
// duplica). Heartbeats brutos são apagados incondicionalmente ao final,
// mesmo quando não há nenhum (LGPD — sem rastro individual, PROMPTS.md).
// ---------------------------------------------------------------------------

export async function runRadioStatsAggregation(): Promise<{
  date: string;
  uniqueSessions: number;
  hoursListened: number;
}> {
  const date = yesterdayISO(new Date());

  const rows: SessionHeartbeatCount[] = await db
    .select({
      sessionId: listenerHeartbeats.sessionId,
      heartbeatCount: sql<number>`count(*)::int`,
    })
    .from(listenerHeartbeats)
    .groupBy(listenerHeartbeats.sessionId);

  const uniqueSessions = rows.filter(
    (r) => r.heartbeatCount >= MIN_HEARTBEATS_PER_LISTENER,
  ).length;

  const totalHeartbeats = rows.reduce((sum, r) => sum + r.heartbeatCount, 0);
  const hoursListened =
    Math.round(((totalHeartbeats * HEARTBEAT_SECONDS) / 3600) * 100) / 100;

  await db
    .insert(listenerStats)
    .values({
      date,
      uniqueSessions,
      hoursListened: hoursListened.toFixed(2),
    })
    .onConflictDoUpdate({
      target: listenerStats.date,
      set: {
        uniqueSessions,
        hoursListened: hoursListened.toFixed(2),
        capturedAt: new Date(),
      },
    });

  await db.delete(listenerHeartbeats);

  return { date, uniqueSessions, hoursListened };
}

export const radioStatsAggregationCron = inngest.createFunction(
  {
    id: "radio-audiencia-snapshot",
    name: "Rádio: agregação diária de audiência",
  },
  { cron: "0 1 * * *" },
  async ({ step }) =>
    step.run("run-radio-stats-aggregation", runRadioStatsAggregation),
);

// ---------------------------------------------------------------------------
// getRadioDashboardStatus — Rádio → Intranet
//
// KPI de audiência real (BRAIN.md, tabela de integrações cross-app §"Rádio →
// Intranet"), semântica D-3 (PROMPTS.md P-8.11): lê radio.listener_stats,
// agregado por packages/jobs/src/crons/radio-stats.ts a partir dos
// heartbeats anônimos do player (sessões únicas/dia + horas ouvidas/dia).
// `audience` é o dia mais recente; `audienceHistory` são os últimos
// AUDIENCE_HISTORY_DAYS dias em ordem cronológica, para o sparkline e a
// tendência do KPI "Audiência da Rádio" no painel da Intranet (P-5.8b).
//
// "Tocando agora" (autor/série/faixa) permanece stub — exige estado de
// reprodução ao vivo, que P-8.11 deixou explicitamente pendente (fora do
// escopo também de P-5.8b); registrado como pendência em SESSIONS.md.
//
// Vive em packages/integrations (P-0.15) — o dashboard da Intranet nunca
// importa direto de apps/radio (G6.5, PROMPTS.md).
// ---------------------------------------------------------------------------

import { desc } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { listenerStats } from "@hebron/db/schema";

export interface RadioNowPlaying {
  author: string;
  series: string;
  trackTitle: string;
}

export interface RadioAudienceKpi {
  /** Dia (YYYY-MM-DD) do snapshot agregado. */
  date: string;
  uniqueSessions: number;
  hoursListened: number;
  capturedAt: Date;
}

export interface RadioDashboardStatus {
  audience: RadioAudienceKpi | null;
  /** Cronológica (mais antigo → mais recente), últimos AUDIENCE_HISTORY_DAYS dias. */
  audienceHistory: RadioAudienceKpi[];
  nowPlaying: RadioNowPlaying | null;
}

// Janela do sparkline de audiência (P-5.8b) — a métrica já nasce agregada
// por dia (não por hora, ao contrário dos buckets de HISTORY_SAMPLE_LIMIT em
// apps/intranet/src/actions/kpis.ts), por isso a janela é em dias.
const AUDIENCE_HISTORY_DAYS = 14;

export async function getRadioDashboardStatus(): Promise<RadioDashboardStatus> {
  const rows = await db
    .select()
    .from(listenerStats)
    .orderBy(desc(listenerStats.date))
    .limit(AUDIENCE_HISTORY_DAYS);

  const audienceHistory: RadioAudienceKpi[] = rows
    .map((row) => ({
      date: row.date,
      uniqueSessions: row.uniqueSessions,
      hoursListened: Number(row.hoursListened),
      capturedAt: row.capturedAt,
    }))
    .reverse();

  return {
    audience: audienceHistory[audienceHistory.length - 1] ?? null,
    audienceHistory,
    nowPlaying: null,
  };
}

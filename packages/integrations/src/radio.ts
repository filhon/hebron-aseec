// ---------------------------------------------------------------------------
// getRadioDashboardStatus — Rádio → Intranet
//
// KPI de audiência real (BRAIN.md, tabela de integrações cross-app §"Rádio →
// Intranet"), semântica D-3 (PROMPTS.md P-8.11): lê o snapshot diário mais
// recente de radio.listener_stats, agregado por
// packages/jobs/src/crons/radio-stats.ts a partir dos heartbeats anônimos do
// player (sessões únicas/dia + horas ouvidas/dia).
//
// "Tocando agora" (autor/série/faixa) permanece stub — fora do escopo de
// P-8.11 (que só cobre "KPI de audiência" nos arquivos permitidos); registrado
// como pendência em SESSIONS.md.
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
  /** Dia (YYYY-MM-DD) do snapshot mais recente agregado. */
  date: string;
  uniqueSessions: number;
  hoursListened: number;
}

export interface RadioDashboardStatus {
  audience: RadioAudienceKpi | null;
  nowPlaying: RadioNowPlaying | null;
}

export async function getRadioDashboardStatus(): Promise<RadioDashboardStatus> {
  const [latest] = await db
    .select()
    .from(listenerStats)
    .orderBy(desc(listenerStats.date))
    .limit(1);

  console.info(
    "[integrations/radio] tocando agora — stub, fora do escopo de P-8.11",
  );

  return {
    audience: latest
      ? {
          date: latest.date,
          uniqueSessions: latest.uniqueSessions,
          hoursListened: Number(latest.hoursListened),
        }
      : null,
    nowPlaying: null,
  };
}

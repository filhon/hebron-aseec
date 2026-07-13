// ---------------------------------------------------------------------------
// getRadioDashboardStatus — Rádio → Intranet
//
// Stub: a integração real nasce quando o módulo Rádio for construído (Fase
// 8). Comportamento esperado (BRAIN.md, tabela de integrações cross-app
// §"Rádio → Intranet"):
//   Audiência atual (ouvintes) e "tocando agora" (autor/série/faixa em
//   reprodução no Auto DJ) alimentam o widget do dashboard da Intranet.
//
// Vive em packages/integrations (P-0.15) — o dashboard da Intranet nunca
// importa direto de apps/radio (G6.5, PROMPTS.md).
// ---------------------------------------------------------------------------

export interface RadioNowPlaying {
  author: string;
  series: string;
  trackTitle: string;
}

export interface RadioDashboardStatus {
  currentListeners: number;
  nowPlaying: RadioNowPlaying | null;
}

export async function getRadioDashboardStatus(): Promise<RadioDashboardStatus> {
  // Stub — nenhum dado real até que o módulo Rádio exista (Fase 8).
  console.info(
    "[integrations/radio] stub — audiência/tocando agora pendentes (Fase 8)",
  );
  return { currentListeners: 0, nowPlaying: null };
}

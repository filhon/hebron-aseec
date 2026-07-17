"use client";

import * as React from "react";

// Heartbeat anônimo de audiência (BRAIN §6.6/§6.9, D-3 — PROMPTS.md P-8.11b):
// sessionId é efêmero (gerado uma vez por montagem do player, nunca derivado
// de usuário/cookie) e o payload não carrega PII — apenas sessionId + trackId,
// no mesmo contrato de apps/radio/src/app/api/heartbeat/route.ts.
const HEARTBEAT_INTERVAL_MS = 60_000;

interface UseListenerHeartbeatOptions {
  /** Faixa tocando agora, ou `null` sem playlist ativa. */
  trackId: string | null;
  /** true somente enquanto o áudio está de fato reproduzindo (sem erro terminal). */
  active: boolean;
}

export function useListenerHeartbeat({
  trackId,
  active,
}: UseListenerHeartbeatOptions) {
  const sessionIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!active || !trackId) return;

    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID();
    }
    const sessionId = sessionIdRef.current;

    function sendHeartbeat() {
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, trackId }),
        keepalive: true,
      }).catch(() => {
        // best-effort: falha de rede não pode interromper a reprodução
      });
    }

    sendHeartbeat();
    const intervalId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [active, trackId]);
}

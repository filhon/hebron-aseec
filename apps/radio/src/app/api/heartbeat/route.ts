import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@hebron/db/client";
import { listenerHeartbeats } from "@hebron/db/schema";
import { getRateLimiter } from "@hebron/auth/rate-limit";

// ---------------------------------------------------------------------------
// Heartbeat anônimo de audiência (BRAIN §6.6/§6.9, D-3 — PROMPTS.md P-8.11):
// o player envia esta requisição a cada 60s enquanto reproduz. Payload sem
// PII (apenas session_id efêmero gerado no client + track_id) — ouvinte
// anônimo, sem sessão HTTP de usuário, então a escrita roda pela conexão
// superuser de @hebron/db/client, mesmo padrão já usado para `now_playing`
// em apps/radio/src/app/api/stream/route.ts.
//
// packages/jobs/src/crons/radio-stats.ts agrega estas linhas diariamente em
// radio.listener_stats e apaga todas em seguida (LGPD — sem rastro
// individual).
// ---------------------------------------------------------------------------

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const heartbeatSchema = z.object({
  sessionId: z.string().min(1).max(100),
  trackId: z.string().uuid(),
});

// PACOTE 5 (AUDIT/04-BACKLOG-CORRECAO.md): único endpoint anônimo do
// ecossistema fora de next-safe-action — 60 batidas/5min por IP cobre
// vários ouvintes simultâneos na mesma rede (1/min esperado por sessão)
// com folga, sem abrir a tabela a flood de escrita.
const heartbeatLimiter = getRateLimiter("radio-heartbeat", 60, 300);

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const { success } = await heartbeatLimiter.limit(`ip:${ip}`);
  if (!success) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      { status: 429 },
    );
  }

  const json: unknown = await request.json().catch(() => null);
  const parsed = heartbeatSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  try {
    await db.insert(listenerHeartbeats).values({
      sessionId: parsed.data.sessionId,
      trackId: parsed.data.trackId,
    });
  } catch {
    return NextResponse.json({ error: "trackId inválido" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

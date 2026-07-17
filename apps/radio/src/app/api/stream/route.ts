import { asc, eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "@hebron/db/client";
import {
  nowPlaying,
  playlists,
  playlistTracks,
  tracks,
} from "@hebron/db/schema";
import type { NowPlaying, Track } from "@hebron/db/schema";
import { getR2Object } from "../../../lib/r2";

// ---------------------------------------------------------------------------
// Auto DJ (BRAIN §6.4): proxy server-side do áudio da faixa "atual" da
// playlist ativa. NÃO é stream contínuo — cada ouvinte que abrir esta rota
// recebe o arquivo inteiro da faixa calculada como tocando agora naquele
// instante (cada um pode estar em ponto diferente do player, nota do
// prompt). A rota também é quem avança `now_playing` e dispara o broadcast
// Realtime — não há sessão HTTP de usuário aqui (ouvinte anônimo), então a
// escrita em `now_playing` roda com a conexão superuser de `@hebron/db/client`
// (mesmo padrão de packages/jobs para processos server-side sem sessão —
// decisão sinalizada como pendente em S-146/0050_radio_rls.sql, resolvida
// aqui: G1, registrada em SESSIONS.md).
// ---------------------------------------------------------------------------

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

interface PlaylistEntry {
  track: Track;
  position: number;
}

interface ComputedTrack {
  track: Track;
  startedAt: Date;
}

/**
 * Calcula qual faixa "deveria" estar tocando agora a partir da última âncora
 * conhecida (`current`), avançando por faixas inteiras conforme o tempo
 * decorrido. Sem `loop`, para na última faixa ao chegar ao fim (não
 * reinicia). Faixa removida da playlist entre uma chamada e outra reinicia
 * da primeira posição.
 */
function computeCurrentTrack(
  entries: PlaylistEntry[],
  loop: boolean,
  now: Date,
  current: NowPlaying | null,
): ComputedTrack {
  const first = entries[0];
  if (!first) throw new Error("Playlist ativa sem faixas");

  if (!current) return { track: first.track, startedAt: now };

  let index = entries.findIndex((e) => e.track.id === current.trackId);
  if (index === -1) index = 0;
  let anchor = current.startedAt;

  for (;;) {
    const entry = entries[index];
    if (!entry) throw new Error("Playlist ativa sem faixas");
    const durationMs = entry.track.durationSeconds * 1000;
    const elapsedMs = now.getTime() - anchor.getTime();
    if (elapsedMs < durationMs)
      return { track: entry.track, startedAt: anchor };

    const isLast = index === entries.length - 1;
    if (isLast && !loop) return { track: entry.track, startedAt: anchor };

    anchor = new Date(anchor.getTime() + durationMs);
    index = isLast ? 0 : index + 1;
  }
}

async function broadcastNowPlaying(track: Track, startedAt: Date) {
  const supabase = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
  );
  const channel = supabase.channel("now-playing");
  await channel.send({
    type: "broadcast",
    event: "track_change",
    payload: {
      trackId: track.id,
      title: track.title,
      startedAt: startedAt.toISOString(),
    },
  });
  await supabase.removeChannel(channel);
}

export async function GET() {
  const [activePlaylist] = await db
    .select()
    .from(playlists)
    .where(eq(playlists.isActive, true))
    .limit(1);

  if (!activePlaylist) {
    return new Response("Nenhuma playlist ativa", { status: 404 });
  }

  const entries = await db
    .select({ track: tracks, position: playlistTracks.position })
    .from(playlistTracks)
    .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
    .where(eq(playlistTracks.playlistId, activePlaylist.id))
    .orderBy(asc(playlistTracks.position));

  if (entries.length === 0) {
    return new Response("Playlist ativa não tem faixas", { status: 404 });
  }

  const [current] = await db.select().from(nowPlaying).limit(1);

  const now = new Date();
  const computed = computeCurrentTrack(
    entries,
    activePlaylist.loop,
    now,
    current ?? null,
  );

  const trackChanged = !current || current.trackId !== computed.track.id;

  if (!current) {
    await db
      .insert(nowPlaying)
      .values({ trackId: computed.track.id, startedAt: computed.startedAt });
  } else if (
    current.trackId !== computed.track.id ||
    current.startedAt.getTime() !== computed.startedAt.getTime()
  ) {
    await db
      .update(nowPlaying)
      .set({ trackId: computed.track.id, startedAt: computed.startedAt })
      .where(eq(nowPlaying.id, true));
  }

  if (trackChanged) {
    try {
      await broadcastNowPlaying(computed.track, computed.startedAt);
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "realtime_broadcast_failure",
          channel: "now-playing",
          trackId: computed.track.id,
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  const object = await getR2Object(computed.track.fileUrl);

  return new Response(object.body, {
    headers: {
      "Content-Type": object.contentType,
      ...(object.contentLength !== undefined
        ? { "Content-Length": String(object.contentLength) }
        : {}),
      "Cache-Control": "no-store",
    },
  });
}

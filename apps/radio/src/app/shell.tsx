"use client";

import * as React from "react";
import { getSupabaseBrowserClient } from "@hebron/auth";
import { Player, type PlayerTrack } from "../components/player";

// ---------------------------------------------------------------------------
// Player global entre navegações (BRAIN §6.4) — Client Component montado uma
// única vez pelo layout raiz (Server), fora da árvore de `children`. Como o
// layout raiz não remonta em navegações client-side dentro do app, o <audio>
// do Player nunca é recriado ao trocar de página.
//
// Também centraliza a única inscrição no canal Realtime "now-playing"
// (mesmo canal que apps/radio/src/app/api/stream/route.ts usa para o
// broadcast "track_change", P-8.8) — o estado corrente é exposto via
// Context para qualquer página que precise mostrar "tocando agora" (home)
// sem abrir uma segunda inscrição.
// ---------------------------------------------------------------------------

export interface TrackLookupEntry {
  authorName: string;
  seriesName: string | null;
  durationSeconds: number;
}

export interface NowPlayingState {
  track: PlayerTrack;
  startedAt: string;
}

interface TrackChangePayload {
  trackId: string;
  title: string;
  startedAt: string;
}

export const NowPlayingContext = React.createContext<NowPlayingState | null>(
  null,
);

export interface ShellProps {
  initialNowPlaying: NowPlayingState | null;
  /** Metadados (autor/série/duração) das faixas do catálogo, por id — o
   * broadcast "track_change" só carrega `trackId`/`title` (route.ts, fora
   * dos arquivos permitidos deste prompt), então o resto vem daqui. */
  trackLookup: Record<string, TrackLookupEntry>;
  children: React.ReactNode;
}

export function Shell({
  initialNowPlaying,
  trackLookup,
  children,
}: ShellProps) {
  const [nowPlaying, setNowPlaying] = React.useState<NowPlayingState | null>(
    initialNowPlaying,
  );
  const trackLookupRef = React.useRef(trackLookup);
  trackLookupRef.current = trackLookup;

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel("now-playing");

    channel
      .on("broadcast", { event: "track_change" }, ({ payload }) => {
        const data = payload as TrackChangePayload;
        const lookup = trackLookupRef.current[data.trackId];
        setNowPlaying({
          startedAt: data.startedAt,
          track: {
            id: data.trackId,
            title: data.title,
            authorName: lookup?.authorName ?? "Rádio Hebron Aseec",
            seriesName: lookup?.seriesName ?? null,
            durationSeconds: lookup?.durationSeconds ?? 0,
          },
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <NowPlayingContext.Provider value={nowPlaying}>
      {children}
      <div className="fixed inset-x-0 bottom-0 z-(--z-sticky)">
        <Player track={nowPlaying?.track ?? null} />
      </div>
    </NowPlayingContext.Provider>
  );
}

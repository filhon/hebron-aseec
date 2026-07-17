"use client";

import * as React from "react";
import { Disc3, Music, Radio } from "lucide-react";
import { NowPlayingContext } from "../app/shell";

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) ? totalSeconds : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Card "tocando agora" da home — lê o estado global do Auto DJ (Shell) e
 * mantém a barra de progresso avançando localmente entre broadcasts. */
export function NowPlayingCard() {
  const nowPlaying = React.useContext(NowPlayingContext);
  const [positionSeconds, setPositionSeconds] = React.useState(0);

  React.useEffect(() => {
    if (!nowPlaying) return;

    const startedAtMs = new Date(nowPlaying.startedAt).getTime();
    function tick() {
      setPositionSeconds((Date.now() - startedAtMs) / 1000);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nowPlaying]);

  if (!nowPlaying) {
    return (
      <div className="w-full max-w-sm rounded-(--radius-lg) border border-white/10 bg-white/5 p-6">
        <span className="flex items-center gap-2 text-xs font-(--font-weight-semibold) tracking-(--tracking-eyebrow) text-(--hb-cyan) uppercase">
          <Radio className="h-3.5 w-3.5" aria-hidden="true" />
          Tocando agora
        </span>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Music
              className="h-6 w-6 text-(--fg-invert-muted)"
              aria-hidden="true"
            />
          </div>
          <p className="text-sm text-(--fg-invert-muted)">
            Nenhuma faixa disponível.
          </p>
        </div>
      </div>
    );
  }

  const { track } = nowPlaying;
  const progress = Math.min(
    100,
    Math.max(0, (positionSeconds / track.durationSeconds) * 100),
  );

  return (
    <div className="w-full max-w-sm rounded-(--radius-lg) border border-white/10 bg-white/5 p-6">
      <span className="flex items-center gap-2 text-xs font-(--font-weight-semibold) tracking-(--tracking-eyebrow) text-(--hb-cyan) uppercase">
        <Radio className="h-3.5 w-3.5" aria-hidden="true" />
        Tocando agora
      </span>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Disc3 className="h-6 w-6 text-(--hb-cyan)" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-(--font-display) text-base font-(--font-weight-semibold) text-(--fg-invert)">
            {track.title}
          </p>
          <p className="truncate text-sm text-(--fg-invert-muted)">
            {track.authorName}
            {track.seriesName ? ` · ${track.seriesName}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 h-1 rounded-(--radius-pill) bg-white/15">
        <div
          className="h-full rounded-(--radius-pill) bg-(--hb-cyan)"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-(--fg-invert-muted)">
        <span>{formatDuration(positionSeconds)}</span>
        <span>{formatDuration(track.durationSeconds)}</span>
      </div>
    </div>
  );
}

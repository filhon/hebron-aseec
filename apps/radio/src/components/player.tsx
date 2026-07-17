"use client";

import * as React from "react";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { TrackInfo } from "./track-info";

export interface PlayerTrack {
  id: string;
  title: string;
  authorName: string;
  seriesName: string | null;
  fileUrl: string;
  durationSeconds: number;
}

export interface PlayerProps {
  tracks: PlayerTrack[];
  initialTrackId?: string;
  className?: string;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) ? totalSeconds : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function Player({ tracks, initialTrackId, className }: PlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [currentIndex, setCurrentIndex] = React.useState(() => {
    const initialIndex = tracks.findIndex((t) => t.id === initialTrackId);
    return initialIndex >= 0 ? initialIndex : 0;
  });
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [muted, setMuted] = React.useState(false);

  const track = tracks[currentIndex] ?? null;

  const wasPlayingRef = React.useRef(isPlaying);
  wasPlayingRef.current = isPlaying;

  React.useEffect(() => {
    setCurrentTime(0);
    if (wasPlayingRef.current) {
      void audioRef.current?.play();
    }
  }, [currentIndex]);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current.play();
      setIsPlaying(true);
    }
  }

  function goToPrevious() {
    if (tracks.length === 0) return;
    setCurrentIndex((i) => (i - 1 + tracks.length) % tracks.length);
  }

  function goToNext() {
    if (tracks.length === 0) return;
    setCurrentIndex((i) => (i + 1) % tracks.length);
  }

  function handleSeek(event: React.ChangeEvent<HTMLInputElement>) {
    const nextTime = Number(event.target.value);
    setCurrentTime(nextTime);
    if (audioRef.current) audioRef.current.currentTime = nextTime;
  }

  if (!track) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-4 border-t border-(--border)",
        "bg-(--surface) px-4 py-3 shadow-(--shadow-lg)",
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={track.fileUrl}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={goToNext}
      />

      <TrackInfo
        title={track.title}
        authorName={track.authorName}
        seriesName={track.seriesName}
        durationSeconds={track.durationSeconds}
        className="w-48 shrink-0 sm:w-64"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={goToPrevious}
            disabled={tracks.length < 2}
            aria-label="Faixa anterior"
            className={cn(
              "hidden h-9 w-9 items-center justify-center rounded-full sm:flex",
              "text-(--fg-muted) transition-colors duration-(--transition-fast)",
              "hover:bg-(--surface-alt) hover:text-(--fg)",
              "disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            <SkipBack className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pausar" : "Tocar"}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              "bg-(--brand) text-(--brand-fg)",
              "transition-colors duration-(--transition-fast)",
              "hover:bg-(--hb-blue-soft)",
            )}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Play className="h-5 w-5 translate-x-0.5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={goToNext}
            disabled={tracks.length < 2}
            aria-label="Próxima faixa"
            className={cn(
              "hidden h-9 w-9 items-center justify-center rounded-full sm:flex",
              "text-(--fg-muted) transition-colors duration-(--transition-fast)",
              "hover:bg-(--surface-alt) hover:text-(--fg)",
              "disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            <SkipForward className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-right text-xs text-(--fg-muted)">
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={track.durationSeconds}
            step={1}
            value={Math.min(currentTime, track.durationSeconds)}
            onChange={handleSeek}
            aria-label="Progresso da faixa"
            className="h-1.5 w-full flex-1 cursor-pointer appearance-none rounded-(--radius-pill) bg-(--border) accent-(--brand)"
          />
          <span className="w-9 shrink-0 text-xs text-(--fg-muted)">
            {formatDuration(track.durationSeconds)}
          </span>
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Ativar som" : "Silenciar"}
          className="flex h-8 w-8 items-center justify-center rounded-full text-(--fg-muted) transition-colors duration-(--transition-fast) hover:bg-(--surface-alt) hover:text-(--fg)"
        >
          {muted || volume === 0 ? (
            <VolumeX className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => {
            setVolume(Number(e.target.value));
            setMuted(false);
          }}
          aria-label="Volume"
          className="h-1.5 w-20 cursor-pointer appearance-none rounded-(--radius-pill) bg-(--border) accent-(--brand)"
        />
      </div>
    </div>
  );
}

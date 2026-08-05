"use client";

import { Play, Volume2 } from "lucide-react";
import type { Track } from "@hebron/types/radio";

export interface PlaylistViewProps {
  name: string;
  tracks: Track[];
  currentTrackId?: string | null;
  onSelectTrack?: (track: Track) => void;
  className?: string;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PlaylistView({
  name,
  tracks,
  currentTrackId,
  onSelectTrack,
  className,
}: PlaylistViewProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <h3 className="font-(family-name:--font-display) text-lg text-(--fg)">
        {name}
      </h3>

      <ol className="flex flex-col divide-y divide-(--divider) rounded-(--radius) border border-(--border)">
        {tracks.map((track, index) => {
          const isCurrent = track.id === currentTrackId;
          return (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => onSelectTrack?.(track)}
                aria-current={isCurrent ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left",
                  "transition-colors duration-(--transition-fast)",
                  isCurrent ? "bg-(--brand-muted)" : "hover:bg-(--surface-alt)",
                )}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center text-xs text-(--fg-muted)">
                  {isCurrent ? (
                    <Volume2
                      className="h-4 w-4 text-(--brand)"
                      aria-hidden="true"
                    />
                  ) : (
                    (index + 1).toString().padStart(2, "0")
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm",
                      isCurrent
                        ? "font-(--font-weight-semibold) text-(--brand)"
                        : "text-(--fg)",
                    )}
                  >
                    {track.title}
                  </span>
                  <span className="block truncate text-xs text-(--fg-muted)">
                    {track.authorName}
                  </span>
                </span>

                <Play
                  className="h-4 w-4 shrink-0 text-(--fg-subtle)"
                  aria-hidden="true"
                />

                <span className="shrink-0 text-xs text-(--fg-muted)">
                  {formatDuration(track.durationSeconds)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

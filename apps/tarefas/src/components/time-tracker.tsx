"use client";

import { useEffect, useMemo, useState } from "react";
import type { TimeEntry } from "@hebron/types/tarefas";
import { Play, Square, Timer } from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${m > 0 ? ` ${m}min` : ""}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export interface TimeTrackerProps {
  timeEntries: TimeEntry[];
  onStart?: () => void;
  onStop?: (elapsedMinutes: number) => void;
  className?: string;
}

export function TimeTracker({
  timeEntries,
  onStart,
  onStop,
  className,
}: TimeTrackerProps) {
  const runningEntry = timeEntries.find((e) => e.endedAt === null) ?? null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!runningEntry) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [runningEntry]);

  const completedEntries = useMemo(
    () => timeEntries.filter((e) => e.endedAt !== null),
    [timeEntries],
  );

  const completedMinutes = completedEntries.reduce(
    (sum, e) => sum + (e.durationMinutes ?? 0),
    0,
  );

  const liveMinutes = runningEntry
    ? Math.floor((now - runningEntry.startedAt.getTime()) / 60_000)
    : 0;

  const totalMinutes = completedMinutes + liveMinutes;

  return (
    <div
      className={cn(
        "rounded-(--radius-md) border border-(--border) bg-(--surface) px-4 py-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-(--brand-muted) text-(--hb-blue)">
            <Timer className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-(--fg-muted)">
              Tempo total
            </p>
            <p className="text-lg font-bold tabular-nums text-(--fg)">
              {formatHoursMinutes(totalMinutes)}
            </p>
          </div>
        </div>

        {runningEntry ? (
          <button
            onClick={() => onStop?.(liveMinutes)}
            className="flex items-center gap-1.5 rounded-full bg-(--color-destructive) px-4 py-2 text-xs font-semibold text-(--color-destructive-foreground) transition-colors hover:bg-(--color-destructive-hover)"
          >
            <Square className="h-3 w-3 fill-current" />
            Parar
          </button>
        ) : (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 rounded-full bg-(--hb-blue) px-4 py-2 text-xs font-semibold text-(--fg-invert) transition-colors hover:bg-(--hb-blue-soft)"
          >
            <Play className="h-3 w-3 fill-current" />
            Iniciar
          </button>
        )}
      </div>

      {runningEntry && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-(--hb-blue)">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--hb-blue)" />
          Em andamento desde{" "}
          {runningEntry.startedAt.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      {completedEntries.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 border-t border-(--divider) pt-3">
          {completedEntries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="text-(--fg-muted)">
                {fmtDate(entry.startedAt)}
              </span>
              <span className="min-w-0 flex-1 truncate text-(--fg)">
                {entry.notes ?? entry.userName}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-(--fg)">
                {formatHoursMinutes(entry.durationMinutes ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

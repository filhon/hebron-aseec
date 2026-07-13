"use client";

import * as React from "react";
import { ShieldAlert, X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ImpersonationBannerProps {
  impersonatedName: string;
  actorName: string;
  startedAt: string;
  /** Server action (FormData) — called when the user clicks "Sair da impersonação" */
  onStop: (_fd: FormData) => Promise<void> | void;
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function useElapsed(startedAt: string): string {
  const [elapsed, setElapsed] = React.useState("");

  React.useEffect(() => {
    function tick() {
      const ms = Date.now() - new Date(startedAt).getTime();
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) setElapsed(`${h}h ${m}m`);
      else if (m > 0) setElapsed(`${m}m ${s}s`);
      else setElapsed(`${s}s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return elapsed;
}

export function ImpersonationBanner({
  impersonatedName,
  actorName,
  startedAt,
  onStop,
}: ImpersonationBannerProps) {
  const elapsed = useElapsed(startedAt);
  const [pending, startTransition] = React.useTransition();

  return (
    <div
      role="alert"
      className={cn(
        "sticky top-0 z-[9999] flex flex-wrap items-center gap-x-2.5 gap-y-1 px-5 py-2",
        "bg-[linear-gradient(90deg,var(--impersonation-bg-start)_0%,var(--impersonation-bg-mid)_50%,var(--impersonation-bg-start)_100%)]",
        "border-b-2 border-(--impersonation-border) shadow-[0_2px_12px_var(--impersonation-shadow)]",
      )}
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 animate-[hb-imp-pulse_1.8s_ease-in-out_infinite] rounded-full bg-(--impersonation-dot) motion-reduce:animate-none"
      />

      <ShieldAlert
        className="h-3.5 w-3.5 shrink-0 text-(--impersonation-dot)"
        aria-hidden="true"
      />

      <span className="min-w-0 flex-1 text-sm font-(--font-weight-semibold) tracking-[0.01em] text-(--impersonation-fg)">
        Operando como{" "}
        <strong className="font-(--font-weight-bold) text-(--impersonation-fg-strong)">
          {impersonatedName}
        </strong>
        <span
          aria-live="off"
          className="ml-2 font-(--font-weight-normal) text-(--impersonation-fg-muted)"
        >
          · {actorName} · desde {formatTime(startedAt)}
          {elapsed ? ` · ${elapsed}` : ""}
        </span>
      </span>

      <form
        action={onStop}
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(() => {
            const fd = new FormData(e.currentTarget);
            void Promise.resolve(onStop(fd));
          });
        }}
        className="shrink-0"
      >
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "flex items-center gap-1.5 rounded-(--radius-sm) px-3.5 py-1.5",
            "border-[1.5px] border-(--impersonation-action-border) bg-white/10",
            "text-xs font-(--font-weight-semibold) tracking-[0.01em] text-(--impersonation-fg)",
            "transition-colors duration-(--transition-fast) hover:bg-white/[0.18]",
            "disabled:cursor-not-allowed disabled:opacity-70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
          )}
        >
          <X className="h-3 w-3" aria-hidden="true" strokeWidth={2.5} />
          {pending ? "Saindo…" : "Sair da impersonação"}
        </button>
      </form>
    </div>
  );
}

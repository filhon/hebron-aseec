"use client";

import * as React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImpersonationBannerProps {
  impersonatedName: string;
  actorName: string;
  startedAt: string;
  /** Server action (FormData) — called when the user clicks "Sair da impersonação" */
  onStop: (_fd: FormData) => Promise<void> | void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

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
      aria-live="polite"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        width: "100%",
        background:
          "linear-gradient(90deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)",
        borderBottom: "2px solid #ef4444",
        boxShadow: "0 2px 12px rgba(220,38,38,0.35)",
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "0 20px",
        minHeight: 44,
        fontFamily: "var(--font-titillium, var(--font-sans, system-ui))",
      }}
    >
      {/* Pulsing indicator */}
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#fca5a5",
          marginRight: 12,
          flexShrink: 0,
          animation: "hb-imp-pulse 1.8s ease-in-out infinite",
        }}
      />

      {/* Shield icon (inline SVG — no dependency) */}
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fca5a5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginRight: 10 }}
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>

      {/* Text */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#fee2e2",
          flex: 1,
          letterSpacing: "0.01em",
        }}
      >
        Operando como{" "}
        <strong style={{ color: "#fef2f2", fontWeight: 700 }}>
          {impersonatedName}
        </strong>
        <span
          style={{
            fontWeight: 400,
            color: "#fca5a5",
            marginLeft: 8,
          }}
        >
          · {actorName} · desde {formatTime(startedAt)}
          {elapsed ? ` · ${elapsed}` : ""}
        </span>
      </span>

      {/* Stop button */}
      <form
        action={onStop}
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(() => {
            const fd = new FormData(e.currentTarget);
            void Promise.resolve(onStop(fd));
          });
        }}
        style={{ flexShrink: 0, marginLeft: 16 }}
      >
        <button
          type="submit"
          disabled={pending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 14px",
            borderRadius: 6,
            border: "1.5px solid rgba(252,165,165,0.5)",
            background: "rgba(255,255,255,0.1)",
            color: "#fee2e2",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.7 : 1,
            transition: "background 0.15s, opacity 0.15s",
            letterSpacing: "0.01em",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            if (!pending) {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.18)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.1)";
          }}
        >
          {/* X icon */}
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          {pending ? "Saindo…" : "Sair da impersonação"}
        </button>
      </form>

      <style>{`
        @keyframes hb-imp-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}

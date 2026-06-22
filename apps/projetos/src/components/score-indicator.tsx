type Role =
  | "super_admin"
  | "diretor"
  | "conselheiro"
  | "colaborador"
  | "submissor"
  | "aluno"
  | "hospede"
  | "ouvinte";

const SCORE_ROLES = new Set<Role>(["super_admin", "diretor", "conselheiro"]);

function scoreColor(score: number): string {
  if (score >= 80) return "var(--hb-green)";
  if (score >= 60) return "var(--hb-cyan)";
  if (score >= 40) return "var(--hb-orange)";
  return "var(--hb-red)";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Alta aderência";
  if (score >= 60) return "Boa aderência";
  if (score >= 40) return "Aderência moderada";
  return "Baixa aderência";
}

export interface ScoreIndicatorProps {
  score: number;
  role: Role;
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
}

export function ScoreIndicator({
  score,
  role,
  showLabel = true,
  compact = false,
  className,
}: ScoreIndicatorProps) {
  if (!SCORE_ROLES.has(role)) return null;

  const clamped = Math.min(100, Math.max(0, score));
  const color = scoreColor(clamped);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 ${className ?? ""}`}
        title={`Score IA: ${clamped}/100 — ${scoreLabel(clamped)}`}
      >
        <div className="w-20 h-1.5 rounded-full bg-(--hb-gray-100) overflow-hidden shrink-0">
          <div
            className="h-full rounded-full"
            style={{ width: `${clamped}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>
          {clamped}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden
          >
            <circle
              cx="7"
              cy="7"
              r="5.5"
              stroke="var(--hb-gray-400)"
              strokeWidth="1.25"
            />
            <path
              d="M4.5 7h2l1-3 1 5 1-2H11"
              stroke="var(--hb-gray-400)"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-xs font-semibold text-(--fg-muted) uppercase tracking-widest">
            Score IA
          </span>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span
            className="text-2xl font-bold tabular-nums leading-none"
            style={{ color, fontFamily: "var(--font-display)" }}
          >
            {clamped}
          </span>
          <span className="text-sm text-(--fg-muted)">/100</span>
        </div>
      </div>

      {/* Bar */}
      <div className="relative h-2.5 rounded-full bg-(--hb-gray-100) overflow-hidden">
        {/* Track markers at 40 and 60 and 80 */}
        {[40, 60, 80].map((mark) => (
          <div
            key={mark}
            className="absolute top-0 bottom-0 w-px bg-(--surface) z-10"
            style={{ left: `${mark}%` }}
            aria-hidden
          />
        ))}
        <div
          className="h-full rounded-full"
          style={{
            width: `${clamped}%`,
            backgroundColor: color,
            transition: "width var(--dur-slow) var(--ease-out)",
          }}
        />
      </div>

      {/* Labels */}
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-(--fg-muted)">
            {scoreLabel(clamped)}
          </span>
          <div className="flex items-center gap-3 text-xs text-(--fg-subtle)">
            <span>40</span>
            <span>60</span>
            <span>80</span>
          </div>
        </div>
      )}
    </div>
  );
}

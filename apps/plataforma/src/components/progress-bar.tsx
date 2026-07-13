function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export interface ProgressBarProps {
  /** 0-100 */
  value: number;
  label?: string;
  /** Exibe o percentual numérico ao lado do label. @default true */
  showValue?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const trackHeights = {
  sm: "h-1.5",
  md: "h-2.5",
} as const;

/** Barra de progresso genérica — usada tanto para o progresso de um curso
 * individual quanto para o progresso geral do aluno na Plataforma. */
export function ProgressBar({
  value,
  label,
  showValue = true,
  size = "md",
  className,
}: ProgressBarProps) {
  const percent = clampPercent(value);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-baseline justify-between gap-2 text-xs">
          {label && (
            <span className="font-(--font-weight-medium) text-(--fg)">
              {label}
            </span>
          )}
          {showValue && (
            <span className="tabular-nums text-(--fg-muted)">{percent}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? undefined : "Progresso"}
        className={cn(
          "w-full overflow-hidden rounded-(--radius-pill) bg-(--surface-alt)",
          trackHeights[size],
        )}
      >
        <div
          className="h-full rounded-(--radius-pill) bg-(--brand)"
          style={{
            width: `${percent}%`,
            transition: "width var(--dur-slow) var(--ease-out)",
          }}
        />
      </div>
    </div>
  );
}

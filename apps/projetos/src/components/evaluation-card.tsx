import type { Evaluation } from "@hebron/types";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function UserCircleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25" />
      <circle
        cx="8"
        cy="6.5"
        r="2.25"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M3 13.5c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface EvaluationCardProps {
  evaluation: Evaluation;
  className?: string;
}

export function EvaluationCard({ evaluation, className }: EvaluationCardProps) {
  const approved = evaluation.recommendation === "sim";

  return (
    <div
      className={`rounded-md border border-(--border) bg-(--surface) overflow-hidden shadow-(--shadow-sm) ${className ?? ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-(--fg-invert)"
            style={{ backgroundColor: "var(--hb-gray-200)" }}
          >
            <UserCircleIcon />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-(--fg) truncate">
              {evaluation.evaluatorName}
            </p>
            <p className="text-xs text-(--fg-muted)">
              {formatDate(evaluation.createdAt)}
            </p>
          </div>
        </div>

        {/* Recommendation badge */}
        <span
          className="shrink-0 rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1.5"
          style={
            approved
              ? {
                  backgroundColor: "var(--hb-green-muted)",
                  color: "var(--hb-green-fg)",
                }
              : {
                  backgroundColor: "var(--color-destructive-muted)",
                  color: "var(--color-destructive)",
                }
          }
        >
          {approved ? (
            <>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 6l3 3 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Favorável
            </>
          ) : (
            <>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M3 3l6 6M9 3l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Desfavorável
            </>
          )}
        </span>
      </div>

      {/* Notes */}
      {evaluation.notes && (
        <div className="px-4 pb-4">
          <div className="rounded-sm bg-(--surface-alt) border-l-2 border-(--border-strong) px-3 py-2.5">
            <p className="text-sm text-(--fg) leading-relaxed">
              {evaluation.notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

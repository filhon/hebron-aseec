import type { Report, ReportAttachment, ReportStatus } from "@hebron/types";

function formatDate(d: Date | null): string {
  if (d === null) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(0)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

type StatusMeta = { label: string; bg: string; text: string };
const STATUS: Record<ReportStatus, StatusMeta> = {
  pendente: {
    label: "Pendente",
    bg: "var(--hb-gray-50)",
    text: "var(--hb-gray-400)",
  },
  entregue: {
    label: "Entregue",
    bg: "var(--hb-cyan-muted)",
    text: "var(--hb-cyan-darker)",
  },
  em_atraso: {
    label: "Em Atraso",
    bg: "var(--color-destructive-muted)",
    text: "var(--color-destructive)",
  },
  aceito: {
    label: "Aceito",
    bg: "var(--hb-green-muted)",
    text: "var(--hb-green-fg)",
  },
};

function FileIcon({ mimeType }: { mimeType: string }) {
  const isPdf = mimeType === "application/pdf";
  const isZip =
    mimeType === "application/zip" ||
    mimeType === "application/x-zip-compressed";
  const isImage = mimeType.startsWith("image/");

  if (isPdf) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect
          x="2"
          y="1"
          width="10"
          height="13"
          rx="1.5"
          stroke="var(--color-destructive)"
          strokeWidth="1.25"
        />
        <path
          d="M5 5h4M5 7.5h4M5 10h2.5"
          stroke="var(--color-destructive)"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <rect
          x="9"
          y="1"
          width="5"
          height="4"
          rx="0.5"
          fill="var(--color-destructive-muted)"
          stroke="var(--color-destructive)"
          strokeWidth="1.25"
        />
      </svg>
    );
  }

  if (isZip) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect
          x="2"
          y="1"
          width="10"
          height="13"
          rx="1.5"
          stroke="var(--hb-orange)"
          strokeWidth="1.25"
        />
        <path
          d="M7 4v7M6 5h2M6 7h2M6 9h2"
          stroke="var(--hb-orange)"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (isImage) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect
          x="1.5"
          y="3"
          width="13"
          height="10"
          rx="1.5"
          stroke="var(--hb-cyan)"
          strokeWidth="1.25"
        />
        <circle
          cx="5.5"
          cy="6.5"
          r="1.25"
          stroke="var(--hb-cyan)"
          strokeWidth="1.25"
        />
        <path
          d="M1.5 10.5l3.5-3 2.5 2.5 2-1.5 4 4"
          stroke="var(--hb-cyan)"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="1"
        width="10"
        height="13"
        rx="1.5"
        stroke="var(--hb-gray-400)"
        strokeWidth="1.25"
      />
      <path
        d="M5 6h4M5 8.5h4M5 11h2.5"
        stroke="var(--hb-gray-400)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AttachmentRow({ attachment }: { attachment: ReportAttachment }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <FileIcon mimeType={attachment.mimeType} />
      <span className="flex-1 text-sm text-(--fg) truncate">
        {attachment.fileName}
      </span>
      <span className="text-xs text-(--fg-muted) shrink-0">
        {formatBytes(attachment.fileSizeBytes)}
      </span>
    </div>
  );
}

export interface ReportCardProps {
  report: Report;
  className?: string;
}

export function ReportCard({ report, className }: ReportCardProps) {
  const meta = STATUS[report.status];
  const isOverdue = report.status === "em_atraso";
  const isPending = report.status === "pendente";

  return (
    <div
      className={`rounded-md border bg-(--surface) shadow-(--shadow-sm) overflow-hidden ${isOverdue ? "border-(--color-destructive)" : "border-(--border)"} ${className ?? ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-(--border)">
        <div>
          <p
            className="text-base font-semibold text-(--fg)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Período {report.period}
          </p>
          <p className="text-xs text-(--fg-muted) mt-0.5">
            {formatDate(report.periodStart)} — {formatDate(report.periodEnd)}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
          style={{ backgroundColor: meta.bg, color: meta.text }}
        >
          {meta.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-4">
        {/* Overdue / pending notice */}
        {(isOverdue || isPending) && (
          <div
            className="rounded-sm border px-3 py-2 text-sm font-medium flex items-start gap-2"
            style={
              isOverdue
                ? {
                    borderColor: "var(--color-destructive)",
                    backgroundColor: "var(--color-destructive-muted)",
                    color: "var(--color-destructive)",
                  }
                : {
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface-alt)",
                    color: "var(--fg-muted)",
                  }
            }
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
              className="mt-0.5 shrink-0"
            >
              <circle
                cx="7"
                cy="7"
                r="5.5"
                stroke="currentColor"
                strokeWidth="1.25"
              />
              <path
                d="M7 4v3.5M7 9.5v.5"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </svg>
            {isOverdue
              ? `Vencido em ${formatDate(report.dueAt)}`
              : `Vence em ${formatDate(report.dueAt)}`}
          </div>
        )}

        {/* Narrative (truncated) */}
        {report.narrativa && (
          <div>
            <p className="text-xs font-semibold text-(--fg-muted) uppercase tracking-wider mb-1.5">
              Narrativa
            </p>
            <p className="text-sm text-(--fg) leading-relaxed line-clamp-3">
              {report.narrativa}
            </p>
          </div>
        )}

        {/* Attachments */}
        {report.attachments.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-(--fg-muted) uppercase tracking-wider mb-1.5">
              Anexos ({report.attachments.length})
            </p>
            <div className="divide-y divide-(--border)">
              {report.attachments.map((att) => (
                <AttachmentRow key={att.id} attachment={att} />
              ))}
            </div>
          </div>
        )}

        {/* Submission + review info */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 border-t border-(--border)">
          {report.submittedAt !== null && (
            <div>
              <p className="text-xs text-(--fg-muted)">Entregue por</p>
              <p className="text-xs font-medium text-(--fg)">
                {report.submittedByName ?? "—"} ·{" "}
                {formatDate(report.submittedAt)}
              </p>
            </div>
          )}
          {report.reviewedAt !== null && (
            <div>
              <p className="text-xs text-(--fg-muted)">Revisado em</p>
              <p className="text-xs font-medium text-(--fg)">
                {formatDate(report.reviewedAt)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

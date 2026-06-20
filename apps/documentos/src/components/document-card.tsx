import type { Document, DocumentVisibility } from "@hebron/types/documentos";
import type { LucideIcon } from "lucide-react";
import { Globe, Lock, Users, FileText, Calendar, Folder } from "lucide-react";
import Link from "next/link";

interface VisibilityConfig {
  label: string;
  dotColor: string;
  badgeClass: string;
  Icon: LucideIcon;
}

const VISIBILITY: Record<DocumentVisibility, VisibilityConfig> = {
  public: {
    label: "Público",
    dotColor: "var(--hb-green)",
    badgeClass: "bg-[--hb-green-muted] text-[--hb-green-fg]",
    Icon: Globe,
  },
  internal: {
    label: "Interno",
    dotColor: "var(--hb-cyan)",
    badgeClass: "bg-[--hb-cyan-muted] text-[--hb-cyan-fg]",
    Icon: Users,
  },
  restricted: {
    label: "Restrito",
    dotColor: "var(--hb-red)",
    badgeClass: "bg-[--color-destructive-muted] text-[--hb-red]",
    Icon: Lock,
  },
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatBytes(bytes: number): string {
  if (bytes < 1_000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export interface DocumentCardProps {
  document: Document;
  href: string;
  className?: string;
}

export function DocumentCard({
  document,
  href,
  className = "",
}: DocumentCardProps) {
  const vis = VISIBILITY[document.visibility];
  const VisIcon = vis.Icon;
  const fileSize = document.currentVersion?.fileSizeBytes;

  return (
    <Link href={href} className={`group block no-underline ${className}`}>
      <article className="hb-card hb-card-overflow h-full flex flex-col transition-all duration-[--dur-fast] group-hover:border-[--brand] group-hover:shadow-[--shadow-md]">
        {/* Accent stripe */}
        <div className="h-1 bg-[--border] group-hover:bg-[--brand] transition-colors duration-[--dur-fast]" />

        <div className="p-5 flex flex-col gap-4 flex-1">
          {/* Category + Visibility row */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[--fg-subtle] text-[11px] font-semibold uppercase tracking-[0.06em] min-w-0">
              <Folder size={13} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{document.category.name}</span>
            </span>

            <span className={`hb-badge shrink-0 ${vis.badgeClass}`}>
              <span
                className="hb-badge-dot"
                style={{ backgroundColor: vis.dotColor }}
              />
              <VisIcon size={11} aria-hidden="true" />
              {vis.label}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-[--font-display] text-[16px] font-bold leading-snug tracking-[-0.015em] text-[--fg] line-clamp-2 group-hover:text-[--brand] transition-colors duration-[--dur-fast]">
            {document.title}
          </h3>

          {/* Description */}
          {document.description && (
            <p className="text-[--fg-muted] text-[13px] leading-relaxed line-clamp-2 flex-1">
              {document.description}
            </p>
          )}

          {/* Tags */}
          {document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {document.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[--bg-alt] text-[--fg-muted] border border-[--border]"
                >
                  {tag.name}
                </span>
              ))}
              {document.tags.length > 3 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[--bg-alt] text-[--fg-muted] border border-[--border]">
                  +{document.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-4 mt-auto border-t border-[--divider]">
            <span className="inline-flex items-center gap-1.5 text-[--fg-muted] text-[12px]">
              <Calendar size={12} aria-hidden="true" />
              {formatDate(document.updatedAt)}
            </span>
            {fileSize !== undefined && fileSize > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[--fg-muted] text-[12px]">
                <FileText size={12} aria-hidden="true" />
                {formatBytes(fileSize)}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

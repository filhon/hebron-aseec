import type { CSSProperties } from "react";
import type {
  Announcement,
  AnnouncementPriority,
} from "@hebron/types/intranet";

export interface AnnouncementCardProps {
  announcement: Announcement;
}

const PRIORITY_LABEL: Record<AnnouncementPriority, string> = {
  urgente: "Urgente",
  importante: "Importante",
  normal: "Aviso",
};

const PRIORITY_STYLE: Record<AnnouncementPriority, CSSProperties> = {
  urgente: {
    background: "color-mix(in srgb, var(--hb-red) 12%, transparent)",
    color: "var(--hb-red-deep)",
  },
  importante: {
    background: "var(--hb-orange-muted)",
    color: "var(--hb-orange-deep)",
  },
  normal: {
    background: "var(--bg-alt)",
    color: "var(--fg-muted)",
  },
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const isDraft = announcement.publishedAt === null;

  return (
    <article className="hb-card hb-card-overflow">
      <div className="hb-card-header">
        <span
          className="hb-badge"
          style={PRIORITY_STYLE[announcement.priority]}
        >
          {PRIORITY_LABEL[announcement.priority]}
        </span>
        {isDraft && <span className="hb-badge">Rascunho</span>}
        <div className="hb-card-header-actions hb-card-header-hint">
          {announcement.publishedAt === null
            ? "não publicado"
            : formatDate(announcement.publishedAt)}
        </div>
      </div>
      <div className="hb-card-body">
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--fg)",
            margin: "0 0 6px",
          }}
        >
          {announcement.title}
        </h3>
        <div
          className="line-clamp-3 text-sm"
          style={{ lineHeight: 1.55 }}
          dangerouslySetInnerHTML={{ __html: announcement.body }}
        />
        <p className="text-xs" style={{ marginTop: 10 }}>
          Por {announcement.authorName}
        </p>
      </div>
    </article>
  );
}

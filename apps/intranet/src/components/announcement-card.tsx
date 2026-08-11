import type { CSSProperties } from "react";
import { RichText } from "@hebron/ui";
import type {
  Announcement,
  AnnouncementPriority,
} from "@hebron/types/intranet";
import { AnnouncementEditDialog } from "./announcement-create-dialog";

export interface AnnouncementCardProps {
  announcement: Announcement;
  /** super_admin corrige um anúncio já publicado (announcements_mutate_admin). */
  canEdit?: boolean;
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

export function AnnouncementCard({
  announcement,
  canEdit = false,
}: AnnouncementCardProps) {
  return (
    <article className="hb-card hb-card-overflow">
      <div className="hb-card-header">
        <span
          className="hb-badge"
          style={PRIORITY_STYLE[announcement.priority]}
        >
          {PRIORITY_LABEL[announcement.priority]}
        </span>
        <div className="hb-card-header-actions">
          <span className="hb-card-header-hint">
            {announcement.publishedAt === null
              ? "não publicado"
              : formatDate(announcement.publishedAt)}
          </span>
          {canEdit && <AnnouncementEditDialog announcement={announcement} />}
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
        <RichText
          html={announcement.body}
          className="line-clamp-3 text-sm"
          style={{ lineHeight: 1.55 }}
        />
        <p className="text-xs" style={{ marginTop: 10 }}>
          Por {announcement.authorName}
        </p>
      </div>
    </article>
  );
}

import { Activity, type LucideIcon } from "lucide-react";

export interface FeedItem {
  id: string;
  module: string;
  title: string;
  description?: string;
  occurredAt: Date;
  icon?: LucideIcon;
}

export interface FeedWidgetProps {
  items: FeedItem[];
  title?: string;
  limit?: number;
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffMin < 2) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffH < 24) return `há ${diffH}h`;
  if (diffD === 1) return "ontem";
  return `há ${diffD} dias`;
}

export function FeedWidget({
  items,
  title = "Últimas atualizações",
  limit = 6,
}: FeedWidgetProps) {
  const visible = [...items]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, limit);

  return (
    <div className="hb-card">
      <div className="hb-card-header">
        <h3>{title}</h3>
      </div>
      <div className="hb-card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
        {visible.length === 0 ? (
          <p
            className="text-(--text-sm) text-(--fg-muted)"
            style={{ padding: "16px 0" }}
          >
            Nenhuma atividade recente.
          </p>
        ) : (
          <ul className="hb-timeline" aria-label={title}>
            {visible.map((item) => {
              const Icon = item.icon ?? Activity;
              return (
                <li key={item.id} className="hb-timeline-item">
                  <div className="hb-timeline-time">
                    {formatRelative(item.occurredAt)} · {item.module}
                  </div>
                  <div
                    className="hb-timeline-text"
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Icon
                      className="h-3.5 w-3.5 text-(--fg-muted)"
                      aria-hidden="true"
                    />
                    <span>
                      <b>{item.title}</b>
                      {item.description && ` — ${item.description}`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

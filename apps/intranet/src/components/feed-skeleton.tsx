import type { CSSProperties } from "react";

function Bone({
  className,
  style,
}: {
  className: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded-xs ${className}`}
      style={{ background: "var(--surface-alt)", ...style }}
    />
  );
}

export interface FeedSkeletonProps {
  title?: string;
  rows?: number;
}

export function FeedSkeleton({
  title = "Últimas atualizações",
  rows = 5,
}: FeedSkeletonProps) {
  return (
    <div className="hb-card" aria-hidden="true">
      <div className="hb-card-header">
        <h3>{title}</h3>
      </div>
      <div className="hb-card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
        <ul className="hb-timeline">
          {Array.from({ length: rows }).map((_, i) => (
            <li key={i} className="hb-timeline-item">
              <Bone className="h-2.5 w-24" />
              <div
                className="hb-timeline-text"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <Bone className="h-3.5 w-3.5 shrink-0 rounded-full" />
                <Bone
                  className="h-3 w-full"
                  style={{ maxWidth: `${70 - (i % 3) * 12}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

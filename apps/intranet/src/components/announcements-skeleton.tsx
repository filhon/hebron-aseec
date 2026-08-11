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

function AnnouncementCardSkeleton() {
  return (
    <div className="hb-card hb-card-overflow" aria-hidden="true">
      <div className="hb-card-header">
        <Bone className="h-4 w-16 rounded-full" />
        <div className="hb-card-header-actions">
          <Bone className="h-3 w-20" />
        </div>
      </div>
      <div className="hb-card-body">
        <Bone className="h-3.5 w-3/5" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginTop: 10,
          }}
        >
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-4/5" />
        </div>
        <Bone className="h-2.5 w-24" style={{ marginTop: 12 }} />
      </div>
    </div>
  );
}

export interface AnnouncementsSkeletonProps {
  count?: number;
}

export function AnnouncementsSkeleton({
  count = 4,
}: AnnouncementsSkeletonProps) {
  return (
    <>
      <div className="hb-chip-row" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="hb-grid hb-grid-2" aria-label="Carregando anúncios">
        {Array.from({ length: count }).map((_, i) => (
          <AnnouncementCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}

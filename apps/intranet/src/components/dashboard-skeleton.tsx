import type { CSSProperties } from "react";
import { FeedSkeleton } from "./feed-skeleton";

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

function KpiWidgetSkeleton() {
  return (
    <div className="hb-stat" aria-hidden="true">
      <Bone className="h-2 w-2 rounded-full" />
      <Bone className="h-2.5 w-24 mt-2" />
      <Bone className="h-7 w-28 mt-2" />
      <Bone className="h-2.5 w-20 mt-2" />
    </div>
  );
}

function CalendarWidgetSkeleton() {
  return (
    <div className="hb-card" aria-hidden="true">
      <div className="hb-card-header">
        <Bone className="h-4 w-28" />
      </div>
      <div className="hb-card-body">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
          }}
        >
          {Array.from({ length: 35 }).map((_, i) => (
            <Bone key={i} className="h-5 w-full rounded-xs" />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 16,
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 12 }}>
              <Bone className="h-3 w-10 shrink-0" />
              <Bone className="h-3 w-full" style={{ maxWidth: "60%" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="hb-page" aria-busy="true" aria-label="Carregando painel">
      <div className="hb-welcome-card">
        <div className="hb-welcome-card-inner">
          <Bone
            className="h-2.5 w-28"
            style={{ background: "rgba(255,255,255,0.25)" }}
          />
          <Bone
            className="h-6 w-64 mt-3"
            style={{ background: "rgba(255,255,255,0.25)" }}
          />
          <Bone
            className="h-3.5 w-full mt-3"
            style={{ background: "rgba(255,255,255,0.18)" }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-(--sp-5) sm:grid-cols-2 xl:grid-cols-3 mb-(--sp-5)">
        <KpiWidgetSkeleton />
        <KpiWidgetSkeleton />
        <KpiWidgetSkeleton />
        <FeedSkeleton />
        <CalendarWidgetSkeleton />
        <KpiWidgetSkeleton />
      </div>

      <div className="hb-card" aria-hidden="true">
        <div className="hb-card-header">
          <Bone className="h-4 w-32" />
        </div>
        <div className="hb-card-body">
          <div className="grid grid-cols-2 gap-(--sp-3) sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: 12,
                }}
              >
                <Bone className="h-10 w-10 rounded-sm" />
                <Bone className="h-2.5 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

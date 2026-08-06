"use client";

import type { ReactNode } from "react";
import { useAction } from "next-safe-action/hooks";
import { Activity } from "lucide-react";
import { EmptyState } from "@hebron/ui";
import type {
  DashboardWidget,
  CalendarEvent,
  KPI,
} from "@hebron/types/intranet";
import { saveDashboardConfig } from "../actions/dashboard";
import { KPICard } from "./kpi-card";
import { FeedWidget, type FeedItem } from "./feed-widget";
import { CalendarWidget } from "./calendar-widget";
import { WidgetGrid, type WidgetGridItem } from "./widget-grid";

function renderWidget(
  widget: DashboardWidget,
  kpis: KPI[],
  feedItems: FeedItem[],
  calendarEvents: CalendarEvent[],
): ReactNode {
  switch (widget.type) {
    case "kpi":
    case "chart": {
      const kpiId = widget.config.kpiId as string | undefined;
      const kpi = kpis.find((k) => k.id === kpiId);
      return kpi ? <KPICard kpi={kpi} /> : null;
    }
    case "feed":
      return feedItems.length === 0 ? (
        <div className="hb-card">
          <div className="hb-card-header">
            <h3>Últimas atualizações</h3>
          </div>
          <div className="hb-card-body">
            <EmptyState icon={Activity} title="Nenhuma atividade recente" />
          </div>
        </div>
      ) : (
        <FeedWidget
          items={feedItems}
          limit={(widget.config.feedLimit as number | undefined) ?? 6}
        />
      );
    case "calendar":
      return <CalendarWidget events={calendarEvents} />;
    default:
      return null;
  }
}

export interface DashboardWidgetsProps {
  widgets: DashboardWidget[];
  kpis: KPI[];
  feedItems: FeedItem[];
  calendarEvents: CalendarEvent[];
}

export function DashboardWidgets({
  widgets,
  kpis,
  feedItems,
  calendarEvents,
}: DashboardWidgetsProps) {
  const { execute } = useAction(saveDashboardConfig);

  const items: WidgetGridItem[] = [...widgets]
    .sort((a, b) => a.position - b.position)
    .map((widget) => ({
      id: widget.id,
      content: renderWidget(widget, kpis, feedItems, calendarEvents),
    }));

  function handleReorder(orderedIds: string[]) {
    const byId = new Map(widgets.map((w) => [w.id, w]));
    const reordered = orderedIds
      .map((id) => byId.get(id))
      .filter((w): w is DashboardWidget => w !== undefined)
      .map((w, index) => ({
        id: w.id,
        type: w.type,
        position: index,
        config: w.config,
      }));
    execute({ widgets: reordered });
  }

  return (
    <WidgetGrid
      items={items}
      onReorder={handleReorder}
      className="mb-(--sp-5)"
    />
  );
}

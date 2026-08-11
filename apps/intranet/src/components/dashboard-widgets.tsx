"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAction } from "next-safe-action/hooks";
import { Activity } from "lucide-react";
import {
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
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

function formatNumber(value: number, unit: string): string {
  if (unit === "R$") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return `${new Intl.NumberFormat("pt-BR").format(value)} ${unit}`;
}

function formatKpiValue(kpi: KPI): string {
  return formatNumber(kpi.value, kpi.unit);
}

// Gráfico distinto do sparkline de canto do KPICard (P-5.2d item 4): área
// preenchida em largura total, não uma linha decorativa de 72x26 no rodapé.
function ChartLine({ points, unit }: { points: number[]; unit: string }) {
  const w = 280;
  const h = 72;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const linePath = points
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (h - ((v - min) / range) * (h - 8) - 4).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
  const first = points[0];
  const last = points[points.length - 1];
  const label =
    first !== undefined && last !== undefined
      ? `Evolução de ${formatNumber(first, unit)} para ${formatNumber(last, unit)}`
      : `${points.length} leituras`;

  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <path d={areaPath} fill="var(--brand-tint)" stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartWidgetCard({ kpi }: { kpi: KPI }) {
  const hasHistory = kpi.history.length >= 2;
  return (
    <div className="hb-card">
      <div className="hb-card-header">
        <h3>{kpi.name}</h3>
      </div>
      <div className="hb-card-body flex flex-col gap-2">
        <div className="hb-stat-value">{formatKpiValue(kpi)}</div>
        {hasHistory ? (
          <ChartLine points={kpi.history} unit={kpi.unit} />
        ) : (
          <p className="text-xs text-(--fg-muted)">
            Histórico insuficiente para desenhar o gráfico.
          </p>
        )}
        <p className="text-xs text-(--fg-muted)">{kpi.period}</p>
      </div>
    </div>
  );
}

// Substitui a célula invisível (P-5.2d item 3): dado gravado sem kpiId (ou
// com kpiId que deixou de existir) vira um cartão explícito com caminho para
// corrigir, em vez de `null`.
function MissingIndicatorCard({
  kpis,
  onSelect,
}: {
  kpis: KPI[];
  onSelect: (kpiId: string) => void;
}) {
  return (
    <div className="hb-card">
      <div className="hb-card-header">
        <h3>Indicador não configurado</h3>
      </div>
      <div className="hb-card-body flex flex-col gap-3">
        <p className="text-xs text-(--fg-muted)">
          Este widget ainda não tem um indicador escolhido. Selecione um para
          exibi-lo aqui.
        </p>
        <Select onValueChange={onSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o indicador" />
          </SelectTrigger>
          <SelectContent>
            {kpis.map((kpi) => (
              <SelectItem key={kpi.id} value={kpi.id}>
                {kpi.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function widgetLabel(widget: DashboardWidget, kpis: KPI[]): string {
  switch (widget.type) {
    case "kpi":
    case "chart": {
      const kpi = kpis.find((k) => k.id === widget.config.kpiId);
      const typeLabel = widget.type === "chart" ? "Gráfico" : "Indicador";
      return kpi ? `${typeLabel}: ${kpi.name}` : `${typeLabel} não configurado`;
    }
    case "feed":
      return "Feed de atividades";
    case "calendar":
      return "Calendário";
    default:
      return "Widget";
  }
}

function renderWidget(
  widget: DashboardWidget,
  kpis: KPI[],
  feedItems: FeedItem[],
  calendarEvents: CalendarEvent[],
  onSelectKpi: (widgetId: string, kpiId: string) => void,
): ReactNode {
  switch (widget.type) {
    case "kpi":
    case "chart": {
      const kpiId = widget.config.kpiId as string | undefined;
      const kpi = kpis.find((k) => k.id === kpiId);
      if (!kpi) {
        return (
          <MissingIndicatorCard
            kpis={kpis}
            onSelect={(selected) => onSelectKpi(widget.id, selected)}
          />
        );
      }
      return widget.type === "chart" ? (
        <ChartWidgetCard kpi={kpi} />
      ) : (
        <KPICard kpi={kpi} />
      );
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
  // Estado otimista semeado pelas props e ressemeado sempre que o servidor
  // manda um arranjo novo (P-5.2d item 1) — nunca uma cópia presa ao
  // primeiro render, que era o motivo do widget recém-adicionado sumir.
  const [localWidgets, setLocalWidgets] = useState(widgets);
  const [writeError, setWriteError] = useState<string | null>(null);

  useEffect(() => {
    setLocalWidgets(widgets);
  }, [widgets]);

  const { execute } = useAction(saveDashboardConfig, {
    onError: ({ error }) => {
      setWriteError(
        error.serverError ??
          "Não foi possível salvar a nova ordem do painel. Tente novamente.",
      );
      setLocalWidgets(widgets);
    },
    onSuccess: () => {
      setWriteError(null);
    },
  });

  function persist(nextWidgets: DashboardWidget[]) {
    setLocalWidgets(nextWidgets);
    execute({
      widgets: nextWidgets.map((w) => ({
        id: w.id,
        type: w.type,
        position: w.position,
        config: w.config,
      })),
    });
  }

  function handleReorder(orderedIds: string[]) {
    const byId = new Map(localWidgets.map((w) => [w.id, w]));
    const reordered = orderedIds
      .map((id) => byId.get(id))
      .filter((w): w is DashboardWidget => w !== undefined)
      .map((w, index) => ({ ...w, position: index }));
    persist(reordered);
  }

  function handleSelectKpi(widgetId: string, kpiId: string) {
    const next = [...localWidgets]
      .sort((a, b) => a.position - b.position)
      .map((w) =>
        w.id === widgetId ? { ...w, config: { ...w.config, kpiId } } : w,
      );
    persist(next);
  }

  const sortedWidgets = [...localWidgets].sort(
    (a, b) => a.position - b.position,
  );
  const items: WidgetGridItem[] = sortedWidgets.map((widget) => ({
    id: widget.id,
    label: widgetLabel(widget, kpis),
    content: renderWidget(
      widget,
      kpis,
      feedItems,
      calendarEvents,
      handleSelectKpi,
    ),
  }));

  return (
    <div className="mb-(--sp-5) flex flex-col gap-3">
      {writeError && (
        <p role="alert" className="text-xs text-(--color-destructive)">
          {writeError}
        </p>
      )}
      <WidgetGrid items={items} onReorder={handleReorder} />
    </div>
  );
}

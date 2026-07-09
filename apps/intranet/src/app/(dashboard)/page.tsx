import type { ReactNode } from "react";
import {
  Megaphone,
  Handshake,
  CalendarDays as CalendarIcon,
  RotateCcw,
} from "lucide-react";
import { Button, EmptyState, ErrorState } from "@hebron/ui";
import type { DashboardWidget } from "@hebron/types/intranet";
import {
  mockAnnouncements,
  mockCalendarEvents,
  mockDashboardWidgets,
  mockKpis,
  mockMeetingDecisions,
} from "../../lib/mock-data";
import { KPICard } from "../../components/kpi-card";
import { FeedWidget, type FeedItem } from "../../components/feed-widget";
import { CalendarWidget } from "../../components/calendar-widget";
import { AppLauncher } from "../../components/app-launcher";
import { WidgetGrid, type WidgetGridItem } from "../../components/widget-grid";
import { DashboardSkeleton } from "../../components/dashboard-skeleton";

// ─── Feed cross-módulo (dados mock da intranet — agregação real chega em P-5.9) ──

const feedItems: FeedItem[] = [
  ...mockAnnouncements
    .filter((a) => a.publishedAt !== null)
    .map((a) => ({
      id: `feed-${a.id}`,
      module: "Anúncios",
      title: a.title,
      description: a.authorName,
      occurredAt: a.publishedAt as Date,
      icon: Megaphone,
    })),
  ...mockMeetingDecisions.map((d) => ({
    id: `feed-${d.id}`,
    module: "Reuniões",
    title: d.description,
    description: d.responsibleName,
    occurredAt: d.updatedAt,
    icon: Handshake,
  })),
  ...mockCalendarEvents
    .filter((e) => e.type === "evento")
    .map((e) => ({
      id: `feed-${e.id}`,
      module: "Calendário",
      title: e.title,
      description: e.location ?? undefined,
      occurredAt: e.createdAt,
      icon: CalendarIcon,
    })),
];

// ─── Renderização por tipo de widget ──────────────────────────────────────────
// "chart" ainda não tem componente próprio (P-5.2 só entregou KPICard/FeedWidget/
// CalendarWidget) — reaproveita o KPICard, cujo sparkline já cobre a leitura de
// tendência que o widget de gráfico pediria.

function renderWidget(
  widget: DashboardWidget,
  activeFeedItems: FeedItem[],
): ReactNode {
  switch (widget.type) {
    case "kpi":
    case "chart": {
      const kpiId = widget.config.kpiId as string | undefined;
      const kpi = mockKpis.find((k) => k.id === kpiId);
      return kpi ? <KPICard kpi={kpi} /> : null;
    }
    case "feed":
      return activeFeedItems.length === 0 ? (
        <div className="hb-card">
          <div className="hb-card-header">
            <h3>Últimas atualizações</h3>
          </div>
          <div className="hb-card-body">
            <EmptyState
              icon={Megaphone}
              title="Nenhum anúncio recente"
              hideQuote
            />
          </div>
        </div>
      ) : (
        <FeedWidget
          items={activeFeedItems}
          limit={(widget.config.feedLimit as number | undefined) ?? 6}
        />
      );
    case "calendar":
      return <CalendarWidget events={mockCalendarEvents} />;
    default:
      return null;
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;

  if (state === "loading") {
    return <DashboardSkeleton />;
  }

  if (state === "error") {
    return (
      <div className="hb-page">
        <ErrorState
          title="Não foi possível carregar o painel"
          description="Verifique sua conexão e tente novamente."
          action={
            <form method="get">
              <Button
                type="submit"
                leftIcon={<RotateCcw size={14} aria-hidden="true" />}
              >
                Tentar novamente
              </Button>
            </form>
          }
        />
      </div>
    );
  }

  const activeFeedItems = state === "empty" ? [] : feedItems;

  const widgets: WidgetGridItem[] = [...mockDashboardWidgets]
    .sort((a, b) => a.position - b.position)
    .map((widget) => ({
      id: widget.id,
      content: renderWidget(widget, activeFeedItems),
    }));

  return (
    <div className="hb-page">
      <div className="hb-welcome-card">
        <div className="hb-welcome-card-inner">
          <div className="hb-welcome-eyebrow">Painel pessoal</div>
          <h2>Bem-vindo de volta, Fábio.</h2>
          <p>
            Acompanhe indicadores, anúncios e a agenda da diretoria em um só
            lugar. Arraste os cartões abaixo para organizar o seu painel.
          </p>
        </div>
        <svg
          className="hb-welcome-deco-circles"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="65" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="40" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="15" fill="white" opacity="0.3" />
        </svg>
      </div>

      <WidgetGrid items={widgets} className="mb-(--sp-5)" />

      <AppLauncher />
    </div>
  );
}

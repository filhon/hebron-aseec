import { Suspense } from "react";
import { ErrorState } from "@hebron/ui";
import type {
  DashboardWidget,
  DashboardWidgetType,
} from "@hebron/types/intranet";
import {
  getAnnouncementsWithAuthors,
  getMeetingSessionsWithDecisions,
  getFeedItems,
  meetingSessionsToCalendarEvents,
} from "../../lib/queries";
import { getKpis } from "../../actions/kpis";
import { getDashboardConfig } from "../../actions/dashboard";
import { getBriefingPreference } from "../../actions/briefing";
import type { FeedItem } from "../../components/feed-widget";
import { AppLauncher } from "../../components/app-launcher";
import { DashboardWidgets } from "../../components/dashboard-widgets";
import { WidgetConfigDialog } from "../../components/widget-config-dialog";
import { BriefingConfigDialog } from "../../components/briefing-config-dialog";
import { DashboardSkeleton } from "../../components/dashboard-skeleton";

// Mesmo shape de intranet.dashboard_configs.widgets (jsonb) — sem
// userId/createdAt/updatedAt, que a tabela não guarda por widget. IDs fixos
// em formato uuid válido (dashboardWidgetSchema exige .uuid() ao resalvar).
interface RawWidget {
  id: string;
  type: DashboardWidgetType;
  position: number;
  config: Record<string, unknown>;
}

const DEFAULT_WIDGETS: RawWidget[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    type: "kpi",
    position: 0,
    config: { kpiId: "kpi-projetos-ativos" },
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    type: "kpi",
    position: 1,
    config: { kpiId: "kpi-doacoes-mes" },
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    type: "feed",
    position: 2,
    config: { feedLimit: 6 },
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    type: "calendar",
    position: 3,
    config: {},
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    type: "kpi",
    position: 4,
    config: { kpiId: "kpi-tarefas-abertas" },
  },
];

async function loadDashboardData() {
  // dashboardConfig resolve primeiro: o limite de busca do feed cross-app
  // (getFeedItems) depende do feedLimit configurado pelo usuário no widget
  // — sem isso o servidor leria o histórico inteiro para um widget que
  // mostra só 3 itens.
  const dashboardResult = await getDashboardConfig({});
  const rawWidgets = dashboardResult?.data?.config?.widgets ?? DEFAULT_WIDGETS;
  const feedWidget = rawWidgets.find((w) => w.type === "feed");
  const feedLimit = (feedWidget?.config.feedLimit as number | undefined) ?? 6;

  const [
    kpisResult,
    briefingResult,
    announcements,
    meetingSessions,
    feedEvents,
  ] = await Promise.all([
    getKpis({}),
    getBriefingPreference({}),
    getAnnouncementsWithAuthors(),
    getMeetingSessionsWithDecisions(),
    getFeedItems(feedLimit),
  ]);

  return {
    kpis: kpisResult?.data?.kpis ?? [],
    dashboardConfig: dashboardResult?.data?.config ?? null,
    briefingPreference: briefingResult?.data?.preference ?? null,
    announcements,
    meetingSessions,
    feedEvents,
  };
}

async function DashboardContent() {
  let data: Awaited<ReturnType<typeof loadDashboardData>>;

  try {
    data = await loadDashboardData();
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar o painel"
        description="Verifique sua conexão e tente novamente."
      />
    );
  }

  const {
    kpis,
    dashboardConfig,
    briefingPreference,
    announcements,
    meetingSessions,
    feedEvents,
  } = data;

  // Anúncios e decisões de reunião são atividade da intranet; os eventos
  // cross-app (projetos/financeiro/tarefas, getFeedItems) se mesclam aqui
  // — FeedWidget reordena tudo por occurredAt antes de exibir, então não
  // há blocos separados por origem.
  const feedItems: FeedItem[] = [
    ...feedEvents,
    ...announcements
      .filter((a) => a.publishedAt !== null)
      .map((a) => ({
        id: `announcement-${a.id}`,
        module: "Anúncios",
        title: a.title,
        description: a.authorName,
        occurredAt: a.publishedAt as Date,
        iconKey: "megaphone" as const,
      })),
    ...meetingSessions.flatMap((session) =>
      session.decisions.map((decision) => ({
        id: `decision-${decision.id}`,
        module: "Reuniões",
        title: decision.description,
        description: decision.responsibleName,
        occurredAt: decision.updatedAt,
        iconKey: "handshake" as const,
      })),
    ),
  ];

  const calendarEvents = meetingSessionsToCalendarEvents(meetingSessions);
  const rawWidgets = dashboardConfig?.widgets ?? DEFAULT_WIDGETS;
  const widgetsUpdatedAt = dashboardConfig?.updatedAt ?? new Date();
  const widgets: DashboardWidget[] = rawWidgets.map((w) => ({
    id: w.id,
    userId: dashboardConfig?.userId ?? "",
    type: w.type as DashboardWidgetType,
    position: w.position,
    config: w.config,
    createdAt: widgetsUpdatedAt,
    updatedAt: widgetsUpdatedAt,
  }));

  return (
    <div className="hb-page">
      <div className="hb-welcome-card">
        <div className="hb-welcome-card-inner">
          <div className="hb-welcome-eyebrow">Painel pessoal</div>
          <h2>Bem-vindo de volta.</h2>
          <p>
            Acompanhe indicadores, anúncios e a agenda da diretoria em um só
            lugar. Reorganize o seu painel arrastando os cartões ou pelo seletor
            de posição no canto de cada um.
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

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginBottom: "var(--sp-4)",
        }}
      >
        <BriefingConfigDialog
          initialValues={
            briefingPreference
              ? {
                  enabled: briefingPreference.enabled,
                  frequency: briefingPreference.frequency,
                }
              : { enabled: false, frequency: "diario" }
          }
        />
        <WidgetConfigDialog initialWidgets={widgets} availableKpis={kpis} />
      </div>

      <DashboardWidgets
        widgets={widgets}
        kpis={kpis}
        feedItems={feedItems}
        calendarEvents={calendarEvents}
      />

      <AppLauncher />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

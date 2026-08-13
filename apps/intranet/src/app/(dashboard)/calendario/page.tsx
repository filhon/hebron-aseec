import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { EmptyState, ErrorState, PageHeader } from "@hebron/ui";
import {
  getMeetingSessionsWithDecisions,
  meetingSessionsToCalendarEvents,
} from "../../../lib/queries";
import { CalendarWidget } from "../../../components/calendar-widget";
import { FeedSkeleton } from "../../../components/feed-skeleton";

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-xs ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

function CalendarGridSkeleton() {
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
      </div>
    </div>
  );
}

async function CalendarioContent() {
  let sessions: Awaited<ReturnType<typeof getMeetingSessionsWithDecisions>>;

  try {
    // Janela padrão (últimos 12 meses + futuras, teto de
    // MEETING_SESSIONS_LIST_LIMIT) — a agenda do calendário não precisa de
    // override (P-5.9d CORRETIVO).
    sessions = await getMeetingSessionsWithDecisions();
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar o calendário"
        description="Verifique sua conexão e tente novamente."
      />
    );
  }

  // Reunião marcada para hoje continua "próxima" durante todo o dia em que
  // ela acontece (meeting_sessions.date é meia-noite).
  const todayStart = startOfDay(new Date());
  const upcoming = sessions
    .filter((session) => session.date >= todayStart)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const calendarEvents = meetingSessionsToCalendarEvents(sessions);

  return (
    <div className="hb-grid hb-grid-stat">
      <div className="hb-card">
        <div className="hb-card-header">
          <h3>Próximas reuniões</h3>
        </div>
        {upcoming.length === 0 ? (
          <div className="hb-card-body">
            <EmptyState
              icon={CalendarDays}
              title="Nenhuma reunião agendada"
              hideQuote
            />
          </div>
        ) : (
          <div className="hb-card-body" style={{ paddingTop: 8 }}>
            <ul style={{ display: "flex", flexDirection: "column" }}>
              {upcoming.map((session) => (
                <li
                  key={session.id}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: "14px 0",
                    borderBottom: "1px solid var(--divider)",
                  }}
                >
                  <div
                    className="text-xs"
                    style={{ width: 88, flexShrink: 0, paddingTop: 2 }}
                  >
                    {formatDate(session.date)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="hb-badge">{session.typeLabel}</span>
                      <span className="text-sm font-semibold">
                        Reunião {session.typeLabel}
                      </span>
                    </div>
                    {session.chairName && (
                      <p className="text-xs" style={{ marginTop: 4 }}>
                        Presidida por {session.chairName}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <CalendarWidget events={calendarEvents} />
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <div className="hb-page">
      <PageHeader
        title="Calendário"
        description="Agenda de reuniões da diretoria e do conselho."
      />

      <Suspense
        fallback={
          <div className="hb-grid hb-grid-stat">
            <FeedSkeleton title="Próximas reuniões" rows={4} />
            <CalendarGridSkeleton />
          </div>
        }
      >
        <CalendarioContent />
      </Suspense>
    </div>
  );
}

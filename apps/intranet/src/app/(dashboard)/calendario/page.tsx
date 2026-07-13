import { CalendarDays } from "lucide-react";
import { EmptyState, ErrorState, PageHeader } from "@hebron/ui";
import {
  getMeetingSessionsWithDecisions,
  meetingSessionsToCalendarEvents,
} from "../../../lib/queries";
import { CalendarWidget } from "../../../components/calendar-widget";

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default async function CalendarioPage() {
  let sessions;

  try {
    sessions = await getMeetingSessionsWithDecisions();
  } catch {
    return (
      <div className="hb-page">
        <ErrorState
          title="Não foi possível carregar o calendário"
          description="Verifique sua conexão e tente novamente."
        />
      </div>
    );
  }

  const upcoming = sessions
    .filter((session) => session.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const calendarEvents = meetingSessionsToCalendarEvents(sessions);

  return (
    <div className="hb-page">
      <PageHeader
        title="Calendário"
        description="Agenda de reuniões da diretoria e do conselho."
      />

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
    </div>
  );
}

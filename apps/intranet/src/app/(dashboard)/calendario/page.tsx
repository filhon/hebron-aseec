import type { CSSProperties } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { PageHeader, EmptyState } from "@hebron/ui";
import type { CalendarEventType } from "@hebron/types/intranet";
import { mockCalendarEvents } from "../../../lib/mock-data";
import { CalendarWidget } from "../../../components/calendar-widget";

const TYPE_LABEL: Record<CalendarEventType, string> = {
  reuniao: "Reunião",
  prazo: "Prazo",
  evento: "Evento",
  outro: "Outro",
};

const TYPE_STYLE: Record<CalendarEventType, CSSProperties> = {
  reuniao: { background: "var(--brand-muted)", color: "var(--hb-blue)" },
  prazo: {
    background: "var(--hb-orange-muted)",
    color: "var(--hb-orange-deep)",
  },
  evento: {
    background: "color-mix(in srgb, var(--hb-green) 16%, transparent)",
    color: "var(--hb-green-deep)",
  },
  outro: {
    background: "color-mix(in srgb, var(--hb-cyan) 16%, transparent)",
    color: "var(--hb-cyan-deep)",
  },
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default function CalendarioPage() {
  const events = [...mockCalendarEvents].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime(),
  );

  return (
    <div className="hb-page">
      <PageHeader
        title="Calendário"
        description="Agenda de reuniões, prazos e eventos da Hebron Aseec."
      />

      <div className="hb-grid hb-grid-stat">
        <div className="hb-card">
          <div className="hb-card-header">
            <h3>Agenda</h3>
          </div>
          {events.length === 0 ? (
            <div className="hb-card-body">
              <EmptyState
                icon={CalendarDays}
                title="Nenhum evento cadastrado"
                hideQuote
              />
            </div>
          ) : (
            <div className="hb-card-body" style={{ paddingTop: 8 }}>
              <ul style={{ display: "flex", flexDirection: "column" }}>
                {events.map((event) => (
                  <li
                    key={event.id}
                    style={{
                      display: "flex",
                      gap: 14,
                      padding: "14px 0",
                      borderBottom: "1px solid var(--divider)",
                    }}
                  >
                    <div
                      className="text-(--text-xs)"
                      style={{ width: 88, flexShrink: 0, paddingTop: 2 }}
                    >
                      {formatDate(event.startAt)}
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
                        <span
                          className="hb-badge"
                          style={TYPE_STYLE[event.type]}
                        >
                          {TYPE_LABEL[event.type]}
                        </span>
                        <span className="text-(--text-sm) font-semibold">
                          {event.title}
                        </span>
                      </div>
                      {(event.description ?? event.location) && (
                        <p
                          className="text-(--text-xs)"
                          style={{
                            marginTop: 4,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {event.location && (
                            <>
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                              {event.location}
                              {event.description && " · "}
                            </>
                          )}
                          {event.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <CalendarWidget events={mockCalendarEvents} />
      </div>
    </div>
  );
}

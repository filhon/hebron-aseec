import { CalendarPlus, Download } from "lucide-react";
import { Button } from "@hebron/ui";
import type { CalendarEvent, CalendarEventType } from "@hebron/types/intranet";
import {
  buildGoogleCalendarUrl,
  buildIcsDataUrl,
} from "../lib/calendar-export";

export interface CalendarWidgetProps {
  events: CalendarEvent[];
  /** Mês/dia de referência para "hoje". Padrão: data atual. */
  referenceDate?: Date;
}

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

const EVENT_TYPE_COLOR: Record<CalendarEventType, string> = {
  reuniao: "var(--hb-blue)",
  prazo: "var(--hb-orange)",
  evento: "var(--hb-green)",
  outro: "var(--hb-cyan)",
};

// Rótulo textual do tipo — a cor sozinha não é informação acessível
// (P-5.9d CORRETIVO).
const EVENT_TYPE_LABEL: Record<CalendarEventType, string> = {
  reuniao: "Reunião",
  prazo: "Prazo",
  evento: "Evento",
  outro: "Outro",
};

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function buildMonthGrid(reference: Date): (Date | null)[] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

export function CalendarWidget({ events, referenceDate }: CalendarWidgetProps) {
  const today = referenceDate ?? new Date();
  const cells = buildMonthGrid(today);
  const monthLabel = today.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  // Reunião marcada para hoje (meeting_sessions.date à meia-noite) continua
  // "próxima" durante todo o dia em que ela acontece.
  const upcoming = events
    .filter((event) => event.startAt >= startOfDay(today))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    .slice(0, 3);

  return (
    <div className="hb-card">
      <div className="hb-card-header">
        <h3 style={{ textTransform: "capitalize" }}>{monthLabel}</h3>
      </div>
      <div className="hb-card-body">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            textAlign: "center",
          }}
        >
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i} className="text-xs" style={{ fontWeight: 600 }}>
              {label}
            </span>
          ))}
          {cells.map((date, i) => {
            if (!date) return <span key={i} />;
            const [firstEvent] = events.filter((event) =>
              sameDay(event.startAt, date),
            );
            const isToday = sameDay(date, today);
            return (
              <div
                key={i}
                title={
                  firstEvent
                    ? `${EVENT_TYPE_LABEL[firstEvent.type]}: ${firstEvent.title}`
                    : undefined
                }
                aria-label={
                  firstEvent
                    ? `Dia ${date.getDate()}, ${EVENT_TYPE_LABEL[firstEvent.type]}: ${firstEvent.title}`
                    : undefined
                }
                style={{
                  position: "relative",
                  padding: "6px 0",
                  borderRadius: "var(--radius-xs)",
                  background: isToday ? "var(--brand-muted)" : undefined,
                  fontSize: 12,
                  color: isToday ? "var(--brand)" : "var(--fg)",
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {date.getDate()}
                {firstEvent && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 1,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: EVENT_TYPE_COLOR[firstEvent.type],
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {upcoming.length > 0 && (
          <ul className="hb-timeline" style={{ marginTop: 16 }}>
            {upcoming.map((event) => {
              // Cor do marcador reaproveita os modificadores já existentes
              // do padrão hb-timeline-item — o rótulo de texto abaixo é o
              // que carrega a informação, a cor só reforça.
              const dotModifier =
                event.type === "prazo"
                  ? "warm"
                  : event.type === "evento"
                    ? "life"
                    : event.type === "outro"
                      ? "cool"
                      : undefined;

              const label = (
                <>
                  <span
                    className="hb-badge"
                    style={{
                      background: `color-mix(in srgb, ${EVENT_TYPE_COLOR[event.type]} 16%, transparent)`,
                      color: EVENT_TYPE_COLOR[event.type],
                    }}
                  >
                    {EVENT_TYPE_LABEL[event.type]}
                  </span>{" "}
                  {event.title}
                </>
              );

              return (
                <li
                  key={event.id}
                  className={
                    dotModifier
                      ? `hb-timeline-item ${dotModifier}`
                      : "hb-timeline-item"
                  }
                >
                  <div className="hb-timeline-time">
                    {event.startAt.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                  <div className="hb-timeline-text">
                    {event.meetingSessionId ? (
                      <a
                        href={`/reunioes#reuniao-${event.meetingSessionId}`}
                        className="transition-colors duration-(--transition-fast) hover:text-(--brand)"
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {label}
                      </a>
                    ) : (
                      label
                    )}
                  </div>
                  {event.type === "reuniao" && (
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        title="Adicionar ao Google Calendar"
                      >
                        <a
                          href={buildGoogleCalendarUrl(event)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <CalendarPlus
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          <span className="sr-only">
                            Adicionar ao Google Calendar
                          </span>
                        </a>
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        title="Baixar .ics"
                      >
                        <a
                          href={buildIcsDataUrl(event)}
                          download={`reuniao-${event.id}.ics`}
                        >
                          <Download
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          <span className="sr-only">Baixar .ics</span>
                        </a>
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

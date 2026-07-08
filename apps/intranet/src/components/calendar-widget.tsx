import type { CalendarEvent, CalendarEventType } from "@hebron/types/intranet";

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

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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

  const upcoming = events
    .filter((event) => event.startAt >= today)
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
            <span
              key={i}
              className="text-(--text-xs) text-(--fg-muted)"
              style={{ fontWeight: 600 }}
            >
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
            {upcoming.map((event) => (
              <li key={event.id} className="hb-timeline-item">
                <div className="hb-timeline-time">
                  {event.startAt.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </div>
                <div className="hb-timeline-text">{event.title}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

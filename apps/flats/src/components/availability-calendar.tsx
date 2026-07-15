import type { Reservation, ReservationStatus, Unit } from "@hebron/types/flats";

export interface AvailabilityCalendarItem {
  reservation: Reservation;
  responsibleName: string;
}

export interface AvailabilityCalendarProps {
  units: Unit[];
  items: AvailabilityCalendarItem[];
  /** Dia central da timeline (marcador "hoje"). Padrão: data atual. */
  referenceDate?: Date;
  /** Dias exibidos antes da data de referência. @default 7 */
  daysBefore?: number;
  /** Dias exibidos depois da data de referência. @default 60 */
  daysAfter?: number;
  className?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const STATUS_LABEL: Record<ReservationStatus, string> = {
  solicitada: "Solicitada",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  confirmada: "Confirmada",
  em_curso: "Em curso",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_COLOR: Record<ReservationStatus, string> = {
  solicitada: "var(--hb-cyan)",
  aprovada: "var(--hb-cyan-deep)",
  rejeitada: "var(--hb-gray-400)",
  confirmada: "var(--hb-blue)",
  em_curso: "var(--hb-orange)",
  concluida: "var(--hb-green-deep)",
  cancelada: "var(--hb-gray-400)",
};

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function AvailabilityCalendar({
  units,
  items,
  referenceDate,
  daysBefore = 7,
  daysAfter = 60,
  className,
}: AvailabilityCalendarProps) {
  const today = startOfDay(referenceDate ?? new Date());
  const rangeStart = new Date(today.getTime() - daysBefore * MS_PER_DAY);
  const totalDays = daysBefore + daysAfter;
  const todayPercent = (daysBefore / totalDays) * 100;

  const rangeStartLabel = rangeStart.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  const rangeEndLabel = new Date(
    rangeStart.getTime() + totalDays * MS_PER_DAY,
  ).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  const relevantStatuses = new Set<ReservationStatus>([
    "confirmada",
    "em_curso",
    "concluida",
  ]);

  return (
    <div
      className={cn(
        "rounded-(--radius) border border-(--border) bg-(--surface) p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between text-xs text-(--fg-muted)">
        <span>{rangeStartLabel}</span>
        <span>{rangeEndLabel}</span>
      </div>

      <div className="flex flex-col gap-3">
        {units.map((unit) => {
          const segments = items.filter(
            (item) =>
              item.reservation.unitId === unit.id &&
              item.reservation.confirmedPeriod &&
              relevantStatuses.has(item.reservation.status),
          );

          return (
            <div
              key={unit.id}
              className="flex flex-col gap-1.5 sm:flex-row sm:items-center"
            >
              <div className="w-full shrink-0 text-sm font-medium text-(--fg) sm:w-32">
                {unit.name}
              </div>
              <div className="relative h-9 w-full overflow-hidden rounded-(--radius-sm) bg-(--surface-alt)">
                <div
                  className="absolute top-0 h-full w-px bg-(--brand)"
                  style={{ left: `${todayPercent}%` }}
                  aria-hidden="true"
                  title="Hoje"
                />
                {segments.map(({ reservation, responsibleName }) => {
                  const period = reservation.confirmedPeriod;
                  if (!period) return null;

                  const startOffset = Math.max(
                    0,
                    daysBetween(rangeStart, period.start),
                  );
                  const endOffset = Math.min(
                    totalDays,
                    daysBetween(rangeStart, period.end),
                  );
                  if (endOffset <= 0 || startOffset >= totalDays) return null;

                  const leftPercent = (startOffset / totalDays) * 100;
                  const widthPercent = Math.max(
                    ((endOffset - startOffset) / totalDays) * 100,
                    1.5,
                  );

                  return (
                    <div
                      key={reservation.id}
                      className="absolute top-1 bottom-1 rounded-(--radius-xs)"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        backgroundColor: STATUS_COLOR[reservation.status],
                      }}
                      title={`${responsibleName} — ${STATUS_LABEL[reservation.status]}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-(--divider) pt-3">
        {(
          ["confirmada", "em_curso", "concluida"] satisfies ReservationStatus[]
        ).map((status) => (
          <span
            key={status}
            className="flex items-center gap-1.5 text-xs text-(--fg-muted)"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[status] }}
              aria-hidden="true"
            />
            {STATUS_LABEL[status]}
          </span>
        ))}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { PageHeader, EmptyState } from "@hebron/ui";
import { AvailabilityCalendar } from "../../components/availability-calendar";
import { CalendarSkeleton } from "../../components/calendar-skeleton";
import { mockGuests, mockReservations, mockUnits } from "../../lib/mock-data";

const RELEVANT_STATUSES = new Set(["confirmada", "em_curso", "concluida"]);

export default function CalendarioAdminPage() {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const items = mockReservations
    .filter(
      (reservation) =>
        reservation.confirmedPeriod &&
        RELEVANT_STATUSES.has(reservation.status),
    )
    .map((reservation) => {
      const guest = mockGuests.find((g) => g.id === reservation.guestId);
      return {
        reservation,
        responsibleName: guest?.responsibleName ?? "Hóspede",
      };
    });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Calendário consolidado"
        description="Ocupação dos dois flats nos próximos meses."
      />

      {loading ? (
        <CalendarSkeleton />
      ) : (
        <>
          {items.length === 0 ? (
            <EmptyState
              icon={CalendarX2}
              title="Sem reservas nos próximos 30 dias"
              description="Nenhum flat tem período confirmado no calendário atual."
              quote={{
                text: "Minha presença irá contigo, e eu te darei descanso.",
                reference: "Êxodo 33:14",
              }}
            />
          ) : (
            <AvailabilityCalendar units={mockUnits} items={items} />
          )}

          <section className="flex flex-col gap-3">
            <h2 className="font-(--font-display) text-lg text-(--fg)">
              Próximas estadias confirmadas
            </h2>
            {items.length === 0 ? (
              <p className="text-sm text-(--fg-muted)">
                Nenhuma estadia confirmada no momento.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-(--divider) rounded-(--radius) border border-(--border) bg-(--surface)">
                {items.map(({ reservation, responsibleName }) => {
                  const unit = mockUnits.find(
                    (u) => u.id === reservation.unitId,
                  );
                  const period = reservation.confirmedPeriod;
                  return (
                    <li key={reservation.id}>
                      <Link
                        href={`/admin/reserva/${reservation.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors duration-(--transition-fast) hover:bg-(--surface-alt)"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-(--fg)">
                            {responsibleName}
                          </p>
                          <p className="text-xs text-(--fg-muted)">
                            {unit?.name ?? "Unidade não definida"}
                          </p>
                        </div>
                        {period && (
                          <span className="shrink-0 text-xs text-(--fg-muted)">
                            {period.start.toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            })}{" "}
                            –{" "}
                            {period.end.toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

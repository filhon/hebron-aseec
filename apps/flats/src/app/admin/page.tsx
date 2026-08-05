import { Suspense } from "react";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { PageHeader, EmptyState } from "@hebron/ui";
import { AvailabilityCalendar } from "../../components/availability-calendar";
import { CalendarSkeleton } from "../../components/calendar-skeleton";
import {
  getActiveUnits,
  getCalendarItems,
  requireGestorSession,
} from "../../lib/queries";

async function CalendarContent({ actorId }: { actorId: string }) {
  const [unitsList, items] = await Promise.all([
    getActiveUnits(actorId),
    getCalendarItems(actorId),
  ]);

  return (
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
        <AvailabilityCalendar units={unitsList} items={items} />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-(family-name:--font-display) text-lg text-(--fg)">
          Próximas estadias confirmadas
        </h2>
        {items.length === 0 ? (
          <p className="text-sm text-(--fg-muted)">
            Nenhuma estadia confirmada no momento.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-(--divider) rounded-(--radius) border border-(--border) bg-(--surface)">
            {items.map(({ reservation, responsibleName }) => {
              const unit = unitsList.find((u) => u.id === reservation.unitId);
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
  );
}

export default async function CalendarioAdminPage() {
  const session = await requireGestorSession();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Calendário consolidado"
        description="Ocupação dos dois flats nos próximos meses."
      />

      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarContent actorId={session.actorId} />
      </Suspense>
    </div>
  );
}

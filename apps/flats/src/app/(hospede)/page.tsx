import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { PageHeader, Button, EmptyState } from "@hebron/ui";
import { UnitCard } from "../../components/unit-card";
import { mockUnits, mockReservations } from "../../lib/mock-data";
import type { Reservation, Unit } from "@hebron/types/flats";

const RELEVANT_STATUSES = new Set<Reservation["status"]>([
  "confirmada",
  "em_curso",
]);

function fmtDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function nextAvailability(unit: Unit): string {
  const upcoming = mockReservations
    .filter(
      (reservation) =>
        reservation.unitId === unit.id &&
        reservation.confirmedPeriod &&
        RELEVANT_STATUSES.has(reservation.status),
    )
    .sort(
      (a, b) =>
        (a.confirmedPeriod?.start.getTime() ?? 0) -
        (b.confirmedPeriod?.start.getTime() ?? 0),
    );

  const next = upcoming[0]?.confirmedPeriod;
  if (!next)
    return "Sem reservas confirmadas — disponível para os próximos períodos";

  return `Ocupado de ${fmtDate(next.start)} a ${fmtDate(next.end)}`;
}

export default function CatalogoPage() {
  const units = mockUnits.filter((unit) => unit.isActive);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Catálogo de flats"
        description="Dois apartamentos de descanso ministerial, gratuitos, no mesmo condomínio fechado."
        actions={
          <Button asChild>
            <Link href="/reservar">
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Solicitar reserva
            </Link>
          </Button>
        }
      />

      {units.length === 0 ? (
        <EmptyState
          title="Nenhum flat disponível no momento"
          description="Os flats estão temporariamente indisponíveis para novas solicitações."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {units.map((unit) => (
            <div key={unit.id} className="flex flex-col gap-2">
              <UnitCard unit={unit} />
              <p className="px-1 text-xs text-(--fg-muted)">
                {nextAvailability(unit)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

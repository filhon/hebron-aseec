import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { PageHeader, EmptyState } from "@hebron/ui";
import { ReservationCard } from "../../../components/reservation-card";
import {
  mockGuests,
  mockReservations,
  mockUnits,
} from "../../../lib/mock-data";
import type { Reservation, ReservationStatus } from "@hebron/types/flats";

// Suposição (G1): sem autenticação nesta fase, o hóspede logado é
// representado pelo primeiro guest do mock (guest-01).
const CURRENT_GUEST_ID = "guest-01";

const FLOW_STEPS: { status: ReservationStatus; label: string }[] = [
  { status: "solicitada", label: "Solicitada" },
  { status: "aprovada", label: "Aprovada" },
  { status: "confirmada", label: "Confirmada" },
  { status: "em_curso", label: "Em curso" },
  { status: "concluida", label: "Concluída" },
];

function fmtDateTime(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ReservationTimeline({ reservation }: { reservation: Reservation }) {
  if (
    reservation.status === "rejeitada" ||
    reservation.status === "cancelada"
  ) {
    return (
      <div className="flex items-center gap-2 rounded-(--radius) bg-(--color-destructive-muted) px-4 py-3 text-sm text-(--color-destructive)">
        <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {reservation.status === "rejeitada"
          ? "Solicitação rejeitada."
          : "Reserva cancelada."}
        {reservation.managerNotes && (
          <span className="text-(--fg-muted)"> {reservation.managerNotes}</span>
        )}
      </div>
    );
  }

  const currentIndex = FLOW_STEPS.findIndex(
    (step) => step.status === reservation.status,
  );

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start">
      {FLOW_STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li
            key={step.status}
            className="flex flex-1 flex-row items-center gap-2 sm:flex-col sm:items-stretch sm:gap-1.5"
          >
            <div className="flex items-center gap-2 sm:flex-col sm:gap-1.5">
              {isDone || isCurrent ? (
                <CheckCircle2
                  className="h-5 w-5 shrink-0"
                  style={{
                    color: isCurrent ? "var(--brand)" : "var(--hb-green-deep)",
                  }}
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  className="h-5 w-5 shrink-0 text-(--fg-subtle)"
                  aria-hidden="true"
                />
              )}
              {index < FLOW_STEPS.length - 1 && (
                <div
                  className="h-px flex-1 sm:h-1 sm:w-full sm:flex-none"
                  style={{
                    backgroundColor:
                      index < currentIndex
                        ? "var(--hb-green-deep)"
                        : "var(--border)",
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
            <span
              className={
                isCurrent
                  ? "text-xs font-semibold text-(--fg)"
                  : "text-xs text-(--fg-muted)"
              }
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function MinhasReservasPage() {
  const guest = mockGuests.find((g) => g.id === CURRENT_GUEST_ID) ?? null;
  const reservations = mockReservations
    .filter((r) => r.guestId === CURRENT_GUEST_ID)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const [current, ...history] = reservations;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        title="Minhas reservas"
        description={
          guest
            ? `Acompanhe o status da sua solicitação, ${guest.responsibleName}.`
            : "Acompanhe o status da sua solicitação."
        }
      />

      {!current ? (
        <EmptyState
          title="Nenhuma reserva ainda"
          description="Você ainda não solicitou uma estadia nos flats."
        />
      ) : (
        <section className="flex flex-col gap-4 rounded-(--radius) border border-(--border) bg-(--surface) p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-(--font-display) text-lg font-semibold text-(--fg)">
              Reserva atual
            </h2>
            <span className="text-xs text-(--fg-muted)">
              Solicitada em {fmtDateTime(current.createdAt)}
            </span>
          </div>

          <ReservationTimeline reservation={current} />

          {guest && (
            <ReservationCard
              reservation={current}
              guest={guest}
              unit={mockUnits.find((u) => u.id === current.unitId) ?? null}
            />
          )}
        </section>
      )}

      {history.length > 0 && guest && (
        <section className="flex flex-col gap-4">
          <h2 className="font-(--font-display) text-lg font-semibold text-(--fg)">
            Histórico
          </h2>
          <div className="flex flex-col gap-3">
            {history.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                guest={guest}
                unit={
                  mockUnits.find((u) => u.id === reservation.unitId) ?? null
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

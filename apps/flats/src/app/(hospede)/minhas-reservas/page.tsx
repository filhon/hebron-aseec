import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { PageHeader, EmptyState } from "@hebron/ui";
import { ReservationCard } from "../../../components/reservation-card";
import { ReservationActions } from "./reservation-actions";
import {
  getActiveUnits,
  getMyReservations,
  requireHospedeSession,
} from "../../../lib/queries";
import type { Reservation, ReservationStatus } from "@hebron/types/flats";

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

export default async function MinhasReservasPage() {
  const session = await requireHospedeSession();
  const [items, unitsList] = await Promise.all([
    getMyReservations(session.actorId),
    getActiveUnits(session.actorId),
  ]);

  const [current, ...history] = items;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        title="Minhas reservas"
        description={
          current
            ? `Acompanhe o status da sua solicitação, ${current.guest.responsibleName}.`
            : "Acompanhe o status da sua solicitação."
        }
      />

      {!current ? (
        <EmptyState
          title="Nenhuma reserva ainda"
          description="Você ainda não solicitou uma estadia nos flats."
          quote={{
            text: "Não vos esqueçais da hospitalidade, porque por ela alguns, sem o saber, hospedaram anjos.",
            reference: "Hebreus 13:2",
          }}
        />
      ) : (
        <section className="flex flex-col gap-4 rounded-(--radius) border border-(--border) bg-(--surface) p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-(family-name:--font-display) text-lg text-(--fg)">
              Reserva atual
            </h2>
            <span className="text-xs text-(--fg-muted)">
              Solicitada em {fmtDateTime(current.reservation.createdAt)}
            </span>
          </div>

          <ReservationTimeline reservation={current.reservation} />

          <ReservationCard
            reservation={current.reservation}
            guest={current.guest}
            unit={
              unitsList.find((u) => u.id === current.reservation.unitId) ?? null
            }
          />

          <ReservationActions
            reservationId={current.reservation.id}
            status={current.reservation.status}
          />
        </section>
      )}

      {history.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-(family-name:--font-display) text-lg text-(--fg)">
            Histórico
          </h2>
          <div className="flex flex-col gap-3">
            {history.map((item) => (
              <ReservationCard
                key={item.reservation.id}
                reservation={item.reservation}
                guest={item.guest}
                unit={
                  unitsList.find((u) => u.id === item.reservation.unitId) ??
                  null
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

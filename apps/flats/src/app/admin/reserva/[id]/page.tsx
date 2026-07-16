import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Car, Gift } from "lucide-react";
import { GuestList } from "../../../../components/guest-list";
import { ScoringPanel } from "../../../../components/scoring-panel";
import { CheckinForm } from "../../../../components/checkin-form";
import {
  mockGuests,
  mockReservations,
  mockUnits,
} from "../../../../lib/mock-data";
import type { ReservationStatus } from "@hebron/types/flats";

const STATUS_LABEL: Record<ReservationStatus, string> = {
  solicitada: "Solicitada",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  confirmada: "Confirmada",
  em_curso: "Em curso",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

function fmtDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function ReservaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const reservation = mockReservations.find((r) => r.id === id);
  if (!reservation) notFound();

  const guest = mockGuests.find((g) => g.id === reservation.guestId);
  if (!guest) notFound();

  const unit = mockUnits.find((u) => u.id === reservation.unitId);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href="/admin"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-(--fg-muted) transition-colors duration-(--transition-fast) hover:text-(--fg)"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Calendário
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-(--font-display) text-2xl text-(--fg)">
            {guest.responsibleName}
          </h1>
          <p className="text-sm text-(--fg-muted)">
            {unit?.name ?? "Unidade a definir"}
          </p>
        </div>
        <span className="rounded-(--radius-pill) bg-(--brand-muted) px-3 py-1 text-sm font-semibold text-(--brand)">
          {STATUS_LABEL[reservation.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <GuestList guest={guest} />

          <section className="flex flex-col gap-2 rounded-(--radius) border border-(--border) bg-(--surface) p-4">
            <h2 className="text-sm font-semibold text-(--fg)">
              Períodos de preferência
            </h2>
            <ul className="flex flex-col gap-1 text-sm text-(--fg-muted)">
              {reservation.preferredPeriods.map((period, index) => (
                <li key={index}>
                  {index + 1}ª preferência: {fmtDate(period.start)} –{" "}
                  {fmtDate(period.end)}
                </li>
              ))}
            </ul>
            {reservation.confirmedPeriod && (
              <p className="mt-1 text-sm font-medium text-(--fg)">
                Confirmado: {fmtDate(reservation.confirmedPeriod.start)} –{" "}
                {fmtDate(reservation.confirmedPeriod.end)}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-2 rounded-(--radius) border border-(--border) bg-(--surface) p-4">
            <h2 className="text-sm font-semibold text-(--fg)">Finalidade</h2>
            <p className="text-sm text-(--fg-muted)">{reservation.purpose}</p>
          </section>

          {reservation.vehicle && (
            <section className="flex flex-col gap-2 rounded-(--radius) border border-(--border) bg-(--surface) p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-(--fg)">
                <Car className="h-4 w-4" aria-hidden="true" />
                Veículo
              </h2>
              <p className="text-sm text-(--fg-muted)">
                {reservation.vehicle.brand} {reservation.vehicle.model} ·{" "}
                {reservation.vehicle.color} · Placa {reservation.vehicle.plate}
              </p>
            </section>
          )}

          {reservation.aidRequest && (
            <section className="flex flex-col gap-2 rounded-(--radius) border border-(--border) bg-(--surface) p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-(--fg)">
                <Gift className="h-4 w-4" aria-hidden="true" />
                Auxílio solicitado
              </h2>
              <p className="text-sm text-(--fg-muted)">
                {reservation.aidRequest.requestsDailyAllowance
                  ? "Diária fixa solicitada. "
                  : ""}
                {reservation.aidRequest.transportMode !== "nenhum"
                  ? `Transporte: ${reservation.aidRequest.transportMode}.`
                  : ""}
              </p>
              <p className="text-xs text-(--fg-subtle)">
                Status: {reservation.aidRequest.status}
              </p>
            </section>
          )}

          {reservation.managerNotes && (
            <section className="flex flex-col gap-2 rounded-(--radius) border border-(--border) bg-(--surface) p-4">
              <h2 className="text-sm font-semibold text-(--fg)">
                Observações da gestão
              </h2>
              <p className="text-sm italic text-(--fg-muted)">
                {reservation.managerNotes}
              </p>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {reservation.scoring && (
            <ScoringPanel scoring={reservation.scoring} />
          )}

          {(reservation.status === "confirmada" ||
            reservation.status === "em_curso") && (
            <section className="flex flex-col gap-3 rounded-(--radius) border border-(--border) bg-(--surface) p-4">
              <h2 className="text-sm font-semibold text-(--fg)">
                Check-in / check-out
              </h2>
              <CheckinForm
                reservationId={reservation.id}
                status={reservation.status}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

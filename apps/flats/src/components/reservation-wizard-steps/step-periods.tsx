"use client";

import { useFormContext } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import { FormField, Label } from "@hebron/ui";
import { mockReservations, mockUnits } from "../../lib/mock-data";
import type { ReservationWizardValues } from "../reservation-wizard";

const MAX_PERIOD_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ORDINAL_LABEL: [string, string, string] = [
  "1ª preferência",
  "2ª preferência",
  "3ª preferência",
];

function daysBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  return Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
}

function validatePeriodRange(start: string, end: string): string | null {
  const diff = daysBetween(start, end);
  if (diff === null) return null;
  if (diff <= 0) return "A data final deve ser depois da inicial";
  if (diff > MAX_PERIOD_DAYS)
    return `Máximo de ${MAX_PERIOD_DAYS} dias por período`;
  return null;
}

// Aviso de disponibilidade: reservas já confirmadas/em curso ocupam uma
// unidade durante o período confirmado. Se todas as unidades já estiverem
// ocupadas em qualquer trecho do período informado, avisamos o hóspede —
// mas não bloqueamos o envio, pois a escolha final é do diretor gestor
// (BRAIN §6.8: scoring + conflitos de calendário).
const OCCUPYING_STATUSES = new Set(["confirmada", "em_curso"]);

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function availabilityWarning(start: string, end: string): string | null {
  if (!start || !end) return null;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (endDate <= startDate) return null;

  const occupiedUnitIds = new Set<string>();
  for (const reservation of mockReservations) {
    if (!OCCUPYING_STATUSES.has(reservation.status)) continue;
    if (!reservation.confirmedPeriod || !reservation.unitId) continue;
    if (
      overlaps(
        startDate,
        endDate,
        reservation.confirmedPeriod.start,
        reservation.confirmedPeriod.end,
      )
    ) {
      occupiedUnitIds.add(reservation.unitId);
    }
  }

  const activeUnits = mockUnits.filter((u) => u.isActive);
  if (occupiedUnitIds.size >= activeUnits.length) {
    return "Nenhum flat está disponível neste período — sua preferência será avaliada, mas pode não ser confirmada.";
  }
  return null;
}

export function StepPeriods() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ReservationWizardValues>();

  const today = new Date().toISOString().slice(0, 10);
  const periods = watch("preferredPeriods");

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-(--font-display) text-lg font-semibold text-(--fg)">
        Períodos de preferência
      </h2>
      <p className="text-sm text-(--fg-muted)">
        Informe 3 períodos, em ordem de preferência. Cada período pode ter no
        máximo {MAX_PERIOD_DAYS} dias consecutivos.
      </p>

      <div className="flex flex-col gap-4">
        {periods.map((period, index) => {
          const label = ORDINAL_LABEL[index] ?? `${index + 1}ª preferência`;
          const rangeError = validatePeriodRange(period.start, period.end);
          const fieldError =
            errors.preferredPeriods?.[index]?.start?.message ??
            errors.preferredPeriods?.[index]?.end?.message;
          const warning = !rangeError
            ? availabilityWarning(period.start, period.end)
            : null;
          const startPath =
            `preferredPeriods.${index}.start` as FieldPath<ReservationWizardValues>;
          const endPath =
            `preferredPeriods.${index}.end` as FieldPath<ReservationWizardValues>;

          return (
            <div
              key={label}
              className="rounded-(--radius) border border-(--border) p-4"
            >
              <p className="mb-3 text-sm font-semibold text-(--fg)">{label}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={startPath}>Início</Label>
                  <input
                    id={startPath}
                    type="date"
                    min={today}
                    className="flex h-10 w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) focus-visible:outline-none focus-visible:border-(--brand) focus-visible:ring-2 focus-visible:ring-(--brand)/20"
                    {...register(startPath)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={endPath}>Fim</Label>
                  <input
                    id={endPath}
                    type="date"
                    min={period.start || today}
                    className="flex h-10 w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) focus-visible:outline-none focus-visible:border-(--brand) focus-visible:ring-2 focus-visible:ring-(--brand)/20"
                    {...register(endPath)}
                  />
                </div>
              </div>

              {(rangeError || fieldError) && (
                <p className="mt-2 text-xs text-(--color-destructive)">
                  {rangeError ?? fieldError}
                </p>
              )}
              {warning && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-(--hb-orange-deep)">
                  <AlertTriangle
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {warning}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <FormField
        id="purpose"
        label="Finalidade da estadia"
        required
        hint="Descreva brevemente o motivo do pedido de descanso"
        error={errors.purpose?.message}
      >
        <textarea
          id="purpose"
          rows={3}
          className="flex w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-muted) focus-visible:outline-none focus-visible:border-(--brand) focus-visible:ring-2 focus-visible:ring-(--brand)/20"
          {...register("purpose")}
        />
      </FormField>
    </section>
  );
}

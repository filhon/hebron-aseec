"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  Button,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import { ScoringPanel } from "./scoring-panel";
import {
  reviewReservationSchema,
  type ReviewReservationInput,
} from "@hebron/validators/flats";
import type { Guest, Reservation, Unit } from "@hebron/types/flats";

export interface ApprovalFormProps {
  reservation: Reservation;
  guest: Guest;
  units: Unit[];
  onSubmit?: (data: ReviewReservationInput) => void | Promise<void>;
  className?: string;
}

interface ApprovalFormValues {
  decision: "aprovada" | "rejeitada" | "";
  unitId: string;
  confirmedPeriodIndex: string;
  managerNotes: string;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ApprovalForm({
  reservation,
  guest,
  units,
  onSubmit,
  className,
}: ApprovalFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ApprovalFormValues>({
    defaultValues: {
      decision: "",
      unitId: "",
      confirmedPeriodIndex: "",
      managerNotes: "",
    },
  });

  const values = watch();
  const isApproving = values.decision === "aprovada";

  async function handleDecision(decision: "aprovada" | "rejeitada") {
    setValue("decision", decision);
    clearErrors();

    const payload = {
      reservationId: reservation.id,
      decision,
      unitId: decision === "aprovada" && values.unitId ? values.unitId : null,
      confirmedPeriod:
        decision === "aprovada" && values.confirmedPeriodIndex !== ""
          ? reservation.preferredPeriods[Number(values.confirmedPeriodIndex)]
          : null,
      managerNotes: values.managerNotes || null,
    };

    const result = reviewReservationSchema.safeParse(payload);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        const field: keyof ApprovalFormValues =
          key === "unitId"
            ? "unitId"
            : key === "confirmedPeriod"
              ? "confirmedPeriodIndex"
              : "managerNotes";
        setError(field, { type: "manual", message: issue.message });
      }
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit?.(result.data);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Falha ao registrar a decisão.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-2 rounded-(--radius) border border-(--border) bg-(--surface) p-4">
        <h2 className="text-sm font-semibold text-(--fg)">
          Aprovação — {guest.responsibleName}
        </h2>
        <p className="text-xs text-(--fg-muted)">{reservation.purpose}</p>
      </div>

      {reservation.scoring && <ScoringPanel scoring={reservation.scoring} />}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-(--fg)">
          Períodos de preferência do hóspede
        </p>
        <ul className="flex flex-col gap-1 text-sm text-(--fg-muted)">
          {reservation.preferredPeriods.map((period, index) => (
            <li key={index}>
              {index + 1}ª preferência: {fmtDate(period.start)} –{" "}
              {fmtDate(period.end)}
            </li>
          ))}
        </ul>
      </div>

      {isApproving && (
        <div className="flex flex-col gap-4 rounded-(--radius) border border-(--border) p-4">
          <FormField
            id="unitId"
            label="Unidade"
            required
            error={errors.unitId?.message}
          >
            <Select
              value={values.unitId}
              onValueChange={(v) => setValue("unitId", v)}
            >
              <SelectTrigger id="unitId" hasError={!!errors.unitId}>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            id="confirmedPeriodIndex"
            label="Período confirmado"
            required
            error={errors.confirmedPeriodIndex?.message}
          >
            <Select
              value={values.confirmedPeriodIndex}
              onValueChange={(v) => setValue("confirmedPeriodIndex", v)}
            >
              <SelectTrigger
                id="confirmedPeriodIndex"
                hasError={!!errors.confirmedPeriodIndex}
              >
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {reservation.preferredPeriods.map((period, index) => (
                  <SelectItem key={index} value={String(index)}>
                    {index + 1}ª preferência: {fmtDate(period.start)} –{" "}
                    {fmtDate(period.end)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      )}

      <FormField
        id="managerNotes"
        label="Observações"
        hint="Opcional — visível para a equipe de gestão"
        error={errors.managerNotes?.message}
      >
        <textarea
          id="managerNotes"
          rows={3}
          className="flex w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-muted) focus-visible:outline-none focus-visible:border-(--brand) focus-visible:ring-2 focus-visible:ring-(--brand)/20"
          {...register("managerNotes")}
        />
      </FormField>

      {submitError && (
        <p className="rounded-(--radius) bg-(--color-destructive-muted) px-4 py-3 text-sm text-(--color-destructive)">
          {submitError}
        </p>
      )}

      <div className="flex gap-3 border-t border-(--divider) pt-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          loading={submitting && values.decision === "rejeitada"}
          disabled={submitting}
          onClick={() => void handleDecision("rejeitada")}
        >
          <XCircle className="h-4 w-4" aria-hidden="true" />
          Rejeitar
        </Button>
        <Button
          type="button"
          className="flex-1"
          loading={submitting && values.decision === "aprovada"}
          disabled={submitting}
          onClick={() => void handleDecision("aprovada")}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Aprovar
        </Button>
      </div>
    </div>
  );
}

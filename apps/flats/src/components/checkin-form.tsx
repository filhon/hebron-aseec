"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { LogIn, LogOut } from "lucide-react";
import { Button, FormField } from "@hebron/ui";
import type { ReservationStatus } from "@hebron/types/flats";

export type CheckinTransitionType = "checkin" | "checkout";

export interface CheckinFormValues {
  reservationId: string;
  type: CheckinTransitionType;
  occurredAt: string;
  notes: string;
}

export interface CheckinFormProps {
  reservationId: string;
  status: ReservationStatus;
  onSubmit?: (data: CheckinFormValues) => void | Promise<void>;
  className?: string;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function nowForDatetimeLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

interface FormValues {
  occurredAt: string;
  notes: string;
}

export function CheckinForm({
  reservationId,
  status,
  onSubmit,
  className,
}: CheckinFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedNote, setConfirmedNote] = useState<string | null>(null);

  const type: CheckinTransitionType | null =
    status === "confirmada"
      ? "checkin"
      : status === "em_curso"
        ? "checkout"
        : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { occurredAt: nowForDatetimeLocal(), notes: "" },
  });

  async function onValid(values: FormValues) {
    if (!type) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit?.({
        reservationId,
        type,
        occurredAt: values.occurredAt,
        notes: values.notes,
      });
      setConfirmedNote(
        type === "checkin"
          ? `Check-in registrado em ${new Date(values.occurredAt).toLocaleString("pt-BR")}.`
          : `Check-out registrado em ${new Date(values.occurredAt).toLocaleString("pt-BR")}.`,
      );
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Falha ao registrar a transição.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!type) {
    return confirmedNote ? (
      <p className={cn("text-xs text-(--fg-muted)", className)}>
        {confirmedNote}
      </p>
    ) : null;
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(onValid)(event)}
      noValidate
      className={cn("flex flex-col gap-4", className)}
    >
      <FormField
        id="occurredAt"
        label={
          type === "checkin"
            ? "Data e hora do check-in"
            : "Data e hora do check-out"
        }
        required
        error={errors.occurredAt?.message}
      >
        <input
          id="occurredAt"
          type="datetime-local"
          className="flex h-10 w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) focus-visible:outline-none focus-visible:border-(--brand) focus-visible:ring-2 focus-visible:ring-(--brand)/20"
          {...register("occurredAt", { required: "Informe a data e hora" })}
        />
      </FormField>

      <FormField
        id="notes"
        label="Observações"
        hint="Opcional — sem checklist de inventário (check-in é presencial na recepção, BRAIN §6.8)"
        error={errors.notes?.message}
      >
        <textarea
          id="notes"
          rows={2}
          className="flex w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-muted) focus-visible:outline-none focus-visible:border-(--brand) focus-visible:ring-2 focus-visible:ring-(--brand)/20"
          {...register("notes")}
        />
      </FormField>

      {submitError && (
        <p className="rounded-(--radius) bg-(--color-destructive-muted) px-4 py-3 text-sm text-(--color-destructive)">
          {submitError}
        </p>
      )}

      <Button type="submit" loading={submitting}>
        {type === "checkin" ? (
          <>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Registrar check-in
          </>
        ) : (
          <>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Registrar check-out
          </>
        )}
      </Button>
    </form>
  );
}

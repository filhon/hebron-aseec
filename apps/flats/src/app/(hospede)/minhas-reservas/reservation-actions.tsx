"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { CheckCircle2, Ban } from "lucide-react";
import {
  Button,
  FormField,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@hebron/ui";
import type { ReservationStatus } from "@hebron/types/flats";
import {
  confirmReservation,
  cancelReservation,
} from "../../../actions/reservations";

// ---------------------------------------------------------------------------
// Acionadores de ciclo de vida que faltavam em "Minhas reservas" (P-7.9b):
// o hóspede confirma presença numa reserva aprovada e pode cancelar em
// qualquer status não-terminal. confirmReservation/cancelReservation já
// autorizam o dono da reserva — este componente só liga a UI a elas.
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = new Set<ReservationStatus>([
  "concluida",
  "cancelada",
  "rejeitada",
]);

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

export interface ReservationActionsProps {
  reservationId: string;
  status: ReservationStatus;
  className?: string;
}

interface CancelFormValues {
  reason: string;
}

export function ReservationActions({
  reservationId,
  status,
  className,
}: ReservationActionsProps) {
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CancelFormValues>({ defaultValues: { reason: "" } });

  const canConfirm = status === "aprovada";
  const canCancel = !TERMINAL_STATUSES.has(status);

  if (!canConfirm && !canCancel) return null;

  async function handleConfirm() {
    setConfirmError(null);
    setConfirming(true);
    try {
      const result = await confirmReservation({ reservationId });
      if (result?.serverError) throw new Error(result.serverError);
      if (result?.validationErrors) {
        throw new Error(
          "Dados inválidos — recarregue a página e tente novamente.",
        );
      }
      router.refresh();
    } catch (err) {
      setConfirmError(
        err instanceof Error ? err.message : "Falha ao confirmar a reserva.",
      );
    } finally {
      setConfirming(false);
    }
  }

  async function onCancelValid(values: CancelFormValues) {
    setCancelError(null);
    setCancelling(true);
    try {
      const result = await cancelReservation({
        reservationId,
        reason: values.reason,
      });
      if (result?.serverError) throw new Error(result.serverError);
      if (result?.validationErrors) {
        throw new Error(
          "Justificativa inválida — informe ao menos 10 caracteres.",
        );
      }
      setCancelOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "Falha ao cancelar a reserva.",
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-3 border-t border-(--divider) pt-3">
        {canConfirm && (
          <Button loading={confirming} onClick={() => void handleConfirm()}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Confirmar presença
          </Button>
        )}
        {canCancel && (
          <Button variant="outline" onClick={() => setCancelOpen(true)}>
            <Ban className="h-4 w-4" aria-hidden="true" />
            Cancelar
          </Button>
        )}
      </div>
      {confirmError && (
        <p className="text-sm text-(--color-destructive)">{confirmError}</p>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar reserva</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => void handleSubmit(onCancelValid)(event)}
            noValidate
            className="flex flex-col gap-4"
          >
            <FormField
              id="reason"
              label="Justificativa"
              required
              hint="Mínimo de 10 caracteres — fica registrada no histórico de auditoria"
              error={errors.reason?.message}
            >
              <textarea
                id="reason"
                rows={3}
                className="flex w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-muted) focus-visible:outline-none focus-visible:border-(--brand) focus-visible:ring-2 focus-visible:ring-(--brand)/20"
                {...register("reason", {
                  required: "Justifique o cancelamento",
                  minLength: {
                    value: 10,
                    message: "Justifique o cancelamento (mínimo 10 caracteres)",
                  },
                })}
              />
            </FormField>

            {cancelError && (
              <p className="text-sm text-(--color-destructive)">
                {cancelError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelOpen(false)}
                disabled={cancelling}
              >
                Voltar
              </Button>
              <Button type="submit" variant="destructive" loading={cancelling}>
                Confirmar cancelamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

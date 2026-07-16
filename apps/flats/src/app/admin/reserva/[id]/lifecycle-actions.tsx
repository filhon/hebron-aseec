"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { CheckCircle2, XCircle, Ban, Gift } from "lucide-react";
import {
  Button,
  FormField,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@hebron/ui";
import type { AidRequest, ReservationStatus } from "@hebron/types/flats";
import {
  confirmReservation,
  cancelReservation,
} from "../../../../actions/reservations";
import { reviewAidRequest } from "../../../../actions/aid";

// ---------------------------------------------------------------------------
// Acionadores de ciclo de vida que faltavam na tela de detalhe do gestor
// (P-7.9b): confirmar reserva aprovada, cancelar com justificativa e
// revisar o auxílio solicitado. As Server Actions já existem e são
// testadas (P-7.8/P-7.12) — este componente só liga a UI a elas.
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = new Set<ReservationStatus>([
  "concluida",
  "cancelada",
  "rejeitada",
]);

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

export interface LifecycleActionsProps {
  reservationId: string;
  status: ReservationStatus;
  aidRequest: AidRequest | null;
  className?: string;
}

interface CancelFormValues {
  reason: string;
}

interface AidReviewFormValues {
  dailyAllowanceAmount: string;
  transportAmount: string;
}

export function LifecycleActions({
  reservationId,
  status,
  aidRequest,
  className,
}: LifecycleActionsProps) {
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const {
    register: registerCancel,
    handleSubmit: handleCancelSubmit,
    reset: resetCancel,
    formState: { errors: cancelErrors },
  } = useForm<CancelFormValues>({ defaultValues: { reason: "" } });

  const [aidDecision, setAidDecision] = useState<
    "aprovado" | "rejeitado" | null
  >(null);
  const [aidError, setAidError] = useState<string | null>(null);
  const {
    register: registerAid,
    handleSubmit: handleAidSubmit,
    formState: { errors: aidErrors },
  } = useForm<AidReviewFormValues>({
    defaultValues: { dailyAllowanceAmount: "", transportAmount: "" },
  });

  const canConfirm = status === "aprovada";
  const canCancel = !TERMINAL_STATUSES.has(status);
  const canReviewAid =
    aidRequest !== null && aidRequest.status === "solicitado";

  if (!canConfirm && !canCancel && !canReviewAid) return null;

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
      resetCancel();
      router.refresh();
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "Falha ao cancelar a reserva.",
      );
    } finally {
      setCancelling(false);
    }
  }

  async function submitAidReview(
    decision: "aprovado" | "rejeitado",
    values: AidReviewFormValues,
  ) {
    if (!aidRequest) return;
    setAidError(null);
    try {
      const result = await reviewAidRequest({
        aidRequestId: aidRequest.id,
        decision,
        dailyAllowanceAmount:
          decision === "aprovado" && aidRequest.requestsDailyAllowance
            ? Number(values.dailyAllowanceAmount)
            : null,
        transportAmount:
          decision === "aprovado" && aidRequest.transportMode === "combustivel"
            ? Number(values.transportAmount)
            : null,
      });
      if (result?.serverError) throw new Error(result.serverError);
      if (result?.validationErrors) {
        throw new Error("Dados inválidos — revise os valores informados.");
      }
      router.refresh();
    } catch (err) {
      setAidError(
        err instanceof Error ? err.message : "Falha ao revisar o auxílio.",
      );
    } finally {
      setAidDecision(null);
    }
  }

  function handleAidReject() {
    setAidDecision("rejeitado");
    void handleAidSubmit((values) => submitAidReview("rejeitado", values))();
  }

  function handleAidApprove() {
    setAidDecision("aprovado");
    void handleAidSubmit((values) => submitAidReview("aprovado", values))();
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {(canConfirm || canCancel) && (
        <section className="flex flex-col gap-3 rounded-(--radius) border border-(--border) bg-(--surface) p-4">
          <h2 className="text-sm font-semibold text-(--fg)">
            Ações da reserva
          </h2>
          <div className="flex flex-wrap gap-3">
            {canConfirm && (
              <Button loading={confirming} onClick={() => void handleConfirm()}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Confirmar reserva
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
        </section>
      )}

      {canReviewAid && aidRequest && (
        <section className="flex flex-col gap-4 rounded-(--radius) border border-(--border) bg-(--surface) p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-(--fg)">
            <Gift className="h-4 w-4" aria-hidden="true" />
            Revisar auxílio
          </h2>

          {aidRequest.requestsDailyAllowance && (
            <FormField
              id="dailyAllowanceAmount"
              label="Valor da diária fixa"
              hint="Necessário para aprovar — sem tabela de preço definida no BRAIN"
              error={aidErrors.dailyAllowanceAmount?.message}
            >
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                {...registerAid("dailyAllowanceAmount")}
              />
            </FormField>
          )}

          {aidRequest.transportMode === "combustivel" && (
            <FormField
              id="transportAmount"
              label="Valor do transporte (combustível)"
              error={aidErrors.transportAmount?.message}
            >
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                {...registerAid("transportAmount")}
              />
            </FormField>
          )}

          {aidRequest.transportMode === "aereo" && (
            <p className="text-xs text-(--fg-muted)">
              Transporte aéreo: valor calculado automaticamente na solicitação
              (passageiros × R$ 1.000).
            </p>
          )}

          {aidError && (
            <p className="text-sm text-(--color-destructive)">{aidError}</p>
          )}

          <div className="flex gap-3 border-t border-(--divider) pt-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              loading={aidDecision === "rejeitado"}
              disabled={aidDecision !== null}
              onClick={handleAidReject}
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Rejeitar
            </Button>
            <Button
              type="button"
              className="flex-1"
              loading={aidDecision === "aprovado"}
              disabled={aidDecision !== null}
              onClick={handleAidApprove}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Aprovar
            </Button>
          </div>
        </section>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar reserva</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => void handleCancelSubmit(onCancelValid)(event)}
            noValidate
            className="flex flex-col gap-4"
          >
            <FormField
              id="reason"
              label="Justificativa"
              required
              hint="Mínimo de 10 caracteres — fica registrada no histórico de auditoria"
              error={cancelErrors.reason?.message}
            >
              <textarea
                id="reason"
                rows={3}
                className="flex w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-muted) focus-visible:outline-none focus-visible:border-(--brand) focus-visible:ring-2 focus-visible:ring-(--brand)/20"
                {...registerCancel("reason", {
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

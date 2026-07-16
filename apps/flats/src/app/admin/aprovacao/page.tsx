"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button, PageHeader } from "@hebron/ui";
import { ApprovalForm } from "../../../components/approval-form";
import {
  ApprovalQueue,
  type ApprovalQueueItem,
} from "../../../components/approval-queue";
import { ApprovalQueueSkeleton } from "../../../components/approval-queue-skeleton";
import {
  mockGuests,
  mockReservations,
  mockUnits,
} from "../../../lib/mock-data";
import type { ReviewReservationInput } from "@hebron/validators/flats";

export default function AprovacaoPage() {
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<
    Record<string, "aprovada" | "rejeitada">
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const pending: ApprovalQueueItem[] = mockReservations
    .filter(
      (reservation) =>
        reservation.status === "solicitada" && !decisions[reservation.id],
    )
    .flatMap((reservation) => {
      const guest = mockGuests.find((g) => g.id === reservation.guestId);
      return guest ? [{ reservation, guest }] : [];
    });

  const decidedCount = Object.keys(decisions).length;
  const selected = pending.find((item) => item.reservation.id === selectedId);

  function handleDecision(data: ReviewReservationInput) {
    setDecisions((prev) => ({ ...prev, [data.reservationId]: data.decision }));
    setSelectedId(null);
  }

  if (selected) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => setSelectedId(null)}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar à fila
        </Button>

        <ApprovalForm
          reservation={selected.reservation}
          guest={selected.guest}
          units={mockUnits}
          onSubmit={handleDecision}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Fila de aprovação"
        description="Ordenada por pontuação de scoring, com desempate visível conforme BRAIN §6.8."
      />

      {loading ? (
        <ApprovalQueueSkeleton />
      ) : (
        <ApprovalQueue
          items={pending}
          onApprove={(id) => setSelectedId(id)}
          onReject={(id) => setSelectedId(id)}
        />
      )}

      {decidedCount > 0 && (
        <p className="text-xs text-(--fg-muted)">
          {decidedCount} solicitaç{decidedCount > 1 ? "ões" : "ão"} decidida
          {decidedCount > 1 ? "s" : ""} nesta sessão (decisão ainda não
          persistida — depende do backend de P-7.8).
        </p>
      )}
    </div>
  );
}

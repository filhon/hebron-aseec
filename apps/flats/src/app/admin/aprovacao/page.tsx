"use client";

import { useState } from "react";
import { PageHeader } from "@hebron/ui";
import {
  ApprovalQueue,
  type ApprovalQueueItem,
} from "../../../components/approval-queue";
import { mockGuests, mockReservations } from "../../../lib/mock-data";

export default function AprovacaoPage() {
  const [decisions, setDecisions] = useState<
    Record<string, "aprovada" | "rejeitada">
  >({});

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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Fila de aprovação"
        description="Ordenada por pontuação de scoring, com desempate visível conforme BRAIN §6.8."
      />

      <ApprovalQueue
        items={pending}
        onApprove={(id) =>
          setDecisions((prev) => ({ ...prev, [id]: "aprovada" }))
        }
        onReject={(id) =>
          setDecisions((prev) => ({ ...prev, [id]: "rejeitada" }))
        }
      />

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

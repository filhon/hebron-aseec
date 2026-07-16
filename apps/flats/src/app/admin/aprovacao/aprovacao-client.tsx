"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@hebron/ui";
import { ApprovalForm } from "../../../components/approval-form";
import {
  ApprovalQueue,
  type ApprovalQueueItem,
} from "../../../components/approval-queue";
import type { ReservationWithGuest } from "../../../lib/queries";
import type { Unit } from "@hebron/types/flats";

export interface AprovacaoClientProps {
  pending: ReservationWithGuest[];
  units: Unit[];
}

export function AprovacaoClient({ pending, units }: AprovacaoClientProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items: ApprovalQueueItem[] = pending.map((item) => ({
    reservation: item.reservation,
    guest: item.guest,
  }));

  const selected = items.find((item) => item.reservation.id === selectedId);

  function handleDecided() {
    setSelectedId(null);
    router.refresh();
  }

  if (selected) {
    return (
      <>
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
          units={units}
          onSubmit={handleDecided}
        />
      </>
    );
  }

  return (
    <ApprovalQueue
      items={items}
      onApprove={(id) => setSelectedId(id)}
      onReject={(id) => setSelectedId(id)}
    />
  );
}

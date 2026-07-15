"use client";

import { useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@hebron/ui";
import type { ReservationStatus } from "@hebron/types/flats";

export interface StatusActionsProps {
  status: ReservationStatus;
}

export function StatusActions({ status }: StatusActionsProps) {
  const [localStatus, setLocalStatus] = useState(status);
  const [note, setNote] = useState<string | null>(null);

  if (localStatus === "confirmada") {
    return (
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={() => {
            setLocalStatus("em_curso");
            setNote(
              `Check-in registrado presencialmente em ${new Date().toLocaleString("pt-BR")}.`,
            );
          }}
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Registrar check-in
        </Button>
        <p className="text-xs text-(--fg-muted)">
          Check-in é presencial na recepção do condomínio — sem checklist de
          inventário (BRAIN §6.8).
        </p>
      </div>
    );
  }

  if (localStatus === "em_curso") {
    return (
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setLocalStatus("concluida");
            setNote(
              `Check-out registrado em ${new Date().toLocaleString("pt-BR")}.`,
            );
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Registrar check-out
        </Button>
      </div>
    );
  }

  if (note) {
    return <p className="text-xs text-(--fg-muted)">{note}</p>;
  }

  return null;
}

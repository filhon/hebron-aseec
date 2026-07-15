"use client";

import { Car, Gift, MapPin } from "lucide-react";
import type {
  Guest,
  MinistryType,
  Reservation,
  ReservationStatus,
  Unit,
} from "@hebron/types/flats";

export interface ReservationCardProps {
  reservation: Reservation;
  guest: Guest;
  unit?: Unit | null;
  onAction?: (action: "approve" | "reject" | "cancel") => void;
  className?: string;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const MINISTRY_TYPE_LABEL: Record<MinistryType, string> = {
  pastor: "Pastor",
  missionario: "Missionário",
  conjuge_pastor: "Cônjuge de pastor",
  conjuge_missionario: "Cônjuge de missionário",
};

const STATUS_CONFIG: Record<
  ReservationStatus,
  { label: string; pill: string }
> = {
  solicitada: {
    label: "Solicitada",
    pill: "bg-(--hb-cyan-muted) text-(--hb-cyan-deep)",
  },
  aprovada: {
    label: "Aprovada",
    pill: "bg-(--hb-green-muted) text-(--hb-green-deep)",
  },
  rejeitada: {
    label: "Rejeitada",
    pill: "bg-(--color-destructive-muted) text-(--color-destructive)",
  },
  confirmada: {
    label: "Confirmada",
    pill: "bg-(--brand-muted) text-(--brand)",
  },
  em_curso: {
    label: "Em curso",
    pill: "bg-(--hb-orange-muted) text-(--hb-orange-deep)",
  },
  concluida: {
    label: "Concluída",
    pill: "bg-(--surface-alt) text-(--fg-muted)",
  },
  cancelada: {
    label: "Cancelada",
    pill: "bg-(--surface-alt) text-(--fg-subtle)",
  },
};

export function ReservationCard({
  reservation,
  guest,
  unit,
  onAction,
  className,
}: ReservationCardProps) {
  const statusCfg = STATUS_CONFIG[reservation.status];
  const period = reservation.confirmedPeriod ?? reservation.preferredPeriods[0];
  const periodLabel = reservation.confirmedPeriod
    ? `${fmtDate(period.start)} – ${fmtDate(period.end)}`
    : `${fmtDate(period.start)} – ${fmtDate(period.end)} (preferência 1ª)`;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-(--radius) border border-(--border) bg-(--surface) p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-(--fg)">
            {guest.responsibleName}
          </p>
          <p className="text-xs text-(--fg-muted)">
            {MINISTRY_TYPE_LABEL[guest.ministryType]}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-(--radius-pill) px-2.5 py-0.5 text-xs font-semibold",
            statusCfg.pill,
          )}
        >
          {statusCfg.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-(--fg-muted)">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {periodLabel}
        </span>
        {unit && <span>{unit.name}</span>}
        {reservation.arrivesByCar && (
          <span className="flex items-center gap-1.5" title="Chega de carro">
            <Car className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        {reservation.aidRequest && (
          <span
            className="flex items-center gap-1.5"
            title="Auxílio solicitado"
          >
            <Gift className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>

      <p className="line-clamp-2 text-sm text-(--fg-muted)">
        {reservation.purpose}
      </p>

      {reservation.scoring && (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-(--fg)">
            {reservation.scoring.totalPoints} pts
          </span>
          <span className="text-(--fg-subtle)">de score</span>
        </div>
      )}

      {reservation.managerNotes && (
        <p className="border-t border-(--divider) pt-2 text-xs italic text-(--fg-muted)">
          {reservation.managerNotes}
        </p>
      )}

      {onAction && reservation.status === "solicitada" && (
        <div className="mt-1 flex gap-2 border-t border-(--divider) pt-3">
          <button
            type="button"
            onClick={() => onAction("approve")}
            className="flex-1 rounded-(--radius) bg-(--brand) py-2 text-xs font-semibold text-(--brand-fg) transition-colors duration-(--transition-fast) hover:bg-(--hb-blue-soft)"
          >
            Aprovar
          </button>
          <button
            type="button"
            onClick={() => onAction("reject")}
            className="flex-1 rounded-(--radius) border border-(--border) py-2 text-xs font-semibold text-(--fg) transition-colors duration-(--transition-fast) hover:bg-(--surface-alt)"
          >
            Rejeitar
          </button>
        </div>
      )}
    </div>
  );
}

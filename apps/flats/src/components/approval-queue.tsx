"use client";

import { Avatar } from "@hebron/ui";
import type {
  Guest,
  LastRestOutsideCity,
  Reservation,
} from "@hebron/types/flats";

export interface ApprovalQueueItem {
  reservation: Reservation;
  guest: Guest;
}

export interface ApprovalQueueProps {
  items: ApprovalQueueItem[];
  onApprove?: (reservationId: string) => void;
  onReject?: (reservationId: string) => void;
  className?: string;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function ageInYears(birthDate: Date, reference = new Date()): number {
  let age = reference.getFullYear() - birthDate.getFullYear();
  const hasNotHadBirthdayYet =
    reference.getMonth() < birthDate.getMonth() ||
    (reference.getMonth() === birthDate.getMonth() &&
      reference.getDate() < birthDate.getDate());
  if (hasNotHadBirthdayYet) age -= 1;
  return age;
}

// Desempate (BRAIN §6.8): 1) idade (mais velho prioriza), 2) mais tempo sem
// descanso fora, 3) nunca usou o flat, 4) sorteio.
const REST_RANK: Record<LastRestOutsideCity, number> = {
  mais_de_2_anos: 2,
  entre_1_e_2_anos: 1,
  menos_de_1_ano: 0,
};

function compareItems(a: ApprovalQueueItem, b: ApprovalQueueItem): number {
  const scoreA = a.reservation.scoring?.totalPoints ?? 0;
  const scoreB = b.reservation.scoring?.totalPoints ?? 0;
  if (scoreA !== scoreB) return scoreB - scoreA;

  const ageA = ageInYears(a.guest.responsibleBirthDate);
  const ageB = ageInYears(b.guest.responsibleBirthDate);
  if (ageA !== ageB) return ageB - ageA;

  const restA = a.reservation.scoring
    ? REST_RANK[a.reservation.scoring.lastRestOutsideCity]
    : -1;
  const restB = b.reservation.scoring
    ? REST_RANK[b.reservation.scoring.lastRestOutsideCity]
    : -1;
  if (restA !== restB) return restB - restA;

  const neverA = a.reservation.scoring?.usageFrequency === "nunca" ? 1 : 0;
  const neverB = b.reservation.scoring?.usageFrequency === "nunca" ? 1 : 0;
  return neverB - neverA;
}

function tieBreakReason(
  current: ApprovalQueueItem,
  previous: ApprovalQueueItem | undefined,
): string | null {
  if (!previous) return null;

  const scoreCurrent = current.reservation.scoring?.totalPoints ?? 0;
  const scorePrevious = previous.reservation.scoring?.totalPoints ?? 0;
  if (scoreCurrent !== scorePrevious) return null;

  const ageCurrent = ageInYears(current.guest.responsibleBirthDate);
  const agePrevious = ageInYears(previous.guest.responsibleBirthDate);
  if (ageCurrent !== agePrevious) {
    return `Empate — decidido pela idade (${agePrevious} vs. ${ageCurrent} anos)`;
  }

  const restCurrent = current.reservation.scoring
    ? REST_RANK[current.reservation.scoring.lastRestOutsideCity]
    : -1;
  const restPrevious = previous.reservation.scoring
    ? REST_RANK[previous.reservation.scoring.lastRestOutsideCity]
    : -1;
  if (restCurrent !== restPrevious) {
    return "Empate — decidido pelo tempo sem descanso fora da cidade";
  }

  const neverCurrent = current.reservation.scoring?.usageFrequency === "nunca";
  const neverPrevious =
    previous.reservation.scoring?.usageFrequency === "nunca";
  if (neverCurrent !== neverPrevious) {
    return "Empate — decidido por nunca ter usado o flat";
  }

  return "Empate total — aguardando sorteio";
}

export function ApprovalQueue({
  items,
  onApprove,
  onReject,
  className,
}: ApprovalQueueProps) {
  const sorted = [...items].sort(compareItems);

  if (sorted.length === 0) {
    return (
      <div
        className={cn(
          "rounded-(--radius) border border-(--border) bg-(--surface) p-6 text-center text-sm text-(--fg-muted)",
          className,
        )}
      >
        Nenhuma reserva pendente de aprovação.
      </div>
    );
  }

  return (
    <ol className={cn("flex flex-col gap-3", className)}>
      {sorted.map((item, index) => {
        const reason = tieBreakReason(item, sorted[index - 1]);
        const score = item.reservation.scoring?.totalPoints ?? 0;

        return (
          <li
            key={item.reservation.id}
            className="flex flex-col gap-3 rounded-(--radius) border border-(--border) bg-(--surface) p-4"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--surface-alt) text-xs font-bold text-(--fg-muted)"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <Avatar name={item.guest.responsibleName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-(--fg)">
                  {item.guest.responsibleName}
                </p>
                <p className="text-xs text-(--fg-muted)">
                  {item.reservation.purpose}
                </p>
              </div>
              <span
                className="shrink-0 text-lg font-bold tabular-nums text-(--fg)"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {score}
                <span className="text-xs font-normal text-(--fg-muted)">
                  {" "}
                  pts
                </span>
              </span>
            </div>

            {reason && (
              <p className="rounded-(--radius-sm) bg-(--hb-orange-muted) px-3 py-1.5 text-xs text-(--hb-orange-deep)">
                {reason}
              </p>
            )}

            {(onApprove || onReject) && (
              <div className="flex gap-2 border-t border-(--divider) pt-3">
                {onApprove && (
                  <button
                    type="button"
                    onClick={() => onApprove(item.reservation.id)}
                    className="flex-1 rounded-(--radius) bg-(--brand) py-2 text-xs font-semibold text-(--brand-fg) transition-colors duration-(--transition-fast) hover:bg-(--hb-blue-soft)"
                  >
                    Aprovar
                  </button>
                )}
                {onReject && (
                  <button
                    type="button"
                    onClick={() => onReject(item.reservation.id)}
                    className="flex-1 rounded-(--radius) border border-(--border) py-2 text-xs font-semibold text-(--fg) transition-colors duration-(--transition-fast) hover:bg-(--surface-alt)"
                  >
                    Rejeitar
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

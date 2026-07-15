import { Avatar } from "@hebron/ui";
import type { Companion, Guest, MinistryType } from "@hebron/types/flats";

export interface GuestListProps {
  guest: Guest;
  className?: string;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function formatCpf(cpf: string): string {
  if (cpf.length !== 11) return cpf;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
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

const MINISTRY_TYPE_LABEL: Record<MinistryType, string> = {
  pastor: "Pastor",
  missionario: "Missionário",
  conjuge_pastor: "Cônjuge de pastor",
  conjuge_missionario: "Cônjuge de missionário",
};

function CompanionRow({ companion }: { companion: Companion }) {
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-(--fg)">{companion.name}</p>
        <p className="text-xs text-(--fg-muted)">{formatCpf(companion.cpf)}</p>
      </div>
      <span className="shrink-0 text-xs text-(--fg-muted)">
        {ageInYears(companion.birthDate)} anos
      </span>
    </li>
  );
}

export function GuestList({ guest, className }: GuestListProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-(--radius) border border-(--border) bg-(--surface) p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={guest.responsibleName} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-(--fg)">
            {guest.responsibleName}
          </p>
          <p className="text-xs text-(--fg-muted)">
            {MINISTRY_TYPE_LABEL[guest.ministryType]} ·{" "}
            {formatCpf(guest.responsibleCpf)}
          </p>
          <p className="text-xs text-(--fg-muted)">
            {guest.responsibleEmail} · {guest.responsiblePhone}
          </p>
        </div>
      </div>

      {guest.companions.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-(--fg-subtle)">
            Acompanhantes ({guest.companions.length})
          </p>
          <ul className="divide-y divide-(--divider)">
            {guest.companions.map((companion) => (
              <CompanionRow key={companion.id} companion={companion} />
            ))}
          </ul>
        </div>
      )}

      {guest.youngChildren.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-(--fg-subtle)">
            Crianças menores de 3 anos ({guest.youngChildren.length})
          </p>
          <ul className="divide-y divide-(--divider)">
            {guest.youngChildren.map((child) => (
              <CompanionRow key={child.id} companion={child} />
            ))}
          </ul>
          <p className="mt-1 text-xs text-(--fg-subtle)">
            Não contam na capacidade da unidade.
          </p>
        </div>
      )}

      {guest.companions.length === 0 && guest.youngChildren.length === 0 && (
        <p className="text-sm text-(--fg-muted)">
          Nenhum acompanhante informado.
        </p>
      )}
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  Infinity as InfinityIcon,
  XCircle,
} from "lucide-react";

/**
 * "closing_soon" não existia em nenhuma implementação anterior — consolidado
 * a partir do design-ref (aberto/encerra em breve/encerrado/permanente).
 * Limiar de 7 dias alinhado ao padrão de lembretes automáticos (BRAIN.md).
 */
const CLOSING_SOON_DAYS = 7;

export type EditalStatus =
  | "open"
  | "upcoming"
  | "closing_soon"
  | "closed"
  | "permanent";

interface EditalStatusConfig {
  label: string;
  dotColor: string;
  badgeClass: string;
  Icon: LucideIcon;
}

export const EDITAL_STATUS: Record<EditalStatus, EditalStatusConfig> = {
  open: {
    label: "Aberto",
    dotColor: "var(--hb-green)",
    badgeClass: "bg-(--hb-green-muted) text-(--hb-green-fg)",
    Icon: CheckCircle2,
  },
  upcoming: {
    label: "Em breve",
    dotColor: "var(--hb-orange)",
    badgeClass: "bg-(--hb-orange-muted) text-(--hb-orange-deep)",
    Icon: CalendarClock,
  },
  closing_soon: {
    label: "Encerra em breve",
    dotColor: "var(--hb-orange)",
    badgeClass: "bg-(--hb-orange-muted) text-(--hb-orange-deep)",
    Icon: AlarmClock,
  },
  closed: {
    label: "Encerrado",
    dotColor: "var(--hb-red)",
    badgeClass: "bg-(--color-destructive-muted) text-(--hb-red)",
    Icon: XCircle,
  },
  permanent: {
    label: "Permanente",
    dotColor: "var(--hb-cyan)",
    badgeClass: "bg-(--hb-cyan-muted) text-(--hb-cyan-fg)",
    Icon: InfinityIcon,
  },
};

export function resolveEditalStatus({
  opensAt,
  closesAt,
}: {
  opensAt: Date | null;
  closesAt: Date | null;
}): EditalStatus {
  if (!opensAt && !closesAt) return "permanent";

  const now = new Date();
  if (opensAt && now < new Date(opensAt)) return "upcoming";

  if (closesAt) {
    const closes = new Date(closesAt);
    if (now > closes) return "closed";
    const daysToClose =
      (closes.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysToClose <= CLOSING_SOON_DAYS) return "closing_soon";
  }

  return "open";
}

export interface EditalStatusPillProps {
  status: EditalStatus;
  size?: "sm" | "md";
  withIcon?: boolean;
  className?: string;
}

export function EditalStatusPill({
  status,
  size = "sm",
  withIcon = true,
  className = "",
}: EditalStatusPillProps) {
  const cfg = EDITAL_STATUS[status];
  const Icon = cfg.Icon;

  return (
    <span
      className={`hb-badge ${size === "md" ? "text-[12.5px] px-3 py-1" : ""} ${cfg.badgeClass} ${className}`}
    >
      <span
        className="hb-badge-dot"
        style={{ backgroundColor: cfg.dotColor }}
      />
      {withIcon && <Icon size={size === "md" ? 12 : 11} aria-hidden="true" />}
      {cfg.label}
    </span>
  );
}

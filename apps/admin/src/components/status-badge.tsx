import type { UserStatus } from "@hebron/types/admin";
import type { InvitationStatus } from "@hebron/types/admin";

type AnyStatus = UserStatus | InvitationStatus;

interface StatusBadgeProps {
  status: AnyStatus;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<
  AnyStatus,
  { label: string; bg: string; color: string }
> = {
  // UserStatus
  active: {
    label: "Ativo",
    bg: "var(--color-support-green)",
    color: "var(--color-support-green-foreground)",
  },
  suspended: {
    label: "Suspenso",
    bg: "var(--color-destructive)",
    color: "var(--color-destructive-foreground)",
  },
  pending_approval: {
    label: "Pend. aprovação",
    bg: "var(--color-accent)",
    color: "var(--color-accent-foreground)",
  },
  invited: {
    label: "Convidado",
    bg: "var(--color-support-sky)",
    color: "var(--color-support-sky-foreground)",
  },
  // InvitationStatus
  pending: {
    label: "Pendente",
    bg: "var(--color-accent)",
    color: "var(--color-accent-foreground)",
  },
  accepted: {
    label: "Aceito",
    bg: "var(--color-support-green)",
    color: "var(--color-support-green-foreground)",
  },
  expired: {
    label: "Expirado",
    bg: "var(--color-primary-muted)",
    color: "var(--color-primary)",
  },
  revoked: {
    label: "Revogado",
    bg: "var(--color-destructive)",
    color: "var(--color-destructive-foreground)",
  },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const { label, bg, color } = STATUS_CONFIG[status];

  return (
    <span
      style={{
        backgroundColor: bg,
        color,
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "var(--radius-full)",
        fontWeight: "var(--font-weight-medium)",
        fontSize: size === "sm" ? "var(--text-xs)" : "var(--text-sm)",
        padding: size === "sm" ? "0.125rem 0.5rem" : "0.25rem 0.625rem",
        whiteSpace: "nowrap",
        lineHeight: "var(--leading-tight)",
      }}
    >
      {label}
    </span>
  );
}

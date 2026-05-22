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
  active: { label: "Ativo", bg: "#a1c520", color: "#1d2800" },
  suspended: { label: "Suspenso", bg: "#c0392b", color: "#fff" },
  pending_approval: { label: "Pend. aprovação", bg: "#d97706", color: "#fff" },
  invited: { label: "Convidado", bg: "#07b4e7", color: "#003a52" },
  // InvitationStatus
  pending: { label: "Pendente", bg: "#d97706", color: "#fff" },
  accepted: { label: "Aceito", bg: "#a1c520", color: "#1d2800" },
  expired: { label: "Expirado", bg: "#64748b", color: "#fff" },
  revoked: { label: "Revogado", bg: "#c0392b", color: "#fff" },
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

import type { Role } from "@hebron/types/roles";

interface RoleBadgeProps {
  role: Role;
  size?: "sm" | "md";
}

const ROLE_CONFIG: Record<Role, { label: string; bg: string; color: string }> =
  {
    super_admin: {
      label: "Super Admin",
      bg: "var(--color-primary)",
      color: "var(--color-primary-foreground)",
    },
    diretor: {
      label: "Diretor",
      bg: "var(--color-accent)",
      color: "var(--color-accent-foreground)",
    },
    conselheiro: {
      label: "Conselheiro",
      bg: "var(--color-support-sky)",
      color: "var(--color-support-sky-foreground)",
    },
    colaborador: {
      label: "Colaborador",
      bg: "var(--color-support-green)",
      color: "var(--color-support-green-foreground)",
    },
    submissor: {
      label: "Submissor",
      bg: "var(--color-accent-muted)",
      color: "var(--color-accent)",
    },
    aluno: {
      label: "Aluno",
      bg: "var(--color-support-sky-muted)",
      color: "var(--color-support-sky-foreground)",
    },
    hospede: {
      label: "Hóspede",
      bg: "var(--color-primary-muted)",
      color: "var(--color-primary)",
    },
    ouvinte: {
      label: "Ouvinte",
      bg: "var(--color-support-green-muted)",
      color: "var(--color-support-green-foreground)",
    },
  };

export function RoleBadge({ role, size = "md" }: RoleBadgeProps) {
  const { label, bg, color } = ROLE_CONFIG[role];

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

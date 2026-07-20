import type { Role } from "@hebron/types/roles";

interface RoleBadgeProps {
  role: Role;
  size?: "sm" | "md";
}

const ROLE_CONFIG: Record<Role, { label: string; bg: string; color: string }> =
  {
    super_admin: {
      label: "Super Admin",
      bg: "var(--hb-blue)",
      color: "var(--brand-fg)",
    },
    diretor: {
      label: "Diretor",
      bg: "var(--hb-orange)",
      color: "var(--fg-invert)",
    },
    conselheiro: {
      label: "Conselheiro",
      bg: "var(--hb-cyan)",
      color: "var(--hb-cyan-fg)",
    },
    colaborador: {
      label: "Colaborador",
      bg: "var(--hb-green)",
      color: "var(--hb-green-fg)",
    },
    submissor: {
      label: "Submissor",
      bg: "var(--hb-orange-muted)",
      color: "var(--hb-orange)",
    },
    aluno: {
      label: "Aluno",
      bg: "var(--hb-cyan-muted)",
      color: "var(--hb-cyan-fg)",
    },
    hospede: {
      label: "Hóspede",
      bg: "var(--brand-muted)",
      color: "var(--hb-blue)",
    },
    ouvinte: {
      label: "Ouvinte",
      bg: "var(--hb-green-muted)",
      color: "var(--hb-green-fg)",
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

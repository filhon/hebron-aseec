import type { Role } from "@hebron/types/roles";

interface RoleBadgeProps {
  role: Role;
  size?: "sm" | "md";
}

const ROLE_CONFIG: Record<Role, { label: string; bg: string; color: string }> =
  {
    super_admin: { label: "Super Admin", bg: "#202c85", color: "#fff" },
    diretor: { label: "Diretor", bg: "#4338ca", color: "#fff" },
    conselheiro: { label: "Conselheiro", bg: "#7c3aed", color: "#fff" },
    colaborador: { label: "Colaborador", bg: "#a1c520", color: "#1d2800" },
    submissor: { label: "Submissor", bg: "#ea5a06", color: "#fff" },
    aluno: { label: "Aluno", bg: "#07b4e7", color: "#003a52" },
    hospede: { label: "Hóspede", bg: "#64748b", color: "#fff" },
    ouvinte: { label: "Ouvinte", bg: "#d97706", color: "#fff" },
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

import type { Organization } from "@hebron/types";

function formatDate(d: Date | null): string {
  if (d === null) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function countryFlag(country: string): string {
  const flags: Record<string, string> = {
    Brasil: "🇧🇷",
    Moçambique: "🇲🇿",
    Portugal: "🇵🇹",
    Índia: "🇮🇳",
    Angola: "🇦🇴",
  };
  return flags[country] ?? "🌍";
}

export interface OrganizationCardProps {
  organization: Organization;
  projectCount?: number;
  compact?: boolean;
  className?: string;
}

export function OrganizationCard({
  organization,
  projectCount,
  compact = false,
  className,
}: OrganizationCardProps) {
  const isApproved = organization.approvedAt !== null;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 rounded-sm border border-(--border) bg-(--surface) px-3 py-2.5 shadow-(--shadow-xs) ${className ?? ""}`}
      >
        <span className="text-xl leading-none" aria-hidden>
          {countryFlag(organization.country)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-(--fg) truncate">
            {organization.name}
          </p>
          <p className="text-xs text-(--fg-muted)">
            {[organization.city, organization.state, organization.country]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        {isApproved ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-label="Aprovada"
          >
            <circle cx="8" cy="8" r="7" fill="var(--hb-green-muted)" />
            <path
              d="M5 8l2 2 4-4"
              stroke="var(--hb-green-fg)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-label="Pendente de aprovação"
          >
            <circle cx="8" cy="8" r="7" fill="var(--hb-orange-muted)" />
            <path
              d="M8 5v3.5M8 10.5v.5"
              stroke="var(--hb-orange-deep)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border border-(--border) bg-(--surface) shadow-(--shadow-sm) overflow-hidden ${className ?? ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-(--border)">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl leading-none shrink-0" aria-hidden>
            {countryFlag(organization.country)}
          </span>
          <div className="min-w-0">
            <h3
              className="text-lg font-semibold text-(--fg) leading-snug"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {organization.name}
            </h3>
            {organization.cnpj && (
              <p className="text-xs text-(--fg-muted) mt-0.5 font-mono">
                {organization.cnpj}
              </p>
            )}
          </div>
        </div>

        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={
            isApproved
              ? {
                  backgroundColor: "var(--hb-green-muted)",
                  color: "var(--hb-green-fg)",
                }
              : {
                  backgroundColor: "var(--hb-orange-muted)",
                  color: "var(--hb-orange-deep)",
                }
          }
        >
          {isApproved ? "Aprovada" : "Pendente"}
        </span>
      </div>

      {/* Details */}
      <div className="p-5 flex flex-col gap-4">
        {/* Description */}
        {organization.description && (
          <p className="text-sm text-(--fg) leading-relaxed">
            {organization.description}
          </p>
        )}

        {/* Location grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <div>
            <p className="text-xs text-(--fg-muted) font-medium uppercase tracking-wider mb-0.5">
              Região
            </p>
            <p className="text-sm text-(--fg)">{organization.region}</p>
          </div>

          {organization.city && (
            <div>
              <p className="text-xs text-(--fg-muted) font-medium uppercase tracking-wider mb-0.5">
                Cidade
              </p>
              <p className="text-sm text-(--fg)">
                {organization.city}
                {organization.state ? `, ${organization.state}` : ""}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs text-(--fg-muted) font-medium uppercase tracking-wider mb-0.5">
              País
            </p>
            <p className="text-sm text-(--fg)">{organization.country}</p>
          </div>

          {projectCount !== undefined && (
            <div>
              <p className="text-xs text-(--fg-muted) font-medium uppercase tracking-wider mb-0.5">
                Projetos
              </p>
              <p className="text-sm text-(--fg) font-semibold">
                {projectCount}
              </p>
            </div>
          )}
        </div>

        {/* Contact */}
        {(organization.contactName ??
          organization.email ??
          organization.phone) && (
          <div className="border-t border-(--border) pt-4 flex flex-col gap-1.5">
            <p className="text-xs text-(--fg-muted) font-medium uppercase tracking-wider mb-0.5">
              Contato
            </p>
            {organization.contactName && (
              <p className="text-sm text-(--fg) font-medium">
                {organization.contactName}
              </p>
            )}
            {organization.email && (
              <p className="text-sm text-(--fg-muted)">{organization.email}</p>
            )}
            {organization.phone && (
              <p className="text-sm text-(--fg-muted)">{organization.phone}</p>
            )}
          </div>
        )}

        {/* Approval info */}
        {isApproved && (
          <p className="text-xs text-(--fg-muted)">
            Aprovada em {formatDate(organization.approvedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

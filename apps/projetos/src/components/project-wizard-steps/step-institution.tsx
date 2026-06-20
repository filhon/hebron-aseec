"use client";

import { useState } from "react";
import type { Organization } from "@hebron/types";
import { Search, Check, MapPin, Building2 } from "lucide-react";
import type { StepProps } from "../project-wizard";

// ─── Local primitives ─────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs mt-1.5" style={{ color: "var(--color-destructive)" }}>
      {message}
    </p>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrgFlag(country: string): string {
  const flags: Record<string, string> = {
    Brasil: "🇧🇷",
    Moçambique: "🇲🇿",
    Portugal: "🇵🇹",
    Angola: "🇦🇴",
    "Cabo Verde": "🇨🇻",
    Gana: "🇬🇭",
    Quênia: "🇰🇪",
  };
  return flags[country] ?? "🌍";
}

function matchesQuery(org: Organization, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    org.name.toLowerCase().includes(lower) ||
    (org.city ?? "").toLowerCase().includes(lower) ||
    (org.state ?? "").toLowerCase().includes(lower) ||
    org.country.toLowerCase().includes(lower) ||
    org.region.toLowerCase().includes(lower)
  );
}

// ─── StepInstitution ──────────────────────────────────────────────────────────

interface InstitutionStepProps extends StepProps {
  organizations: Organization[];
}

export function StepInstitution({
  data,
  errors,
  onChange,
  organizations,
}: InstitutionStepProps) {
  const [query, setQuery] = useState("");

  const filtered = organizations.filter((o) => matchesQuery(o, query));
  const selected = organizations.find((o) => o.id === data.organizacaoId);

  return (
    <div className="flex flex-col gap-5">
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--fg-muted)" }}
      >
        Selecione a instituição que submeterá este projeto anual. Caso sua
        organização ainda não esteja cadastrada, entre em contato com a
        diretoria.
      </p>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--fg-muted)" }}
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, cidade ou país…"
          className="w-full rounded-[--radius] border pl-10 pr-4 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-alt)",
            color: "var(--fg)",
          }}
          aria-label="Buscar instituição"
        />
      </div>

      {/* Organization list */}
      <div
        className="flex flex-col gap-2"
        role="listbox"
        aria-label="Instituições disponíveis"
      >
        {filtered.length === 0 ? (
          <div
            className="rounded-[--radius-md] border border-dashed py-8 flex flex-col items-center gap-2"
            style={{ borderColor: "var(--border)" }}
          >
            <Building2
              className="w-8 h-8"
              style={{ color: "var(--fg-subtle)" }}
              aria-hidden
            />
            <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
              Nenhuma instituição encontrada
            </p>
          </div>
        ) : (
          filtered.map((org) => {
            const isSelected = org.id === data.organizacaoId;
            return (
              <button
                key={org.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onChange({ organizacaoId: org.id })}
                className="flex items-center gap-4 rounded-[--radius-md] border-2 px-4 py-3.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                style={{
                  borderColor: isSelected ? "var(--hb-blue)" : "var(--border)",
                  backgroundColor: isSelected
                    ? "var(--hb-gray-50)"
                    : "var(--surface)",
                }}
              >
                <span className="text-xl shrink-0" aria-hidden>
                  {getOrgFlag(org.country)}
                </span>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold leading-snug"
                    style={{
                      color: isSelected ? "var(--hb-blue)" : "var(--fg)",
                    }}
                  >
                    {org.name}
                  </p>
                  <p
                    className="text-xs mt-0.5 flex items-center gap-1"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    <MapPin className="w-3 h-3 shrink-0" aria-hidden />
                    {[org.city, org.state, org.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {org.contactName && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      Responsável: {org.contactName}
                    </p>
                  )}
                </div>

                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    borderColor: isSelected
                      ? "var(--hb-blue)"
                      : "var(--border)",
                    backgroundColor: isSelected
                      ? "var(--hb-blue)"
                      : "transparent",
                  }}
                  aria-hidden
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })
        )}
      </div>

      <FieldError message={errors.organizacaoId} />

      {/* Selected summary */}
      {selected && (
        <div
          className="rounded-[--radius] border px-4 py-3 flex items-center gap-3"
          style={{
            borderColor: "var(--hb-blue)",
            backgroundColor: "var(--hb-gray-50)",
          }}
        >
          <Check
            className="w-4 h-4 shrink-0"
            style={{ color: "var(--hb-blue)" }}
            aria-hidden
          />
          <p className="text-sm" style={{ color: "var(--hb-blue)" }}>
            <span className="font-semibold">{selected.name}</span> selecionada
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { Check } from "lucide-react";
import { FieldLabel, FieldError } from "./field-controls";
import type { OrgOption } from "../../lib/queries";
import type { WizardFormData } from "../project-wizard";

export function StepInstitution({
  data,
  onChange,
  orgs,
  orgsLoading,
  error,
}: {
  data: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
  orgs: OrgOption[];
  orgsLoading: boolean;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-(--fg-muted) mb-4 leading-relaxed">
          Selecione a instituição que submeterá este projeto. Caso sua
          organização ainda não esteja cadastrada, entre em contato com a
          diretoria.
        </p>

        {orgsLoading ? (
          <p className="text-sm text-(--fg-muted)">
            Carregando instituições...
          </p>
        ) : orgs.length === 0 ? (
          <div
            className="rounded-md border border-dashed border-(--border) px-4 py-6 text-center"
            style={{ backgroundColor: "var(--surface-alt)" }}
          >
            <p className="text-sm text-(--fg-muted)">
              Nenhuma instituição encontrada. Entre em contato com a diretoria.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {orgs.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => onChange({ orgId: org.id })}
                className="flex items-center gap-4 rounded-md border-2 px-4 py-3 text-left transition-all duration-(--dur-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
                style={{
                  borderColor:
                    data.orgId === org.id ? "var(--hb-blue)" : "var(--border)",
                  backgroundColor:
                    data.orgId === org.id
                      ? "var(--brand-muted)"
                      : "var(--surface)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-base"
                  style={{
                    backgroundColor: "var(--hb-blue)",
                    color: "var(--fg-invert)",
                  }}
                >
                  🏛️
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color:
                        data.orgId === org.id ? "var(--hb-blue)" : "var(--fg)",
                    }}
                  >
                    {org.nome}
                  </p>
                  {org.cnpj && (
                    <p className="text-xs text-(--fg-muted)">
                      CNPJ: {org.cnpj}
                    </p>
                  )}
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{
                    borderColor:
                      data.orgId === org.id
                        ? "var(--hb-blue)"
                        : "var(--border)",
                    backgroundColor:
                      data.orgId === org.id ? "var(--hb-blue)" : "transparent",
                  }}
                >
                  {data.orgId === org.id && (
                    <Check className="w-3 h-3 text-white" aria-hidden />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        <FieldError id="orgId-error" error={error} />
      </div>

      <div>
        <FieldLabel required>Tipo de Projeto</FieldLabel>
        <div className="flex gap-3">
          {(["anual", "pontual"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ projectType: type })}
              className="flex-1 rounded-md border-2 px-4 py-3 text-sm font-semibold transition-all duration-(--dur-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
              style={{
                borderColor:
                  data.projectType === type
                    ? "var(--hb-blue)"
                    : "var(--border)",
                backgroundColor:
                  data.projectType === type
                    ? "var(--brand-muted)"
                    : "var(--surface)",
                color:
                  data.projectType === type
                    ? "var(--hb-blue)"
                    : "var(--fg-muted)",
              }}
            >
              {type === "anual" ? "Projeto Anual" : "Projeto Pontual"}
            </button>
          ))}
        </div>
        <p className="text-xs text-(--fg-muted) mt-2">
          {data.projectType === "anual"
            ? "Projetos anuais têm duração de 12 meses e são vinculados a um edital."
            : "Projetos pontuais são solicitações emergenciais sem vínculo com edital."}
        </p>
      </div>
    </div>
  );
}

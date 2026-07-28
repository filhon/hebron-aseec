"use client";

import { PROJECT_CATEGORY_OPTIONS as CATEGORIAS } from "@hebron/integrations/documentos-projetos-client";
import { BRL, MONTHS } from "./field-controls";
import type { WizardFormData } from "../project-wizard";
import type { OrgOption } from "../../lib/queries";

export function StepReview({
  data,
  orgs,
}: {
  data: WizardFormData;
  orgs: OrgOption[];
}) {
  const org = orgs.find((o) => o.id === data.orgId);
  const categoria = CATEGORIAS.find((c) => c.value === data.categoria);
  const total = parseFloat(data.valorTotal) || 0;
  const parcelas = parseInt(data.numeroParcelas) || 1;

  const sections = [
    {
      title: "Instituição",
      items: [
        { label: "Organização", value: org?.nome ?? "Não selecionada" },
        {
          label: "Tipo",
          value:
            data.projectType === "anual" ? "Projeto Anual" : "Projeto Pontual",
        },
      ],
    },
    {
      title: "Proposta",
      items: [
        { label: "Título", value: data.titulo || "—" },
        { label: "Categoria", value: categoria?.label ?? "—" },
        {
          label: "Beneficiários",
          value: data.beneficiariosQuantidade
            ? `${data.beneficiariosQuantidade} pessoas`
            : "—",
        },
        ...(data.projectType === "anual"
          ? [
              { label: "Região", value: data.regiao || "—" },
              { label: "País", value: data.pais || "—" },
            ]
          : [
              {
                label: "Prazo de necessidade",
                value: data.prazoNecessidade || "—",
              },
            ]),
      ],
    },
    {
      title: "Orçamento",
      items: [
        {
          label: "Valor total",
          value: total > 0 ? BRL.format(total) : "—",
        },
        ...(data.projectType === "anual"
          ? [{ label: "Parcelas", value: `${parcelas}x` }]
          : []),
      ],
    },
    ...(data.projectType === "anual"
      ? [
          {
            title: "Cronograma",
            items: [
              { label: "Ano", value: data.anoReferencia },
              {
                label: "Meses",
                value:
                  data.mesesSelecionados.length > 0
                    ? data.mesesSelecionados
                        .map((m) => MONTHS[m - 1]?.substring(0, 3) ?? "")
                        .join(", ")
                    : "—",
              },
            ],
          },
        ]
      : []),
  ];

  const allSections = [
    ...sections,
    {
      title: "Documentos",
      items: [
        {
          label: "Carta de recomendação",
          value: data.cartaRecomendacao ? "Confirmada" : "Não informada",
        },
        {
          label: "Arquivos anexados",
          value:
            data.anexos.length > 0
              ? data.anexos.map((a) => a.fileName).join(", ")
              : "Nenhum",
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border border-(--hb-blue) bg-(--brand-muted) px-4 py-3 text-sm text-(--hb-blue) font-medium">
        Revise todas as informações antes de submeter o projeto.
      </div>

      {allSections.map((section) => (
        <div key={section.title}>
          <p className="text-xs font-bold uppercase tracking-wider text-(--brand) mb-3">
            {section.title}
          </p>
          <div className="rounded-md border border-(--border) bg-(--surface) overflow-hidden">
            {section.items.map((item, idx) => (
              <div
                key={item.label}
                className="flex items-start justify-between gap-4 px-4 py-3"
                style={{
                  borderTop: idx > 0 ? "1px solid var(--border)" : "none",
                }}
              >
                <span className="text-sm text-(--fg-muted) shrink-0">
                  {item.label}
                </span>
                <span className="text-sm font-medium text-(--fg) text-right">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

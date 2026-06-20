"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Building2,
  FileText,
  DollarSign,
  Calendar,
  Paperclip,
  Eye,
} from "lucide-react";
import { mockOrganizations } from "../../../lib/mock-data";

type WizardStep = {
  id: number;
  label: string;
  icon: React.ElementType;
};

const STEPS: WizardStep[] = [
  { id: 1, label: "Instituição", icon: Building2 },
  { id: 2, label: "Proposta", icon: FileText },
  { id: 3, label: "Orçamento", icon: DollarSign },
  { id: 4, label: "Cronograma", icon: Calendar },
  { id: 5, label: "Anexos", icon: Paperclip },
  { id: 6, label: "Revisão", icon: Eye },
];

type FormData = {
  // Step 1 — Instituição
  orgId: string;
  projectType: "anual" | "pontual";
  // Step 2 — Proposta
  titulo: string;
  categoria: string;
  objetivos: string;
  justificativa: string;
  metodologia: string;
  beneficiariosQuantidade: string;
  beneficiariosDescricao: string;
  // Step 3 — Orçamento
  valorTotal: string;
  numeroParcelas: string;
  cofinancimento: string;
  // Step 4 — Cronograma
  anoReferencia: string;
  mesesSelecionados: number[];
  // Step 5 — Anexos (file names for display only)
  anexos: string[];
};

const INITIAL: FormData = {
  orgId: "",
  projectType: "anual",
  titulo: "",
  categoria: "",
  objetivos: "",
  justificativa: "",
  metodologia: "",
  beneficiariosQuantidade: "",
  beneficiariosDescricao: "",
  valorTotal: "",
  numeroParcelas: "12",
  cofinancimento: "",
  anoReferencia: "2026",
  mesesSelecionados: [],
  anexos: [],
};

const CATEGORIAS = [
  { value: "evangelismo", label: "Evangelismo" },
  { value: "missoes_transculturais", label: "Missões Transculturais" },
  { value: "educacao_crista", label: "Educação Cristã" },
  { value: "assistencia_social", label: "Assistência Social" },
  { value: "saude", label: "Saúde" },
  { value: "capacitacao_lideranca", label: "Capacitação de Liderança" },
  { value: "infraestrutura_ministerial", label: "Infraestrutura Ministerial" },
  { value: "plantacao_de_igrejas", label: "Plantação de Igrejas" },
  { value: "discipulado", label: "Discipulado" },
  { value: "outros", label: "Outros" },
];

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
});

function StepIndicator({
  steps,
  current,
}: {
  steps: WizardStep[];
  current: number;
}) {
  return (
    <nav aria-label="Etapas do formulário" className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const isCompleted = step.id < current;
        const isCurrent = step.id === current;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-[--dur-fast]"
                style={{
                  backgroundColor: isCompleted
                    ? "var(--hb-blue)"
                    : isCurrent
                      ? "var(--hb-blue)"
                      : "var(--hb-gray-100)",
                  color:
                    isCompleted || isCurrent ? "#fff" : "var(--hb-gray-400)",
                }}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" aria-hidden />
                ) : (
                  <Icon className="w-4 h-4" aria-hidden />
                )}
              </div>
              <span
                className="text-xs font-medium hidden sm:block"
                style={{
                  color: isCurrent ? "var(--hb-blue)" : "var(--fg-muted)",
                }}
              >
                {step.label}
              </span>
            </div>

            {idx < steps.length - 1 && (
              <div
                className="h-px w-8 sm:w-12 mx-1 mb-5 transition-colors duration-[--dur-fast]"
                style={{
                  backgroundColor:
                    step.id < current ? "var(--hb-blue)" : "var(--hb-gray-100)",
                }}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-[--fg] mb-1.5">
      {children}
      {required && (
        <span className="text-[--color-destructive] ml-0.5" aria-hidden>
          *
        </span>
      )}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-[--radius] border border-[--border] bg-[--bg-alt] px-3.5 py-2.5 text-sm text-[--fg] placeholder:text-[--fg-subtle] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand] focus-visible:border-transparent transition-colors"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-[--radius] border border-[--border] bg-[--bg-alt] px-3.5 py-2.5 text-sm text-[--fg] placeholder:text-[--fg-subtle] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand] focus-visible:border-transparent transition-colors resize-none"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[--radius] border border-[--border] bg-[--bg-alt] px-3.5 py-2.5 text-sm text-[--fg] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand] focus-visible:border-transparent transition-colors"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// Step 1: Instituição
function Step1({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-[--fg-muted] mb-4 leading-relaxed">
          Selecione a instituição que submeterá este projeto. Caso sua
          organização ainda não esteja cadastrada, entre em contato com a
          diretoria.
        </p>

        <div className="flex flex-col gap-2">
          {mockOrganizations.slice(0, 4).map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => onChange({ orgId: org.id })}
              className="flex items-center gap-4 rounded-[--radius-md] border-2 px-4 py-3 text-left transition-all duration-[--dur-fast] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand]"
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
                aria-hidden
              >
                {org.country === "Brasil"
                  ? "🇧🇷"
                  : org.country === "Moçambique"
                    ? "🇲🇿"
                    : org.country === "Portugal"
                      ? "🇵🇹"
                      : "🌍"}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold text-[--fg]"
                  style={{
                    color:
                      data.orgId === org.id ? "var(--hb-blue)" : "var(--fg)",
                  }}
                >
                  {org.name}
                </p>
                <p className="text-xs text-[--fg-muted]">
                  {[org.city, org.country].filter(Boolean).join(", ")}
                </p>
              </div>
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{
                  borderColor:
                    data.orgId === org.id ? "var(--hb-blue)" : "var(--border)",
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
      </div>

      <div>
        <FieldLabel required>Tipo de Projeto</FieldLabel>
        <div className="flex gap-3">
          {(["anual", "pontual"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ projectType: type })}
              className="flex-1 rounded-[--radius-md] border-2 px-4 py-3 text-sm font-semibold transition-all duration-[--dur-fast] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand]"
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
        <p className="text-xs text-[--fg-muted] mt-2">
          {data.projectType === "anual"
            ? "Projetos anuais têm duração de 12 meses e são vinculados a um edital."
            : "Projetos pontuais são solicitações emergenciais sem vínculo com edital."}
        </p>
      </div>
    </div>
  );
}

// Step 2: Proposta
function Step2({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel required>Título do Projeto</FieldLabel>
        <TextInput
          value={data.titulo}
          onChange={(v) => onChange({ titulo: v })}
          placeholder="Ex.: Missão Maputo 2026 — Plantação de Igrejas"
        />
      </div>

      <div>
        <FieldLabel required>Categoria</FieldLabel>
        <SelectInput
          value={data.categoria}
          onChange={(v) => onChange({ categoria: v })}
          options={CATEGORIAS}
          placeholder="Selecione uma categoria"
        />
      </div>

      <div>
        <FieldLabel required>Objetivos</FieldLabel>
        <Textarea
          value={data.objetivos}
          onChange={(v) => onChange({ objetivos: v })}
          placeholder="Descreva o objetivo principal do projeto e o que se pretende alcançar..."
          rows={3}
        />
      </div>

      <div>
        <FieldLabel required>Justificativa</FieldLabel>
        <Textarea
          value={data.justificativa}
          onChange={(v) => onChange({ justificativa: v })}
          placeholder="Por que este projeto é necessário? Qual o contexto e a necessidade identificada?"
          rows={3}
        />
      </div>

      <div>
        <FieldLabel required>Metodologia</FieldLabel>
        <Textarea
          value={data.metodologia}
          onChange={(v) => onChange({ metodologia: v })}
          placeholder="Como o projeto será executado? Descreva as etapas e abordagem..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel required>Nº de Beneficiários</FieldLabel>
          <TextInput
            value={data.beneficiariosQuantidade}
            onChange={(v) => onChange({ beneficiariosQuantidade: v })}
            placeholder="Ex.: 500"
            type="number"
          />
        </div>

        <div>
          <FieldLabel required>Descrição dos Beneficiários</FieldLabel>
          <TextInput
            value={data.beneficiariosDescricao}
            onChange={(v) => onChange({ beneficiariosDescricao: v })}
            placeholder="Ex.: Famílias ribeirinhas do Rio Negro"
          />
        </div>
      </div>
    </div>
  );
}

// Step 3: Orçamento
function Step3({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  const parcelas = parseInt(data.numeroParcelas) || 1;
  const total = parseFloat(data.valorTotal.replace(/\D/g, "")) || 0;
  const porParcela = total > 0 && parcelas > 0 ? total / parcelas : 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel required>Valor Total Solicitado (R$)</FieldLabel>
        <TextInput
          value={data.valorTotal}
          onChange={(v) => onChange({ valorTotal: v })}
          placeholder="Ex.: 48000"
          type="number"
        />
        <p className="text-xs text-[--fg-muted] mt-1.5">
          Valor máximo anual: R$ 80.000 por projeto.
        </p>
      </div>

      {data.projectType === "anual" && (
        <div>
          <FieldLabel required>Número de Parcelas</FieldLabel>
          <SelectInput
            value={data.numeroParcelas}
            onChange={(v) => onChange({ numeroParcelas: v })}
            options={Array.from({ length: 12 }, (_, i) => ({
              value: String(i + 1),
              label: `${i + 1} parcela${i > 0 ? "s" : ""}`,
            }))}
          />
          {porParcela > 0 && (
            <p className="text-xs text-[--fg-muted] mt-1.5">
              Valor por parcela:{" "}
              <span className="font-semibold text-[--hb-blue]">
                {BRL.format(porParcela)}
              </span>
            </p>
          )}
        </div>
      )}

      <div>
        <FieldLabel>Cofinanciamento (opcional)</FieldLabel>
        <Textarea
          value={data.cofinancimento}
          onChange={(v) => onChange({ cofinancimento: v })}
          placeholder="Descreva se há outras fontes de financiamento para este projeto e seus respectivos valores..."
          rows={2}
        />
      </div>

      {total > 0 && (
        <div className="rounded-[--radius-md] border border-[--border] bg-[--surface-alt] p-4">
          <p className="text-xs font-semibold text-[--fg-muted] uppercase tracking-wider mb-3">
            Resumo Financeiro
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-[--fg-muted]">Valor total</span>
              <span className="font-semibold text-[--fg] tabular-nums">
                {BRL.format(total)}
              </span>
            </div>
            {porParcela > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[--fg-muted]">
                  Valor por parcela ({parcelas}x)
                </span>
                <span className="font-semibold text-[--fg] tabular-nums">
                  {BRL.format(porParcela)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Step 4: Cronograma
function Step4({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  function toggleMonth(m: number) {
    const current = data.mesesSelecionados;
    if (current.includes(m)) {
      onChange({ mesesSelecionados: current.filter((x) => x !== m) });
    } else {
      onChange({
        mesesSelecionados: [...current, m].sort((a, b) => a - b),
      });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {data.projectType === "anual" && (
        <div>
          <FieldLabel required>Ano de Referência</FieldLabel>
          <SelectInput
            value={data.anoReferencia}
            onChange={(v) => onChange({ anoReferencia: v })}
            options={[
              { value: "2025", label: "2025" },
              { value: "2026", label: "2026" },
              { value: "2027", label: "2027" },
            ]}
          />
        </div>
      )}

      <div>
        <FieldLabel required>Meses de Pagamento</FieldLabel>
        <p className="text-xs text-[--fg-muted] mb-3">
          Selecione os meses em que os recursos deverão ser liberados.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {MONTHS.map((month, idx) => {
            const num = idx + 1;
            const selected = data.mesesSelecionados.includes(num);
            return (
              <button
                key={num}
                type="button"
                onClick={() => toggleMonth(num)}
                className="rounded-[--radius] border-2 px-3 py-2 text-xs font-semibold transition-all duration-[--dur-fast] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand]"
                style={{
                  borderColor: selected ? "var(--hb-blue)" : "var(--border)",
                  backgroundColor: selected
                    ? "var(--brand-muted)"
                    : "var(--surface)",
                  color: selected ? "var(--hb-blue)" : "var(--fg-muted)",
                }}
              >
                {month.substring(0, 3)}
              </button>
            );
          })}
        </div>
        {data.mesesSelecionados.length > 0 && (
          <p className="text-xs text-[--fg-muted] mt-2">
            {data.mesesSelecionados.length} mês
            {data.mesesSelecionados.length !== 1 ? "es" : ""} selecionado
            {data.mesesSelecionados.length !== 1 ? "s" : ""}.
          </p>
        )}
      </div>
    </div>
  );
}

// Step 5: Anexos
function Step5({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  const REQUIRED_DOCS = [
    {
      id: "carta",
      label: "Carta de Recomendação",
      description: "Carta assinada por liderança reconhecida",
    },
    {
      id: "projeto",
      label: "Documento do Projeto",
      description: "PDF com proposta completa (máx. 10MB)",
    },
    {
      id: "estatuto",
      label: "Estatuto ou CNPJ",
      description: "Comprovante de regularidade da instituição",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-[--fg-muted]">
        Envie os documentos necessários para análise do projeto. Todos os
        arquivos devem estar em formato PDF.
      </p>

      <div className="flex flex-col gap-3">
        {REQUIRED_DOCS.map((doc) => (
          <div
            key={doc.id}
            className="rounded-[--radius-md] border border-dashed border-[--border] bg-[--surface-alt] px-4 py-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-[--radius] bg-[--surface] border border-[--border] flex items-center justify-center shrink-0">
              <Paperclip className="w-4 h-4 text-[--fg-muted]" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[--fg]">{doc.label}</p>
              <p className="text-xs text-[--fg-muted]">{doc.description}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({ anexos: [...data.anexos, doc.label + ".pdf"] })
              }
              className="shrink-0 rounded-[--radius] border border-[--border] bg-[--surface] px-3 py-1.5 text-xs font-semibold text-[--fg-muted] hover:border-[--brand] hover:text-[--brand] transition-colors"
            >
              Selecionar
            </button>
          </div>
        ))}
      </div>

      {data.anexos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[--fg-muted] uppercase tracking-wider mb-2">
            Arquivos selecionados
          </p>
          <div className="flex flex-col gap-1.5">
            {data.anexos.map((name, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-[--radius-sm] bg-[--hb-green-muted] px-3 py-2"
              >
                <Check
                  className="w-3.5 h-3.5 text-[--hb-green-fg] shrink-0"
                  aria-hidden
                />
                <span className="text-xs text-[--hb-green-fg] font-medium flex-1">
                  {name}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ anexos: data.anexos.filter((_, j) => j !== i) })
                  }
                  className="text-xs text-[--fg-muted] hover:text-[--color-destructive]"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Step 6: Revisão
function Step6({ data }: { data: FormData }) {
  const org = mockOrganizations.find((o) => o.id === data.orgId);
  const categoria = CATEGORIAS.find((c) => c.value === data.categoria);
  const total = parseFloat(data.valorTotal.replace(/\D/g, "")) || 0;
  const parcelas = parseInt(data.numeroParcelas) || 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[--radius-md] border border-[--hb-blue] bg-[--brand-muted] px-4 py-3 text-sm text-[--hb-blue] font-medium">
        Revise todas as informações antes de submeter o projeto.
      </div>

      {/* Section blocks */}
      {[
        {
          title: "Instituição",
          items: [
            {
              label: "Organização",
              value: org?.name ?? "Não selecionada",
            },
            {
              label: "Tipo",
              value:
                data.projectType === "anual"
                  ? "Projeto Anual"
                  : "Projeto Pontual",
            },
          ],
        },
        {
          title: "Proposta",
          items: [
            { label: "Título", value: data.titulo || "—" },
            {
              label: "Categoria",
              value: categoria?.label ?? "—",
            },
            {
              label: "Beneficiários",
              value: data.beneficiariosQuantidade
                ? `${data.beneficiariosQuantidade} pessoas`
                : "—",
            },
          ],
        },
        {
          title: "Orçamento",
          items: [
            {
              label: "Valor total",
              value:
                total > 0
                  ? new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(total)
                  : "—",
            },
            {
              label: "Parcelas",
              value: `${parcelas}x`,
            },
            {
              label: "Cofinanciamento",
              value: data.cofinancimento || "Nenhum",
            },
          ],
        },
        {
          title: "Cronograma",
          items: [
            {
              label: "Ano",
              value: data.anoReferencia,
            },
            {
              label: "Meses",
              value:
                data.mesesSelecionados.length > 0
                  ? data.mesesSelecionados
                      .map((m) => MONTHS[m - 1]?.substring(0, 3))
                      .join(", ")
                  : "—",
            },
          ],
        },
        {
          title: "Anexos",
          items: [
            {
              label: "Documentos",
              value:
                data.anexos.length > 0
                  ? `${data.anexos.length} arquivo(s)`
                  : "Nenhum anexo",
            },
          ],
        },
      ].map((section) => (
        <div key={section.title}>
          <p className="text-xs font-bold uppercase tracking-wider text-[--brand] mb-3">
            {section.title}
          </p>
          <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] overflow-hidden">
            {section.items.map((item, idx) => (
              <div
                key={item.label}
                className="flex items-start justify-between gap-4 px-4 py-3"
                style={{
                  borderTop: idx > 0 ? "1px solid var(--border)" : "none",
                }}
              >
                <span className="text-sm text-[--fg-muted] shrink-0">
                  {item.label}
                </span>
                <span className="text-sm font-medium text-[--fg] text-right">
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

export default function NovoProjetoPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL);
  const [submitted, setSubmitted] = useState(false);

  function patch(updates: Partial<FormData>) {
    setData((prev) => ({ ...prev, ...updates }));
  }

  function handleNext() {
    if (step < STEPS.length) setStep((s) => s + 1);
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-16 flex flex-col items-center text-center gap-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--hb-green-muted)" }}
        >
          <Check
            className="w-8 h-8"
            style={{ color: "var(--hb-green-fg)" }}
            aria-hidden
          />
        </div>
        <div>
          <h1
            className="text-2xl font-bold text-[--fg] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Projeto Submetido
          </h1>
          <p className="text-sm text-[--fg-muted]">
            Seu projeto foi enviado para análise da diretoria. Você receberá uma
            notificação quando houver atualizações.
          </p>
          <p className="text-xs text-[--fg-subtle] mt-4 italic">
            "Entrega o teu caminho ao Senhor, confia nele, e ele tudo fará." —
            Sl 37:5
          </p>
        </div>
        <Link
          href="/"
          className="rounded-[--radius-md] bg-[--brand] text-[--brand-fg] px-6 py-2.5 text-sm font-semibold hover:bg-[--hb-blue-soft] transition-colors"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[--fg-muted] hover:text-[--fg] transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          Meus Projetos
        </Link>
        <h1
          className="text-2xl font-bold text-[--fg]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Novo Projeto
        </h1>
        <p className="text-sm text-[--fg-muted] mt-1">
          Preencha as etapas abaixo para submeter sua solicitação.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex justify-center mb-8 overflow-x-auto pb-2">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      {/* Card */}
      <div className="rounded-[--radius-lg] border border-[--border] bg-[--surface] shadow-[--shadow-md] overflow-hidden">
        {/* Step header */}
        <div className="px-6 py-5 border-b border-[--border] bg-[--surface-alt] flex items-center gap-3">
          {(() => {
            const currentStep = STEPS.find((s) => s.id === step);
            const Icon = currentStep?.icon ?? FileText;
            return (
              <>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--brand)", color: "#fff" }}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[--fg-muted] uppercase tracking-wider">
                    Etapa {step} de {STEPS.length}
                  </p>
                  <p
                    className="text-base font-semibold text-[--fg]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {currentStep?.label}
                  </p>
                </div>
              </>
            );
          })()}
        </div>

        {/* Step content */}
        <div className="px-6 py-6">
          {step === 1 && <Step1 data={data} onChange={patch} />}
          {step === 2 && <Step2 data={data} onChange={patch} />}
          {step === 3 && <Step3 data={data} onChange={patch} />}
          {step === 4 && <Step4 data={data} onChange={patch} />}
          {step === 5 && <Step5 data={data} onChange={patch} />}
          {step === 6 && <Step6 data={data} />}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 border-t border-[--border] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-1.5 rounded-[--radius-md] border border-[--border] px-4 py-2 text-sm font-semibold text-[--fg-muted] hover:border-[--brand] hover:text-[--brand] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
            Voltar
          </button>

          <div className="flex-1 flex justify-center">
            <div className="flex gap-1.5">
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className="w-2 h-2 rounded-full transition-all duration-[--dur-fast]"
                  style={{
                    backgroundColor:
                      s.id === step
                        ? "var(--hb-blue)"
                        : s.id < step
                          ? "var(--hb-blue)"
                          : "var(--hb-gray-100)",
                    opacity: s.id === step ? 1 : s.id < step ? 0.4 : 1,
                  }}
                  aria-hidden
                />
              ))}
            </div>
          </div>

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-[--radius-md] bg-[--brand] text-[--brand-fg] px-4 py-2 text-sm font-semibold hover:bg-[--hb-blue-soft] transition-colors"
            >
              Próximo
              <ChevronRight className="w-4 h-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-1.5 rounded-[--radius-md] px-5 py-2 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "var(--hb-green)" }}
            >
              <Check className="w-4 h-4" aria-hidden />
              Submeter Projeto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

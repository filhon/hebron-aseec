"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@hebron/auth/client";
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
import { useAction } from "next-safe-action/hooks";
import {
  getMyOrganizations,
  getEditalPrefillForWizard,
  type OrgOption,
} from "../../../lib/queries";
import { createAnnualDraft } from "../../../actions/projects";
import { createPunctualDraft } from "../../../actions/projects";

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

type AttachmentItem = {
  docId: string;
  storagePath: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
};

type FormData = {
  // Edital (prefill via ?editalId=, F2-P3)
  editalId: string | null;
  editalTitle: string | null;
  // Step 1
  orgId: string;
  projectType: "anual" | "pontual";
  // Step 2 — anual
  titulo: string;
  categoria: string;
  objetivos: string;
  justificativa: string;
  metodologia: string;
  contextoMinisterial: string;
  tempoMinisterioAnos: string;
  regiao: string;
  pais: string;
  beneficiariosQuantidade: string;
  beneficiariosDescricao: string;
  resultadosEsperados: string;
  // Step 2 — pontual
  motivoEmergencial: string;
  prazoNecessidade: string;
  descricao: string;
  // Step 3
  valorTotal: string;
  numeroParcelas: string;
  cofinancimento: string;
  // Step 4
  anoReferencia: string;
  mesesSelecionados: number[];
  // Step 5
  cartaRecomendacao: boolean;
  anexos: AttachmentItem[];
};

const INITIAL: FormData = {
  editalId: null,
  editalTitle: null,
  orgId: "",
  projectType: "anual",
  titulo: "",
  categoria: "",
  objetivos: "",
  justificativa: "",
  metodologia: "",
  contextoMinisterial: "",
  tempoMinisterioAnos: "",
  regiao: "",
  pais: "Brasil",
  beneficiariosQuantidade: "",
  beneficiariosDescricao: "",
  resultadosEsperados: "",
  motivoEmergencial: "",
  prazoNecessidade: "",
  descricao: "",
  valorTotal: "",
  numeroParcelas: "12",
  cofinancimento: "",
  anoReferencia: String(new Date().getFullYear() + 1),
  mesesSelecionados: [],
  cartaRecomendacao: false,
  anexos: [] as AttachmentItem[],
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

// ─── Step indicator ───────────────────────────────────────────────────────────

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
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-(--dur-fast)"
                style={{
                  backgroundColor:
                    isCompleted || isCurrent
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
                className="h-px w-8 sm:w-12 mx-1 mb-5 transition-colors duration-(--dur-fast)"
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

// ─── Field helpers ────────────────────────────────────────────────────────────

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-(--fg) mb-1.5">
      {children}
      {required && (
        <span className="text-(--color-destructive) ml-0.5" aria-hidden>
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
      className="w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3.5 py-2.5 text-sm text-(--fg) placeholder:text-(--fg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) focus-visible:border-transparent transition-colors"
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
      className="w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3.5 py-2.5 text-sm text-(--fg) placeholder:text-(--fg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) focus-visible:border-transparent transition-colors resize-none"
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
      className="w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3.5 py-2.5 text-sm text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) focus-visible:border-transparent transition-colors"
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

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step1({
  data,
  onChange,
  orgs,
  orgsLoading,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
  orgs: OrgOption[];
  orgsLoading: boolean;
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
                  style={{ backgroundColor: "var(--hb-blue)", color: "#fff" }}
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

function Step2Annual({
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

      <div>
        <FieldLabel required>Resultados Esperados</FieldLabel>
        <Textarea
          value={data.resultadosEsperados}
          onChange={(v) => onChange({ resultadosEsperados: v })}
          placeholder="Quais resultados concretos este projeto visa alcançar?"
          rows={3}
        />
      </div>

      <div>
        <FieldLabel required>Contexto Ministerial</FieldLabel>
        <Textarea
          value={data.contextoMinisterial}
          onChange={(v) => onChange({ contextoMinisterial: v })}
          placeholder="Descreva o histórico e o contexto do ministério onde o projeto será realizado..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel required>Região de Atuação</FieldLabel>
          <TextInput
            value={data.regiao}
            onChange={(v) => onChange({ regiao: v })}
            placeholder="Ex.: Norte do Brasil, Moçambique, etc."
          />
        </div>
        <div>
          <FieldLabel required>País</FieldLabel>
          <TextInput
            value={data.pais}
            onChange={(v) => onChange({ pais: v })}
            placeholder="Ex.: Brasil"
          />
        </div>
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

      <div>
        <FieldLabel required>Tempo de Ministério (anos)</FieldLabel>
        <TextInput
          value={data.tempoMinisterioAnos}
          onChange={(v) => onChange({ tempoMinisterioAnos: v })}
          placeholder="Ex.: 10"
          type="number"
        />
        <p className="text-xs text-(--fg-muted) mt-1">
          Há quantos anos a instituição realiza ministério ativo?
        </p>
      </div>
    </div>
  );
}

function Step2Pontual({
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
          placeholder="Ex.: Auxílio Emergencial — Inundação Manaus"
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
        <FieldLabel required>Motivo Emergencial</FieldLabel>
        <Textarea
          value={data.motivoEmergencial}
          onChange={(v) => onChange({ motivoEmergencial: v })}
          placeholder="Descreva a situação de emergência que justifica este projeto pontual..."
          rows={4}
        />
      </div>

      <div>
        <FieldLabel required>Prazo de Necessidade</FieldLabel>
        <TextInput
          value={data.prazoNecessidade}
          onChange={(v) => onChange({ prazoNecessidade: v })}
          type="date"
        />
        <p className="text-xs text-(--fg-muted) mt-1">
          Data limite para que o recurso esteja disponível.
        </p>
      </div>

      <div>
        <FieldLabel>Descrição Adicional</FieldLabel>
        <Textarea
          value={data.descricao}
          onChange={(v) => onChange({ descricao: v })}
          placeholder="Detalhes adicionais sobre o projeto (opcional)..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel>Região</FieldLabel>
          <TextInput
            value={data.regiao}
            onChange={(v) => onChange({ regiao: v })}
            placeholder="Ex.: Amazonas"
          />
        </div>
        <div>
          <FieldLabel>País</FieldLabel>
          <TextInput
            value={data.pais}
            onChange={(v) => onChange({ pais: v })}
            placeholder="Ex.: Brasil"
          />
        </div>
      </div>
    </div>
  );
}

function Step3({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  const parcelas = parseInt(data.numeroParcelas) || 1;
  const total = parseFloat(data.valorTotal) || 0;
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
        <p className="text-xs text-(--fg-muted) mt-1.5">
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
            <p className="text-xs text-(--fg-muted) mt-1.5">
              Valor por parcela:{" "}
              <span className="font-semibold text-(--hb-blue)">
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
          placeholder="Descreva se há outras fontes de financiamento para este projeto..."
          rows={2}
        />
      </div>

      {total > 0 && (
        <div className="rounded-md border border-(--border) bg-(--surface-alt) p-4">
          <p className="text-xs font-semibold text-(--fg-muted) uppercase tracking-wider mb-3">
            Resumo Financeiro
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-(--fg-muted)">Valor total</span>
              <span className="font-semibold text-(--fg) tabular-nums">
                {BRL.format(total)}
              </span>
            </div>
            {porParcela > 0 && data.projectType === "anual" && (
              <div className="flex justify-between text-sm">
                <span className="text-(--fg-muted)">
                  Valor por parcela ({parcelas}x)
                </span>
                <span className="font-semibold text-(--fg) tabular-nums">
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
      onChange({ mesesSelecionados: [...current, m].sort((a, b) => a - b) });
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
        <p className="text-xs text-(--fg-muted) mb-3">
          Selecione os meses em que os recursos deverão ser liberados. O número
          deve coincidir com o de parcelas.
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
                className="rounded-(--radius) border-2 px-3 py-2 text-xs font-semibold transition-all duration-(--dur-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
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
          <p className="text-xs text-(--fg-muted) mt-2">
            {data.mesesSelecionados.length} mês
            {data.mesesSelecionados.length !== 1 ? "es" : ""} selecionado
            {data.mesesSelecionados.length !== 1 ? "s" : ""}.
          </p>
        )}
      </div>
    </div>
  );
}

function Step5({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const REQUIRED_DOCS = [
    {
      id: "projeto",
      label: "Documento do Projeto",
      description: "PDF com proposta completa (máx. 10MB)",
      accept: "application/pdf",
    },
    {
      id: "estatuto",
      label: "Estatuto ou CNPJ",
      description: "Comprovante de regularidade da instituição",
      accept: "application/pdf,image/jpeg,image/png",
    },
  ];

  async function handleFileChange(docId: string, file: File) {
    setUploadError(null);
    setUploadingDocId(docId);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { data: uploadData, error: storageError } = await supabase.storage
        .from("project-attachments")
        .upload(path, file, { contentType: file.type });

      if (storageError) throw new Error(storageError.message);

      const { data: signedData, error: signedError } = await supabase.storage
        .from("project-attachments")
        .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365);

      if (signedError) throw new Error(signedError.message);

      const item: AttachmentItem = {
        docId,
        storagePath: uploadData.path,
        fileUrl: signedData.signedUrl,
        fileName: file.name,
        fileSize: file.size,
      };

      onChange({
        anexos: [...data.anexos.filter((a) => a.docId !== docId), item],
      });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Erro ao enviar arquivo.",
      );
    } finally {
      setUploadingDocId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-(--fg-muted)">
        Envie os documentos necessários para análise do projeto.
      </p>

      {/* Carta de recomendação */}
      <div
        className="rounded-md border border-(--border) bg-(--surface) px-4 py-4 flex items-start gap-3"
        style={{ cursor: "pointer" }}
        onClick={() => onChange({ cartaRecomendacao: !data.cartaRecomendacao })}
      >
        <div
          className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5"
          style={{
            borderColor: data.cartaRecomendacao
              ? "var(--hb-blue)"
              : "var(--border)",
            backgroundColor: data.cartaRecomendacao
              ? "var(--hb-blue)"
              : "transparent",
          }}
        >
          {data.cartaRecomendacao && (
            <Check className="w-3 h-3 text-white" aria-hidden />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-(--fg)">
            Carta de Recomendação
          </p>
          <p className="text-xs text-(--fg-muted) mt-0.5">
            Confirmo que possuo carta de recomendação assinada por liderança
            reconhecida pela Hebron Aseec.
          </p>
        </div>
      </div>

      {/* Documentos obrigatórios */}
      <div className="flex flex-col gap-3">
        {REQUIRED_DOCS.map((doc) => {
          const uploaded = data.anexos.find((a) => a.docId === doc.id);
          const isUploading = uploadingDocId === doc.id;

          return (
            <div key={doc.id}>
              {/* Hidden file input */}
              <input
                ref={(el) => {
                  fileRefs.current[doc.id] = el;
                }}
                type="file"
                accept={doc.accept}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileChange(doc.id, file);
                  e.target.value = "";
                }}
              />

              {uploaded ? (
                <div className="rounded-md border border-(--hb-green) bg-(--hb-green-muted) px-4 py-3 flex items-center gap-3">
                  <Check
                    className="w-4 h-4 shrink-0"
                    style={{ color: "var(--hb-green-fg)" }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--hb-green-fg)" }}
                    >
                      {doc.label}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--hb-green-fg)", opacity: 0.8 }}
                    >
                      {uploaded.fileName} ·{" "}
                      {Math.round(uploaded.fileSize / 1024)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        anexos: data.anexos.filter((a) => a.docId !== doc.id),
                      })
                    }
                    className="shrink-0 text-xs font-semibold hover:opacity-70 transition-opacity"
                    style={{ color: "var(--hb-green-fg)" }}
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-(--border) bg-(--surface-alt) px-4 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-(--radius) bg-(--surface) border border-(--border) flex items-center justify-center shrink-0">
                    <Paperclip
                      className="w-4 h-4 text-(--fg-muted)"
                      aria-hidden
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-(--fg)">
                      {doc.label}
                    </p>
                    <p className="text-xs text-(--fg-muted)">
                      {doc.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileRefs.current[doc.id]?.click()}
                    className="shrink-0 rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-1.5 text-xs font-semibold text-(--fg-muted) hover:border-(--brand) hover:text-(--brand) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? "Enviando…" : "Selecionar"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {uploadError && (
        <p className="text-sm text-(--color-destructive)">{uploadError}</p>
      )}
    </div>
  );
}

function Step6({ data, orgs }: { data: FormData; orgs: OrgOption[] }) {
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NovoProjetoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getMyOrganizations().then((result) => {
      setOrgs(result);
      setOrgsLoading(false);
    });
  }, []);

  // F2-P3: o wizard nunca lia edital_id/tipo de searchParams nem chamava
  // getEditalPrefill — o botão "submeter projeto" do edital não tinha efeito
  // nenhum aqui. A categoria não é pré-preenchida: `projectCategoryId` do
  // edital referencia `documentos.categories`, não o slug de
  // `projetos.projectCategories` — mapeamento ainda não existe (débito
  // pré-existente, documentado em
  // `packages/integrations/src/documentos-projetos.ts`).
  useEffect(() => {
    const editalId = searchParams.get("editalId");
    if (!editalId) return;
    // Integração de leitura (G6.5): falha degrada para "sem prefill" — nunca
    // bloqueia o wizard — mas é logada de forma estruturada, não engolida.
    void getEditalPrefillForWizard(editalId)
      .then((prefill) => {
        if (!prefill) return;
        setData((prev) => ({
          ...prev,
          editalId: prefill.editalId,
          editalTitle: prefill.editalTitle,
          projectType: prefill.tipo ?? prev.projectType,
        }));
      })
      .catch((err) => {
        console.error("[projetos/novo] edital prefill failed:", err);
      });
  }, [searchParams]);

  const { execute: submitAnual, isPending: isSubmittingAnual } = useAction(
    createAnnualDraft,
    {
      onSuccess({ data: result }) {
        if (result?.project?.id) {
          router.push(`/${result.project.id}`);
        }
      },
      onError({ error: err }) {
        setError(
          err.serverError ?? "Erro ao submeter o projeto. Tente novamente.",
        );
      },
    },
  );

  const { execute: submitPontual, isPending: isSubmittingPontual } = useAction(
    createPunctualDraft,
    {
      onSuccess({ data: result }) {
        if (result?.project?.id) {
          router.push(`/${result.project.id}`);
        }
      },
      onError({ error: err }) {
        setError(
          err.serverError ?? "Erro ao submeter o projeto. Tente novamente.",
        );
      },
    },
  );

  const isSubmitting = isSubmittingAnual || isSubmittingPontual;

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
    setError(null);

    if (data.projectType === "anual") {
      submitAnual({
        titulo: data.titulo,
        categoria: data.categoria as Parameters<
          typeof submitAnual
        >[0]["categoria"],
        organizacaoId: data.orgId,
        anoReferencia: parseInt(data.anoReferencia),
        objetivos: data.objetivos,
        justificativa: data.justificativa,
        metodologia: data.metodologia,
        contextoMinisterial: data.contextoMinisterial,
        tempoMinisterioAnos: parseInt(data.tempoMinisterioAnos) || 0,
        regiao: data.regiao,
        pais: data.pais,
        beneficiariosQuantidade: parseInt(data.beneficiariosQuantidade) || 0,
        beneficiariosDescricao: data.beneficiariosDescricao,
        resultadosEsperados: data.resultadosEsperados,
        cartaRecomendacao: data.cartaRecomendacao,
        valorTotal: parseFloat(data.valorTotal) || 0,
        numeroParcelas: parseInt(data.numeroParcelas) || 1,
        mesesPagamento: data.mesesSelecionados,
        cofinancimento: data.cofinancimento || null,
        editalId: data.editalId,
        attachments: data.anexos.map((a) => ({
          fileUrl: a.fileUrl,
          fileName: a.fileName,
          fileSize: a.fileSize,
        })),
      });
    } else {
      submitPontual({
        titulo: data.titulo,
        categoria: data.categoria as Parameters<
          typeof submitPontual
        >[0]["categoria"],
        organizacaoId: data.orgId,
        valorTotal: parseFloat(data.valorTotal) || 0,
        motivoEmergencial: data.motivoEmergencial,
        prazoNecessidade: data.prazoNecessidade
          ? new Date(data.prazoNecessidade).toISOString()
          : new Date().toISOString(),
        descricao: data.descricao || undefined,
        beneficiariosQuantidade: data.beneficiariosQuantidade
          ? parseInt(data.beneficiariosQuantidade)
          : undefined,
        regiao: data.regiao || undefined,
        pais: data.pais || undefined,
        editalId: data.editalId,
        attachments: data.anexos.map((a) => ({
          fileUrl: a.fileUrl,
          fileName: a.fileName,
          fileSize: a.fileSize,
        })),
      });
    }
  }

  const isLastStep = step === STEPS.length;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-(--fg-muted) hover:text-(--fg) transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          Voltar
        </Link>
        <h1
          className="text-2xl font-bold text-(--fg) mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Submeter Projeto
        </h1>
        <p className="text-sm text-(--fg-muted)">
          Preencha as informações abaixo para submeter seu projeto à diretoria.
        </p>
        {data.editalTitle && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-(--brand-muted) px-3 py-1.5 text-xs font-semibold text-(--brand)">
            Vinculado ao edital: {data.editalTitle}
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="mb-8 overflow-x-auto pb-2">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      {/* Card */}
      <div className="rounded-lg border border-(--border) bg-(--surface) shadow-(--shadow-sm) p-6 mb-6">
        <h2
          className="text-lg font-bold text-(--fg) mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {STEPS.find((s) => s.id === step)?.label}
        </h2>

        {step === 1 && (
          <Step1
            data={data}
            onChange={patch}
            orgs={orgs}
            orgsLoading={orgsLoading}
          />
        )}
        {step === 2 &&
          (data.projectType === "anual" ? (
            <Step2Annual data={data} onChange={patch} />
          ) : (
            <Step2Pontual data={data} onChange={patch} />
          ))}
        {step === 3 && <Step3 data={data} onChange={patch} />}
        {step === 4 && <Step4 data={data} onChange={patch} />}
        {step === 5 && <Step5 data={data} onChange={patch} />}
        {step === 6 && <Step6 data={data} orgs={orgs} />}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-(--color-destructive) bg-(--color-destructive-muted) px-4 py-3 text-sm text-(--color-destructive) mb-4">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="inline-flex items-center gap-2 rounded-md border border-(--border) px-4 py-2.5 text-sm font-semibold text-(--fg-muted) hover:border-(--brand) hover:text-(--brand) transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          Anterior
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--hb-orange)" }}
          >
            {isSubmitting ? "Submetendo..." : "Submeter Projeto"}
            <Check className="w-4 h-4" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--hb-blue)" }}
          >
            Próximo
            <ChevronRight className="w-4 h-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

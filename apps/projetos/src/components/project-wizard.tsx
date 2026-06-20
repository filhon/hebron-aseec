"use client";

import { useState, useCallback } from "react";
import type { Organization, ProjectCategory } from "@hebron/types";
import {
  Building2,
  FileText,
  DollarSign,
  Paperclip,
  Eye,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { mockOrganizations } from "../lib/mock-data";
import { StepInstitution } from "./project-wizard-steps/step-institution";
import { StepProposal } from "./project-wizard-steps/step-proposal";
import { StepBudget } from "./project-wizard-steps/step-budget";
import { StepAttachments } from "./project-wizard-steps/step-attachments";
import { StepReview } from "./project-wizard-steps/step-review";

// ─── Shared types (imported by step files via `import type`) ─────────────────

export type WizardFormData = {
  organizacaoId: string;
  titulo: string;
  categoria: ProjectCategory | "";
  regiao: string;
  pais: string;
  contextoMinisterial: string;
  tempoMinisterioAnos: number | "";
  beneficiariosQuantidade: number | "";
  beneficiariosDescricao: string;
  objetivos: string;
  justificativa: string;
  metodologia: string;
  resultadosEsperados: string;
  riscos: string;
  parcerias: string;
  indicadoresExito: string;
  anoReferencia: number;
  valorTotal: number | "";
  numeroParcelas: number;
  mesesPagamento: number[];
  cofinancimento: string;
  cartaRecomendacao: boolean;
  editalId: string;
};

export type WizardFiles = {
  video: File | null;
  spreadsheet: File | null;
  letter: File | null;
};

export type WizardErrors = Partial<
  Record<keyof WizardFormData | "video" | "spreadsheet", string>
>;

export interface StepProps {
  data: WizardFormData;
  errors: WizardErrors;
  onChange: (patch: Partial<WizardFormData>) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Instituição", icon: Building2 },
  { id: 2, label: "Proposta", icon: FileText },
  { id: 3, label: "Orçamento", icon: DollarSign },
  { id: 4, label: "Anexos", icon: Paperclip },
  { id: 5, label: "Revisão", icon: Eye },
] as const;

const INITIAL: WizardFormData = {
  organizacaoId: "",
  titulo: "",
  categoria: "",
  regiao: "",
  pais: "",
  contextoMinisterial: "",
  tempoMinisterioAnos: "",
  beneficiariosQuantidade: "",
  beneficiariosDescricao: "",
  objetivos: "",
  justificativa: "",
  metodologia: "",
  resultadosEsperados: "",
  riscos: "",
  parcerias: "",
  indicadoresExito: "",
  anoReferencia: new Date().getFullYear(),
  valorTotal: "",
  numeroParcelas: 1,
  mesesPagamento: [],
  cofinancimento: "",
  cartaRecomendacao: false,
  editalId: "",
};

// ─── Per-step validation (mirrors Zod schema rules without importing z) ───────

function validateStep(
  step: number,
  data: WizardFormData,
  _files: WizardFiles,
): WizardErrors {
  const errors: WizardErrors = {};

  if (step === 1) {
    if (!data.organizacaoId) {
      errors.organizacaoId = "Selecione uma instituição";
    }
  }

  if (step === 2) {
    if (data.titulo.trim().length < 5) {
      errors.titulo = "Título deve ter pelo menos 5 caracteres";
    } else if (data.titulo.length > 200) {
      errors.titulo = "Título deve ter no máximo 200 caracteres";
    }
    if (!data.categoria) {
      errors.categoria = "Selecione uma categoria";
    }
    if (!data.regiao.trim()) {
      errors.regiao = "Informe a região de atuação";
    }
    if (!data.pais.trim()) {
      errors.pais = "Informe o país";
    }
    if (data.tempoMinisterioAnos === "") {
      errors.tempoMinisterioAnos = "Informe o tempo no ministério";
    } else if (
      (data.tempoMinisterioAnos as number) < 0 ||
      (data.tempoMinisterioAnos as number) > 70
    ) {
      errors.tempoMinisterioAnos = "Tempo inválido (0–70 anos)";
    }
    if (data.contextoMinisterial.trim().length < 30) {
      errors.contextoMinisterial =
        "Descreva o contexto ministerial (mínimo 30 caracteres)";
    }
    if (data.beneficiariosQuantidade === "") {
      errors.beneficiariosQuantidade = "Informe o número de beneficiários";
    } else if ((data.beneficiariosQuantidade as number) < 1) {
      errors.beneficiariosQuantidade = "Mínimo 1 beneficiário";
    }
    if (data.beneficiariosDescricao.trim().length < 20) {
      errors.beneficiariosDescricao =
        "Descreva os beneficiários (mínimo 20 caracteres)";
    }
    if (data.objetivos.trim().length < 50) {
      errors.objetivos = "Objetivos devem ter pelo menos 50 caracteres";
    }
    if (data.justificativa.trim().length < 50) {
      errors.justificativa = "Justificativa deve ter pelo menos 50 caracteres";
    }
    if (data.metodologia.trim().length < 50) {
      errors.metodologia = "Metodologia deve ter pelo menos 50 caracteres";
    }
    if (data.resultadosEsperados.trim().length < 50) {
      errors.resultadosEsperados =
        "Resultados esperados devem ter pelo menos 50 caracteres";
    }
  }

  if (step === 3) {
    if (data.valorTotal === "" || (data.valorTotal as number) <= 0) {
      errors.valorTotal = "Informe um valor positivo";
    }
    if (data.numeroParcelas < 1 || data.numeroParcelas > 12) {
      errors.numeroParcelas = "Número de parcelas inválido (1–12)";
    }
    if (data.mesesPagamento.length === 0) {
      errors.mesesPagamento = "Selecione pelo menos um mês de pagamento";
    } else if (data.mesesPagamento.length !== data.numeroParcelas) {
      errors.mesesPagamento = `Selecione exatamente ${data.numeroParcelas} mês(es) de pagamento`;
    }
  }

  return errors;
}

// ─── StepIndicator ────────────────────────────────────────────────────────────

function StepIndicator({
  current,
  onJump,
}: {
  current: number;
  onJump: (step: number) => void;
}) {
  return (
    <nav aria-label="Etapas do formulário" className="flex items-center">
      {STEPS.map((step, idx) => {
        const isCompleted = step.id < current;
        const isCurrent = step.id === current;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => isCompleted && onJump(step.id)}
                disabled={!isCompleted}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Etapa ${step.id}: ${step.label}`}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-default"
                style={{
                  backgroundColor:
                    isCompleted || isCurrent
                      ? "var(--hb-blue)"
                      : "var(--hb-gray-100)",
                  color:
                    isCompleted || isCurrent ? "#fff" : "var(--hb-gray-400)",
                  cursor: isCompleted ? "pointer" : "default",
                }}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" aria-hidden />
                ) : (
                  <Icon className="w-4 h-4" aria-hidden />
                )}
              </button>
              <span
                className="text-[11px] font-semibold hidden sm:block"
                style={{
                  color:
                    isCurrent || isCompleted
                      ? "var(--hb-blue)"
                      : "var(--fg-muted)",
                }}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className="h-px w-8 sm:w-12 mx-1 mb-5 transition-colors duration-200"
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

// ─── ProjectWizard ────────────────────────────────────────────────────────────

interface ProjectWizardProps {
  organizations?: Organization[];
  editalId?: string;
  categoriaInicial?: string;
}

export function ProjectWizard({
  organizations = mockOrganizations,
  editalId = "",
  categoriaInicial = "",
}: ProjectWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardFormData>({
    ...INITIAL,
    editalId,
    categoria: (categoriaInicial as WizardFormData["categoria"]) || "",
  });
  const [files, setFiles] = useState<WizardFiles>({
    video: null,
    spreadsheet: null,
    letter: null,
  });
  const [errors, setErrors] = useState<WizardErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const patch = useCallback((updates: Partial<WizardFormData>) => {
    setData((prev) => ({ ...prev, ...updates }));
    setErrors((prev) => {
      const cleared = new Set(Object.keys(updates));
      return Object.fromEntries(
        Object.entries(prev).filter(([k]) => !cleared.has(k)),
      ) as WizardErrors;
    });
  }, []);

  const patchFiles = useCallback((updates: Partial<WizardFiles>) => {
    setFiles((prev) => ({ ...prev, ...updates }));
    if (updates.letter !== undefined) {
      setData((prev) => ({
        ...prev,
        cartaRecomendacao: updates.letter !== null,
      }));
    }
  }, []);

  function handleNext() {
    const stepErrors = validateStep(step, data, files);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleJumpTo(target: number) {
    if (target < step) {
      setErrors({});
      setStep(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    await new Promise((res) => setTimeout(res, 1200));
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center text-center gap-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--hb-green-muted)" }}
        >
          <Check
            className="w-8 h-8"
            style={{ color: "var(--hb-green)" }}
            aria-hidden
          />
        </div>
        <div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
          >
            Projeto Submetido
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--fg-muted)" }}
          >
            Seu projeto foi enviado para análise da diretoria. Você receberá uma
            notificação quando houver atualizações.
          </p>
          <p
            className="text-xs mt-5 italic leading-relaxed"
            style={{ color: "var(--fg-subtle)" }}
          >
            "Entrega o teu caminho ao Senhor, confia nele, e ele tudo fará."
            <br />— Salmos 37:5
          </p>
        </div>
      </div>
    );
  }

  const currentStep = STEPS.find((s) => s.id === step);
  const Icon = currentStep?.icon ?? Eye;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex justify-center mb-8 overflow-x-auto pb-2">
        <StepIndicator current={step} onJump={handleJumpTo} />
      </div>

      <div
        className="rounded-[--radius-lg] border overflow-hidden"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
          boxShadow: "var(--shadow-md, 0 4px 24px rgba(19,23,55,0.08))",
        }}
      >
        {/* Step header */}
        <div
          className="px-6 py-4 border-b flex items-center gap-3"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-alt)",
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "var(--brand)", color: "#fff" }}
          >
            <Icon className="w-4 h-4" aria-hidden />
          </div>
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--fg-muted)" }}
            >
              Etapa {step} de {STEPS.length}
            </p>
            <p
              className="text-base font-semibold"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--fg)",
              }}
            >
              {currentStep?.label}
            </p>
          </div>
          {data.editalId && (
            <span
              className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: "var(--hb-cyan-muted)",
                color: "var(--hb-cyan-fg)",
              }}
            >
              Edital vinculado
            </span>
          )}
        </div>

        {/* Step content */}
        <div className="px-6 py-6">
          {step === 1 && (
            <StepInstitution
              data={data}
              errors={errors}
              onChange={patch}
              organizations={organizations}
            />
          )}
          {step === 2 && (
            <StepProposal data={data} errors={errors} onChange={patch} />
          )}
          {step === 3 && (
            <StepBudget data={data} errors={errors} onChange={patch} />
          )}
          {step === 4 && (
            <StepAttachments
              files={files}
              onFileChange={patchFiles}
              errors={errors}
            />
          )}
          {step === 5 && (
            <StepReview
              data={data}
              files={files}
              organizations={organizations}
              onJumpTo={handleJumpTo}
            />
          )}
        </div>

        {/* Navigation */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between gap-4"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-1.5 rounded-[--radius-md] border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none"
            style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
            Voltar
          </button>

          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((s) => (
              <div
                key={s.id}
                className="w-2 h-2 rounded-full transition-all duration-200"
                style={{
                  backgroundColor:
                    s.id <= step ? "var(--hb-blue)" : "var(--hb-gray-100)",
                  opacity: s.id < step ? 0.4 : 1,
                }}
              />
            ))}
          </div>

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-[--radius-md] px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: "var(--brand)",
                color: "var(--brand-fg)",
              }}
            >
              Próximo
              <ChevronRight className="w-4 h-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-[--radius-md] px-5 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-70"
              style={{ backgroundColor: "var(--hb-green)" }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                <Check className="w-4 h-4" aria-hidden />
              )}
              {submitting ? "Enviando…" : "Submeter Projeto"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

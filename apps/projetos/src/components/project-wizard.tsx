"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import type { z } from "zod";
import { parseProjetoNovoParams } from "@hebron/integrations/documentos-projetos-client";
import {
  createAnnualProjectSchema,
  createPunctualProjectSchema,
  annualStep1Schema,
  annualStep2Schema,
  annualStep3Schema,
  annualStep4Schema,
  pontualStep1Schema,
  pontualStep2Schema,
  pontualStep3Schema,
} from "@hebron/validators/projetos";
import {
  getMyOrganizations,
  getEditalPrefillForWizard,
  type OrgOption,
} from "../lib/queries";
import { createAnnualDraft, createPunctualDraft } from "../actions/projects";
import { StepInstitution } from "./project-wizard-steps/step-institution";
import {
  StepProposalAnnual,
  StepProposalPontual,
} from "./project-wizard-steps/step-proposal";
import { StepBudget } from "./project-wizard-steps/step-budget";
import { StepSchedule } from "./project-wizard-steps/step-schedule";
import { StepAttachments } from "./project-wizard-steps/step-attachments";
import { StepReview } from "./project-wizard-steps/step-review";

// ─── Shape do formulário ────────────────────────────────────────────────────
// Renomeado de `FormData` (S-36/P-2.9c) para não sombrear o tipo global do
// DOM — sem relação com o defeito corrigido aqui, mas trivial de acertar
// enquanto o arquivo é recriado.

export type AttachmentItem = {
  docId: string;
  storagePath: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
};

export type WizardFormData = {
  // Edital (prefill via ?edital_id=, ver parseProjetoNovoParams — P-1.23b)
  editalId: string | null;
  editalTitle: string | null;
  // Step 1
  orgId: string;
  projectType: "anual" | "pontual";
  // Renovação (P-2.13) — opt-in via banner "Usar como base"; nunca setado
  // automaticamente. Só é enviado para createAnnualDraft/createPunctualDraft
  // (ambos já aceitam parentProjectId, ver actions/projects.ts).
  parentProjectId: string | null;
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
  // Step 4 (só anual — BRAIN §6.2: pontual não tem parcelas)
  anoReferencia: string;
  mesesSelecionados: number[];
  // Step 5
  cartaRecomendacao: boolean;
  anexos: AttachmentItem[];
};

const INITIAL: WizardFormData = {
  editalId: null,
  editalTitle: null,
  orgId: "",
  projectType: "anual",
  parentProjectId: null,
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

// ─── Etapas ─────────────────────────────────────────────────────────────────
// O wizard pontual pula "Cronograma": createPunctualProjectSchema não tem
// anoReferencia/mesesPagamento/numeroParcelas (BRAIN §6.2, "sem parcelas,
// pagamento único") — mostrar a etapa coletaria dados que nenhuma action lê.

type WizardStep = { id: number; label: string; icon: React.ElementType };

const ANNUAL_STEPS: WizardStep[] = [
  { id: 1, label: "Instituição", icon: Building2 },
  { id: 2, label: "Proposta", icon: FileText },
  { id: 3, label: "Orçamento", icon: DollarSign },
  { id: 4, label: "Cronograma", icon: Calendar },
  { id: 5, label: "Anexos", icon: Paperclip },
  { id: 6, label: "Revisão", icon: Eye },
];

const PONTUAL_STEPS: WizardStep[] = [
  { id: 1, label: "Instituição", icon: Building2 },
  { id: 2, label: "Proposta", icon: FileText },
  { id: 3, label: "Orçamento", icon: DollarSign },
  { id: 4, label: "Anexos", icon: Paperclip },
  { id: 5, label: "Revisão", icon: Eye },
];

// ─── Tradução payload (schema) → formulário ────────────────────────────────
// createAnnualProjectSchema/createPunctualProjectSchema usam os nomes do
// banco; o formulário usa alguns nomes próprios de UI. Só dois divergem.

const PAYLOAD_TO_FORM_KEY: Partial<Record<string, keyof WizardFormData>> = {
  organizacaoId: "orgId",
  mesesPagamento: "mesesSelecionados",
};

function toFormKey(path: string): keyof WizardFormData {
  return (PAYLOAD_TO_FORM_KEY[path] ?? path) as keyof WizardFormData;
}

// Campos de cada etapa, no vocabulário do formulário — usado para limpar
// erros da etapa quando ela revalida com sucesso. Uma constante por etapa
// (em vez de um Record indexado por número) para não precisar de
// non-null assertion ao ler (proibidas neste projeto).
const ANNUAL_STEP_1_FIELDS: (keyof WizardFormData)[] = ["orgId"];
const ANNUAL_STEP_2_FIELDS: (keyof WizardFormData)[] = [
  "titulo",
  "categoria",
  "objetivos",
  "justificativa",
  "metodologia",
  "contextoMinisterial",
  "tempoMinisterioAnos",
  "regiao",
  "pais",
  "beneficiariosQuantidade",
  "beneficiariosDescricao",
  "resultadosEsperados",
];
const ANNUAL_STEP_3_FIELDS: (keyof WizardFormData)[] = [
  "valorTotal",
  "numeroParcelas",
];
const ANNUAL_STEP_4_FIELDS: (keyof WizardFormData)[] = [
  "anoReferencia",
  "mesesSelecionados",
];

const PONTUAL_STEP_1_FIELDS: (keyof WizardFormData)[] = ["orgId"];
const PONTUAL_STEP_2_FIELDS: (keyof WizardFormData)[] = [
  "titulo",
  "categoria",
  "motivoEmergencial",
  "prazoNecessidade",
  "descricao",
  "regiao",
  "pais",
];
const PONTUAL_STEP_3_FIELDS: (keyof WizardFormData)[] = ["valorTotal"];

// Etapa onde cada campo é coletado — usado para levar o usuário até o erro
// quando a falha só aparece no envio final (client ou servidor).
const ANNUAL_FIELD_STEP: Partial<Record<keyof WizardFormData, number>> = {
  orgId: 1,
  titulo: 2,
  categoria: 2,
  objetivos: 2,
  justificativa: 2,
  metodologia: 2,
  contextoMinisterial: 2,
  tempoMinisterioAnos: 2,
  regiao: 2,
  pais: 2,
  beneficiariosQuantidade: 2,
  beneficiariosDescricao: 2,
  resultadosEsperados: 2,
  valorTotal: 3,
  numeroParcelas: 3,
  cofinancimento: 3,
  anoReferencia: 4,
  mesesSelecionados: 4,
  cartaRecomendacao: 5,
  anexos: 5,
};

const PONTUAL_FIELD_STEP: Partial<Record<keyof WizardFormData, number>> = {
  orgId: 1,
  titulo: 2,
  categoria: 2,
  motivoEmergencial: 2,
  prazoNecessidade: 2,
  descricao: 2,
  regiao: 2,
  pais: 2,
  valorTotal: 3,
  cartaRecomendacao: 4,
  anexos: 4,
};

// ─── Conversão string de formulário → tipo do schema ───────────────────────
// String vazia vira `undefined` (não `NaN`): um campo numérico obrigatório
// ausente vira a mensagem padrão do Zod "Required", mais legível que
// "Expected number, received nan".

function toIntOrUndefined(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}

function toFloatOrUndefined(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function toIsoDateTimeOrUndefined(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function buildAnnualPayload(data: WizardFormData) {
  return {
    titulo: data.titulo,
    categoria: data.categoria,
    organizacaoId: data.orgId,
    anoReferencia: toIntOrUndefined(data.anoReferencia),
    objetivos: data.objetivos,
    justificativa: data.justificativa,
    metodologia: data.metodologia,
    contextoMinisterial: data.contextoMinisterial,
    tempoMinisterioAnos: toIntOrUndefined(data.tempoMinisterioAnos),
    regiao: data.regiao,
    pais: data.pais,
    beneficiariosQuantidade: toIntOrUndefined(data.beneficiariosQuantidade),
    beneficiariosDescricao: data.beneficiariosDescricao,
    resultadosEsperados: data.resultadosEsperados,
    cartaRecomendacao: data.cartaRecomendacao,
    valorTotal: toFloatOrUndefined(data.valorTotal),
    numeroParcelas: toIntOrUndefined(data.numeroParcelas),
    mesesPagamento: data.mesesSelecionados,
    editalId: data.editalId,
    parentProjectId: data.parentProjectId,
    cofinancimento: data.cofinancimento || null,
    attachments: data.anexos.map((a) => ({
      fileUrl: a.fileUrl,
      fileName: a.fileName,
      fileSize: a.fileSize,
    })),
  };
}

function buildPontualPayload(data: WizardFormData) {
  return {
    titulo: data.titulo,
    categoria: data.categoria,
    organizacaoId: data.orgId,
    valorTotal: toFloatOrUndefined(data.valorTotal),
    motivoEmergencial: data.motivoEmergencial,
    prazoNecessidade: toIsoDateTimeOrUndefined(data.prazoNecessidade),
    descricao: data.descricao || undefined,
    beneficiariosQuantidade: data.beneficiariosQuantidade
      ? toIntOrUndefined(data.beneficiariosQuantidade)
      : undefined,
    regiao: data.regiao || undefined,
    pais: data.pais || undefined,
    editalId: data.editalId,
    parentProjectId: data.parentProjectId,
    attachments: data.anexos.map((a) => ({
      fileUrl: a.fileUrl,
      fileName: a.fileName,
      fileSize: a.fileSize,
    })),
  };
}

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
                    isCompleted || isCurrent
                      ? "var(--fg-invert)"
                      : "var(--hb-gray-400)",
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

// ─── Wizard ─────────────────────────────────────────────────────────────────

export function ProjectWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardFormData>(INITIAL);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof WizardFormData, string>>
  >({});
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const STEPS = data.projectType === "anual" ? ANNUAL_STEPS : PONTUAL_STEPS;

  useEffect(() => {
    void getMyOrganizations().then((result) => {
      setOrgs(result);
      setOrgsLoading(false);
    });
  }, []);

  // P-1.23b: nome do parâmetro (edital_id, com editalId como alias de leitura),
  // categoria (slug de projetos.categories) e ciclo (renomeado de `tipo`, que
  // colidia com o tipo de projeto do próprio edital) agora vêm de um único
  // contrato compartilhado — packages/integrations/documentos-projetos.
  useEffect(() => {
    const { editalId } = parseProjetoNovoParams(searchParams);
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
          projectType: prefill.ciclo,
          categoria: prefill.categoria ?? prev.categoria,
        }));
      })
      .catch((err) => {
        console.error("[projetos/novo] edital prefill failed:", err);
      });
  }, [searchParams]);

  function patch(updates: Partial<WizardFormData>) {
    setData((prev) => ({ ...prev, ...updates }));
    setFieldErrors((prev) => {
      // Trocar o tipo de projeto muda o que cada chave de erro significa —
      // os schemas de etapa são outros. Começar do zero é mais seguro que
      // tentar traduzir erros de um vocabulário para o outro.
      if ("projectType" in updates) return {};
      const next = { ...prev };
      for (const key of Object.keys(updates)) {
        next[key as keyof WizardFormData] = undefined;
      }
      return next;
    });
  }

  function applyStepResult(
    result: z.SafeParseReturnType<unknown, unknown>,
    stepFields: (keyof WizardFormData)[],
  ): boolean {
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of stepFields) next[key] = undefined;
      if (!result.success) {
        for (const issue of result.error.issues) {
          next[toFormKey(String(issue.path[0]))] = issue.message;
        }
      }
      return next;
    });
    return result.success;
  }

  function validateStep(currentStep: number): boolean {
    if (data.projectType === "anual") {
      const payload = buildAnnualPayload(data);
      switch (currentStep) {
        case 1:
          return applyStepResult(
            annualStep1Schema.safeParse(payload),
            ANNUAL_STEP_1_FIELDS,
          );
        case 2:
          return applyStepResult(
            annualStep2Schema.safeParse(payload),
            ANNUAL_STEP_2_FIELDS,
          );
        case 3:
          return applyStepResult(
            annualStep3Schema.safeParse(payload),
            ANNUAL_STEP_3_FIELDS,
          );
        case 4:
          return applyStepResult(
            annualStep4Schema.safeParse(payload),
            ANNUAL_STEP_4_FIELDS,
          );
        default:
          return true;
      }
    }

    const payload = buildPontualPayload(data);
    switch (currentStep) {
      case 1:
        return applyStepResult(
          pontualStep1Schema.safeParse(payload),
          PONTUAL_STEP_1_FIELDS,
        );
      case 2:
        return applyStepResult(
          pontualStep2Schema.safeParse(payload),
          PONTUAL_STEP_2_FIELDS,
        );
      case 3:
        return applyStepResult(
          pontualStep3Schema.safeParse(payload),
          PONTUAL_STEP_3_FIELDS,
        );
      default:
        return true;
    }
  }

  function jumpToFirstErrorStep(
    issues: { path: (string | number)[]; message: string }[],
    type: "anual" | "pontual",
  ) {
    const fieldStepMap =
      type === "anual" ? ANNUAL_FIELD_STEP : PONTUAL_FIELD_STEP;
    let firstStep: number | undefined;
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const issue of issues) {
        const formKey = toFormKey(String(issue.path[0]));
        next[formKey] = issue.message;
        const s = fieldStepMap[formKey];
        if (s !== undefined && (firstStep === undefined || s < firstStep)) {
          firstStep = s;
        }
      }
      return next;
    });
    if (firstStep !== undefined) setStep(firstStep);
  }

  function applyServerValidationErrors(
    validationErrors: unknown,
    type: "anual" | "pontual",
  ): boolean {
    const fieldStepMap =
      type === "anual" ? ANNUAL_FIELD_STEP : PONTUAL_FIELD_STEP;
    const entries = Object.entries(
      (validationErrors ?? {}) as Record<string, unknown>,
    ).filter(([key]) => key !== "_errors");

    let firstStep: number | undefined;
    let hadFieldErrors = false;
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const [key, val] of entries) {
        if (val && typeof val === "object" && "_errors" in val) {
          const [firstMessage] = (val as { _errors?: string[] })._errors ?? [];
          if (firstMessage) {
            hadFieldErrors = true;
            const formKey = toFormKey(key);
            next[formKey] = firstMessage;
            const s = fieldStepMap[formKey];
            if (s !== undefined && (firstStep === undefined || s < firstStep)) {
              firstStep = s;
            }
          }
        }
      }
      return next;
    });
    if (firstStep !== undefined) setStep(firstStep);
    return hadFieldErrors;
  }

  const { execute: submitAnual, isPending: isSubmittingAnual } = useAction(
    createAnnualDraft,
    {
      onSuccess({ data: result }) {
        if (result?.project?.id) {
          router.push(`/${result.project.id}`);
        }
      },
      onError({ error: err }) {
        if (err.validationErrors) {
          const hadFieldErrors = applyServerValidationErrors(
            err.validationErrors,
            "anual",
          );
          setError(
            hadFieldErrors
              ? "O servidor recusou a submissão — revise os campos indicados abaixo."
              : "Erro de validação no servidor. Revise o formulário e tente novamente.",
          );
          return;
        }
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
        if (err.validationErrors) {
          const hadFieldErrors = applyServerValidationErrors(
            err.validationErrors,
            "pontual",
          );
          setError(
            hadFieldErrors
              ? "O servidor recusou a submissão — revise os campos indicados abaixo."
              : "Erro de validação no servidor. Revise o formulário e tente novamente.",
          );
          return;
        }
        setError(
          err.serverError ?? "Erro ao submeter o projeto. Tente novamente.",
        );
      },
    },
  );

  const isSubmitting = isSubmittingAnual || isSubmittingPontual;

  function handleNext() {
    if (!validateStep(step)) return;
    setError(null);
    if (step < STEPS.length) setStep((s) => s + 1);
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  function handleSubmit() {
    setError(null);

    if (data.projectType === "anual") {
      const payload = buildAnnualPayload(data);
      const result = createAnnualProjectSchema.safeParse(payload);
      if (!result.success) {
        jumpToFirstErrorStep(result.error.issues, "anual");
        setError("Revise os campos indicados antes de submeter novamente.");
        return;
      }
      submitAnual(result.data);
    } else {
      const payload = buildPontualPayload(data);
      const result = createPunctualProjectSchema.safeParse(payload);
      if (!result.success) {
        jumpToFirstErrorStep(result.error.issues, "pontual");
        setError("Revise os campos indicados antes de submeter novamente.");
        return;
      }
      submitPontual(result.data);
    }
  }

  const isLastStep = step === STEPS.length;

  function renderStepContent() {
    if (data.projectType === "anual") {
      switch (step) {
        case 1:
          return (
            <StepInstitution
              data={data}
              onChange={patch}
              orgs={orgs}
              orgsLoading={orgsLoading}
              error={fieldErrors.orgId}
            />
          );
        case 2:
          return (
            <StepProposalAnnual
              data={data}
              onChange={patch}
              errors={fieldErrors}
            />
          );
        case 3:
          return (
            <StepBudget data={data} onChange={patch} errors={fieldErrors} />
          );
        case 4:
          return (
            <StepSchedule
              data={data}
              onChange={patch}
              error={fieldErrors.mesesSelecionados}
            />
          );
        case 5:
          return <StepAttachments data={data} onChange={patch} />;
        case 6:
          return <StepReview data={data} orgs={orgs} />;
        default:
          return null;
      }
    }

    switch (step) {
      case 1:
        return (
          <StepInstitution
            data={data}
            onChange={patch}
            orgs={orgs}
            orgsLoading={orgsLoading}
            error={fieldErrors.orgId}
          />
        );
      case 2:
        return (
          <StepProposalPontual
            data={data}
            onChange={patch}
            errors={fieldErrors}
          />
        );
      case 3:
        return <StepBudget data={data} onChange={patch} errors={fieldErrors} />;
      case 4:
        return <StepAttachments data={data} onChange={patch} />;
      case 5:
        return <StepReview data={data} orgs={orgs} />;
      default:
        return null;
    }
  }

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

        {renderStepContent()}
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

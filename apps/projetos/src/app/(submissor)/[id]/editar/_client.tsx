"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { ChevronLeft, Save } from "lucide-react";
import { updateDraftProject } from "../../../../actions/projects";
import {
  FieldLabel,
  TextInput,
  Textarea,
  FieldError,
  MONTHS,
} from "../../../../components/project-wizard-steps/field-controls";
import type { DraftProjectForEdit } from "../../../../lib/queries";

type FormState = {
  title: string;
  objectives: string;
  justification: string;
  targetAudience: string;
  expectedResults: string;
  ministryRegion: string;
  ministryArea: string;
  budgetTotal: string;
  parcelas: string;
  mesesSelecionados: number[];
};

type FieldErrors = Partial<Record<string, string>>;

function extractFieldErrors(validationErrors: unknown): FieldErrors {
  const entries = Object.entries(
    (validationErrors ?? {}) as Record<string, unknown>,
  ).filter(([key]) => key !== "_errors");

  const out: FieldErrors = {};
  for (const [key, val] of entries) {
    if (val && typeof val === "object" && "_errors" in val) {
      const [message] = (val as { _errors?: string[] })._errors ?? [];
      if (message) out[key] = message;
    }
  }
  return out;
}

export function EditDraftClient({ project }: { project: DraftProjectForEdit }) {
  const router = useRouter();
  const isAnual = project.tipo === "anual";
  const backHref = `/${project.id}`;

  const [form, setForm] = useState<FormState>({
    title: project.title,
    objectives: project.objectives ?? "",
    justification: project.justification ?? "",
    targetAudience: project.targetAudience ?? "",
    expectedResults: project.expectedResults ?? "",
    ministryRegion: project.ministryRegion ?? "",
    ministryArea: project.ministryArea ?? "",
    budgetTotal: String(project.budgetTotal),
    parcelas: String(project.parcelas ?? 1),
    mesesSelecionados: project.mesesSelecionados,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  const { execute, isPending } = useAction(updateDraftProject, {
    onSuccess() {
      router.push(backHref);
    },
    onError({ error: err }) {
      if (err.validationErrors) {
        setFieldErrors(extractFieldErrors(err.validationErrors));
        setError("Revise os campos indicados abaixo.");
        return;
      }
      setError(err.serverError ?? "Erro ao salvar. Tente novamente.");
    },
  });

  function patch(updates: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  function toggleMonth(month: number) {
    setForm((prev) => {
      const target = parseInt(prev.parcelas, 10) || 0;
      if (prev.mesesSelecionados.includes(month)) {
        return {
          ...prev,
          mesesSelecionados: prev.mesesSelecionados.filter((m) => m !== month),
        };
      }
      if (prev.mesesSelecionados.length >= target) return prev;
      return {
        ...prev,
        mesesSelecionados: [...prev.mesesSelecionados, month].sort(
          (a, b) => a - b,
        ),
      };
    });
  }

  function handleSubmit() {
    setError(null);
    const budgetTotal = Number(form.budgetTotal);

    execute({
      projectId: project.id,
      title: form.title,
      objectives: form.objectives || undefined,
      justification: form.justification || undefined,
      targetAudience: form.targetAudience || null,
      expectedResults: form.expectedResults || undefined,
      ministryRegion: form.ministryRegion || null,
      ministryArea: form.ministryArea || null,
      budgetTotal: Number.isNaN(budgetTotal) ? undefined : budgetTotal,
      ...(isAnual
        ? {
            parcelas: parseInt(form.parcelas, 10) || undefined,
            mesesPagamento: form.mesesSelecionados,
          }
        : {}),
    });
  }

  const parcelasTarget = parseInt(form.parcelas, 10) || 0;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-(--fg-muted) hover:text-(--fg) transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          Voltar ao projeto
        </Link>
        <h1
          className="text-2xl font-bold text-(--fg) mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Editar Rascunho
        </h1>
        <p className="text-sm text-(--fg-muted)">
          Corrija as informações abaixo antes de submeter à diretoria.
        </p>
      </div>

      <div className="rounded-lg border border-(--border) bg-(--surface) shadow-(--shadow-sm) p-6 mb-6 flex flex-col gap-5">
        <div>
          <FieldLabel required htmlFor="title">
            Título do Projeto
          </FieldLabel>
          <TextInput
            id="title"
            value={form.title}
            onChange={(v) => patch({ title: v })}
            error={fieldErrors.title}
          />
        </div>

        <div>
          <FieldLabel required htmlFor="objectives">
            {isAnual ? "Objetivos" : "Descrição"}
          </FieldLabel>
          <Textarea
            id="objectives"
            value={form.objectives}
            onChange={(v) => patch({ objectives: v })}
            rows={3}
            error={fieldErrors.objectives}
          />
        </div>

        <div>
          <FieldLabel required htmlFor="justification">
            {isAnual ? "Justificativa" : "Motivo Emergencial"}
          </FieldLabel>
          <Textarea
            id="justification"
            value={form.justification}
            onChange={(v) => patch({ justification: v })}
            rows={3}
            error={fieldErrors.justification}
          />
        </div>

        {isAnual && (
          <>
            <div>
              <FieldLabel htmlFor="targetAudience">
                Descrição dos Beneficiários
              </FieldLabel>
              <TextInput
                id="targetAudience"
                value={form.targetAudience}
                onChange={(v) => patch({ targetAudience: v })}
                error={fieldErrors.targetAudience}
              />
            </div>
            <div>
              <FieldLabel htmlFor="expectedResults">
                Resultados Esperados
              </FieldLabel>
              <Textarea
                id="expectedResults"
                value={form.expectedResults}
                onChange={(v) => patch({ expectedResults: v })}
                rows={3}
                error={fieldErrors.expectedResults}
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <FieldLabel htmlFor="ministryRegion">Região de Atuação</FieldLabel>
            <TextInput
              id="ministryRegion"
              value={form.ministryRegion}
              onChange={(v) => patch({ ministryRegion: v })}
              error={fieldErrors.ministryRegion}
            />
          </div>
          <div>
            <FieldLabel htmlFor="ministryArea">País</FieldLabel>
            <TextInput
              id="ministryArea"
              value={form.ministryArea}
              onChange={(v) => patch({ ministryArea: v })}
              error={fieldErrors.ministryArea}
            />
          </div>
        </div>

        <div>
          <FieldLabel required htmlFor="budgetTotal">
            Valor Total Solicitado (R$)
          </FieldLabel>
          <TextInput
            id="budgetTotal"
            type="number"
            value={form.budgetTotal}
            onChange={(v) => patch({ budgetTotal: v })}
            error={fieldErrors.budgetTotal}
          />
        </div>

        {isAnual && (
          <div>
            <FieldLabel required htmlFor="parcelas">
              Número de Parcelas
            </FieldLabel>
            <TextInput
              id="parcelas"
              type="number"
              value={form.parcelas}
              onChange={(v) => patch({ parcelas: v, mesesSelecionados: [] })}
              error={fieldErrors.parcelas}
            />
            <p className="text-xs text-(--fg-muted) mt-3 mb-2">
              Selecione os meses de pagamento — o número deve coincidir com as
              parcelas ({parcelasTarget || "—"}).
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {MONTHS.map((month, idx) => {
                const num = idx + 1;
                const isSelected = form.mesesSelecionados.includes(num);
                const disabled =
                  !isSelected &&
                  form.mesesSelecionados.length >= parcelasTarget;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => toggleMonth(num)}
                    disabled={disabled}
                    aria-pressed={isSelected}
                    className="rounded-(--radius) border-2 px-3 py-2 text-xs font-semibold transition-all duration-(--dur-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      borderColor: isSelected
                        ? "var(--hb-blue)"
                        : "var(--border)",
                      backgroundColor: isSelected
                        ? "var(--brand-muted)"
                        : "var(--surface)",
                      color: isSelected ? "var(--hb-blue)" : "var(--fg-muted)",
                    }}
                  >
                    {month.substring(0, 3)}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-(--fg-muted) mt-2">
              {form.mesesSelecionados.length} de {parcelasTarget || "—"} mês
              {parcelasTarget !== 1 ? "es" : ""} selecionado
              {form.mesesSelecionados.length !== 1 ? "s" : ""}.
            </p>
            <FieldError
              id="mesesPagamento-error"
              error={fieldErrors.mesesPagamento}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-(--color-destructive) bg-(--color-destructive-muted) px-4 py-3 text-sm text-(--color-destructive) mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-md border border-(--border) px-4 py-2.5 text-sm font-semibold text-(--fg-muted) hover:border-(--brand) hover:text-(--brand) transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "var(--hb-orange)" }}
        >
          <Save className="w-4 h-4" aria-hidden />
          {isPending ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}

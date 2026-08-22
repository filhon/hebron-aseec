"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import {
  Button,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import {
  confirmScoringPoints,
  requestScoringSuggestion,
} from "../actions/scoring";

// ---------------------------------------------------------------------------
// ScoringForm — formulário do gestor para os 3 critérios sem pontuação
// puramente automática: d) saúde autodeclarada e g) intensidade ministerial
// (com sugestão de IA, P-7.13/PATCH-012) e e) situação familiar especial
// (sem IA — avaliação humana, inalterado desde P-7.9). Os outros 8 critérios
// são 100% determinísticos e não aparecem aqui.
//
// A sugestão de IA (badge "Sugestão IA: X pontos") é sempre editável e nunca
// pré-aplicada automaticamente — os 3 campos partem do valor já gravado
// (initial*Points) e só mudam quando o gestor interage. A pontuação enviada
// em "Confirmar pontuação" é sempre o valor selecionado nos Selects, nunca a
// sugestão diretamente (BRAIN §6.8/§8).
// ---------------------------------------------------------------------------

type HealthDeclaredPoints = 0 | 5;
type MinistryIntensityPoints = 0 | 5 | 10;

const HEALTH_OPTIONS: { value: HealthDeclaredPoints; label: string }[] = [
  { value: 0, label: "Não — 0 pontos" },
  { value: 5, label: "Sim — 5 pontos" },
];

const MINISTRY_INTENSITY_OPTIONS: {
  value: MinistryIntensityPoints;
  label: string;
}[] = [
  { value: 0, label: "Baixa — 0 pontos" },
  { value: 5, label: "Média — 5 pontos" },
  { value: 10, label: "Alta — 10 pontos" },
];

const FAMILY_SITUATION_POINTS = [0, 1, 2, 3, 4, 5] as const;

export interface ScoringFormProps {
  reservationId: string;
  initialHealthDeclaredPoints: HealthDeclaredPoints;
  initialMinistryIntensityPoints: MinistryIntensityPoints;
  initialSpecialFamilySituationPoints: number;
  onSaved?: (result: { totalPoints: number }) => void | Promise<void>;
  className?: string;
}

interface AiSuggestion {
  healthDeclaredPoints: HealthDeclaredPoints | null;
  ministryIntensityPoints: MinistryIntensityPoints | null;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

export function ScoringForm({
  reservationId,
  initialHealthDeclaredPoints,
  initialMinistryIntensityPoints,
  initialSpecialFamilySituationPoints,
  onSaved,
  className,
}: ScoringFormProps) {
  const [healthDeclaredPoints, setHealthDeclaredPoints] = useState(
    initialHealthDeclaredPoints,
  );
  const [ministryIntensityPoints, setMinistryIntensityPoints] = useState(
    initialMinistryIntensityPoints,
  );
  const [specialFamilySituationPoints, setSpecialFamilySituationPoints] =
    useState(initialSpecialFamilySituationPoints);

  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSuggestionLoading(true);

    requestScoringSuggestion({ reservationId })
      .then((result) => {
        if (cancelled) return;
        if (result?.data) {
          setSuggestion({
            healthDeclaredPoints: result.data.healthDeclaredPoints,
            ministryIntensityPoints: result.data.ministryIntensityPoints,
          });
        }
      })
      .catch(() => {
        // Falha da IA não bloqueia o scoring manual — sem sugestão visível.
      })
      .finally(() => {
        if (!cancelled) setSuggestionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reservationId]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const result = await confirmScoringPoints({
        reservationId,
        healthDeclaredPoints,
        ministryIntensityPoints,
        specialFamilySituationPoints,
      });
      if (result?.serverError) throw new Error(result.serverError);
      if (result?.validationErrors) {
        throw new Error(
          "Dados inválidos — revise os campos e tente novamente.",
        );
      }
      setSaved(true);
      if (result?.data) await onSaved?.(result.data);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Falha ao gravar a pontuação.",
      );
    } finally {
      setSaving(false);
    }
  }

  const healthHasSuggestion =
    typeof suggestion?.healthDeclaredPoints === "number";
  const ministryHasSuggestion =
    typeof suggestion?.ministryIntensityPoints === "number";

  return (
    <form
      className={cn("flex flex-col gap-4", className)}
      onSubmit={(event) => void handleSave(event)}
    >
      <FormField
        id="scoring-form-health"
        label="d) Saúde autodeclarada"
        hint={
          suggestionLoading
            ? "Buscando sugestão da IA…"
            : "Sugestão a partir do texto livre já lido pelo gestor — sempre editável"
        }
      >
        {healthHasSuggestion && (
          <p
            id="scoring-form-health-suggestion"
            className="mb-1 flex items-center gap-1 text-xs text-(--hb-purple)"
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Sugestão IA: {suggestion?.healthDeclaredPoints} pontos
          </p>
        )}
        <Select
          value={String(healthDeclaredPoints)}
          onValueChange={(v) =>
            setHealthDeclaredPoints(Number(v) as HealthDeclaredPoints)
          }
        >
          <SelectTrigger
            id="scoring-form-health"
            aria-describedby={
              healthHasSuggestion ? "scoring-form-health-suggestion" : undefined
            }
          >
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {HEALTH_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        id="scoring-form-ministry"
        label="g) Intensidade ministerial atual"
        hint={
          suggestionLoading
            ? "Buscando sugestão da IA…"
            : "Sugestão a partir do texto livre já lido pelo gestor — sempre editável"
        }
      >
        {ministryHasSuggestion && (
          <p
            id="scoring-form-ministry-suggestion"
            className="mb-1 flex items-center gap-1 text-xs text-(--hb-purple)"
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Sugestão IA: {suggestion?.ministryIntensityPoints} pontos
          </p>
        )}
        <Select
          value={String(ministryIntensityPoints)}
          onValueChange={(v) =>
            setMinistryIntensityPoints(Number(v) as MinistryIntensityPoints)
          }
        >
          <SelectTrigger
            id="scoring-form-ministry"
            aria-describedby={
              ministryHasSuggestion
                ? "scoring-form-ministry-suggestion"
                : undefined
            }
          >
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {MINISTRY_INTENSITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        id="scoring-form-family"
        label="e) Situação familiar especial"
        hint="Sem sugestão de IA — avaliação do gestor sobre o texto livre do hóspede"
      >
        <Select
          value={String(specialFamilySituationPoints)}
          onValueChange={(v) => setSpecialFamilySituationPoints(Number(v))}
        >
          <SelectTrigger id="scoring-form-family">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {FAMILY_SITUATION_POINTS.map((points) => (
              <SelectItem key={points} value={String(points)}>
                {points} ponto{points !== 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div role="status" aria-live="polite">
        {saveError && (
          <p className="rounded-(--radius) bg-(--color-destructive-muted) px-4 py-3 text-sm text-(--color-destructive)">
            {saveError}
          </p>
        )}
        {saved && !saveError && (
          <p className="text-sm text-(--color-success)">
            Pontuação confirmada e gravada.
          </p>
        )}
      </div>

      <Button type="submit" loading={saving} disabled={saving}>
        Confirmar pontuação
      </Button>
    </form>
  );
}

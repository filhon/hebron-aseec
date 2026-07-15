"use client";

import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { Sparkles } from "lucide-react";
import {
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import { SCORING_MAX_POINTS } from "@hebron/types/flats";
import type {
  LastRestOutsideCity,
  MinistryIntensity,
  MinistryLocation,
  SupportType,
  UsageFrequency,
} from "@hebron/types/flats";
import type { ReservationWizardValues } from "../reservation-wizard";

const USAGE_FREQUENCY_OPTIONS: {
  value: UsageFrequency;
  label: string;
  points: number;
}[] = [
  { value: "nunca", label: "Nunca usei o flat", points: 10 },
  { value: "mais_de_1_ano", label: "Última vez há mais de 1 ano", points: 5 },
  {
    value: "menos_de_12_meses",
    label: "Última vez há menos de 12 meses",
    points: 0,
  },
];

const MINISTRY_LOCATION_OPTIONS: {
  value: MinistryLocation;
  label: string;
  points: number;
}[] = [
  { value: "remota", label: "Área remota", points: 10 },
  { value: "periferia", label: "Periferia", points: 5 },
  { value: "centro", label: "Centro urbano", points: 0 },
];

const LAST_REST_OPTIONS: {
  value: LastRestOutsideCity;
  label: string;
  points: number;
}[] = [
  {
    value: "mais_de_2_anos",
    label: "Mais de 2 anos sem descansar fora",
    points: 10,
  },
  {
    value: "entre_1_e_2_anos",
    label: "Entre 1 e 2 anos sem descansar fora",
    points: 5,
  },
  {
    value: "menos_de_1_ano",
    label: "Menos de 1 ano sem descansar fora",
    points: 0,
  },
];

const MINISTRY_INTENSITY_OPTIONS: {
  value: MinistryIntensity;
  label: string;
  points: number;
}[] = [
  { value: "alta", label: "Alta", points: 10 },
  { value: "media", label: "Média", points: 5 },
  { value: "baixa", label: "Baixa", points: 0 },
];

const SUPPORT_TYPE_OPTIONS: {
  value: SupportType;
  label: string;
  points: number;
}[] = [
  { value: "dependente", label: "Dependente de sustento", points: 5 },
  { value: "parcial", label: "Sustento parcial", points: 3 },
  { value: "autossustentado", label: "Autossustentado", points: 0 },
];

function ageInYears(startIso: string): number {
  if (!startIso) return 0;
  const start = new Date(`${startIso}T00:00:00`);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const hasNotHadAnniversaryYet =
    now.getMonth() < start.getMonth() ||
    (now.getMonth() === start.getMonth() && now.getDate() < start.getDate());
  if (hasNotHadAnniversaryYet) years -= 1;
  return Math.max(0, years);
}

export function StepScoring() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ReservationWizardValues>();

  const dadoSaudeConsent = watch("consent.dadoSaude");
  const ministryStartDate = watch("guest.ministryStartDate");
  const answers = watch("scoringAnswers");
  const scoringErrors = errors.scoringAnswers;

  const ministryYears = ageInYears(ministryStartDate);
  const ministryYearsPoints = Math.min(ministryYears, 10);

  const usageFrequencyPoints =
    USAGE_FREQUENCY_OPTIONS.find((o) => o.value === answers.usageFrequency)
      ?.points ?? 0;
  const ministryLocationPoints =
    MINISTRY_LOCATION_OPTIONS.find((o) => o.value === answers.ministryLocation)
      ?.points ?? 0;
  const healthDeclaredPoints =
    dadoSaudeConsent && answers.healthDeclared === "sim" ? 5 : 0;
  const lastRestPoints =
    LAST_REST_OPTIONS.find((o) => o.value === answers.lastRestOutsideCity)
      ?.points ?? 0;
  const ministryIntensityPoints =
    MINISTRY_INTENSITY_OPTIONS.find(
      (o) => o.value === answers.ministryIntensity,
    )?.points ?? 0;
  const recommendationLetterPoints =
    answers.hasRecommendationLetter === "sim" ? 5 : 0;
  const supportTypePoints =
    SUPPORT_TYPE_OPTIONS.find((o) => o.value === answers.supportType)?.points ??
    0;

  const knownTotal = useMemo(
    () =>
      ministryYearsPoints +
      usageFrequencyPoints +
      ministryLocationPoints +
      healthDeclaredPoints +
      lastRestPoints +
      ministryIntensityPoints +
      recommendationLetterPoints +
      supportTypePoints,
    [
      ministryYearsPoints,
      usageFrequencyPoints,
      ministryLocationPoints,
      healthDeclaredPoints,
      lastRestPoints,
      ministryIntensityPoints,
      recommendationLetterPoints,
      supportTypePoints,
    ],
  );

  const percent = (knownTotal / SCORING_MAX_POINTS) * 100;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-(--font-display) text-lg font-semibold text-(--fg)">
        Critérios de avaliação
      </h2>
      <p className="text-sm text-(--fg-muted)">
        Estas respostas alimentam a pontuação automática e determinística usada
        pela gestão para priorizar solicitações (BRAIN §6.8). A pontuação em si
        nunca é digitada por você.
      </p>

      <div className="flex flex-col gap-2 rounded-(--radius) border border-(--border) bg-(--surface) p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-(--fg)">
            Pontuação estimada
          </span>
          <span
            className="text-xl font-bold tabular-nums text-(--fg)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {knownTotal}
            <span className="text-sm font-normal text-(--fg-muted)">
              /{SCORING_MAX_POINTS}
            </span>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-(--radius-pill) bg-(--surface-alt)">
          <div
            className="h-full rounded-(--radius-pill) bg-(--brand)"
            style={{
              width: `${percent}%`,
              transition: "width var(--dur-slow) var(--ease-out)",
            }}
          />
        </div>
        <p className="flex items-center gap-1.5 text-xs text-(--fg-muted)">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Situação familiar especial e participação em projetos Hebron são
          avaliadas pela gestão após o envio e não entram neste cálculo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="scoringAnswers.usageFrequency"
          label="Frequência de uso do flat"
          required
          hint={`Vale ${usageFrequencyPoints} de 10 pontos`}
          error={scoringErrors?.usageFrequency?.message}
        >
          <Select
            value={answers.usageFrequency}
            onValueChange={(v) =>
              setValue("scoringAnswers.usageFrequency", v as UsageFrequency, {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="scoringAnswers.usageFrequency">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {USAGE_FREQUENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          id="scoringAnswers.ministryLocation"
          label="Local/contexto de atuação"
          required
          hint={`Vale ${ministryLocationPoints} de 10 pontos`}
          error={scoringErrors?.ministryLocation?.message}
        >
          <Select
            value={answers.ministryLocation}
            onValueChange={(v) =>
              setValue(
                "scoringAnswers.ministryLocation",
                v as MinistryLocation,
                { shouldValidate: true },
              )
            }
          >
            <SelectTrigger id="scoringAnswers.ministryLocation">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {MINISTRY_LOCATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          id="scoringAnswers.lastRestOutsideCity"
          label="Último descanso fora da cidade"
          required
          hint={`Vale ${lastRestPoints} de 10 pontos`}
          error={scoringErrors?.lastRestOutsideCity?.message}
        >
          <Select
            value={answers.lastRestOutsideCity}
            onValueChange={(v) =>
              setValue(
                "scoringAnswers.lastRestOutsideCity",
                v as LastRestOutsideCity,
                { shouldValidate: true },
              )
            }
          >
            <SelectTrigger id="scoringAnswers.lastRestOutsideCity">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {LAST_REST_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          id="scoringAnswers.ministryIntensity"
          label="Intensidade ministerial atual"
          required
          hint={`Vale ${ministryIntensityPoints} de 10 pontos`}
          error={scoringErrors?.ministryIntensity?.message}
        >
          <Select
            value={answers.ministryIntensity}
            onValueChange={(v) =>
              setValue(
                "scoringAnswers.ministryIntensity",
                v as MinistryIntensity,
                { shouldValidate: true },
              )
            }
          >
            <SelectTrigger id="scoringAnswers.ministryIntensity">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {MINISTRY_INTENSITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          id="scoringAnswers.supportType"
          label="Tipo de sustento"
          required
          hint={`Vale ${supportTypePoints} de 5 pontos`}
          error={scoringErrors?.supportType?.message}
        >
          <Select
            value={answers.supportType}
            onValueChange={(v) =>
              setValue("scoringAnswers.supportType", v as SupportType, {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="scoringAnswers.supportType">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          id="scoringAnswers.hasRecommendationLetter"
          label="Possui carta de recomendação"
          required
          hint={`Vale ${recommendationLetterPoints} de 5 pontos`}
          error={scoringErrors?.hasRecommendationLetter?.message}
        >
          <Select
            value={answers.hasRecommendationLetter}
            onValueChange={(v) =>
              setValue(
                "scoringAnswers.hasRecommendationLetter",
                v as "sim" | "nao",
                { shouldValidate: true },
              )
            }
          >
            <SelectTrigger id="scoringAnswers.hasRecommendationLetter">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sim">Sim</SelectItem>
              <SelectItem value="nao">Não</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        {dadoSaudeConsent && (
          <FormField
            id="scoringAnswers.healthDeclared"
            label="Possui condição de saúde a declarar"
            required
            hint={`Apenas sim/não, sem laudos (BRAIN §6.8) — vale ${healthDeclaredPoints} de 5 pontos`}
            error={scoringErrors?.healthDeclared?.message}
          >
            <Select
              value={answers.healthDeclared}
              onValueChange={(v) =>
                setValue("scoringAnswers.healthDeclared", v as "sim" | "nao", {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="scoringAnswers.healthDeclared">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        )}
      </div>

      <FormField
        id="scoringAnswers.specialFamilySituation"
        label="Situação familiar especial"
        hint="Opcional — luto recente, saúde de dependentes etc. Avaliada pela gestão."
        error={scoringErrors?.specialFamilySituation?.message}
      >
        <textarea
          id="scoringAnswers.specialFamilySituation"
          rows={2}
          className="flex w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-muted) focus-visible:outline-none focus-visible:border-(--brand) focus-visible:ring-2 focus-visible:ring-(--brand)/20"
          {...register("scoringAnswers.specialFamilySituation")}
        />
      </FormField>
    </section>
  );
}

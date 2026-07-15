import { Sparkles } from "lucide-react";
import {
  SCORING_MAX_POINTS,
  type LastRestOutsideCity,
  type MinistryIntensity,
  type MinistryLocation,
  type ScoringCriteria,
  type SupportType,
  type UsageFrequency,
} from "@hebron/types/flats";

export interface ScoringPanelProps {
  scoring: ScoringCriteria;
  className?: string;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

const USAGE_FREQUENCY_LABEL: Record<UsageFrequency, string> = {
  nunca: "Nunca usou o flat",
  mais_de_1_ano: "Última vez há mais de 1 ano",
  menos_de_12_meses: "Última vez há menos de 12 meses",
};

const MINISTRY_LOCATION_LABEL: Record<MinistryLocation, string> = {
  remota: "Área remota",
  periferia: "Periferia",
  centro: "Centro urbano",
};

const LAST_REST_LABEL: Record<LastRestOutsideCity, string> = {
  mais_de_2_anos: "Mais de 2 anos sem descansar fora",
  entre_1_e_2_anos: "Entre 1 e 2 anos sem descansar fora",
  menos_de_1_ano: "Menos de 1 ano sem descansar fora",
};

const MINISTRY_INTENSITY_LABEL: Record<MinistryIntensity, string> = {
  alta: "Intensidade alta",
  media: "Intensidade média",
  baixa: "Intensidade baixa",
};

const SUPPORT_TYPE_LABEL: Record<SupportType, string> = {
  dependente: "Dependente de sustento",
  parcial: "Sustento parcial",
  autossustentado: "Autossustentado",
};

const yesNo = (value: boolean) => (value ? "Sim" : "Não");

interface CriterionRow {
  key: string;
  label: string;
  valueLabel: string;
  points: number;
  max: number;
  aiSuggested?: number | null;
}

function buildRows(scoring: ScoringCriteria): CriterionRow[] {
  return [
    {
      key: "a",
      label: "Tempo de ministério",
      valueLabel: `${scoring.ministryYears} ano${scoring.ministryYears !== 1 ? "s" : ""}`,
      points: scoring.ministryYearsPoints,
      max: 10,
    },
    {
      key: "b",
      label: "Frequência de uso",
      valueLabel: USAGE_FREQUENCY_LABEL[scoring.usageFrequency],
      points: scoring.usageFrequencyPoints,
      max: 10,
    },
    {
      key: "c",
      label: "Local de atuação",
      valueLabel: MINISTRY_LOCATION_LABEL[scoring.ministryLocation],
      points: scoring.ministryLocationPoints,
      max: 10,
    },
    {
      key: "d",
      label: "Saúde autodeclarada",
      valueLabel: yesNo(scoring.healthDeclared),
      points: scoring.healthDeclaredPoints,
      max: 5,
      aiSuggested: scoring.aiSuggestedHealthDeclaredPoints,
    },
    {
      key: "e",
      label: "Situação familiar especial",
      valueLabel: scoring.specialFamilySituation ?? "Não informado",
      points: scoring.specialFamilySituationPoints,
      max: 5,
    },
    {
      key: "f",
      label: "Último descanso fora da cidade",
      valueLabel: LAST_REST_LABEL[scoring.lastRestOutsideCity],
      points: scoring.lastRestOutsideCityPoints,
      max: 10,
    },
    {
      key: "g",
      label: "Intensidade ministerial",
      valueLabel: MINISTRY_INTENSITY_LABEL[scoring.ministryIntensity],
      points: scoring.ministryIntensityPoints,
      max: 10,
      aiSuggested: scoring.aiSuggestedMinistryIntensityPoints,
    },
    {
      key: "h",
      label: "Carta de recomendação",
      valueLabel: yesNo(scoring.hasRecommendationLetter),
      points: scoring.recommendationLetterPoints,
      max: 5,
    },
    {
      key: "i",
      label: "Tipo de sustento",
      valueLabel: SUPPORT_TYPE_LABEL[scoring.supportType],
      points: scoring.supportTypePoints,
      max: 5,
    },
    {
      key: "j",
      label: "Participação em projetos Hebron",
      valueLabel: yesNo(scoring.participatedInHebronProjects),
      points: scoring.participatedInHebronProjectsPoints,
      max: 5,
    },
  ];
}

export function ScoringPanel({ scoring, className }: ScoringPanelProps) {
  const rows = buildRows(scoring);
  const totalPercent = (scoring.totalPoints / SCORING_MAX_POINTS) * 100;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-(--radius) border border-(--border) bg-(--surface) p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-(--fg)">
          Pontuação de scoring
        </span>
        <span
          className="text-xl font-bold tabular-nums text-(--fg)"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {scoring.totalPoints}
          <span className="text-sm font-normal text-(--fg-muted)">
            /{SCORING_MAX_POINTS}
          </span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-(--radius-pill) bg-(--surface-alt)">
        <div
          className="h-full rounded-(--radius-pill) bg-(--brand)"
          style={{
            width: `${totalPercent}%`,
            transition: "width var(--dur-slow) var(--ease-out)",
          }}
        />
      </div>

      {!scoring.confirmedAt && (
        <p className="rounded-(--radius-sm) bg-(--hb-orange-muted) px-3 py-2 text-xs text-(--hb-orange-deep)">
          Aguardando confirmação do gestor para os critérios com sugestão de IA.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {rows.map((row) => {
          const percent = (row.points / row.max) * 100;
          return (
            <li key={row.key} className="flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-(--fg)">{row.label}</p>
                  <p className="truncate text-xs text-(--fg-muted)">
                    {row.valueLabel}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums text-(--fg-muted)">
                  {row.points}/{row.max}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-(--radius-pill) bg-(--surface-alt)">
                <div
                  className="h-full rounded-(--radius-pill) bg-(--hb-cyan)"
                  style={{ width: `${percent}%` }}
                />
              </div>
              {row.aiSuggested !== undefined &&
                row.aiSuggested !== null &&
                row.aiSuggested !== row.points && (
                  <p className="flex items-center gap-1 text-xs text-(--hb-purple)">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    IA sugeriu {row.aiSuggested} pts — aguardando confirmação
                  </p>
                )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

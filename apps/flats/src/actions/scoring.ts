import { eq } from "drizzle-orm";
import { usageHistory } from "@hebron/db/schema";
import type { AuthenticatedTx } from "@hebron/db/authenticated";
import { getProjectParticipationScore } from "@hebron/integrations/projetos-flats";
import type { scoringAnswersSchema } from "@hebron/validators/flats";
import type { z } from "zod";

// ---------------------------------------------------------------------------
// Cálculo automático do score (BRAIN §6.8) — 10 critérios (a-j),
// determinístico, máx. real 75 pontos (SCORING_MAX_POINTS em
// @hebron/types/flats — corrigido em S-121, ver comentário em
// schema/flats.ts).
//
// Critérios d (saúde) e g (intensidade ministerial) recebem sugestão de IA
// só a partir de P-7.13 (PATCH-012) — aqui a pontuação é 100%
// determinística a partir da resposta do formulário, sem IA envolvida.
//
// b) Frequência de uso: o escopo de P-7.8 substitui a resposta autodeclarada
// do hóspede (scoringAnswers.usageFrequency) pelo histórico real em
// flats.usage_history — motivo: resposta autodeclarada é manipulável,
// histórico não. O campo `usageFrequency` do formulário continua coletado
// (P-7.4) mas não influencia mais a pontuação.
//
// e) Situação familiar especial: sem fórmula no BRAIN além de "até 5,
// avaliação do gestor sobre texto livre" — não é um dos critérios com
// sugestão de IA (só d e g são). Suposição mais simples (G1): presença de
// texto não vazio pontua os 5 cheios; vazio pontua 0. Gestor pode ajustar
// depois via UPDATE direto (RLS já concede, scoring_responses_update_gestor
// em 0022_flats_rls.sql) — sem Server Action dedicada nesta fase. Registrado
// em SESSIONS.md.
// ---------------------------------------------------------------------------

export const SCORING_MAX_POINTS = 75;

export type ScoringAnswersInput = z.infer<typeof scoringAnswersSchema>;

export type ScoringCriterionValue =
  | "a_tempo_ministerio"
  | "b_frequencia_uso"
  | "c_localizacao"
  | "d_saude"
  | "e_situacao_familiar"
  | "f_ultimo_descanso"
  | "g_intensidade_ministerial"
  | "h_carta_recomendacao"
  | "i_tipo_sustento"
  | "j_participacao_projetos";

export interface ScoringResponseInput {
  criterion: ScoringCriterionValue;
  value: string | null;
  healthSelfDeclared: boolean | null;
  points: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_YEAR = MS_PER_DAY * 365.25;

function ministryYearsPoints(ministryStartDate: Date, referenceDate: Date) {
  const years = Math.floor(
    (referenceDate.getTime() - ministryStartDate.getTime()) / MS_PER_YEAR,
  );
  const clamped = Math.max(0, Math.min(years, 10));
  return { years: clamped, points: clamped };
}

/**
 * b) Frequência de uso — calculada de flats.usage_history, não da resposta
 * autodeclarada (ver nota do módulo acima). "nunca" (10) — sem histórico;
 * "mais_de_1_ano" (5) — última estadia há ≥12 meses; "menos_de_12_meses"
 * (0) — última estadia há <12 meses.
 */
async function usageFrequencyPoints(
  tx: AuthenticatedTx,
  userId: string,
  referenceDate: Date,
): Promise<{ label: string; points: number }> {
  const rows = await tx
    .select({ period: usageHistory.period })
    .from(usageHistory)
    .where(eq(usageHistory.userId, userId));

  if (rows.length === 0) return { label: "nunca", points: 10 };

  const mostRecentEnd = rows.reduce((latest, row) => {
    const end = new Date(`${row.period.end}T00:00:00Z`);
    return end.getTime() > latest.getTime() ? end : latest;
  }, new Date(0));

  const monthsSince =
    (referenceDate.getTime() - mostRecentEnd.getTime()) / (MS_PER_DAY * 30.44);

  if (monthsSince >= 12) return { label: "mais_de_1_ano", points: 5 };
  return { label: "menos_de_12_meses", points: 0 };
}

export interface ComputeScoringParams {
  tx: AuthenticatedTx;
  userId: string;
  ministryStartDate: Date;
  answers: ScoringAnswersInput;
  referenceDate?: Date;
}

export async function computeScoringResponses({
  tx,
  userId,
  ministryStartDate,
  answers,
  referenceDate = new Date(),
}: ComputeScoringParams): Promise<{
  responses: ScoringResponseInput[];
  totalPoints: number;
}> {
  const a = ministryYearsPoints(ministryStartDate, referenceDate);
  const b = await usageFrequencyPoints(tx, userId, referenceDate);
  const participation = await getProjectParticipationScore(userId);
  const participated = participation.totalApprovedOrExecuted > 0;

  const hasSpecialFamilySituation =
    (answers.specialFamilySituation ?? "").trim().length > 0;

  const responses: ScoringResponseInput[] = [
    {
      criterion: "a_tempo_ministerio",
      value: String(a.years),
      healthSelfDeclared: null,
      points: a.points,
    },
    {
      criterion: "b_frequencia_uso",
      value: b.label,
      healthSelfDeclared: null,
      points: b.points,
    },
    {
      criterion: "c_localizacao",
      value: answers.ministryLocation,
      healthSelfDeclared: null,
      points:
        answers.ministryLocation === "remota"
          ? 10
          : answers.ministryLocation === "periferia"
            ? 5
            : 0,
    },
    {
      criterion: "d_saude",
      value: null,
      healthSelfDeclared: answers.healthDeclared,
      points: answers.healthDeclared ? 5 : 0,
    },
    {
      criterion: "e_situacao_familiar",
      value: answers.specialFamilySituation,
      healthSelfDeclared: null,
      points: hasSpecialFamilySituation ? 5 : 0,
    },
    {
      criterion: "f_ultimo_descanso",
      value: answers.lastRestOutsideCity,
      healthSelfDeclared: null,
      points:
        answers.lastRestOutsideCity === "mais_de_2_anos"
          ? 10
          : answers.lastRestOutsideCity === "entre_1_e_2_anos"
            ? 5
            : 0,
    },
    {
      criterion: "g_intensidade_ministerial",
      value: answers.ministryIntensity,
      healthSelfDeclared: null,
      points:
        answers.ministryIntensity === "alta"
          ? 10
          : answers.ministryIntensity === "media"
            ? 5
            : 0,
    },
    {
      criterion: "h_carta_recomendacao",
      value: answers.hasRecommendationLetter ? "sim" : "nao",
      healthSelfDeclared: null,
      points: answers.hasRecommendationLetter ? 5 : 0,
    },
    {
      criterion: "i_tipo_sustento",
      value: answers.supportType,
      healthSelfDeclared: null,
      points:
        answers.supportType === "dependente"
          ? 5
          : answers.supportType === "parcial"
            ? 3
            : 0,
    },
    {
      criterion: "j_participacao_projetos",
      value: participated ? "sim" : "nao",
      healthSelfDeclared: null,
      points: participated ? 5 : 0,
    },
  ];

  const totalPoints = responses.reduce((sum, r) => sum + r.points, 0);

  return { responses, totalPoints };
}

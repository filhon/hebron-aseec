import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoringCriterion {
  name: string;
  weight: number; // 0–1, sum should equal 1
  description: string;
}

export interface ScoringCriteria {
  criteria: ScoringCriterion[];
  maxScore: number;
}

export interface ProjectScoringInput {
  title: string;
  tipo: "pontual" | "anual";
  objectives?: string | null;
  justification?: string | null;
  targetAudience?: string | null;
  expectedResults?: string | null;
  ministryRegion?: string | null;
  ministryArea?: string | null;
  budgetTotal?: string | null;
  parcelas?: number | null;
  meses?: number | null;
  evaluationYear?: number | null;
  extendedData?: Record<string, unknown>;
}

export interface ScoringResult {
  score: number;
  breakdown: Record<string, number>;
  aiJustification: string;
}

// ---------------------------------------------------------------------------
// Default scoring criteria (overridden by admin.system_settings)
// ---------------------------------------------------------------------------

export const DEFAULT_SCORING_CRITERIA: ScoringCriteria = {
  maxScore: 100,
  criteria: [
    {
      name: "alinhamento_missional",
      weight: 0.25,
      description: "Alinhamento com a missão e visão da Hebron Aseec",
    },
    {
      name: "clareza_objetivos",
      weight: 0.2,
      description: "Clareza e mensurabilidade dos objetivos",
    },
    {
      name: "viabilidade_orcamentaria",
      weight: 0.2,
      description: "Adequação e viabilidade do orçamento solicitado",
    },
    {
      name: "impacto_esperado",
      weight: 0.2,
      description: "Impacto esperado no público-alvo e na região",
    },
    {
      name: "historico_organizacao",
      weight: 0.15,
      description: "Histórico e capacidade da organização proponente",
    },
  ],
};

// ---------------------------------------------------------------------------
// scoreProject — GPT-4.1 scoring call
// ---------------------------------------------------------------------------

export async function scoreProject(
  input: ProjectScoringInput,
  criteria: ScoringCriteria = DEFAULT_SCORING_CRITERIA,
  apiKey?: string,
): Promise<ScoringResult> {
  const client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });

  const criteriaText = criteria.criteria
    .map(
      (c, i) =>
        `${i + 1}. **${c.name}** (peso ${Math.round(c.weight * 100)}%): ${c.description}`,
    )
    .join("\n");

  const projectSummary = [
    `Título: ${input.title}`,
    `Tipo: ${input.tipo === "anual" ? "Projeto Anual" : "Projeto Pontual/Emergencial"}`,
    input.evaluationYear ? `Ano de avaliação: ${input.evaluationYear}` : null,
    input.ministryRegion ? `Região: ${input.ministryRegion}` : null,
    input.ministryArea ? `Área/País: ${input.ministryArea}` : null,
    input.objectives ? `Objetivos: ${input.objectives}` : null,
    input.justification ? `Justificativa: ${input.justification}` : null,
    input.targetAudience ? `Público-alvo: ${input.targetAudience}` : null,
    input.expectedResults
      ? `Resultados esperados: ${input.expectedResults}`
      : null,
    input.budgetTotal
      ? `Orçamento total: R$ ${parseFloat(input.budgetTotal).toFixed(2)}`
      : null,
    input.parcelas ? `Parcelas: ${input.parcelas}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const extendedText =
    input.extendedData && Object.keys(input.extendedData).length > 0
      ? `\nDados adicionais: ${JSON.stringify(input.extendedData, null, 2)}`
      : "";

  const systemPrompt = `Você é um avaliador especialista da Hebron Aseec, ONG cristã de 40+ anos dedicada ao apoio de projetos missionários.
Avalie o projeto abaixo segundo os critérios fornecidos e retorne um JSON válido com o seguinte formato:
{
  "score": <número 0-${criteria.maxScore}>,
  "breakdown": {
    "<nome_criterio>": <pontuação proporcional ao peso>
    // um campo por critério
  },
  "aiJustification": "<parágrafo de 2-3 frases justificando a pontuação, em português>"
}

Critérios de avaliação:
${criteriaText}

Seja rigoroso mas justo. Projetos sem informações suficientes devem receber pontuação baixa nos critérios afetados.`;

  const userPrompt = `Avalie o seguinte projeto:\n\n${projectSummary}${extendedText}`;

  const response = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 800,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("GPT-4.1 retornou resposta vazia");

  const parsed = JSON.parse(raw) as {
    score: number;
    breakdown: Record<string, number>;
    aiJustification: string;
  };

  const score = Math.min(
    criteria.maxScore,
    Math.max(0, Math.round(parsed.score * 100) / 100),
  );

  return {
    score,
    breakdown: parsed.breakdown ?? {},
    aiJustification: parsed.aiJustification ?? "",
  };
}

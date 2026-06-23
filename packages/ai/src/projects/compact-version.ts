import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompactVersionSection {
  name: string;
  prompt: string;
  maxChars: number;
}

export interface CompactVersionTemplate {
  sections: CompactVersionSection[];
  totalMaxChars: number;
}

export interface CompactVersionInput {
  title: string;
  tipo: "pontual" | "anual";
  organizationName?: string | null;
  submitterName?: string | null;
  objectives?: string | null;
  justification?: string | null;
  targetAudience?: string | null;
  expectedResults?: string | null;
  ministryRegion?: string | null;
  ministryArea?: string | null;
  budgetTotal?: string | null;
  parcelas?: number | null;
  evaluationYear?: number | null;
  extendedData?: Record<string, unknown>;
}

export interface CompactVersionResult {
  content: string; // Markdown
}

// ---------------------------------------------------------------------------
// Default template (overridden by admin.system_settings)
// ---------------------------------------------------------------------------

export const DEFAULT_COMPACT_TEMPLATE: CompactVersionTemplate = {
  totalMaxChars: 2000,
  sections: [
    {
      name: "Resumo Executivo",
      prompt: "Escreva um resumo executivo de 2-3 frases sobre o projeto.",
      maxChars: 400,
    },
    {
      name: "Objetivos e Público-Alvo",
      prompt:
        "Liste os principais objetivos e descreva o público-alvo em 2-3 frases.",
      maxChars: 400,
    },
    {
      name: "Impacto Esperado",
      prompt: "Descreva o impacto esperado do projeto em 2-3 frases objetivas.",
      maxChars: 400,
    },
    {
      name: "Informações Financeiras",
      prompt:
        "Apresente o orçamento total, número de parcelas e distribuição financeira em 1-2 frases.",
      maxChars: 300,
    },
    {
      name: "Contexto Regional",
      prompt:
        "Descreva brevemente o contexto geográfico/ministerial do projeto.",
      maxChars: 300,
    },
  ],
};

// ---------------------------------------------------------------------------
// generateCompactVersion — GPT-4.1 call
// ---------------------------------------------------------------------------

export async function generateCompactVersion(
  input: CompactVersionInput,
  template: CompactVersionTemplate = DEFAULT_COMPACT_TEMPLATE,
  apiKey?: string,
): Promise<CompactVersionResult> {
  const client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });

  const projectSummary = [
    `**Título:** ${input.title}`,
    `**Tipo:** ${input.tipo === "anual" ? "Projeto Anual" : "Projeto Pontual/Emergencial"}`,
    input.evaluationYear ? `**Ano:** ${input.evaluationYear}` : null,
    input.organizationName
      ? `**Organização:** ${input.organizationName}`
      : null,
    input.submitterName ? `**Responsável:** ${input.submitterName}` : null,
    input.ministryRegion ? `**Região:** ${input.ministryRegion}` : null,
    input.ministryArea ? `**País/Área:** ${input.ministryArea}` : null,
    input.objectives ? `**Objetivos:** ${input.objectives}` : null,
    input.justification ? `**Justificativa:** ${input.justification}` : null,
    input.targetAudience ? `**Público-alvo:** ${input.targetAudience}` : null,
    input.expectedResults
      ? `**Resultados esperados:** ${input.expectedResults}`
      : null,
    input.budgetTotal
      ? `**Orçamento total:** R$ ${parseFloat(input.budgetTotal).toFixed(2)}`
      : null,
    input.parcelas ? `**Parcelas:** ${input.parcelas}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const extendedText =
    input.extendedData && Object.keys(input.extendedData).length > 0
      ? `\n\n**Dados do formulário:**\n${JSON.stringify(input.extendedData, null, 2)}`
      : "";

  const sectionsInstructions = template.sections
    .map(
      (s, i) =>
        `${i + 1}. **${s.name}** (máx. ${s.maxChars} caracteres): ${s.prompt}`,
    )
    .join("\n");

  const systemPrompt = `Você é um assistente especializado em síntese de projetos missionários da Hebron Aseec.
Gere uma versão compacta do projeto para avaliadores usando o template abaixo.
Retorne um JSON com a chave "sections", um array de objetos com "name" e "content".
Use Markdown nas seções. Seja objetivo, claro e imparcial. Máximo total: ${template.totalMaxChars} caracteres.

Seções a gerar:
${sectionsInstructions}`;

  const userPrompt = `Gere a versão compacta para o seguinte projeto:\n\n${projectSummary}${extendedText}`;

  const response = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 1200,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("GPT-4.1 retornou resposta vazia");

  const parsed = JSON.parse(raw) as {
    sections: Array<{ name: string; content: string }>;
  };

  const mdContent = (parsed.sections ?? [])
    .map((s) => `## ${s.name}\n\n${s.content}`)
    .join("\n\n---\n\n");

  return { content: mdContent };
}

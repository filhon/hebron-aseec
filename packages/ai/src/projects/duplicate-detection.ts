import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectEmbeddingInput {
  title: string;
  objectives?: string | null;
  justification?: string | null;
}

// ---------------------------------------------------------------------------
// DEFAULT_DUPLICATE_THRESHOLD — sobrescrito por admin.system_settings
// ["projetos_duplicate_threshold"] (mesmo padrão de DEFAULT_SCORING_CRITERIA
// em scoring.ts). BRAIN §2/§6.2/§8 (P-2.14, PATCH-012) sugere 0.92.
// ---------------------------------------------------------------------------

export const DEFAULT_DUPLICATE_THRESHOLD = 0.92;

// ---------------------------------------------------------------------------
// generateProjectEmbedding — OpenAI text-embedding-3-small
//
// Gera o vetor a partir de title + objectives + justification (mesmos campos
// de texto livre usados por scoreProject em scoring.ts). Diferente de
// scoring.ts/ocr.ts, o endpoint de embeddings não recebe um system prompt de
// instrução — só o texto puro — então não há superfície de injeção de
// instrução aqui (o cuidado de ocr.ts:119, texto do submissor sempre em
// mensagem separada da instrução do sistema, não se aplica a este endpoint;
// continua valendo se algum dia este módulo ganhar uma chamada de chat/IA
// generativa sobre o mesmo texto).
// ---------------------------------------------------------------------------

export async function generateProjectEmbedding(
  input: ProjectEmbeddingInput,
  apiKey?: string,
): Promise<number[]> {
  const client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });

  const text = [input.title, input.objectives, input.justification]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join("\n\n");

  if (!text) throw new Error("Texto insuficiente para gerar embedding");

  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding)
    throw new Error("text-embedding-3-small retornou resposta vazia");

  return embedding;
}

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: { create: mockCreate },
  })),
}));

const { generateProjectEmbedding, DEFAULT_DUPLICATE_THRESHOLD } =
  await import("../projects/duplicate-detection");

function mockEmbedding(vector: number[]) {
  mockCreate.mockResolvedValue({ data: [{ embedding: vector }] });
}

// Mesma fórmula do operador `<=>` do pgvector (1 - cosine distance), usada
// em apps/projetos/src/actions/projects.ts::submitProject. Reimplementada
// aqui apenas para o teste — não é exportada por duplicate-detection.ts
// porque a comparação de verdade roda no banco (pgvector), nunca em TS.
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return dot / (magA * magB);
}

describe("generateProjectEmbedding", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("calls the embeddings endpoint with title + objectives + justification joined as free text", async () => {
    mockEmbedding([1, 0, 0]);

    await generateProjectEmbedding(
      {
        title: "Reforma do templo",
        objectives: "Recuperar a estrutura do telhado",
        justification: "Infiltrações recorrentes na estação chuvosa",
      },
      "test-key",
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "text-embedding-3-small",
        input:
          "Reforma do templo\n\nRecuperar a estrutura do telhado\n\nInfiltrações recorrentes na estação chuvosa",
      }),
    );
  });

  it("skips null/empty fields instead of embedding blank text", async () => {
    mockEmbedding([1, 0, 0]);

    await generateProjectEmbedding(
      { title: "Reforma do templo", objectives: null, justification: "  " },
      "test-key",
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ input: "Reforma do templo" }),
    );
  });

  it("throws instead of calling the API when there is no free text to embed", async () => {
    await expect(
      generateProjectEmbedding(
        { title: "", objectives: null, justification: null },
        "test-key",
      ),
    ).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws when the API returns no embedding", async () => {
    mockCreate.mockResolvedValue({ data: [] });

    await expect(
      generateProjectEmbedding({ title: "Reforma do templo" }, "test-key"),
    ).rejects.toThrow();
  });

  // A similaridade de cosseno "de verdade" roda no banco (pgvector <=>,
  // apps/projetos/src/actions/projects.ts::submitProject) contra embeddings
  // reais da OpenAI — não reproduzível em teste unitário sem chamar a API
  // ao vivo. Este par de testes valida a MATEMÁTICA de similaridade (mesma
  // fórmula do <=>) sobre vetores determinísticos que simulam texto quase
  // idêntico vs. claramente distinto, confirmando que o limiar padrão
  // (DEFAULT_DUPLICATE_THRESHOLD, 0.92) separa os dois casos como esperado.
  it("near-identical project text yields cosine similarity above the default threshold", async () => {
    mockEmbedding([0.98, 0.18, 0.05]);
    const a = await generateProjectEmbedding(
      { title: "Reforma do templo em Ipatinga" },
      "test-key",
    );

    mockEmbedding([0.97, 0.2, 0.07]);
    const b = await generateProjectEmbedding(
      { title: "Reforma do templo em Ipatinga - MG" },
      "test-key",
    );

    expect(cosineSimilarity(a, b)).toBeGreaterThan(DEFAULT_DUPLICATE_THRESHOLD);
  });

  it("clearly distinct project text yields cosine similarity below the default threshold", async () => {
    mockEmbedding([1, 0, 0]);
    const a = await generateProjectEmbedding(
      { title: "Reforma do templo em Ipatinga" },
      "test-key",
    );

    mockEmbedding([0, 1, 0]);
    const b = await generateProjectEmbedding(
      { title: "Curso de capacitação de líderes em Manaus" },
      "test-key",
    );

    expect(cosineSimilarity(a, b)).toBeLessThan(DEFAULT_DUPLICATE_THRESHOLD);
  });
});

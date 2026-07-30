import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

const { extractNfData } = await import("../financeiro/ocr");

function mockResponse(content: string) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content } }],
  });
}

describe("extractNfData", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("parses a well-formed JSON response into the expected fields", async () => {
    mockResponse(
      JSON.stringify({
        amount: 1234.56,
        cnpj: "12.345.678/0001-90",
        issuedAt: "2026-03-15",
        issuerName: "Papelaria Exemplo Ltda",
        nfNumber: "00123",
        suggestedCategory: "Material de Escritório",
        categorizationReason: "Compra de itens de papelaria para o escritório",
      }),
    );

    const result = await extractNfData(
      { imageSource: { type: "url", url: "https://example.com/nf.png" } },
      "test-key",
    );

    expect(result.amount).toBe(1234.56);
    expect(result.cnpj).toBe("12345678000190");
    expect(result.issuedAt).toBe("2026-03-15");
    expect(result.issuerName).toBe("Papelaria Exemplo Ltda");
    expect(result.nfNumber).toBe("00123");
    expect(result.suggestedCategory).toBe("Material de Escritório");
    expect(result.categorizationReason).toBe(
      "Compra de itens de papelaria para o escritório",
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4.1" }),
    );
  });

  it("returns null for every field the model omits, without throwing", async () => {
    mockResponse(JSON.stringify({}));

    const result = await extractNfData(
      { imageSource: { type: "url", url: "https://example.com/nf.png" } },
      "test-key",
    );

    expect(result.amount).toBeNull();
    expect(result.cnpj).toBeNull();
    expect(result.issuedAt).toBeNull();
    expect(result.issuerName).toBeNull();
    expect(result.nfNumber).toBeNull();
    expect(result.suggestedCategory).toBeNull();
    expect(result.categorizationReason).toBeNull();
  });

  it("parses an amount echoed back with Brazilian decimal comma formatting", async () => {
    mockResponse(JSON.stringify({ amount: "1.234,56" }));

    const result = await extractNfData(
      { imageSource: { type: "url", url: "https://example.com/nf.png" } },
      "test-key",
    );

    expect(result.amount).toBe(1234.56);
  });

  it("discards a zero or negative amount instead of returning garbage", async () => {
    mockResponse(JSON.stringify({ amount: -50 }));

    const result = await extractNfData(
      { imageSource: { type: "url", url: "https://example.com/nf.png" } },
      "test-key",
    );

    expect(result.amount).toBeNull();
  });

  it("discards a CNPJ that doesn't resolve to 14 digits", async () => {
    mockResponse(JSON.stringify({ cnpj: "123" }));

    const result = await extractNfData(
      { imageSource: { type: "url", url: "https://example.com/nf.png" } },
      "test-key",
    );

    expect(result.cnpj).toBeNull();
  });

  it("handles a non-JSON response instead of throwing", async () => {
    mockResponse("não consegui ler a imagem da nota fiscal");

    const result = await extractNfData(
      { imageSource: { type: "url", url: "https://example.com/nf.png" } },
      "test-key",
    );

    expect(result.amount).toBeNull();
    expect(result.rawResponse).toBe("não consegui ler a imagem da nota fiscal");
  });

  it("handles an empty response body instead of throwing", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: "" } }] });

    const result = await extractNfData(
      { imageSource: { type: "url", url: "https://example.com/nf.png" } },
      "test-key",
    );

    expect(result.amount).toBeNull();
    expect(result.rawResponse).toBe("");
  });
});

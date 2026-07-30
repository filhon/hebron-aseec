import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NfOcrInput {
  /** Base64-encoded image (PNG/JPEG) or a publicly accessible image URL */
  imageSource:
    | { type: "base64"; data: string; mimeType: "image/png" | "image/jpeg" }
    | { type: "url"; url: string };
  /** Optional hint for categorization context */
  expectedCategoryHint?: string;
}

export interface NfOcrResult {
  /** Total amount extracted from the NF */
  amount: number | null;
  /** CNPJ of the issuer (14 digits, no punctuation) */
  cnpj: string | null;
  /** Issue date in YYYY-MM-DD format */
  issuedAt: string | null;
  /** Issuer name or trade name */
  issuerName: string | null;
  /** NF number (número da nota) */
  nfNumber: string | null;
  /** Suggested category based on items/description */
  suggestedCategory: string | null;
  /** Short explanation of the AI's categorization reasoning */
  categorizationReason: string | null;
  /** Raw AI response for debugging / audit */
  rawResponse: string;
}

// ---------------------------------------------------------------------------
// parseAmount — aceita number (formato instruído no prompt) ou string em
// formato brasileiro ("1.234,56") sem descartar o valor extraído.
// ---------------------------------------------------------------------------

function parseAmount(value: unknown): number | null {
  let num: number | null = null;

  if (typeof value === "number") {
    num = value;
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    const normalized = trimmed.includes(",")
      ? trimmed.replace(/\./g, "").replace(",", ".")
      : trimmed;
    const parsed = Number.parseFloat(normalized.replace(/[^\d.-]/g, ""));
    num = Number.isFinite(parsed) ? parsed : null;
  }

  return num !== null && num > 0 ? Math.round(num * 100) / 100 : null;
}

// ---------------------------------------------------------------------------
// extractNfData — GPT-4 Vision OCR for notas fiscais
//
// Extracts: valor total, CNPJ do emitente, data de emissão, nome do emitente,
// número da nota, and suggests a financial category.
// ---------------------------------------------------------------------------

export async function extractNfData(
  input: NfOcrInput,
  apiKey?: string,
): Promise<NfOcrResult> {
  const client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });

  const imageContent: OpenAI.Chat.ChatCompletionContentPartImage =
    input.imageSource.type === "base64"
      ? {
          type: "image_url",
          image_url: {
            url: `data:${input.imageSource.mimeType};base64,${input.imageSource.data}`,
            detail: "high",
          },
        }
      : {
          type: "image_url",
          image_url: { url: input.imageSource.url, detail: "high" },
        };

  const systemPrompt = `Você é um especialista em leitura de documentos fiscais brasileiros.
Analise a imagem da nota fiscal (NF-e, NF, cupom fiscal ou recibo) e extraia os dados solicitados.
Retorne APENAS um JSON válido com os campos abaixo — nunca texto adicional.

Regras de extração:
- amount: valor total da nota em número decimal (ex: 1234.56). null se não encontrado.
- cnpj: apenas os 14 dígitos numéricos do CNPJ do EMITENTE, sem pontuação. null se não encontrado.
- issuedAt: data de emissão no formato YYYY-MM-DD. null se não encontrado.
- issuerName: razão social ou nome fantasia do emitente. null se não encontrado.
- nfNumber: número da nota fiscal (campo "Nº" ou "Número"). null se não encontrado.
- suggestedCategory: categoria contábil mais adequada para esta despesa, escolhendo entre:
    "Fornecedores e Serviços", "Material de Escritório", "Alimentação", "Transporte e Logística",
    "Manutenção e Reparos", "Tecnologia e Software", "Comunicações", "Eventos e Treinamentos",
    "Impostos e Taxas", "Pessoal", "Outros". Use "Outros" se incerto.
- categorizationReason: 1 frase explicando por que sugeriu essa categoria.

Formato de saída obrigatório:
{
  "amount": number | null,
  "cnpj": string | null,
  "issuedAt": string | null,
  "issuerName": string | null,
  "nfNumber": string | null,
  "suggestedCategory": string | null,
  "categorizationReason": string | null
}`;

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "text", text: "Extraia os dados desta nota fiscal:" },
    imageContent,
  ];

  if (input.expectedCategoryHint) {
    userContent.push({
      type: "text",
      text: `Contexto adicional para categorização: ${input.expectedCategoryHint}`,
    });
  }

  const response = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 600,
  });

  const raw = response.choices[0]?.message?.content ?? "";

  if (!raw) {
    return {
      amount: null,
      cnpj: null,
      issuedAt: null,
      issuerName: null,
      nfNumber: null,
      suggestedCategory: null,
      categorizationReason: null,
      rawResponse: "",
    };
  }

  let parsed: Partial<NfOcrResult>;
  try {
    parsed = JSON.parse(raw) as Partial<NfOcrResult>;
  } catch {
    return {
      amount: null,
      cnpj: null,
      issuedAt: null,
      issuerName: null,
      nfNumber: null,
      suggestedCategory: null,
      categorizationReason: null,
      rawResponse: raw,
    };
  }

  // Sanitize CNPJ: keep only digits, validate length
  const rawCnpj =
    typeof parsed.cnpj === "string" ? parsed.cnpj.replace(/\D/g, "") : null;
  const cnpj = rawCnpj && rawCnpj.length === 14 ? rawCnpj : null;

  // Validate date format
  const issuedAt =
    typeof parsed.issuedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(parsed.issuedAt)
      ? parsed.issuedAt
      : null;

  // Validate amount — o modelo é instruído a devolver número com ponto
  // decimal, mas notas brasileiras às vezes fazem o GPT ecoar o formato de
  // origem (vírgula decimal, ponto de milhar); aceitar string nesse formato
  // em vez de descartar o valor extraído.
  const amount = parseAmount(parsed.amount);

  return {
    amount,
    cnpj,
    issuedAt,
    issuerName:
      typeof parsed.issuerName === "string" ? parsed.issuerName : null,
    nfNumber: typeof parsed.nfNumber === "string" ? parsed.nfNumber : null,
    suggestedCategory:
      typeof parsed.suggestedCategory === "string"
        ? parsed.suggestedCategory
        : null,
    categorizationReason:
      typeof parsed.categorizationReason === "string"
        ? parsed.categorizationReason
        : null,
    rawResponse: raw,
  };
}

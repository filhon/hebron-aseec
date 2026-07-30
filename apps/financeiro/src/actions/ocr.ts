"use server";

import { z } from "zod";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { extractNfData } from "@hebron/ai/financeiro/ocr";
import { colaboradorAction } from "../lib/safe-action";
import { logFinanceiroAudit } from "../lib/audit";
import { createReceiptSignedUrl } from "./attachments";

// Leitura automática só funciona sobre imagem (GPT-4.1 Vision) — PDF/outros
// formatos aceitos pelo upload de comprovante não são suportados aqui.
const OCR_SUPPORTED_EXTENSIONS = ["jpg", "jpeg", "png"];

const extractNfFromAttachmentSchema = z.object({
  path: z.string().min(1, "Caminho do arquivo inválido"),
});

// ---------------------------------------------------------------------------
// extractNfFromAttachment — lê o comprovante já enviado ao bucket
// financeiro-recibos e devolve os campos extraídos por extractNfData
// (packages/ai) para pré-preencher o formulário de despesa. Nunca grava nada
// sozinha — quem decide o que entra no payable é o colaborador, no submit do
// formulário (P-3.8c).
// ---------------------------------------------------------------------------

export const extractNfFromAttachment = colaboradorAction
  .schema(extractNfFromAttachmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const ext = parsedInput.path.split(".").pop()?.toLowerCase() ?? "";
    if (!OCR_SUPPORTED_EXTENSIONS.includes(ext)) {
      throw new Error(
        "Leitura automática só funciona para imagens (JPG ou PNG). Preencha os campos manualmente.",
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "Leitura automática de nota fiscal não está configurada. Preencha os campos manualmente.",
      );
    }

    let signedUrl: string;
    try {
      signedUrl = await createReceiptSignedUrl(parsedInput.path);
    } catch {
      throw new Error("Não foi possível acessar o comprovante enviado");
    }

    let result;
    try {
      result = await extractNfData({
        imageSource: { type: "url", url: signedUrl },
      });
    } catch {
      throw new Error(
        "Não foi possível ler a nota fiscal automaticamente. Preencha os campos manualmente.",
      );
    }

    await withAuthenticatedContext({ actorId: ctx.actorId }, (tx) =>
      withSystemRole(tx, (sysTx) =>
        logFinanceiroAudit(
          {
            actorId: ctx.actorId,
            action: "financeiro.attachment.nf_extracted",
            entity: "attachment",
            diff: {
              path: parsedInput.path,
              amount: result.amount,
              cnpj: result.cnpj,
              issuedAt: result.issuedAt,
              suggestedCategory: result.suggestedCategory,
            },
          },
          sysTx,
        ),
      ),
    );

    return { result };
  });

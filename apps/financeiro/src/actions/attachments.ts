"use server";

import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { financialAttachments } from "@hebron/db/schema";
import { colaboradorAction } from "../lib/safe-action";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variáveis Supabase não configuradas");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Expiração curta (BRAIN §5) — o link é gerado sob demanda no clique de
// "Ver comprovante" ou no preenchimento por OCR (P-3.8c), não persistido em
// lugar nenhum.
const READ_URL_EXPIRES_IN_SECONDS = 300;

// Exportada (função async — único jeito de exportar algo de um arquivo
// "use server" além de safe-actions) para o OCR (actions/ocr.ts) reusar a
// mesma geração de signed URL do bucket financeiro-recibos, em vez de
// duplicar a leitura de SUPABASE_SERVICE_ROLE_KEY.
export async function createReceiptSignedUrl(path: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from("financeiro-recibos")
    .createSignedUrl(path, READ_URL_EXPIRES_IN_SECONDS);

  if (error || !data) {
    throw new Error("Não foi possível gerar o link do comprovante");
  }

  return data.signedUrl;
}

const getAttachmentUrlSchema = z.union([
  z.object({ attachmentId: z.string().uuid() }),
  z.object({
    refType: z.enum(["payable", "receivable", "transaction"]),
    refId: z.string().uuid(),
  }),
]);

// ---------------------------------------------------------------------------
// getAttachmentUrl — resolve o comprovante mais recente de um payable,
// receivable ou transaction (ou um attachment específico por id) para uma
// signed URL de curta duração. RLS de financeiro.attachments (colaborador,
// diretor, super_admin — 0010_financeiro.sql) é a mesma exigida aqui.
// ---------------------------------------------------------------------------

export const getAttachmentUrl = colaboradorAction
  .schema(getAttachmentUrlSchema)
  .action(async ({ parsedInput, ctx }) => {
    const attachment = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        if ("attachmentId" in parsedInput) {
          const rows = await tx
            .select()
            .from(financialAttachments)
            .where(eq(financialAttachments.id, parsedInput.attachmentId))
            .limit(1);
          return rows[0] ?? null;
        }

        const rows = await tx
          .select()
          .from(financialAttachments)
          .where(
            and(
              eq(financialAttachments.refType, parsedInput.refType),
              eq(financialAttachments.refId, parsedInput.refId),
            ),
          )
          .orderBy(desc(financialAttachments.createdAt))
          .limit(1);
        return rows[0] ?? null;
      },
    );

    if (!attachment) {
      throw new Error("Nenhum comprovante anexado a este registro");
    }

    const url = await createReceiptSignedUrl(attachment.fileUrl);
    return { url, fileName: attachment.fileName };
  });

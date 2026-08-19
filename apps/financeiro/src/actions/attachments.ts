"use server";

import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { financialAttachments } from "@hebron/db/schema";
import { colaboradorAction } from "../lib/safe-action";
import { createReceiptSignedUrl } from "../lib/storage";

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

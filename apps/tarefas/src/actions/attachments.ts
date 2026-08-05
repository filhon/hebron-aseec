"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createSupabaseServerActionClient } from "@hebron/auth/server";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { taskAttachments } from "@hebron/db/schema";
import { staffAction } from "../lib/safe-action";

// Expiração curta (mesmo padrão de apps/financeiro/src/actions/attachments.ts)
// — o link é gerado sob demanda no clique do anexo e nunca persistido.
const READ_URL_EXPIRES_IN_SECONDS = 300;

const getAttachmentUrlSchema = z.object({
  attachmentId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// getAttachmentUrl — resolve uma signed URL de leitura para um anexo de
// tarefa (bucket privado `tarefas-anexos`, 0034_tarefas_storage.sql). A
// visibilidade da tarefa-raiz já é a policy `attachments_select_staff`
// (0033_tarefas_rls.sql: staff + tarefas.task_visible) sobre a própria
// tabela `tarefas.attachments` — se o SELECT abaixo não devolve linha, o
// anexo não existe ou o ator não pode vê-lo; a resposta é a mesma nos dois
// casos para não vazar existência. `staffAction` (G6.2) já barra papéis
// externos antes de qualquer consulta.
// ---------------------------------------------------------------------------

export const getAttachmentUrl = staffAction
  .schema(getAttachmentUrlSchema)
  .action(async ({ parsedInput, ctx }) => {
    const attachment = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .select({
            storageKey: taskAttachments.storageKey,
            fileName: taskAttachments.fileName,
          })
          .from(taskAttachments)
          .where(eq(taskAttachments.id, parsedInput.attachmentId))
          .limit(1);
        return row ?? null;
      },
    );

    if (!attachment) {
      throw new Error("Anexo não encontrado");
    }

    const cookieStore = await cookies();
    const supabase = createSupabaseServerActionClient({
      getAll: () => cookieStore.getAll(),
    });
    const { data, error } = await supabase.storage
      .from("tarefas-anexos")
      .createSignedUrl(attachment.storageKey, READ_URL_EXPIRES_IN_SECONDS);
    if (error || !data) {
      throw new Error("Não foi possível gerar o link do anexo");
    }

    return { url: data.signedUrl, fileName: attachment.fileName };
  });

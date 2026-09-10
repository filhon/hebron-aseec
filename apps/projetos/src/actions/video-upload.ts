"use server";

// ---------------------------------------------------------------------------
// Vídeo de apresentação do projeto via Bunny.net Stream (P-2.20 CORRETIVO,
// AUDIT/06 §1.7, Q47). Mesmo padrão de apps/plataforma/src/actions/uploads.ts
// (createLessonVideoUpload, P-6.20): cria o objeto de vídeo na library e
// devolve as credenciais do upload resumível TUS — o client sobe o arquivo
// direto para a Bunny (packages/integrations/src/bunny-stream.ts), nunca
// pelo body desta Server Function.
// ---------------------------------------------------------------------------

import { z } from "zod";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  createBunnyVideo,
  createBunnyTusUploadCredentials,
} from "@hebron/integrations/bunny-stream";
import { submissorAction } from "../lib/safe-action";

const createAttachmentVideoUploadSchema = z.object({
  title: z.string().min(1).max(255),
});

export const createAttachmentVideoUpload = submissorAction
  .schema(createAttachmentVideoUploadSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { videoId } = await createBunnyVideo(parsedInput.title);
      const upload = createBunnyTusUploadCredentials(videoId);
      return { videoId, upload };
    } catch (error) {
      throw new BusinessError(
        error instanceof Error
          ? `Falha ao iniciar upload do vídeo: ${error.message}`
          : "Falha ao iniciar upload do vídeo",
      );
    }
  });

"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { exclusiveMaterials } from "@hebron/db/schema";
import { createExclusiveMaterialSchema } from "@hebron/validators/radio";
import { radioAction, superAdminAction } from "../lib/safe-action";
import { logRadioAudit } from "../lib/audit";
import { getR2DownloadUrl, getR2UploadUrl } from "../lib/r2";
import { notifyNewMaterialAvailable } from "../lib/notifications";

// ---------------------------------------------------------------------------
// Materiais exclusivos (BRAIN §6.4): upload/criação são admin-only; o
// download por um usuário comum exige cadastro + aceite de termo — a
// checagem em si é feita pela RLS de `exclusive_materials_select_term_accepted`
// (0050_radio_rls.sql) ao rodar o SELECT dentro de withAuthenticatedContext:
// sem aceite, a query retorna vazio e a action nega o acesso (defense in
// depth, G6.2).
// ---------------------------------------------------------------------------

const MATERIAL_ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
] as const;

const getMaterialUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum(MATERIAL_ALLOWED_CONTENT_TYPES),
});

function extFromFileName(fileName: string): string {
  return fileName.split(".").pop() ?? "bin";
}

export const getMaterialUploadUrl = superAdminAction
  .schema(getMaterialUploadUrlSchema)
  .action(async ({ parsedInput: input }) => {
    const key = `materials/${randomUUID()}.${extFromFileName(input.fileName)}`;
    const uploadUrl = await getR2UploadUrl(key, input.contentType);
    return { uploadUrl, key };
  });

export const createMaterial = superAdminAction
  .schema(createExclusiveMaterialSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const { material } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [material] = await tx
          .insert(exclusiveMaterials)
          .values(input)
          .returning();
        if (!material) throw new BusinessError("Falha ao criar material");

        await withSystemRole(tx, (sysTx) =>
          logRadioAudit(
            {
              actorId: ctx.actorId,
              action: "material.created",
              entity: "exclusive_material",
              entityId: material.id,
              diff: { after: { title: material.title } },
            },
            sysTx,
          ),
        );

        return { material };
      },
    );

    // Notificação best-effort, fora da transação (P-8.10) — só a usuários
    // com termo aceito E opt-in de newsletter/novidades (P-0.13);
    // notifyNewMaterialAvailable já filtra os dois.
    await notifyNewMaterialAvailable(material.id);

    return { material };
  });

const DOWNLOAD_URL_EXPIRES_IN_SECONDS = 60 * 60; // 1h — critério de aceite

const getMaterialDownloadUrlSchema = z.object({
  materialId: z.string().uuid(),
});

export const getMaterialDownloadUrl = radioAction
  .schema(getMaterialDownloadUrlSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const material = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .select()
          .from(exclusiveMaterials)
          .where(eq(exclusiveMaterials.id, input.materialId))
          .limit(1);
        return row ?? null;
      },
    );

    // RLS (exclusive_materials_select_term_accepted) já filtrou por aceite
    // de termo — `material` só existe aqui se o usuário tiver ao menos um
    // term_acceptances. Sem aceite, a query retorna vazio.
    if (!material) {
      throw new BusinessError(
        "Material não encontrado ou aceite do termo de uso é necessário",
      );
    }

    const url = await getR2DownloadUrl(
      material.fileUrl,
      DOWNLOAD_URL_EXPIRES_IN_SECONDS,
    );

    return { url };
  });

"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { users } from "@hebron/db/schema";
import { updateMyProfileSchema } from "@hebron/validators/intranet";
import { staffAction } from "../lib/safe-action";
import { BusinessError } from "@hebron/auth/safe-action-error";

// ---------------------------------------------------------------------------
// P-5.1b — perfil de autoatendimento (bio, telefone, avatar). O titular só
// escreve na própria linha (staffAction + WHERE id = ctx.actorId; RLS
// users_update_own, 0000_initial.sql:156-159, é a segunda camada).
//
// perfil-avatares (0078_intranet_perfil_diretorio.sql) é privado — mesmo
// desenho de upload/leitura sob demanda que apps/plataforma/src/actions/
// uploads.ts já usa para plataforma-capas: signed URL de upload, e o valor
// persistido em users.avatar_url é o storage path, nunca a URL assinada
// (que expira). Sem audit log, mesma razão já registrada para a preferência
// de briefing (actions/briefing.ts): dado pessoal de exibição, não decisão
// de governança.
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new BusinessError("Variáveis Supabase não configuradas");
  return createClient(url, key, { auth: { persistSession: false } });
}

function extFromFileName(fileName: string): string {
  return fileName.split(".").pop() ?? "bin";
}

const READ_URL_EXPIRES_IN_SECONDS = 60 * 60;

const getMyAvatarUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export const getMyAvatarUploadUrl = staffAction
  .schema(getMyAvatarUploadUrlSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = getSupabaseAdmin();
    const path = `${ctx.actorId}/${crypto.randomUUID()}.${extFromFileName(parsedInput.fileName)}`;

    const { data, error } = await supabase.storage
      .from("perfil-avatares")
      .createSignedUploadUrl(path);

    if (error)
      throw new BusinessError(`Falha ao gerar URL de upload: ${error.message}`);

    return { uploadUrl: data.signedUrl, storagePath: path };
  });

const getMyAvatarReadUrlSchema = z.object({
  storagePath: z.string().min(1),
});

export const getMyAvatarReadUrl = staffAction
  .schema(getMyAvatarReadUrlSchema)
  .action(async ({ parsedInput }) => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from("perfil-avatares")
      .createSignedUrl(parsedInput.storagePath, READ_URL_EXPIRES_IN_SECONDS);

    if (error)
      throw new BusinessError(
        `Falha ao gerar URL de leitura: ${error.message}`,
      );

    return { url: data.signedUrl };
  });

export const updateMyProfile = staffAction
  .schema(updateMyProfileSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const [row] = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .update(users)
          .set({
            bio: input.bio,
            phone: input.phone,
            avatarUrl: input.avatarPath,
            updatedAt: new Date(),
          })
          .where(eq(users.id, ctx.actorId))
          .returning({
            bio: users.bio,
            phone: users.phone,
            avatarUrl: users.avatarUrl,
          }),
    );
    if (!row) throw new BusinessError("Falha ao salvar perfil");

    return { profile: row };
  });

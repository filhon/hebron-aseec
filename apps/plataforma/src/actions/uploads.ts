"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { staffAction } from "../lib/safe-action";
import { BusinessError } from "@hebron/auth/safe-action-error";

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

// Usada só para a prévia imediata em CourseForm/LessonForm logo após o
// upload (ephemeral, nunca persistida) — o valor gravado em
// courses.cover_url/lessons.download_url é o storagePath, resolvido de novo
// sob demanda em lib/queries.ts (getUserEnrollmentsWithProgress,
// getLessonPageData) a cada leitura, nunca uma URL de longa duração (S-05).
const READ_URL_EXPIRES_IN_SECONDS = 60 * 60;

// ---------------------------------------------------------------------------
// plataforma-capas — capa de curso. Path {actorId}/{uuid}.{ext} (P-6.15,
// ver migration 0046): course_id ainda não existe no momento do upload.
// ---------------------------------------------------------------------------

const getCourseCoverUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export const getCourseCoverUploadUrl = staffAction
  .schema(getCourseCoverUploadUrlSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = getSupabaseAdmin();
    const path = `${ctx.actorId}/${crypto.randomUUID()}.${extFromFileName(parsedInput.fileName)}`;

    const { data, error } = await supabase.storage
      .from("plataforma-capas")
      .createSignedUploadUrl(path);

    if (error)
      throw new BusinessError(`Falha ao gerar URL de upload: ${error.message}`);

    return { uploadUrl: data.signedUrl, storagePath: path };
  });

const getCourseCoverReadUrlSchema = z.object({
  storagePath: z.string().min(1),
});

export const getCourseCoverReadUrl = staffAction
  .schema(getCourseCoverReadUrlSchema)
  .action(async ({ parsedInput }) => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from("plataforma-capas")
      .createSignedUrl(parsedInput.storagePath, READ_URL_EXPIRES_IN_SECONDS);

    if (error)
      throw new BusinessError(
        `Falha ao gerar URL de leitura: ${error.message}`,
      );

    return { url: data.signedUrl };
  });

// ---------------------------------------------------------------------------
// plataforma-anexos — anexo de aula tipo "download". Path
// {courseId}/{uuid}.{ext}: courseId é sempre conhecido (LessonForm exige a
// prop), diferente de lessonId, que só existe após a aula ser criada.
// ---------------------------------------------------------------------------

const getLessonAttachmentUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
  ]),
  courseId: z.string().uuid(),
});

export const getLessonAttachmentUploadUrl = staffAction
  .schema(getLessonAttachmentUploadUrlSchema)
  .action(async ({ parsedInput }) => {
    const supabase = getSupabaseAdmin();
    const path = `${parsedInput.courseId}/${crypto.randomUUID()}.${extFromFileName(parsedInput.fileName)}`;

    const { data, error } = await supabase.storage
      .from("plataforma-anexos")
      .createSignedUploadUrl(path);

    if (error)
      throw new BusinessError(`Falha ao gerar URL de upload: ${error.message}`);

    return { uploadUrl: data.signedUrl, storagePath: path };
  });

// Sem "read URL" de anexo aqui — LessonForm não exibe prévia do anexo (só
// nome/tamanho), então o storagePath retornado por
// getLessonAttachmentUploadUrl já é o valor final. A resolução para uma URL
// baixável acontece em lib/queries.ts#getLessonPageData, sob demanda.

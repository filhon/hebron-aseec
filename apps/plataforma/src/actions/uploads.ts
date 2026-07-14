"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { staffAction } from "../lib/safe-action";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variáveis Supabase não configuradas");
  return createClient(url, key, { auth: { persistSession: false } });
}

function extFromFileName(fileName: string): string {
  return fileName.split(".").pop() ?? "bin";
}

// course-card.tsx/lesson-view.tsx usam coverImageUrl/downloadUrl direto como
// src/href (schemas de packages/validators exigem z.string().url(), não um
// path resolvido sob demanda). Os buckets são privados, então a URL
// resultante precisa ser assinada — 10 anos cobre o ciclo de vida do
// conteúdo sem exigir reautorização periódica.
const READ_URL_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 365 * 10;

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
      throw new Error(`Falha ao gerar URL de upload: ${error.message}`);

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
      throw new Error(`Falha ao gerar URL de leitura: ${error.message}`);

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
      throw new Error(`Falha ao gerar URL de upload: ${error.message}`);

    return { uploadUrl: data.signedUrl, storagePath: path };
  });

const getLessonAttachmentReadUrlSchema = z.object({
  storagePath: z.string().min(1),
});

export const getLessonAttachmentReadUrl = staffAction
  .schema(getLessonAttachmentReadUrlSchema)
  .action(async ({ parsedInput }) => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from("plataforma-anexos")
      .createSignedUrl(parsedInput.storagePath, READ_URL_EXPIRES_IN_SECONDS);

    if (error)
      throw new Error(`Falha ao gerar URL de leitura: ${error.message}`);

    return { url: data.signedUrl };
  });

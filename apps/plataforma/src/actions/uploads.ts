"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { courses, lessons } from "@hebron/db/schema";
import {
  createBunnyVideo,
  createBunnyTusUploadCredentials,
  signBunnyPlaybackUrl,
} from "@hebron/integrations/bunny-stream";
import { plataformaAction, staffAction } from "../lib/safe-action";
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
  .action(async ({ parsedInput, ctx }) => {
    // D1-006 (PACOTE 9): storagePath vem do cliente sem checagem de posse —
    // dois usos legítimos: (a) prévia logo após o próprio upload, path
    // sempre `{actorId}/{uuid}.{ext}` (getCourseCoverUploadUrl acima), ainda
    // não persistido em nenhum curso; (b) reabrir um curso existente para
    // edição, onde storagePath = courses.cover_url de uma linha real (staff
    // pode editar qualquer curso, sem dono único — courses.ts::updateCourse
    // não restringe por instructorId). Fora desses dois casos, recusa.
    const ownsUpload = parsedInput.storagePath.startsWith(`${ctx.actorId}/`);
    if (!ownsUpload) {
      const matches = await withAuthenticatedContext(
        { actorId: ctx.actorId },
        (tx) =>
          tx
            .select({ id: courses.id })
            .from(courses)
            .where(eq(courses.coverUrl, parsedInput.storagePath))
            .limit(1),
      );
      if (!matches[0]) {
        throw new BusinessError("Capa não encontrada ou acesso negado");
      }
    }

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

// ---------------------------------------------------------------------------
// Vídeo de aula via Bunny.net Stream (P-6.20). createLessonVideoUpload cria
// o vídeo na library e devolve as credenciais do upload resumível TUS — o
// client sobe o arquivo direto para a Bunny (packages/integrations/src/
// bunny-stream.ts), nunca pelo body desta Server Function. Falha sem
// BUNNY_STREAM_API_KEY/BUNNY_STREAM_LIBRARY_ID configuradas vira BusinessError
// (mensagem chega ao usuário via handleServerError) — mesmo padrão de
// requireEnv, fail-fast em vez de travar a tela.
// ---------------------------------------------------------------------------

const createLessonVideoUploadSchema = z.object({
  title: z.string().min(1).max(255),
});

export const createLessonVideoUpload = staffAction
  .schema(createLessonVideoUploadSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { videoId } = await createBunnyVideo(parsedInput.title);
      const upload = createBunnyTusUploadCredentials(videoId);
      return { videoId, upload };
    } catch (error) {
      throw new BusinessError(
        error instanceof Error
          ? `Falha ao iniciar upload na Bunny Stream: ${error.message}`
          : "Falha ao iniciar upload na Bunny Stream",
      );
    }
  });

// getLessonVideoPlaybackUrl nunca aceita um videoId vindo do cliente — o
// guid é lido da própria linha em `lessons`, sob a mesma RLS de SELECT que
// já gate video_url (lessons_select_enrolled/lessons_mutate_staff,
// 0020_plataforma_rls.sql): se a query não devolver linha, o usuário não
// está matriculado (ou a aula ainda está trancada pela trilha sequencial) —
// nunca uma checagem de matrícula reimplementada aqui.
const getLessonVideoPlaybackUrlSchema = z.object({
  lessonId: z.string().uuid(),
});

export const getLessonVideoPlaybackUrl = plataformaAction
  .schema(getLessonVideoPlaybackUrlSchema)
  .action(async ({ parsedInput, ctx }) => {
    const rows = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .select({ videoId: lessons.videoId })
          .from(lessons)
          .where(eq(lessons.id, parsedInput.lessonId))
          .limit(1),
    );

    const row = rows[0];
    if (!row?.videoId) {
      throw new BusinessError("Vídeo não encontrado ou acesso negado");
    }

    return { url: signBunnyPlaybackUrl(row.videoId) };
  });

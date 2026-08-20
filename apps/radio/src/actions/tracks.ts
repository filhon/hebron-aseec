"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { authors, radioSeries as series, tracks } from "@hebron/db/schema";
import {
  createAuthorSchema,
  createSeriesSchema,
  createTrackSchema,
  updateAuthorSchema,
  updateSeriesSchema,
} from "@hebron/validators/radio";
import { superAdminAction } from "../lib/safe-action";
import { logRadioAudit } from "../lib/audit";
import { getR2PublicUrl, getR2UploadUrl } from "../lib/r2";

// ---------------------------------------------------------------------------
// CRUD de autores e séries (escopo de P-8.8: "CRUD de autores, séries,
// playlists") e upload/criação de faixas ("upload de faixa para Cloudflare
// R2"). Não há `actions/authors.ts`/`actions/series.ts` na lista de arquivos
// permitidos do prompt — autores e séries são pai direto de faixa
// (tracks.authorId/seriesId), então ficam neste arquivo (G1: ambiguidade
// resolvida pela opção mais simples, registrada em SESSIONS.md).
//
// Toda mutação roda via withAuthenticatedContext (papel `authenticated` real
// na transação, não a conexão superuser de `db`) para que as policies de
// `0050_radio_rls.sql` (FOR ALL ... USING (public.has_role('super_admin')))
// sejam de fato exercidas — defense in depth (G6.2), mesmo padrão de
// apps/flats/src/actions/reservations.ts.
// ---------------------------------------------------------------------------

// ─── Autores ────────────────────────────────────────────────────────────────

const AUTHOR_PHOTO_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const getAuthorPhotoUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum(AUTHOR_PHOTO_ALLOWED_CONTENT_TYPES),
});

/**
 * URL assinada de upload + URL pública final da foto (`authors.photoUrl` é
 * `z.string().url()` em `createAuthorSchema` — precisa ser uma URL completa,
 * não a key crua do bucket como em tracks/materiais). Infraestrutura óbvia
 * faltante para o `AuthorForm` de P-8.4 (G1, ver lib/r2.ts).
 */
export const getAuthorPhotoUploadUrl = superAdminAction
  .schema(getAuthorPhotoUploadUrlSchema)
  .action(async ({ parsedInput: input }) => {
    const ext = input.fileName.split(".").pop() ?? "bin";
    const key = `authors/${randomUUID()}.${ext}`;
    const uploadUrl = await getR2UploadUrl(key, input.contentType);
    return { uploadUrl, publicUrl: getR2PublicUrl(key) };
  });

export const createAuthor = superAdminAction
  .schema(createAuthorSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [author] = await tx.insert(authors).values(input).returning();
      if (!author) throw new BusinessError("Falha ao criar autor");

      await withSystemRole(tx, (sysTx) =>
        logRadioAudit(
          {
            actorId: ctx.actorId,
            action: "author.created",
            entity: "author",
            entityId: author.id,
            diff: { after: { name: author.name } },
          },
          sysTx,
        ),
      );

      return { author };
    });
  });

export const updateAuthor = superAdminAction
  .schema(updateAuthorSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const { authorId, ...values } = input;

    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [before] = await tx
        .select()
        .from(authors)
        .where(eq(authors.id, authorId))
        .limit(1);
      if (!before) throw new BusinessError("Autor não encontrado");

      const [updated] = await tx
        .update(authors)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(authors.id, authorId))
        .returning();
      if (!updated) throw new BusinessError("Falha ao atualizar autor");

      await withSystemRole(tx, (sysTx) =>
        logRadioAudit(
          {
            actorId: ctx.actorId,
            action: "author.updated",
            entity: "author",
            entityId: authorId,
            diff: {
              before: { name: before.name },
              after: { name: updated.name },
            },
          },
          sysTx,
        ),
      );

      return { author: updated };
    });
  });

const deleteAuthorSchema = z.object({ authorId: z.string().uuid() });

export const deleteAuthor = superAdminAction
  .schema(deleteAuthorSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [before] = await tx
        .select()
        .from(authors)
        .where(eq(authors.id, input.authorId))
        .limit(1);
      if (!before) throw new BusinessError("Autor não encontrado");

      const [linkedSeries] = await tx
        .select({ id: series.id })
        .from(series)
        .where(eq(series.authorId, input.authorId))
        .limit(1);
      const [linkedTrack] = await tx
        .select({ id: tracks.id })
        .from(tracks)
        .where(eq(tracks.authorId, input.authorId))
        .limit(1);
      if (linkedSeries || linkedTrack) {
        throw new BusinessError(
          "Não é possível remover autor com séries ou faixas vinculadas",
        );
      }

      await tx.delete(authors).where(eq(authors.id, input.authorId));

      await withSystemRole(tx, (sysTx) =>
        logRadioAudit(
          {
            actorId: ctx.actorId,
            action: "author.deleted",
            entity: "author",
            entityId: input.authorId,
            diff: { deleted: { name: before.name } },
          },
          sysTx,
        ),
      );

      return { deleted: true };
    });
  });

// ─── Séries ─────────────────────────────────────────────────────────────────

export const createSeries = superAdminAction
  .schema(createSeriesSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [row] = await tx.insert(series).values(input).returning();
      if (!row) throw new BusinessError("Falha ao criar série");

      await withSystemRole(tx, (sysTx) =>
        logRadioAudit(
          {
            actorId: ctx.actorId,
            action: "series.created",
            entity: "series",
            entityId: row.id,
            diff: { after: { name: row.name, authorId: row.authorId } },
          },
          sysTx,
        ),
      );

      return { series: row };
    });
  });

export const updateSeries = superAdminAction
  .schema(updateSeriesSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const { seriesId, ...values } = input;

    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [before] = await tx
        .select()
        .from(series)
        .where(eq(series.id, seriesId))
        .limit(1);
      if (!before) throw new BusinessError("Série não encontrada");

      const [updated] = await tx
        .update(series)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(series.id, seriesId))
        .returning();
      if (!updated) throw new BusinessError("Falha ao atualizar série");

      await withSystemRole(tx, (sysTx) =>
        logRadioAudit(
          {
            actorId: ctx.actorId,
            action: "series.updated",
            entity: "series",
            entityId: seriesId,
            diff: {
              before: { name: before.name, authorId: before.authorId },
              after: { name: updated.name, authorId: updated.authorId },
            },
          },
          sysTx,
        ),
      );

      return { series: updated };
    });
  });

const deleteSeriesSchema = z.object({ seriesId: z.string().uuid() });

export const deleteSeries = superAdminAction
  .schema(deleteSeriesSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [before] = await tx
        .select()
        .from(series)
        .where(eq(series.id, input.seriesId))
        .limit(1);
      if (!before) throw new BusinessError("Série não encontrada");

      // tracks.seriesId é `onDelete: "set null"` — remover a série não
      // remove as faixas, só desvincula (packages/db/src/schema/radio.ts).
      await tx.delete(series).where(eq(series.id, input.seriesId));

      await withSystemRole(tx, (sysTx) =>
        logRadioAudit(
          {
            actorId: ctx.actorId,
            action: "series.deleted",
            entity: "series",
            entityId: input.seriesId,
            diff: { deleted: { name: before.name } },
          },
          sysTx,
        ),
      );

      return { deleted: true };
    });
  });

// ─── Faixas ─────────────────────────────────────────────────────────────────

const AUDIO_ALLOWED_CONTENT_TYPES = ["audio/mpeg", "audio/mp3"] as const;

const getTrackUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum(AUDIO_ALLOWED_CONTENT_TYPES),
});

/**
 * Gera uma URL assinada de upload direto ao R2 (arquivo até 200MB não passa
 * pelo body da Server Action). O client faz o PUT diretamente e, em
 * seguida, chama `createTrack` com a `key` retornada aqui.
 */
export const getTrackUploadUrl = superAdminAction
  .schema(getTrackUploadUrlSchema)
  .action(async ({ parsedInput: input }) => {
    const key = `tracks/${randomUUID()}.mp3`;
    const uploadUrl = await getR2UploadUrl(key, input.contentType);
    return { uploadUrl, key };
  });

export const createTrack = superAdminAction
  .schema(createTrackSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [track] = await tx.insert(tracks).values(input).returning();
      if (!track) throw new BusinessError("Falha ao criar faixa");

      await withSystemRole(tx, (sysTx) =>
        logRadioAudit(
          {
            actorId: ctx.actorId,
            action: "track.created",
            entity: "track",
            entityId: track.id,
            diff: {
              after: {
                title: track.title,
                authorId: track.authorId,
                seriesId: track.seriesId,
              },
            },
          },
          sysTx,
        ),
      );

      return { track };
    });
  });

"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import type { AuthenticatedTx } from "@hebron/db/authenticated";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { playlists, playlistTracks } from "@hebron/db/schema";
import {
  createPlaylistSchema,
  updatePlaylistSchema,
} from "@hebron/validators/radio";
import { superAdminAction } from "../lib/safe-action";
import { logRadioAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// CRUD de playlists + ativação (BRAIN §6.4: só uma playlist ativa por vez,
// garantido no banco pelo índice único parcial `playlists_active_uniq` —
// packages/db/src/schema/radio.ts). `trackIds` é a ordem de reprodução; a
// posição no array vira `playlistTracks.position` (1-based).
// ---------------------------------------------------------------------------

async function replacePlaylistTracks(
  tx: AuthenticatedTx,
  playlistId: string,
  trackIds: string[],
) {
  await tx
    .delete(playlistTracks)
    .where(eq(playlistTracks.playlistId, playlistId));

  if (trackIds.length > 0) {
    await tx.insert(playlistTracks).values(
      trackIds.map((trackId, index) => ({
        playlistId,
        trackId,
        position: index + 1,
      })),
    );
  }
}

export const createPlaylist = superAdminAction
  .schema(createPlaylistSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [playlist] = await tx
        .insert(playlists)
        .values({ name: input.name, loop: input.loop })
        .returning();
      if (!playlist) throw new BusinessError("Falha ao criar playlist");

      await replacePlaylistTracks(tx, playlist.id, input.trackIds);

      await withSystemRole(tx, (sysTx) =>
        logRadioAudit(
          {
            actorId: ctx.actorId,
            action: "playlist.created",
            entity: "playlist",
            entityId: playlist.id,
            diff: {
              after: { name: playlist.name, trackCount: input.trackIds.length },
            },
          },
          sysTx,
        ),
      );

      return { playlist };
    });
  });

export const updatePlaylist = superAdminAction
  .schema(updatePlaylistSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const { playlistId, trackIds, ...values } = input;

    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [before] = await tx
        .select()
        .from(playlists)
        .where(eq(playlists.id, playlistId))
        .limit(1);
      if (!before) throw new BusinessError("Playlist não encontrada");

      const [updated] = await tx
        .update(playlists)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(playlists.id, playlistId))
        .returning();
      if (!updated) throw new BusinessError("Falha ao atualizar playlist");

      await replacePlaylistTracks(tx, playlistId, trackIds);

      await withSystemRole(tx, (sysTx) =>
        logRadioAudit(
          {
            actorId: ctx.actorId,
            action: "playlist.updated",
            entity: "playlist",
            entityId: playlistId,
            diff: {
              before: { name: before.name },
              after: { name: updated.name, trackCount: trackIds.length },
            },
          },
          sysTx,
        ),
      );

      return { playlist: updated };
    });
  });

const deletePlaylistSchema = z.object({ playlistId: z.string().uuid() });

export const deletePlaylist = superAdminAction
  .schema(deletePlaylistSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [before] = await tx
        .select()
        .from(playlists)
        .where(eq(playlists.id, input.playlistId))
        .limit(1);
      if (!before) throw new BusinessError("Playlist não encontrada");

      if (before.isActive) {
        throw new BusinessError(
          "Não é possível remover a playlist ativa. Ative outra playlist antes.",
        );
      }

      // playlist_tracks é cascade a partir de playlists (schema/radio.ts).
      await tx.delete(playlists).where(eq(playlists.id, input.playlistId));

      await withSystemRole(tx, (sysTx) =>
        logRadioAudit(
          {
            actorId: ctx.actorId,
            action: "playlist.deleted",
            entity: "playlist",
            entityId: input.playlistId,
            diff: { deleted: { name: before.name } },
          },
          sysTx,
        ),
      );

      return { deleted: true };
    });
  });

const activatePlaylistSchema = z.object({ playlistId: z.string().uuid() });

/**
 * Ativa uma playlist e desativa todas as outras num único UPDATE (o índice
 * único parcial `playlists_active_uniq` só permite uma linha com
 * `is_active = true` por vez — trocar em uma única instrução evita violação
 * transitória).
 */
export const activatePlaylist = superAdminAction
  .schema(activatePlaylistSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [target] = await tx
        .select()
        .from(playlists)
        .where(eq(playlists.id, input.playlistId))
        .limit(1);
      if (!target) throw new BusinessError("Playlist não encontrada");

      await tx.update(playlists).set({
        isActive: sql`(${playlists.id} = ${input.playlistId})`,
        updatedAt: new Date(),
      });

      await withSystemRole(tx, (sysTx) =>
        logRadioAudit(
          {
            actorId: ctx.actorId,
            action: "playlist.activated",
            entity: "playlist",
            entityId: input.playlistId,
            diff: { after: { name: target.name } },
          },
          sysTx,
        ),
      );

      return { playlistId: input.playlistId };
    });
  });

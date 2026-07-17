/**
 * playlist.test.ts — playlist ativa: apenas 1 por vez (P-8.6/P-8.8,
 * schema/radio.ts::playlists_active_uniq).
 *
 * Duas camadas testadas:
 *  1. Constraint de banco: o índice único parcial `playlists_active_uniq`
 *     (`ON is_active WHERE is_active = true`) rejeita uma segunda linha com
 *     `is_active = true` inserida diretamente.
 *  2. Server Action `activatePlaylist` (actions/playlists.ts): ativa uma
 *     playlist e desativa todas as outras num único UPDATE — nunca duas
 *     ativas simultaneamente, mesmo trocando o alvo repetidas vezes.
 *
 * O banco de dev é compartilhado — a playlist ativa "real" (se existir) é
 * capturada em beforeAll e restaurada em afterAll, para não deixar o Auto DJ
 * sem playlist ativa após a suíte rodar.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  authors,
  tracks,
  playlists,
  auditLog,
} from "@hebron/db/schema";

const ACTOR_ID = "8a130000-0000-0000-0000-000000000001";
const IDS = {
  author: "8a131000-0000-0000-0000-000000000001",
  tracks: {
    a: "8a131000-0000-0000-0000-000000000002",
    b: "8a131000-0000-0000-0000-000000000003",
  },
  playlists: {
    constraintA: "8a132000-0000-0000-0000-000000000003",
    constraintB: "8a132000-0000-0000-0000-000000000004",
  },
} as const;

// Playlists criadas via `createPlaylist` (ids gerados pelo próprio banco,
// `defaultRandom()`) — coletadas aqui para limpeza em `afterAll`.
const createdPlaylistIds: string[] = [];

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: ACTOR_ID,
    roles: ["super_admin"],
    designations: [],
  }),
}));

let previousActiveId: string | null = null;

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: ACTOR_ID,
      email: "playlist-test-super@test.hebron",
      fullName: "Playlist Test SuperAdmin",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: ACTOR_ID, role: "super_admin", grantedBy: ACTOR_ID })
    .onConflictDoNothing();

  await db
    .insert(authors)
    .values({ id: IDS.author, name: "Playlist Test Autor" })
    .onConflictDoNothing();
  await db
    .insert(tracks)
    .values([
      {
        id: IDS.tracks.a,
        title: "Playlist Test Faixa A",
        authorId: IDS.author,
        fileUrl: "tracks/playlist-test-a.mp3",
        durationSeconds: 600,
      },
      {
        id: IDS.tracks.b,
        title: "Playlist Test Faixa B",
        authorId: IDS.author,
        fileUrl: "tracks/playlist-test-b.mp3",
        durationSeconds: 600,
      },
    ])
    .onConflictDoNothing();

  // Captura + neutraliza a playlist ativa pré-existente (banco de dev
  // compartilhado) para poder exercitar o índice único parcial de forma
  // determinística — restaurada em afterAll.
  const [prevActive] = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(eq(playlists.isActive, true))
    .limit(1);
  previousActiveId = prevActive?.id ?? null;
  await db
    .update(playlists)
    .set({ isActive: false })
    .where(eq(playlists.isActive, true));
});

afterAll(async () => {
  await db
    .delete(playlists)
    .where(inArray(playlists.id, Object.values(IDS.playlists)));
  if (createdPlaylistIds.length > 0) {
    await db.delete(playlists).where(inArray(playlists.id, createdPlaylistIds));
  }
  // playlist_tracks é cascade a partir de playlists (schema/radio.ts).
  await db.delete(tracks).where(inArray(tracks.id, Object.values(IDS.tracks)));
  await db.delete(authors).where(eq(authors.id, IDS.author));
  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR_ID));
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, ACTOR_ID));
  await db.delete(users).where(eq(users.id, ACTOR_ID));

  if (previousActiveId) {
    await db
      .update(playlists)
      .set({ isActive: true })
      .where(eq(playlists.id, previousActiveId));
  }
});

// ── Constraint de banco: índice único parcial ─────────────────────────────

describe("playlists_active_uniq — índice único parcial impede 2 playlists ativas", () => {
  it("primeira playlist com is_active=true insere normalmente", async () => {
    await db.insert(playlists).values({
      id: IDS.playlists.constraintA,
      name: "Constraint Test A",
      isActive: true,
    });
    const [row] = await db
      .select({ id: playlists.id })
      .from(playlists)
      .where(eq(playlists.id, IDS.playlists.constraintA));
    expect(row?.id).toBe(IDS.playlists.constraintA);
  });

  it("segunda playlist com is_active=true é rejeitada (unique violation)", async () => {
    await expect(
      db.insert(playlists).values({
        id: IDS.playlists.constraintB,
        name: "Constraint Test B",
        isActive: true,
      }),
    ).rejects.toThrow(/duplicate key|unique constraint/i);
  });
});

// ── Server Action activatePlaylist — troca atômica ────────────────────────

describe("activatePlaylist — ativa uma e desativa as demais num único UPDATE", () => {
  it("cria 2 playlists (ambas inativas por padrão)", async () => {
    const { createPlaylist } = await import("../actions/playlists");

    const created1 = await createPlaylist({
      name: "Playlist Um",
      trackIds: [IDS.tracks.a],
      loop: true,
    });
    expect(created1?.data?.playlist?.id).toBeTruthy();
    expect(created1?.data?.playlist?.isActive).toBe(false);
    createdPlaylistIds.push(created1?.data?.playlist?.id as unknown as string);

    const created2 = await createPlaylist({
      name: "Playlist Dois",
      trackIds: [IDS.tracks.b],
      loop: true,
    });
    expect(created2?.data?.playlist?.id).toBeTruthy();
    expect(created2?.data?.playlist?.isActive).toBe(false);
    createdPlaylistIds.push(created2?.data?.playlist?.id as unknown as string);
  });

  it("ativar a playlist Um deixa só ela ativa", async () => {
    const { createPlaylist, activatePlaylist } =
      await import("../actions/playlists");

    const created1 = await createPlaylist({
      name: "Playlist Ativação Um",
      trackIds: [IDS.tracks.a],
      loop: true,
    });
    const playlist1Id = created1?.data?.playlist?.id as unknown as string;
    createdPlaylistIds.push(playlist1Id);

    const created2 = await createPlaylist({
      name: "Playlist Ativação Dois",
      trackIds: [IDS.tracks.b],
      loop: true,
    });
    const playlist2Id = created2?.data?.playlist?.id as unknown as string;
    createdPlaylistIds.push(playlist2Id);

    await activatePlaylist({ playlistId: playlist1Id });

    const rows = await db
      .select({ id: playlists.id, isActive: playlists.isActive })
      .from(playlists)
      .where(inArray(playlists.id, [playlist1Id, playlist2Id]));
    const active = rows.filter((r) => r.isActive);
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe(playlist1Id);

    // Trocar o alvo: ativar a Dois deve desativar a Um automaticamente.
    await activatePlaylist({ playlistId: playlist2Id });

    const rowsAfter = await db
      .select({ id: playlists.id, isActive: playlists.isActive })
      .from(playlists)
      .where(inArray(playlists.id, [playlist1Id, playlist2Id]));
    const activeAfter = rowsAfter.filter((r) => r.isActive);
    expect(activeAfter).toHaveLength(1);
    expect(activeAfter[0]?.id).toBe(playlist2Id);
  });

  it("não é possível remover a playlist ativa", async () => {
    const { createPlaylist, activatePlaylist, deletePlaylist } =
      await import("../actions/playlists");

    const created = await createPlaylist({
      name: "Playlist Guard Delete",
      trackIds: [IDS.tracks.a],
      loop: true,
    });
    const playlistId = created?.data?.playlist?.id as unknown as string;
    createdPlaylistIds.push(playlistId);

    await activatePlaylist({ playlistId });

    const result = await deletePlaylist({ playlistId });
    expect(result?.serverError).toBeDefined();

    // Só é possível remover depois que outra playlist assume o posto de ativa.
    const other = await createPlaylist({
      name: "Playlist Guard Delete — outra para assumir o posto",
      trackIds: [IDS.tracks.b],
      loop: true,
    });
    const otherId = other?.data?.playlist?.id as unknown as string;
    createdPlaylistIds.push(otherId);
    await activatePlaylist({ playlistId: otherId });

    const result2 = await deletePlaylist({ playlistId });
    expect(result2?.serverError).toBeUndefined();
  });
});

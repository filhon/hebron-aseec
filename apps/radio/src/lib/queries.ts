import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import {
  createSupabaseServerActionClient,
  resolveSession,
} from "@hebron/auth/server";
import type { ActionSession } from "@hebron/auth/server";
import {
  authors,
  radioSeries as seriesTable,
  tracks,
  playlists,
  playlistTracks,
  exclusiveMaterials,
  termAcceptances,
  nowPlaying,
  users,
} from "@hebron/db/schema";
import type {
  Author,
  Series,
  Track,
  Playlist,
  ExclusiveMaterial,
} from "@hebron/types/radio";

// ---------------------------------------------------------------------------
// Auth — mesmo padrão de apps/flats e apps/plataforma (lib/queries.ts):
// getAuthUser via client de sessão (auth.getUser()) + lookup em public.users
// por nome de exibição; gate de papel da área (admin) fica aqui também (não
// há lib/session.ts na lista de arquivos permitidos de P-8.9, mesmo
// precedente).
// ---------------------------------------------------------------------------

export async function getAuthUser(): Promise<{
  id: string;
  fullName: string | null;
  email: string | null;
} | null> {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerActionClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      } catch {
        // Server Component — não pode setar cookies, ignorar
      }
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return {
    id: user.id,
    fullName: rows[0]?.fullName ?? null,
    email: user.email ?? null,
  };
}

/**
 * Gate da área (admin): apenas super_admin — espelha literalmente
 * `*_mutate_admin` de 0050_radio_rls.sql (todo o schema radio só aceita
 * mutação de super_admin, sem designação adicional como em flats/financeiro).
 */
export async function requireSuperAdminSession(): Promise<ActionSession> {
  const cookieStore = await cookies();

  let session: ActionSession;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }

  if (!session.roles.includes("super_admin")) {
    redirect(CANONICAL_LOGIN_URL);
  }

  return session;
}

// ---------------------------------------------------------------------------
// Catálogo público (autores/séries/faixas) — leitura roda como `anon` via
// withAuthenticatedContext(null, ...) para exercer de fato as policies
// "*_select_public" de 0050_radio_rls.sql (G6.2: RLS como camada ativa, não
// apenas declarada), mesmo padrão de getCertificateVerification em
// apps/plataforma/src/lib/queries.ts.
// ---------------------------------------------------------------------------

export interface RadioCatalog {
  authors: Author[];
  series: Series[];
  tracks: Track[];
}

export async function getRadioCatalog(): Promise<RadioCatalog> {
  return withAuthenticatedContext(null, async (tx) => {
    const authorRows = await tx
      .select()
      .from(authors)
      .orderBy(asc(authors.name));

    const seriesRows = await tx
      .select({
        id: seriesTable.id,
        name: seriesTable.name,
        authorId: seriesTable.authorId,
        authorName: authors.name,
        description: seriesTable.description,
        createdAt: seriesTable.createdAt,
        updatedAt: seriesTable.updatedAt,
      })
      .from(seriesTable)
      .innerJoin(authors, eq(seriesTable.authorId, authors.id))
      .orderBy(asc(seriesTable.name));

    const trackRows = await tx
      .select({
        id: tracks.id,
        title: tracks.title,
        authorId: tracks.authorId,
        authorName: authors.name,
        seriesId: tracks.seriesId,
        seriesName: seriesTable.name,
        fileUrl: tracks.fileUrl,
        durationSeconds: tracks.durationSeconds,
        createdAt: tracks.uploadedAt,
        updatedAt: tracks.updatedAt,
      })
      .from(tracks)
      .innerJoin(authors, eq(tracks.authorId, authors.id))
      .leftJoin(seriesTable, eq(tracks.seriesId, seriesTable.id))
      .orderBy(asc(tracks.title));

    return {
      authors: authorRows,
      series: seriesRows,
      tracks: trackRows.map((t) => ({
        ...t,
        seriesName: t.seriesName ?? null,
      })),
    };
  });
}

export interface NowPlayingSnapshot {
  trackId: string;
  trackTitle: string;
  authorName: string;
  seriesName: string | null;
  durationSeconds: number;
  startedAt: Date;
}

/** Estado atual do Auto DJ (singleton `now_playing` + faixa/autor/série). */
export async function getNowPlayingSnapshot(): Promise<NowPlayingSnapshot | null> {
  return withAuthenticatedContext(null, async (tx) => {
    const rows = await tx
      .select({
        trackId: nowPlaying.trackId,
        startedAt: nowPlaying.startedAt,
        trackTitle: tracks.title,
        durationSeconds: tracks.durationSeconds,
        authorName: authors.name,
        seriesName: seriesTable.name,
      })
      .from(nowPlaying)
      .innerJoin(tracks, eq(nowPlaying.trackId, tracks.id))
      .innerJoin(authors, eq(tracks.authorId, authors.id))
      .leftJoin(seriesTable, eq(tracks.seriesId, seriesTable.id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return { ...row, seriesName: row.seriesName ?? null };
  });
}

export interface PlaylistWithTracks extends Playlist {
  isActive: boolean;
}

/**
 * Playlists + faixas ordenadas — usado pelo painel admin (lista + edição via
 * `PlaylistForm`, P-8.4). Tabelas públicas (`playlists_select_public`/
 * `playlist_tracks_select_public`, 0050_radio_rls.sql), mas a leitura roda
 * com o `actorId` da sessão admin por consistência com o resto da área.
 */
export async function getPlaylistsWithTracks(
  actorId: string,
): Promise<PlaylistWithTracks[]> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const playlistRows = await tx
      .select()
      .from(playlists)
      .orderBy(asc(playlists.name));

    const trackRows = await tx
      .select({
        playlistId: playlistTracks.playlistId,
        id: tracks.id,
        title: tracks.title,
        authorId: tracks.authorId,
        authorName: authors.name,
        seriesId: tracks.seriesId,
        seriesName: seriesTable.name,
        fileUrl: tracks.fileUrl,
        durationSeconds: tracks.durationSeconds,
        createdAt: tracks.uploadedAt,
        updatedAt: tracks.updatedAt,
      })
      .from(playlistTracks)
      .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
      .innerJoin(authors, eq(tracks.authorId, authors.id))
      .leftJoin(seriesTable, eq(tracks.seriesId, seriesTable.id))
      .orderBy(asc(playlistTracks.position));

    return playlistRows.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      loop: playlist.loop,
      isActive: playlist.isActive,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
      tracks: trackRows
        .filter((t) => t.playlistId === playlist.id)
        .map((t) => ({ ...t, seriesName: t.seriesName ?? null })),
    }));
  });
}

// ---------------------------------------------------------------------------
// Materiais exclusivos (BRAIN §6.4) — SELECT em `exclusive_materials` exige
// sessão com ao menos um `term_acceptances` (exclusive_materials_select_term_accepted,
// 0050_radio_rls.sql): sem aceite a query volta vazia — não dá para listar
// título/estado antes do aceite. `materiais/page.tsx` resolve isso checando
// `hasAcceptedTerm` ANTES de chamar `getExclusiveMaterialsList`, em vez de
// tentar inferir "sem aceite" a partir de uma lista vazia (que também
// aconteceria se não houvesse nenhum material cadastrado).
// ---------------------------------------------------------------------------

export async function hasAcceptedTerm(actorId: string): Promise<boolean> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const rows = await tx
      .select({ id: termAcceptances.id })
      .from(termAcceptances)
      .where(eq(termAcceptances.userId, actorId))
      .limit(1);
    return rows.length > 0;
  });
}

export async function getExclusiveMaterialsList(
  actorId: string,
): Promise<ExclusiveMaterial[]> {
  return withAuthenticatedContext({ actorId }, (tx) =>
    tx.select().from(exclusiveMaterials).orderBy(asc(exclusiveMaterials.title)),
  );
}

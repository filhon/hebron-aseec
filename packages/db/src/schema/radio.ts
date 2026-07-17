import {
  boolean,
  check,
  index,
  integer,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { radioSchema, users } from "./public";

// ---------------------------------------------------------------------------
// radio.authors — preletor/pregador, pai de series e tracks (BRAIN §6.4).
// ---------------------------------------------------------------------------
export const authors = radioSchema.table("authors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// radio.series — série de pregações de um autor (ex.: "Romanos"). authorId
// sem onDelete: não é possível remover um autor com séries vinculadas
// (mesmo padrão de plataforma.courses.instructorId).
// ---------------------------------------------------------------------------
export const series = radioSchema.table(
  "series",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => authors.id),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("series_author_id_idx").on(table.authorId)],
);

// ---------------------------------------------------------------------------
// radio.tracks — sermão pré-gravado (.mp3) em Cloudflare R2 (BRAIN §6.4).
// seriesId é opcional (nem toda pregação avulsa pertence a uma série) e some
// via set null se a série for removida — a faixa em si permanece.
// ---------------------------------------------------------------------------
export const tracks = radioSchema.table(
  "tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => authors.id),
    seriesId: uuid("series_id").references(() => series.id, {
      onDelete: "set null",
    }),
    fileUrl: text("file_url").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("tracks_author_id_idx").on(table.authorId),
    index("tracks_series_id_idx").on(table.seriesId),
  ],
);

// ---------------------------------------------------------------------------
// radio.playlists — lista tocada pelo Auto DJ 24/7 (BRAIN §6.4). Apenas uma
// pode estar ativa por vez — índice único parcial em isActive garante isso
// no banco (mesmo padrão de flats.guests_reservation_responsible_uniq).
// ---------------------------------------------------------------------------
export const playlists = radioSchema.table(
  "playlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    // Reinicia da primeira faixa ao terminar a última.
    loop: boolean("loop").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("playlists_active_uniq")
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
  ],
);

// ---------------------------------------------------------------------------
// radio.playlist_tracks — junção ordenada (position define a ordem de
// reprodução do Auto DJ). Uma faixa aparece no máximo uma vez por playlist.
// ---------------------------------------------------------------------------
export const playlistTracks = radioSchema.table(
  "playlist_tracks",
  {
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.playlistId, table.trackId] }),
    unique("playlist_tracks_playlist_position_uniq").on(
      table.playlistId,
      table.position,
    ),
  ],
);

// ---------------------------------------------------------------------------
// radio.now_playing — singleton (BRAIN §6.4: "tocando agora"), sincronizado
// via Supabase Realtime. id booleano fixo em true + CHECK garantem que a
// tabela nunca tenha mais de uma linha.
// ---------------------------------------------------------------------------
export const nowPlaying = radioSchema.table(
  "now_playing",
  {
    id: boolean("id").primaryKey().default(true),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [check("now_playing_singleton_check", sql`${table.id} = true`)],
);

// ---------------------------------------------------------------------------
// radio.exclusive_materials — download exclusivo; acesso exige cadastro +
// aprovação + aceite prévio de termo quando requiresTerm (BRAIN §6.4).
// ---------------------------------------------------------------------------
export const exclusiveMaterials = radioSchema.table("exclusive_materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  description: text("description"),
  requiresTerm: boolean("requires_term").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// radio.term_acceptances — aceite do termo de não redistribuição/
// comercialização; um único aceite por usuário cobre todos os materiais
// exclusivos (BRAIN §6.4).
// ---------------------------------------------------------------------------
export const termAcceptances = radioSchema.table("term_acceptances", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// radio.listener_stats — snapshot periódico de audiência, consumido pelo
// dashboard da Intranet (BRAIN §6.6/§6.9: "Rádio → Intranet: audiência").
// ---------------------------------------------------------------------------
export const listenerStats = radioSchema.table(
  "listener_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listenerCount: integer("listener_count").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("listener_stats_captured_at_idx").on(table.capturedAt)],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type Author = typeof authors.$inferSelect;
export type NewAuthor = typeof authors.$inferInsert;
export type Series = typeof series.$inferSelect;
export type NewSeries = typeof series.$inferInsert;
export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;
export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;
export type PlaylistTrack = typeof playlistTracks.$inferSelect;
export type NewPlaylistTrack = typeof playlistTracks.$inferInsert;
export type NowPlaying = typeof nowPlaying.$inferSelect;
export type NewNowPlaying = typeof nowPlaying.$inferInsert;
export type ExclusiveMaterial = typeof exclusiveMaterials.$inferSelect;
export type NewExclusiveMaterial = typeof exclusiveMaterials.$inferInsert;
export type TermAcceptance = typeof termAcceptances.$inferSelect;
export type NewTermAcceptance = typeof termAcceptances.$inferInsert;
export type ListenerStat = typeof listenerStats.$inferSelect;
export type NewListenerStat = typeof listenerStats.$inferInsert;

import { z } from "zod";

// ─── createAuthorSchema ────────────────────────────────────────────────────────

export const createAuthorSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório").max(200),
  bio: z.string().max(2000).nullable().optional().default(null),
  photoUrl: z.string().url().nullable().optional().default(null),
});

export type CreateAuthorInput = z.infer<typeof createAuthorSchema>;

// ─── updateAuthorSchema ────────────────────────────────────────────────────────

export const updateAuthorSchema = createAuthorSchema.extend({
  authorId: z.string().uuid(),
});

export type UpdateAuthorInput = z.infer<typeof updateAuthorSchema>;

// ─── createSeriesSchema ────────────────────────────────────────────────────────

export const createSeriesSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório").max(200),
  authorId: z.string().uuid("Selecione um autor"),
  description: z.string().max(2000).nullable().optional().default(null),
});

export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;

// ─── updateSeriesSchema ────────────────────────────────────────────────────────

export const updateSeriesSchema = createSeriesSchema.extend({
  seriesId: z.string().uuid(),
});

export type UpdateSeriesInput = z.infer<typeof updateSeriesSchema>;

// ─── createTrackSchema ─────────────────────────────────────────────────────────
// fileUrl é a chave resultante do upload para o bucket R2, repassada pelo
// client após o upload (mesmo padrão de `responsibleDocumentSchema` em Flats).

export const createTrackSchema = z.object({
  title: z.string().min(2, "Título é obrigatório").max(200),
  authorId: z.string().uuid("Selecione um autor"),
  seriesId: z.string().uuid().nullable().optional().default(null),
  fileUrl: z.string().min(1, "Arquivo é obrigatório"),
  durationSeconds: z.number().int().positive("Duração inválida"),
});

export type CreateTrackInput = z.infer<typeof createTrackSchema>;

// ─── updateTrackSchema ─────────────────────────────────────────────────────────

export const updateTrackSchema = createTrackSchema.extend({
  trackId: z.string().uuid(),
});

export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;

// ─── createPlaylistSchema ──────────────────────────────────────────────────────
// trackIds ordenado — a posição no array define a ordem de reprodução do
// Auto DJ (BRAIN §6.4).

export const createPlaylistSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório").max(200),
  trackIds: z.array(z.string().uuid()).min(1, "Adicione pelo menos uma faixa"),
  loop: z.boolean().optional().default(true),
});

export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;

// ─── updatePlaylistSchema ──────────────────────────────────────────────────────

export const updatePlaylistSchema = createPlaylistSchema.extend({
  playlistId: z.string().uuid(),
});

export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;

// ─── createExclusiveMaterialSchema ─────────────────────────────────────────────

export const createExclusiveMaterialSchema = z.object({
  title: z.string().min(2, "Título é obrigatório").max(200),
  fileUrl: z.string().min(1, "Arquivo é obrigatório"),
  requiresTerm: z.boolean().optional().default(true),
});

export type CreateExclusiveMaterialInput = z.infer<
  typeof createExclusiveMaterialSchema
>;

// ─── acceptTermSchema ──────────────────────────────────────────────────────────
// Aceite único por usuário, cobre todos os materiais exclusivos (BRAIN §6.4).

export const acceptTermSchema = z.object({
  accepted: z.boolean().refine((accepted) => accepted, {
    message: "É necessário aceitar o termo",
  }),
});

export type AcceptTermInput = z.infer<typeof acceptTermSchema>;

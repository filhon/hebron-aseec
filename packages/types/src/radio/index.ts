// ─── Author ───────────────────────────────────────────────────────────────────
// Preletor/pregador — pai de Series e Track (BRAIN §6.4).

export interface Author {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Series ───────────────────────────────────────────────────────────────────
// Série de pregações de um autor (ex.: "Romanos", "Discipulado") — eixo de
// organização do catálogo ao lado do autor (BRAIN §6.4).

export interface Series {
  id: string;
  name: string;
  authorId: string;
  authorName: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Track ────────────────────────────────────────────────────────────────────
// Sermão pré-gravado (.mp3), armazenado em Cloudflare R2 (BRAIN §6.4).
// seriesId é opcional — nem toda pregação avulsa pertence a uma série.

export interface Track {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  seriesId: string | null;
  seriesName: string | null;
  /** Chave/URL do arquivo .mp3 no bucket Cloudflare R2 */
  fileUrl: string;
  durationSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Playlist ─────────────────────────────────────────────────────────────────
// Lista ordenada de faixas tocada pelo Auto DJ 24/7 (BRAIN §6.4) — a posição
// no array `tracks` define a ordem de reprodução.

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  /** Reinicia da primeira faixa ao terminar a última */
  loop: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── NowPlaying ───────────────────────────────────────────────────────────────
// Estado atual do Auto DJ, sincronizado via Supabase Realtime (BRAIN §6.4) —
// singleton, reflete a faixa tocando agora, não um histórico.

export interface NowPlaying {
  trackId: string;
  trackTitle: string;
  authorName: string;
  startedAt: Date;
  positionSeconds: number;
}

// ─── ExclusiveMaterial ────────────────────────────────────────────────────────
// Download exclusivo — acesso exige cadastro + aprovação + (quando
// requiresTerm) aceite prévio de termo de uso (BRAIN §6.4).

export interface ExclusiveMaterial {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  requiresTerm: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── TermAcceptance ───────────────────────────────────────────────────────────
// Aceite do termo de não redistribuição/comercialização — um único aceite por
// usuário cobre todos os materiais exclusivos (BRAIN §6.4).

export interface TermAcceptance {
  id: string;
  userId: string;
  acceptedAt: Date;
}

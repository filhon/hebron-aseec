import type {
  Author,
  ExclusiveMaterial,
  NowPlaying,
  Playlist,
  Series,
  TermAcceptance,
  Track,
} from "@hebron/types/radio";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date("2026-07-17T00:00:00Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const d = (offsetDays: number): Date =>
  new Date(TODAY.getTime() + offsetDays * MS_PER_DAY);

const past = (daysAgo: number): Date => d(-daysAgo);

const minutesAgo = (minutes: number): Date =>
  new Date(TODAY.getTime() - minutes * 60 * 1000);

function findOrThrow<T>(
  items: T[],
  predicate: (item: T) => boolean,
  label: string,
): T {
  const found = items.find(predicate);
  if (!found)
    throw new Error(`Mock data inconsistente: ${label} não encontrado`);
  return found;
}

// ─── Authors ──────────────────────────────────────────────────────────────────

export const mockAuthors: Author[] = [
  {
    id: "author-01",
    name: "Pr. Elias Cavalcanti",
    bio: "Pastor titular da Hebron Aseec há mais de 20 anos, dedicado ao ensino expositivo da Palavra.",
    photoUrl: null,
    createdAt: past(700),
    updatedAt: past(30),
  },
  {
    id: "author-02",
    name: "Pra. Miriam Bezerra",
    bio: "Conselheira e professora, com ministério voltado ao discipulado de mulheres.",
    photoUrl: null,
    createdAt: past(500),
    updatedAt: past(30),
  },
  {
    id: "author-03",
    name: "Pr. Josué Andrade",
    bio: "Missionário em contexto transcultural, prega com frequência em pregações avulsas na rádio.",
    photoUrl: null,
    createdAt: past(300),
    updatedAt: past(30),
  },
];

const authorById = (id: string): Author =>
  findOrThrow(mockAuthors, (author) => author.id === id, `author ${id}`);

// ─── Series ───────────────────────────────────────────────────────────────────
// Josué (author-03) não tem série — só pregações avulsas, exercitando
// Track.seriesId nulo (BRAIN §6.4).

export const mockSeries: Series[] = [
  {
    id: "series-01",
    name: "Romanos: Graça e Vida Nova",
    authorId: "author-01",
    authorName: authorById("author-01").name,
    description:
      "Série expositiva percorrendo a carta aos Romanos, capítulo a capítulo.",
    createdAt: past(400),
    updatedAt: past(40),
  },
  {
    id: "series-02",
    name: "Discipulado em Tempos de Crise",
    authorId: "author-01",
    authorName: authorById("author-01").name,
    description: "Como formar discípulos firmes em contextos de instabilidade.",
    createdAt: past(200),
    updatedAt: past(20),
  },
  {
    id: "series-03",
    name: "Mulheres da Fé",
    authorId: "author-02",
    authorName: authorById("author-02").name,
    description: "Estudos sobre mulheres do Antigo e Novo Testamento.",
    createdAt: past(250),
    updatedAt: past(25),
  },
];

const seriesById = (id: string): Series =>
  findOrThrow(mockSeries, (series) => series.id === id, `series ${id}`);

// ─── Tracks ───────────────────────────────────────────────────────────────────

const track = (
  id: string,
  title: string,
  authorId: string,
  seriesId: string | null,
  fileName: string,
  durationSeconds: number,
  createdDaysAgo: number,
): Track => ({
  id,
  title,
  authorId,
  authorName: authorById(authorId).name,
  seriesId,
  seriesName: seriesId ? seriesById(seriesId).name : null,
  fileUrl: `radio-tracks/${fileName}`,
  durationSeconds,
  createdAt: past(createdDaysAgo),
  updatedAt: past(createdDaysAgo),
});

export const mockTracks: Track[] = [
  // série-01 — Romanos: Graça e Vida Nova
  track(
    "track-01",
    "Romanos 1 — A justiça de Deus revelada",
    "author-01",
    "series-01",
    "romanos-01-a-justica-de-deus-revelada.mp3",
    2640,
    400,
  ),
  track(
    "track-02",
    "Romanos 3 — Todos pecaram",
    "author-01",
    "series-01",
    "romanos-02-todos-pecaram.mp3",
    2515,
    393,
  ),
  track(
    "track-03",
    "Romanos 5 — Paz com Deus",
    "author-01",
    "series-01",
    "romanos-03-paz-com-deus.mp3",
    2780,
    386,
  ),
  track(
    "track-04",
    "Romanos 8 — Sem condenação",
    "author-01",
    "series-01",
    "romanos-04-sem-condenacao.mp3",
    2910,
    379,
  ),
  // série-02 — Discipulado em Tempos de Crise
  track(
    "track-05",
    "Discipulado 1 — Fundamentos que não abalam",
    "author-01",
    "series-02",
    "discipulado-01-fundamentos-que-nao-abalam.mp3",
    2340,
    200,
  ),
  track(
    "track-06",
    "Discipulado 2 — Perseverança na tribulação",
    "author-01",
    "series-02",
    "discipulado-02-perseveranca-na-tribulacao.mp3",
    2455,
    193,
  ),
  track(
    "track-07",
    "Discipulado 3 — Comunidade como refúgio",
    "author-01",
    "series-02",
    "discipulado-03-comunidade-como-refugio.mp3",
    2600,
    186,
  ),
  // série-03 — Mulheres da Fé
  track(
    "track-08",
    "Mulheres da Fé 1 — Rute, a fidelidade que permanece",
    "author-02",
    "series-03",
    "mulheres-da-fe-01-rute.mp3",
    2280,
    250,
  ),
  track(
    "track-09",
    "Mulheres da Fé 2 — Ester, coragem no tempo certo",
    "author-02",
    "series-03",
    "mulheres-da-fe-02-ester.mp3",
    2410,
    243,
  ),
  track(
    "track-10",
    "Mulheres da Fé 3 — Ana, perseverança em oração",
    "author-02",
    "series-03",
    "mulheres-da-fe-03-ana.mp3",
    2190,
    236,
  ),
  // Pregações avulsas — Pr. Josué Andrade, sem série
  track(
    "track-11",
    "O chamado transcultural",
    "author-03",
    null,
    "josue-o-chamado-transcultural.mp3",
    3120,
    100,
  ),
  track(
    "track-12",
    "Missão e sacrifício",
    "author-03",
    null,
    "josue-missao-e-sacrificio.mp3",
    2860,
    90,
  ),
];

const tracksByIds = (ids: string[]): Track[] =>
  ids.map((id) => findOrThrow(mockTracks, (t) => t.id === id, `track ${id}`));

// ─── Playlists ────────────────────────────────────────────────────────────────
// Ordem de reprodução do Auto DJ 24/7 (BRAIN §6.4) — `loop: true` reinicia a
// playlist ao terminar a última faixa.

export const mockPlaylists: Playlist[] = [
  {
    id: "playlist-01",
    name: "Série Romanos (sequencial)",
    tracks: tracksByIds(["track-01", "track-02", "track-03", "track-04"]),
    loop: true,
    createdAt: past(400),
    updatedAt: past(30),
  },
  {
    id: "playlist-02",
    name: "Rotação Geral da Rádio",
    tracks: tracksByIds([
      "track-05",
      "track-08",
      "track-11",
      "track-06",
      "track-09",
      "track-12",
      "track-07",
      "track-10",
    ]),
    loop: true,
    createdAt: past(200),
    updatedAt: past(10),
  },
];

// ─── NowPlaying ───────────────────────────────────────────────────────────────
// Estado atual do Auto DJ — faixa iniciada há alguns minutos, dentro da
// duração de `track-09` (BRAIN §6.4).

const nowPlayingTrack = findOrThrow(
  mockTracks,
  (t) => t.id === "track-09",
  "track track-09",
);

export const mockNowPlaying: NowPlaying = {
  trackId: nowPlayingTrack.id,
  trackTitle: nowPlayingTrack.title,
  authorName: nowPlayingTrack.authorName,
  startedAt: minutesAgo(12),
  positionSeconds: 12 * 60,
};

// ─── ExclusiveMaterial ────────────────────────────────────────────────────────

export const mockExclusiveMaterials: ExclusiveMaterial[] = [
  {
    id: "material-01",
    title: "Apostila de Estudo — Romanos: Graça e Vida Nova",
    fileUrl: "radio-materiais/apostila-romanos.pdf",
    requiresTerm: true,
    createdAt: past(390),
    updatedAt: past(390),
  },
  {
    id: "material-02",
    title: "Cartaz de Divulgação da Rádio Hebron",
    fileUrl: "radio-materiais/cartaz-divulgacao.pdf",
    requiresTerm: false,
    createdAt: past(60),
    updatedAt: past(60),
  },
];

// ─── TermAcceptance ───────────────────────────────────────────────────────────
// Aceite único por usuário, cobre todos os materiais exclusivos (BRAIN §6.4).

export const mockTermAcceptances: TermAcceptance[] = [
  {
    id: "term-acceptance-01",
    userId: "user-ouvinte-01",
    acceptedAt: past(15),
  },
  {
    id: "term-acceptance-02",
    userId: "user-ouvinte-02",
    acceptedAt: past(3),
  },
];

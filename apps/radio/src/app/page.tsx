import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Disc3,
  Music,
  Radio,
  Users2,
} from "lucide-react";
import { AuthorCard } from "../components/author-card";
import { CatalogSkeleton } from "../components/catalog-skeleton";
import { PlayerSkeleton } from "../components/player-skeleton";
import {
  mockAuthors,
  mockNowPlaying,
  mockSeries,
  mockTracks,
} from "../lib/mock-data";

export const metadata: Metadata = {
  description:
    "Ouça pregações e séries de ensino da Hebron Aseec, 24 horas por dia — sem cadastro.",
};

interface PageProps {
  searchParams: Promise<{ state?: string }>;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default async function HomePage({ searchParams }: PageProps) {
  const { state } = await searchParams;
  const isLoading = state === "loading";
  const isError = state === "error";
  const isEmpty = state === "empty";

  const nowPlayingTrack = mockTracks.find(
    (t) => t.id === mockNowPlaying.trackId,
  );
  const hasNowPlaying = !isEmpty && Boolean(nowPlayingTrack);
  const progress =
    hasNowPlaying && nowPlayingTrack
      ? Math.min(
          100,
          (mockNowPlaying.positionSeconds / nowPlayingTrack.durationSeconds) *
            100,
        )
      : 0;

  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-(--hb-blue) px-4 py-14 text-(--fg-invert) sm:px-6 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-5">
            <span className="font-(--font-body) text-xs font-(--font-weight-bold) tracking-(--tracking-eyebrow) text-(--hb-cyan) uppercase">
              Rádio Hebron Aseec
            </span>
            <h1 className="font-(--font-display) text-4xl leading-(--lh-tight) font-(--font-weight-bold) tracking-(--tracking-tight) text-balance sm:text-5xl">
              Pregação e ensino da Palavra, dia e noite.
            </h1>
            <p className="text-(--fg-invert-muted) text-base leading-(--leading-relaxed)">
              Sermões e séries de estudo de nossos pastores e conselheiros, em
              rotação contínua. Sem grade fixa, sem cadastro — basta abrir o
              player e ouvir.
            </p>
            <Link
              href="/autores"
              className="inline-flex items-center gap-2 rounded-(--radius) bg-(--hb-orange) px-5 py-2.5 text-sm font-(--font-weight-semibold) text-(--fg-invert) transition-colors duration-(--transition-fast) hover:bg-(--hb-orange-deep)"
            >
              Explorar por autor e série
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {isLoading ? (
            <PlayerSkeleton />
          ) : isError ? (
            <div className="w-full max-w-sm rounded-(--radius-lg) border border-white/10 bg-white/5 p-6">
              <span className="flex items-center gap-2 text-xs font-(--font-weight-semibold) tracking-(--tracking-eyebrow) text-(--hb-cyan) uppercase">
                <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                Tocando agora
              </span>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <AlertTriangle
                    className="h-6 w-6 text-(--hb-orange)"
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-(--font-weight-semibold) text-(--fg-invert)">
                    Não foi possível carregar o áudio.
                  </p>
                  <p className="text-sm text-(--fg-invert-muted)">
                    Tentando novamente...
                  </p>
                </div>
              </div>
            </div>
          ) : hasNowPlaying && nowPlayingTrack ? (
            <div className="w-full max-w-sm rounded-(--radius-lg) border border-white/10 bg-white/5 p-6">
              <span className="flex items-center gap-2 text-xs font-(--font-weight-semibold) tracking-(--tracking-eyebrow) text-(--hb-cyan) uppercase">
                <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                Tocando agora
              </span>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Disc3
                    className="h-6 w-6 text-(--hb-cyan)"
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-(--font-display) text-base font-(--font-weight-semibold) text-(--fg-invert)">
                    {nowPlayingTrack.title}
                  </p>
                  <p className="truncate text-sm text-(--fg-invert-muted)">
                    {nowPlayingTrack.authorName}
                    {nowPlayingTrack.seriesName
                      ? ` · ${nowPlayingTrack.seriesName}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-1 rounded-(--radius-pill) bg-white/15">
                <div
                  className="h-full rounded-(--radius-pill) bg-(--hb-cyan)"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-(--fg-invert-muted)">
                <span>{formatDuration(mockNowPlaying.positionSeconds)}</span>
                <span>{formatDuration(nowPlayingTrack.durationSeconds)}</span>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-sm rounded-(--radius-lg) border border-white/10 bg-white/5 p-6">
              <span className="flex items-center gap-2 text-xs font-(--font-weight-semibold) tracking-(--tracking-eyebrow) text-(--hb-cyan) uppercase">
                <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                Tocando agora
              </span>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Music
                    className="h-6 w-6 text-(--fg-invert-muted)"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-sm text-(--fg-invert-muted)">
                  Nenhuma faixa disponível.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {/* ── Autores em destaque ── */}
        <section aria-labelledby="autores-heading">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="font-(--font-body) text-xs font-(--font-weight-bold) tracking-(--tracking-eyebrow) text-(--brand) uppercase">
                Quem prega na rádio
              </span>
              <h2
                id="autores-heading"
                className="mt-1 font-(--font-display) text-2xl font-(--font-weight-bold) tracking-(--tracking-tight) text-(--fg)"
              >
                Autores
              </h2>
            </div>
            <Link
              href="/autores"
              className="flex items-center gap-1.5 text-sm font-(--font-weight-semibold) text-(--brand) transition-colors duration-(--transition-fast) hover:text-(--hb-blue-soft)"
            >
              Ver catálogo completo
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {isLoading ? (
            <CatalogSkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mockAuthors.map((author) => (
                <AuthorCard
                  key={author.id}
                  author={author}
                  series={mockSeries.filter((s) => s.authorId === author.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Sobre a rádio ── */}
        <section
          aria-labelledby="sobre-heading"
          className="mt-16 border-t border-(--divider) pt-14"
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[auto_1fr]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--brand-muted)">
              <Users2 className="h-6 w-6 text-(--brand)" aria-hidden="true" />
            </div>
            <div className="max-w-2xl space-y-3">
              <h2
                id="sobre-heading"
                className="font-(--font-display) text-xl font-(--font-weight-bold) tracking-(--tracking-tight) text-(--fg)"
              >
                Sobre a rádio
              </h2>
              <p className="text-sm leading-(--leading-relaxed) text-(--fg-muted)">
                A Rádio Hebron Aseec transmite pregações e séries de estudo já
                ministradas em nossa comunidade, organizadas por autor e por
                série, em rotação contínua — sem grade de horários, sem DJs ao
                vivo e sem transmissão em tempo real.
              </p>
              <p className="text-sm leading-(--leading-relaxed) text-(--fg-muted)">
                Ouvir é livre e não exige cadastro. Alguns materiais de apoio às
                séries — apostilas e roteiros de estudo — são exclusivos e
                exigem login e aceite do termo de uso antes do download.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Users2 } from "lucide-react";
import { AuthorCard } from "../components/author-card";
import { CatalogSkeleton } from "../components/catalog-skeleton";
import { NowPlayingCard } from "../components/now-playing-card";
import { getRadioCatalog } from "../lib/queries";

export const metadata: Metadata = {
  description:
    "Ouça pregações e séries de ensino da Hebron Aseec, 24 horas por dia — sem cadastro.",
};

async function AuthorsGrid() {
  const { authors, series } = await getRadioCatalog();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {authors.map((author) => (
        <AuthorCard
          key={author.id}
          author={author}
          series={series.filter((s) => s.authorId === author.id)}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-(--hb-blue) px-4 py-14 text-(--fg-invert) sm:px-6 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-5">
            <span className="font-(family-name:--font-body) text-xs font-(--font-weight-bold) tracking-(--tracking-eyebrow) text-(--hb-cyan) uppercase">
              Rádio Hebron Aseec
            </span>
            <h1 className="font-(family-name:--font-display) text-4xl leading-(--lh-tight) font-(--font-weight-bold) tracking-(--tracking-tight) text-balance sm:text-5xl">
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

          <NowPlayingCard />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {/* ── Autores em destaque ── */}
        <section aria-labelledby="autores-heading">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="font-(family-name:--font-body) text-xs font-(--font-weight-bold) tracking-(--tracking-eyebrow) text-(--brand) uppercase">
                Quem prega na rádio
              </span>
              <h2
                id="autores-heading"
                className="mt-1 font-(family-name:--font-display) text-2xl font-(--font-weight-bold) tracking-(--tracking-tight) text-(--fg)"
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

          <Suspense fallback={<CatalogSkeleton />}>
            <AuthorsGrid />
          </Suspense>
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
                className="font-(family-name:--font-display) text-xl font-(--font-weight-bold) tracking-(--tracking-tight) text-(--fg)"
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

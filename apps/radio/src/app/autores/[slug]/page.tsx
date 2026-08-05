import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, User } from "lucide-react";
import { PlaylistView } from "../../../components/playlist-view";
import { getRadioCatalog } from "../../../lib/queries";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { authors } = await getRadioCatalog();
  const author = authors.find((a) => a.id === slug);
  return { title: author?.name ?? "Autor" };
}

export default async function AutorPage({ params }: PageProps) {
  const { slug } = await params;
  const { authors, series, tracks } = await getRadioCatalog();
  const author = authors.find((a) => a.id === slug);
  if (!author) notFound();

  const authorSeries = series.filter((s) => s.authorId === author.id);
  const avulsas = tracks.filter(
    (t) => t.authorId === author.id && t.seriesId === null,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <nav aria-label="Localização atual" className="mb-6">
        <ol className="flex items-center gap-1.5 text-sm text-(--fg-muted)">
          <li>
            <Link
              href="/autores"
              className="transition-colors duration-(--transition-fast) hover:text-(--fg)"
            >
              Autores
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-(--font-weight-medium) text-(--fg)">
            {author.name}
          </li>
        </ol>
      </nav>

      <header className="flex items-center gap-5 border-b border-(--divider) pb-8">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--brand-muted)">
          {author.photoUrl ? (
            <img
              src={author.photoUrl}
              alt={author.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-9 w-9 text-(--brand)" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-(family-name:--font-display) text-2xl font-(--font-weight-bold) tracking-(--tracking-tight) text-(--fg)">
            {author.name}
          </h1>
          {author.bio && (
            <p className="mt-1.5 text-sm leading-(--leading-relaxed) text-(--fg-muted)">
              {author.bio}
            </p>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-10 pt-8">
        {authorSeries.length > 0 && (
          <section aria-labelledby="series-heading">
            <h2
              id="series-heading"
              className="mb-4 font-(family-name:--font-display) text-lg font-(--font-weight-semibold) text-(--fg)"
            >
              Séries
            </h2>
            <ul className="flex flex-col divide-y divide-(--divider) rounded-(--radius-md) border border-(--border)">
              {authorSeries.map((item) => {
                const trackCount = tracks.filter(
                  (t) => t.seriesId === item.id,
                ).length;
                return (
                  <li key={item.id}>
                    <Link
                      href={`/series/${item.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors duration-(--transition-fast) hover:bg-(--surface-alt)"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-(--font-weight-semibold) text-(--fg)">
                          {item.name}
                        </p>
                        <p className="truncate text-xs text-(--fg-muted)">
                          {trackCount} {trackCount === 1 ? "faixa" : "faixas"}
                        </p>
                      </div>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-(--fg-subtle)"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {avulsas.length > 0 && (
          <PlaylistView name="Pregações avulsas" tracks={avulsas} />
        )}
      </div>
    </div>
  );
}

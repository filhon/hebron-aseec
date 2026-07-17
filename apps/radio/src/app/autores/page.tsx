import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search, Users2 } from "lucide-react";
import { EmptyState, Input, PageHeader } from "@hebron/ui";
import { AuthorCard } from "../../components/author-card";
import { getRadioCatalog } from "../../lib/queries";

export const metadata: Metadata = {
  title: "Autores e séries",
  description:
    "Catálogo de pregadores e séries de ensino da Rádio Hebron Aseec.",
};

interface PageProps {
  searchParams: Promise<{ q?: string; view?: string }>;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

export default async function AutoresPage({ searchParams }: PageProps) {
  const { q = "", view = "autor" } = await searchParams;
  const query = q.trim().toLowerCase();
  const isSeriesView = view === "serie";

  const { authors, series, tracks } = await getRadioCatalog();

  const filteredAuthors = authors.filter((author) =>
    query ? author.name.toLowerCase().includes(query) : true,
  );

  const filteredSeries = series.filter((s) =>
    query
      ? s.name.toLowerCase().includes(query) ||
        s.authorName.toLowerCase().includes(query)
      : true,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Autores e séries"
        description="Explore o catálogo da rádio por quem prega ou pela série de estudo."
      />

      <div className="flex flex-col gap-4 border-b border-(--divider) pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-(--radius) border border-(--border) p-1">
          <Link
            href="/autores"
            className={cn(
              "rounded-(--radius-sm) px-3 py-1.5 text-sm font-(--font-weight-medium) transition-colors duration-(--transition-fast)",
              !isSeriesView
                ? "bg-(--brand) text-(--brand-fg)"
                : "text-(--fg-muted) hover:text-(--fg)",
            )}
          >
            Por autor
          </Link>
          <Link
            href="/autores?view=serie"
            className={cn(
              "rounded-(--radius-sm) px-3 py-1.5 text-sm font-(--font-weight-medium) transition-colors duration-(--transition-fast)",
              isSeriesView
                ? "bg-(--brand) text-(--brand-fg)"
                : "text-(--fg-muted) hover:text-(--fg)",
            )}
          >
            Por série
          </Link>
        </div>

        <form method="GET" className="w-full sm:w-72">
          <input type="hidden" name="view" value={view} />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={
              isSeriesView ? "Buscar série ou autor" : "Buscar autor"
            }
            leftAdornment={<Search className="h-4 w-4" aria-hidden="true" />}
            aria-label="Buscar no catálogo"
          />
        </form>
      </div>

      <div className="pt-8">
        {isSeriesView ? (
          filteredSeries.length > 0 ? (
            <ul className="flex flex-col divide-y divide-(--divider) rounded-(--radius-md) border border-(--border)">
              {filteredSeries.map((s) => {
                const trackCount = tracks.filter(
                  (t) => t.seriesId === s.id,
                ).length;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/series/${s.id}`}
                      className="flex items-center gap-4 px-5 py-4 transition-colors duration-(--transition-fast) hover:bg-(--surface-alt)"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-(--radius) bg-(--brand-muted)">
                        <Users2
                          className="h-4.5 w-4.5 text-(--brand)"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-(--font-display) text-sm font-(--font-weight-semibold) text-(--fg)">
                          {s.name}
                        </p>
                        <p className="truncate text-xs text-(--fg-muted)">
                          {s.authorName} · {trackCount}{" "}
                          {trackCount === 1 ? "faixa" : "faixas"}
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
          ) : (
            <EmptyState
              title="Nenhuma série encontrada"
              description="Tente buscar por outro nome de série ou de autor."
            />
          )
        ) : filteredAuthors.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAuthors.map((author) => (
              <AuthorCard
                key={author.id}
                author={author}
                series={series.filter((s) => s.authorId === author.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhum autor encontrado"
            description="Tente buscar por outro nome."
          />
        )}
      </div>
    </div>
  );
}

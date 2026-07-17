import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaylistView } from "../../../components/playlist-view";
import { mockSeries, mockTracks } from "../../../lib/mock-data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const series = mockSeries.find((s) => s.id === slug);
  return { title: series?.name ?? "Série" };
}

export default async function SeriePage({ params }: PageProps) {
  const { slug } = await params;
  const series = mockSeries.find((s) => s.id === slug);
  if (!series) notFound();

  const tracks = mockTracks.filter((t) => t.seriesId === series.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <nav aria-label="Localização atual" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-(--fg-muted)">
          <li>
            <Link
              href="/autores"
              className="transition-colors duration-(--transition-fast) hover:text-(--fg)"
            >
              Autores
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/autores/${series.authorId}`}
              className="transition-colors duration-(--transition-fast) hover:text-(--fg)"
            >
              {series.authorName}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-(--font-weight-medium) text-(--fg)">
            {series.name}
          </li>
        </ol>
      </nav>

      <header className="border-b border-(--divider) pb-8">
        <h1 className="font-(--font-display) text-2xl font-(--font-weight-bold) tracking-(--tracking-tight) text-(--fg)">
          {series.name}
        </h1>
        <p className="mt-1 text-sm text-(--fg-muted)">{series.authorName}</p>
        {series.description && (
          <p className="mt-3 max-w-2xl text-sm leading-(--leading-relaxed) text-(--fg-muted)">
            {series.description}
          </p>
        )}
      </header>

      <div className="pt-8">
        <PlaylistView name={`${tracks.length} faixas`} tracks={tracks} />
      </div>
    </div>
  );
}

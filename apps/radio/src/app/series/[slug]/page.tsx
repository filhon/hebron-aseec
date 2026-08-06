import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaylistView } from "../../../components/playlist-view";
import { getRadioCatalog } from "../../../lib/queries";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { series } = await getRadioCatalog();
  const item = series.find((s) => s.id === slug);
  return { title: item?.name ?? "Série" };
}

export default async function SeriePage({ params }: PageProps) {
  const { slug } = await params;
  const { series, tracks } = await getRadioCatalog();
  const item = series.find((s) => s.id === slug);
  if (!item) notFound();

  const seriesTracks = tracks.filter((t) => t.seriesId === item.id);

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
              href={`/autores/${item.authorId}`}
              className="transition-colors duration-(--transition-fast) hover:text-(--fg)"
            >
              {item.authorName}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-(--fg)">{item.name}</li>
        </ol>
      </nav>

      <header className="border-b border-(--divider) pb-8">
        <h1 className="font-(family-name:--font-display) text-2xl font-bold tracking-tight text-(--fg)">
          {item.name}
        </h1>
        <p className="mt-1 text-sm text-(--fg-muted)">{item.authorName}</p>
        {item.description && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-(--fg-muted)">
            {item.description}
          </p>
        )}
      </header>

      <div className="pt-8">
        <PlaylistView
          name={`${seriesTracks.length} faixas`}
          tracks={seriesTracks}
        />
      </div>
    </div>
  );
}

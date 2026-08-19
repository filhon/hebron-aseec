import { PageHeader } from "@hebron/ui";
import { SeriesTable } from "../../../components/series-table";
import {
  requireInstrutorSession,
  getSeriesWithStats,
} from "../../../lib/queries";

export default async function SeriesInstrutorPage() {
  const session = await requireInstrutorSession();

  const series = await getSeriesWithStats(session.actorId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <PageHeader
        title="Séries"
        description="Séries cadastradas aqui aparecem no filtro de coleções do catálogo."
      />

      <SeriesTable series={series} />
    </div>
  );
}

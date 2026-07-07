import { PageHeader } from "@hebron/ui";
import { KanbanSkeleton } from "../../../../components/kanban-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Carregando módulo…" />
      <KanbanSkeleton />
    </div>
  );
}

import { PageHeader } from "@hebron/ui";
import { CalendarSkeleton } from "../../../components/calendar-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Calendário"
        description="Prazos de tarefas organizados por data."
      />
      <CalendarSkeleton />
    </div>
  );
}

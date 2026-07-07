import { PageHeader } from "@hebron/ui";
import { TaskListSkeleton } from "../../components/task-list-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Minhas tarefas"
        description="Lista priorizada por urgência — do que precisa de atenção agora ao que pode esperar."
      />
      <TaskListSkeleton />
    </div>
  );
}

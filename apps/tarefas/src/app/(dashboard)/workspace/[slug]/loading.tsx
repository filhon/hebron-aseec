"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@hebron/ui";
import { KanbanSkeleton } from "../../../../components/kanban-skeleton";
import {
  TaskListSkeleton,
  TreeViewSkeleton,
} from "../../../../components/task-list-skeleton";

function ViewSkeleton() {
  const view = useSearchParams().get("view");
  if (view === "lista") return <TaskListSkeleton />;
  if (view === "arvore") return <TreeViewSkeleton />;
  return <KanbanSkeleton />;
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Carregando módulo…" />
      <Suspense fallback={<KanbanSkeleton />}>
        <ViewSkeleton />
      </Suspense>
    </div>
  );
}

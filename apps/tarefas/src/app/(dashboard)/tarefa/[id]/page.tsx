import { notFound } from "next/navigation";
import { mockTasks } from "../../../../lib/mock-data";
import { TaskDetailClient } from "./task-detail-client";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = mockTasks.find((t) => t.id === id);
  if (!task) notFound();

  return <TaskDetailClient initialTask={task} />;
}

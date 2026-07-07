import { notFound } from "next/navigation";
import type { Workspace } from "@hebron/types/tarefas";
import { mockTasks } from "../../../../lib/mock-data";
import { WorkspaceBoardClient } from "./board-client";

const WORKSPACES: Workspace[] = [
  "administrativo",
  "financeiro",
  "contabil_fiscal",
  "eclesiastico",
  "comunicacao",
  "tecnologia_inovacao",
];

export default async function WorkspaceBoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!WORKSPACES.includes(slug as Workspace)) {
    notFound();
  }
  const workspace = slug as Workspace;
  const initialTasks = mockTasks.filter((t) => t.workspace === workspace);

  return (
    <WorkspaceBoardClient workspace={workspace} initialTasks={initialTasks} />
  );
}

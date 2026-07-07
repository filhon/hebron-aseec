import { notFound } from "next/navigation";
import type { Workspace } from "@hebron/types/tarefas";
import {
  getAssignableUsers,
  getTags,
  getTasksByWorkspace,
} from "../../../../lib/queries";
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

  const [tasks, assignableUsers, tags] = await Promise.all([
    getTasksByWorkspace(workspace),
    getAssignableUsers(),
    getTags(),
  ]);

  return (
    <WorkspaceBoardClient
      workspace={workspace}
      tasks={tasks}
      assignableUsers={assignableUsers}
      tags={tags}
    />
  );
}

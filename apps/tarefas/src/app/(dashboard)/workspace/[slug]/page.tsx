import { notFound } from "next/navigation";
import type { Workspace } from "@hebron/types/tarefas";
import {
  getAssignableUsers,
  getTags,
  getTasksByWorkspace,
} from "../../../../lib/queries";
import { WorkspaceBoardClient, type BoardView } from "./board-client";

const WORKSPACES: Workspace[] = [
  "administrativo",
  "financeiro",
  "contabil_fiscal",
  "eclesiastico",
  "comunicacao",
  "tecnologia_inovacao",
];

function parseBoardView(raw: string | undefined): BoardView {
  return raw === "lista" || raw === "arvore" ? raw : "kanban";
}

export default async function WorkspaceBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { slug } = await params;
  const { view } = await searchParams;

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
      initialView={parseBoardView(view)}
    />
  );
}

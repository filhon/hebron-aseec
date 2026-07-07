"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Task, TaskStatus, Workspace } from "@hebron/types/tarefas";
import { PageHeader } from "@hebron/ui";
import { GitBranch, LayoutGrid, Rows3 } from "lucide-react";
import { KanbanBoard } from "../../../../components/kanban-board";
import { TaskList } from "../../../../components/task-list";
import { TreeView } from "../../../../components/tree-view";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

const WORKSPACE_LABEL: Record<Workspace, string> = {
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  contabil_fiscal: "Contábil e Fiscal",
  eclesiastico: "Eclesiástico",
  comunicacao: "Comunicação",
  tecnologia_inovacao: "Tecnologia e Inovação",
};

type BoardView = "kanban" | "lista" | "arvore";

const VIEW_CFG: Record<BoardView, { label: string; icon: typeof LayoutGrid }> =
  {
    kanban: { label: "Kanban", icon: LayoutGrid },
    lista: { label: "Lista", icon: Rows3 },
    arvore: { label: "Árvore", icon: GitBranch },
  };

export interface WorkspaceBoardClientProps {
  workspace: Workspace;
  initialTasks: Task[];
}

export function WorkspaceBoardClient({
  workspace,
  initialTasks,
}: WorkspaceBoardClientProps) {
  const router = useRouter();
  const [view, setView] = useState<BoardView>("kanban");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const openCount = useMemo(
    () => tasks.filter((t) => t.status !== "concluido").length,
    [tasks],
  );

  function handleMove(taskId: string, targetStatus: TaskStatus) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t)),
    );
  }

  function goToTask(id: string) {
    router.push(`/tarefa/${id}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title={WORKSPACE_LABEL[workspace]}
        description={`${openCount} tarefa${openCount === 1 ? "" : "s"} em aberto neste módulo.`}
        actions={
          <div className="flex items-center gap-1 rounded-full border border-(--border) bg-(--surface-alt) p-1">
            {(Object.keys(VIEW_CFG) as BoardView[]).map((key) => {
              const cfg = VIEW_CFG[key];
              const Icon = cfg.icon;
              const active = view === key;
              return (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-(--surface) text-(--hb-blue) shadow-(--shadow-xs)"
                      : "text-(--fg-muted) hover:text-(--fg)",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        }
      />

      {view === "kanban" && (
        <KanbanBoard tasks={tasks} onMove={handleMove} onCardClick={goToTask} />
      )}
      {view === "lista" && <TaskList tasks={tasks} onTaskClick={goToTask} />}
      {view === "arvore" && <TreeView tasks={tasks} onTaskClick={goToTask} />}
    </div>
  );
}

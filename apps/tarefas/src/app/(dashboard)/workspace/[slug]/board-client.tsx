"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import type { Tag, Task, TaskStatus, Workspace } from "@hebron/types/tarefas";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  PageHeader,
} from "@hebron/ui";
import { GitBranch, LayoutGrid, ListTodo, Plus, Rows3, X } from "lucide-react";
import type { CreateTaskInput } from "@hebron/validators/tarefas";
import { createTask, updateTaskStatus } from "../../../../actions/tasks";
import type { Person } from "../../../../lib/queries";
import { KanbanBoard } from "../../../../components/kanban-board";
import { TaskList } from "../../../../components/task-list";
import { TreeView } from "../../../../components/tree-view";
import {
  TaskForm,
  uploadTaskAttachments,
} from "../../../../components/task-form";

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

export type BoardView = "kanban" | "lista" | "arvore";

const VIEW_CFG: Record<BoardView, { label: string; icon: typeof LayoutGrid }> =
  {
    kanban: { label: "Kanban", icon: LayoutGrid },
    lista: { label: "Lista", icon: Rows3 },
    arvore: { label: "Árvore", icon: GitBranch },
  };

export interface WorkspaceBoardClientProps {
  workspace: Workspace;
  tasks: Task[];
  assignableUsers: Person[];
  tags: Tag[];
  initialView: BoardView;
}

export function WorkspaceBoardClient({
  workspace,
  tasks,
  assignableUsers,
  tags,
  initialView,
}: WorkspaceBoardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState<BoardView>(initialView);
  const [creating, setCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);

  const openCount = useMemo(
    () => tasks.filter((t) => t.status !== "concluido").length,
    [tasks],
  );

  const { execute: moveTask } = useAction(updateTaskStatus, {
    onSuccess() {
      router.refresh();
    },
  });

  const { executeAsync: createTaskAsync } = useAction(createTask);

  async function handleCreate(values: CreateTaskInput, attachments: File[]) {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const result = await createTaskAsync(values);
      const task = result?.data?.task;
      if (!task) {
        setFormError(result?.serverError ?? "Não foi possível criar a tarefa.");
        return;
      }
      const failures =
        attachments.length > 0
          ? await uploadTaskAttachments(task.id, attachments)
          : [];
      setCreating(false);
      setAttachmentNotice(
        failures.length > 0
          ? `Tarefa criada, mas ${failures.length} anexo(s) não foram enviados: ${failures
              .map((f) => f.fileName)
              .join(", ")}.`
          : null,
      );
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDialogChange(open: boolean) {
    setCreating(open);
    if (!open) setFormError(null);
  }

  function handleMove(taskId: string, targetStatus: TaskStatus) {
    moveTask({ taskId, status: targetStatus });
  }

  function goToTask(id: string) {
    router.push(`/tarefa/${id}`);
  }

  function handleViewChange(next: BoardView) {
    setView(next);
    router.replace(`${pathname}?view=${next}`, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title={WORKSPACE_LABEL[workspace]}
        description={`${openCount} tarefa${openCount === 1 ? "" : "s"} em aberto neste módulo.`}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-(--border) bg-(--surface-alt) p-1">
              {(Object.keys(VIEW_CFG) as BoardView[]).map((key) => {
                const cfg = VIEW_CFG[key];
                const Icon = cfg.icon;
                const active = view === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleViewChange(key)}
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
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Criar tarefa
            </Button>
          </div>
        }
      />

      {attachmentNotice && (
        <div
          role="status"
          className="mb-5 flex items-start justify-between gap-3 rounded-md border border-(--hb-orange) bg-(--hb-orange-muted) px-4 py-3 text-sm text-(--hb-orange-deep)"
        >
          <span className="min-w-0">{attachmentNotice}</span>
          <button
            type="button"
            onClick={() => setAttachmentNotice(null)}
            aria-label="Dispensar aviso"
            className="shrink-0 text-(--hb-orange-deep)/70 hover:text-(--hb-orange-deep)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Nenhuma tarefa neste módulo"
          description="Assim que uma tarefa for criada, ela aparece aqui."
          quote={{
            text: "Confia ao Senhor as tuas obras, e os teus planos serão estabelecidos.",
            reference: "Provérbios 16:3",
          }}
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Criar tarefa
            </Button>
          }
        />
      ) : (
        <>
          {view === "kanban" && (
            <KanbanBoard
              tasks={tasks}
              onMove={handleMove}
              onCardClick={goToTask}
            />
          )}
          {view === "lista" && (
            <TaskList tasks={tasks} onTaskClick={goToTask} />
          )}
          {view === "arvore" && (
            <TreeView tasks={tasks} onTaskClick={goToTask} />
          )}
        </>
      )}

      <Dialog open={creating} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <TaskForm
            initialValues={{ workspace }}
            assignableUsers={assignableUsers}
            availableTags={tags}
            onSubmit={handleCreate}
            onCancel={() => handleDialogChange(false)}
            isLoading={isSubmitting}
            submitError={formError}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

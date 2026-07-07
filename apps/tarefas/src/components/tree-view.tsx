"use client";

import { useMemo, useState } from "react";
import type { Task, TaskPriority } from "@hebron/types/tarefas";
import { EmptyState } from "@hebron/ui";
import { ChevronRight, GitBranch, UserRound, UserX } from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  baixa: "bg-(--fg-subtle)",
  media: "bg-(--hb-cyan)",
  alta: "bg-(--hb-orange)",
  urgente: "bg-(--color-destructive)",
};

// Paleta de cores de branch (estilo Xmind) — cicla por pessoa para distinguir
// visualmente cada ramo sem depender de dado externo de cor por usuário.
const BRANCH_PALETTE = [
  { fg: "text-(--hb-blue)", bg: "bg-(--brand-muted)", dot: "bg-(--hb-blue)" },
  {
    fg: "text-(--hb-cyan-deep)",
    bg: "bg-(--hb-cyan-muted)",
    dot: "bg-(--hb-cyan)",
  },
  {
    fg: "text-(--hb-green-deep)",
    bg: "bg-(--hb-green-muted)",
    dot: "bg-(--hb-green)",
  },
  {
    fg: "text-(--hb-orange-deep)",
    bg: "bg-(--hb-orange-muted)",
    dot: "bg-(--hb-orange)",
  },
  {
    fg: "text-(--hb-purple)",
    bg: "bg-(--surface-alt)",
    dot: "bg-(--hb-purple)",
  },
  { fg: "text-(--hb-teal)", bg: "bg-(--surface-alt)", dot: "bg-(--hb-teal)" },
];

const DEFAULT_BRANCH_PALETTE = {
  fg: "text-(--hb-blue)",
  bg: "bg-(--brand-muted)",
  dot: "bg-(--hb-blue)",
};

interface PersonBranch {
  id: string;
  name: string;
  tasks: Task[];
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function TaskLeaf({ task, onClick }: { task: Task; onClick?: () => void }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "flex items-center gap-2 rounded-(--radius-sm) border border-(--border) bg-(--surface) px-3 py-2 transition-colors",
        onClick &&
          "cursor-pointer hover:border-(--hb-blue) hover:bg-(--surface-alt)",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          PRIORITY_DOT[task.priority],
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-(--fg)">
        {task.title}
      </span>
      {task.dueDate && (
        <span className="shrink-0 text-[10px] tabular-nums text-(--fg-muted)">
          {fmtDate(task.dueDate)}
        </span>
      )}
    </div>
  );
}

function PersonNode({
  branch,
  paletteIdx,
  expanded,
  onToggle,
  onTaskClick,
}: {
  branch: PersonBranch;
  paletteIdx: number;
  expanded: boolean;
  onToggle: () => void;
  onTaskClick?: (id: string) => void;
}) {
  const palette =
    BRANCH_PALETTE[paletteIdx % BRANCH_PALETTE.length] ??
    DEFAULT_BRANCH_PALETTE;

  return (
    <div className="relative pl-6">
      {/* Conector horizontal até o nó da pessoa */}
      <span
        className="absolute left-0 top-5 h-px w-6 bg-(--border)"
        aria-hidden="true"
      />
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 transition-colors",
          palette.bg,
        )}
      >
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-(--fg-invert)",
            palette.dot,
          )}
        >
          <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className={cn("text-sm font-bold", palette.fg)}>
          {branch.name}
        </span>
        <span className={cn("text-xs font-semibold tabular-nums", palette.fg)}>
          ({branch.tasks.length})
        </span>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform",
            palette.fg,
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded && (
        <div className="relative ml-3 mt-2 flex flex-col gap-1.5 border-l-2 border-(--border) py-1 pl-6">
          {branch.tasks.map((task) => (
            <TaskLeaf
              key={task.id}
              task={task}
              onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface TreeViewProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  className?: string;
}

export function TreeView({ tasks, onTaskClick, className }: TreeViewProps) {
  const { people, unassigned } = useMemo(() => {
    const map = new Map<string, PersonBranch>();
    const noOwner: Task[] = [];

    for (const task of tasks) {
      if (task.assignees.length === 0) {
        noOwner.push(task);
        continue;
      }
      for (const a of task.assignees) {
        const entry = map.get(a.userId) ?? {
          id: a.userId,
          name: a.userName,
          tasks: [],
        };
        entry.tasks.push(task);
        map.set(a.userId, entry);
      }
    }

    return {
      people: [...map.values()].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      ),
      unassigned: noOwner,
    };
  }, [tasks]);

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([...people.map((p) => p.id), "__unassigned__"]),
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="Nenhuma tarefa para organizar"
        description="A árvore de despacho aparece assim que houver tarefas atribuídas."
      />
    );
  }

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-(--radius) border border-(--border) bg-(--surface) p-5",
        className,
      )}
      role="tree"
      aria-label="Árvore de tarefas por responsável"
    >
      <div className="flex min-w-max items-start gap-6">
        {/* Nó raiz */}
        <div className="hb-balao flex shrink-0 items-center gap-2 self-start px-4 py-2.5">
          <GitBranch className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-bold">Equipe</span>
        </div>

        <div className="flex flex-col gap-3 pt-1">
          {unassigned.length > 0 && (
            <div className="relative pl-6">
              <span
                className="absolute left-0 top-5 h-px w-6 bg-(--border)"
                aria-hidden="true"
              />
              <button
                onClick={() => toggle("__unassigned__")}
                className="flex items-center gap-2 rounded-full bg-(--color-destructive-muted) py-1.5 pl-1.5 pr-3.5 transition-colors"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-(--color-destructive) text-(--fg-invert)">
                  <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-sm font-bold text-(--color-destructive)">
                  A atribuir
                </span>
                <span className="text-xs font-semibold tabular-nums text-(--color-destructive)">
                  ({unassigned.length})
                </span>
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-(--color-destructive) transition-transform",
                    expanded.has("__unassigned__") && "rotate-90",
                  )}
                />
              </button>
              {expanded.has("__unassigned__") && (
                <div className="relative ml-3 mt-2 flex flex-col gap-1.5 border-l-2 border-(--border) py-1 pl-6">
                  {unassigned.map((task) => (
                    <TaskLeaf
                      key={task.id}
                      task={task}
                      onClick={
                        onTaskClick ? () => onTaskClick(task.id) : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {people.map((branch, idx) => (
            <PersonNode
              key={branch.id}
              branch={branch}
              paletteIdx={idx}
              expanded={expanded.has(branch.id)}
              onToggle={() => toggle(branch.id)}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

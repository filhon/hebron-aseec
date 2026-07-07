"use client";

import { useMemo, useState } from "react";
import type {
  Task,
  TaskPriority,
  TaskStatus,
  Workspace,
} from "@hebron/types/tarefas";
import { Avatar, EmptyState } from "@hebron/ui";
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListTodo,
} from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

const PAGE_SIZE = 15;

const WORKSPACE_LABEL: Record<Workspace, string> = {
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  contabil_fiscal: "Contábil e Fiscal",
  eclesiastico: "Eclesiástico",
  comunicacao: "Comunicação",
  tecnologia_inovacao: "Tecnologia e Inovação",
};

const STATUS_CFG: Record<
  TaskStatus,
  { label: string; fg: string; bg: string }
> = {
  a_fazer: {
    label: "A Fazer",
    fg: "text-(--fg-muted)",
    bg: "bg-(--surface-alt)",
  },
  em_progresso: {
    label: "Em Progresso",
    fg: "text-(--hb-blue)",
    bg: "bg-(--brand-muted)",
  },
  em_revisao: {
    label: "Em Revisão",
    fg: "text-(--hb-orange-deep)",
    bg: "bg-(--hb-orange-muted)",
  },
  concluido: {
    label: "Concluído",
    fg: "text-(--hb-green-deep)",
    bg: "bg-(--hb-green-muted)",
  },
};

const PRIORITY_CFG: Record<
  TaskPriority,
  { label: string; fg: string; bg: string }
> = {
  baixa: { label: "Baixa", fg: "text-(--fg-muted)", bg: "bg-(--surface-alt)" },
  media: {
    label: "Média",
    fg: "text-(--hb-cyan-deep)",
    bg: "bg-(--hb-cyan-muted)",
  },
  alta: {
    label: "Alta",
    fg: "text-(--hb-orange-deep)",
    bg: "bg-(--hb-orange-muted)",
  },
  urgente: {
    label: "Urgente",
    fg: "text-(--color-destructive)",
    bg: "bg-(--color-destructive-muted)",
  },
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

type SortKey = "dueDate" | "priority" | "title";
type SortDir = "asc" | "desc";

export interface TaskListProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  className?: string;
}

export function TaskList({ tasks, onTaskClick, className }: TaskListProps) {
  const [search, setSearch] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState<"all" | Workspace>(
    "all",
  );
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "dueDate",
    dir: "asc",
  });

  const filtered = useMemo(() => {
    let rows = [...tasks];

    if (workspaceFilter !== "all") {
      rows = rows.filter((t) => t.workspace === workspaceFilter);
    }
    if (priorityFilter !== "all") {
      rows = rows.filter((t) => t.priority === priorityFilter);
    }
    if (statusFilter !== "all") {
      rows = rows.filter((t) => t.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((t) => t.title.toLowerCase().includes(q));
    }

    rows.sort((a, b) => {
      let cmp = 0;
      if (sort.key === "dueDate") {
        const at = a.dueDate?.getTime() ?? Infinity;
        const bt = b.dueDate?.getTime() ?? Infinity;
        cmp = at - bt;
      } else if (sort.key === "priority") {
        cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      } else {
        cmp = a.title.localeCompare(b.title, "pt-BR");
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [tasks, workspaceFilter, priorityFilter, statusFilter, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
    setPage(1);
  }

  const SortIndicator = ({ k }: { k: SortKey }) =>
    sort.key === k ? (
      sort.dir === "asc" ? (
        <ChevronUp className="h-3 w-3" />
      ) : (
        <ChevronDown className="h-3 w-3" />
      )
    ) : null;

  const hasActiveFilters =
    workspaceFilter !== "all" ||
    priorityFilter !== "all" ||
    statusFilter !== "all";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-(--radius) border border-(--border) bg-(--surface)",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-(--border) px-4 py-3">
        <label className="flex min-w-0 max-w-xs flex-1 items-center gap-2 rounded-full border border-(--border) bg-(--bg-alt) px-3 py-1.5 transition-colors focus-within:border-(--border-strong) focus-within:bg-(--bg)">
          <Search className="h-3.5 w-3.5 shrink-0 text-(--fg-muted)" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-(--fg-muted)"
            placeholder="Buscar tarefas…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="shrink-0 text-(--fg-muted) transition-colors hover:text-(--fg)"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </label>

        <select
          className="rounded-lg border border-(--border) bg-(--bg) px-2.5 py-1.5 text-xs text-(--fg) outline-none transition-colors focus:border-(--hb-blue)"
          value={workspaceFilter}
          onChange={(e) => {
            setWorkspaceFilter(e.target.value as "all" | Workspace);
            setPage(1);
          }}
        >
          <option value="all">Todos os módulos</option>
          {(Object.keys(WORKSPACE_LABEL) as Workspace[]).map((w) => (
            <option key={w} value={w}>
              {WORKSPACE_LABEL[w]}
            </option>
          ))}
        </select>

        <select
          className="rounded-lg border border-(--border) bg-(--bg) px-2.5 py-1.5 text-xs text-(--fg) outline-none transition-colors focus:border-(--hb-blue)"
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value as "all" | TaskPriority);
            setPage(1);
          }}
        >
          <option value="all">Toda prioridade</option>
          {(Object.keys(PRIORITY_CFG) as TaskPriority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_CFG[p].label}
            </option>
          ))}
        </select>

        <select
          className="rounded-lg border border-(--border) bg-(--bg) px-2.5 py-1.5 text-xs text-(--fg) outline-none transition-colors focus:border-(--hb-blue)"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "all" | TaskStatus);
            setPage(1);
          }}
        >
          <option value="all">Todo status</option>
          {(Object.keys(STATUS_CFG) as TaskStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_CFG[s].label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => {
              setWorkspaceFilter("all");
              setPriorityFilter("all");
              setStatusFilter("all");
              setPage(1);
            }}
            className="text-xs font-semibold text-(--hb-orange-deep) hover:underline"
          >
            Limpar filtros
          </button>
        )}

        <span className="ml-auto text-xs text-(--fg-muted)">
          {filtered.length} tarefa{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Nenhuma tarefa encontrada"
          description="Ajuste a busca ou os filtros para ver outras tarefas."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm"
              style={{ borderCollapse: "separate", borderSpacing: 0 }}
            >
              <thead>
                <tr>
                  {[
                    { label: "Tarefa", key: "title" as SortKey, w: "" },
                    { label: "Módulo", key: null, w: "w-44" },
                    { label: "Responsáveis", key: null, w: "w-32" },
                    {
                      label: "Prioridade",
                      key: "priority" as SortKey,
                      w: "w-28",
                    },
                    { label: "Prazo", key: "dueDate" as SortKey, w: "w-24" },
                    { label: "Status", key: null, w: "w-32" },
                  ].map(({ label, key, w }) => (
                    <th
                      key={label}
                      onClick={() => key && toggleSort(key)}
                      className={cn(
                        "sticky top-0 z-10 border-b border-(--border) bg-(--bg) px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)",
                        key && "cursor-pointer select-none hover:text-(--fg)",
                        w,
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {key && <SortIndicator k={key} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((task) => {
                  const statusCfg = STATUS_CFG[task.status];
                  const priorityCfg = PRIORITY_CFG[task.priority];
                  const overdue =
                    task.dueDate &&
                    task.status !== "concluido" &&
                    task.dueDate.getTime() < Date.now();

                  return (
                    <tr
                      key={task.id}
                      role={onTaskClick ? "button" : undefined}
                      tabIndex={onTaskClick ? 0 : undefined}
                      onClick={() => onTaskClick?.(task.id)}
                      className={cn(
                        "transition-colors",
                        onTaskClick &&
                          "cursor-pointer hover:bg-(--surface-alt)",
                      )}
                    >
                      <td className="border-b border-(--divider) px-3 py-3">
                        <p className="font-semibold leading-tight text-(--fg)">
                          {task.title}
                        </p>
                        {task.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {task.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded-full bg-(--surface-alt) px-1.5 py-0.5 text-[10px] font-medium text-(--fg-muted)"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="border-b border-(--divider) px-3 py-3 text-xs text-(--fg-muted)">
                        {WORKSPACE_LABEL[task.workspace]}
                      </td>
                      <td className="border-b border-(--divider) px-3 py-3">
                        {task.assignees.length > 0 ? (
                          <div className="flex -space-x-1.5">
                            {task.assignees.slice(0, 3).map((a) => (
                              <Avatar
                                key={a.userId}
                                name={a.userName}
                                size="sm"
                                className="h-6 w-6 text-[10px] ring-2 ring-(--surface)"
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-(--fg-subtle)">—</span>
                        )}
                      </td>
                      <td className="border-b border-(--divider) px-3 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            priorityCfg.bg,
                            priorityCfg.fg,
                          )}
                        >
                          {priorityCfg.label}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "border-b border-(--divider) px-3 py-3 text-xs tabular-nums whitespace-nowrap",
                          overdue
                            ? "font-semibold text-(--color-destructive)"
                            : "text-(--fg-muted)",
                        )}
                      >
                        {task.dueDate ? fmtDate(task.dueDate) : "—"}
                      </td>
                      <td className="border-b border-(--divider) px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                            statusCfg.bg,
                            statusCfg.fg,
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-(--border) px-4 py-3 text-xs text-(--fg-muted)">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} de{" "}
                {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-(--border) transition-colors hover:bg-(--surface-alt) disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from(
                  { length: Math.min(totalPages, 7) },
                  (_, i) => i + 1,
                ).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition-colors",
                      page === p
                        ? "bg-(--hb-blue) text-(--fg-invert)"
                        : "border border-(--border) hover:bg-(--surface-alt)",
                    )}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-(--border) transition-colors hover:bg-(--surface-alt) disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

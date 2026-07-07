"use client";

import { useEffect, useRef, useState } from "react";
import type { Task, TaskStatus } from "@hebron/types/tarefas";
import { EmptyState } from "@hebron/ui";
import { LayoutGrid } from "lucide-react";
import { TaskCard } from "./task-card";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

// 4 status fixos (BRAIN §6.9) — colunas do Kanban não são customizáveis.
const COLUMNS: TaskStatus[] = [
  "a_fazer",
  "em_progresso",
  "em_revisao",
  "concluido",
];

const COLUMN_CFG: Record<
  TaskStatus,
  { label: string; color: string; bg: string }
> = {
  a_fazer: {
    label: "A Fazer",
    color: "var(--hb-gray-400)",
    bg: "var(--surface-alt)",
  },
  em_progresso: {
    label: "Em Progresso",
    color: "var(--hb-blue)",
    bg: "var(--brand-muted)",
  },
  em_revisao: {
    label: "Em Revisão",
    color: "var(--hb-orange-deep)",
    bg: "var(--hb-orange-muted)",
  },
  concluido: {
    label: "Concluído",
    color: "var(--hb-green-deep)",
    bg: "var(--hb-green-muted)",
  },
};

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  draggedId: string | null;
  isDragTarget: boolean;
  onCardClick?: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (status: TaskStatus) => void;
  onDragOver: (status: TaskStatus) => void;
}

function KanbanColumn({
  status,
  tasks,
  draggedId,
  isDragTarget,
  onCardClick,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
}: KanbanColumnProps) {
  const cfg = COLUMN_CFG[status];

  return (
    <div
      className={cn(
        "flex min-w-70 max-w-80 flex-1 flex-col rounded-(--radius-md) border-2 transition-all duration-(--dur-fast)",
        isDragTarget ? "border-dashed" : "border-transparent",
      )}
      style={{
        borderColor: isDragTarget ? cfg.color : "transparent",
        backgroundColor: isDragTarget ? cfg.bg : "var(--surface-alt)",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(status);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(status);
      }}
    >
      <div
        className="flex items-center justify-between gap-2 rounded-t-[calc(var(--radius-md)-2px)] px-3.5 py-3"
        style={{ backgroundColor: cfg.bg }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: cfg.color }}
            aria-hidden="true"
          />
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-(--fg-invert)"
          style={{ backgroundColor: cfg.color }}
        >
          {tasks.length}
        </span>
      </div>

      <div className="flex max-h-[calc(100vh-20rem)] min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2.5">
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-6">
            <p className="text-center text-xs text-(--fg-muted)">
              Arraste tarefas aqui
            </p>
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            draggable
            isDragging={draggedId === task.id}
            onClick={onCardClick ? () => onCardClick(task.id) : undefined}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", task.id);
              e.dataTransfer.effectAllowed = "move";
              onDragStart(task.id);
            }}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

export interface KanbanBoardProps {
  tasks: Task[];
  onMove?: (taskId: string, targetStatus: TaskStatus) => void;
  onCardClick?: (taskId: string) => void;
  className?: string;
}

export function KanbanBoard({
  tasks,
  onMove,
  onCardClick,
  className,
}: KanbanBoardProps) {
  // Posições com override otimista local, ressincronizadas quando `tasks` muda
  // (ex.: após confirmação server-side de um `onMove`).
  const [positions, setPositions] = useState<Map<string, TaskStatus>>(() => {
    const m = new Map<string, TaskStatus>();
    for (const t of tasks) m.set(t.id, t.status);
    return m;
  });

  useEffect(() => {
    setPositions(() => {
      const m = new Map<string, TaskStatus>();
      for (const t of tasks) m.set(t.id, t.status);
      return m;
    });
  }, [tasks]);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function tasksFor(status: TaskStatus): Task[] {
    return tasks.filter((t) => (positions.get(t.id) ?? t.status) === status);
  }

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverStatus(null);
    if (dragTimer.current) clearTimeout(dragTimer.current);
  }

  function handleDragOver(status: TaskStatus) {
    setDragOverStatus(status);
    if (dragTimer.current) clearTimeout(dragTimer.current);
    dragTimer.current = setTimeout(() => setDragOverStatus(null), 300);
  }

  function handleDrop(targetStatus: TaskStatus) {
    if (draggedId === null) return;
    setPositions((prev) => {
      const next = new Map(prev);
      next.set(draggedId, targetStatus);
      return next;
    });
    onMove?.(draggedId, targetStatus);
    setDraggedId(null);
    setDragOverStatus(null);
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Nenhuma tarefa por aqui"
        description="Assim que uma tarefa for criada, ela aparecerá no quadro."
      />
    );
  }

  return (
    <div
      className={cn("flex gap-3 overflow-x-auto pb-3", className)}
      style={{ scrollbarWidth: "thin" }}
      role="group"
      aria-label="Quadro de tarefas"
    >
      {COLUMNS.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={tasksFor(status)}
          draggedId={draggedId}
          isDragTarget={dragOverStatus === status && draggedId !== null}
          onCardClick={onCardClick}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        />
      ))}
    </div>
  );
}

"use client";

import type { Task, TaskPriority } from "@hebron/types/tarefas";
import { Avatar } from "@hebron/ui";
import { Clock, Paperclip, MessageSquare, ShieldCheck } from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

const PRIORITY_CFG: Record<
  TaskPriority,
  { label: string; fg: string; bg: string }
> = {
  baixa: {
    label: "Baixa",
    fg: "text-(--fg-muted)",
    bg: "bg-(--surface-alt)",
  },
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

function formatDueDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "concluido") return false;
  return task.dueDate.getTime() < Date.now();
}

export interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  className?: string;
}

export function TaskCard({
  task,
  onClick,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
  className,
}: TaskCardProps) {
  const priorityCfg = PRIORITY_CFG[task.priority];
  const overdue = isOverdue(task);

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      draggable={draggable}
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
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "flex flex-col gap-2.5 rounded-(--radius) border border-(--border) bg-(--surface) p-3.5",
        "shadow-(--shadow-xs) transition-all duration-(--dur-fast)",
        (draggable || onClick) &&
          "cursor-pointer hover:shadow-(--shadow-sm) hover:border-(--hb-blue)",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40 scale-95",
        className,
      )}
    >
      {/* Prioridade + pendência de aprovação */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            priorityCfg.bg,
            priorityCfg.fg,
          )}
        >
          {priorityCfg.label}
        </span>
        {task.approvalRequest?.status === "pendente" && (
          <span
            className="flex items-center gap-1 text-[10px] font-bold uppercase text-(--hb-blue)"
            title="Aguardando aprovação da diretoria"
          >
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            Aprovação
          </span>
        )}
      </div>

      {/* Título */}
      <p className="text-sm font-semibold leading-snug text-(--fg) line-clamp-2">
        {task.title}
      </p>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full bg-(--surface-alt) px-2 py-0.5 text-[10px] font-medium text-(--fg-muted)"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Progresso de subtarefas */}
      {task.subtaskProgress && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--surface-alt)">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-(--dur-med)",
                task.subtaskProgress.done === task.subtaskProgress.total
                  ? "bg-(--hb-green)"
                  : "bg-(--hb-blue)",
              )}
              style={{
                width: `${(task.subtaskProgress.done / task.subtaskProgress.total) * 100}%`,
              }}
            />
          </div>
          <span className="shrink-0 text-[10px] font-medium tabular-nums text-(--fg-muted)">
            {task.subtaskProgress.done}/{task.subtaskProgress.total}
          </span>
        </div>
      )}

      {/* Rodapé: assignees, prazo, indicadores */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex -space-x-1.5">
          {task.assignees.slice(0, 3).map((a) => (
            <Avatar
              key={a.userId}
              name={a.userName}
              size="sm"
              className="h-6 w-6 text-[10px] ring-2 ring-(--surface)"
            />
          ))}
          {task.needsManualAssignment && (
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-(--hb-orange-muted) text-[10px] font-bold text-(--hb-orange-deep) ring-2 ring-(--surface)"
              title="Sem responsável atribuído"
            >
              ?
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-(--fg-muted)">
          {task.comments.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]">
              <MessageSquare className="h-3 w-3" aria-hidden="true" />
              {task.comments.length}
            </span>
          )}
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]">
              <Paperclip className="h-3 w-3" aria-hidden="true" />
              {task.attachments.length}
            </span>
          )}
          {task.dueDate && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[10px] font-semibold",
                overdue ? "text-(--color-destructive)" : "text-(--fg-muted)",
              )}
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatDueDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

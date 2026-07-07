"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  Comment,
  Task,
  TaskPriority,
  TaskStatus,
  TimeEntry,
  Workspace,
} from "@hebron/types/tarefas";
import { Avatar } from "@hebron/ui";
import {
  Check,
  ChevronLeft,
  Clock3,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { mockTasks } from "../../../../lib/mock-data";
import { CommentThread } from "../../../../components/comment-thread";
import { TimeTracker } from "../../../../components/time-tracker";

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

const RECURRENCE_LABEL: Record<string, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
  anual: "Anual",
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fileSizeLabel(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export interface TaskDetailClientProps {
  initialTask: Task;
}

export function TaskDetailClient({ initialTask }: TaskDetailClientProps) {
  const [task, setTask] = useState<Task>(initialTask);

  const directory = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of mockTasks) {
      map.set(t.createdBy, t.createdByName);
      for (const a of t.assignees) map.set(a.userId, a.userName);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, []);

  function toggleSubtask(subtaskId: string) {
    setTask((prev) => {
      const subtasks = prev.subtasks.map((s) =>
        s.id === subtaskId
          ? {
              ...s,
              isDone: !s.isDone,
              completedAt: !s.isDone ? new Date() : null,
            }
          : s,
      );
      const done = subtasks.filter((s) => s.isDone).length;
      return {
        ...prev,
        subtasks,
        subtaskProgress:
          subtasks.length > 0 ? { done, total: subtasks.length } : null,
      };
    });
  }

  function addComment(content: string, mentions: string[]) {
    const newComment: Comment = {
      id: `comment-${task.id}-${Date.now()}`,
      taskId: task.id,
      authorId: "user-current",
      authorName: "Filipe Honório",
      content,
      mentions,
      createdAt: new Date(),
      updatedAt: null,
    };
    setTask((prev) => ({ ...prev, comments: [...prev.comments, newComment] }));
  }

  function handleStartTimer() {
    const entry: TimeEntry = {
      id: `time-${task.id}-${Date.now()}`,
      taskId: task.id,
      userId: "user-current",
      userName: "Filipe Honório",
      startedAt: new Date(),
      endedAt: null,
      durationMinutes: null,
      notes: null,
    };
    setTask((prev) => ({ ...prev, timeEntries: [...prev.timeEntries, entry] }));
  }

  function handleStopTimer(elapsedMinutes: number) {
    setTask((prev) => ({
      ...prev,
      timeEntries: prev.timeEntries.map((e) =>
        e.endedAt === null
          ? { ...e, endedAt: new Date(), durationMinutes: elapsedMinutes }
          : e,
      ),
    }));
  }

  const statusCfg = STATUS_CFG[task.status];
  const priorityCfg = PRIORITY_CFG[task.priority];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href={`/workspace/${task.workspace}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-(--fg-muted) transition-colors hover:text-(--fg)"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {WORKSPACE_LABEL[task.workspace]}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        {/* ── Corpo principal ── */}
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                  priorityCfg.bg,
                  priorityCfg.fg,
                )}
              >
                {priorityCfg.label}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                  statusCfg.bg,
                  statusCfg.fg,
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusCfg.label}
              </span>
              {task.needsManualAssignment && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-(--color-destructive-muted) px-2.5 py-1 text-[10px] font-bold uppercase text-(--color-destructive)">
                  <UserX className="h-3 w-3" aria-hidden="true" />
                  Sem responsável
                </span>
              )}
            </div>
            <h1 className="font-(--font-editorial) text-(--text-2xl) leading-(--leading-tight) text-(--fg)">
              {task.title}
            </h1>
          </div>

          <div className="rounded-(--radius-md) border border-(--border) bg-(--surface) px-5 py-5">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-(--fg-muted)">
              Descrição
            </h2>
            {task.description ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-(--fg)">
                {task.description}
              </p>
            ) : (
              <p className="text-sm text-(--fg-subtle)">
                Nenhuma descrição adicionada.
              </p>
            )}
          </div>

          {task.subtasks.length > 0 && (
            <div className="rounded-(--radius-md) border border-(--border) bg-(--surface) px-5 py-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wide text-(--fg-muted)">
                  Subtarefas
                </h2>
                {task.subtaskProgress && (
                  <span className="text-xs font-semibold tabular-nums text-(--fg-muted)">
                    {task.subtaskProgress.done}/{task.subtaskProgress.total}
                  </span>
                )}
              </div>
              <ul className="flex flex-col gap-1.5">
                {task.subtasks
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-2.5 rounded-(--radius-sm) px-2 py-1.5 transition-colors hover:bg-(--surface-alt)"
                    >
                      <button
                        onClick={() => toggleSubtask(s.id)}
                        aria-label={
                          s.isDone
                            ? "Marcar como pendente"
                            : "Marcar como concluída"
                        }
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          s.isDone
                            ? "border-(--hb-green) bg-(--hb-green) text-(--fg-invert)"
                            : "border-(--border-strong) text-transparent hover:border-(--hb-green) hover:text-(--hb-green)",
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-sm",
                          s.isDone
                            ? "text-(--fg-muted) line-through"
                            : "text-(--fg)",
                        )}
                      >
                        {s.title}
                      </span>
                      {s.assigneeName && (
                        <Avatar
                          name={s.assigneeName}
                          size="sm"
                          className="h-5 w-5 shrink-0 text-[9px]"
                        />
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {task.attachments.length > 0 && (
            <div className="rounded-(--radius-md) border border-(--border) bg-(--surface) px-5 py-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-(--fg-muted)">
                Anexos
              </h2>
              <ul className="flex flex-col gap-2">
                {task.attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2.5 rounded-(--radius-sm) border border-(--border) px-3 py-2"
                  >
                    <Paperclip
                      className="h-3.5 w-3.5 shrink-0 text-(--fg-muted)"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-(--fg)">
                      {a.fileName}
                    </span>
                    <span className="shrink-0 text-xs text-(--fg-muted)">
                      {fileSizeLabel(a.fileSizeBytes)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <TimeTracker
            timeEntries={task.timeEntries}
            onStart={handleStartTimer}
            onStop={handleStopTimer}
          />

          <div className="rounded-(--radius-md) border border-(--border) bg-(--surface) px-5 py-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-(--fg-muted)">
              Comentários
            </h2>
            <CommentThread
              comments={task.comments}
              people={directory}
              currentUserName="Filipe Honório"
              onSubmit={addComment}
            />
          </div>
        </div>

        {/* ── Sidebar de metadados ── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-(--radius-md) border border-(--border) bg-(--surface) px-4 py-4">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-(--fg-muted)">
              Detalhes
            </h2>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-(--fg-muted)">Módulo</dt>
                <dd className="font-medium text-(--fg)">
                  {WORKSPACE_LABEL[task.workspace]}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-(--fg-muted)">Prazo</dt>
                <dd className="font-medium text-(--fg)">
                  {task.dueDate ? fmtDate(task.dueDate) : "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="pt-0.5 text-(--fg-muted)">Responsáveis</dt>
                <dd className="flex flex-col items-end gap-1.5">
                  {task.assignees.length > 0 ? (
                    task.assignees.map((a) => (
                      <span
                        key={a.userId}
                        className="flex items-center gap-1.5 font-medium text-(--fg)"
                      >
                        {a.userName}
                        <Avatar
                          name={a.userName}
                          size="sm"
                          className="h-5 w-5 text-[9px]"
                        />
                      </span>
                    ))
                  ) : (
                    <span className="text-(--fg-subtle)">—</span>
                  )}
                </dd>
              </div>
              {task.tags.length > 0 && (
                <div className="flex items-start justify-between gap-2">
                  <dt className="pt-0.5 text-(--fg-muted)">Tags</dt>
                  <dd className="flex flex-wrap justify-end gap-1">
                    {task.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full bg-(--surface-alt) px-2 py-0.5 text-[10px] font-medium text-(--fg-muted)"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {task.recurrenceRule && (
            <div className="rounded-(--radius-md) border border-(--border) bg-(--surface) px-4 py-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-(--fg-muted)">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Recorrência
              </h2>
              <p className="text-sm text-(--fg)">
                {RECURRENCE_LABEL[task.recurrenceRule.type]}
                {task.recurrenceRule.interval > 1 &&
                  ` (a cada ${task.recurrenceRule.interval})`}
              </p>
            </div>
          )}

          {task.approvalRequest && (
            <div className="rounded-(--radius-md) border border-(--hb-blue) bg-(--brand-muted) px-4 py-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-(--hb-blue)">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Aprovação da diretoria
              </h2>
              <p className="text-sm text-(--fg)">
                Solicitado a {task.approvalRequest.approverName} —{" "}
                <span className="font-semibold">
                  {task.approvalRequest.status === "pendente"
                    ? "Pendente"
                    : task.approvalRequest.status === "aprovado"
                      ? "Aprovado"
                      : "Rejeitado"}
                </span>
              </p>
              {task.approvalRequest.notes && (
                <p className="mt-1.5 text-xs text-(--fg-muted)">
                  {task.approvalRequest.notes}
                </p>
              )}
            </div>
          )}

          {task.sourceModule && (
            <div className="rounded-(--radius-md) border border-(--border) bg-(--surface) px-4 py-4">
              <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-(--fg-muted)">
                Origem
              </h2>
              <p className="text-sm text-(--fg)">
                Gerada automaticamente pelo módulo{" "}
                <span className="font-semibold capitalize">
                  {task.sourceModule}
                </span>
              </p>
            </div>
          )}

          <div className="rounded-(--radius-md) border border-(--border) bg-(--surface) px-4 py-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-(--fg-muted)">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              Atividade
            </h2>
            <ul className="flex flex-col gap-2 text-xs text-(--fg-muted)">
              <li>
                Criada por{" "}
                <span className="font-medium text-(--fg)">
                  {task.createdByName}
                </span>{" "}
                em {fmtDateTime(task.createdAt)}
              </li>
              <li>Última atualização em {fmtDateTime(task.updatedAt)}</li>
              {task.completedAt && (
                <li>Concluída em {fmtDateTime(task.completedAt)}</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

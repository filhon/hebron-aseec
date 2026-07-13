"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import type {
  Tag,
  Task,
  TaskPriority,
  TaskStatus,
  Workspace,
} from "@hebron/types/tarefas";
import type { CreateTaskInput } from "@hebron/validators/tarefas";
import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import {
  Check,
  ChevronLeft,
  Clock3,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  UserX,
  X,
} from "lucide-react";
import {
  createSubtask,
  toggleSubtask,
  updateTask,
  updateTaskStatus,
} from "../../../../actions/tasks";
import { createComment } from "../../../../actions/comments";
import {
  startTimeEntry,
  stopTimeEntry,
} from "../../../../actions/time-tracking";
import {
  requestApproval,
  resolveApprovalRequest,
} from "../../../../actions/approvals";
import type { Person } from "../../../../lib/queries";
import { CommentForm } from "../../../../components/comment-form";
import { CommentThread } from "../../../../components/comment-thread";
import { TimeTracker } from "../../../../components/time-tracker";
import {
  TaskForm,
  uploadTaskAttachments,
} from "../../../../components/task-form";
import { SubtaskForm } from "../../../../components/subtask-form";
import { ApprovalRequestForm } from "../../../../components/approval-request-form";

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
  currentUserId: string;
  isApprover: boolean;
  isSuperAdmin: boolean;
  assignableUsers: Person[];
  approvers: Person[];
  tags: Tag[];
}

export function TaskDetailClient({
  initialTask: task,
  currentUserId,
  isApprover,
  isSuperAdmin,
  assignableUsers,
  approvers,
  tags,
}: TaskDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [requestingApproval, setRequestingApproval] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  const { executeAsync: updateTaskAsync } = useAction(updateTask);

  async function handleUpdateTask(
    values: CreateTaskInput,
    attachments: File[],
  ) {
    setEditError(null);
    setIsSavingTask(true);
    try {
      const result = await updateTaskAsync({
        taskId: task.id,
        title: values.title,
        description: values.description,
        priority: values.priority,
        dueDate: values.dueDate,
        assigneeIds: values.assigneeIds,
        tagIds: values.tagIds,
      });
      if (!result?.data?.task) {
        setEditError(
          result?.serverError ?? "Não foi possível salvar a tarefa.",
        );
        return;
      }
      const failures =
        attachments.length > 0
          ? await uploadTaskAttachments(task.id, attachments)
          : [];
      setEditing(false);
      setAttachmentNotice(
        failures.length > 0
          ? `Alterações salvas, mas ${failures.length} anexo(s) não foram enviados: ${failures
              .map((f) => f.fileName)
              .join(", ")}.`
          : null,
      );
      refresh();
    } finally {
      setIsSavingTask(false);
    }
  }

  function handleEditDialogChange(open: boolean) {
    setEditing(open);
    if (!open) setEditError(null);
  }

  const { execute: submitStatusChange } = useAction(updateTaskStatus, {
    onSuccess: refresh,
  });

  const { execute: submitCreateSubtask, isPending: isCreatingSubtask } =
    useAction(createSubtask, {
      onSuccess() {
        setAddingSubtask(false);
        refresh();
      },
    });

  const { execute: submitToggleSubtask } = useAction(toggleSubtask, {
    onSuccess: refresh,
  });

  const { execute: submitComment, isPending: isSendingComment } = useAction(
    createComment,
    { onSuccess: refresh },
  );

  const { execute: submitStartTimer } = useAction(startTimeEntry, {
    onSuccess: refresh,
  });
  const { execute: submitStopTimer } = useAction(stopTimeEntry, {
    onSuccess: refresh,
  });

  const { execute: submitRequestApproval, isPending: isRequestingApproval } =
    useAction(requestApproval, {
      onSuccess() {
        setRequestingApproval(false);
        refresh();
      },
    });

  const { execute: submitResolveApproval } = useAction(resolveApprovalRequest, {
    onSuccess: refresh,
  });

  const directory = [
    { id: task.createdBy, name: task.createdByName },
    ...task.assignees.map((a) => ({ id: a.userId, name: a.userName })),
    ...assignableUsers,
  ].filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);

  const approvalRequest = task.approvalRequest;

  const canManage =
    isSuperAdmin ||
    task.createdBy === currentUserId ||
    task.assignees.some((a) => a.userId === currentUserId);

  const canRequestApproval =
    canManage && approvalRequest?.status !== "pendente";

  const canResolveApproval =
    approvalRequest?.status === "pendente" &&
    (isSuperAdmin ||
      (isApprover && approvalRequest.approverId === currentUserId));

  const runningTimeEntry = task.timeEntries.find((e) => e.endedAt === null);

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

      {attachmentNotice && (
        <div
          role="status"
          className="mb-4 flex items-start justify-between gap-3 rounded-md border border-(--hb-orange) bg-(--hb-orange-muted) px-4 py-3 text-sm text-(--hb-orange-deep)"
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

              {canManage ? (
                <Select
                  value={task.status}
                  onValueChange={(v) =>
                    submitStatusChange({
                      taskId: task.id,
                      status: v as TaskStatus,
                    })
                  }
                >
                  <SelectTrigger className="h-7 w-auto rounded-full border-none px-2.5 py-1 text-[10px] font-bold uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_CFG) as TaskStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_CFG[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
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
              )}

              {task.needsManualAssignment && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-(--color-destructive-muted) px-2.5 py-1 text-[10px] font-bold uppercase text-(--color-destructive)">
                  <UserX className="h-3 w-3" aria-hidden="true" />
                  Sem responsável
                </span>
              )}

              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Editar
                </Button>
              )}
            </div>
            <h1 className="font-(--font-editorial) text-(--text-2xl) leading-tight">
              {task.title}
            </h1>
          </div>

          <div className="rounded-md border border-(--border) bg-(--surface) px-5 py-5">
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

          <div className="rounded-md border border-(--border) bg-(--surface) px-5 py-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wide text-(--fg-muted)">
                Subtarefas
              </h2>
              <div className="flex items-center gap-2">
                {task.subtaskProgress && (
                  <span className="text-xs font-semibold tabular-nums text-(--fg-muted)">
                    {task.subtaskProgress.done}/{task.subtaskProgress.total}
                  </span>
                )}
                {canManage && !addingSubtask && (
                  <button
                    onClick={() => setAddingSubtask(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-(--hb-blue) hover:underline"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    Adicionar
                  </button>
                )}
              </div>
            </div>

            {task.subtasks.length > 0 && (
              <ul className="mb-3 flex flex-col gap-1.5">
                {task.subtasks
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-2.5 rounded-sm px-2 py-1.5 transition-colors hover:bg-(--surface-alt)"
                    >
                      <button
                        onClick={() =>
                          submitToggleSubtask({
                            subtaskId: s.id,
                            isDone: !s.isDone,
                          })
                        }
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
            )}

            {addingSubtask && (
              <SubtaskForm
                taskId={task.id}
                assignableUsers={assignableUsers}
                onSubmit={(values) => submitCreateSubtask(values)}
                onCancel={() => setAddingSubtask(false)}
                isLoading={isCreatingSubtask}
              />
            )}
          </div>

          {task.attachments.length > 0 && (
            <div className="rounded-md border border-(--border) bg-(--surface) px-5 py-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-(--fg-muted)">
                Anexos
              </h2>
              <ul className="flex flex-col gap-2">
                {task.attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2.5 rounded-sm border border-(--border) px-3 py-2"
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
            onStart={() => submitStartTimer({ taskId: task.id })}
            onStop={() => {
              if (runningTimeEntry) {
                submitStopTimer({ timeEntryId: runningTimeEntry.id });
              }
            }}
          />

          <div className="rounded-md border border-(--border) bg-(--surface) px-5 py-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-(--fg-muted)">
              Comentários
            </h2>
            <CommentThread comments={task.comments} people={directory} />
            <CommentForm
              taskId={task.id}
              people={directory}
              onSubmit={(values) => submitComment(values)}
              isLoading={isSendingComment}
              className="mt-4 border-t border-(--divider) pt-4"
            />
          </div>
        </div>

        {/* ── Sidebar de metadados ── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4">
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
            <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4">
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

          {approvalRequest && (
            <div className="rounded-md border border-(--hb-blue) bg-(--brand-muted) px-4 py-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-(--hb-blue)">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Aprovação da diretoria
              </h2>
              <p className="text-sm text-(--fg)">
                Solicitado a {approvalRequest.approverName} —{" "}
                <span className="font-semibold">
                  {approvalRequest.status === "pendente"
                    ? "Pendente"
                    : approvalRequest.status === "aprovado"
                      ? "Aprovado"
                      : "Rejeitado"}
                </span>
              </p>
              {approvalRequest.notes && (
                <p className="mt-1.5 text-xs text-(--fg-muted)">
                  {approvalRequest.notes}
                </p>
              )}
              {canResolveApproval && (
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      submitResolveApproval({
                        approvalRequestId: approvalRequest.id,
                        decision: "aprovado",
                        notes: null,
                      })
                    }
                  >
                    <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      submitResolveApproval({
                        approvalRequestId: approvalRequest.id,
                        decision: "rejeitado",
                        notes: null,
                      })
                    }
                  >
                    <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                    Rejeitar
                  </Button>
                </div>
              )}
            </div>
          )}

          {canRequestApproval && (
            <Button
              variant="outline"
              onClick={() => setRequestingApproval(true)}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Pedir aprovação da diretoria
            </Button>
          )}

          {task.sourceModule && (
            <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4">
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

          <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4">
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

      <Dialog open={editing} onOpenChange={handleEditDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar tarefa</DialogTitle>
          </DialogHeader>
          <TaskForm
            mode="edit"
            initialValues={{
              title: task.title,
              description: task.description,
              workspace: task.workspace,
              priority: task.priority,
              dueDate: task.dueDate,
              assigneeIds: task.assignees.map((a) => a.userId),
              tagIds: task.tags.map((t) => t.id),
            }}
            assignableUsers={assignableUsers}
            availableTags={tags}
            onSubmit={handleUpdateTask}
            onCancel={() => handleEditDialogChange(false)}
            isLoading={isSavingTask}
            submitError={editError}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={requestingApproval} onOpenChange={setRequestingApproval}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedir aprovação da diretoria</DialogTitle>
          </DialogHeader>
          <ApprovalRequestForm
            taskId={task.id}
            currentStatus={task.status}
            approvers={approvers}
            onSubmit={(values) => submitRequestApproval(values)}
            onCancel={() => setRequestingApproval(false)}
            isLoading={isRequestingApproval}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

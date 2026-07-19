"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import type { Tag, Task } from "@hebron/types/tarefas";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  PageHeader,
} from "@hebron/ui";
import {
  AlarmClockOff,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  ListTodo,
  Plus,
  X,
} from "lucide-react";
import type { CreateTaskInput } from "@hebron/validators/tarefas";
import { createTask } from "../../actions/tasks";
import type { Person } from "../../lib/queries";
import { TaskList } from "../../components/task-list";
import { TaskForm, uploadTaskAttachments } from "../../components/task-form";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

interface KpiCardProps {
  label: string;
  value: number;
  icon: typeof ListChecks;
  tone: "blue" | "orange" | "destructive" | "green";
}

const TONE_CFG: Record<KpiCardProps["tone"], { fg: string; bg: string }> = {
  blue: { fg: "text-(--hb-blue)", bg: "bg-(--brand-muted)" },
  orange: { fg: "text-(--hb-orange-deep)", bg: "bg-(--hb-orange-muted)" },
  destructive: {
    fg: "text-(--color-destructive)",
    bg: "bg-(--color-destructive-muted)",
  },
  green: { fg: "text-(--hb-green-deep)", bg: "bg-(--hb-green-muted)" },
};

function KpiCard({ label, value, icon: Icon, tone }: KpiCardProps) {
  const cfg = TONE_CFG[tone];
  return (
    <div className="flex items-center gap-3 rounded-md border border-(--border) bg-(--surface) px-4 py-3.5">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          cfg.bg,
          cfg.fg,
        )}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xl font-bold tabular-nums leading-tight text-(--fg)">
          {value}
        </p>
        <p className="text-xs text-(--fg-muted)">{label}</p>
      </div>
    </div>
  );
}

export interface MyTasksClientProps {
  tasks: Task[];
  assignableUsers: Person[];
  tags: Tag[];
}

export function MyTasksClient({
  tasks,
  assignableUsers,
  tags,
}: MyTasksClientProps) {
  const router = useRouter();
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);

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

  const assignedPeople = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of tasks) {
      for (const a of task.assignees) map.set(a.userId, a.userName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [tasks]);

  const scopedTasks = useMemo(() => {
    if (assigneeFilter === "all") return tasks;
    return tasks.filter((t) =>
      t.assignees.some((a) => a.userId === assigneeFilter),
    );
  }, [tasks, assigneeFilter]);

  const kpis = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today);
    const open = scopedTasks.filter((t) => t.status !== "concluido");
    const overdue = open.filter(
      (t) => t.dueDate && t.dueDate.getTime() < today.getTime(),
    ).length;
    const dueToday = open.filter(
      (t) => t.dueDate && isSameDay(t.dueDate, today),
    ).length;
    const doneThisWeek = scopedTasks.filter(
      (t) => t.completedAt && t.completedAt.getTime() >= weekStart.getTime(),
    ).length;
    return { total: open.length, overdue, dueToday, doneThisWeek };
  }, [scopedTasks]);

  if (tasks.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          title="Minhas tarefas"
          description="Lista priorizada por urgência — do que precisa de atenção agora ao que pode esperar."
        />
        <EmptyState
          icon={ListTodo}
          title="Nenhuma tarefa neste módulo"
          description="Assim que uma tarefa for criada, ela aparece aqui."
          quote={{
            text: "Tudo quanto fizerdes, fazei-o de todo o coração, como para o Senhor.",
            reference: "Colossenses 3:23",
          }}
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Criar tarefa
            </Button>
          }
        />
        <Dialog open={creating} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova tarefa</DialogTitle>
            </DialogHeader>
            <TaskForm
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Minhas tarefas"
        description="Lista priorizada por urgência — do que precisa de atenção agora ao que pode esperar."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Criar tarefa
          </Button>
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

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Em aberto"
          value={kpis.total}
          icon={ListChecks}
          tone="blue"
        />
        <KpiCard
          label="Atrasadas"
          value={kpis.overdue}
          icon={AlarmClockOff}
          tone="destructive"
        />
        <KpiCard
          label="Vencem hoje"
          value={kpis.dueToday}
          icon={CalendarClock}
          tone="orange"
        />
        <KpiCard
          label="Concluídas na semana"
          value={kpis.doneThisWeek}
          icon={CheckCircle2}
          tone="green"
        />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-xs font-semibold text-(--fg-muted)">
          Responsável
        </label>
        <select
          className="rounded-lg border border-(--border) bg-(--bg) px-2.5 py-1.5 text-xs text-(--fg) outline-none transition-colors focus:border-(--hb-blue)"
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
        >
          <option value="all">Toda a equipe</option>
          {assignedPeople.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <TaskList
        tasks={scopedTasks}
        onTaskClick={(id) => router.push(`/tarefa/${id}`)}
      />

      <Dialog open={creating} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <TaskForm
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

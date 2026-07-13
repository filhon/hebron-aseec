"use client";

import { useId, useState } from "react";
import {
  createTaskTemplateSchema,
  type CreateTaskTemplateInput,
} from "@hebron/validators/tarefas";
import type { TaskPriority, Workspace } from "@hebron/types/tarefas";
import {
  Button,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import { GripVertical, Plus, X } from "lucide-react";

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

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

interface TemplateTaskDraft {
  key: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueOffsetDays: string;
  subtasks: string[];
  subtaskDraft: string;
}

function emptyTask(): TemplateTaskDraft {
  return {
    key: `draft-${Math.random().toString(36).slice(2)}`,
    title: "",
    description: "",
    priority: "media",
    dueOffsetDays: "",
    subtasks: [],
    subtaskDraft: "",
  };
}

export interface TemplateFormProps {
  initialValues?: Partial<CreateTaskTemplateInput>;
  onSubmit: (values: CreateTaskTemplateInput) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function TemplateForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: TemplateFormProps) {
  const nameId = useId();
  const descriptionId = useId();

  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [workspace, setWorkspace] = useState<Workspace>(
    initialValues?.workspace ?? "administrativo",
  );
  const [tasks, setTasks] = useState<TemplateTaskDraft[]>(() =>
    initialValues?.tasks && initialValues.tasks.length > 0
      ? initialValues.tasks.map((t) => ({
          key: `draft-${Math.random().toString(36).slice(2)}`,
          title: t.title,
          description: t.description ?? "",
          priority: t.priority,
          dueOffsetDays:
            t.dueOffsetDays !== null && t.dueOffsetDays !== undefined
              ? String(t.dueOffsetDays)
              : "",
          subtasks: t.subtasks,
          subtaskDraft: "",
        }))
      : [emptyTask()],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function updateTask(index: number, patch: Partial<TemplateTaskDraft>) {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    );
  }

  function addTask() {
    setTasks((prev) => [...prev, emptyTask()]);
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  function addSubtask(index: number) {
    setTasks((prev) =>
      prev.map((t, i) => {
        if (i !== index) return t;
        const value = t.subtaskDraft.trim();
        if (!value) return t;
        return { ...t, subtasks: [...t.subtasks, value], subtaskDraft: "" };
      }),
    );
  }

  function removeSubtask(taskIndex: number, subtaskIndex: number) {
    setTasks((prev) =>
      prev.map((t, i) =>
        i === taskIndex
          ? {
              ...t,
              subtasks: t.subtasks.filter((_, si) => si !== subtaskIndex),
            }
          : t,
      ),
    );
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setTasks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      if (moved) next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const candidate = {
      name,
      description: description.trim() ? description : null,
      workspace,
      tasks: tasks.map((t) => ({
        title: t.title,
        description: t.description.trim() ? t.description : null,
        priority: t.priority,
        dueOffsetDays: t.dueOffsetDays !== "" ? Number(t.dueOffsetDays) : null,
        subtasks: t.subtasks,
      })),
      trigger: null,
    };
    const result = createTaskTemplateSchema.safeParse(candidate);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        nextErrors[issue.path.join(".")] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    onSubmit(result.data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <FormField
        id={nameId}
        label="Nome do template"
        required
        error={errors.name}
      >
        <Input
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Checklist de Limpeza do Flat"
          hasError={!!errors.name}
        />
      </FormField>

      <FormField
        id={descriptionId}
        label="Descrição"
        error={errors.description}
      >
        <textarea
          id={descriptionId}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Quando este template deve ser usado?"
          className="w-full resize-none rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm outline-none placeholder:text-(--fg-muted) focus:border-(--hb-blue)"
        />
      </FormField>

      <FormField label="Módulo" required>
        <Select
          value={workspace}
          onValueChange={(v) => setWorkspace(v as Workspace)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(WORKSPACE_LABEL) as Workspace[]).map((w) => (
              <SelectItem key={w} value={w}>
                {WORKSPACE_LABEL[w]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Tarefas pré-definidas</span>
          <Button type="button" variant="outline" size="sm" onClick={addTask}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Adicionar tarefa
          </Button>
        </div>
        {errors.tasks && (
          <p role="alert" className="text-xs">
            {errors.tasks}
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {tasks.map((task, index) => (
            <li
              key={task.key}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className={cn(
                "flex gap-2.5 rounded-md border border-(--border) bg-(--surface) p-3.5",
                dragIndex === index && "opacity-50",
              )}
            >
              <span
                className="mt-1.5 flex shrink-0 cursor-grab items-center text-(--fg-muted)"
                aria-hidden="true"
              >
                <GripVertical className="h-4 w-4" />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div className="flex items-start gap-2">
                  <Input
                    value={task.title}
                    onChange={(e) =>
                      updateTask(index, { title: e.target.value })
                    }
                    placeholder="Título da tarefa"
                    hasError={!!errors[`tasks.${index}.title`]}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeTask(index)}
                    aria-label="Remover tarefa"
                    disabled={tasks.length === 1}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-(--radius) text-(--fg-muted) transition-colors hover:bg-(--surface-alt) hover:text-(--color-destructive) disabled:pointer-events-none disabled:opacity-30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {errors[`tasks.${index}.title`] && (
                  <p role="alert" className="text-xs">
                    {errors[`tasks.${index}.title`]}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <Select
                    value={task.priority}
                    onValueChange={(v) =>
                      updateTask(index, { priority: v as TaskPriority })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map(
                        (p) => (
                          <SelectItem key={p} value={p}>
                            {PRIORITY_LABEL[p]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    value={task.dueOffsetDays}
                    onChange={(e) =>
                      updateTask(index, { dueOffsetDays: e.target.value })
                    }
                    placeholder="Vence em (dias)"
                  />
                </div>

                <textarea
                  value={task.description}
                  onChange={(e) =>
                    updateTask(index, { description: e.target.value })
                  }
                  rows={2}
                  placeholder="Descrição (opcional)"
                  className="w-full resize-none rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-xs outline-none placeholder:text-(--fg-muted) focus:border-(--hb-blue)"
                />

                <div className="flex flex-col gap-1.5">
                  {task.subtasks.length > 0 && (
                    <ul className="flex flex-col gap-1">
                      {task.subtasks.map((s, si) => (
                        <li
                          key={si}
                          className="flex items-center justify-between gap-2 rounded-sm bg-(--surface-alt) px-2.5 py-1 text-xs"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() => removeSubtask(index, si)}
                            aria-label={`Remover subtarefa ${s}`}
                            className="text-(--fg-muted) hover:text-(--color-destructive)"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <input
                    value={task.subtaskDraft}
                    onChange={(e) =>
                      updateTask(index, { subtaskDraft: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSubtask(index);
                      }
                    }}
                    placeholder="Adicionar subtarefa e pressionar Enter"
                    className="min-w-0 flex-1 rounded-sm border border-(--border) bg-(--bg) px-2.5 py-1.5 text-xs outline-none placeholder:text-(--fg-muted) focus:border-(--hb-blue)"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-(--divider) pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          Salvar template
        </Button>
      </div>
    </form>
  );
}

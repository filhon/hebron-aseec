"use client";

import { useId, useState } from "react";
import type { Tag, TaskPriority, Workspace } from "@hebron/types/tarefas";
import {
  createTaskSchema,
  type CreateTaskInput,
} from "@hebron/validators/tarefas";
import {
  Button,
  FormField,
  Input,
  RichTextEditor,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import { AlertCircle, Check, Paperclip, UserPlus, X } from "lucide-react";
import { createAttachment } from "../actions/tasks";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

/**
 * Persiste anexos de uma tarefa em dois passos (P-4.9b): registra a linha via
 * `createAttachment` (que devolve uma signed upload URL) e faz o PUT do arquivo
 * direto ao Storage — mesmo padrão de apps/documentos. Não lança: devolve a
 * lista de falhas por arquivo para que a tarefa já criada não seja perdida.
 */
export async function uploadTaskAttachments(
  taskId: string,
  files: File[],
): Promise<{ fileName: string; message: string }[]> {
  const failures: { fileName: string; message: string }[] = [];
  for (const file of files) {
    try {
      const mimeType = file.type || "application/octet-stream";
      const result = await createAttachment({
        parentType: "task",
        parentId: taskId,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType,
      });
      const uploadUrl = result?.data?.uploadUrl;
      if (!uploadUrl) {
        throw new Error(result?.serverError ?? "Falha ao registrar anexo");
      }
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": mimeType },
      });
      if (!res.ok) throw new Error("Falha ao enviar arquivo ao armazenamento");
    } catch (err) {
      failures.push({
        fileName: file.name,
        message: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }
  return failures;
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

export interface TaskFormPerson {
  id: string;
  name: string;
}

interface TaskFormState {
  title: string;
  description: string;
  workspace: Workspace;
  priority: TaskPriority;
  dueDate: string;
  assigneeIds: string[];
  tagIds: string[];
}

function toFormState(initial?: Partial<CreateTaskInput>): TaskFormState {
  return {
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    workspace: initial?.workspace ?? "administrativo",
    priority: initial?.priority ?? "media",
    dueDate: initial?.dueDate ? initial.dueDate.toISOString().slice(0, 10) : "",
    assigneeIds: initial?.assigneeIds ?? [],
    tagIds: initial?.tagIds ?? [],
  };
}

type FormErrors = Partial<Record<keyof CreateTaskInput, string>>;

export interface TaskFormProps {
  mode?: "create" | "edit";
  initialValues?: Partial<CreateTaskInput>;
  assignableUsers: TaskFormPerson[];
  availableTags: Tag[];
  onSubmit: (values: CreateTaskInput, attachments: File[]) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  /** Erro de submissão geral (ex.: falha ao enviar anexos), fora do escopo
   * das validações de campo. */
  submitError?: string | null;
}

export function TaskForm({
  mode = "create",
  initialValues,
  assignableUsers,
  availableTags,
  onSubmit,
  onCancel,
  isLoading = false,
  submitError = null,
}: TaskFormProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dueDateId = useId();

  const [values, setValues] = useState<TaskFormState>(() =>
    toFormState(initialValues),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  function set<K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const errorKey = key as keyof CreateTaskInput;
      if (!(errorKey in prev)) return prev;
      return Object.fromEntries(
        Object.entries(prev).filter(([k]) => k !== errorKey),
      ) as FormErrors;
    });
  }

  function toggleAssignee(id: string) {
    set(
      "assigneeIds",
      values.assigneeIds.includes(id)
        ? values.assigneeIds.filter((x) => x !== id)
        : [...values.assigneeIds, id],
    );
  }

  function toggleTag(id: string) {
    set(
      "tagIds",
      values.tagIds.includes(id)
        ? values.tagIds.filter((x) => x !== id)
        : [...values.tagIds, id],
    );
  }

  function addAttachments(files: FileList | null) {
    if (!files || files.length === 0) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // assigneeIds/tagIds referenciam ids do mock atual (não UUIDs reais —
    // isso só passa a existir no backend de P-4.6+). createTaskSchema exige
    // `.uuid()` nesses campos; aqui validamos a forma do resto do payload
    // com o schema compartilhado e tratamos os arrays de id à parte.
    const candidate = {
      title: values.title,
      description: values.description.trim() ? values.description : null,
      workspace: values.workspace,
      priority: values.priority,
      dueDate: values.dueDate ? new Date(`${values.dueDate}T00:00:00`) : null,
      assigneeIds: [],
      tagIds: [],
      recurrenceRule: null,
    };
    const result = createTaskSchema.safeParse(candidate);
    if (!result.success) {
      const nextErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof CreateTaskInput;
        if (key && !nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    onSubmit(
      {
        ...result.data,
        assigneeIds: values.assigneeIds,
        tagIds: values.tagIds,
      },
      attachments,
    );
  }

  const selectedAssignees = assignableUsers.filter((u) =>
    values.assigneeIds.includes(u.id),
  );
  const selectedTags = availableTags.filter((t) =>
    values.tagIds.includes(t.id),
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <FormField id={titleId} label="Título" required error={errors.title}>
        <Input
          id={titleId}
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Ex.: Reconciliar extratos bancários da semana"
          hasError={!!errors.title}
          maxLength={200}
        />
      </FormField>

      <FormField
        id={descriptionId}
        label="Descrição"
        error={errors.description}
      >
        <RichTextEditor
          id={descriptionId}
          value={values.description}
          onChange={(html) => set("description", html)}
          placeholder="Detalhe o que precisa ser feito…"
          minHeight={160}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Módulo" required error={errors.workspace}>
          <Select
            value={values.workspace}
            onValueChange={(v) => set("workspace", v as Workspace)}
          >
            <SelectTrigger hasError={!!errors.workspace}>
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

        <FormField label="Prioridade" required error={errors.priority}>
          <Select
            value={values.priority}
            onValueChange={(v) => set("priority", v as TaskPriority)}
          >
            <SelectTrigger hasError={!!errors.priority}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField id={dueDateId} label="Prazo" error={errors.dueDate}>
        <Input
          id={dueDateId}
          type="date"
          value={values.dueDate}
          onChange={(e) => set("dueDate", e.target.value)}
          hasError={!!errors.dueDate}
        />
      </FormField>

      <FormField label="Responsáveis">
        <div className="relative">
          <button
            type="button"
            onClick={() => setAssigneePickerOpen((v) => !v)}
            onBlur={() => setTimeout(() => setAssigneePickerOpen(false), 150)}
            aria-expanded={assigneePickerOpen}
            className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-left transition-colors hover:border-(--brand)/50"
          >
            {selectedAssignees.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-(--text-sm)">
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Selecionar responsáveis
              </span>
            ) : (
              selectedAssignees.map((u) => (
                <span
                  key={u.id}
                  className="rounded-full bg-(--surface-alt) px-2 py-0.5 text-(--text-xs) font-medium"
                >
                  {u.name}
                </span>
              ))
            )}
          </button>
          {assigneePickerOpen && (
            <div className="absolute z-(--z-dropdown) mt-1 max-h-56 w-full overflow-y-auto rounded-(--radius) border border-(--border) bg-(--bg) p-1 shadow-(--shadow-md)">
              {assignableUsers.length === 0 ? (
                <p className="px-3 py-2 text-(--text-xs)">
                  Nenhum colaborador disponível.
                </p>
              ) : (
                assignableUsers.map((u) => {
                  const checked = values.assigneeIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => toggleAssignee(u.id)}
                      className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-(--text-sm) transition-colors hover:bg-(--surface-alt)"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          checked
                            ? "border-(--brand) bg-(--brand) text-(--brand-fg)"
                            : "border-(--border)",
                        )}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      {u.name}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </FormField>

      <FormField label="Tags">
        <div className="relative">
          <button
            type="button"
            onClick={() => setTagPickerOpen((v) => !v)}
            onBlur={() => setTimeout(() => setTagPickerOpen(false), 150)}
            aria-expanded={tagPickerOpen}
            className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-left transition-colors hover:border-(--brand)/50"
          >
            {selectedTags.length === 0 ? (
              <span className="text-(--text-sm)">Selecionar tags</span>
            ) : (
              selectedTags.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full bg-(--surface-alt) px-2 py-0.5 text-(--text-xs) font-medium"
                >
                  {t.name}
                </span>
              ))
            )}
          </button>
          {tagPickerOpen && (
            <div className="absolute z-(--z-dropdown) mt-1 max-h-56 w-full overflow-y-auto rounded-(--radius) border border-(--border) bg-(--bg) p-1 shadow-(--shadow-md)">
              {availableTags.length === 0 ? (
                <p className="px-3 py-2 text-(--text-xs)">
                  Nenhuma tag cadastrada.
                </p>
              ) : (
                availableTags.map((t) => {
                  const checked = values.tagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => toggleTag(t.id)}
                      className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-(--text-sm) transition-colors hover:bg-(--surface-alt)"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          checked
                            ? "border-(--brand) bg-(--brand) text-(--brand-fg)"
                            : "border-(--border)",
                        )}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      {t.name}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </FormField>

      <FormField label="Anexos">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-(--radius) border-2 border-dashed border-(--border) bg-(--bg-alt) px-4 py-5 text-center transition-colors hover:border-(--brand)">
          <Paperclip className="h-4 w-4 text-(--fg-muted)" aria-hidden="true" />
          <span className="text-(--text-sm)">Clique para anexar arquivos</span>
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => addAttachments(e.target.files)}
          />
        </label>
        {attachments.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1.5">
            {attachments.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-2 rounded-sm border border-(--border) px-3 py-1.5 text-(--text-xs)"
              >
                <span className="min-w-0 flex-1 truncate text-(--fg)">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  aria-label={`Remover ${file.name}`}
                  className="shrink-0 text-(--fg-muted) hover:text-(--color-destructive)"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </FormField>

      {submitError && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-(--radius) border border-(--color-destructive) bg-(--color-destructive-muted) px-3 py-2 text-sm text-(--color-destructive)"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0">{submitError}</span>
        </p>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-(--divider) pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          {mode === "edit" ? "Salvar alterações" : "Criar tarefa"}
        </Button>
      </div>
    </form>
  );
}

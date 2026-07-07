"use client";

import { useId, useState } from "react";
import { z } from "zod";
import type { CreateSubtaskInput } from "@hebron/validators/tarefas";
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

// `assigneeId` referencia um usuário do mock atual (id legível, não UUID) —
// createSubtaskSchema exige `.uuid()`; aqui só validamos o formato do título.
const subtaskFormSchema = z.object({
  title: z
    .string()
    .min(2, "Título é obrigatório")
    .max(300, "Título deve ter no máximo 300 caracteres"),
});

export interface SubtaskFormPerson {
  id: string;
  name: string;
}

export interface SubtaskFormProps {
  taskId: string;
  assignableUsers: SubtaskFormPerson[];
  onSubmit: (values: CreateSubtaskInput) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function SubtaskForm({
  taskId,
  assignableUsers,
  onSubmit,
  onCancel,
  isLoading = false,
}: SubtaskFormProps) {
  const titleId = useId();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = subtaskFormSchema.safeParse({ title });
    if (!result.success) {
      setError(result.error.issues[0]?.message);
      return;
    }
    onSubmit({ taskId, title: result.data.title, assigneeId });
    setTitle("");
    setAssigneeId(null);
    setError(undefined);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <FormField
        id={titleId}
        label="Nova subtarefa"
        error={error}
        className="flex-1"
      >
        <Input
          id={titleId}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(undefined);
          }}
          placeholder="Descreva a subtarefa"
          hasError={!!error}
          maxLength={300}
        />
      </FormField>

      <FormField label="Responsável" className="sm:w-48">
        <Select
          value={assigneeId ?? "none"}
          onValueChange={(v) => setAssigneeId(v === "none" ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Ninguém" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ninguém</SelectItem>
            {assignableUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          Adicionar
        </Button>
      </div>
    </form>
  );
}

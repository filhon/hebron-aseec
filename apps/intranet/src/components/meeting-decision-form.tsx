"use client";

import { useId, useState } from "react";
import {
  createMeetingDecisionSchema,
  type CreateMeetingDecisionInput,
} from "@hebron/validators/intranet";
import {
  Button,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import { ListChecks } from "lucide-react";

export interface MeetingDecisionFormMeetingOption {
  id: string;
  label: string;
}

export interface MeetingDecisionFormResponsibleOption {
  id: string;
  name: string;
}

export interface MeetingDecisionFormValues extends CreateMeetingDecisionInput {
  createTask: boolean;
}

export interface MeetingDecisionFormProps {
  meetings: MeetingDecisionFormMeetingOption[];
  responsibles: MeetingDecisionFormResponsibleOption[];
  initialValues?: Partial<MeetingDecisionFormValues>;
  onSubmit: (values: MeetingDecisionFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function MeetingDecisionForm({
  meetings,
  responsibles,
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: MeetingDecisionFormProps) {
  const descriptionId = useId();
  const dueDateId = useId();

  const [meetingSessionId, setMeetingSessionId] = useState(
    initialValues?.meetingSessionId ?? "",
  );
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [responsibleId, setResponsibleId] = useState(
    initialValues?.responsibleId ?? "",
  );
  const [dueDate, setDueDate] = useState<string>(
    initialValues?.dueDate
      ? new Date(initialValues.dueDate).toISOString().slice(0, 10)
      : "",
  );
  const [createTask, setCreateTask] = useState(
    initialValues?.createTask ?? false,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const candidate = {
      meetingSessionId,
      description,
      responsibleId,
      dueDate: dueDate || null,
    };
    const result = createMeetingDecisionSchema.safeParse(candidate);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        nextErrors[issue.path.join(".")] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    onSubmit({ ...result.data, createTask });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <FormField label="Reunião" required error={errors.meetingSessionId}>
        <Select value={meetingSessionId} onValueChange={setMeetingSessionId}>
          <SelectTrigger hasError={!!errors.meetingSessionId}>
            <SelectValue placeholder="Selecione a reunião" />
          </SelectTrigger>
          <SelectContent>
            {meetings.map((meeting) => (
              <SelectItem key={meeting.id} value={meeting.id}>
                {meeting.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        id={descriptionId}
        label="Descrição da decisão"
        required
        error={errors.description}
      >
        <textarea
          id={descriptionId}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Ex.: Aprovar o projeto “Casa de Apoio ao Migrante” com orçamento de R$ 42.000."
          aria-invalid={!!errors.description}
          className="w-full resize-none rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-(--text-sm) outline-none placeholder:text-(--fg-muted) focus:border-(--hb-blue)"
        />
      </FormField>

      <FormField label="Responsável" required error={errors.responsibleId}>
        <Select value={responsibleId} onValueChange={setResponsibleId}>
          <SelectTrigger hasError={!!errors.responsibleId}>
            <SelectValue placeholder="Selecione o responsável" />
          </SelectTrigger>
          <SelectContent>
            {responsibles.map((responsible) => (
              <SelectItem key={responsible.id} value={responsible.id}>
                {responsible.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField id={dueDateId} label="Prazo" error={errors.dueDate}>
        <input
          id={dueDateId}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-10 w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 text-(--text-sm) text-(--fg) outline-none focus:border-(--brand)"
        />
      </FormField>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-(--radius) border border-(--border) bg-(--surface-alt) px-3.5 py-3">
        <input
          type="checkbox"
          checked={createTask}
          onChange={(e) => setCreateTask(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded-(--radius-sm) border-(--border) text-(--brand)"
        />
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-(--text-sm) font-medium text-(--fg)">
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            Criar tarefa a partir desta decisão
          </span>
          <span className="text-(--text-xs) text-(--fg-muted)">
            Gera uma tarefa em Tarefas para o responsável, com o prazo informado
            acima.
          </span>
        </span>
      </label>

      <div className="flex items-center justify-end gap-3 border-t border-(--divider) pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          Registrar decisão
        </Button>
      </div>
    </form>
  );
}

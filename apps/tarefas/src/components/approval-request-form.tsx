"use client";

import { useId, useState } from "react";
import { z } from "zod";
import {
  taskStatusEnum,
  type RequestApprovalInput,
} from "@hebron/validators/tarefas";
import type { TaskStatus } from "@hebron/types/tarefas";
import {
  Button,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import { ShieldCheck } from "lucide-react";

// `approverId` referencia um diretor do mock atual (id legível, não UUID) —
// requestApprovalSchema exige `.uuid()`; aqui relaxamos para string não-vazia.
const approvalFormSchema = z.object({
  requestedStatus: taskStatusEnum,
  approverId: z.string().min(1, "Selecione um diretor aprovador"),
  notes: z
    .string()
    .max(500, "Notas devem ter no máximo 500 caracteres")
    .nullable(),
});

const STATUS_LABEL: Record<TaskStatus, string> = {
  a_fazer: "A Fazer",
  em_progresso: "Em Progresso",
  em_revisao: "Em Revisão",
  concluido: "Concluído",
};

export interface ApprovalRequestFormApprover {
  id: string;
  name: string;
}

export interface ApprovalRequestFormProps {
  taskId: string;
  currentStatus: TaskStatus;
  approvers: ApprovalRequestFormApprover[];
  onSubmit: (values: RequestApprovalInput) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ApprovalRequestForm({
  taskId,
  currentStatus,
  approvers,
  onSubmit,
  onCancel,
  isLoading = false,
}: ApprovalRequestFormProps) {
  const notesId = useId();
  const [requestedStatus, setRequestedStatus] = useState<TaskStatus>(
    currentStatus === "concluido" ? "em_revisao" : "concluido",
  );
  const [approverId, setApproverId] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ approverId?: string; notes?: string }>(
    {},
  );

  const targetStatuses = (Object.keys(STATUS_LABEL) as TaskStatus[]).filter(
    (s) => s !== currentStatus,
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = approvalFormSchema.safeParse({
      requestedStatus,
      approverId,
      notes: notes.trim() ? notes : null,
    });
    if (!result.success) {
      const nextErrors: { approverId?: string; notes?: string } = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key === "approverId") nextErrors.approverId = issue.message;
        if (key === "notes") nextErrors.notes = issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    onSubmit({ taskId, ...result.data });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 rounded-(--radius) bg-(--brand-muted) px-3.5 py-3 text-xs">
        <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Diretores não recebem tarefas operacionais — apenas pedidos de
          aprovação para avançar o status desta tarefa.
        </p>
      </div>

      <FormField label="Avançar para" required>
        <Select
          value={requestedStatus}
          onValueChange={(v) => setRequestedStatus(v as TaskStatus)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {targetStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Diretor aprovador" required error={errors.approverId}>
        {approvers.length === 0 ? (
          <p className="rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm">
            Nenhum diretor disponível.
          </p>
        ) : (
          <Select value={approverId} onValueChange={setApproverId}>
            <SelectTrigger hasError={!!errors.approverId}>
              <SelectValue placeholder="Selecione um diretor" />
            </SelectTrigger>
            <SelectContent>
              {approvers.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField id={notesId} label="Notas" error={errors.notes}>
        <textarea
          id={notesId}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Contexto adicional para o aprovador (opcional)"
          className="w-full resize-none rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm outline-none placeholder:text-(--fg-muted) focus:border-(--hb-blue)"
        />
      </FormField>

      <div className="flex items-center justify-end gap-3 border-t border-(--divider) pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          Enviar pedido
        </Button>
      </div>
    </form>
  );
}

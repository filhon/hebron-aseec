"use client";

import { useState } from "react";
import { Clock3 } from "lucide-react";
import type { TaskEvent } from "@hebron/types/tarefas";

const VISIBLE_LIMIT = 6;

const STATUS_LABEL: Record<string, string> = {
  a_fazer: "A Fazer",
  em_progresso: "Em Progresso",
  em_revisao: "Em Revisão",
  concluido: "Concluído",
};

const PRIORITY_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const WORKSPACE_LABEL: Record<string, string> = {
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  contabil_fiscal: "Contábil e Fiscal",
  eclesiastico: "Eclesiástico",
  comunicacao: "Comunicação",
  tecnologia_inovacao: "Tecnologia e Inovação",
};

function fmtDateTime(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDiffDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}

function summarizeUpdate(diff: Record<string, unknown>): string {
  const clauses: string[] = [];
  if ("title" in diff) clauses.push("alterou o título");
  if ("description" in diff) clauses.push("alterou a descrição");

  const priority = asString(diff.priority);
  if (priority) {
    clauses.push(
      `alterou a prioridade para ${PRIORITY_LABEL[priority] ?? priority}`,
    );
  }

  if ("dueDate" in diff) {
    const formatted = fmtDiffDate(diff.dueDate);
    clauses.push(
      formatted ? `alterou o prazo para ${formatted}` : "removeu o prazo",
    );
  }

  const workspace = asString(diff.workspace);
  if (workspace) {
    clauses.push(
      `moveu a tarefa para ${WORKSPACE_LABEL[workspace] ?? workspace}`,
    );
  }

  if ("needsManualAssignment" in diff)
    clauses.push("atualizou os responsáveis");

  return clauses.length > 0 ? clauses.join("; ") : "atualizou a tarefa";
}

function summarizeAssignment(diff: Record<string, unknown>): string {
  const names = asStringArray(diff.assigneeNames);
  return names.length > 0
    ? `atribuiu a ${names.join(", ")}`
    : "atribuiu um responsável";
}

function summarizeSubtaskCreated(diff: Record<string, unknown>): string {
  const title = asString(diff.title);
  return title ? `adicionou a subtarefa "${title}"` : "adicionou uma subtarefa";
}

function summarizeAttachment(diff: Record<string, unknown>): string {
  const fileName = asString(diff.fileName);
  return fileName ? `adicionou o anexo "${fileName}"` : "adicionou um anexo";
}

function describeEvent(event: TaskEvent): string {
  switch (event.eventType) {
    case "created":
      return "criou a tarefa";
    case "updated":
      return summarizeUpdate(event.diff ?? {});
    case "status_changed": {
      const status = asString(event.diff?.status);
      return `moveu para ${status ? (STATUS_LABEL[status] ?? status) : "outra coluna"}`;
    }
    case "deleted":
      return "excluiu a tarefa";
    case "assigned_manually":
      return summarizeAssignment(event.diff ?? {});
    case "subtask_created":
      return summarizeSubtaskCreated(event.diff ?? {});
    case "subtask_toggled":
      return event.diff?.isDone === true
        ? "concluiu uma subtarefa"
        : "reabriu uma subtarefa";
    case "attachment_added":
      return summarizeAttachment(event.diff ?? {});
    default:
      // event_type gravado por uma action que ainda não entrou na união
      // tipada (TaskEventType) — rótulo neutro em vez de quebrar a tela ou
      // mostrar o identificador cru (critério de aceite P-4.6b).
      return "registrou uma atividade";
  }
}

export interface TaskActivityProps {
  events: TaskEvent[];
  createdByName: string;
  createdAt: Date;
  completedAt: Date | null;
}

export function TaskActivity({
  events,
  createdByName,
  createdAt,
  completedAt,
}: TaskActivityProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleEvents = expanded ? events : events.slice(0, VISIBLE_LIMIT);
  const hiddenCount = events.length - visibleEvents.length;

  return (
    <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4">
      <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-(--fg-muted)">
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        Atividade
      </h2>

      <div className="flex flex-col gap-1 text-xs text-(--fg-muted)">
        <p>
          Criada por{" "}
          <span className="font-medium text-(--fg)">{createdByName}</span> em{" "}
          {fmtDateTime(createdAt)}
        </p>
        {completedAt && <p>Concluída em {fmtDateTime(completedAt)}</p>}
      </div>

      {events.length === 0 ? (
        <p className="mt-3 border-t border-(--divider) pt-3 text-xs text-(--fg-subtle)">
          Nenhum evento registrado ainda.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5 border-t border-(--divider) pt-3 text-xs text-(--fg-muted)">
          {visibleEvents.map((event) => (
            <li key={event.id}>
              <span className="font-medium text-(--fg)">{event.actorName}</span>{" "}
              {describeEvent(event)}
              <span className="mt-0.5 block text-[11px] text-(--fg-subtle)">
                {fmtDateTime(event.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2.5 text-[11px] font-semibold text-(--hb-blue) hover:underline"
        >
          Ver mais {hiddenCount} evento{hiddenCount > 1 ? "s" : ""}
        </button>
      )}
      {expanded && events.length > VISIBLE_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2.5 text-[11px] font-semibold text-(--hb-blue) hover:underline"
        >
          Ver menos
        </button>
      )}
    </div>
  );
}

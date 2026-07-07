"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { RecurrenceRule, Workspace } from "@hebron/types/tarefas";
import { Avatar, EmptyState } from "@hebron/ui";
import { PageHeader } from "@hebron/ui";
import { CalendarClock, RefreshCw } from "lucide-react";
import { mockTasks } from "../../../lib/mock-data";

const WORKSPACE_LABEL: Record<Workspace, string> = {
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  contabil_fiscal: "Contábil e Fiscal",
  eclesiastico: "Eclesiástico",
  comunicacao: "Comunicação",
  tecnologia_inovacao: "Tecnologia e Inovação",
};

const RECURRENCE_LABEL: Record<RecurrenceRule["type"], string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
  anual: "Anual",
};

function nextOccurrenceAfter(rule: RecurrenceRule, from: Date): Date {
  const next = new Date(from);
  switch (rule.type) {
    case "diaria":
      next.setDate(next.getDate() + rule.interval);
      break;
    case "semanal":
      next.setDate(next.getDate() + 7 * rule.interval);
      break;
    case "mensal":
      next.setMonth(next.getMonth() + rule.interval);
      break;
    case "anual":
      next.setFullYear(next.getFullYear() + rule.interval);
      break;
  }
  return next;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function RecorrentesPage() {
  const router = useRouter();

  const recurringTasks = useMemo(
    () => mockTasks.filter((t) => t.recurrenceRule !== null),
    [],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Tarefas recorrentes"
        description="Regras de repetição configuradas e a previsão da próxima execução."
      />

      {recurringTasks.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="Nenhuma tarefa recorrente"
          description="Regras de recorrência aparecerão aqui assim que forem criadas."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {recurringTasks.map((task) => {
            const rule = task.recurrenceRule as RecurrenceRule;
            const isPending = task.status !== "concluido";
            const preview = isPending
              ? (task.dueDate ?? nextOccurrenceAfter(rule, task.createdAt))
              : nextOccurrenceAfter(rule, task.completedAt ?? task.createdAt);

            return (
              <li
                key={task.id}
                onClick={() => router.push(`/tarefa/${task.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/tarefa/${task.id}`);
                  }
                }}
                className="flex cursor-pointer flex-col gap-3 rounded-(--radius-md) border border-(--border) bg-(--surface) px-4 py-4 transition-colors hover:border-(--hb-blue) sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--brand-muted) text-(--hb-blue)">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-(--fg)">
                      {task.title}
                    </p>
                    <p className="text-xs text-(--fg-muted)">
                      {WORKSPACE_LABEL[task.workspace]} ·{" "}
                      {RECURRENCE_LABEL[rule.type]}
                      {rule.interval > 1 && ` a cada ${rule.interval}`}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <div className="flex -space-x-1.5">
                    {task.assignees.slice(0, 3).map((a) => (
                      <Avatar
                        key={a.userId}
                        name={a.userName}
                        size="sm"
                        className="h-6 w-6 text-[10px] ring-2 ring-(--surface)"
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-(--hb-cyan-muted) px-3 py-1.5 text-xs font-semibold text-(--hb-cyan-deep)">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                    Próxima: {fmtDate(preview)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import type { Task } from "@hebron/types/tarefas";
import { EmptyState, PageHeader } from "@hebron/ui";
import { Coffee } from "lucide-react";
import { updateTaskStatus } from "../../../actions/tasks";
import { FocusMode } from "../../../components/focus-mode";

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export interface FocoClientProps {
  tasks: Task[];
}

export function FocoClient({ tasks }: FocoClientProps) {
  const router = useRouter();

  const { execute: submitComplete } = useAction(updateTaskStatus, {
    onSuccess() {
      router.refresh();
    },
  });

  // Mesmo critério de agenda do FocusMode (BRAIN §6.9): em progresso ou com
  // prazo até hoje. Calculado aqui para decidir entre pomodoro e dia livre.
  const hasAgendaToday = useMemo(() => {
    const today = new Date();
    return tasks.some(
      (t) =>
        t.status !== "concluido" &&
        (t.status === "em_progresso" ||
          (t.dueDate !== null &&
            (t.dueDate.getTime() <= today.getTime() ||
              isSameDay(t.dueDate, today)))),
    );
  }, [tasks]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Modo foco"
        description="Sua agenda do dia, sem distrações — com pomodoro para manter o ritmo."
      />
      {!hasAgendaToday ? (
        <EmptyState
          icon={Coffee}
          title="Nenhuma tarefa para hoje"
          description="Sua agenda está livre. Bom descanso."
          hideQuote
        />
      ) : (
        <FocusMode
          tasks={tasks}
          onTaskClick={(id) => router.push(`/tarefa/${id}`)}
          onToggleComplete={(taskId) =>
            submitComplete({ taskId, status: "concluido" })
          }
        />
      )}
    </div>
  );
}

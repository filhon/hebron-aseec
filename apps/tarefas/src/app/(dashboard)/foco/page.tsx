"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@hebron/types/tarefas";
import { EmptyState, PageHeader } from "@hebron/ui";
import { Coffee } from "lucide-react";
import { mockTasks } from "../../../lib/mock-data";
import { FocusMode } from "../../../components/focus-mode";

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function FocoPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  function toggleComplete(taskId: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: "concluido", completedAt: new Date() }
          : t,
      ),
    );
  }

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
      {loading ? (
        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]" aria-hidden="true">
          <div
            className="h-64 animate-pulse rounded-(--radius-md) border border-(--border)"
            style={{ background: "var(--surface-alt)" }}
          />
          <div
            className="h-64 animate-pulse rounded-(--radius-md) border border-(--border)"
            style={{ background: "var(--surface-alt)" }}
          />
        </div>
      ) : !hasAgendaToday ? (
        <EmptyState
          icon={Coffee}
          title="Nenhuma tarefa para hoje. Bom descanso!"
          hideQuote
        />
      ) : (
        <FocusMode
          tasks={tasks}
          onTaskClick={(id) => router.push(`/tarefa/${id}`)}
          onToggleComplete={toggleComplete}
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@hebron/types/tarefas";
import { PageHeader } from "@hebron/ui";
import { mockTasks } from "../../../lib/mock-data";
import { FocusMode } from "../../../components/focus-mode";

export default function FocoPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

  function toggleComplete(taskId: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: "concluido", completedAt: new Date() }
          : t,
      ),
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Modo foco"
        description="Sua agenda do dia, sem distrações — com pomodoro para manter o ritmo."
      />
      <FocusMode
        tasks={tasks}
        onTaskClick={(id) => router.push(`/tarefa/${id}`)}
        onToggleComplete={toggleComplete}
      />
    </div>
  );
}

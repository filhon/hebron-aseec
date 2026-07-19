"use client";

import { useEffect, useState } from "react";
import type { Task, TaskPriority } from "@hebron/types/tarefas";
import { EmptyState } from "@hebron/ui";
import { Check, Pause, Play, RotateCcw, SkipForward, Sun } from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const PRIORITY_DOT: Record<TaskPriority, string> = {
  baixa: "bg-(--fg-subtle)",
  media: "bg-(--hb-cyan)",
  alta: "bg-(--hb-orange)",
  urgente: "bg-(--color-destructive)",
};

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function usePomodoro() {
  const [mode, setMode] = useState<"work" | "break">("work");
  const [secondsLeft, setSecondsLeft] = useState(WORK_SECONDS);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (secondsLeft > 0 || !running) return;
    if (mode === "work") {
      setCycles((c) => c + 1);
      setMode("break");
      setSecondsLeft(BREAK_SECONDS);
    } else {
      setMode("work");
      setSecondsLeft(WORK_SECONDS);
    }
  }, [secondsLeft, running, mode]);

  function skip() {
    if (mode === "work") {
      setCycles((c) => c + 1);
      setMode("break");
      setSecondsLeft(BREAK_SECONDS);
    } else {
      setMode("work");
      setSecondsLeft(WORK_SECONDS);
    }
  }

  function reset() {
    setRunning(false);
    setMode("work");
    setSecondsLeft(WORK_SECONDS);
    setCycles(0);
  }

  return {
    mode,
    secondsLeft,
    running,
    cycles,
    toggleRunning: () => setRunning((r) => !r),
    skip,
    reset,
  };
}

export interface FocusModeProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  onToggleComplete?: (taskId: string) => void;
  className?: string;
}

export function FocusMode({
  tasks,
  onTaskClick,
  onToggleComplete,
  className,
}: FocusModeProps) {
  const { mode, secondsLeft, running, cycles, toggleRunning, skip, reset } =
    usePomodoro();

  const today = new Date();
  const agenda = tasks
    .filter(
      (t) =>
        t.status !== "concluido" &&
        (t.status === "em_progresso" ||
          (t.dueDate !== null &&
            (t.dueDate.getTime() <= today.getTime() ||
              isSameDay(t.dueDate, today)))),
    )
    .sort((a, b) => {
      const at = a.dueDate?.getTime() ?? Infinity;
      const bt = b.dueDate?.getTime() ?? Infinity;
      return at - bt;
    });

  const totalSeconds = mode === "work" ? WORK_SECONDS : BREAK_SECONDS;
  const progress = 1 - secondsLeft / totalSeconds;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div className={cn("grid gap-5 lg:grid-cols-[18rem_1fr]", className)}>
      {/* Pomodoro */}
      <div className="flex flex-col items-center gap-4 rounded-md border border-(--border) bg-(--surface) px-5 py-6">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
            mode === "work"
              ? "bg-(--brand-muted) text-(--hb-blue)"
              : "bg-(--hb-green-muted) text-(--hb-green-deep)",
          )}
        >
          {mode === "work" ? "Foco" : "Pausa"}
        </span>

        <div className="relative flex h-36 w-36 items-center justify-center">
          <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              fill="none"
              stroke="var(--surface-alt)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              fill="none"
              stroke={mode === "work" ? "var(--hb-blue)" : "var(--hb-green)"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <span className="absolute text-2xl font-bold tabular-nums text-(--fg)">
            {formatClock(secondsLeft)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-(--border) text-(--fg-muted) transition-colors hover:bg-(--surface-alt)"
            aria-label="Reiniciar pomodoro"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={toggleRunning}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-(--hb-blue) text-(--fg-invert) transition-colors hover:bg-(--hb-blue-soft)"
            aria-label={running ? "Pausar" : "Iniciar"}
          >
            {running ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="ml-0.5 h-5 w-5" />
            )}
          </button>
          <button
            onClick={skip}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-(--border) text-(--fg-muted) transition-colors hover:bg-(--surface-alt)"
            aria-label="Pular etapa"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="text-xs text-(--fg-muted)">
          {cycles} ciclo{cycles === 1 ? "" : "s"} concluído
          {cycles === 1 ? "" : "s"}
        </p>
      </div>

      {/* Agenda do dia */}
      <div className="rounded-md border border-(--border) bg-(--surface) px-5 py-5">
        <div className="mb-4 flex items-center gap-2">
          <Sun className="h-4 w-4 text-(--hb-orange)" aria-hidden="true" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-(--fg)">
            Agenda do dia
          </h3>
          <span className="text-xs text-(--fg-muted)">
            {agenda.length} tarefa{agenda.length === 1 ? "" : "s"}
          </span>
        </div>

        {agenda.length === 0 ? (
          <EmptyState
            icon={Sun}
            title="Nada pendente para hoje"
            description="Nenhuma tarefa vence hoje. As dos próximos dias seguem no seu módulo."
            hideQuote
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {agenda.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-(--radius) border border-(--border) px-3.5 py-2.5"
              >
                <button
                  onClick={() => onToggleComplete?.(task.id)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-(--border-strong) text-transparent transition-colors hover:border-(--hb-green) hover:text-(--hb-green)"
                  aria-label="Marcar como concluída"
                >
                  <Check className="h-3 w-3" />
                </button>
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    PRIORITY_DOT[task.priority],
                  )}
                  aria-hidden="true"
                />
                <button
                  onClick={() => onTaskClick?.(task.id)}
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium text-(--fg) hover:underline"
                >
                  {task.title}
                </button>
                {task.dueDate && (
                  <span className="shrink-0 text-xs tabular-nums text-(--fg-muted)">
                    {task.dueDate.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

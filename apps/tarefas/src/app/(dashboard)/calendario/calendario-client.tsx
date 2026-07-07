"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Task, TaskPriority } from "@hebron/types/tarefas";
import { PageHeader } from "@hebron/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  baixa: "bg-(--fg-subtle)",
  media: "bg-(--hb-cyan)",
  alta: "bg-(--hb-orange)",
  urgente: "bg-(--color-destructive)",
};

const WEEKDAY_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type ViewMode = "mes" | "semana";

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeek(d: Date): Date {
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function buildMonthGrid(anchor: Date): Date[] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    days.push(day);
  }
  return days;
}

function buildWeek(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

export interface CalendarioClientProps {
  tasks: Task[];
}

export function CalendarioClient({ tasks }: CalendarioClientProps) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("mes");
  const [anchor, setAnchor] = useState(() => new Date());

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = task.dueDate.toDateString();
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  function tasksOn(day: Date): Task[] {
    return tasksByDay.get(day.toDateString()) ?? [];
  }

  function step(direction: -1 | 1) {
    setAnchor((prev) => {
      const next = new Date(prev);
      if (view === "mes") next.setMonth(prev.getMonth() + direction);
      else next.setDate(prev.getDate() + direction * 7);
      return next;
    });
  }

  const monthDays = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const weekDays = useMemo(() => buildWeek(anchor), [anchor]);
  const today = new Date();

  const rangeLabel =
    view === "mes"
      ? anchor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      : `${weekDays[0]?.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${weekDays[6]?.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Calendário"
        description="Prazos de tarefas organizados por data."
        actions={
          <div className="flex items-center gap-1 rounded-full border border-(--border) bg-(--surface-alt) p-1">
            {(["mes", "semana"] as ViewMode[]).map((key) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                  view === key
                    ? "bg-(--surface) text-(--hb-blue) shadow-(--shadow-xs)"
                    : "text-(--fg-muted) hover:text-(--fg)",
                )}
              >
                {key === "mes" ? "Mês" : "Semana"}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => step(-1)}
            aria-label="Período anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-(--border) transition-colors hover:bg-(--surface-alt)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => step(1)}
            aria-label="Próximo período"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-(--border) transition-colors hover:bg-(--surface-alt)"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="ml-1 rounded-full border border-(--border) px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-(--surface-alt)"
          >
            Hoje
          </button>
        </div>
        <p className="text-sm font-semibold capitalize text-(--fg)">
          {rangeLabel}
        </p>
      </div>

      {view === "mes" ? (
        <div className="overflow-hidden rounded-(--radius-md) border border-(--border) bg-(--surface)">
          <div className="grid grid-cols-7 border-b border-(--border) bg-(--surface-alt)">
            {WEEKDAY_LABEL.map((w) => (
              <div
                key={w}
                className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-(--fg-muted)"
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day) => {
              const dayTasks = tasksOn(day);
              const inMonth = day.getMonth() === anchor.getMonth();
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex min-h-24 flex-col gap-1 border-b border-r border-(--divider) p-1.5 last:border-r-0",
                    !inMonth && "bg-(--surface-alt)/50",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                      isToday
                        ? "bg-(--hb-blue) text-(--fg-invert)"
                        : inMonth
                          ? "text-(--fg)"
                          : "text-(--fg-subtle)",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="flex flex-col gap-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => router.push(`/tarefa/${task.id}`)}
                        className="flex items-center gap-1 truncate rounded-(--radius-sm) bg-(--surface-alt) px-1.5 py-0.5 text-left text-[10px] font-medium text-(--fg) transition-colors hover:bg-(--brand-muted)"
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            PRIORITY_DOT[task.priority],
                          )}
                        />
                        <span className="truncate">{task.title}</span>
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="px-1.5 text-[10px] font-medium text-(--fg-muted)">
                        +{dayTasks.length - 3} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {weekDays.map((day) => {
            const dayTasks = tasksOn(day);
            const isToday = isSameDay(day, today);
            return (
              <div
                key={day.toISOString()}
                className="flex flex-col gap-2 rounded-(--radius-md) border border-(--border) bg-(--surface) p-3"
              >
                <div className="flex items-center gap-1.5 border-b border-(--divider) pb-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      isToday
                        ? "bg-(--hb-blue) text-(--fg-invert)"
                        : "text-(--fg)",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-(--fg-muted)">
                    {day.toLocaleDateString("pt-BR", { weekday: "short" })}
                  </span>
                </div>
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-(--fg-subtle)">Sem tarefas</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {dayTasks.map((task) => (
                      <li key={task.id}>
                        <button
                          onClick={() => router.push(`/tarefa/${task.id}`)}
                          className="flex w-full items-center gap-1.5 rounded-(--radius-sm) px-1.5 py-1 text-left text-xs text-(--fg) transition-colors hover:bg-(--surface-alt)"
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              PRIORITY_DOT[task.priority],
                            )}
                          />
                          <span className="truncate">{task.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Task } from "@hebron/types/tarefas";
import { CornerDownLeft, Plus, Search } from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

type CommandItem =
  | { type: "create"; label: string }
  | { type: "task"; task: Task };

export interface CommandMenuProps {
  tasks: Task[];
  onSelectTask?: (taskId: string) => void;
  onCreateTask?: (title: string) => void;
  className?: string;
}

export function CommandMenu({
  tasks,
  onSelectTask,
  onCreateTask,
  className,
}: CommandMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks.slice(0, 8);
    return tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 8);
  }, [tasks, query]);

  const items: CommandItem[] = useMemo(() => {
    const trimmed = query.trim();
    const taskItems: CommandItem[] = filteredTasks.map((task) => ({
      type: "task",
      task,
    }));
    if (trimmed) {
      return [{ type: "create", label: trimmed }, ...taskItems];
    }
    return taskItems;
  }, [filteredTasks, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function runItem(item: CommandItem) {
    if (item.type === "create") {
      onCreateTask?.(item.label);
    } else {
      onSelectTask?.(item.task.id);
    }
    setOpen(false);
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) runItem(item);
    }
  }

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-(--z-modal) flex items-start justify-center pt-[15vh]",
        className,
      )}
      onClick={() => setOpen(false)}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Busca e criação rápida de tarefas"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-(--radius-lg) border border-(--border) bg-(--bg) shadow-(--shadow-xl)"
      >
        <div className="flex items-center gap-2.5 border-b border-(--border) px-4 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-(--fg-muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Buscar ou criar uma tarefa…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-(--fg-muted)"
          />
          <kbd className="shrink-0 rounded border border-(--border) px-1.5 py-0.5 text-[10px] font-semibold text-(--fg-muted)">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-1.5">
          {items.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-(--fg-muted)">
              Nenhuma tarefa encontrada.
            </p>
          )}

          {items.map((item, index) => {
            const active = index === activeIndex;
            if (item.type === "create") {
              return (
                <button
                  key="create"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => runItem(item)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors",
                    active ? "bg-(--surface-alt)" : "",
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--hb-orange-muted) text-(--hb-orange-deep)">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    Criar tarefa{" "}
                    <strong className="font-semibold">“{item.label}”</strong>
                  </span>
                  {active && (
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-(--fg-muted)" />
                  )}
                </button>
              );
            }

            return (
              <button
                key={item.task.id}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => runItem(item)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors",
                  active ? "bg-(--surface-alt)" : "",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    item.task.status === "concluido"
                      ? "bg-(--hb-green)"
                      : "bg-(--hb-blue)",
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-(--fg)">
                  {item.task.title}
                </span>
                {active && (
                  <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-(--fg-muted)" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-(--border) bg-(--surface-alt) px-4 py-2 text-[10px] font-medium text-(--fg-muted)">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-(--border) px-1 py-0.5">
              ↑↓
            </kbd>
            navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-(--border) px-1 py-0.5">
              ↵
            </kbd>
            selecionar
          </span>
        </div>
      </div>
    </div>
  );
}

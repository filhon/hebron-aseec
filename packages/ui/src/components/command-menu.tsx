"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Plus, Search } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// D3-001 (PACOTE 11, AUDIT/04-BACKLOG-CORRECAO.md): movido de
// apps/tarefas/src/components/command-menu.tsx — funcionava, mas ficava
// preso a `Task` de @hebron/types/tarefas, então nenhum outro app podia
// usá-lo. Generalizado para `CommandMenuItem` (id/label/indicatorColor),
// mesmo comportamento (Cmd/Ctrl+K abre, Esc fecha, "criar" quando a busca
// não bate com nada).

export interface CommandMenuItem {
  id: string;
  label: string;
  /** Cor do indicador (bolinha) à esquerda do item — omitir para não mostrar. */
  indicatorColor?: string;
}

export interface CommandMenuProps {
  items: CommandMenuItem[];
  /** Rótulo acessível do diálogo (ex.: "Busca e criação rápida de tarefas"). */
  ariaLabel: string;
  onSelectItem?: (id: string) => void;
  onCreateItem?: (query: string) => void;
  renderCreateLabel?: (query: string) => React.ReactNode;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
}

type CommandEntry =
  | { type: "create"; label: string }
  | { type: "item"; item: CommandMenuItem };

export function CommandMenu({
  items,
  ariaLabel,
  onSelectItem,
  onCreateItem,
  renderCreateLabel = (query) => (
    <>
      Criar <strong className="font-semibold">“{query}”</strong>
    </>
  ),
  placeholder = "Buscar…",
  emptyLabel = "Nenhum resultado encontrado.",
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

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 8);
  }, [items, query]);

  const entries: CommandEntry[] = useMemo(() => {
    const trimmed = query.trim();
    const itemEntries: CommandEntry[] = filteredItems.map((item) => ({
      type: "item",
      item,
    }));
    if (trimmed && onCreateItem) {
      return [{ type: "create", label: trimmed }, ...itemEntries];
    }
    return itemEntries;
  }, [filteredItems, query, onCreateItem]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function runEntry(entry: CommandEntry) {
    if (entry.type === "create") {
      onCreateItem?.(entry.label);
    } else {
      onSelectItem?.(entry.item.id);
    }
    setOpen(false);
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, entries.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = entries[activeIndex];
      if (entry) runEntry(entry);
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
        aria-label={ariaLabel}
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
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-(--fg-muted)"
          />
          <kbd className="shrink-0 rounded border border-(--border) px-1.5 py-0.5 text-[10px] font-semibold text-(--fg-muted)">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-1.5">
          {entries.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-(--fg-muted)">
              {emptyLabel}
            </p>
          )}

          {entries.map((entry, index) => {
            const active = index === activeIndex;
            if (entry.type === "create") {
              return (
                <button
                  key="create"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => runEntry(entry)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors",
                    active ? "bg-(--surface-alt)" : "",
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--hb-orange-muted) text-(--hb-orange-deep)">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {renderCreateLabel(entry.label)}
                  </span>
                  {active && (
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-(--fg-muted)" />
                  )}
                </button>
              );
            }

            return (
              <button
                key={entry.item.id}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => runEntry(entry)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors",
                  active ? "bg-(--surface-alt)" : "",
                )}
              >
                {entry.item.indicatorColor && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.item.indicatorColor }}
                    aria-hidden="true"
                  />
                )}
                <span className="min-w-0 flex-1 truncate text-(--fg)">
                  {entry.item.label}
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

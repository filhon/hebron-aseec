"use client";

import { useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";

export interface WidgetGridItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface WidgetGridProps {
  items: WidgetGridItem[];
  onReorder?: (orderedIds: string[]) => void;
  className?: string;
}

export function WidgetGrid({ items, onReorder, className }: WidgetGridProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function moveTo(id: string, targetIndex: number) {
    const currentIds = items.map((item) => item.id);
    const from = currentIds.indexOf(id);
    if (
      from === -1 ||
      targetIndex < 0 ||
      targetIndex >= currentIds.length ||
      from === targetIndex
    ) {
      return;
    }
    const next = [...currentIds];
    next.splice(from, 1);
    next.splice(targetIndex, 0, id);
    onReorder?.(next);
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const targetIndex = items.findIndex((item) => item.id === targetId);
    moveTo(draggingId, targetIndex);
    setDraggingId(null);
  }

  return (
    <div
      className={`grid grid-cols-1 gap-(--sp-5) sm:grid-cols-2 xl:grid-cols-3 ${className ?? ""}`}
    >
      {items.map((item, index) => {
        const selectId = `widget-position-${item.id}`;
        return (
          <div
            key={item.id}
            draggable
            onDragStart={() => setDraggingId(item.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(item.id)}
            onDragEnd={() => setDraggingId(null)}
            className={`group relative transition-opacity duration-(--transition-fast) ${
              draggingId === item.id ? "opacity-40" : ""
            }`}
          >
            <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
              <div
                className="hidden cursor-grab text-(--fg-muted) group-hover:block active:cursor-grabbing"
                aria-hidden="true"
              >
                <GripVertical className="h-4 w-4" />
              </div>
              <label htmlFor={selectId} className="sr-only">
                Mover &quot;{item.label}&quot; para outra posição
              </label>
              <select
                id={selectId}
                value={String(index + 1)}
                onChange={(event) =>
                  moveTo(item.id, Number(event.target.value) - 1)
                }
                className="h-7 rounded-sm border border-(--border) bg-(--surface) px-1.5 text-xs text-(--fg-muted) shadow-(--shadow-sm) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
              >
                {items.map((_, position) => (
                  <option key={position} value={position + 1}>
                    Posição {position + 1}
                  </option>
                ))}
              </select>
            </div>
            {item.content}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";

export interface WidgetGridItem {
  id: string;
  content: ReactNode;
}

export interface WidgetGridProps {
  items: WidgetGridItem[];
  onReorder?: (orderedIds: string[]) => void;
  className?: string;
}

export function WidgetGrid({ items, onReorder, className }: WidgetGridProps) {
  const [order, setOrder] = useState<string[]>(() =>
    items.map((item) => item.id),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const orderedItems = order
    .map((id) => itemsById.get(id))
    .filter((item): item is WidgetGridItem => item !== undefined);

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const next = [...order];
    const from = next.indexOf(draggingId);
    const to = next.indexOf(targetId);
    if (from === -1 || to === -1) return;
    next.splice(from, 1);
    next.splice(to, 0, draggingId);
    setOrder(next);
    onReorder?.(next);
    setDraggingId(null);
  }

  return (
    <div
      className={`grid grid-cols-1 gap-(--sp-5) sm:grid-cols-2 xl:grid-cols-3 ${className ?? ""}`}
    >
      {orderedItems.map((item) => (
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
          <div
            className="absolute right-3 top-3 z-10 cursor-grab text-(--fg-muted) opacity-0 transition-opacity duration-(--transition-fast) group-hover:opacity-100 active:cursor-grabbing"
            aria-hidden="true"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          {item.content}
        </div>
      ))}
    </div>
  );
}

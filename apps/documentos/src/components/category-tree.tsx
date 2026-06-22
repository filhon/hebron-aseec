"use client";

import { useState, useCallback } from "react";
import { ChevronRight, FolderOpen, Folder, LayoutGrid } from "lucide-react";
import type { Category } from "@hebron/types/documentos";

interface CategoryNodeProps {
  category: Category;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string | null) => void;
  onToggle: (id: string) => void;
}

function CategoryNode({
  category,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
}: CategoryNodeProps) {
  const isSelected = selectedId === category.id;
  const isExpanded = expandedIds.has(category.id);
  const hasChildren = category.children.length > 0;

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          onSelect(isSelected ? null : category.id);
          if (hasChildren) onToggle(category.id);
        }}
        className={[
          "w-full flex items-center gap-2 px-3 py-2 rounded-(--radius-sm) text-left",
          "text-[13.5px] transition-all duration-(--dur-fast)",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)",
          isSelected
            ? "bg-(--brand) text-(--brand-fg) font-semibold shadow-(--shadow-xs)"
            : "text-(--fg) hover:bg-(--bg-alt)",
        ].join(" ")}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        {/* Expand chevron */}
        <span
          className={[
            "shrink-0 transition-transform duration-(--dur-fast)",
            hasChildren ? "opacity-100" : "opacity-0 pointer-events-none",
            isExpanded ? "rotate-90" : "",
          ].join(" ")}
          aria-hidden="true"
        >
          <ChevronRight size={14} />
        </span>

        {/* Folder icon */}
        <span className="shrink-0" aria-hidden="true">
          {isExpanded && hasChildren ? (
            <FolderOpen
              size={15}
              className={isSelected ? "text-(--brand-fg)" : "text-(--brand)"}
            />
          ) : (
            <Folder
              size={15}
              className={isSelected ? "text-(--brand-fg)" : "text-(--fg-muted)"}
            />
          )}
        </span>

        {/* Label */}
        <span className="flex-1 truncate">{category.name}</span>

        {/* Doc count */}
        {category.documentCount > 0 && (
          <span
            className={[
              "shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
              isSelected
                ? "bg-white/20 text-(--brand-fg)"
                : "bg-(--bg-alt) text-(--fg-muted) border border-(--border)",
            ].join(" ")}
          >
            {category.documentCount}
          </span>
        )}
      </button>

      {/* Children */}
      {hasChildren && isExpanded && (
        <ul
          className="mt-0.5 space-y-0.5"
          role="group"
          aria-label={`Sub-categorias de ${category.name}`}
        >
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export interface CategoryTreeProps {
  categories: Category[];
  selectedId?: string | null;
  onSelect?: (categoryId: string | null) => void;
  className?: string;
}

export function CategoryTree({
  categories,
  selectedId: controlledSelectedId,
  onSelect,
  className = "",
}: CategoryTreeProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null,
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const selectedId =
    controlledSelectedId !== undefined
      ? controlledSelectedId
      : internalSelectedId;

  const handleSelect = useCallback(
    (id: string | null) => {
      setInternalSelectedId(id);
      onSelect?.(id);
    },
    [onSelect],
  );

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const totalDocs = categories.reduce((sum, c) => sum + c.documentCount, 0);

  return (
    <nav className={`${className}`} aria-label="Categorias de documentos">
      {/* "All" option */}
      <ul className="space-y-0.5">
        <li>
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={[
              "w-full flex items-center gap-2 px-3 py-2 rounded-(--radius-sm) text-left",
              "text-[13.5px] transition-all duration-(--dur-fast)",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)",
              selectedId === null
                ? "bg-(--brand) text-(--brand-fg) font-semibold shadow-(--shadow-xs)"
                : "text-(--fg) hover:bg-(--bg-alt)",
            ].join(" ")}
          >
            <span aria-hidden="true" className="shrink-0">
              <LayoutGrid
                size={15}
                className={
                  selectedId === null
                    ? "text-(--brand-fg)"
                    : "text-(--fg-muted)"
                }
              />
            </span>
            <span className="flex-1">Todos os documentos</span>
            {totalDocs > 0 && (
              <span
                className={[
                  "shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
                  selectedId === null
                    ? "bg-white/20 text-(--brand-fg)"
                    : "bg-(--bg-alt) text-(--fg-muted) border border-(--border)",
                ].join(" ")}
              >
                {totalDocs}
              </span>
            )}
          </button>
        </li>

        {/* Divider */}
        <li
          className="h-px bg-(--divider) mx-3 my-2"
          role="separator"
          aria-hidden="true"
        />

        {/* Category nodes */}
        {categories.map((category) => (
          <CategoryNode
            key={category.id}
            category={category}
            depth={0}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onSelect={handleSelect}
            onToggle={handleToggle}
          />
        ))}
      </ul>
    </nav>
  );
}

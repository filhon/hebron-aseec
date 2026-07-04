"use client";

import { useState, useCallback } from "react";
import { Search, X, ChevronDown, Filter, Tag as TagIcon } from "lucide-react";
import type { Category, Tag } from "@hebron/types/documentos";

export interface SearchFilters {
  query: string;
  categoryId: string | null;
  tagIds: string[];
}

export interface SearchBarProps {
  categories: Category[];
  tags: Tag[];
  initialFilters?: SearchFilters;
  onChange?: (filters: SearchFilters) => void;
  placeholder?: string;
  className?: string;
}

const EMPTY_FILTERS: SearchFilters = {
  query: "",
  categoryId: null,
  tagIds: [],
};

export function SearchBar({
  categories,
  tags,
  initialFilters,
  onChange,
  placeholder = "Buscar documentos por título…",
  className = "",
}: SearchBarProps) {
  const [query, setQuery] = useState(initialFilters?.query ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(
    initialFilters?.categoryId ?? null,
  );
  const [tagIds, setTagIds] = useState<string[]>(initialFilters?.tagIds ?? []);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const notify = useCallback(
    (
      nextQuery: string,
      nextCategoryId: string | null,
      nextTagIds: string[],
    ) => {
      onChange?.({
        query: nextQuery,
        categoryId: nextCategoryId,
        tagIds: nextTagIds,
      });
    },
    [onChange],
  );

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    notify(val, categoryId, tagIds);
  };

  const handleQueryClear = () => {
    setQuery("");
    notify("", categoryId, tagIds);
  };

  const handleCategoryChange = (id: string | null) => {
    setCategoryId(id);
    notify(query, id, tagIds);
  };

  const handleTagToggle = (id: string) => {
    const next = tagIds.includes(id)
      ? tagIds.filter((t) => t !== id)
      : [...tagIds, id];
    setTagIds(next);
    notify(query, categoryId, next);
  };

  const handleClearAll = () => {
    setQuery("");
    setCategoryId(null);
    setTagIds([]);
    onChange?.(EMPTY_FILTERS);
  };

  const hasActiveFilters = categoryId !== null || tagIds.length > 0;
  const hasAnyActive = query.trim() !== "" || hasActiveFilters;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Search input row */}
      <div className="flex gap-2">
        <div className="hb-field flex-1 min-w-0">
          <Search
            size={16}
            className="text-(--fg-muted) shrink-0"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={handleQueryChange}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-[13.5px] text-(--fg) placeholder:text-(--fg-muted)"
            aria-label={placeholder}
          />
          {query && (
            <button
              type="button"
              onClick={handleQueryClear}
              className="shrink-0 text-(--fg-muted) hover:text-(--fg) transition-colors duration-(--dur-fast)"
              aria-label="Limpar busca"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          aria-label="Filtros"
          className={[
            "hb-btn hb-btn-sm shrink-0 gap-1.5",
            hasActiveFilters ? "hb-btn-primary" : "hb-btn-secondary",
          ].join(" ")}
        >
          <Filter size={14} aria-hidden="true" />
          Filtros
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[10px] font-bold leading-none">
              {(categoryId ? 1 : 0) + tagIds.length}
            </span>
          )}
          <ChevronDown
            size={13}
            aria-hidden="true"
            className={`transition-transform duration-(--dur-fast) ${filtersOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Clear all */}
        {hasAnyActive && (
          <button
            type="button"
            onClick={handleClearAll}
            className="hb-btn hb-btn-ghost hb-btn-sm shrink-0"
            aria-label="Limpar todos os filtros"
          >
            <X size={14} aria-hidden="true" />
            Limpar
          </button>
        )}
      </div>

      {/* Expandable filter panel */}
      {filtersOpen && (
        <div className="hb-card p-4 flex flex-col gap-4">
          {/* Category filter */}
          {categories.length > 0 && (
            <fieldset className="flex flex-col gap-2 border-none p-0 m-0">
              <legend className="hb-section-label mb-1">Categoria</legend>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCategoryChange(null)}
                  className={`hb-chip ${categoryId === null ? "active" : ""}`}
                >
                  Todas
                </button>
                {categories.map((cat) => (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() =>
                      handleCategoryChange(
                        categoryId === cat.id ? null : cat.id,
                      )
                    }
                    className={`hb-chip ${categoryId === cat.id ? "active" : ""}`}
                  >
                    {cat.name}
                    {cat.documentCount > 0 && (
                      <span className="hb-chip-count">{cat.documentCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Divider */}
          {categories.length > 0 && tags.length > 0 && (
            <div className="h-px bg-(--divider)" aria-hidden="true" />
          )}

          {/* Tag filter */}
          {tags.length > 0 && (
            <fieldset className="flex flex-col gap-2 border-none p-0 m-0">
              <legend className="hb-section-label mb-1 inline-flex items-center gap-1.5">
                <TagIcon size={10} aria-hidden="true" />
                Tags
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const active = tagIds.includes(tag.id);
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.id)}
                      className={`hb-chip ${active ? "active" : ""}`}
                      aria-pressed={active}
                    >
                      {tag.color && !active && (
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                          aria-hidden="true"
                        />
                      )}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>
      )}

      {/* Active filter summary (collapsed state) */}
      {!filtersOpen && hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11.5px] text-(--fg-muted) font-medium">
            Filtrando por:
          </span>
          {categoryId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-medium bg-(--brand) text-(--brand-fg)">
              {categories.find((c) => c.id === categoryId)?.name ?? categoryId}
              <button
                type="button"
                onClick={() => handleCategoryChange(null)}
                className="opacity-70 hover:opacity-100 ml-0.5"
                aria-label="Remover filtro de categoria"
              >
                <X size={10} aria-hidden="true" />
              </button>
            </span>
          )}
          {tagIds.map((id) => {
            const tag = tags.find((t) => t.id === id);
            if (!tag) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-medium bg-(--brand) text-(--brand-fg)"
              >
                {tag.name}
                <button
                  type="button"
                  onClick={() => handleTagToggle(id)}
                  className="opacity-70 hover:opacity-100 ml-0.5"
                  aria-label={`Remover tag ${tag.name}`}
                >
                  <X size={10} aria-hidden="true" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

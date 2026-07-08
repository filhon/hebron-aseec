"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EmptyState, Input } from "@hebron/ui";

export interface SearchResultItem {
  id: string;
  module: string;
  title: string;
  description?: string;
  href: string;
}

export interface SearchGlobalProps {
  items: SearchResultItem[];
  placeholder?: string;
}

export function SearchGlobal({
  items,
  placeholder = "Buscar em todos os módulos…",
}: SearchGlobalProps) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    const matches = items.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term),
    );
    const byModule = new Map<string, SearchResultItem[]>();
    for (const match of matches) {
      const bucket = byModule.get(match.module) ?? [];
      bucket.push(match);
      byModule.set(match.module, bucket);
    }
    return Array.from(byModule.entries());
  }, [items, query]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="hb-card">
      <div className="hb-card-body">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          leftAdornment={<Search className="h-4 w-4" aria-hidden="true" />}
          aria-label="Busca global"
        />
      </div>
      {hasQuery && (
        <div className="hb-card-body" style={{ paddingTop: 0 }}>
          {grouped.length === 0 ? (
            <EmptyState
              title="Nenhum resultado encontrado"
              description={`Não encontramos nada para "${query}".`}
              icon={Search}
              hideQuote
            />
          ) : (
            grouped.map(([module, results]) => (
              <div key={module} style={{ marginBottom: 14 }}>
                <p className="hb-section-label">{module}</p>
                <ul
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  {results.map((result) => (
                    <li key={result.id}>
                      <a
                        href={result.href}
                        className="block rounded-(--radius-xs) p-2 transition-colors duration-(--transition-fast) hover:bg-(--surface-alt)"
                      >
                        <span
                          className="text-(--text-sm) text-(--fg)"
                          style={{ fontWeight: 600 }}
                        >
                          {result.title}
                        </span>
                        {result.description && (
                          <span
                            className="text-(--text-xs) text-(--fg-muted)"
                            style={{ display: "block", marginTop: 2 }}
                          >
                            {result.description}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

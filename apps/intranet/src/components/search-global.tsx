"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { EmptyState, ErrorState, Input } from "@hebron/ui";
import { globalSearch } from "../actions/search";

export interface SearchResultItem {
  id: string;
  module: string;
  title: string;
  description?: string;
  href: string;
}

export interface SearchGlobalProps {
  placeholder?: string;
}

const DEBOUNCE_MS = 300;

export function SearchGlobal({
  placeholder = "Buscar em todos os módulos…",
}: SearchGlobalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    const currentRequest = ++requestId.current;

    const timeout = setTimeout(() => {
      void globalSearch({ query: term })
        .then((response) => {
          if (currentRequest !== requestId.current) return;
          setResults(response?.data?.results ?? []);
          setIsLoading(false);
        })
        .catch(() => {
          if (currentRequest !== requestId.current) return;
          setResults([]);
          setIsLoading(false);
          setHasError(true);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query]);

  const grouped = useMemo(() => {
    const byModule = new Map<string, SearchResultItem[]>();
    for (const result of results) {
      const bucket = byModule.get(result.module) ?? [];
      bucket.push(result);
      byModule.set(result.module, bucket);
    }
    return Array.from(byModule.entries());
  }, [results]);

  const hasQuery = query.trim().length >= 2;

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
          {hasError ? (
            <ErrorState
              title="Não foi possível buscar"
              description="Tente novamente em instantes."
            />
          ) : isLoading ? (
            <p className="text-sm" style={{ padding: "16px 0" }}>
              Buscando…
            </p>
          ) : grouped.length === 0 ? (
            <EmptyState
              title="Nenhum resultado encontrado"
              description={`Não encontramos nada para "${query}".`}
              icon={Search}
              hideQuote
            />
          ) : (
            grouped.map(([module, items]) => (
              <div key={module} style={{ marginBottom: 14 }}>
                <p className="hb-section-label">{module}</p>
                <ul
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  {items.map((result) => {
                    // Busca cobre todo o ecossistema: href pode ser rota
                    // interna (intranet) ou absoluta para outro subdomínio.
                    // Só a interna navega pelo cliente.
                    const isInternal = result.href.startsWith("/");
                    const resultClassName =
                      "block rounded-xs p-2 transition-colors duration-(--transition-fast) hover:bg-(--surface-alt)";
                    const resultContent = (
                      <>
                        <span className="text-sm" style={{ fontWeight: 600 }}>
                          {result.title}
                        </span>
                        {result.description && (
                          <span
                            className="text-xs"
                            style={{ display: "block", marginTop: 2 }}
                          >
                            {result.description}
                          </span>
                        )}
                      </>
                    );
                    return (
                      <li key={result.id}>
                        {isInternal ? (
                          <Link href={result.href} className={resultClassName}>
                            {resultContent}
                          </Link>
                        ) : (
                          <a href={result.href} className={resultClassName}>
                            {resultContent}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

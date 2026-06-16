"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  X,
  ChevronRight,
  FileText,
  Scroll,
  Filter,
} from "lucide-react";
import { PublicNav } from "../../components/public-nav";
import { mockAllDocuments, mockCategories } from "../../lib/mock-data";
import type { Document, Edital } from "@hebron/types/documentos";

type DocOrEdital = Document | Edital;

type TypeFilter =
  | "all"
  | "edital"
  | "legal"
  | "fiscal"
  | "sop"
  | "report"
  | "policy"
  | "other";

const SUGGESTIONS = [
  "edital projetos",
  "LGPD",
  "certidão",
  "aprovação despesas",
  "missionário",
  "manual colaborador",
];

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const re = new RegExp(
    `(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark
        key={i}
        style={{
          background: "var(--hb-orange-muted)",
          color: "var(--hb-orange-deep)",
          fontWeight: 700,
          padding: "0 2px",
          borderRadius: 2,
        }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function SearchResults() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialCat = searchParams.get("categoria") ?? null;

  const [query, setQuery] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState<string | null>(initialCat);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
    setCategoryId(initialCat);
  }, [initialQuery, initialCat]);

  const publicDocs = useMemo(
    () =>
      mockAllDocuments.filter(
        (d) => d.visibility === "public" || d.visibility === "internal",
      ),
    [],
  );

  const results = useMemo<DocOrEdital[]>(() => {
    const q = query.toLowerCase().trim();
    let docs = publicDocs;

    if (categoryId) {
      docs = docs.filter((d) => d.categoryId === categoryId);
    }

    if (typeFilter !== "all") {
      docs = docs.filter((d) => d.type === typeFilter);
    }

    if (!q) return docs.slice(0, 10);

    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q) ||
        d.tags.some((t) => t.name.toLowerCase().includes(q)) ||
        d.category.name.toLowerCase().includes(q),
    );
  }, [publicDocs, query, categoryId, typeFilter]);

  const editalCount = results.filter((d) => d.type === "edital").length;
  const docCount = results.length - editalCount;

  return (
    <main className="docs-page-narrow">
      {/* Breadcrumbs */}
      <nav className="docs-breadcrumbs" aria-label="Navegação estrutural">
        <Link href="/">Início</Link>
        <ChevronRight
          size={12}
          className="docs-breadcrumbs-sep"
          aria-hidden="true"
        />
        <span style={{ color: "var(--fg)" }}>Busca</span>
      </nav>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <span className="hb-eyebrow">Busca global</span>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(26px, 4vw, 40px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            margin: "8px 0 10px",
          }}
        >
          {query ? (
            <>
              Resultados para{" "}
              <span style={{ color: "var(--hb-orange)" }}>"{query}"</span>
            </>
          ) : (
            "O que você está procurando?"
          )}
        </h1>
        <p style={{ fontSize: 14, color: "var(--fg-muted)", margin: 0 }}>
          {query
            ? `${results.length} documento${results.length === 1 ? "" : "s"} encontrado${results.length === 1 ? "" : "s"}.`
            : "Busque por título, categoria, tags ou conteúdo."}
        </p>
      </div>

      {/* Search input */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <div className="hb-field" style={{ fontSize: 15 }}>
          <Search
            size={18}
            style={{ color: "var(--fg-muted)", flexShrink: 0 }}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar documentos, editais, políticas…"
            autoFocus
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 15,
              color: "var(--fg)",
            }}
            aria-label="Campo de busca"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--fg-muted)",
                padding: 0,
                display: "flex",
              }}
              aria-label="Limpar busca"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions (empty state) */}
      {!query && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="hb-chip"
              onClick={() => setQuery(s)}
            >
              <Search size={12} aria-hidden="true" />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Filter row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div className="hb-chip-row" style={{ flex: 1, marginBottom: 0 }}>
          <button
            type="button"
            className={`hb-chip ${typeFilter === "all" ? "active" : ""}`}
            onClick={() => setTypeFilter("all")}
          >
            Todos
            <span className="hb-chip-count">{results.length}</span>
          </button>
          <button
            type="button"
            className={`hb-chip ${typeFilter === "edital" ? "active" : ""}`}
            onClick={() => setTypeFilter("edital")}
          >
            <Scroll size={12} aria-hidden="true" />
            Editais
            <span className="hb-chip-count">{editalCount}</span>
          </button>
          <button
            type="button"
            className={`hb-chip ${typeFilter !== "all" && typeFilter !== "edital" ? "active" : ""}`}
            onClick={() => setTypeFilter(typeFilter === "sop" ? "all" : "sop")}
          >
            <FileText size={12} aria-hidden="true" />
            Documentos
            <span className="hb-chip-count">{docCount}</span>
          </button>
        </div>

        <button
          type="button"
          className={`hb-btn hb-btn-sm ${showFilters ? "hb-btn-primary" : "hb-btn-secondary"}`}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
        >
          <Filter size={13} aria-hidden="true" />
          Filtros
          {categoryId && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              1
            </span>
          )}
        </button>
      </div>

      {/* Expandable category filter */}
      {showFilters && (
        <div
          className="hb-card"
          style={{ padding: "18px 22px", marginBottom: 20 }}
        >
          <p className="hb-section-label">Categoria</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              className={`hb-chip ${!categoryId ? "active" : ""}`}
              onClick={() => setCategoryId(null)}
            >
              Todas
            </button>
            {mockCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`hb-chip ${categoryId === cat.id ? "active" : ""}`}
                onClick={() =>
                  setCategoryId(categoryId === cat.id ? null : cat.id)
                }
              >
                {cat.name}
                <span className="hb-chip-count">{cat.documentCount}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length === 0 ? (
        <div className="hb-empty">
          <div className="hb-empty-icon">
            <Search size={24} aria-hidden="true" />
          </div>
          <b>Nenhum resultado encontrado</b>
          <p className="hb-empty-body">
            Tente reformular a busca ou navegar pelas categorias.
          </p>
          <p className="hb-empty-quote">
            "Pedí, e dar-se-vos-á; buscai, e achareis; batei, e abrir-se-vos-á."
            <span className="hb-empty-cite">Mateus 7:7</span>
          </p>
        </div>
      ) : (
        <div className="hb-card hb-card-overflow" style={{ padding: "0 24px" }}>
          {results.map((doc) => {
            const isEdital = doc.type === "edital";
            const href = isEdital ? `/editais/${doc.slug}` : `/${doc.slug}`;

            return (
              <Link key={doc.id} href={href} className="docs-search-result">
                <div className="docs-search-fmt">
                  {isEdital ? (
                    <>
                      <Scroll size={18} aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      <span>PDF</span>
                    </>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className="docs-search-breadcrumb">
                    {doc.category.name} ·{" "}
                    <span style={{ textTransform: "capitalize" }}>
                      {doc.type.replace("_", " ")}
                    </span>{" "}
                    · v{doc.currentVersion?.version ?? 1}
                  </div>
                  <div className="docs-search-title">
                    {highlight(doc.title, query)}
                  </div>
                  {doc.description && (
                    <p className="docs-search-excerpt">
                      {highlight(
                        doc.description.slice(0, 140) +
                          (doc.description.length > 140 ? "…" : ""),
                        query,
                      )}
                    </p>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                      fontSize: 12,
                      color: "var(--fg-muted)",
                    }}
                  >
                    <span
                      className="hb-badge"
                      style={{
                        background: "var(--bg-alt)",
                        color: "var(--fg-muted)",
                        fontSize: 11,
                        padding: "2px 8px",
                      }}
                    >
                      {doc.visibility === "public"
                        ? "Público"
                        : doc.visibility === "internal"
                          ? "Interno"
                          : "Restrito"}
                    </span>
                    <span>{formatDate(doc.updatedAt)}</span>
                    {doc.tags.slice(0, 2).map((t) => (
                      <span key={t.id}>#{t.name}</span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function BuscaPage() {
  return (
    <>
      <PublicNav />
      <Suspense
        fallback={
          <main className="docs-page-narrow">
            <div className="hb-empty">
              <div className="hb-empty-icon">
                <Search size={24} aria-hidden="true" />
              </div>
              <b>Carregando…</b>
            </div>
          </main>
        }
      >
        <SearchResults />
      </Suspense>
    </>
  );
}

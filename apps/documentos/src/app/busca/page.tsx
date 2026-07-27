import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  X,
  ChevronRight,
  FileText,
  Scroll,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { PublicNav } from "../../components/public-nav";
import { BuscaSearchBar } from "./_search-bar-client";
import { VisibilityBadge } from "../../components/visibility-badge";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  categories,
  documentTags,
  tags,
  documentVersions,
} from "@hebron/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { getOptionalActorId } from "../../lib/session";
import { searchDocumentsQuery } from "../../lib/search-query";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Busca — Documentos Hebron Aseec",
  description: "Busque documentos, editais e políticas da Hebron Aseec.",
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    tags?: string;
    tipo?: string;
  }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
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

function extractDescription(contentMd: string | null): string | null {
  if (!contentMd) return null;
  const line = contentMd
    .split("\n")
    .find((l) => l.trim() !== "" && !l.startsWith("#") && !l.startsWith("-"));
  return line?.trim().slice(0, 240) ?? null;
}

type ResultRow = {
  id: string;
  title: string;
  slug: string;
  contentMd: string | null;
  visibility: "public" | "internal" | "restricted";
  categoryId: string | null;
  categoryName: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  isEdital: boolean;
};

const SUGGESTIONS = [
  "edital projetos",
  "LGPD",
  "certidão",
  "aprovação despesas",
  "missionário",
  "manual colaborador",
];

type TipoFilter = "all" | "edital" | "doc";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BuscaPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const catId = sp.categoria ?? null;
  const tagIds = sp.tags ? sp.tags.split(",").filter(Boolean) : [];
  const tipo = (
    ["all", "edital", "doc"].includes(sp.tipo ?? "all")
      ? (sp.tipo ?? "all")
      : "all"
  ) as TipoFilter;

  const actorId = await getOptionalActorId();

  // Build "try again" link from the raw search params, before the query
  // that can fail — same URL, RSC reload re-runs the search.
  const retryHref = (() => {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (sp.categoria) p.set("categoria", sp.categoria);
    if (sp.tags) p.set("tags", sp.tags);
    if (sp.tipo) p.set("tipo", sp.tipo);
    const str = p.toString();
    return `/busca${str ? `?${str}` : ""}`;
  })();

  // Load categories, tags, results, result-tags and versions in one
  // authenticated context — RLS filters results by visibility for real
  // (public/internal for anon/authenticated, restricted for the roles
  // allowed to see it).
  async function runSearchQuery() {
    return withAuthenticatedContext(
      actorId ? { actorId } : null,
      async (tx) => {
        const [catRows, allTagRows, editalRows, docRows] = await Promise.all([
          tx
            .select({
              id: categories.id,
              name: categories.name,
              slug: categories.slug,
            })
            .from(categories)
            .orderBy(categories.name),

          tx
            .select({ id: tags.id, name: tags.name, slug: tags.slug })
            .from(tags)
            .orderBy(tags.name),

          // Edital results — mesma consulta de lib/search-query.ts usada
          // pela action de busca; ver P-1.20b (fim da duplicação ILIKE).
          tipo === "doc"
            ? Promise.resolve([] as ResultRow[])
            : searchDocumentsQuery(tx, {
                query: q,
                categoryId: catId ?? undefined,
                tagIds,
                editalFilter: "only",
                orderBy: "publishedAt",
                limit: tipo === "edital" ? 20 : 10,
              }).then((rows) =>
                rows.map(
                  (r): ResultRow => ({
                    id: r.id,
                    title: r.title,
                    slug: r.slug,
                    contentMd: r.contentMd,
                    visibility: r.visibility,
                    categoryId: r.categoryId,
                    categoryName: r.categoryName,
                    publishedAt: r.publishedAt,
                    updatedAt: r.updatedAt,
                    isEdital: true,
                  }),
                ),
              ),

          // Document results (non-editals)
          tipo === "edital"
            ? Promise.resolve([] as ResultRow[])
            : searchDocumentsQuery(tx, {
                query: q,
                categoryId: catId ?? undefined,
                tagIds,
                editalFilter: "exclude",
                orderBy: "updatedAt",
                limit: tipo === "doc" ? 20 : 10,
              }).then((rows) =>
                rows.map(
                  (r): ResultRow => ({
                    id: r.id,
                    title: r.title,
                    slug: r.slug,
                    contentMd: r.contentMd,
                    visibility: r.visibility,
                    categoryId: r.categoryId,
                    categoryName: r.categoryName,
                    publishedAt: r.publishedAt,
                    updatedAt: r.updatedAt,
                    isEdital: false,
                  }),
                ),
              ),
        ]);

        // Merge and sort all results
        const allResults: ResultRow[] = [...editalRows, ...docRows].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );

        // Fetch tags for results (N+2 pattern)
        const resultIds = allResults.map((r) => r.id);
        const tagRows =
          resultIds.length > 0
            ? await tx
                .select({
                  documentId: documentTags.documentId,
                  tagId: tags.id,
                  tagName: tags.name,
                })
                .from(documentTags)
                .innerJoin(tags, eq(tags.id, documentTags.tagId))
                .where(inArray(documentTags.documentId, resultIds))
            : [];

        const tagMap = new Map<string, Array<{ id: string; name: string }>>();
        for (const t of tagRows) {
          const arr = tagMap.get(t.documentId) ?? [];
          arr.push({ id: t.tagId, name: t.tagName });
          tagMap.set(t.documentId, arr);
        }

        // Fetch latest version numbers
        const versionRows =
          resultIds.length > 0
            ? await tx
                .select({
                  documentId: documentVersions.documentId,
                  versionNumber: documentVersions.versionNumber,
                })
                .from(documentVersions)
                .where(inArray(documentVersions.documentId, resultIds))
                .orderBy(desc(documentVersions.versionNumber))
            : [];

        const versionMap = new Map<string, number>();
        for (const v of versionRows) {
          if (!versionMap.has(v.documentId)) {
            versionMap.set(v.documentId, v.versionNumber);
          }
        }

        return { catRows, allTagRows, allResults, tagMap, versionMap };
      },
    );
  }

  let searchData: Awaited<ReturnType<typeof runSearchQuery>> | null = null;
  let hasError = false;

  try {
    searchData = await runSearchQuery();
  } catch {
    hasError = true;
  }

  if (hasError || searchData === null) {
    return (
      <>
        <PublicNav />
        <main
          className="docs-page-narrow"
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="hb-empty">
            <div className="hb-empty-icon">
              <AlertTriangle size={24} aria-hidden="true" />
            </div>
            <b>Não foi possível carregar a busca</b>
            <p className="hb-empty-body">
              Verifique sua conexão e tente novamente.
            </p>
            <Link
              href={retryHref}
              className="hb-btn hb-btn-primary"
              style={{ marginTop: 16 }}
            >
              <RefreshCw size={14} aria-hidden="true" />
              Tentar novamente
            </Link>
          </div>
        </main>
      </>
    );
  }

  const { catRows, allTagRows, allResults, tagMap, versionMap } = searchData;

  const editalCount = allResults.filter((r) => r.isEdital).length;
  const docCount = allResults.length - editalCount;

  // Build clear URL (remove q but keep other params)
  function buildUrl(overrides: Record<string, string | null>) {
    const p = new URLSearchParams();
    if (q && overrides.q !== null) p.set("q", overrides.q ?? q);
    if (catId && overrides.categoria !== null)
      p.set("categoria", overrides.categoria ?? catId);
    if (tagIds.length > 0 && overrides.tags !== null)
      p.set("tags", overrides.tags ?? tagIds.join(","));
    if (tipo !== "all" && overrides.tipo !== null)
      p.set("tipo", overrides.tipo ?? tipo);
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== null && !p.has(k)) p.set(k, v);
    }
    const str = p.toString();
    return `/busca${str ? `?${str}` : ""}`;
  }

  return (
    <>
      <PublicNav />

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
            {q ? (
              <>
                Resultados para{" "}
                <span style={{ color: "var(--hb-orange)" }}>"{q}"</span>
              </>
            ) : (
              "O que você está procurando?"
            )}
          </h1>
          <p style={{ fontSize: 14, color: "var(--fg-muted)", margin: 0 }}>
            {q
              ? `${allResults.length} documento${allResults.length === 1 ? "" : "s"} encontrado${allResults.length === 1 ? "" : "s"}.`
              : "Busque por título, categoria, tags ou conteúdo."}
          </p>
        </div>

        {/* Search bar with category and tag filters */}
        <div style={{ marginBottom: 16 }}>
          <BuscaSearchBar
            categories={catRows.map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              description: null,
              parentId: null,
              children: [],
              documentCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))}
            tags={allTagRows.map((t) => ({ ...t, color: null }))}
            initialFilters={{ query: q, categoryId: catId, tagIds }}
          />
        </div>

        {/* Suggestions when no query */}
        {!q && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 28,
            }}
          >
            {SUGGESTIONS.map((s) => (
              <Link
                key={s}
                href={`/busca?q=${encodeURIComponent(s)}`}
                className="hb-chip"
              >
                <Search size={12} aria-hidden="true" />
                {s}
              </Link>
            ))}
          </div>
        )}

        {/* Type filter chips */}
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
            <Link
              href={buildUrl({ tipo: null })}
              className={`hb-chip ${tipo === "all" ? "active" : ""}`}
              aria-pressed={tipo === "all"}
            >
              Todos
              <span className="hb-chip-count">{allResults.length}</span>
            </Link>
            <Link
              href={buildUrl({ tipo: "edital" })}
              className={`hb-chip ${tipo === "edital" ? "active" : ""}`}
              aria-pressed={tipo === "edital"}
            >
              <Scroll size={12} aria-hidden="true" />
              Editais
              <span className="hb-chip-count">{editalCount}</span>
            </Link>
            <Link
              href={buildUrl({ tipo: "doc" })}
              className={`hb-chip ${tipo === "doc" ? "active" : ""}`}
              aria-pressed={tipo === "doc"}
            >
              <FileText size={12} aria-hidden="true" />
              Documentos
              <span className="hb-chip-count">{docCount}</span>
            </Link>
          </div>
        </div>

        {/* Results */}
        {allResults.length === 0 ? (
          <div className="hb-empty">
            <div className="hb-empty-icon">
              <Search size={24} aria-hidden="true" />
            </div>
            <b>Nenhum resultado encontrado</b>
            <p className="hb-empty-body">
              Tente reformular a busca ou navegar pelas categorias.
            </p>
            {(q || catId || tagIds.length > 0) && (
              <Link
                href="/busca"
                className="hb-btn hb-btn-secondary"
                style={{ marginTop: 16 }}
              >
                <X size={13} aria-hidden="true" />
                Limpar filtros
              </Link>
            )}
            <p className="hb-empty-quote">
              "Pedí, e dar-se-vos-á; buscai, e achareis; batei, e
              abrir-se-vos-á."
              <span className="hb-empty-cite">Mateus 7:7</span>
            </p>
          </div>
        ) : (
          <div
            className="hb-card hb-card-overflow"
            style={{ padding: "0 24px" }}
          >
            {allResults.map((result) => {
              const href = result.isEdital
                ? `/editais/${result.slug}`
                : `/${result.slug}`;
              const description = extractDescription(result.contentMd);
              const docTags = tagMap.get(result.id) ?? [];
              const version = versionMap.get(result.id) ?? 1;

              return (
                <Link
                  key={result.id}
                  href={href}
                  className="docs-search-result"
                >
                  <div className="docs-search-fmt">
                    {result.isEdital ? (
                      <Scroll size={18} aria-hidden="true" />
                    ) : (
                      <span>PDF</span>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div className="docs-search-breadcrumb">
                      {result.categoryName ?? "Sem categoria"} ·{" "}
                      {result.isEdital ? "Edital" : "Documento"} · v{version}
                    </div>
                    <div className="docs-search-title">
                      {highlight(result.title, q)}
                    </div>
                    {description && (
                      <p className="docs-search-excerpt">
                        {highlight(
                          description.slice(0, 140) +
                            (description.length > 140 ? "…" : ""),
                          q,
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
                      <VisibilityBadge
                        visibility={result.visibility}
                        size="sm"
                      />
                      <span>{formatDate(result.updatedAt)}</span>
                      {docTags.slice(0, 2).map((t) => (
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
    </>
  );
}

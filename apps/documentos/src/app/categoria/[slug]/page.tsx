import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  FileText,
  Scale,
  Banknote,
  Users,
  Scroll,
  Workflow,
  BarChart2,
  LayoutGrid,
  List,
} from "lucide-react";
import { PublicNav } from "../../../components/public-nav";
import { DocumentCard } from "../../../components/document-card";
import { EditalCard } from "../../../components/edital-card";
import { VisibilityBadge } from "../../../components/visibility-badge";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  documents,
  editals,
  categories,
  documentTags,
  tags,
  documentVersions,
} from "@hebron/db/schema";
import { and, eq, isNull, isNotNull, desc, inArray } from "drizzle-orm";
import type {
  Document,
  Edital,
  DocumentVersion,
  DocumentVisibility,
} from "@hebron/types/documentos";
import { getOptionalActorId } from "../../../lib/session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    sub?: string;
    vis?: string;
    periodo?: string;
    view?: string;
  }>;
}

// ─── Category icons (mesmo mapeamento de app/page.tsx) ────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "juridico-legal": <Scale size={28} aria-hidden="true" />,
  "fiscal-contabil": <Banknote size={28} aria-hidden="true" />,
  "recursos-humanos": <Users size={28} aria-hidden="true" />,
  "editais-chamadas": <Scroll size={28} aria-hidden="true" />,
  "procedimentos-internos": <Workflow size={28} aria-hidden="true" />,
  "comunicacoes-relatorios": <BarChart2 size={28} aria-hidden="true" />,
};

const VIS_ORDER: DocumentVisibility[] = ["public", "internal", "restricted"];
const VIS_LABELS: Record<DocumentVisibility, string> = {
  public: "Públicos",
  internal: "Internos",
  restricted: "Restritos",
};

type PeriodoFilter = "tudo" | "12" | "24";
type ViewMode = "grid" | "list";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function getMimeType(fileUrl: string | null, contentMd: string | null): string {
  if (fileUrl?.endsWith(".pdf")) return "application/pdf";
  if (contentMd) return "text/markdown";
  return "application/octet-stream";
}

function periodCutoff(periodo: PeriodoFilter): Date | null {
  if (periodo === "12") return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  if (periodo === "24")
    return new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
  return null;
}

type DbRow = {
  id: string;
  title: string;
  slug: string;
  contentMd: string | null;
  fileUrl: string | null;
  visibility: DocumentVisibility;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  authorId: string;
  publishedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  editalOpensAt?: Date | null;
  editalClosesAt?: Date | null;
  editalProjectType?: string | null;
};

type ResultRow = DbRow & { isEdital: boolean };

type DbVersionRow = {
  id: string;
  documentId: string;
  versionNumber: number;
  fileUrl: string | null;
  contentMd: string | null;
  createdBy: string;
  createdAt: Date;
};

type DocTag = { id: string; name: string; slug: string };

function adaptVersion(v: DbVersionRow): DocumentVersion {
  return {
    id: v.id,
    documentId: v.documentId,
    version: v.versionNumber,
    storageKey: v.fileUrl ?? "",
    fileSizeBytes: 0,
    mimeType: getMimeType(v.fileUrl, v.contentMd),
    notes: null,
    publishedBy: v.createdBy,
    publishedAt: v.createdAt,
  };
}

function makeCat(id: string | null, name: string | null, slug: string | null) {
  return {
    id: id ?? "",
    name: name ?? "Sem categoria",
    slug: slug ?? "",
    description: null,
    parentId: null,
    children: [],
    documentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function adaptDoc(
  row: ResultRow,
  docTags: DocTag[],
  latestVersion: DbVersionRow | null,
): Document {
  const cv = latestVersion ? adaptVersion(latestVersion) : null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: extractDescription(row.contentMd),
    type: "other",
    visibility: row.visibility,
    status: row.publishedAt ? "published" : "draft",
    categoryId: row.categoryId ?? "",
    category: makeCat(row.categoryId, row.categoryName, row.categorySlug),
    tags: docTags.map((t) => ({ ...t, color: null })),
    currentVersionId: cv?.id ?? null,
    currentVersion: cv,
    publishedBy: row.authorId,
    publishedAt: row.publishedAt,
    createdBy: row.authorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function adaptEdital(
  row: ResultRow,
  docTags: DocTag[],
  latestVersion: DbVersionRow | null,
): Edital {
  const cv = latestVersion ? adaptVersion(latestVersion) : null;
  const cycleType =
    !row.editalOpensAt && !row.editalClosesAt
      ? ("pontual" as const)
      : ("anual" as const);
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: extractDescription(row.contentMd),
    type: "edital",
    visibility: row.visibility,
    status: row.publishedAt ? "published" : "draft",
    categoryId: row.categoryId ?? "",
    category: makeCat(row.categoryId, row.categoryName, row.categorySlug),
    tags: docTags.map((t) => ({ ...t, color: null })),
    currentVersionId: cv?.id ?? null,
    currentVersion: cv,
    publishedBy: row.authorId,
    publishedAt: row.publishedAt,
    createdBy: row.authorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    cycleType,
    opensAt: row.editalOpensAt ?? null,
    closesAt: row.editalClosesAt ?? null,
    projectType: row.editalProjectType ?? null,
    projectCategory: null,
    faq: [],
  };
}

// ─── DB query ─────────────────────────────────────────────────────────────────

async function buildCategoryPageData(slug: string, actorId: string | null) {
  return withAuthenticatedContext(actorId ? { actorId } : null, async (tx) => {
    const catRows = await tx
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
      })
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    const cat = catRows[0];
    if (!cat) return null;

    const subRows = await tx
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .where(eq(categories.parentId, cat.id))
      .orderBy(categories.name);

    const scopeIds = [cat.id, ...subRows.map((s) => s.id)];

    const [editalRows, docRows] = await Promise.all([
      tx
        .select({
          id: documents.id,
          title: documents.title,
          slug: documents.slug,
          contentMd: documents.contentMd,
          fileUrl: documents.fileUrl,
          visibility: documents.visibility,
          categoryId: documents.categoryId,
          categoryName: categories.name,
          categorySlug: categories.slug,
          authorId: documents.authorId,
          publishedAt: documents.publishedAt,
          deletedAt: documents.deletedAt,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
          editalOpensAt: editals.opensAt,
          editalClosesAt: editals.closesAt,
          editalProjectType: editals.projectType,
        })
        .from(editals)
        .innerJoin(documents, eq(editals.id, documents.id))
        .leftJoin(categories, eq(categories.id, documents.categoryId))
        .where(
          and(
            inArray(documents.categoryId, scopeIds),
            isNull(documents.deletedAt),
            isNotNull(documents.publishedAt),
          ),
        )
        .orderBy(desc(documents.updatedAt))
        .then((rows) => rows.map((r) => ({ ...r, isEdital: true as const }))),

      tx
        .select({
          id: documents.id,
          title: documents.title,
          slug: documents.slug,
          contentMd: documents.contentMd,
          fileUrl: documents.fileUrl,
          visibility: documents.visibility,
          categoryId: documents.categoryId,
          categoryName: categories.name,
          categorySlug: categories.slug,
          authorId: documents.authorId,
          publishedAt: documents.publishedAt,
          deletedAt: documents.deletedAt,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
          editalId: editals.id,
        })
        .from(documents)
        .leftJoin(categories, eq(categories.id, documents.categoryId))
        .leftJoin(editals, eq(editals.id, documents.id))
        .where(
          and(
            inArray(documents.categoryId, scopeIds),
            isNull(documents.deletedAt),
            isNotNull(documents.publishedAt),
            isNull(editals.id),
          ),
        )
        .orderBy(desc(documents.updatedAt))
        .then((rows) => rows.map((r) => ({ ...r, isEdital: false as const }))),
    ]);

    const baseRows: ResultRow[] = [...editalRows, ...docRows].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    const rowIds = baseRows.map((r) => r.id);
    const tagRows =
      rowIds.length > 0
        ? await tx
            .select({
              documentId: documentTags.documentId,
              tagId: tags.id,
              tagName: tags.name,
              tagSlug: tags.slug,
            })
            .from(documentTags)
            .innerJoin(tags, eq(tags.id, documentTags.tagId))
            .where(inArray(documentTags.documentId, rowIds))
        : [];

    const tagMap = new Map<string, DocTag[]>();
    for (const t of tagRows) {
      const arr = tagMap.get(t.documentId) ?? [];
      arr.push({ id: t.tagId, name: t.tagName, slug: t.tagSlug });
      tagMap.set(t.documentId, arr);
    }

    const versionRows =
      rowIds.length > 0
        ? await tx
            .select()
            .from(documentVersions)
            .where(inArray(documentVersions.documentId, rowIds))
            .orderBy(desc(documentVersions.versionNumber))
        : [];

    const versionMap = new Map<string, DbVersionRow>();
    for (const v of versionRows) {
      if (!versionMap.has(v.documentId)) versionMap.set(v.documentId, v);
    }

    return { cat, subRows, baseRows, tagMap, versionMap };
  });
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const actorId = await getOptionalActorId();
  const rows = await withAuthenticatedContext(
    actorId ? { actorId } : null,
    (tx) =>
      tx
        .select({ name: categories.name })
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1),
  );
  const cat = rows[0];
  if (!cat) return {};
  return {
    title: `${cat.name} — Documentos Hebron Aseec`,
    description: `Documentos e editais da categoria ${cat.name} disponíveis para o seu perfil.`,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CategoriaPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const actorId = await getOptionalActorId();

  const data = await buildCategoryPageData(slug, actorId);
  if (!data) notFound();

  const { cat, subRows, baseRows, tagMap, versionMap } = data;

  const activeSub = subRows.find((s) => s.slug === sp.sub) ?? null;
  const activeVis: DocumentVisibility | null = (VIS_ORDER as string[]).includes(
    sp.vis ?? "",
  )
    ? (sp.vis as DocumentVisibility)
    : null;
  const periodo: PeriodoFilter =
    sp.periodo === "12" || sp.periodo === "24" ? sp.periodo : "tudo";
  const view: ViewMode = sp.view === "list" ? "list" : "grid";

  const availableVisibilities = VIS_ORDER.filter((v) =>
    baseRows.some((r) => r.visibility === v),
  );

  const subCounts = new Map<string, number>();
  for (const s of subRows) {
    subCounts.set(s.id, baseRows.filter((r) => r.categoryId === s.id).length);
  }

  const cutoff = periodCutoff(periodo);
  const filteredRows = baseRows
    .filter((r) => (activeSub ? r.categoryId === activeSub.id : true))
    .filter((r) => (activeVis ? r.visibility === activeVis : true))
    .filter((r) =>
      cutoff ? new Date(r.updatedAt).getTime() >= cutoff.getTime() : true,
    );

  function buildUrl(overrides: {
    sub?: string | null;
    vis?: string | null;
    periodo?: string | null;
    view?: string | null;
  }): string {
    const merged = {
      sub: activeSub?.slug ?? null,
      vis: activeVis,
      periodo: periodo === "tudo" ? null : periodo,
      view: view === "grid" ? null : view,
      ...overrides,
    };
    const p = new URLSearchParams();
    if (merged.sub) p.set("sub", merged.sub);
    if (merged.vis) p.set("vis", merged.vis);
    if (merged.periodo) p.set("periodo", merged.periodo);
    if (merged.view) p.set("view", merged.view);
    const str = p.toString();
    return `/categoria/${slug}${str ? `?${str}` : ""}`;
  }

  return (
    <>
      <PublicNav />

      <main className="docs-page">
        {/* Breadcrumbs */}
        <nav className="docs-breadcrumbs" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <ChevronRight
            size={12}
            className="docs-breadcrumbs-sep"
            aria-hidden="true"
          />
          <span>Categorias</span>
          <ChevronRight
            size={12}
            className="docs-breadcrumbs-sep"
            aria-hidden="true"
          />
          <span style={{ color: "var(--fg)" }}>{cat.name}</span>
        </nav>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "var(--hb-blue)",
              color: "var(--hb-white)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {CATEGORY_ICONS[cat.slug] ?? (
              <FileText size={28} aria-hidden="true" />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="hb-eyebrow">Categoria</span>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(24px, 3.5vw, 36px)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                margin: "6px 0 6px",
              }}
            >
              {cat.name}
            </h1>
            <p style={{ fontSize: 14, color: "var(--fg-muted)", margin: 0 }}>
              {baseRows.length} documento
              {baseRows.length === 1 ? "" : "s"} disponíve
              {baseRows.length === 1 ? "l" : "is"} para o seu perfil.
            </p>
          </div>
        </div>

        {/* Subcategory chips */}
        {subRows.length > 0 && (
          <div className="hb-chip-row" style={{ marginBottom: 12 }}>
            <Link
              href={buildUrl({ sub: null })}
              className={`hb-chip ${!activeSub ? "active" : ""}`}
              aria-pressed={!activeSub}
            >
              Tudo
              <span className="hb-chip-count">{baseRows.length}</span>
            </Link>
            {subRows.map((s) => (
              <Link
                key={s.id}
                href={buildUrl({ sub: s.slug })}
                className={`hb-chip ${activeSub?.id === s.id ? "active" : ""}`}
                aria-pressed={activeSub?.id === s.id}
              >
                {s.name}
                <span className="hb-chip-count">
                  {subCounts.get(s.id) ?? 0}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Visibility chips */}
        {availableVisibilities.length > 0 && (
          <div className="hb-chip-row" style={{ marginBottom: 12 }}>
            <Link
              href={buildUrl({ vis: null })}
              className={`hb-chip ${!activeVis ? "active" : ""}`}
              aria-pressed={!activeVis}
            >
              Todas visibilidades
            </Link>
            {availableVisibilities.map((v) => (
              <Link
                key={v}
                href={buildUrl({ vis: v })}
                className={`hb-chip ${activeVis === v ? "active" : ""}`}
                aria-pressed={activeVis === v}
              >
                {VIS_LABELS[v]}
              </Link>
            ))}
          </div>
        )}

        {/* Period + view chips */}
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
              href={buildUrl({ periodo: "12" })}
              className={`hb-chip ${periodo === "12" ? "active" : ""}`}
              aria-pressed={periodo === "12"}
            >
              12 meses
            </Link>
            <Link
              href={buildUrl({ periodo: "24" })}
              className={`hb-chip ${periodo === "24" ? "active" : ""}`}
              aria-pressed={periodo === "24"}
            >
              24 meses
            </Link>
            <Link
              href={buildUrl({ periodo: null })}
              className={`hb-chip ${periodo === "tudo" ? "active" : ""}`}
              aria-pressed={periodo === "tudo"}
            >
              Tudo
            </Link>
          </div>

          <div className="hb-chip-row" style={{ marginBottom: 0 }}>
            <Link
              href={buildUrl({ view: null })}
              className={`hb-chip ${view === "grid" ? "active" : ""}`}
              aria-pressed={view === "grid"}
              aria-label="Ver em cartões"
            >
              <LayoutGrid size={13} aria-hidden="true" />
              Cartões
            </Link>
            <Link
              href={buildUrl({ view: "list" })}
              className={`hb-chip ${view === "list" ? "active" : ""}`}
              aria-pressed={view === "list"}
              aria-label="Ver em lista"
            >
              <List size={13} aria-hidden="true" />
              Lista
            </Link>
          </div>
        </div>

        {/* Results */}
        {filteredRows.length === 0 ? (
          <div className="hb-empty">
            <div className="hb-empty-icon">
              <FileText size={24} aria-hidden="true" />
            </div>
            <b>Nada por aqui ainda</b>
            <p className="hb-empty-body">
              Tente ajustar os filtros ou navegar por outra subcategoria.
            </p>
            <p className="hb-empty-quote">
              "Porque o Senhor dá a sabedoria; da sua boca vem o conhecimento e
              o entendimento."
              <span className="hb-empty-cite">Provérbios 2:6</span>
            </p>
          </div>
        ) : view === "grid" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 18,
            }}
          >
            {filteredRows.map((row) => {
              const docTags = tagMap.get(row.id) ?? [];
              const version = versionMap.get(row.id) ?? null;

              if (row.isEdital) {
                const edital = adaptEdital(row, docTags, version);
                return (
                  <div key={row.id} style={{ gridColumn: "span 2" }}>
                    <EditalCard edital={edital} href={`/editais/${row.slug}`} />
                  </div>
                );
              }
              const doc = adaptDoc(row, docTags, version);
              return (
                <DocumentCard
                  key={row.id}
                  document={doc}
                  href={`/${row.slug}`}
                />
              );
            })}
          </div>
        ) : (
          <div
            className="hb-card hb-card-padded hb-card-overflow"
            style={{ padding: "4px 0" }}
          >
            {filteredRows.map((row) => (
              <Link
                key={row.id}
                href={row.isEdital ? `/editais/${row.slug}` : `/${row.slug}`}
                className="docs-row"
                style={{ padding: "14px 24px" }}
              >
                <div className="docs-row-icon">
                  {row.isEdital ? (
                    <Scroll size={16} aria-hidden="true" />
                  ) : (
                    <FileText size={16} aria-hidden="true" />
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="docs-row-title">{row.title}</div>
                  <div className="docs-row-meta">
                    <span>{row.categoryName ?? "Sem categoria"}</span>
                    <span>·</span>
                    <span>{formatDate(row.updatedAt)}</span>
                  </div>
                </div>
                <VisibilityBadge visibility={row.visibility} size="sm" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

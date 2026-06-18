import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Scale,
  Banknote,
  Users,
  Scroll,
  Workflow,
  BarChart2,
  Search,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { PublicNav } from "../components/public-nav";
import { DocumentCard } from "../components/document-card";
import { EditalCard } from "../components/edital-card";
import { db } from "@hebron/db/client";
import {
  documents,
  editals,
  categories,
  documentTags,
  tags,
  documentVersions,
} from "@hebron/db/schema";
import {
  and,
  or,
  eq,
  isNull,
  isNotNull,
  desc,
  inArray,
  sql,
} from "drizzle-orm";
import type {
  Document,
  Edital,
  DocumentVersion,
} from "@hebron/types/documentos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Documentos — Hebron Aseec",
  description:
    "Portal de documentos, editais e chamadas. Tudo o que rege a missão da Hebron Aseec em um só lugar.",
  openGraph: {
    title: "Portal de Documentos — Hebron Aseec",
    description:
      "Editais abertos, políticas, certidões e procedimentos operacionais com histórico de versões.",
  },
};

// ─── Type adapters ────────────────────────────────────────────────────────────

type DbDocRow = {
  id: string;
  title: string;
  slug: string;
  contentMd: string | null;
  fileUrl: string | null;
  visibility: "public" | "internal" | "restricted";
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  authorId: string;
  publishedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

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

function getMimeType(fileUrl: string | null, contentMd: string | null): string {
  if (fileUrl?.endsWith(".pdf")) return "application/pdf";
  if (contentMd) return "text/markdown";
  return "application/octet-stream";
}

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

function extractDescription(contentMd: string | null): string | null {
  if (!contentMd) return null;
  const line = contentMd
    .split("\n")
    .find((l) => l.trim() !== "" && !l.startsWith("#") && !l.startsWith("-"));
  return line?.trim().slice(0, 240) ?? null;
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
  row: DbDocRow,
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

type DbEditalRow = DbDocRow & {
  editalOpensAt: Date | null;
  editalClosesAt: Date | null;
  editalProjectType: string | null;
};

function adaptEdital(
  row: DbEditalRow,
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
    opensAt: row.editalOpensAt,
    closesAt: row.editalClosesAt,
    projectType: row.editalProjectType,
    projectCategory: null,
  };
}

// ─── DB queries ───────────────────────────────────────────────────────────────

async function buildPageData() {
  const [editaisRows, recentDocRows, catRows, [totalRow]] = await Promise.all([
    // All published public/internal editals
    db
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
          isNull(documents.deletedAt),
          isNotNull(documents.publishedAt),
          or(
            eq(documents.visibility, "public"),
            eq(documents.visibility, "internal"),
          ),
        ),
      )
      .orderBy(desc(documents.publishedAt)),

    // Recent non-edital published documents
    db
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
          isNull(documents.deletedAt),
          isNotNull(documents.publishedAt),
          isNull(editals.id),
          or(
            eq(documents.visibility, "public"),
            eq(documents.visibility, "internal"),
          ),
        ),
      )
      .orderBy(desc(documents.updatedAt))
      .limit(6),

    // All categories for count
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories),

    // Total published documents
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(documents)
      .where(
        and(isNull(documents.deletedAt), isNotNull(documents.publishedAt)),
      ),
  ]);

  // Fetch tags for recent docs
  const recentDocIds = recentDocRows.map((r) => r.id);
  const tagRows =
    recentDocIds.length > 0
      ? await db
          .select({
            documentId: documentTags.documentId,
            tagId: tags.id,
            tagName: tags.name,
            tagSlug: tags.slug,
          })
          .from(documentTags)
          .innerJoin(tags, eq(tags.id, documentTags.tagId))
          .where(inArray(documentTags.documentId, recentDocIds))
      : [];

  const tagMap = new Map<string, DocTag[]>();
  for (const t of tagRows) {
    const arr = tagMap.get(t.documentId) ?? [];
    arr.push({ id: t.tagId, name: t.tagName, slug: t.tagSlug });
    tagMap.set(t.documentId, arr);
  }

  // Fetch tags for editals
  const editalIds = editaisRows.map((r) => r.id);
  const editalTagRows =
    editalIds.length > 0
      ? await db
          .select({
            documentId: documentTags.documentId,
            tagId: tags.id,
            tagName: tags.name,
            tagSlug: tags.slug,
          })
          .from(documentTags)
          .innerJoin(tags, eq(tags.id, documentTags.tagId))
          .where(inArray(documentTags.documentId, editalIds))
      : [];

  const editalTagMap = new Map<string, DocTag[]>();
  for (const t of editalTagRows) {
    const arr = editalTagMap.get(t.documentId) ?? [];
    arr.push({ id: t.tagId, name: t.tagName, slug: t.tagSlug });
    editalTagMap.set(t.documentId, arr);
  }

  // Fetch latest versions for recent docs
  const versionRows =
    recentDocIds.length > 0
      ? await db
          .select()
          .from(documentVersions)
          .where(inArray(documentVersions.documentId, recentDocIds))
          .orderBy(desc(documentVersions.versionNumber))
      : [];

  const latestVersionMap = new Map<string, DbVersionRow>();
  for (const v of versionRows) {
    if (!latestVersionMap.has(v.documentId)) {
      latestVersionMap.set(v.documentId, v);
    }
  }

  const recentDocs: Document[] = recentDocRows.map((row) =>
    adaptDoc(
      row,
      tagMap.get(row.id) ?? [],
      latestVersionMap.get(row.id) ?? null,
    ),
  );

  const allEditais: Edital[] = editaisRows.map((row) =>
    adaptEdital(row, editalTagMap.get(row.id) ?? [], null),
  );

  function getEditalStatus(
    e: Edital,
  ): "open" | "closed" | "permanent" | "upcoming" {
    if (e.cycleType === "pontual") return "permanent";
    const now = new Date();
    if (e.opensAt && now < new Date(e.opensAt)) return "upcoming";
    if (e.closesAt && now > new Date(e.closesAt)) return "closed";
    return "open";
  }

  const openEditais = allEditais.filter((e) => {
    const s = getEditalStatus(e);
    return s === "open" || s === "permanent";
  });

  return {
    openEditais,
    recentDocs,
    allCategories: catRows,
    totalDocs: totalRow?.n ?? 0,
    openCount: openEditais.length,
  };
}

// ─── Category icons ───────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "juridico-legal": <Scale size={20} aria-hidden="true" />,
  "fiscal-contabil": <Banknote size={20} aria-hidden="true" />,
  "recursos-humanos": <Users size={20} aria-hidden="true" />,
  "editais-chamadas": <Scroll size={20} aria-hidden="true" />,
  "procedimentos-internos": <Workflow size={20} aria-hidden="true" />,
  "comunicacoes-relatorios": <BarChart2 size={20} aria-hidden="true" />,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  let data: Awaited<ReturnType<typeof buildPageData>> | null = null;
  let hasError = false;

  try {
    data = await buildPageData();
  } catch {
    hasError = true;
  }

  if (hasError || data === null) {
    return (
      <>
        <PublicNav />
        <main
          className="docs-page"
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
            <b>Erro ao carregar o portal</b>
            <p className="hb-empty-body">
              Não foi possível carregar os documentos e editais. Verifique sua
              conexão e tente novamente.
            </p>
            <a
              href="/"
              className="hb-btn hb-btn-primary"
              style={{ marginTop: 20 }}
            >
              <RefreshCw size={14} aria-hidden="true" />
              Tentar novamente
            </a>
          </div>
        </main>
      </>
    );
  }

  const { openEditais, recentDocs, allCategories, totalDocs, openCount } = data;

  return (
    <>
      <PublicNav />

      {/* ── Hero ── */}
      <section className="docs-hero" aria-label="Apresentação do portal">
        <div className="docs-hero-inner">
          <span className="hb-eyebrow" style={{ color: "var(--hb-cyan)" }}>
            Portal de documentos · Hebron Aseec
          </span>
          <h1>Tudo o que rege a nossa missão — em um só lugar.</h1>
          <p>
            Editais abertos, políticas, certidões em vigência e procedimentos
            operacionais. Cada documento traz histórico de versões e responde
            por uma fonte única de verdade.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/editais" className="hb-btn hb-btn-accent">
              Ver editais abertos
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/busca"
              className="hb-btn"
              style={{
                background: "transparent",
                color: "var(--hb-white)",
                boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.28)",
              }}
            >
              <Search size={15} aria-hidden="true" />
              Buscar documento
            </Link>
          </div>

          <div className="docs-hero-stats" aria-label="Estatísticas do portal">
            <div className="docs-hero-stat">
              <div className="big">{totalDocs}</div>
              <div className="label">Documentos publicados</div>
            </div>
            <div className="docs-hero-stat">
              <div className="big">{openCount}</div>
              <div className="label">Editais disponíveis</div>
            </div>
            <div className="docs-hero-stat">
              <div className="big">{allCategories.length}</div>
              <div className="label">Categorias</div>
            </div>
            <div className="docs-hero-stat">
              <div className="big">{recentDocs.length}</div>
              <div className="label">Publicações recentes</div>
            </div>
          </div>
        </div>

        <div className="docs-hero-deco-cyan" aria-hidden="true" />
        <div className="docs-hero-deco-green" aria-hidden="true" />
      </section>

      <main className="docs-page">
        {/* ── Editais em destaque ── */}
        <section className="docs-section" aria-labelledby="editais-heading">
          <div className="docs-section-head">
            <div className="left">
              <span className="hb-eyebrow">Editais em destaque</span>
              <h2 id="editais-heading">Janelas abertas para submissão</h2>
            </div>
            <Link href="/editais" className="hb-btn hb-btn-ghost hb-btn-sm">
              Ver todos
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>

          {openEditais.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                gap: 18,
              }}
            >
              {openEditais.map((edital) => (
                <EditalCard
                  key={edital.id}
                  edital={edital}
                  href={`/editais/${edital.slug}`}
                />
              ))}
            </div>
          ) : (
            <div className="hb-empty" style={{ padding: "40px 20px" }}>
              <div className="hb-empty-icon">
                <Scroll size={24} aria-hidden="true" />
              </div>
              <b>Nenhum edital aberto no momento</b>
              <p className="hb-empty-body">
                Novas chamadas serão publicadas em breve. Confira o histórico de
                editais para referência.
              </p>
              <p className="hb-empty-quote">
                "Há tempo para tudo debaixo do sol — um tempo para cada
                propósito."
                <span className="hb-empty-cite">Eclesiastes 3:1</span>
              </p>
              <Link
                href="/editais"
                className="hb-btn hb-btn-secondary"
                style={{ marginTop: 20 }}
              >
                Ver histórico de editais
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>

        {/* ── Two-col: recentes + categorias ── */}
        <div className="docs-two-col">
          {/* Documentos recentes */}
          <section aria-labelledby="recentes-heading">
            <div className="docs-section-head">
              <div className="left">
                <span className="hb-eyebrow">Atualizados recentemente</span>
                <h2 id="recentes-heading">Últimas publicações</h2>
              </div>
            </div>

            {recentDocs.length > 0 ? (
              <div
                className="hb-card hb-card-padded hb-card-overflow"
                style={{ padding: "4px 0" }}
              >
                {recentDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/${doc.slug}`}
                    className="docs-row"
                    style={{ padding: "14px 24px" }}
                  >
                    <div className="docs-row-icon">
                      <FileText size={16} aria-hidden="true" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="docs-row-title">{doc.title}</div>
                      <div className="docs-row-meta">
                        <span>{doc.category.name}</span>
                        <span>·</span>
                        <span>
                          {new Intl.DateTimeFormat("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(doc.updatedAt))}
                        </span>
                      </div>
                    </div>
                    {doc.visibility === "public" && (
                      <span
                        className="docs-open-stripe"
                        style={{ fontSize: 11 }}
                      >
                        Público
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="hb-empty" style={{ padding: "40px 20px" }}>
                <div className="hb-empty-icon">
                  <FileText size={24} aria-hidden="true" />
                </div>
                <b>Nenhum documento publicado</b>
                <p className="hb-empty-body">
                  Ainda não há documentos disponíveis nesta área.
                </p>
              </div>
            )}
          </section>

          {/* Categorias */}
          <section aria-labelledby="categorias-heading">
            <div className="docs-section-head">
              <div className="left">
                <span className="hb-eyebrow">Navegação</span>
                <h2 id="categorias-heading">Explorar por área</h2>
              </div>
            </div>

            <div className="docs-cat-grid">
              {allCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/busca?categoria=${cat.id}`}
                  className="docs-cat-card"
                >
                  <div className="docs-cat-icon">
                    {CATEGORY_ICONS[cat.slug] ?? (
                      <FileText size={20} aria-hidden="true" />
                    )}
                  </div>
                  <div className="docs-cat-name">{cat.name}</div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* ── Grid de documentos recentes ── */}
        <section className="docs-section" aria-labelledby="grid-heading">
          <div className="docs-section-head">
            <div className="left">
              <span className="hb-eyebrow">Documentos</span>
              <h2 id="grid-heading">Publicações em destaque</h2>
            </div>
            <Link href="/busca" className="hb-btn hb-btn-ghost hb-btn-sm">
              Ver todos
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>

          {recentDocs.length > 0 ? (
            <div
              className="hb-grid"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              }}
            >
              {recentDocs.slice(0, 3).map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  href={`/${doc.slug}`}
                />
              ))}
            </div>
          ) : (
            <div className="hb-empty" style={{ padding: "40px 20px" }}>
              <div className="hb-empty-icon">
                <Search size={24} aria-hidden="true" />
              </div>
              <b>Nenhum documento encontrado</b>
              <p className="hb-empty-body">
                Nenhum documento está disponível para exibição no momento.
              </p>
              <p className="hb-empty-quote">
                "A tua palavra é lâmpada que ilumina os meus passos e luz que
                clareia o meu caminho."
                <span className="hb-empty-cite">Salmos 119:105</span>
              </p>
              <Link
                href="/busca"
                className="hb-btn hb-btn-secondary"
                style={{ marginTop: 20 }}
              >
                <Search size={14} aria-hidden="true" />
                Buscar documentos
              </Link>
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "24px 36px",
          background: "var(--bg-alt)",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 13,
            color: "var(--fg-muted)",
          }}
        >
          <span>
            © {new Date().getFullYear()} Hebron Aseec · docs.hebronaseec.com.br
          </span>
          <div style={{ display: "flex", gap: 16 }}>
            <Link
              href="/busca?tipo=policy"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Política de Privacidade
            </Link>
            <Link
              href="/editorial"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Área editorial
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

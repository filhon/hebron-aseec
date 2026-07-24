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
  Shield,
  Download,
  Rss,
} from "lucide-react";
import { PublicNav } from "../components/public-nav";
import { EditalCard } from "../components/edital-card";
import { VisibilityBadge } from "../components/visibility-badge";
import { resolveEditalStatus } from "../components/edital-status-pill";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
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
  eq,
  isNull,
  isNotNull,
  desc,
  inArray,
  sql,
  asc,
} from "drizzle-orm";
import type {
  Document,
  Edital,
  DocumentVersion,
} from "@hebron/types/documentos";
import { getOptionalActorId } from "../lib/session";

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
    faq: [],
  };
}

// ─── DB queries ───────────────────────────────────────────────────────────────

async function buildPageData() {
  const actorId = await getOptionalActorId();

  const {
    editaisRows,
    recentDocRows,
    catRows,
    certidoesRows,
    totalRow,
    tagMap,
    editalTagMap,
    latestVersionMap,
  } = await withAuthenticatedContext(
    actorId ? { actorId } : null,
    async (tx) => {
      const [editaisRows, recentDocRows, catRows, certidoesRows, [totalRow]] =
        await Promise.all([
          // Published editals — RLS filters by visibility (public/internal for
          // anon/authenticated, restricted for the roles allowed to see it).
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
                isNull(documents.deletedAt),
                isNotNull(documents.publishedAt),
              ),
            )
            .orderBy(desc(documents.publishedAt)),

          // Recent non-edital published documents
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
                isNull(documents.deletedAt),
                isNotNull(documents.publishedAt),
                isNull(editals.id),
              ),
            )
            .orderBy(desc(documents.updatedAt))
            .limit(6),

          // All categories for count
          tx
            .select({
              id: categories.id,
              name: categories.name,
              slug: categories.slug,
            })
            .from(categories),

          // Certidões vigentes (documents in certidoes categories)
          tx
            .select({
              id: documents.id,
              title: documents.title,
              slug: documents.slug,
              categoryName: categories.name,
              fileUrl: documents.fileUrl,
              updatedAt: documents.updatedAt,
            })
            .from(documents)
            .innerJoin(categories, eq(categories.id, documents.categoryId))
            .where(
              and(
                isNull(documents.deletedAt),
                isNotNull(documents.publishedAt),
                sql`${categories.slug} LIKE 'certidoes%'`,
              ),
            )
            .orderBy(asc(documents.title))
            .limit(6),

          // Total published documents
          tx
            .select({ n: sql<number>`count(*)::int` })
            .from(documents)
            .where(
              and(
                isNull(documents.deletedAt),
                isNotNull(documents.publishedAt),
              ),
            ),
        ]);

      // Fetch tags for recent docs
      const recentDocIds = recentDocRows.map((r) => r.id);
      const tagRows =
        recentDocIds.length > 0
          ? await tx
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
          ? await tx
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
          ? await tx
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

      return {
        editaisRows,
        recentDocRows,
        catRows,
        certidoesRows,
        totalRow,
        tagMap,
        editalTagMap,
        latestVersionMap,
      };
    },
  );

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

  const openEditais = allEditais.filter((e) => {
    const s = resolveEditalStatus(e);
    return s === "open" || s === "closing_soon" || s === "permanent";
  });

  return {
    openEditais,
    recentDocs,
    certidoes: certidoesRows,
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

  const {
    openEditais,
    recentDocs,
    certidoes,
    allCategories,
    totalDocs,
    openCount,
  } = data;

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

        {/* ── Two-col: recentes + certidões vigentes ── */}
        <div className="docs-two-col">
          {/* Documentos recentes */}
          <section aria-labelledby="recentes-heading">
            <div className="docs-section-head">
              <div className="left">
                <span className="hb-eyebrow">Atualizados recentemente</span>
                <h2 id="recentes-heading">Últimas publicações</h2>
              </div>
              <Link href="/busca" className="hb-btn hb-btn-ghost hb-btn-sm">
                Navegar por categoria
              </Link>
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
                    <VisibilityBadge visibility={doc.visibility} size="sm" />
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

          {/* Certidões vigentes + subscription CTA */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <section aria-labelledby="certidoes-heading">
              <div className="docs-section-head">
                <div className="left">
                  <span className="hb-eyebrow">Documentação institucional</span>
                  <h2 id="certidoes-heading">Certidões vigentes</h2>
                </div>
              </div>

              {certidoes.length > 0 ? (
                <div className="hb-card" style={{ padding: "20px 22px" }}>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0,
                    }}
                  >
                    {certidoes.map((cert) => (
                      <li
                        key={cert.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr auto",
                          gap: 12,
                          alignItems: "center",
                          padding: "10px 0",
                          borderBottom: "1px solid var(--divider)",
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: "rgba(161,197,32,0.14)",
                            color: "var(--hb-green-deep)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Shield size={16} aria-hidden="true" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <Link
                            href={`/${cert.slug}`}
                            style={{
                              display: "block",
                              fontFamily: "var(--font-display)",
                              fontWeight: 600,
                              fontSize: 13.5,
                              color: "var(--fg)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              textDecoration: "none",
                            }}
                          >
                            {cert.title}
                          </Link>
                          <div
                            style={{ fontSize: 12, color: "var(--fg-muted)" }}
                          >
                            {cert.categoryName}
                          </div>
                        </div>
                        {cert.fileUrl && (
                          <Link
                            href={`/${cert.slug}`}
                            aria-label={`Baixar ${cert.title}`}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              border: "1px solid var(--border)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--fg-muted)",
                              flexShrink: 0,
                              transition: "all var(--dur-fast)",
                            }}
                          >
                            <Download size={14} aria-hidden="true" />
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="hb-empty" style={{ padding: "32px 20px" }}>
                  <div className="hb-empty-icon">
                    <Shield size={20} aria-hidden="true" />
                  </div>
                  <b>Nenhuma certidão disponível</b>
                  <p className="hb-empty-body" style={{ fontSize: 12 }}>
                    As certidões institucionais serão listadas aqui.
                  </p>
                </div>
              )}
            </section>

            {/* Subscription CTA */}
            <div
              style={{
                padding: "24px",
                borderRadius: "var(--radius-md)",
                background: "var(--hb-orange)",
                color: "var(--hb-white)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <span
                className="hb-eyebrow"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                Para parceiros e missionários
              </span>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  fontWeight: 700,
                  margin: 0,
                  lineHeight: 1.2,
                  letterSpacing: "-0.01em",
                }}
              >
                Receba alertas quando um edital abrir.
              </h3>
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  margin: 0,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                Cadastre-se para ser notificado por email sobre novas
                publicações nas categorias que importam para você.
              </p>
              <Link
                href="/assinaturas"
                className="hb-btn hb-btn-sm"
                style={{
                  background: "var(--hb-white)",
                  color: "var(--hb-orange)",
                  borderColor: "var(--hb-white)",
                  alignSelf: "flex-start",
                  marginTop: 4,
                }}
              >
                <Rss size={13} aria-hidden="true" />
                Configurar assinaturas
              </Link>
            </div>
          </div>
        </div>

        {/* ── Categories — full-width ── */}
        <section className="docs-section" aria-labelledby="categorias-heading">
          <div className="docs-section-head">
            <div className="left">
              <span className="hb-eyebrow">Navegação por categoria</span>
              <h2 id="categorias-heading">Explore por área</h2>
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

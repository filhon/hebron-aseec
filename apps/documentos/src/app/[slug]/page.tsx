import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Download,
  Folder,
  Calendar,
  Tag,
  Clock,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { PublicNav } from "../../components/public-nav";
import { DocumentViewer } from "../../components/document-viewer";
import { VersionHistory } from "../../components/version-history";
import { VISIBILITY, VisibilityBadge } from "../../components/visibility-badge";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  documents,
  editals,
  categories,
  documentTags,
  tags,
  documentVersions,
} from "@hebron/db/schema";
import { and, eq, isNull, isNotNull, desc } from "drizzle-orm";
import type { Document, DocumentVersion } from "@hebron/types/documentos";
import { getOptionalActorId } from "../../lib/session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

// Fallback só para versões anteriores à migration 0061, que não guardavam
// mime_type — a partir dela, o valor real da coluna sempre vence.
function getMimeType(fileUrl: string | null, contentMd: string | null): string {
  if (fileUrl?.endsWith(".pdf")) return "application/pdf";
  if (contentMd) return "text/markdown";
  return "application/octet-stream";
}

function extractDescription(contentMd: string | null): string | null {
  if (!contentMd) return null;
  const line = contentMd
    .split("\n")
    .find((l) => l.trim() !== "" && !l.startsWith("#") && !l.startsWith("-"));
  return line?.trim().slice(0, 240) ?? null;
}

function adaptDocVersion(v: {
  id: string;
  documentId: string;
  versionNumber: number;
  fileUrl: string | null;
  contentMd: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
}): DocumentVersion {
  return {
    id: v.id,
    documentId: v.documentId,
    version: v.versionNumber,
    storageKey: v.fileUrl ?? "",
    fileSizeBytes: v.fileSizeBytes ?? 0,
    mimeType: v.mimeType ?? getMimeType(v.fileUrl, v.contentMd),
    notes: v.notes,
    publishedBy: v.createdBy,
    publishedAt: v.createdAt,
  };
}

async function getSignedUrl(
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await supabase.storage
    .from("hebron-docs")
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
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
        .select({
          title: documents.title,
          contentMd: documents.contentMd,
          editalId: editals.id,
        })
        .from(documents)
        .leftJoin(editals, eq(editals.id, documents.id))
        .where(
          and(
            eq(documents.slug, slug),
            isNull(documents.deletedAt),
            isNull(editals.id),
          ),
        )
        .limit(1),
  );

  const row = rows[0];
  if (!row) return {};

  const description = extractDescription(row.contentMd);
  return {
    title: row.title,
    description: description ?? undefined,
    openGraph: {
      title: row.title,
      description: description ?? undefined,
      type: "article",
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DocumentPage({ params }: PageProps) {
  const { slug } = await params;
  const actorId = await getOptionalActorId();

  // Fetch document (exclude editals) + tags + versions in one authenticated
  // context — RLS filters by visibility for real (F2-D1: esta página lia via
  // client superuser e renderizava documentos `restricted` para qualquer
  // anônimo que soubesse o slug).
  const { docRow, tagRows, versionRows } = await withAuthenticatedContext(
    actorId ? { actorId } : null,
    async (tx) => {
      const docRows = await tx
        .select({
          id: documents.id,
          title: documents.title,
          slug: documents.slug,
          contentMd: documents.contentMd,
          fileUrl: documents.fileUrl,
          visibility: documents.visibility,
          type: documents.type,
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
            eq(documents.slug, slug),
            isNull(documents.deletedAt),
            isNotNull(documents.publishedAt),
            isNull(editals.id),
          ),
        )
        .limit(1);

      const docRow = docRows[0];
      if (!docRow) return { docRow: null, tagRows: [], versionRows: [] };

      const tagRows = await tx
        .select({
          tagId: tags.id,
          tagName: tags.name,
          tagSlug: tags.slug,
        })
        .from(documentTags)
        .innerJoin(tags, eq(tags.id, documentTags.tagId))
        .where(eq(documentTags.documentId, docRow.id));

      const versionRows = await tx
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, docRow.id))
        .orderBy(desc(documentVersions.versionNumber));

      return { docRow, tagRows, versionRows };
    },
  );

  if (!docRow) notFound();

  const versions = versionRows.map(adaptDocVersion);
  const latestVersion = versions[0] ?? null;

  // Generate signed URL for PDF
  const storagePath = docRow.fileUrl ?? versionRows[0]?.fileUrl ?? null;
  const signedUrl = await getSignedUrl(storagePath);

  // Build Document object
  const docTags = tagRows.map((t) => ({
    id: t.tagId,
    name: t.tagName,
    slug: t.tagSlug,
    color: null,
  }));

  const doc: Document = {
    id: docRow.id,
    title: docRow.title,
    slug: docRow.slug,
    description: extractDescription(docRow.contentMd),
    type: docRow.type,
    visibility: docRow.visibility,
    status: docRow.publishedAt ? "published" : "draft",
    categoryId: docRow.categoryId ?? "",
    category: {
      id: docRow.categoryId ?? "",
      name: docRow.categoryName ?? "Sem categoria",
      slug: docRow.categorySlug ?? "",
      description: null,
      parentId: null,
      children: [],
      documentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    tags: docTags,
    currentVersionId: latestVersion?.id ?? null,
    currentVersion: latestVersion,
    publishedBy: docRow.authorId,
    publishedAt: docRow.publishedAt,
    createdBy: docRow.authorId,
    createdAt: docRow.createdAt,
    updatedAt: docRow.updatedAt,
    deletedAt: docRow.deletedAt,
  };

  const vis = VISIBILITY[doc.visibility];
  const VisIcon = vis.Icon;

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
          <Link href="/busca">Documentos</Link>
          <ChevronRight
            size={12}
            className="docs-breadcrumbs-sep"
            aria-hidden="true"
          />
          <span style={{ color: "var(--fg)" }}>{doc.title}</span>
        </nav>

        <div className="docs-doc-layout">
          {/* Main column */}
          <div style={{ minWidth: 0 }}>
            {/* Doc header card */}
            <div
              className="hb-card"
              style={{ padding: "32px 36px", marginBottom: 20 }}
            >
              {/* Badges row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                <VisibilityBadge visibility={doc.visibility} />

                <span
                  className="hb-badge"
                  style={{
                    background: "var(--bg-alt)",
                    color: "var(--fg-muted)",
                  }}
                >
                  <Folder size={11} aria-hidden="true" />
                  {doc.category.name}
                </span>

                {doc.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.id}
                    className="hb-badge"
                    style={{
                      background: "var(--bg-alt)",
                      color: "var(--fg-muted)",
                    }}
                  >
                    <Tag size={10} aria-hidden="true" />
                    {tag.name}
                  </span>
                ))}

                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    color: "var(--fg-muted)",
                  }}
                >
                  {doc.currentVersion && `v${doc.currentVersion.version} · `}
                  {formatDate(doc.updatedAt)}
                </span>
              </div>

              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(26px, 3.5vw, 40px)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  color: "var(--fg)",
                  margin: "0 0 14px",
                  textWrap: "balance",
                }}
              >
                {doc.title}
              </h1>

              {doc.description && (
                <p
                  style={{
                    fontSize: 17,
                    lineHeight: 1.6,
                    color: "var(--fg-muted)",
                    margin: "0 0 20px",
                    maxWidth: "62ch",
                  }}
                >
                  {doc.description}
                </p>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {signedUrl && (
                  <a
                    href={signedUrl}
                    download
                    className="hb-btn hb-btn-secondary"
                  >
                    <Download size={14} aria-hidden="true" />
                    Baixar documento
                  </a>
                )}
              </div>
            </div>

            {/* Document viewer */}
            <div style={{ minHeight: 520 }}>
              <DocumentViewer
                document={doc}
                fileUrl={signedUrl ?? undefined}
                markdownContent={docRow.contentMd ?? undefined}
              />
            </div>
          </div>

          {/* Aside */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Metadata card */}
            <div className="hb-card" style={{ padding: "20px 22px" }}>
              <p className="hb-section-label">Metadados</p>
              <dl className="hb-meta-list">
                <dt style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Folder size={12} aria-hidden="true" />
                  Categoria
                </dt>
                <dd>{doc.category.name}</dd>

                <dt style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <VisIcon size={12} aria-hidden="true" />
                  Visibilidade
                </dt>
                <dd>{vis.label}</dd>

                <dt style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={12} aria-hidden="true" />
                  Publicado
                </dt>
                <dd>{doc.publishedAt ? formatDate(doc.publishedAt) : "—"}</dd>

                <dt style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={12} aria-hidden="true" />
                  Atualizado
                </dt>
                <dd>{formatDate(doc.updatedAt)}</dd>

                {doc.currentVersion && (
                  <>
                    <dt>Versão</dt>
                    <dd>v{doc.currentVersion.version}</dd>
                  </>
                )}
              </dl>
            </div>

            {/* Tags */}
            {doc.tags.length > 0 && (
              <div className="hb-card" style={{ padding: "20px 22px" }}>
                <p className="hb-section-label">Tags</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {doc.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="hb-badge"
                      style={{
                        background: "var(--bg-alt)",
                        color: "var(--fg-muted)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Version history */}
            <div className="hb-card" style={{ padding: "20px 22px" }}>
              <p className="hb-section-label" style={{ marginBottom: 16 }}>
                Histórico de versões
              </p>
              <VersionHistory
                versions={versions}
                currentVersionId={doc.currentVersionId}
              />
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

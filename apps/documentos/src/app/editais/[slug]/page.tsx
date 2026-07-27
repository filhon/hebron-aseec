import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Download,
  Folder,
  Tag,
  Check,
  Calendar,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { PublicNav } from "../../../components/public-nav";
import { EditalSubmitButton } from "../../../components/edital-submit-button";
import { DocumentViewer } from "../../../components/document-viewer";
import { VersionHistory } from "../../../components/version-history";
import { ViewTracker } from "../../../components/view-tracker";
import {
  VISIBILITY,
  VisibilityBadge,
} from "../../../components/visibility-badge";
import {
  EditalStatusPill,
  resolveEditalStatus,
} from "../../../components/edital-status-pill";
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
import type { Edital, DocumentVersion } from "@hebron/types/documentos";
import { getOptionalActorId } from "../../../lib/session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(
  date: Date | null,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...opts,
  }).format(new Date(date));
}

function formatDateShort(date: Date | null): string {
  return formatDate(date, { day: "2-digit", month: "short", year: "numeric" });
}

function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
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

function adaptVersion(v: {
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

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
        .select({ title: documents.title, contentMd: documents.contentMd })
        .from(editals)
        .innerJoin(documents, eq(editals.id, documents.id))
        .where(and(eq(documents.slug, slug), isNull(documents.deletedAt)))
        .limit(1),
  );

  const row = rows[0];
  if (!row) return {};
  const description = extractDescription(row.contentMd);
  return {
    title: `${row.title} — Editais Hebron`,
    description: description ?? undefined,
    openGraph: {
      title: row.title,
      description: description ?? undefined,
      type: "article",
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EditalDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const actorId = await getOptionalActorId();

  // Fetch edital + tags + versions in one authenticated context — RLS
  // filters by visibility for real, including `restricted` for the roles
  // that are supposed to see it (this route previously hardcoded
  // public/internal only, so restricted editais never showed even to
  // super_admin/diretor/conselheiro).
  const { row, tagRows, versionRows } = await withAuthenticatedContext(
    actorId ? { actorId } : null,
    async (tx) => {
      const rows = await tx
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
          editalProjectCategoryId: editals.projectCategoryId,
          editalFaq: editals.faq,
        })
        .from(editals)
        .innerJoin(documents, eq(editals.id, documents.id))
        .leftJoin(categories, eq(categories.id, documents.categoryId))
        .where(
          and(
            eq(documents.slug, slug),
            isNull(documents.deletedAt),
            isNotNull(documents.publishedAt),
          ),
        )
        .limit(1);

      const row = rows[0];
      if (!row) return { row: null, tagRows: [], versionRows: [] };

      const tagRows = await tx
        .select({ tagId: tags.id, tagName: tags.name, tagSlug: tags.slug })
        .from(documentTags)
        .innerJoin(tags, eq(tags.id, documentTags.tagId))
        .where(eq(documentTags.documentId, row.id));

      const versionRows = await tx
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, row.id))
        .orderBy(desc(documentVersions.versionNumber));

      return { row, tagRows, versionRows };
    },
  );

  if (!row) notFound();

  const versions = versionRows.map(adaptVersion);
  const latestVersion = versions[0] ?? null;

  // Signed URL
  const storagePath = row.fileUrl ?? versionRows[0]?.fileUrl ?? null;
  const signedUrl = await getSignedUrl(storagePath);

  const cycleType =
    !row.editalOpensAt && !row.editalClosesAt
      ? ("pontual" as const)
      : ("anual" as const);

  const docTags = tagRows.map((t) => ({
    id: t.tagId,
    name: t.tagName,
    slug: t.tagSlug,
    color: null,
  }));

  const edital: Edital = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: extractDescription(row.contentMd),
    type: "edital",
    visibility: row.visibility,
    status: row.publishedAt ? "published" : "draft",
    categoryId: row.categoryId ?? "",
    category: {
      id: row.categoryId ?? "",
      name: row.categoryName ?? "Sem categoria",
      slug: row.categorySlug ?? "",
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
    projectCategory: row.editalProjectCategoryId ?? null,
    faq: row.editalFaq,
  };

  const status = resolveEditalStatus(edital);
  const isOpenNow = status === "open" || status === "closing_soon";
  const isSubmittable = isOpenNow || status === "permanent";
  const daysToClose = daysUntil(edital.closesAt);
  const vis = VISIBILITY[edital.visibility];
  const VisIcon = vis.Icon;

  return (
    <>
      <PublicNav />
      {actorId && <ViewTracker documentId={edital.id} />}

      <main className="docs-page">
        {/* Breadcrumbs */}
        <nav className="docs-breadcrumbs" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <ChevronRight
            size={12}
            className="docs-breadcrumbs-sep"
            aria-hidden="true"
          />
          <Link href="/editais">Editais</Link>
          <ChevronRight
            size={12}
            className="docs-breadcrumbs-sep"
            aria-hidden="true"
          />
          <span style={{ color: "var(--fg)" }}>{edital.title}</span>
        </nav>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: 28,
            alignItems: "flex-start",
          }}
        >
          {/* Main column */}
          <div style={{ minWidth: 0 }}>
            {/* Header card */}
            <div
              className="hb-card"
              style={{ padding: "36px 40px", marginBottom: 20 }}
            >
              {/* Badges */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                <EditalStatusPill status={status} />
                <VisibilityBadge visibility={edital.visibility} />
                {edital.tags.slice(0, 2).map((tag) => (
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
                  {edital.currentVersion &&
                    `v${edital.currentVersion.version} · `}
                  {formatDate(edital.updatedAt)}
                </span>
              </div>

              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(28px, 4vw, 44px)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  color: "var(--fg)",
                  margin: "0 0 16px",
                  textWrap: "balance",
                }}
              >
                {edital.title}
              </h1>

              {edital.description && (
                <p
                  style={{
                    fontSize: 17,
                    lineHeight: 1.6,
                    color: "var(--fg-muted)",
                    maxWidth: "62ch",
                    margin: "0 0 28px",
                  }}
                >
                  {edital.description}
                </p>
              )}

              {/* Cronograma */}
              {edital.cycleType === "anual" && (
                <div
                  style={{
                    background: "var(--bg-alt)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "24px 28px",
                    marginBottom: 24,
                  }}
                >
                  <span
                    className="hb-eyebrow"
                    style={{ display: "block", marginBottom: 20 }}
                  >
                    Cronograma
                  </span>

                  <div className="docs-timeline-steps">
                    {/* Step: Abertura */}
                    <div className="docs-timeline-step">
                      <div
                        className="docs-timeline-dot"
                        style={{
                          borderColor:
                            status !== "upcoming"
                              ? "var(--hb-green)"
                              : "var(--border-strong)",
                          backgroundColor:
                            status !== "upcoming"
                              ? "var(--hb-green)"
                              : "var(--bg)",
                        }}
                      >
                        {status !== "upcoming" && (
                          <Check
                            size={12}
                            style={{ color: "var(--hb-white)" }}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="docs-timeline-label">Abertura</div>
                      <div className="docs-timeline-date">
                        {formatDateShort(edital.opensAt)}
                      </div>
                    </div>

                    {/* Step: Em andamento */}
                    <div className="docs-timeline-step">
                      <div
                        className="docs-timeline-dot"
                        style={{
                          borderColor: isOpenNow
                            ? "var(--hb-orange)"
                            : status === "closed"
                              ? "var(--hb-green)"
                              : "var(--border-strong)",
                          backgroundColor:
                            status === "closed"
                              ? "var(--hb-green)"
                              : "var(--bg)",
                        }}
                      >
                        {status === "closed" && (
                          <Check
                            size={12}
                            style={{ color: "var(--hb-white)" }}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="docs-timeline-label">
                        {isOpenNow ? "Em andamento" : "Vigência"}
                      </div>
                      <div
                        className="docs-timeline-date"
                        style={{
                          color: isOpenNow ? "var(--hb-orange)" : "var(--fg)",
                        }}
                      >
                        {isOpenNow ? "Hoje" : "—"}
                      </div>
                    </div>

                    {/* Step: Encerramento */}
                    <div className="docs-timeline-step">
                      <div
                        className="docs-timeline-dot"
                        style={{
                          borderColor:
                            status === "closed"
                              ? "var(--hb-green)"
                              : "var(--border-strong)",
                          backgroundColor:
                            status === "closed"
                              ? "var(--hb-green)"
                              : "var(--bg)",
                        }}
                      >
                        {status === "closed" && (
                          <Check
                            size={12}
                            style={{ color: "var(--hb-white)" }}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="docs-timeline-label">Encerramento</div>
                      <div className="docs-timeline-date">
                        {formatDateShort(edital.closesAt)}
                      </div>
                    </div>
                  </div>

                  {/* Days remaining banner */}
                  {isOpenNow && daysToClose !== null && daysToClose > 0 && (
                    <div
                      style={{
                        marginTop: 20,
                        padding: "12px 16px",
                        background: "var(--bg)",
                        borderRadius: "var(--radius-sm)",
                        borderLeft: "4px solid var(--hb-blue)",
                        fontSize: 14,
                        color: "var(--fg)",
                      }}
                    >
                      <strong>{daysToClose}</strong> dia
                      {daysToClose === 1 ? "" : "s"} restante
                      {daysToClose === 1 ? "" : "s"} até o encerramento da
                      janela de submissão.
                    </div>
                  )}
                </div>
              )}

              {/* Closed notice */}
              {status === "closed" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "rgba(234,90,6,0.08)",
                    color: "var(--hb-orange)",
                    fontSize: 13,
                    marginBottom: 20,
                    border: "1px solid rgba(234,90,6,0.2)",
                  }}
                >
                  <AlertTriangle size={14} aria-hidden="true" />
                  Este edital está encerrado. Novas submissões não são aceitas.
                </div>
              )}

              {/* CTA row */}
              {isSubmittable && (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <EditalSubmitButton
                    editalId={edital.id}
                    projectType={edital.projectType}
                    projectCategory={edital.projectCategory}
                    status={status}
                  />
                  {signedUrl && (
                    <a
                      href={signedUrl}
                      download
                      className="hb-btn hb-btn-ghost"
                    >
                      <Download size={15} aria-hidden="true" />
                      Baixar edital
                      {edital.currentVersion &&
                        edital.currentVersion.fileSizeBytes > 0 &&
                        ` (${formatBytes(edital.currentVersion.fileSizeBytes)})`}
                    </a>
                  )}
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--fg-muted)",
                      marginLeft: "auto",
                    }}
                  >
                    Você será redirecionado para projetos.hebronaseec.com.br
                  </span>
                </div>
              )}
            </div>

            {/* FAQ — native <details>/<summary>, no JavaScript required */}
            {edital.faq.length > 0 && (
              <div
                className="hb-card"
                style={{ padding: "24px 28px", marginBottom: 20 }}
              >
                <p className="hb-section-label" style={{ marginBottom: 4 }}>
                  Perguntas frequentes
                </p>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 700,
                    margin: "4px 0 18px",
                    color: "var(--fg)",
                  }}
                >
                  FAQ rápido
                </h2>
                {edital.faq.map((item, i) => (
                  <details key={i} className="docs-faq-item">
                    <summary className="docs-faq-trigger">
                      {item.q}
                      <Clock
                        size={13}
                        aria-hidden="true"
                        style={{
                          flexShrink: 0,
                          color: "var(--fg-muted)",
                          marginLeft: "auto",
                        }}
                        className="docs-faq-chevron"
                      />
                    </summary>
                    <div className="docs-faq-body">{item.a}</div>
                  </details>
                ))}
              </div>
            )}

            {/* Viewer */}
            {(signedUrl ?? row.contentMd) ? (
              <div style={{ minHeight: 480 }}>
                <DocumentViewer
                  document={edital}
                  fileUrl={signedUrl ?? undefined}
                  markdownContent={row.contentMd ?? undefined}
                />
              </div>
            ) : null}
          </div>

          {/* Aside */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Details card */}
            <div className="hb-card" style={{ padding: "20px 22px" }}>
              <p className="hb-section-label">Detalhes</p>
              <dl className="hb-meta-list">
                {edital.category.name && (
                  <>
                    <dt>
                      <Folder size={12} aria-hidden="true" />
                      Categoria
                    </dt>
                    <dd>{edital.category.name}</dd>
                  </>
                )}

                <dt>
                  <VisIcon size={12} aria-hidden="true" />
                  Visibilidade
                </dt>
                <dd>{vis.label}</dd>

                {edital.cycleType === "anual" && (
                  <>
                    <dt>
                      <Calendar size={12} aria-hidden="true" />
                      Abertura
                    </dt>
                    <dd>{formatDate(edital.opensAt)}</dd>

                    <dt>
                      <Calendar size={12} aria-hidden="true" />
                      Encerramento
                    </dt>
                    <dd>{formatDate(edital.closesAt)}</dd>
                  </>
                )}

                {edital.projectType && (
                  <>
                    <dt>Tipo de projeto</dt>
                    <dd style={{ textTransform: "capitalize" }}>
                      {edital.projectType}
                    </dd>
                  </>
                )}

                {edital.currentVersion && (
                  <>
                    <dt>Versão</dt>
                    <dd>v{edital.currentVersion.version}</dd>
                  </>
                )}
              </dl>
            </div>

            {/* Tags */}
            {edital.tags.length > 0 && (
              <div className="hb-card" style={{ padding: "20px 22px" }}>
                <p className="hb-section-label">Tags</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {edital.tags.map((tag) => (
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
            <div
              className="hb-card"
              style={{
                padding: "20px 22px",
                background: "var(--hb-blue)",
                borderColor: "transparent",
                color: "var(--fg-invert)",
              }}
            >
              <p
                className="hb-section-label"
                style={{ color: "var(--fg-invert-muted)", marginBottom: 12 }}
              >
                Histórico
              </p>
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  color: "var(--fg-invert-muted)",
                  margin: "0 0 14px",
                }}
              >
                Este edital tem {edital.currentVersion?.version ?? 1} revisão
                {(edital.currentVersion?.version ?? 1) === 1 ? "" : "ões"}{" "}
                publicadas.
              </p>
              <VersionHistory
                versions={versions}
                currentVersionId={edital.currentVersionId}
              />
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

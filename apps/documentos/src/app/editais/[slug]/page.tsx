import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Download,
  ExternalLink,
  Folder,
  Globe,
  Users,
  Lock,
  Tag,
  Check,
  Calendar,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { PublicNav } from "../../../components/public-nav";
import { DocumentViewer } from "../../../components/document-viewer";
import { VersionHistory } from "../../../components/version-history";
import { db } from "@hebron/db/client";
import {
  documents,
  editals,
  categories,
  documentTags,
  tags,
  documentVersions,
} from "@hebron/db/schema";
import { and, or, eq, isNull, isNotNull, desc } from "drizzle-orm";
import type { Edital, DocumentVersion } from "@hebron/types/documentos";

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
  createdBy: string;
  createdAt: Date;
}): DocumentVersion {
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

function getEditalStatus(
  e: Pick<Edital, "cycleType" | "opensAt" | "closesAt">,
): "open" | "closed" | "permanent" | "upcoming" {
  if (e.cycleType === "pontual") return "permanent";
  const now = new Date();
  if (e.opensAt && now < new Date(e.opensAt)) return "upcoming";
  if (e.closesAt && now > new Date(e.closesAt)) return "closed";
  return "open";
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
  const rows = await db
    .select({ title: documents.title, contentMd: documents.contentMd })
    .from(editals)
    .innerJoin(documents, eq(editals.id, documents.id))
    .where(and(eq(documents.slug, slug), isNull(documents.deletedAt)))
    .limit(1);

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

// ─── Static FAQ items ─────────────────────────────────────────────────────────
// FAQ answers are shared across all editals; project-specific info lives in the
// edital document body.

const FAQ_ITEMS = [
  {
    q: "Quem pode submeter?",
    a: "Pastores, missionários e instituições religiosas cadastradas e aprovadas pelo super_admin.",
  },
  {
    q: "Posso submeter mais de um projeto?",
    a: "Sim, desde que respeitando o teto orçamentário anual da instituição vinculada.",
  },
  {
    q: "Como funciona a avaliação?",
    a: "Avaliadores designados emitem parecer; diretoria e conselho votam de forma secreta; quórum mínimo de 50%.",
  },
  {
    q: "Em quanto tempo recebo a resposta?",
    a: "A homologação ocorre em até 15 dias após a votação da diretoria e conselho.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EditalDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Fetch edital
  const rows = await db
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
        eq(documents.slug, slug),
        isNull(documents.deletedAt),
        isNotNull(documents.publishedAt),
        or(
          eq(documents.visibility, "public"),
          eq(documents.visibility, "internal"),
        ),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) notFound();

  // Tags
  const tagRows = await db
    .select({ tagId: tags.id, tagName: tags.name, tagSlug: tags.slug })
    .from(documentTags)
    .innerJoin(tags, eq(tags.id, documentTags.tagId))
    .where(eq(documentTags.documentId, row.id));

  // Versions
  const versionRows = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, row.id))
    .orderBy(desc(documentVersions.versionNumber));

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
    projectCategory: null,
  };

  const status = getEditalStatus(edital);
  const isSubmittable = status === "open" || status === "permanent";
  const daysToClose = daysUntil(edital.closesAt);

  const VISIBILITY_MAP = {
    public: {
      label: "Público",
      Icon: Globe,
      cls: "bg-[--hb-green-muted] text-[--hb-green-fg]",
    },
    internal: {
      label: "Interno",
      Icon: Users,
      cls: "bg-[--hb-cyan-muted] text-[--hb-cyan-fg]",
    },
    restricted: {
      label: "Restrito",
      Icon: Lock,
      cls: "bg-[--color-destructive-muted] text-[--hb-red]",
    },
  } as const;

  const STATUS_MAP = {
    open: {
      label: "Aberto",
      dotColor: "var(--hb-green)",
      cls: "bg-[--hb-green-muted] text-[--hb-green-fg]",
    },
    closed: {
      label: "Encerrado",
      dotColor: "var(--hb-red)",
      cls: "bg-[--color-destructive-muted] text-[--hb-red]",
    },
    permanent: {
      label: "Permanente",
      dotColor: "var(--hb-cyan)",
      cls: "bg-[--hb-cyan-muted] text-[--hb-cyan-fg]",
    },
    upcoming: {
      label: "Em breve",
      dotColor: "var(--hb-orange)",
      cls: "bg-[--hb-orange-muted] text-[--hb-orange-deep]",
    },
  } as const;

  const vis = VISIBILITY_MAP[edital.visibility];
  const VisIcon = vis.Icon;
  const statusCfg = STATUS_MAP[status];

  const submitUrl = (() => {
    const p = new URLSearchParams();
    p.set("edital", edital.id);
    if (edital.projectType) p.set("tipo", edital.projectType);
    return `https://projetos.hebronaseec.com.br/novo?${p.toString()}`;
  })();

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
                <span className={`hb-badge ${statusCfg.cls}`}>
                  <span
                    className="hb-badge-dot"
                    style={{ backgroundColor: statusCfg.dotColor }}
                  />
                  {statusCfg.label}
                </span>
                <span className={`hb-badge ${vis.cls}`}>
                  <VisIcon size={11} aria-hidden="true" />
                  {vis.label}
                </span>
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
                          borderColor:
                            status === "open"
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
                        {status === "open" ? "Em andamento" : "Vigência"}
                      </div>
                      <div
                        className="docs-timeline-date"
                        style={{
                          color:
                            status === "open"
                              ? "var(--hb-orange)"
                              : "var(--fg)",
                        }}
                      >
                        {status === "open" ? "Hoje" : "—"}
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
                  {status === "open" &&
                    daysToClose !== null &&
                    daysToClose > 0 && (
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
                  <a
                    href={submitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hb-btn hb-btn-accent"
                    style={{ fontSize: 14, padding: "10px 20px" }}
                  >
                    <ExternalLink size={15} aria-hidden="true" />
                    Submeter projeto neste edital
                  </a>
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
              {FAQ_ITEMS.map((item) => (
                <details key={item.q} className="docs-faq-item">
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

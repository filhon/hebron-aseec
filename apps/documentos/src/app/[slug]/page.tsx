import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Download,
  Folder,
  Calendar,
  Globe,
  Users,
  Lock,
  Tag,
  Clock,
} from "lucide-react";
import { PublicNav } from "../../components/public-nav";
import { DocumentViewer } from "../../components/document-viewer";
import { VersionHistory } from "../../components/version-history";
import { mockAllDocuments } from "../../lib/mock-data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = mockAllDocuments.find(
    (d) => d.slug === slug && d.type !== "edital",
  );
  if (!doc) return {};

  return {
    title: doc.title,
    description: doc.description ?? undefined,
    openGraph: {
      title: doc.title,
      description: doc.description ?? undefined,
      type: "article",
    },
  };
}

export default async function DocumentPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = mockAllDocuments.find(
    (d) => d.slug === slug && d.type !== "edital",
  );

  if (!doc) notFound();

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

  const vis = VISIBILITY_MAP[doc.visibility];
  const VisIcon = vis.Icon;
  const mockVersions = doc.currentVersion ? [doc.currentVersion] : [];

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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: 28,
            alignItems: "flex-start",
          }}
        >
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
                <span className={`hb-badge ${vis.cls}`}>
                  <span className="hb-badge-dot" />
                  <VisIcon size={11} aria-hidden="true" />
                  {vis.label}
                </span>

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
                <button type="button" className="hb-btn hb-btn-secondary">
                  <Download size={14} aria-hidden="true" />
                  Baixar documento
                  {doc.currentVersion &&
                    ` (${formatBytes(doc.currentVersion.fileSizeBytes)})`}
                </button>
              </div>
            </div>

            {/* Document viewer */}
            <div style={{ minHeight: 520 }}>
              <DocumentViewer document={doc} />
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
                    <dt>Tamanho</dt>
                    <dd>{formatBytes(doc.currentVersion.fileSizeBytes)}</dd>

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
                versions={mockVersions}
                currentVersionId={doc.currentVersionId}
              />
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

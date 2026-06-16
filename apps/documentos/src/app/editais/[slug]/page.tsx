"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";
import {
  ChevronRight,
  ChevronDown,
  Download,
  ExternalLink,
  Folder,
  Globe,
  Users,
  Lock,
  Tag,
  Check,
  Calendar,
} from "lucide-react";
import { PublicNav } from "../../../components/public-nav";
import { DocumentViewer } from "../../../components/document-viewer";
import { VersionHistory } from "../../../components/version-history";
import { mockEditais } from "../../../lib/mock-data";
import type { Edital } from "@hebron/types/documentos";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
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

function getEditalStatus(
  e: Edital,
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

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="docs-faq-item">
      <button
        type="button"
        className="docs-faq-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {q}
        <ChevronDown
          size={15}
          aria-hidden="true"
          style={{
            flexShrink: 0,
            transition: "transform var(--dur-fast)",
            transform: open ? "rotate(180deg)" : "none",
            color: "var(--fg-muted)",
          }}
        />
      </button>
      {open && <div className="docs-faq-body">{a}</div>}
    </div>
  );
}

export default function EditalDetailPage({ params }: PageProps) {
  const { slug } = use(params);
  const edital = mockEditais.find((e) => e.slug === slug);

  if (!edital) notFound();

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
    if (edital.projectCategory) p.set("categoria", edital.projectCategory);
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
                        {edital.opensAt
                          ? new Intl.DateTimeFormat("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }).format(new Date(edital.opensAt))
                          : "—"}
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
                        {edital.closesAt
                          ? new Intl.DateTimeFormat("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }).format(new Date(edital.closesAt))
                          : "—"}
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
                  <button type="button" className="hb-btn hb-btn-ghost">
                    <Download size={15} aria-hidden="true" />
                    Baixar edital
                    {edital.currentVersion &&
                      ` (${formatBytes(edital.currentVersion.fileSizeBytes)})`}
                  </button>
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

            {/* FAQ */}
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
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>

            {/* Viewer */}
            <div style={{ minHeight: 480 }}>
              <DocumentViewer document={edital} />
            </div>
          </div>

          {/* Aside */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Details card */}
            <div className="hb-card" style={{ padding: "20px 22px" }}>
              <p className="hb-section-label">Detalhes</p>
              <dl className="hb-meta-list">
                <dt>
                  <Folder size={12} aria-hidden="true" />
                  Categoria
                </dt>
                <dd>{edital.category.name}</dd>

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
                    <dt>Tamanho</dt>
                    <dd>{formatBytes(edital.currentVersion.fileSizeBytes)}</dd>
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
                versions={edital.currentVersion ? [edital.currentVersion] : []}
                currentVersionId={edital.currentVersionId}
              />
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { Document } from "@hebron/types/documentos";
import type { LucideIcon } from "lucide-react";
import {
  Download,
  ExternalLink,
  FileText,
  Info,
  Folder,
  Calendar,
  Tag,
  Globe,
  Users,
  Lock,
  Hash,
} from "lucide-react";

// ─── Markdown parser ─────────────────────────────────────────────────────────

type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "code"; value: string }
  | { kind: "link"; href: string; text: string };

function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const re =
    /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      tokens.push({ kind: "text", value: text.slice(last, match.index) });
    }
    const boldFull = match[1];
    const boldContent = match[2];
    const italicFull = match[3];
    const italicContent = match[4];
    const codeFull = match[5];
    const codeContent = match[6];
    const linkFull = match[7];
    const linkText = match[8];
    const linkHref = match[9];

    if (boldFull !== undefined && boldContent !== undefined) {
      tokens.push({ kind: "bold", value: boldContent });
    } else if (italicFull !== undefined && italicContent !== undefined) {
      tokens.push({ kind: "italic", value: italicContent });
    } else if (codeFull !== undefined && codeContent !== undefined) {
      tokens.push({ kind: "code", value: codeContent });
    } else if (
      linkFull !== undefined &&
      linkText !== undefined &&
      linkHref !== undefined
    ) {
      tokens.push({ kind: "link", href: linkHref, text: linkText });
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    tokens.push({ kind: "text", value: text.slice(last) });
  }

  return tokens;
}

function renderInline(text: string): ReactNode[] {
  return parseInlineTokens(text).map((token, i) => {
    if (token.kind === "bold") {
      return <strong key={i}>{token.value}</strong>;
    }
    if (token.kind === "italic") {
      return <em key={i}>{token.value}</em>;
    }
    if (token.kind === "code") {
      return (
        <code
          key={i}
          style={{
            background: "var(--bg-alt)",
            border: "1px solid var(--border)",
            padding: "1px 5px",
            borderRadius: 3,
            fontSize: "12.5px",
            fontFamily: "var(--font-mono)",
          }}
        >
          {token.value}
        </code>
      );
    }
    if (token.kind === "link") {
      return (
        <a
          key={i}
          href={token.href}
          style={{
            color: "var(--brand)",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
          target="_blank"
          rel="noopener noreferrer"
        >
          {token.text}
        </a>
      );
    }
    return token.value;
  });
}

type LineToken =
  | { type: "h1" | "h2" | "h3"; content: string; key: number }
  | { type: "li" | "p"; content: string; key: number }
  | { type: "hr" | "blank"; key: number }
  | { type: "code-block"; content: string; key: number };

function tokenize(markdown: string): LineToken[] {
  const lines = markdown.split("\n");
  const tokens: LineToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) break;

    if (line.startsWith("```")) {
      const block: string[] = [];
      i++;
      while (i < lines.length) {
        const blockLine = lines[i];
        if (blockLine === undefined || blockLine.startsWith("```")) break;
        block.push(blockLine);
        i++;
      }
      tokens.push({ type: "code-block", content: block.join("\n"), key: i });
      i++;
      continue;
    }

    const h1Content = /^# (.+)/.exec(line)?.[1];
    if (h1Content !== undefined) {
      tokens.push({ type: "h1", content: h1Content, key: i });
      i++;
      continue;
    }

    const h2Content = /^## (.+)/.exec(line)?.[1];
    if (h2Content !== undefined) {
      tokens.push({ type: "h2", content: h2Content, key: i });
      i++;
      continue;
    }

    const h3Content = /^### (.+)/.exec(line)?.[1];
    if (h3Content !== undefined) {
      tokens.push({ type: "h3", content: h3Content, key: i });
      i++;
      continue;
    }

    const liContent = /^[-*] (.+)/.exec(line)?.[1];
    if (liContent !== undefined) {
      tokens.push({ type: "li", content: liContent, key: i });
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      tokens.push({ type: "hr", key: i });
      i++;
      continue;
    }

    if (line.trim() === "") {
      tokens.push({ type: "blank", key: i });
      i++;
      continue;
    }

    tokens.push({ type: "p", content: line, key: i });
    i++;
  }

  return tokens;
}

function renderMarkdown(markdown: string): ReactNode[] {
  const tokens = tokenize(markdown);
  const nodes: ReactNode[] = [];
  let j = 0;

  while (j < tokens.length) {
    const token = tokens[j];
    if (token === undefined) break;

    if (token.type === "blank") {
      j++;
      continue;
    }

    if (token.type === "hr") {
      nodes.push(
        <hr
          key={token.key}
          style={{
            border: "none",
            borderTop: "1px solid var(--border)",
            margin: "20px 0",
          }}
        />,
      );
      j++;
      continue;
    }

    if (token.type === "h1") {
      nodes.push(
        <h2
          key={token.key}
          className="hb-h2"
          style={{ marginBottom: 16, marginTop: 24 }}
        >
          {renderInline(token.content)}
        </h2>,
      );
      j++;
      continue;
    }

    if (token.type === "h2") {
      nodes.push(
        <h3
          key={token.key}
          className="hb-h3"
          style={{ marginBottom: 12, marginTop: 20 }}
        >
          {renderInline(token.content)}
        </h3>,
      );
      j++;
      continue;
    }

    if (token.type === "h3") {
      nodes.push(
        <h4
          key={token.key}
          className="hb-h4"
          style={{ marginBottom: 8, marginTop: 16 }}
        >
          {renderInline(token.content)}
        </h4>,
      );
      j++;
      continue;
    }

    if (token.type === "code-block") {
      nodes.push(
        <pre
          key={token.key}
          style={{
            background: "var(--bg-alt)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: 16,
            marginBottom: 16,
            overflowX: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <code>{token.content}</code>
        </pre>,
      );
      j++;
      continue;
    }

    if (token.type === "li") {
      const items: ReactNode[] = [];
      while (j < tokens.length) {
        const t = tokens[j];
        if (t === undefined || t.type !== "li") break;
        items.push(<li key={t.key}>{renderInline(t.content)}</li>);
        j++;
      }
      nodes.push(
        <ul
          key={`ul-${j}`}
          style={{
            listStyle: "disc",
            paddingLeft: 20,
            marginBottom: 16,
            color: "var(--fg)",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {items}
        </ul>,
      );
      continue;
    }

    if (token.type === "p") {
      nodes.push(
        <p
          key={token.key}
          style={{
            color: "var(--fg)",
            fontSize: 14,
            lineHeight: 1.7,
            marginBottom: 12,
          }}
        >
          {renderInline(token.content)}
        </p>,
      );
      j++;
      continue;
    }

    j++;
  }

  return nodes;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatBytes(bytes: number): string {
  if (bytes < 1_000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

const VISIBILITY_LABEL: Record<
  Document["visibility"],
  { label: string; Icon: LucideIcon }
> = {
  public: { label: "Público", Icon: Globe },
  internal: { label: "Interno", Icon: Users },
  restricted: { label: "Restrito", Icon: Lock },
};

// ─── Component ───────────────────────────────────────────────────────────────

export interface DocumentViewerProps {
  document: Document;
  fileUrl?: string;
  markdownContent?: string;
  onDownload?: () => void;
  className?: string;
}

type ActiveTab = "document" | "info";

export function DocumentViewer({
  document,
  fileUrl,
  markdownContent,
  onDownload,
  className = "",
}: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("document");

  const isPdf = document.currentVersion?.mimeType === "application/pdf";
  const isMarkdown =
    document.currentVersion?.mimeType === "text/markdown" ||
    document.currentVersion?.mimeType === "text/plain";

  const vis = VISIBILITY_LABEL[document.visibility];
  const VisIcon = vis.Icon;
  const fileSize = document.currentVersion?.fileSizeBytes;

  return (
    <div className={`hb-card hb-card-overflow docs-viewer ${className}`}>
      {/* Toolbar */}
      <div className="docs-viewer-toolbar">
        {/* Tabs */}
        <div className="docs-viewer-tab-group" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "document"}
            onClick={() => setActiveTab("document")}
            className={`docs-viewer-tab${activeTab === "document" ? " active" : ""}`}
          >
            <FileText size={13} aria-hidden="true" />
            Documento
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "info"}
            onClick={() => setActiveTab("info")}
            className={`docs-viewer-tab${activeTab === "info" ? " active" : ""}`}
          >
            <Info size={13} aria-hidden="true" />
            Informações
          </button>
        </div>

        <div className="docs-viewer-spacer" />

        {/* Actions */}
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hb-btn hb-btn-ghost hb-btn-xs"
            title="Abrir em nova aba"
          >
            <ExternalLink size={13} aria-hidden="true" />
            <span>Nova aba</span>
          </a>
        )}
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="hb-btn hb-btn-secondary hb-btn-xs"
          >
            <Download size={13} aria-hidden="true" />
            <span>Baixar</span>
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === "document" ? (
        <div className="docs-viewer-content">
          {fileUrl && isPdf ? (
            <iframe
              src={fileUrl}
              title={document.title}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: 0,
                minHeight: 420,
              }}
            />
          ) : fileUrl && isMarkdown && markdownContent ? (
            <div className="docs-viewer-markdown">
              {renderMarkdown(markdownContent)}
            </div>
          ) : markdownContent ? (
            <div className="docs-viewer-markdown">
              {renderMarkdown(markdownContent)}
            </div>
          ) : (
            <div className="docs-viewer-placeholder">
              <div className="docs-viewer-placeholder-icon">
                <FileText
                  size={28}
                  style={{ color: "var(--brand-fg)" }}
                  aria-hidden="true"
                />
              </div>
              <h4 className="docs-viewer-placeholder-title">
                {document.title}
              </h4>
              <p className="docs-viewer-placeholder-desc">
                {document.description ??
                  "O arquivo será exibido aqui quando disponível."}
              </p>
              {fileSize !== undefined && (
                <span
                  className="hb-badge"
                  style={{
                    background: "var(--bg-alt)",
                    color: "var(--fg-muted)",
                  }}
                >
                  <Hash size={11} aria-hidden="true" />
                  {formatBytes(fileSize)}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="docs-viewer-info">
          <h4 className="docs-viewer-info-title">{document.title}</h4>
          {document.description && (
            <p className="docs-viewer-info-desc">{document.description}</p>
          )}

          <dl className="hb-meta-list">
            <dt style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Folder size={12} aria-hidden="true" /> Categoria
            </dt>
            <dd>{document.category.name}</dd>

            <dt style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <VisIcon size={12} aria-hidden="true" /> Visibilidade
            </dt>
            <dd>{vis.label}</dd>

            <dt style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={12} aria-hidden="true" /> Atualizado
            </dt>
            <dd>{formatDate(document.updatedAt)}</dd>

            {document.publishedAt && (
              <>
                <dt style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={12} aria-hidden="true" /> Publicado
                </dt>
                <dd>{formatDate(document.publishedAt)}</dd>
              </>
            )}

            {fileSize !== undefined && (
              <>
                <dt style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <FileText size={12} aria-hidden="true" /> Tamanho
                </dt>
                <dd>{formatBytes(fileSize)}</dd>
              </>
            )}

            {document.currentVersion && (
              <>
                <dt style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Hash size={12} aria-hidden="true" /> Versão
                </dt>
                <dd>v{document.currentVersion.version}</dd>
              </>
            )}
          </dl>

          {document.tags.length > 0 && (
            <div>
              <p
                className="hb-section-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <Tag size={10} aria-hidden="true" /> Tags
              </p>
              <div className="docs-viewer-info-tags">
                {document.tags.map((tag) => (
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
        </div>
      )}
    </div>
  );
}

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
    // noUncheckedIndexedAccess: capture groups are string | undefined
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
          className="bg-[--bg-alt] border border-[--border] px-1 py-0.5 rounded text-[12.5px] font-[--font-mono]"
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
          className="text-[--brand] underline underline-offset-2"
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
    if (line === undefined) break; // noUncheckedIndexedAccess guard

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

    // Optional chaining on regex group — returns string | undefined, then guard
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
    if (token === undefined) break; // noUncheckedIndexedAccess guard

    if (token.type === "blank") {
      j++;
      continue;
    }

    if (token.type === "hr") {
      nodes.push(<hr key={token.key} className="border-[--border] my-5" />);
      j++;
      continue;
    }

    if (token.type === "h1") {
      nodes.push(
        <h2 key={token.key} className="hb-h2 mb-4 mt-6">
          {renderInline(token.content)}
        </h2>,
      );
      j++;
      continue;
    }

    if (token.type === "h2") {
      nodes.push(
        <h3 key={token.key} className="hb-h3 mb-3 mt-5">
          {renderInline(token.content)}
        </h3>,
      );
      j++;
      continue;
    }

    if (token.type === "h3") {
      nodes.push(
        <h4 key={token.key} className="hb-h4 mb-2 mt-4">
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
          className="bg-[--bg-alt] border border-[--border] rounded-[--radius-sm] p-4 mb-4 overflow-x-auto font-[--font-mono] text-[13px] leading-relaxed"
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
          className="list-disc list-inside space-y-1 mb-4 text-[--fg] text-[14px] leading-relaxed"
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
          className="text-[--fg] text-[14px] leading-[1.7] mb-3"
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
    <div
      className={`hb-card hb-card-overflow flex flex-col ${className}`}
      style={{ minHeight: "480px" }}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[--border] bg-[--bg-alt]">
        {/* Tabs */}
        <div className="flex gap-0 border border-[--border] rounded-[--radius-sm] overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveTab("document")}
            className={[
              "px-3 py-1.5 text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-colors duration-[--dur-fast]",
              activeTab === "document"
                ? "bg-[--brand] text-[--brand-fg]"
                : "bg-transparent text-[--fg-muted] hover:bg-[--hb-gray-50]",
            ].join(" ")}
          >
            <FileText size={13} aria-hidden="true" />
            Documento
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={[
              "px-3 py-1.5 text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-colors duration-[--dur-fast] border-l border-[--border]",
              activeTab === "info"
                ? "bg-[--brand] text-[--brand-fg]"
                : "bg-transparent text-[--fg-muted] hover:bg-[--hb-gray-50]",
            ].join(" ")}
          >
            <Info size={13} aria-hidden="true" />
            Informações
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

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
            <span className="hidden sm:inline">Nova aba</span>
          </a>
        )}
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="hb-btn hb-btn-secondary hb-btn-xs"
          >
            <Download size={13} aria-hidden="true" />
            <span className="hidden sm:inline">Baixar</span>
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === "document" ? (
        <div className="flex-1 relative">
          {fileUrl && isPdf ? (
            <iframe
              src={fileUrl}
              title={document.title}
              className="absolute inset-0 w-full h-full border-0"
              style={{ minHeight: "420px" }}
            />
          ) : fileUrl && isMarkdown && markdownContent ? (
            <div className="p-6 overflow-y-auto prose-like max-w-none">
              {renderMarkdown(markdownContent)}
            </div>
          ) : markdownContent ? (
            <div className="p-6 overflow-y-auto">
              {renderMarkdown(markdownContent)}
            </div>
          ) : (
            /* Placeholder when no file URL is available in mock mode */
            <div
              className="flex flex-col items-center justify-center h-full py-16 px-6 text-center"
              style={{ minHeight: "360px" }}
            >
              <div className="w-16 h-16 rounded-2xl bg-[--brand] flex items-center justify-center mb-4 shadow-[--shadow-brand]">
                <FileText
                  size={28}
                  className="text-[--brand-fg]"
                  aria-hidden="true"
                />
              </div>
              <h4 className="font-[--font-display] font-bold text-[16px] text-[--fg] mb-2">
                {document.title}
              </h4>
              <p className="text-[--fg-muted] text-[13.5px] leading-relaxed max-w-sm mb-4">
                {document.description ??
                  "O arquivo será exibido aqui quando disponível."}
              </p>
              {fileSize !== undefined && (
                <span className="hb-badge bg-[--bg-alt] text-[--fg-muted]">
                  <Hash size={11} aria-hidden="true" />
                  {formatBytes(fileSize)}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Info tab */
        <div className="p-5 space-y-4">
          <h4 className="font-[--font-display] font-bold text-[15px] text-[--fg] mb-1 leading-[1.3]">
            {document.title}
          </h4>
          {document.description && (
            <p className="text-[--fg-muted] text-[13.5px] leading-[1.6]">
              {document.description}
            </p>
          )}

          <dl className="hb-meta-list">
            <dt className="flex items-center gap-1.5">
              <Folder size={12} aria-hidden="true" /> Categoria
            </dt>
            <dd>{document.category.name}</dd>

            <dt className="flex items-center gap-1.5">
              <VisIcon size={12} aria-hidden="true" /> Visibilidade
            </dt>
            <dd>{vis.label}</dd>

            <dt className="flex items-center gap-1.5">
              <Calendar size={12} aria-hidden="true" /> Atualizado
            </dt>
            <dd>{formatDate(document.updatedAt)}</dd>

            {document.publishedAt && (
              <>
                <dt className="flex items-center gap-1.5">
                  <Calendar size={12} aria-hidden="true" /> Publicado
                </dt>
                <dd>{formatDate(document.publishedAt)}</dd>
              </>
            )}

            {fileSize !== undefined && (
              <>
                <dt className="flex items-center gap-1.5">
                  <FileText size={12} aria-hidden="true" /> Tamanho
                </dt>
                <dd>{formatBytes(fileSize)}</dd>
              </>
            )}

            {document.currentVersion && (
              <>
                <dt className="flex items-center gap-1.5">
                  <Hash size={12} aria-hidden="true" /> Versão
                </dt>
                <dd>v{document.currentVersion.version}</dd>
              </>
            )}
          </dl>

          {document.tags.length > 0 && (
            <div>
              <p className="hb-section-label flex items-center gap-1.5">
                <Tag size={10} aria-hidden="true" /> Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {document.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-[--bg-alt] text-[--fg-muted] border border-[--border]"
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

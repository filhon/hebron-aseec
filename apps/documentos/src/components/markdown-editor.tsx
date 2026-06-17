"use client";

import { useState, useRef, useCallback } from "react";
import {
  Bold,
  Code,
  Columns2,
  Eye,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  PenLine,
  Quote,
} from "lucide-react";

type ViewMode = "split" | "editor" | "preview";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  "aria-describedby"?: string;
}

// ─── Inline markdown renderer ─────────────────────────────────────────────────

function applyInline(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /`(.+?)`/g,
      `<code style="background:var(--bg-alt);border:1px solid var(--border);padding:1px 5px;border-radius:3px;font-size:12px;font-family:var(--font-mono)">$1</code>`,
    )
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      `<a href="$2" style="color:var(--brand);text-decoration:underline">$1</a>`,
    );
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const parts: string[] = [];

  for (const line of lines) {
    if (/^### /.test(line)) {
      parts.push(
        `<h4 style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--fg);margin:12px 0 4px">${applyInline(line.slice(4))}</h4>`,
      );
    } else if (/^## /.test(line)) {
      parts.push(
        `<h3 style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--fg);margin:16px 0 5px">${applyInline(line.slice(3))}</h3>`,
      );
    } else if (/^# /.test(line)) {
      parts.push(
        `<h2 style="font-family:var(--font-display);font-size:20px;font-weight:700;letter-spacing:-0.01em;color:var(--hb-blue);margin:0 0 10px">${applyInline(line.slice(2))}</h2>`,
      );
    } else if (/^---/.test(line)) {
      parts.push(
        `<hr style="border:none;border-top:1px solid var(--divider);margin:16px 0">`,
      );
    } else if (/^> /.test(line)) {
      parts.push(
        `<blockquote style="border-left:3px solid var(--brand);margin:0 0 8px;padding:6px 14px;background:rgba(32,44,133,0.04);font-style:italic;font-size:13px;color:var(--fg-muted)">${applyInline(line.slice(2))}</blockquote>`,
      );
    } else if (/^- /.test(line)) {
      parts.push(`<li class="__md_ul">${applyInline(line.slice(2))}</li>`);
    } else if (/^\d+\. /.test(line)) {
      parts.push(
        `<li class="__md_ol">${applyInline(line.replace(/^\d+\. /, ""))}</li>`,
      );
    } else if (line.trim() === "") {
      parts.push(`<p class="__md_br"></p>`);
    } else {
      parts.push(
        `<p style="font-size:13.5px;line-height:1.65;color:var(--fg);margin:0 0 8px">${applyInline(line)}</p>`,
      );
    }
  }

  return parts
    .join("")
    .replace(
      /(<li class="__md_ul">.*?<\/li>)+/g,
      (m) =>
        `<ul style="margin:0 0 10px;padding-left:20px;font-size:13.5px;color:var(--fg);line-height:1.65">${m}</ul>`,
    )
    .replace(
      /(<li class="__md_ol">.*?<\/li>)+/g,
      (m) =>
        `<ol style="margin:0 0 10px;padding-left:20px;font-size:13.5px;color:var(--fg);line-height:1.65">${m}</ol>`,
    )
    .replace(/<p class="__md_br"><\/p>/g, "");
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function MarkdownEditor({
  value,
  onChange,
  minHeight = 320,
  placeholder = "Escreva em Markdown…",
  disabled = false,
  id,
  "aria-describedby": describedBy,
}: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = useCallback(
    (before: string, after = "", defaultText = "") => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end) || defaultText;
      const newValue =
        value.slice(0, start) + before + selected + after + value.slice(end);
      onChange(newValue);
      setTimeout(() => {
        ta.focus();
        const cursor = start + before.length + selected.length;
        ta.setSelectionRange(cursor, cursor);
      }, 0);
    },
    [value, onChange],
  );

  const TOOLBAR = [
    {
      icon: <Bold size={13} />,
      label: "Negrito",
      action: () => insertAtCursor("**", "**", "texto"),
    },
    {
      icon: <Italic size={13} />,
      label: "Itálico",
      action: () => insertAtCursor("*", "*", "texto"),
    },
    {
      icon: <Heading2 size={13} />,
      label: "Título",
      action: () => insertAtCursor("\n## ", "", "Título"),
    },
    {
      icon: <Link2 size={13} />,
      label: "Link",
      action: () => insertAtCursor("[", "](url)", "texto"),
    },
    {
      icon: <List size={13} />,
      label: "Lista",
      action: () => insertAtCursor("\n- ", "", "item"),
    },
    {
      icon: <ListOrdered size={13} />,
      label: "Lista numerada",
      action: () => insertAtCursor("\n1. ", "", "item"),
    },
    {
      icon: <Code size={13} />,
      label: "Código",
      action: () => insertAtCursor("`", "`", "código"),
    },
    {
      icon: <Quote size={13} />,
      label: "Citação",
      action: () => insertAtCursor("\n> ", "", "citação"),
    },
  ] as const;

  const VIEW_MODES = [
    { id: "editor" as const, icon: <PenLine size={12} />, label: "Editar" },
    { id: "split" as const, icon: <Columns2 size={12} />, label: "Split" },
    { id: "preview" as const, icon: <Eye size={12} />, label: "Preview" },
  ];

  const preview = value
    ? renderMarkdown(value)
    : `<p style="color:var(--fg-subtle);font-size:13px;font-style:italic">Pré-visualização do conteúdo aparecerá aqui.</p>`;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
      }}
    >
      {/* ── Toolbar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          background: "var(--bg-alt)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", gap: 1, flex: 1, flexWrap: "wrap" }}>
          {TOOLBAR.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.action}
              disabled={disabled}
              title={btn.label}
              aria-label={btn.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: "var(--radius-xs, 4px)",
                background: "transparent",
                border: "none",
                color: "var(--fg-muted)",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!disabled) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--surface)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--brand)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--fg-muted)";
              }}
            >
              {btn.icon}
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div
          role="group"
          aria-label="Modo de visualização"
          style={{
            display: "flex",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setViewMode(mode.id)}
              aria-pressed={viewMode === mode.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                background:
                  viewMode === mode.id ? "var(--brand)" : "var(--surface)",
                color:
                  viewMode === mode.id ? "var(--brand-fg)" : "var(--fg-muted)",
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                transition: "all var(--dur-fast)",
                whiteSpace: "nowrap",
              }}
            >
              {mode.icon}
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Panes ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            viewMode === "split"
              ? "1fr 1fr"
              : viewMode === "editor"
                ? "1fr"
                : "1fr",
        }}
      >
        {viewMode !== "preview" && (
          <textarea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            spellCheck={false}
            aria-describedby={describedBy}
            aria-label="Editor de conteúdo Markdown"
            style={{
              width: "100%",
              minHeight,
              padding: "16px 18px",
              border: "none",
              borderRight:
                viewMode === "split" ? "1px solid var(--border)" : "none",
              outline: "none",
              resize: "vertical",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              lineHeight: 1.65,
              background: "var(--surface)",
              color: "var(--fg)",
            }}
          />
        )}

        {viewMode !== "editor" && (
          <div
            aria-label="Pré-visualização do conteúdo"
            style={{
              minHeight,
              padding: "16px 18px",
              background: "var(--hb-cream)",
              overflowY: "auto",
            }}
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        )}
      </div>
    </div>
  );
}

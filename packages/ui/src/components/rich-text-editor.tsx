"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TOOLBAR_ACTIONS = [
  { command: "bold", icon: Bold, label: "Negrito" },
  { command: "italic", icon: Italic, label: "Itálico" },
  { command: "underline", icon: Underline, label: "Sublinhado" },
  { command: "insertUnorderedList", icon: List, label: "Lista" },
  { command: "insertOrderedList", icon: ListOrdered, label: "Lista numerada" },
] as const;

function isEmptyHtml(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim().length === 0;
}

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  minHeight?: number;
  className?: string;
  "aria-describedby"?: string;
  "aria-label"?: string;
}

/**
 * Editor de texto rico compartilhado (decisão D-1) — nenhum app deve
 * implementar seu próprio editor. Sem dependência externa (contentEditable +
 * document.execCommand); valor trafega como string HTML.
 */
export const RichTextEditor = React.forwardRef<
  HTMLDivElement,
  RichTextEditorProps
>(function RichTextEditor(
  {
    value,
    onChange,
    placeholder = "Escreva aqui…",
    disabled = false,
    id,
    minHeight = 160,
    className,
    "aria-describedby": describedBy,
    "aria-label": ariaLabel,
  },
  forwardedRef,
) {
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [focused, setFocused] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");

  React.useImperativeHandle(
    forwardedRef,
    () => innerRef.current as HTMLDivElement,
  );

  // contentEditable não pode ser controlado via `value` a cada tecla (perde
  // o cursor); só resincroniza quando o HTML externo diverge do DOM atual
  // (reset de formulário, troca de tarefa em edição).
  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  function emitChange() {
    const el = innerRef.current;
    if (!el) return;
    onChange(el.innerHTML);
  }

  function runCommand(command: string, arg?: string) {
    if (disabled) return;
    innerRef.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
  }

  function applyLink() {
    const url = linkUrl.trim();
    if (url) runCommand("createLink", url);
    setLinkUrl("");
    setLinkOpen(false);
  }

  const empty = isEmptyHtml(value);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-(--radius) border border-(--border) bg-(--bg)",
        "transition-colors duration-(--transition-fast)",
        focused && "border-(--brand) ring-2 ring-(--brand)/20",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-(--border) bg-(--surface-alt) px-2 py-1.5">
        {TOOLBAR_ACTIONS.map(({ command, icon: Icon, label }) => (
          <button
            key={command}
            type="button"
            title={label}
            aria-label={label}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand(command)}
            className="flex h-7 w-7 items-center justify-center rounded-(--radius-sm) text-(--fg-muted) transition-colors hover:bg-(--surface) hover:text-(--brand) disabled:pointer-events-none"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ))}

        <span className="mx-1 h-4 w-px bg-(--border)" aria-hidden="true" />

        <div className="relative">
          <button
            type="button"
            title="Inserir link"
            aria-label="Inserir link"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setLinkOpen((v) => !v)}
            aria-expanded={linkOpen}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-(--radius-sm) text-(--fg-muted) transition-colors hover:bg-(--surface) hover:text-(--brand)",
              linkOpen && "bg-(--surface) text-(--brand)",
            )}
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          {linkOpen && (
            <div className="absolute left-0 top-full z-(--z-dropdown) mt-1 flex w-64 items-center gap-1.5 rounded-(--radius-sm) border border-(--border) bg-(--bg) p-1.5 shadow-(--shadow-md)">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  }
                  if (e.key === "Escape") setLinkOpen(false);
                }}
                placeholder="https://…"
                autoFocus
                className="min-w-0 flex-1 bg-transparent px-1.5 text-(--text-xs) text-(--fg) outline-none placeholder:text-(--fg-muted)"
              />
              <button
                type="button"
                onClick={applyLink}
                className="shrink-0 rounded-(--radius-xs) bg-(--brand) px-2 py-1 text-(--text-xs) font-semibold text-(--brand-fg)"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        {empty && !focused && (
          <p
            className="pointer-events-none absolute left-3.5 top-3 text-(--text-sm) text-(--fg-muted)"
            aria-hidden="true"
          >
            {placeholder}
          </p>
        )}
        <div
          ref={innerRef}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel ?? "Editor de texto rico"}
          aria-describedby={describedBy}
          aria-placeholder={placeholder}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emitChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ minHeight }}
          className={cn(
            "px-3.5 py-3 text-(--text-sm) leading-relaxed text-(--fg) outline-none",
            "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
            "[&_a]:text-(--brand) [&_a]:underline",
          )}
        />
      </div>
    </div>
  );
});

RichTextEditor.displayName = "RichTextEditor";

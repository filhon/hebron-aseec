import type { CSSProperties } from "react";
import sanitizeHtml, { type IOptions } from "sanitize-html";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SANITIZE_OPTIONS: IOptions = {
  allowedTags: [
    "b",
    "strong",
    "i",
    "em",
    "u",
    "ul",
    "ol",
    "li",
    "a",
    "br",
    "p",
    "div",
  ],
  allowedAttributes: {
    a: ["href"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href"],
  nonTextTags: ["script", "style", "textarea", "option", "iframe", "noscript"],
  disallowedTagsMode: "discard",
};

/**
 * Allowlist única para todo HTML produzido por RichTextEditor (decisão D-1).
 * Sanitiza na renderização — cobre também o que já está gravado no banco
 * sem passar por allowlist antes desta função existir.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

export interface RichTextProps {
  html: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Exibe HTML de RichTextEditor. Mesma tipografia de lista/link do editor
 * (rich-text-editor.tsx) para o texto formatado ficar igual em edição e leitura.
 * Sem hooks — precisa renderizar tanto em Server Components (announcement-card)
 * quanto em Client Components.
 */
export function RichText({ html, className, style }: RichTextProps) {
  const clean = sanitizeRichText(html);

  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-(--fg)",
        "[&_p]:m-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_a]:text-(--brand) [&_a]:underline",
        className,
      )}
      style={style}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

/**
 * rich-text.test.ts — P-4.4b (critério de aceite: teste do sanitizador cobre
 * o que bloqueia — script, on*, href javascript:, img onerror — e o que
 * preserva — negrito, itálico, sublinhado, listas, link http).
 */
import { describe, it, expect } from "vitest";
import { sanitizeRichText } from "../rich-text";

describe("sanitizeRichText", () => {
  it("bloqueia <script>: tag e conteúdo removidos", () => {
    expect(sanitizeRichText("<p>oi</p><script>alert(1)</script>")).toBe(
      "<p>oi</p>",
    );
  });

  it("bloqueia href com esquema javascript:", () => {
    const out = sanitizeRichText('<a href="javascript:alert(1)">clique</a>');
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("href");
  });

  it("bloqueia <img onerror>: tag removida por completo", () => {
    const out = sanitizeRichText('<img src="x" onerror="alert(1)">texto');
    expect(out).not.toContain("<img");
    expect(out).not.toContain("onerror");
    expect(out).toContain("texto");
  });

  it("bloqueia atributos on* em tags permitidas", () => {
    const out = sanitizeRichText('<p onclick="alert(1)">clique aqui</p>');
    expect(out).not.toContain("onclick");
    expect(out).toContain("clique aqui");
  });

  it("bloqueia atributo style", () => {
    const out = sanitizeRichText(
      '<p style="background:url(javascript:alert(1))">oi</p>',
    );
    expect(out).not.toContain("style");
  });

  it("bloqueia <iframe>", () => {
    const out = sanitizeRichText(
      '<iframe src="https://evil.example"></iframe>texto',
    );
    expect(out).not.toContain("<iframe");
    expect(out).toContain("texto");
  });

  it("preserva negrito, itálico e sublinhado", () => {
    const out = sanitizeRichText(
      "<b>negrito</b> <i>itálico</i> <u>sublinhado</u>",
    );
    expect(out).toBe("<b>negrito</b> <i>itálico</i> <u>sublinhado</u>");
  });

  it("preserva listas com e sem numeração", () => {
    const out = sanitizeRichText(
      "<ul><li>um</li><li>dois</li></ul><ol><li>primeiro</li></ol>",
    );
    expect(out).toBe(
      "<ul><li>um</li><li>dois</li></ul><ol><li>primeiro</li></ol>",
    );
  });

  it("preserva link http com apenas o atributo href", () => {
    const out = sanitizeRichText(
      '<a href="https://hebronaseec.com.br" target="_blank" class="x">site</a>',
    );
    expect(out).toBe('<a href="https://hebronaseec.com.br">site</a>');
  });

  it("preserva link mailto", () => {
    const out = sanitizeRichText(
      '<a href="mailto:contato@hebronaseec.com.br">email</a>',
    );
    expect(out).toBe('<a href="mailto:contato@hebronaseec.com.br">email</a>');
  });
});

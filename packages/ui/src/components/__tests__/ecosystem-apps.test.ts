/**
 * ecosystem-apps.test.ts — P-0.6b (critério de aceite: resolveNotificationHref
 * coberto por teste — mesmo módulo, módulo diferente, payload sem `module`,
 * payload sem `href`).
 */
import { describe, it, expect } from "vitest";
import { resolveNotificationHref } from "../ecosystem-apps";

describe("resolveNotificationHref", () => {
  it("mesmo módulo do app atual: devolve o href relativo como está", () => {
    const href = resolveNotificationHref(
      { module: "intranet", href: "/reunioes" },
      "intranet",
    );
    expect(href).toBe("/reunioes");
  });

  it("módulo diferente: prefixa a URL canônica do módulo de origem", () => {
    const href = resolveNotificationHref(
      { module: "tarefas", href: "/tarefa/123" },
      "intranet",
    );
    expect(href).toBe("https://tarefas.hebronaseec.com.br/tarefa/123");
  });

  it("payload antigo sem `module`: continua funcionando como hoje (href relativo local)", () => {
    const href = resolveNotificationHref({ href: "/anuncios" }, "intranet");
    expect(href).toBe("/anuncios");
  });

  it("payload sem `href`: cai no fallback raiz", () => {
    expect(resolveNotificationHref({ module: "intranet" }, "intranet")).toBe(
      "/",
    );
    expect(resolveNotificationHref({ module: "tarefas" }, "intranet")).toBe(
      "https://tarefas.hebronaseec.com.br/",
    );
  });

  it("payload nulo: cai no fallback raiz", () => {
    expect(resolveNotificationHref(null, "intranet")).toBe("/");
  });

  it("módulo desconhecido: trata como se fosse o módulo local (não quebra)", () => {
    const href = resolveNotificationHref(
      { module: "modulo-inexistente", href: "/x" },
      "intranet",
    );
    expect(href).toBe("/x");
  });
});

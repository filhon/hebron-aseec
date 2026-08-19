/**
 * app-middleware.test.ts — AUDIT PACOTE 3.
 *
 * `resolveReturnToDestination`/`isAllowedReturnToOrigin` are the only gate
 * between an attacker-supplied `return_to` query param and a `redirect()`
 * call in intranet's `/post-login` (every other app funnels through it
 * after login, since only intranet hosts the login/MFA pages). Covers both
 * directions: same-app relative paths still work, and the new cross-app
 * case (8 of 9 apps log in on a different subdomain) only trusts Hebron's
 * own origins — never an attacker-supplied host.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isAllowedReturnToOrigin,
  resolveReturnToDestination,
} from "../app-middleware";

const originalEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalEnv;
});

describe("resolveReturnToDestination", () => {
  it('sem return_to → "/"', () => {
    expect(resolveReturnToDestination(undefined)).toBe("/");
  });

  it("caminho relativo dentro do próprio app → preservado", () => {
    expect(resolveReturnToDestination("/pipeline/123?tab=votos")).toBe(
      "/pipeline/123?tab=votos",
    );
  });

  it('protocol-relative (//host) → recusado, cai em "/"', () => {
    expect(resolveReturnToDestination("//evil.example.com/phish")).toBe("/");
  });

  it('host arbitrário → recusado, cai em "/"', () => {
    expect(resolveReturnToDestination("https://evil.example.com/phish")).toBe(
      "/",
    );
  });

  it('string não é URL válida → recusado, cai em "/"', () => {
    expect(resolveReturnToDestination("not a url::")).toBe("/");
  });

  describe("em produção", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    it("subdomínio hebronaseec.com.br (outro app) → preservado", () => {
      const url = "https://financeiro.hebronaseec.com.br/contas-pagar";
      expect(resolveReturnToDestination(url)).toBe(url);
    });

    it("hebronaseec.com.br sem subdomínio → preservado", () => {
      const url = "https://hebronaseec.com.br/algo";
      expect(resolveReturnToDestination(url)).toBe(url);
    });

    it("domínio parecido mas diferente (typosquat) → recusado", () => {
      expect(
        resolveReturnToDestination("https://hebronaseec.com.br.evil.com/x"),
      ).toBe("/");
      expect(
        resolveReturnToDestination("https://evil-hebronaseec.com.br/x"),
      ).toBe("/");
    });

    it("http (não https) em produção → recusado", () => {
      expect(
        resolveReturnToDestination("http://financeiro.hebronaseec.com.br/x"),
      ).toBe("/");
    });

    it("localhost em produção → recusado", () => {
      expect(resolveReturnToDestination("http://localhost:3004/x")).toBe("/");
    });
  });

  describe("em desenvolvimento", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("localhost com a porta de outro app → preservado", () => {
      const url = "http://localhost:3004/contas-pagar";
      expect(resolveReturnToDestination(url)).toBe(url);
    });

    it("subdomínio de produção em dev → recusado (https + hostname não batem)", () => {
      expect(
        resolveReturnToDestination("https://financeiro.hebronaseec.com.br/x"),
      ).toBe("/");
    });
  });
});

describe("isAllowedReturnToOrigin", () => {
  it("origem malformada → false, não lança", () => {
    expect(isAllowedReturnToOrigin("not-a-url")).toBe(false);
  });
});

/**
 * client.test.ts — P-0.4b (corretivo: simetria de codificação de cookies).
 *
 * `parseCookies` lia o valor cru (sem `decodeURIComponent`) enquanto
 * `setCookie` grava com `encodeURIComponent` — round-trip quebrado para
 * qualquer valor com caractere transformado pelo encode (o bug ficava
 * dormente porque tokens Supabase em base64url não usam esses caracteres).
 * Este arquivo cobre o round-trip corrigido e a resiliência a um cookie de
 * terceiros com `%` malformado no mesmo domínio.
 *
 * Não usa `db`/Supabase real: `parseCookies`/`setCookie` só dependem de
 * `document.cookie`, então o teste substitui `globalThis.document` por um
 * jar de cookies falso que se comporta como um browser real (armazena por
 * nome, `cookie` getter retorna a string concatenada "name=value; ...").
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { parseCookies, setCookie } from "../client";

class FakeCookieJar {
  private store = new Map<string, string>();

  get cookie(): string {
    return Array.from(this.store.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  set cookie(str: string) {
    const [pair] = str.split(";");
    const eqIdx = (pair ?? "").indexOf("=");
    if (eqIdx === -1) return;
    const name = (pair ?? "").slice(0, eqIdx);
    const value = (pair ?? "").slice(eqIdx + 1);
    this.store.set(name, value);
  }

  /** Inserts a raw entry bypassing setCookie's encoding, like a third-party cookie would. */
  setRaw(name: string, rawValue: string): void {
    this.store.set(name, rawValue);
  }
}

let jar: FakeCookieJar;

beforeEach(() => {
  jar = new FakeCookieJar();
  (globalThis as Record<string, unknown>)["document"] = jar;
});

afterAll(() => {
  delete (globalThis as Record<string, unknown>)["document"];
});

describe("parseCookies / setCookie round-trip", () => {
  it("preserves values with characters encodeURIComponent transforms", () => {
    const cases = ["{}", '"quoted"', "a=b", "space value", "acentuação"];

    for (const [i, value] of cases.entries()) {
      setCookie(`sb-test-${i}`, value, { path: "/" });
    }

    const parsed = parseCookies();
    for (const [i, value] of cases.entries()) {
      const entry = parsed.find((c) => c.name === `sb-test-${i}`);
      expect(entry?.value).toBe(value);
    }
  });

  it("round-trips a name that itself needs encoding", () => {
    setCookie("sb name", "v", { path: "/" });
    const parsed = parseCookies();
    expect(parsed.find((c) => c.value === "v")?.name).toBe("sb name");
  });
});

describe("parseCookies resilience to malformed third-party cookies", () => {
  it("does not throw and does not empty getAll when a sibling cookie has a malformed %", () => {
    setCookie("sb-session", "healthy-value", { path: "/" });
    jar.setRaw("third_party", "abc%zz");

    let parsed: Array<{ name: string; value: string }> = [];
    expect(() => {
      parsed = parseCookies();
    }).not.toThrow();

    expect(parsed.find((c) => c.name === "sb-session")?.value).toBe(
      "healthy-value",
    );
    expect(parsed.find((c) => c.name === "third_party")?.value).toBe("abc%zz");
  });
});

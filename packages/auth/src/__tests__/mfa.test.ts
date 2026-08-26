/**
 * mfa.test.ts — P-1.26b (corretivo do primeiro débito de S-60).
 *
 * Cobre a decisão que a página `/mfa/enroll` passou a tomar antes de
 * renderizar o formulário: quem já tem um fator TOTP `verified` vai para
 * `/mfa/challenge`; quem não tem fator algum — ou tem só um `unverified`,
 * de um enrollment interrompido no meio — continua vendo o formulário.
 *
 * Os testes de unidade usam um duplo do client e alimentam `data.totp` com
 * fatores `unverified` — situação que o supabase-js instalado hoje não
 * produz (seu `listFactors()` já filtra `status === "verified"` ao montar
 * `data.totp`; só `data.all` traz todos). Eles fixam o filtro que
 * `hasVerifiedTotpFactor` faz por conta própria, que é o que segura a
 * regra caso essa implementação mude. O comportamento real do Supabase
 * está no bloco de integração mais abaixo.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  anyRoleRequiresMfa,
  enrollTotp,
  hasVerifiedTotpFactor,
  isMfaRequired,
  verifytotpEnrollment,
} from "../mfa";
import { createSupabaseServerActionClient } from "../server";
import {
  createTestAuthUser,
  createTestSessionCookies,
  deleteTestAuthUser,
} from "../testing";
import type { TotpFactor } from "../types";

/**
 * Client mínimo com só a superfície que `hasVerifiedTotpFactor` usa.
 * `listFactorsResult` é o par { data, error } que o supabase-js devolve.
 */
function fakeSupabase(listFactorsResult: {
  data: { totp: TotpFactor[] } | null;
  error: unknown;
}): SupabaseClient {
  return {
    auth: {
      mfa: {
        listFactors: async () => listFactorsResult,
      },
    },
  } as unknown as SupabaseClient;
}

function totpFactor(status: TotpFactor["status"], id: string): TotpFactor {
  return { id, factor_type: "totp", status };
}

describe("hasVerifiedTotpFactor", () => {
  it("devolve true quando existe um fator TOTP verificado", async () => {
    const supabase = fakeSupabase({
      data: { totp: [totpFactor("verified", "factor-1")] },
      error: null,
    });
    expect(await hasVerifiedTotpFactor(supabase)).toBe(true);
  });

  it("devolve false quando o único fator está unverified (enrollment interrompido)", async () => {
    const supabase = fakeSupabase({
      data: { totp: [totpFactor("unverified", "factor-1")] },
      error: null,
    });
    expect(await hasVerifiedTotpFactor(supabase)).toBe(false);
  });

  it("devolve false quando não há fator algum", async () => {
    const supabase = fakeSupabase({ data: { totp: [] }, error: null });
    expect(await hasVerifiedTotpFactor(supabase)).toBe(false);
  });

  it("devolve true quando há um unverified e um verified ao mesmo tempo", async () => {
    const supabase = fakeSupabase({
      data: {
        totp: [
          totpFactor("unverified", "factor-1"),
          totpFactor("verified", "factor-2"),
        ],
      },
      error: null,
    });
    expect(await hasVerifiedTotpFactor(supabase)).toBe(true);
  });

  it("devolve false quando listFactors falha (não bloqueia o enrollment)", async () => {
    const supabase = fakeSupabase({
      data: null,
      error: new Error("network"),
    });
    expect(await hasVerifiedTotpFactor(supabase)).toBe(false);
  });
});

/**
 * Os testes acima fixam a decisão a partir de um `listFactors()` conhecido.
 * O bloco abaixo verifica a premissa que eles assumem, contra o Supabase
 * Auth real: um enrollment iniciado e não confirmado NÃO conta como fator
 * verificado — sem isso, o gate de `/mfa/enroll` mandaria para o desafio
 * alguém que ainda nem terminou de enrolar, e essa pessoa ficaria em
 * looping entre as duas páginas sem conseguir concluir nenhuma.
 */
const SUFFIX = Date.now();
const EMAIL = `mfa-enroll-${SUFFIX}@test.hebron`;
const PASSWORD = "test-password-not-secret-123!";

let testUserId: string;

/** Decodifica o secret base32 (RFC 4648) que o Supabase devolve no enroll. */
function decodeBase32(secret: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.replace(/=+$/, "").toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index >= 0) bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/** Código TOTP de 6 dígitos (RFC 6238, SHA-1, janela de 30s). */
function totpCode(secret: string, timeStep: number): string {
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(Math.floor(timeStep / 2 ** 32), 0);
  counter.writeUInt32BE(timeStep % 2 ** 32, 4);
  const hmac = createHmac("sha1", decodeBase32(secret))
    .update(counter)
    .digest();
  const offset = hmac.readUInt8(hmac.length - 1) & 0x0f;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return (binary % 1_000_000).toString().padStart(6, "0");
}

beforeAll(async () => {
  testUserId = await createTestAuthUser(EMAIL, PASSWORD, "Usuário MFA");
}, 30_000);

afterAll(async () => {
  await deleteTestAuthUser(testUserId);
}, 30_000);

describe("hasVerifiedTotpFactor contra o Supabase Auth real", () => {
  it("só devolve true depois de o fator ser confirmado, não ao enrolar", async () => {
    const store = await createTestSessionCookies(EMAIL, PASSWORD);
    const supabase = createSupabaseServerActionClient({
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => store.set(name, value));
      },
    });

    // 1. Sem fator algum: a página de enrollment deve renderizar o formulário.
    expect(await hasVerifiedTotpFactor(supabase)).toBe(false);

    // 2. Enrollment iniciado mas não confirmado: ainda o formulário — quem
    //    parou no meio precisa poder concluir.
    const enrolled = await enrollTotp(supabase, "P-1.26b");
    expect(enrolled.error).toBeNull();
    expect(enrolled.factorId).not.toBe("");
    expect(await hasVerifiedTotpFactor(supabase)).toBe(false);

    // 3. Confirmado: a página deve redirecionar para /mfa/challenge.
    const step = Math.floor(Date.now() / 1000 / 30);
    const { error } = await verifytotpEnrollment(
      supabase,
      enrolled.factorId,
      totpCode(enrolled.secret, step),
    );
    expect(error).toBeNull();
    expect(await hasVerifiedTotpFactor(supabase)).toBe(true);
  }, 30_000);
});

describe("papéis que exigem MFA", () => {
  it("exige MFA para super_admin e diretor", () => {
    expect(isMfaRequired("super_admin")).toBe(true);
    expect(isMfaRequired("diretor")).toBe(true);
  });

  it("não exige MFA para os demais papéis", () => {
    expect(isMfaRequired("colaborador")).toBe(false);
    expect(anyRoleRequiresMfa(["submissor", "aluno"])).toBe(false);
  });

  it("basta um papel que exija para o usuário cair no fluxo de MFA", () => {
    expect(anyRoleRequiresMfa(["submissor", "diretor"])).toBe(true);
  });
});

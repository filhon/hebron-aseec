/**
 * rate-limit.test.ts — PACOTE 5 (AUDIT/04-BACKLOG-CORRECAO.md, produção).
 *
 * Sem UPSTASH_REDIS_REST_URL/TOKEN (caso de dev/CI/teste), getRateLimiter
 * cai no limitador em memória — determinístico, sem rede, e é exatamente o
 * caminho que os call sites (heartbeat, acceptInvitation, submitProject)
 * exercitam num ambiente sem Upstash configurado. Não testamos o caminho
 * Upstash real aqui (exigiria uma conta/rede) — a interface RateLimiter é a
 * mesma dos dois lados, então este teste cobre a lógica de janela que os
 * dois compartilham indiretamente.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getRateLimiter, enforceRateLimit } from "../rate-limit";
import { BusinessError } from "../safe-action-error";

describe("getRateLimiter (fallback em memória)", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("permite até o limite configurado e recusa a partir daí", async () => {
    const limiter = getRateLimiter(`test-${crypto.randomUUID()}`, 3, 60);

    const first = await limiter.limit("k1");
    const second = await limiter.limit("k1");
    const third = await limiter.limit("k1");
    const fourth = await limiter.limit("k1");

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(third.success).toBe(true);
    expect(fourth.success).toBe(false);
  });

  it("mantém contadores independentes por chave", async () => {
    const limiter = getRateLimiter(`test-${crypto.randomUUID()}`, 1, 60);

    const a1 = await limiter.limit("actor:a");
    const a2 = await limiter.limit("actor:a");
    const b1 = await limiter.limit("actor:b");

    expect(a1.success).toBe(true);
    expect(a2.success).toBe(false);
    expect(b1.success).toBe(true);
  });

  it("reutiliza o mesmo limitador (e seu estado) para o mesmo name+max+window", async () => {
    const name = `test-${crypto.randomUUID()}`;
    const first = getRateLimiter(name, 1, 60);
    await first.limit("k");

    const second = getRateLimiter(name, 1, 60);
    const result = await second.limit("k");

    expect(result.success).toBe(false);
  });
});

describe("enforceRateLimit", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("não lança enquanto dentro do limite", async () => {
    const limiter = getRateLimiter(`test-${crypto.randomUUID()}`, 2, 60);
    await expect(enforceRateLimit(limiter, "k")).resolves.toBeUndefined();
  });

  it("lança BusinessError com mensagem em português ao exceder o limite", async () => {
    const limiter = getRateLimiter(`test-${crypto.randomUUID()}`, 1, 60);
    await enforceRateLimit(limiter, "k");

    await expect(enforceRateLimit(limiter, "k")).rejects.toThrow(BusinessError);
    await expect(enforceRateLimit(limiter, "k")).rejects.toThrow(
      "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
    );
  });

  it("aceita uma mensagem customizada", async () => {
    const limiter = getRateLimiter(`test-${crypto.randomUUID()}`, 1, 60);
    await enforceRateLimit(limiter, "k");

    await expect(
      enforceRateLimit(limiter, "k", "Mensagem customizada"),
    ).rejects.toThrow("Mensagem customizada");
  });
});

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { BusinessError } from "./safe-action-error";

export interface RateLimitOutcome {
  success: boolean;
  remaining: number;
}

export interface RateLimiter {
  limit(key: string): Promise<RateLimitOutcome>;
}

/**
 * Fallback usado quando UPSTASH_REDIS_REST_URL/TOKEN não estão configuradas
 * (dev, testes, CI). Em produção serverless (Vercel) cada invocação pode
 * cair numa instância diferente do processo Node — este fallback NÃO
 * protege de verdade em produção sem as credenciais reais (ver o
 * .env.example de cada app e o runbook do PACOTE 5).
 */
class InMemoryFixedWindowLimiter implements RateLimiter {
  private readonly hits = new Map<
    string,
    { count: number; windowStart: number }
  >();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  async limit(key: string): Promise<RateLimitOutcome> {
    const now = Date.now();
    const entry = this.hits.get(key);
    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.hits.set(key, { count: 1, windowStart: now });
      return { success: true, remaining: this.max - 1 };
    }
    entry.count += 1;
    return {
      success: entry.count <= this.max,
      remaining: Math.max(0, this.max - entry.count),
    };
  }
}

class UpstashLimiter implements RateLimiter {
  constructor(private readonly ratelimit: Ratelimit) {}

  async limit(key: string): Promise<RateLimitOutcome> {
    const { success, remaining } = await this.ratelimit.limit(key);
    return { success, remaining };
  }
}

const limiterCache = new Map<string, RateLimiter>();
let loggedFallbackWarning = false;

/**
 * `name` vira o prefixo da chave (no Redis, quando configurado) — reusar o
 * mesmo `name`+`max`+`windowSeconds` em call sites diferentes compartilha o
 * mesmo orçamento de tentativas; combinações diferentes ganham limitadores
 * independentes.
 */
export function getRateLimiter(
  name: string,
  max: number,
  windowSeconds: number,
): RateLimiter {
  const cacheKey = `${name}:${max}:${windowSeconds}`;
  const cached = limiterCache.get(cacheKey);
  if (cached) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  let limiter: RateLimiter;
  if (url && token) {
    limiter = new UpstashLimiter(
      new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
        prefix: `hebron:ratelimit:${name}`,
      }),
    );
  } else {
    if (!loggedFallbackWarning) {
      loggedFallbackWarning = true;
      console.warn(
        JSON.stringify({
          event: "rate_limit_fallback_in_memory",
          reason:
            "UPSTASH_REDIS_REST_URL/TOKEN ausentes — usando limitador em memória, sem proteção real entre instâncias serverless",
        }),
      );
    }
    limiter = new InMemoryFixedWindowLimiter(max, windowSeconds * 1000);
  }

  limiterCache.set(cacheKey, limiter);
  return limiter;
}

const DEFAULT_MESSAGE =
  "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";

/**
 * Lança BusinessError (mensagem chega ao usuário via handleServerError,
 * packages/auth/src/safe-action-error.ts) quando o limite foi excedido.
 * Uso esperado: dentro de um `.use()` de next-safe-action. Para Route
 * Handlers fora de next-safe-action (ex.: apps/radio .../api/heartbeat),
 * chamar `getRateLimiter(...).limit(key)` diretamente e responder 429.
 */
export async function enforceRateLimit(
  limiter: RateLimiter,
  key: string,
  message: string = DEFAULT_MESSAGE,
): Promise<void> {
  const { success } = await limiter.limit(key);
  if (!success) {
    throw new BusinessError(message);
  }
}

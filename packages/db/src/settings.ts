import { eq } from "drizzle-orm";
import { db } from "./client";
import { featureFlags, systemSettings } from "./schema/admin";

/**
 * Cache curto em memória por processo (S1-18): `system_settings`/
 * `feature_flags` são lidos por toda mutação que consulta configuração
 * (ex.: template de checklist de tarefas, critérios de scoring) — sem
 * cache, cada leitura vira um round-trip ao banco no caminho crítico de
 * Server Actions e crons. TTL curto porque estas tabelas são editadas pelo
 * Admin em runtime (`apps/admin/src/actions/settings.ts`) e o valor deve
 * propagar em segundos, não em minutos.
 */
const CACHE_TTL_MS = 30_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const settingsCache = new Map<string, CacheEntry<unknown>>();
const flagsCache = new Map<string, CacheEntry<FeatureFlagState>>();

function readCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
): T | undefined {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return undefined;
  return entry.value;
}

function writeCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Lê `admin.system_settings` por chave. Retorna `null` se a chave não
 * existir — integração de leitura (G6.5): o chamador decide o fallback,
 * esta função nunca lança para "configuração ausente".
 */
export async function getSystemSetting<T = unknown>(
  key: string,
): Promise<T | null> {
  const cached = readCache(settingsCache, key);
  if (cached !== undefined) return cached as T;

  const [row] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  const value = (row?.value as T | undefined) ?? null;
  writeCache(settingsCache, key, value);
  return value;
}

/**
 * Limpa o cache em memória (uso exclusivo de testes — packages/db e
 * packages/integrations manipulam admin.system_settings/admin.feature_flags
 * diretamente entre asserts e precisam de leituras não cacheadas, sem
 * esperar os 30s de TTL real).
 */
export function clearSettingsCache(): void {
  settingsCache.clear();
  flagsCache.clear();
}

export interface FeatureFlagState {
  enabled: boolean;
  rolloutPercent: number;
}

const DISABLED_FLAG: FeatureFlagState = { enabled: false, rolloutPercent: 0 };

/**
 * Lê `admin.feature_flags` por chave. Flag inexistente é tratada como
 * desligada (fail-closed), nunca como erro.
 */
export async function getFeatureFlag(key: string): Promise<FeatureFlagState> {
  const cached = readCache(flagsCache, key);
  if (cached !== undefined) return cached;

  const [row] = await db
    .select({
      enabled: featureFlags.enabled,
      rolloutPercent: featureFlags.rolloutPercent,
    })
    .from(featureFlags)
    .where(eq(featureFlags.key, key))
    .limit(1);

  const state = row
    ? { enabled: row.enabled, rolloutPercent: row.rolloutPercent }
    : DISABLED_FLAG;

  writeCache(flagsCache, key, state);
  return state;
}

/**
 * `enabled` + amostragem por `rolloutPercent` (0–100, distribuição
 * aleatória por chamada — não sticky por usuário, suficiente para o uso
 * atual de rollout gradual de feature). Use `getFeatureFlag` diretamente
 * quando o chamador precisar aplicar sua própria regra de amostragem
 * (ex.: sticky por `userId`).
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const { enabled, rolloutPercent } = await getFeatureFlag(key);
  if (!enabled) return false;
  if (rolloutPercent >= 100) return true;
  if (rolloutPercent <= 0) return false;
  return Math.random() * 100 < rolloutPercent;
}

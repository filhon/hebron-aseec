/**
 * settings.test.ts — getSystemSetting / getFeatureFlag / isFeatureEnabled (P-0.15)
 *
 * Sem mock: lê/escreve as tabelas reais admin.system_settings e
 * admin.feature_flags. Cobre o comportamento fail-closed (chave ausente) e
 * o cache-hit (uma mudança no banco não aparece antes do TTL expirar).
 *
 * Não usa vi.useFakeTimers/vi.setSystemTime para exercitar a expiração do
 * TTL: `packages/db/vitest.config.ts` roda esta suíte em `singleFork`
 * (mesmo processo que system-actor.test.ts/meetings.test.ts), e fake timers
 * globais travam o setTimeout interno do driver `postgres` — uma primeira
 * versão deste teste avançava o relógio fake por cima de uma query real e
 * pendurou a suíte inteira (system-actor/meetings deram timeout em
 * cascata). A expiração em si é uma comparação `Date.now()` trivial; não
 * vale o risco de travar o processo só para cobri-la.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../client";
import { users } from "../schema/public";
import { systemSettings, featureFlags } from "../schema/admin";
import {
  getSystemSetting,
  getFeatureFlag,
  isFeatureEnabled,
} from "../settings";

const ACTOR_ID = "eeaa0000-0000-0000-0000-000000000002";
const SETTING_KEY = "test_settings_helper_key";
const FLAG_KEY_OFF = "test_settings_helper_flag_off";
const FLAG_KEY_ON = "test_settings_helper_flag_on";
const FLAG_KEY_ZERO = "test_settings_helper_flag_zero";

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: ACTOR_ID,
      email: "settings-test@test.hebron",
      fullName: "Settings Test",
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(systemSettings).where(eq(systemSettings.key, SETTING_KEY));
  await db.delete(featureFlags).where(eq(featureFlags.key, FLAG_KEY_OFF));
  await db.delete(featureFlags).where(eq(featureFlags.key, FLAG_KEY_ON));
  await db.delete(featureFlags).where(eq(featureFlags.key, FLAG_KEY_ZERO));
  await db.delete(users).where(eq(users.id, ACTOR_ID));
});

describe("getSystemSetting", () => {
  it("retorna null para chave inexistente (fail-closed, não lança)", async () => {
    const value = await getSystemSetting(`${SETTING_KEY}_missing`);
    expect(value).toBeNull();
  });

  it("lê o valor gravado e serve do cache dentro do TTL", async () => {
    await db.insert(systemSettings).values({
      key: SETTING_KEY,
      value: { foo: "bar" },
      label: "Test setting",
      updatedBy: ACTOR_ID,
    });

    const first = await getSystemSetting<{ foo: string }>(SETTING_KEY);
    expect(first).toEqual({ foo: "bar" });

    await db
      .update(systemSettings)
      .set({ value: { foo: "baz" } })
      .where(eq(systemSettings.key, SETTING_KEY));

    // Ainda dentro do TTL (30s): serve o valor em cache, não o já atualizado.
    const cached = await getSystemSetting<{ foo: string }>(SETTING_KEY);
    expect(cached).toEqual({ foo: "bar" });
  });
});

describe("getFeatureFlag / isFeatureEnabled", () => {
  it("trata flag inexistente como desligada", async () => {
    const state = await getFeatureFlag(`${FLAG_KEY_OFF}_missing`);
    expect(state).toEqual({ enabled: false, rolloutPercent: 0 });
    expect(await isFeatureEnabled(`${FLAG_KEY_OFF}_missing`)).toBe(false);
  });

  it("respeita enabled=false mesmo com rolloutPercent alto", async () => {
    await db.insert(featureFlags).values({
      key: FLAG_KEY_OFF,
      enabled: false,
      rolloutPercent: 100,
      updatedBy: ACTOR_ID,
    });

    expect(await isFeatureEnabled(FLAG_KEY_OFF)).toBe(false);
  });

  it("rolloutPercent 100 habilita sempre quando enabled=true", async () => {
    await db.insert(featureFlags).values({
      key: FLAG_KEY_ON,
      enabled: true,
      rolloutPercent: 100,
      updatedBy: ACTOR_ID,
    });

    expect(await isFeatureEnabled(FLAG_KEY_ON)).toBe(true);
  });

  it("rolloutPercent 0 nunca habilita, mesmo com enabled=true", async () => {
    await db.insert(featureFlags).values({
      key: FLAG_KEY_ZERO,
      enabled: true,
      rolloutPercent: 0,
      updatedBy: ACTOR_ID,
    });

    expect(await isFeatureEnabled(FLAG_KEY_ZERO)).toBe(false);
  });
});

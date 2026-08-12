/**
 * radio.test.ts — getRadioDashboardStatus, série diária de audiência (P-5.8b)
 *
 * Sem mock: roda contra o banco real, mesmo padrão dos demais testes de
 * packages/integrations. radio.listener_stats é 1 linha/dia (sem
 * metric_name para escopar) — os testes limpam a tabela inteira. Evitar
 * rodar em paralelo com packages/jobs/src/__tests__/radio-stats.test.ts e
 * apps/intranet/src/__tests__/kpis.test.ts (mesma tabela).
 */
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { db } from "@hebron/db/client";
import { listenerStats } from "@hebron/db/schema";
import { getRadioDashboardStatus } from "../radio";

async function clearListenerStats(): Promise<void> {
  await db.delete(listenerStats);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  const iso = d.toISOString().split("T")[0];
  if (!iso) throw new Error("Data inválida");
  return iso;
}

async function seed(
  date: string,
  uniqueSessions: number,
  hoursListened: number,
): Promise<void> {
  await db.insert(listenerStats).values({
    date,
    uniqueSessions,
    hoursListened: hoursListened.toFixed(2),
  });
}

beforeEach(clearListenerStats);
afterAll(clearListenerStats);

describe("getRadioDashboardStatus — série diária de audiência", () => {
  it("devolve audience como o dia mais recente e audienceHistory em ordem cronológica", async () => {
    await seed(isoDaysAgo(3), 4, 1);
    await seed(isoDaysAgo(2), 6, 1.5);
    await seed(isoDaysAgo(1), 9, 2.25);

    const status = await getRadioDashboardStatus();

    expect(status.audience).toMatchObject({
      date: isoDaysAgo(1),
      uniqueSessions: 9,
      hoursListened: 2.25,
    });
    expect(status.audienceHistory.map((d) => d.date)).toEqual([
      isoDaysAgo(3),
      isoDaysAgo(2),
      isoDaysAgo(1),
    ]);
    expect(status.audienceHistory.map((d) => d.uniqueSessions)).toEqual([
      4, 6, 9,
    ]);
    expect(status.audienceHistory[status.audienceHistory.length - 1]).toEqual(
      status.audience,
    );
    expect(status.nowPlaying).toBeNull();
  });

  it("sem nenhuma linha, audience é nulo e audienceHistory é vazio", async () => {
    const status = await getRadioDashboardStatus();

    expect(status.audience).toBeNull();
    expect(status.audienceHistory).toEqual([]);
  });

  it("não emite log a cada leitura", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await getRadioDashboardStatus();

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

/**
 * kpis.test.ts — PATCH-018 (P-5.9c): getKpis lê intranet.kpi_snapshot_history
 * como fonte primária quando o snapshot de todo KPI persistível ("projetos
 * ativos", "doações do mês", "tarefas abertas") está fresco (< 2h) e calcula
 * tendência real comparando o ponto atual com o anterior. Cai para cálculo
 * ao vivo do conjunto inteiro quando qualquer KPI persistível está sem
 * snapshot fresco, evitando misturar snapshot de um KPI com live de outro.
 *
 * intranet.kpi_snapshot_history é um cache puro (regenerado a cada hora por
 * packages/jobs/src/crons/intranet.ts::runKpiSnapshot) — os testes abaixo
 * limpam e semeiam linhas para os 3 metric_name reais diretamente, sem
 * escopo por ID de fixture (não há como isolar, os nomes são fixos em
 * PERSISTABLE_KPIS). Evitar rodar em paralelo com
 * packages/jobs/src/__tests__/intranet-kpis.test.ts (mesmas linhas globais).
 */
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { kpiSnapshotHistory } from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

async function actingAsStaff(): Promise<void> {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId: "kpis-test-actor",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roles: ["colaborador"] as any,
    designations: [],
  });
}

const METRICS = ["projetos_ativos", "doacoes_mes", "tarefas_abertas"];

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function clearHistory(): Promise<void> {
  await db
    .delete(kpiSnapshotHistory)
    .where(inArray(kpiSnapshotHistory.metricName, METRICS));
}

async function seedPoint(
  metricName: string,
  value: number,
  capturedAt: Date,
): Promise<void> {
  await db.insert(kpiSnapshotHistory).values({
    metricName,
    value: value.toString(),
    bucketHour: capturedAt,
    capturedAt,
  });
}

beforeEach(clearHistory);
afterAll(clearHistory);

describe("getKpis — snapshot fresco (< 2h) como fonte primária", () => {
  it("lê o snapshot e calcula tendência real a partir do ponto anterior", async () => {
    await seedPoint("projetos_ativos", 5, hoursAgo(1.5));
    await seedPoint("projetos_ativos", 8, hoursAgo(0.5));
    await seedPoint("doacoes_mes", 1000, hoursAgo(1.5));
    await seedPoint("doacoes_mes", 1000, hoursAgo(0.5));
    await seedPoint("tarefas_abertas", 10, hoursAgo(1.5));
    await seedPoint("tarefas_abertas", 7, hoursAgo(0.5));

    await actingAsStaff();
    const { getKpis } = await import("../actions/kpis");
    const result = await getKpis({});

    expect(result?.serverError).toBeUndefined();
    const kpis = result?.data?.kpis ?? [];
    const byId = new Map(kpis.map((k) => [k.id, k]));

    expect(byId.get("kpi-projetos-ativos")).toMatchObject({
      value: 8,
      trend: "up",
    });
    expect(byId.get("kpi-doacoes-mes")).toMatchObject({
      value: 1000,
      trend: "stable",
    });
    expect(byId.get("kpi-tarefas-abertas")).toMatchObject({
      value: 7,
      trend: "down",
    });
    const alunosKpi = byId.get("kpi-alunos-plataforma");
    expect(typeof alunosKpi?.value).toBe("number");
    expect(alunosKpi?.trend).toBe("stable");
  });

  it("sem ponto anterior na série, tendência é 'stable'", async () => {
    await seedPoint("projetos_ativos", 3, hoursAgo(0.5));
    await seedPoint("doacoes_mes", 500, hoursAgo(0.5));
    await seedPoint("tarefas_abertas", 4, hoursAgo(0.5));

    await actingAsStaff();
    const { getKpis } = await import("../actions/kpis");
    const result = await getKpis({});

    const kpis = result?.data?.kpis ?? [];
    expect(kpis).toHaveLength(4);
    for (const kpi of kpis) {
      expect(kpi.trend).toBe("stable");
    }
  });
});

describe("getKpis — fallback ao vivo quando algum snapshot está velho/ausente", () => {
  it("snapshot velho (> 2h) em uma métrica força live para o conjunto inteiro", async () => {
    const SENTINEL = 424242;
    await seedPoint("projetos_ativos", SENTINEL, hoursAgo(0.5));
    await seedPoint("doacoes_mes", SENTINEL, hoursAgo(0.5));
    await seedPoint("tarefas_abertas", SENTINEL, hoursAgo(3));

    await actingAsStaff();
    const { getKpis } = await import("../actions/kpis");
    const result = await getKpis({});

    const kpis = result?.data?.kpis ?? [];
    for (const kpi of kpis) {
      if (kpi.id === "kpi-alunos-plataforma") continue;
      expect(kpi.value).not.toBe(SENTINEL);
      expect(kpi.trend).toBe("stable");
    }
  });

  it("ausência total de snapshot também força live para o conjunto inteiro", async () => {
    await actingAsStaff();
    const { getKpis } = await import("../actions/kpis");
    const result = await getKpis({});

    const kpis = result?.data?.kpis ?? [];
    expect(kpis).toHaveLength(4);
    for (const kpi of kpis) {
      expect(kpi.trend).toBe("stable");
      expect(typeof kpi.value).toBe("number");
    }
  });
});

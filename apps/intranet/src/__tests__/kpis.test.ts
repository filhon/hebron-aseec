/**
 * kpis.test.ts — PATCH-018 (P-5.9c) + P-5.2b (série real) + P-5.8b
 * (audiência da Rádio): getKpis lê intranet.kpi_snapshot_history como fonte
 * primária quando o snapshot de todo KPI persistível ("projetos ativos",
 * "doações do mês", "tarefas abertas") está fresco (< 2h), calcula
 * tendência real comparando o ponto atual com o anterior e devolve
 * `history` cronológico (últimos 12 buckets). Sem ponto anterior, `trend` é
 * `null` — não "stable". Cai para cálculo ao vivo do conjunto inteiro
 * (history: [], trend: null) quando qualquer KPI persistível está sem
 * snapshot fresco, evitando misturar snapshot de um KPI com live de outro.
 *
 * "Alunos na Plataforma" e "Audiência da Rádio" ficam fora desse contrato de
 * frescor — são sempre calculados ao vivo (P-6.11/P-5.8b), não a partir de
 * intranet.kpi_snapshot_history.
 *
 * intranet.kpi_snapshot_history é um cache puro (regenerado a cada hora por
 * packages/jobs/src/crons/intranet.ts::runKpiSnapshot) — os testes abaixo
 * limpam e semeiam linhas para os 3 metric_name reais diretamente, sem
 * escopo por ID de fixture (não há como isolar, os nomes são fixos em
 * PERSISTABLE_KPIS). radio.listener_stats é 1 linha/dia (sem metric_name
 * para escopar) — os testes de audiência limpam a tabela inteira. Evitar
 * rodar em paralelo com packages/jobs/src/__tests__/intranet-kpis.test.ts
 * (mesmas linhas globais de kpi_snapshot_history) e com
 * packages/jobs/src/__tests__/radio-stats.test.ts /
 * packages/integrations/src/__tests__/radio.test.ts (mesma tabela
 * radio.listener_stats).
 */
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { kpiSnapshotHistory, listenerStats } from "@hebron/db/schema";

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
  await db.delete(listenerStats);
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

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  const iso = d.toISOString().split("T")[0];
  if (!iso) throw new Error("Data inválida");
  return iso;
}

async function seedListenerStat(
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
      history: [5, 8],
    });
    expect(byId.get("kpi-doacoes-mes")).toMatchObject({
      value: 1000,
      trend: "stable",
      history: [1000, 1000],
    });
    expect(byId.get("kpi-tarefas-abertas")).toMatchObject({
      value: 7,
      trend: "down",
      history: [10, 7],
    });

    // Último ponto da série cronológica é sempre o valor exibido.
    for (const metric of [
      "kpi-projetos-ativos",
      "kpi-doacoes-mes",
      "kpi-tarefas-abertas",
    ]) {
      const kpi = byId.get(metric);
      expect(kpi?.history[(kpi?.history.length ?? 1) - 1]).toBe(kpi?.value);
    }

    const alunosKpi = byId.get("kpi-alunos-plataforma");
    expect(typeof alunosKpi?.value).toBe("number");
    expect(alunosKpi?.trend).toBeNull();
    expect(alunosKpi?.history).toEqual([]);
  });

  it("sem ponto anterior na série, tendência é nula e o histórico tem 1 ponto", async () => {
    await seedPoint("projetos_ativos", 3, hoursAgo(0.5));
    await seedPoint("doacoes_mes", 500, hoursAgo(0.5));
    await seedPoint("tarefas_abertas", 4, hoursAgo(0.5));

    await actingAsStaff();
    const { getKpis } = await import("../actions/kpis");
    const result = await getKpis({});

    const kpis = result?.data?.kpis ?? [];
    expect(kpis).toHaveLength(5);
    for (const kpi of kpis) {
      if (
        kpi.id === "kpi-projetos-ativos" ||
        kpi.id === "kpi-doacoes-mes" ||
        kpi.id === "kpi-tarefas-abertas"
      ) {
        expect(kpi.trend).toBeNull();
        expect(kpi.history).toHaveLength(1);
      }
    }
  });
});

// Não fazem parte do contrato de frescor de intranet.kpi_snapshot_history —
// são sempre calculados ao vivo, então o fallback ao vivo do restante do
// conjunto não os afeta.
const ALWAYS_LIVE_KPI_IDS = ["kpi-alunos-plataforma", "kpi-audiencia-radio"];

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
      if (ALWAYS_LIVE_KPI_IDS.includes(kpi.id)) continue;
      expect(kpi.value).not.toBe(SENTINEL);
      expect(kpi.trend).toBeNull();
      expect(kpi.history).toEqual([]);
    }
  });

  it("ausência total de snapshot também força live para o conjunto inteiro", async () => {
    await actingAsStaff();
    const { getKpis } = await import("../actions/kpis");
    const result = await getKpis({});

    const kpis = result?.data?.kpis ?? [];
    expect(kpis).toHaveLength(5);
    for (const kpi of kpis) {
      expect(kpi.trend).toBeNull();
      expect(kpi.history).toEqual([]);
      expect(typeof kpi.value).toBe("number");
    }
  });
});

describe("getKpis — Audiência da Rádio (P-5.8b)", () => {
  it("duas leituras diárias: série cronológica, tendência real e período com data e horas ouvidas", async () => {
    const older = isoDaysAgo(2);
    const newer = isoDaysAgo(1);
    await seedListenerStat(older, 10, 2);
    await seedListenerStat(newer, 15, 3.5);

    await actingAsStaff();
    const { getKpis } = await import("../actions/kpis");
    const result = await getKpis({});

    const kpis = result?.data?.kpis ?? [];
    const audiencia = kpis.find((k) => k.id === "kpi-audiencia-radio");

    expect(audiencia).toMatchObject({
      value: 15,
      unit: "ouvintes",
      trend: "up",
      sourceModule: "radio",
      history: [10, 15],
    });
    expect(audiencia?.period).toContain("3,5h ouvidas");
  });

  it("sem nenhuma leitura: valor zero, tendência nula, histórico vazio e período dizendo que a agregação não rodou", async () => {
    await actingAsStaff();
    const { getKpis } = await import("../actions/kpis");
    const result = await getKpis({});

    const kpis = result?.data?.kpis ?? [];
    const audiencia = kpis.find((k) => k.id === "kpi-audiencia-radio");

    expect(audiencia).toMatchObject({
      value: 0,
      trend: null,
      history: [],
      period: "Agregação ainda não rodou",
    });
  });
});

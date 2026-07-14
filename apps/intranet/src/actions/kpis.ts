"use server";

import { z } from "zod";
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  financialCategories,
  kpiSnapshotHistory,
  projects,
  tasks,
  transactions,
} from "@hebron/db/schema";
import { getStudentKpiMetrics } from "@hebron/integrations/plataforma";
import type { KPI, KPITrend } from "@hebron/types/intranet";
import { staffAction } from "../lib/safe-action";

// Snapshot é considerado fresco por até 2h (contrato de frescor, PATCH-018).
const SNAPSHOT_FRESHNESS_MS = 2 * 60 * 60 * 1000;

const PT_BR_MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function currentPeriodLabel(): string {
  const now = new Date();
  return `${PT_BR_MONTHS[now.getMonth()]}/${now.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// "Projetos ativos" — projetos em execução (projetos.projects.stage =
// 'em_execucao'). Estágios anteriores ainda estão em pipeline de aprovação;
// aprovado/reprovado/concluído não estão mais "em atividade".
// ---------------------------------------------------------------------------

async function countProjetosAtivos(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.stage, "em_execucao"));
  return row?.count ?? 0;
}

// ---------------------------------------------------------------------------
// "Doações do mês" — soma das transações de receita (credito) lançadas na
// categoria "Doações" do plano de contas no mês corrente (BRAIN §6.6,
// PATCH-008). O prompt P-5.8 descreve a categoria como "despesa", mas o
// plano de contas seed (0010_financeiro.sql) e BRAIN §6.6 concordam que
// Doações é receita — seguindo a fonte da verdade (BRAIN.md).
// ---------------------------------------------------------------------------

async function sumDoacoesDoMes(): Promise<number> {
  const [category] = await db
    .select({ id: financialCategories.id })
    .from(financialCategories)
    .where(eq(financialCategories.name, "Doações"))
    .limit(1);
  if (!category) return 0;

  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "credito"),
        eq(transactions.categoryId, category.id),
        sql`date_trunc('month', ${transactions.date}) = date_trunc('month', now())`,
      ),
    );
  return Number(row?.total ?? 0);
}

// ---------------------------------------------------------------------------
// "Tarefas abertas" — não concluídas e não excluídas (mesmo filtro de
// packages/jobs/src/crons/tarefas-prazos.ts).
// ---------------------------------------------------------------------------

async function countTarefasAbertas(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(isNull(tasks.deletedAt), ne(tasks.status, "concluido")));
  return row?.count ?? 0;
}

// ---------------------------------------------------------------------------
// KPIs persistíveis — snapshot horário em intranet.kpi_snapshot_history
// (packages/jobs/src/crons/intranet.ts::runKpiSnapshot, PATCH-018). "Alunos"
// fica fora: é stub até packages/db/src/schema/plataforma.ts existir (Fase 6).
// ---------------------------------------------------------------------------

interface PersistableKpiConfig {
  metricName: string;
  id: string;
  name: string;
  unit: string;
  sourceModule: string;
  computeLive: () => Promise<number>;
}

const PERSISTABLE_KPIS: PersistableKpiConfig[] = [
  {
    metricName: "projetos_ativos",
    id: "kpi-projetos-ativos",
    name: "Projetos ativos",
    unit: "projetos",
    sourceModule: "projetos",
    computeLive: countProjetosAtivos,
  },
  {
    metricName: "doacoes_mes",
    id: "kpi-doacoes-mes",
    name: "Doações do mês",
    unit: "R$",
    sourceModule: "financeiro",
    computeLive: sumDoacoesDoMes,
  },
  {
    metricName: "tarefas_abertas",
    id: "kpi-tarefas-abertas",
    name: "Tarefas abertas",
    unit: "tarefas",
    sourceModule: "tarefas",
    computeLive: countTarefasAbertas,
  },
];

interface PersistableKpiSample {
  value: string;
  capturedAt: Date;
}

interface PersistableKpiResult {
  config: PersistableKpiConfig;
  latest: PersistableKpiSample | undefined;
  previous: PersistableKpiSample | undefined;
}

// Últimos 2 pontos da série (bucket atual + anterior) para calcular frescor
// e tendência sem manter histórico em memória da app.
async function latestHistoryPair(
  metricName: string,
): Promise<PersistableKpiSample[]> {
  return db
    .select({
      value: kpiSnapshotHistory.value,
      capturedAt: kpiSnapshotHistory.capturedAt,
    })
    .from(kpiSnapshotHistory)
    .where(eq(kpiSnapshotHistory.metricName, metricName))
    .orderBy(desc(kpiSnapshotHistory.capturedAt))
    .limit(2);
}

async function loadPersistableKpiResult(
  config: PersistableKpiConfig,
): Promise<PersistableKpiResult> {
  const [latest, previous] = await latestHistoryPair(config.metricName);
  return { config, latest, previous };
}

function isFresh(capturedAt: Date, now: Date): boolean {
  return now.getTime() - capturedAt.getTime() <= SNAPSHOT_FRESHNESS_MS;
}

function trendFor(current: number, previous: number | null): KPITrend {
  if (previous === null || current === previous) return "stable";
  return current > previous ? "up" : "down";
}

function kpiFromSnapshot(result: PersistableKpiResult, period: string): KPI {
  const { config, latest, previous } = result;
  if (!latest) {
    throw new Error(
      `Snapshot ausente para métrica persistível "${config.metricName}"`,
    );
  }
  const value = Number(latest.value);
  const previousValue = previous ? Number(previous.value) : null;
  return {
    id: config.id,
    name: config.name,
    value,
    unit: config.unit,
    trend: trendFor(value, previousValue),
    period,
    sourceModule: config.sourceModule,
    updatedAt: latest.capturedAt,
  };
}

async function kpiFromLive(
  config: PersistableKpiConfig,
  period: string,
  now: Date,
): Promise<KPI> {
  return {
    id: config.id,
    name: config.name,
    value: await config.computeLive(),
    unit: config.unit,
    trend: "stable",
    period,
    sourceModule: config.sourceModule,
    updatedAt: now,
  };
}

function requireKpi(kpiByMetric: Map<string, KPI>, metricName: string): KPI {
  const kpi = kpiByMetric.get(metricName);
  if (!kpi) {
    throw new Error(`KPI ausente para métrica "${metricName}"`);
  }
  return kpi;
}

// ---------------------------------------------------------------------------
// getKpis — 4 indicadores do dashboard. Lê intranet.kpi_snapshot_history
// (fonte primária) quando o snapshot de todo KPI persistível está fresco
// (< 2h); caso contrário recalcula ao vivo para o conjunto inteiro, evitando
// misturar snapshot de um KPI com live de outro (contrato de frescor,
// PATCH-018). "Alunos na Plataforma" fica fora desse contrato de frescor —
// não há snapshot persistido para ele ainda (fora do escopo de P-6.11) — e é
// sempre calculado ao vivo via packages/integrations (P-6.11).
// ---------------------------------------------------------------------------

export const getKpis = staffAction.schema(z.object({})).action(async () => {
  const now = new Date();
  const period = currentPeriodLabel();

  const [results, studentMetrics] = await Promise.all([
    Promise.all(PERSISTABLE_KPIS.map(loadPersistableKpiResult)),
    getStudentKpiMetrics(),
  ]);

  const allFresh = results.every(
    (r) => r.latest !== undefined && isFresh(r.latest.capturedAt, now),
  );

  const kpiEntries = allFresh
    ? results.map(
        (r) => [r.config.metricName, kpiFromSnapshot(r, period)] as const,
      )
    : await Promise.all(
        results.map(
          async (r) =>
            [
              r.config.metricName,
              await kpiFromLive(r.config, period, now),
            ] as const,
        ),
      );

  const kpiByMetric = new Map(kpiEntries);

  const kpis: KPI[] = [
    requireKpi(kpiByMetric, "projetos_ativos"),
    {
      id: "kpi-alunos-plataforma",
      name: "Alunos na Plataforma",
      value: studentMetrics.totalEnrolled,
      unit: "alunos",
      trend: "stable",
      period,
      sourceModule: "plataforma",
      updatedAt: now,
    },
    requireKpi(kpiByMetric, "doacoes_mes"),
    requireKpi(kpiByMetric, "tarefas_abertas"),
  ];

  return { kpis };
});

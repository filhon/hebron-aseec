import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  financialCategories,
  kpiSnapshotHistory,
  kpiSnapshots,
  projects,
  tasks,
  transactions,
} from "@hebron/db/schema";
import { inngest } from "../client";

// Duplicado deliberadamente de apps/intranet/src/actions/kpis.ts — jobs
// nunca importa código de apps (G6.5 do CLAUDE.md, mesmo padrão de
// packages/jobs/src/crons/tarefas-prazos.ts::WORKSPACE_LABEL).

async function countProjetosAtivos(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.stage, "em_execucao"));
  return row?.count ?? 0;
}

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

async function countTarefasAbertas(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(isNull(tasks.deletedAt), ne(tasks.status, "concluido")));
  return row?.count ?? 0;
}

function currentPeriodKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function currentBucketHour(): Date {
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);
  return now;
}

// ---------------------------------------------------------------------------
// runKpiSnapshot — grava intranet.kpi_snapshots a cada hora (P-5.8), upsert
// por metric_name/period (cache "atual" — packages/jobs/src/crons/
// briefing.ts lê esta tabela assumindo 1 linha por metric_name/period, não
// mexer nessa cardinalidade). Também grava intranet.kpi_snapshot_history
// (PATCH-018/P-5.9c), 1 linha por metric_name/bucket_hour, insert-only por
// hora — série temporal que apps/intranet/src/actions/kpis.ts usa para
// calcular tendência real (up/down/stable) sem depender de kpi_snapshots.
// "Alunos" fica fora de ambas: é stub até packages/db/src/schema/
// plataforma.ts existir (Fase 6).
// ---------------------------------------------------------------------------

export async function runKpiSnapshot(): Promise<{ metricsWritten: number }> {
  const period = currentPeriodKey();
  const bucketHour = currentBucketHour();
  const [projetosAtivos, doacoesDoMes, tarefasAbertas] = await Promise.all([
    countProjetosAtivos(),
    sumDoacoesDoMes(),
    countTarefasAbertas(),
  ]);

  const metrics: Array<{ metricName: string; value: number }> = [
    { metricName: "projetos_ativos", value: projetosAtivos },
    { metricName: "doacoes_mes", value: doacoesDoMes },
    { metricName: "tarefas_abertas", value: tarefasAbertas },
  ];

  for (const metric of metrics) {
    await db
      .insert(kpiSnapshots)
      .values({
        metricName: metric.metricName,
        value: metric.value.toString(),
        period,
      })
      .onConflictDoUpdate({
        target: [kpiSnapshots.metricName, kpiSnapshots.period],
        set: { value: metric.value.toString(), capturedAt: new Date() },
      });

    await db
      .insert(kpiSnapshotHistory)
      .values({
        metricName: metric.metricName,
        value: metric.value.toString(),
        bucketHour,
      })
      .onConflictDoUpdate({
        target: [kpiSnapshotHistory.metricName, kpiSnapshotHistory.bucketHour],
        set: { value: metric.value.toString(), capturedAt: new Date() },
      });
  }

  return { metricsWritten: metrics.length };
}

export const kpiSnapshotCron = inngest.createFunction(
  {
    id: "intranet-kpi-snapshot",
    name: "Intranet: snapshot horário de KPIs do dashboard",
  },
  { cron: "0 * * * *" },
  async ({ step }) => step.run("run-intranet-kpi-snapshot", runKpiSnapshot),
);

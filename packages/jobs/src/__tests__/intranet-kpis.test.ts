/**
 * intranet-kpis.test.ts — runKpiSnapshot (PATCH-018/P-5.9c): grava
 * intranet.kpi_snapshots (cache "atual", 1 linha por metric_name/period,
 * como antes — lida por packages/jobs/src/crons/briefing.ts) e também
 * intranet.kpi_snapshot_history (1 linha por metric_name/bucket_hour,
 * insert-only por hora), que apps/intranet/src/actions/kpis.ts usa para
 * calcular tendência real sem depender de kpi_snapshots.
 *
 * Ambas as tabelas são caches globais regeneráveis, sem escopo por ID de
 * fixture (os 3 metric_name são fixos). Evitar rodar em paralelo com
 * apps/intranet/src/__tests__/kpis.test.ts (mesmas linhas globais).
 */
import { describe, it, expect } from "vitest";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { kpiSnapshots, kpiSnapshotHistory } from "@hebron/db/schema";
import { runKpiSnapshot } from "../crons/intranet";

const METRICS = ["projetos_ativos", "doacoes_mes", "tarefas_abertas"];

describe("runKpiSnapshot", () => {
  it("grava as 3 métricas persistíveis em kpi_snapshots e kpi_snapshot_history com o mesmo valor", async () => {
    const result = await runKpiSnapshot();
    expect(result.metricsWritten).toBe(3);

    for (const metricName of METRICS) {
      const [snapshot] = await db
        .select()
        .from(kpiSnapshots)
        .where(eq(kpiSnapshots.metricName, metricName));
      expect(snapshot).toBeDefined();

      const [history] = await db
        .select()
        .from(kpiSnapshotHistory)
        .where(eq(kpiSnapshotHistory.metricName, metricName))
        .orderBy(desc(kpiSnapshotHistory.capturedAt))
        .limit(1);
      expect(history).toBeDefined();
      expect(history?.value).toBe(snapshot?.value);
    }
  });

  it("execução repetida na mesma hora atualiza a mesma linha de histórico (idempotente)", async () => {
    await runKpiSnapshot();
    const before = await db
      .select()
      .from(kpiSnapshotHistory)
      .where(eq(kpiSnapshotHistory.metricName, "projetos_ativos"));

    await runKpiSnapshot();
    const after = await db
      .select()
      .from(kpiSnapshotHistory)
      .where(eq(kpiSnapshotHistory.metricName, "projetos_ativos"));

    expect(after.length).toBe(before.length);
  });

  it("preserva ponto de hora anterior — não sobrescreve histórico de outra hora", async () => {
    const previousHour = new Date();
    previousHour.setUTCHours(previousHour.getUTCHours() - 3, 0, 0, 0);

    await db
      .insert(kpiSnapshotHistory)
      .values({
        metricName: "projetos_ativos",
        value: "999999.00",
        bucketHour: previousHour,
      })
      .onConflictDoNothing();

    await runKpiSnapshot();

    const rows = await db
      .select()
      .from(kpiSnapshotHistory)
      .where(eq(kpiSnapshotHistory.metricName, "projetos_ativos"));

    const stale = rows.find(
      (r) => r.bucketHour.getTime() === previousHour.getTime(),
    );
    expect(stale?.value).toBe("999999.00");
    expect(rows.length).toBeGreaterThanOrEqual(2);

    await db
      .delete(kpiSnapshotHistory)
      .where(
        and(
          eq(kpiSnapshotHistory.metricName, "projetos_ativos"),
          eq(kpiSnapshotHistory.bucketHour, previousHour),
        ),
      );
  });
});

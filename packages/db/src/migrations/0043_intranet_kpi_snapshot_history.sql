-- Migration: 0043_intranet_kpi_snapshot_history
-- PATCH-018 (P-5.9c) — série temporal insert-only por hora para getKpis
-- calcular tendência real (up/down/stable). intranet.kpi_snapshots continua
-- intocada (1 linha por metric_name/period, upsertada a cada hora) porque
-- packages/jobs/src/crons/briefing.ts assume essa cardinalidade.
--
-- Gerado com `drizzle-kit generate`; as 5 linhas ALTER TYPE "admin"."audit_action"
-- do diff bruto foram removidas por já terem sido aplicadas em 0038 e 0041
-- (drift entre schema.ts e o snapshot interno do drizzle-kit — mesmo padrão
-- documentado em 0036_intranet.sql).

CREATE TABLE IF NOT EXISTS "intranet"."kpi_snapshot_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_name" text NOT NULL,
	"value" numeric(14, 2) NOT NULL,
	"bucket_hour" timestamp with time zone NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kpi_snapshot_history_metric_bucket_uniq" UNIQUE("metric_name","bucket_hour")
);
--> statement-breakpoint

-- RLS — mesmo padrão de intranet.kpi_snapshots (0037_intranet_rls.sql):
-- SELECT para todo o staff, escrita só super_admin (cron roda como
-- system-actor com esse papel, ver packages/db/src/system-actor.ts).
ALTER TABLE "intranet"."kpi_snapshot_history" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpi_snapshot_history_mutate_admin"
  ON "intranet"."kpi_snapshot_history" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "kpi_snapshot_history_select_staff"
  ON "intranet"."kpi_snapshot_history" FOR SELECT TO authenticated
  USING (public.has_role('diretor', 'conselheiro', 'colaborador'));

GRANT SELECT, INSERT, UPDATE ON "intranet"."kpi_snapshot_history" TO authenticated;

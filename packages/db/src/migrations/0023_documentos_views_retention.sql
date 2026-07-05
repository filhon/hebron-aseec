-- Migration: 0023_documentos_views_retention
-- P-0.13 — LGPD: fundação (F3-21). documentos.views é dado comportamental
-- pessoal (usuário + timestamp de leitura) e cresce sem limite — nenhum
-- prompt anterior definiu retenção. Agrega por documento/mês e apaga as
-- linhas individuais com mais de 6 meses, preservando a contagem para
-- métricas editoriais (ver apps/documentos editorial/page.tsx) sem reter o
-- rastro pessoal indefinidamente.

CREATE TABLE IF NOT EXISTS "documentos"."views_monthly_agg" (
  "id"          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id" uuid    NOT NULL REFERENCES "documentos"."documents"("id") ON DELETE CASCADE,
  "year_month"  date    NOT NULL,
  "view_count"  integer NOT NULL DEFAULT 0,
  CONSTRAINT "views_monthly_agg_document_month_uniq" UNIQUE ("document_id", "year_month")
);

CREATE INDEX IF NOT EXISTS views_monthly_agg_document_id_idx
  ON "documentos"."views_monthly_agg" ("document_id");

ALTER TABLE "documentos"."views_monthly_agg" ENABLE ROW LEVEL SECURITY;

-- Agregado, sem PII (nenhum user_id) — leitura liberada a qualquer
-- autenticado, igual à leitura de admin.audit_log fica restrita mas aqui
-- não há dado sensível remanescente.
CREATE POLICY "views_monthly_agg_select_authenticated"
  ON "documentos"."views_monthly_agg" FOR SELECT TO authenticated
  USING (true);

-- Sem policy de INSERT/UPDATE/DELETE para authenticated: só a função abaixo,
-- via conexão de serviço (bypassa RLS), escreve nesta tabela.

GRANT USAGE ON SCHEMA documentos TO authenticated;
GRANT SELECT ON "documentos"."views_monthly_agg" TO authenticated;

-- ---------------------------------------------------------------------------
-- documentos.purge_old_views() — agrega e apaga linhas de views com mais de
-- 6 meses. Agendada mensalmente via pg_cron (extensão já habilitada em
-- 0013_audit_log_partitions.sql).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION documentos.purge_old_views()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff timestamptz := date_trunc('month', now()) - interval '6 months';
BEGIN
  INSERT INTO documentos.views_monthly_agg (document_id, year_month, view_count)
  SELECT document_id, date_trunc('month', viewed_at)::date, count(*)
  FROM documentos.views
  WHERE viewed_at < cutoff
  GROUP BY document_id, date_trunc('month', viewed_at)
  ON CONFLICT (document_id, year_month)
  DO UPDATE SET view_count = documentos.views_monthly_agg.view_count + EXCLUDED.view_count;

  DELETE FROM documentos.views WHERE viewed_at < cutoff;
END;
$$;

SELECT cron.schedule(
  'documentos_purge_old_views',
  '0 4 1 * *', -- 04:00 UTC, dia 1 de cada mês
  $$SELECT documentos.purge_old_views();$$
);

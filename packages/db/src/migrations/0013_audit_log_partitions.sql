-- Migration: 0013_audit_log_partitions
-- admin.audit_log só tinha partições até 2026-07 (ver 0002_admin.sql) — o
-- próximo INSERT após 2026-08-01 falha por falta de partição de destino
-- (F3-01, prazo real). Esta migration:
--   1. Cria partições mensais de 2026-08 até 2027-12.
--   2. Cria uma partição DEFAULT como rede de segurança para qualquer
--      created_at fora do intervalo particionado explicitamente.
--   3. Agenda via pg_cron a criação mensal automática de partições futuras
--      (decisão F3-Q1a), com 3 meses de antecedência, para nunca depender
--      de uma nova migration manual.

-- ---------------------------------------------------------------------------
-- Partições explícitas: 2026-08 a 2027-12
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  d date := '2026-08-01';
  end_date date := '2028-01-01'; -- exclusivo: última partição criada é 2027-12
  partition_name text;
BEGIN
  WHILE d < end_date LOOP
    partition_name := 'audit_log_' || to_char(d, 'YYYY_MM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS admin.%I PARTITION OF admin.audit_log FOR VALUES FROM (%L) TO (%L)',
      partition_name, d, d + interval '1 month'
    );
    d := d + interval '1 month';
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Partição DEFAULT — rede de segurança (created_at fora do intervalo coberto)
-- Precisa ser criada depois das partições explícitas: uma vez existindo,
-- novas partições de RANGE só podem ser adicionadas se a faixa não tiver
-- linhas na DEFAULT (o caso normal, já que o intervalo é sempre futuro).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.audit_log_default
  PARTITION OF admin.audit_log DEFAULT;

-- ---------------------------------------------------------------------------
-- Função: cria a partição de um mês específico, se não existir.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.create_audit_log_partition_for_month(target_month date)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  partition_name text := 'audit_log_' || to_char(target_month, 'YYYY_MM');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS admin.%I PARTITION OF admin.audit_log FOR VALUES FROM (%L) TO (%L)',
    partition_name, target_month, target_month + interval '1 month'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- pg_cron: job mensal que garante partições para os próximos 3 meses.
-- cron.schedule com um job_name existente faz upsert (idempotente).
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'admin_audit_log_create_partitions',
  '0 3 1 * *', -- 03:00 UTC, dia 1 de cada mês
  $$
    SELECT admin.create_audit_log_partition_for_month(
      (date_trunc('month', now()) + (n || ' month')::interval)::date
    )
    FROM generate_series(1, 3) AS n;
  $$
);

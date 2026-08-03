-- Migration: 0075_tarefas_recurrence_month
-- P-4.1b (CORRETIVO) — RecurrenceRule guardava dia_do_mes mas não o mês para
-- recorrência anual (S-73): uma regra de IPTU criada em julho vencia todo
-- julho, para sempre. Backfill: para regras anuais já gravadas, extrai o mês
-- do próprio next_run_at atual — é o mês que a regra vem efetivamente usando
-- na prática, então preserva o comportamento hoje em vez de trocá-lo em
-- silêncio.

ALTER TABLE "tarefas"."recurrence_rules" ADD COLUMN IF NOT EXISTS "month" smallint;

DO $$ BEGIN
  ALTER TABLE "tarefas"."recurrence_rules"
    ADD CONSTRAINT "recurrence_rules_month_range_chk"
    CHECK ("month" IS NULL OR ("month" BETWEEN 1 AND 12));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE "tarefas"."recurrence_rules"
SET "month" = EXTRACT(MONTH FROM "next_run_at")::smallint
WHERE "type" = 'anual'
  AND "month" IS NULL
  AND "next_run_at" IS NOT NULL;

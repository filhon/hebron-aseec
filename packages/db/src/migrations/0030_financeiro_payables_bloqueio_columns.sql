-- Migration: 0030_financeiro_payables_bloqueio_columns
-- P-3.11 — Integrações Cross-App Financeiro.
--   • financeiro.payables ganha as colunas de bloqueio por inadimplência de
--     relatório (BRAIN §6.2) e de override (exclusivo de super_admin, com
--     justificativa obrigatória — ver apps/financeiro overrideBlock).
--   • payment_schedule_id liga o payable à parcela de projeto que o
--     originou (projetos.payment_schedules) — cross-schema FK usada por
--     onProjectApproved (packages/db/src/projetos-approval.ts) para criar
--     payables reais na aprovação do projeto, de forma idempotente
--     (UNIQUE evita duplicar o payable em retentativas).
--
-- Depende de 0029 (novo valor 'bloqueado' em financeiro.payable_status já
-- commitado — ALTER TYPE ADD VALUE não pode ser usado na mesma transação
-- em que foi declarado).

ALTER TABLE "financeiro"."payables"
  ADD COLUMN IF NOT EXISTS "payment_schedule_id" uuid,
  ADD COLUMN IF NOT EXISTS "blocked_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "block_reason" text,
  ADD COLUMN IF NOT EXISTS "overridden_by" uuid,
  ADD COLUMN IF NOT EXISTS "overridden_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "override_justification" text;

DO $$ BEGIN
  ALTER TABLE "financeiro"."payables" ADD CONSTRAINT "payables_payment_schedule_id_payment_schedules_id_fk"
    FOREIGN KEY ("payment_schedule_id") REFERENCES "projetos"."payment_schedules"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "financeiro"."payables" ADD CONSTRAINT "payables_overridden_by_users_id_fk"
    FOREIGN KEY ("overridden_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "financeiro"."payables" ADD CONSTRAINT "payables_payment_schedule_id_unique"
    UNIQUE ("payment_schedule_id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

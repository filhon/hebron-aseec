-- Migration: 0069_financeiro_colunas_ausentes
-- P-3.6b (CORRETIVO) — seis campos que o formulário coleta e o banco não
-- tinha onde guardar (S-214/S-53). Ver PROMPTS.md para o detalhamento de
-- cada achado; esta migration cobre as quatro tabelas envolvidas.

-- ---------------------------------------------------------------------------
-- 1. financeiro.accounts — apelido e instituição separados.
--
-- "bank_name" já significa "nome do banco" (instituição) pelo próprio nome
-- da coluna — mas createBankAccount (P-3.6) gravava ali o apelido
-- (input.name), descartando input.bank. A coluna nova "nickname" recebe o
-- valor atual de bank_name (preserva o que ela de fato representa hoje);
-- "bank_name" passa a ser preenchida com a instituição real a partir daqui.
-- ---------------------------------------------------------------------------

ALTER TABLE "financeiro"."accounts" ADD COLUMN IF NOT EXISTS "nickname" text;

UPDATE "financeiro"."accounts"
SET "nickname" = "bank_name"
WHERE "nickname" IS NULL;

ALTER TABLE "financeiro"."accounts" ALTER COLUMN "nickname" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. financeiro.budgets — nome próprio em vez de prefixo em "notes".
--
-- Backfill: extrai o nome da primeira linha de "notes" (removendo o
-- prefixo "Budget: " quando presente) e remove essa linha de "notes",
-- devolvendo o campo à sua função original (observações livres).
-- ---------------------------------------------------------------------------

ALTER TABLE "financeiro"."budgets" ADD COLUMN IF NOT EXISTS "name" text;

UPDATE "financeiro"."budgets"
SET "name" = CASE
  WHEN "notes" IS NULL OR split_part("notes", E'\n', 1) = '' THEN 'Orçamento sem nome'
  WHEN split_part("notes", E'\n', 1) LIKE 'Budget: %'
    THEN substring(split_part("notes", E'\n', 1) FROM 9)
  ELSE split_part("notes", E'\n', 1)
END
WHERE "name" IS NULL;

UPDATE "financeiro"."budgets"
SET "notes" = NULLIF(regexp_replace("notes", '^[^\n]*\n?', ''), '')
WHERE "notes" IS NOT NULL
  AND split_part("notes", E'\n', 1) LIKE 'Budget: %';

ALTER TABLE "financeiro"."budgets" ALTER COLUMN "name" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. financeiro.budget_items — mês da linha orçamentária + observações.
-- ---------------------------------------------------------------------------

ALTER TABLE "financeiro"."budget_items" ADD COLUMN IF NOT EXISTS "month" smallint;
ALTER TABLE "financeiro"."budget_items" ADD COLUMN IF NOT EXISTS "notes" text;

DO $$ BEGIN
  ALTER TABLE "financeiro"."budget_items"
    ADD CONSTRAINT "budget_items_month_range_chk"
    CHECK ("month" IS NULL OR ("month" BETWEEN 1 AND 12));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 4. financeiro.payables — motivo do cancelamento e autor, fora do audit log.
--
-- Backfill: para payables já cancelados, recupera motivo e autor da entrada
-- mais recente de "financeiro.payable.cancelled" em admin.audit_log — é o
-- único lugar onde esse dado sobreviveu até agora.
-- ---------------------------------------------------------------------------

ALTER TABLE "financeiro"."payables" ADD COLUMN IF NOT EXISTS "cancellation_reason" text;
ALTER TABLE "financeiro"."payables" ADD COLUMN IF NOT EXISTS "cancelled_by" uuid REFERENCES "public"."users"("id");

UPDATE "financeiro"."payables" p
SET "cancellation_reason" = a."reason",
    "cancelled_by" = a."actor_id"
FROM (
  SELECT DISTINCT ON ("entity_id")
    "entity_id",
    "actor_id",
    "diff" ->> 'reason' AS "reason"
  FROM "admin"."audit_log"
  WHERE "action" = 'financeiro.payable.cancelled'
    AND "entity" = 'payable'
  ORDER BY "entity_id", "created_at" DESC
) a
WHERE p."id" = a."entity_id"
  AND p."status" = 'cancelado'
  AND p."cancellation_reason" IS NULL;

-- Migration: 0010_financeiro
-- Cria tabelas do schema financeiro: accounts, categories (plano de contas),
-- cost_centers, budgets, budget_items, payables, receivables, transactions
-- (imutável), transaction_reversals, attachments, bank_imports, bank_import_rows,
-- batch_approvals, batch_approval_items.
-- RLS DENY-by-default em todas as tabelas.
-- Plano de contas padrão inserido como seed (is_system = true).
--
-- NOTA: prompt P-3.6 especificava 0008_financeiro.sql, mas as migrations
-- 0008_project_attachments.sql e 0009_fix_rls_org_members_votes.sql já
-- existiam — numeração ajustada para 0010 para evitar conflito.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "financeiro"."account_type" AS ENUM ('corrente', 'poupanca', 'investimento');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "financeiro"."category_type" AS ENUM ('receita', 'despesa');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "financeiro"."payable_status" AS ENUM (
    'pendente', 'aprovado', 'autorizado', 'pago', 'cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "financeiro"."receivable_status" AS ENUM ('pendente', 'recebido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "financeiro"."receivable_source" AS ENUM ('farmacia', 'aluguel', 'doacao', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "financeiro"."transaction_type" AS ENUM ('debito', 'credito');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "financeiro"."import_format" AS ENUM ('ofx', 'csv');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "financeiro"."import_row_status" AS ENUM ('unmatched', 'matched', 'ignored');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "financeiro"."attachment_ref_type" AS ENUM ('payable', 'receivable', 'transaction');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- financeiro.accounts — contas bancárias com saldo separado por conta
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "financeiro"."accounts" (
  "id"              uuid                          PRIMARY KEY DEFAULT gen_random_uuid(),
  "bank_name"       text                          NOT NULL,
  "agency"          text,
  "account_number"  text,
  "account_type"    "financeiro"."account_type"   NOT NULL DEFAULT 'corrente',
  "currency"        text                          NOT NULL DEFAULT 'BRL',
  "initial_balance" numeric(14, 2)                NOT NULL DEFAULT 0,
  "is_active"       boolean                       NOT NULL DEFAULT true,
  "created_by"      uuid                          NOT NULL REFERENCES public.users ("id"),
  "created_at"      timestamptz                   NOT NULL DEFAULT now(),
  "updated_at"      timestamptz                   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accounts_is_active_idx
  ON "financeiro"."accounts" ("is_active");

CREATE OR REPLACE TRIGGER accounts_updated_at
  BEFORE UPDATE ON "financeiro"."accounts"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- financeiro.categories — plano de contas hierárquico (árvore)
-- is_system = true: categoria padrão, não pode ser deletada (enforced no Server Action).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "financeiro"."categories" (
  "id"         uuid                          PRIMARY KEY DEFAULT gen_random_uuid(),
  "code"       text                          NOT NULL UNIQUE,
  "name"       text                          NOT NULL,
  "type"       "financeiro"."category_type"  NOT NULL,
  "parent_id"  uuid                          REFERENCES "financeiro"."categories" ("id") ON DELETE SET NULL,
  "is_system"  boolean                       NOT NULL DEFAULT false,
  "created_at" timestamptz                   NOT NULL DEFAULT now(),
  "updated_at" timestamptz                   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fin_categories_type_idx
  ON "financeiro"."categories" ("type");

CREATE INDEX IF NOT EXISTS fin_categories_parent_id_idx
  ON "financeiro"."categories" ("parent_id");

CREATE OR REPLACE TRIGGER categories_updated_at
  BEFORE UPDATE ON "financeiro"."categories"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Plano de contas padrão sugerido (editável via UI, não deletável)
INSERT INTO "financeiro"."categories" ("id", "code", "name", "type", "parent_id", "is_system") VALUES
  ('00000000-0000-0000-0001-000000000001', '1',   'Receitas',               'receita', NULL,                                     true),
  ('00000000-0000-0000-0001-000000000002', '1.1', 'Farmacêutica',           'receita', '00000000-0000-0000-0001-000000000001',   true),
  ('00000000-0000-0000-0001-000000000003', '1.2', 'Aluguéis',               'receita', '00000000-0000-0000-0001-000000000001',   true),
  ('00000000-0000-0000-0001-000000000004', '1.3', 'Doações',                'receita', '00000000-0000-0000-0001-000000000001',   true),
  ('00000000-0000-0000-0001-000000000005', '1.4', 'Outras Receitas',        'receita', '00000000-0000-0000-0001-000000000001',   true),
  ('00000000-0000-0000-0002-000000000001', '2',   'Despesas',               'despesa', NULL,                                     true),
  ('00000000-0000-0000-0002-000000000002', '2.1', 'Pessoal',                'despesa', '00000000-0000-0000-0002-000000000001',   true),
  ('00000000-0000-0000-0002-000000000003', '2.2', 'Projetos Missionários',  'despesa', '00000000-0000-0000-0002-000000000001',   true),
  ('00000000-0000-0000-0002-000000000004', '2.3', 'Administrativo',         'despesa', '00000000-0000-0000-0002-000000000001',   true),
  ('00000000-0000-0000-0002-000000000005', '2.4', 'Comunicação',            'despesa', '00000000-0000-0000-0002-000000000001',   true),
  ('00000000-0000-0000-0002-000000000006', '2.5', 'Manutenção',             'despesa', '00000000-0000-0000-0002-000000000001',   true),
  ('00000000-0000-0000-0002-000000000007', '2.6', 'Tecnologia',             'despesa', '00000000-0000-0000-0002-000000000001',   true),
  ('00000000-0000-0000-0002-000000000008', '2.7', 'Viagem e Transporte',    'despesa', '00000000-0000-0000-0002-000000000001',   true),
  ('00000000-0000-0000-0002-000000000009', '2.8', 'Outras Despesas',        'despesa', '00000000-0000-0000-0002-000000000001',   true)
ON CONFLICT ("code") DO NOTHING;

-- ---------------------------------------------------------------------------
-- financeiro.cost_centers — 1 por projeto aprovado; FK cross-schema
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "financeiro"."cost_centers" (
  "id"           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id"   uuid          NOT NULL UNIQUE REFERENCES "projetos"."projects" ("id") ON DELETE RESTRICT,
  "code"         text          NOT NULL UNIQUE,
  "name"         text          NOT NULL,
  "budget_total" numeric(12,2) NOT NULL,
  "status"       text          NOT NULL DEFAULT 'ativo'
                               CHECK ("status" IN ('ativo', 'suspenso', 'encerrado')),
  "created_at"   timestamptz   NOT NULL DEFAULT now(),
  "updated_at"   timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cost_centers_project_id_idx
  ON "financeiro"."cost_centers" ("project_id");

CREATE INDEX IF NOT EXISTS cost_centers_status_idx
  ON "financeiro"."cost_centers" ("status");

CREATE OR REPLACE TRIGGER cost_centers_updated_at
  BEFORE UPDATE ON "financeiro"."cost_centers"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- financeiro.budgets — orçamento anual por centro de custo
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "financeiro"."budgets" (
  "id"             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "year"           integer       NOT NULL,
  "cost_center_id" uuid          REFERENCES "financeiro"."cost_centers" ("id") ON DELETE RESTRICT,
  "total_amount"   numeric(14,2) NOT NULL,
  "notes"          text,
  "created_by"     uuid          NOT NULL REFERENCES public.users ("id"),
  "created_at"     timestamptz   NOT NULL DEFAULT now(),
  "updated_at"     timestamptz   NOT NULL DEFAULT now(),
  UNIQUE ("year", "cost_center_id")
);

CREATE INDEX IF NOT EXISTS budgets_year_idx
  ON "financeiro"."budgets" ("year");

CREATE INDEX IF NOT EXISTS budgets_cost_center_id_idx
  ON "financeiro"."budgets" ("cost_center_id");

CREATE OR REPLACE TRIGGER budgets_updated_at
  BEFORE UPDATE ON "financeiro"."budgets"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- financeiro.budget_items — linhas orçamentárias por categoria
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "financeiro"."budget_items" (
  "id"             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "budget_id"      uuid          NOT NULL REFERENCES "financeiro"."budgets" ("id") ON DELETE CASCADE,
  "category_id"    uuid          REFERENCES "financeiro"."categories" ("id") ON DELETE RESTRICT,
  "planned_amount" numeric(14,2) NOT NULL,
  "description"    text,
  "created_at"     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS budget_items_budget_id_idx
  ON "financeiro"."budget_items" ("budget_id");

CREATE INDEX IF NOT EXISTS budget_items_category_id_idx
  ON "financeiro"."budget_items" ("category_id");

-- ---------------------------------------------------------------------------
-- financeiro.payables — contas a pagar; governança dual obrigatória
-- pendente → aprovado (diretor gestor) → autorizado (super_admin / dir. autorizador) → pago
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "financeiro"."payables" (
  "id"             uuid                           PRIMARY KEY DEFAULT gen_random_uuid(),
  "description"    text                           NOT NULL,
  "amount"         numeric(12,2)                  NOT NULL,
  "due_date"       date                           NOT NULL,
  "supplier"       text,
  "notes"          text,
  "account_id"     uuid                           REFERENCES "financeiro"."accounts" ("id") ON DELETE RESTRICT,
  "cost_center_id" uuid                           REFERENCES "financeiro"."cost_centers" ("id") ON DELETE RESTRICT,
  "category_id"    uuid                           REFERENCES "financeiro"."categories" ("id") ON DELETE RESTRICT,
  "status"         "financeiro"."payable_status"  NOT NULL DEFAULT 'pendente',
  "approved_by"    uuid                           REFERENCES public.users ("id"),
  "approved_at"    timestamptz,
  "authorized_by"  uuid                           REFERENCES public.users ("id"),
  "authorized_at"  timestamptz,
  "paid_by"        uuid                           REFERENCES public.users ("id"),
  "paid_at"        timestamptz,
  "created_by"     uuid                           NOT NULL REFERENCES public.users ("id"),
  "created_at"     timestamptz                    NOT NULL DEFAULT now(),
  "updated_at"     timestamptz                    NOT NULL DEFAULT now(),
  "deleted_at"     timestamptz
);

CREATE INDEX IF NOT EXISTS payables_status_idx         ON "financeiro"."payables" ("status");
CREATE INDEX IF NOT EXISTS payables_due_date_idx       ON "financeiro"."payables" ("due_date");
CREATE INDEX IF NOT EXISTS payables_cost_center_id_idx ON "financeiro"."payables" ("cost_center_id");
CREATE INDEX IF NOT EXISTS payables_category_id_idx    ON "financeiro"."payables" ("category_id");
CREATE INDEX IF NOT EXISTS payables_created_by_idx     ON "financeiro"."payables" ("created_by");
-- Partial index: apenas registros não deletados (soft delete)
CREATE INDEX IF NOT EXISTS payables_deleted_at_idx     ON "financeiro"."payables" ("deleted_at")
  WHERE "deleted_at" IS NULL;

CREATE OR REPLACE TRIGGER payables_updated_at
  BEFORE UPDATE ON "financeiro"."payables"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- financeiro.receivables — contas a receber
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "financeiro"."receivables" (
  "id"              uuid                              PRIMARY KEY DEFAULT gen_random_uuid(),
  "description"     text                              NOT NULL,
  "amount"          numeric(12,2)                     NOT NULL,
  "expected_date"   date,
  "received_date"   date,
  "account_id"      uuid                              REFERENCES "financeiro"."accounts" ("id") ON DELETE RESTRICT,
  "cost_center_id"  uuid                              REFERENCES "financeiro"."cost_centers" ("id") ON DELETE RESTRICT,
  "category_id"     uuid                              REFERENCES "financeiro"."categories" ("id") ON DELETE RESTRICT,
  "source"          "financeiro"."receivable_source"  NOT NULL DEFAULT 'outro',
  "notes"           text,
  "status"          "financeiro"."receivable_status"  NOT NULL DEFAULT 'pendente',
  "received_by"     uuid                              REFERENCES public.users ("id"),
  "created_by"      uuid                              NOT NULL REFERENCES public.users ("id"),
  "created_at"      timestamptz                       NOT NULL DEFAULT now(),
  "updated_at"      timestamptz                       NOT NULL DEFAULT now(),
  "deleted_at"      timestamptz
);

CREATE INDEX IF NOT EXISTS receivables_status_idx         ON "financeiro"."receivables" ("status");
CREATE INDEX IF NOT EXISTS receivables_source_idx         ON "financeiro"."receivables" ("source");
CREATE INDEX IF NOT EXISTS receivables_expected_date_idx  ON "financeiro"."receivables" ("expected_date");
CREATE INDEX IF NOT EXISTS receivables_cost_center_id_idx ON "financeiro"."receivables" ("cost_center_id");
CREATE INDEX IF NOT EXISTS receivables_deleted_at_idx     ON "financeiro"."receivables" ("deleted_at")
  WHERE "deleted_at" IS NULL;

CREATE OR REPLACE TRIGGER receivables_updated_at
  BEFORE UPDATE ON "financeiro"."receivables"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- financeiro.transactions — ledger imutável (sem UPDATE ou DELETE)
-- reference_type + reference_id: referência polimórfica sem FK (payable/receivable/reversal/manual)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "financeiro"."transactions" (
  "id"             uuid                            PRIMARY KEY DEFAULT gen_random_uuid(),
  "type"           "financeiro"."transaction_type" NOT NULL,
  "amount"         numeric(12,2)                   NOT NULL,
  "description"    text                            NOT NULL,
  "date"           date                            NOT NULL,
  "account_id"     uuid                            NOT NULL REFERENCES "financeiro"."accounts" ("id") ON DELETE RESTRICT,
  "cost_center_id" uuid                            REFERENCES "financeiro"."cost_centers" ("id") ON DELETE RESTRICT,
  "category_id"    uuid                            REFERENCES "financeiro"."categories" ("id") ON DELETE RESTRICT,
  "reference_type" text                            CHECK ("reference_type" IN ('payable', 'receivable', 'reversal', 'manual')),
  "reference_id"   uuid,
  "created_by"     uuid                            NOT NULL REFERENCES public.users ("id"),
  "created_at"     timestamptz                     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_account_id_idx     ON "financeiro"."transactions" ("account_id");
CREATE INDEX IF NOT EXISTS transactions_date_idx           ON "financeiro"."transactions" ("date");
CREATE INDEX IF NOT EXISTS transactions_type_idx           ON "financeiro"."transactions" ("type");
CREATE INDEX IF NOT EXISTS transactions_cost_center_id_idx ON "financeiro"."transactions" ("cost_center_id");
CREATE INDEX IF NOT EXISTS transactions_reference_idx      ON "financeiro"."transactions" ("reference_type", "reference_id");

-- Imutabilidade: UPDATE e DELETE levantam exceção — nunca passam silenciosamente
CREATE OR REPLACE FUNCTION financeiro.forbid_transaction_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'transactions são imutáveis — use financeiro.transaction_reversals para corrigir lançamentos';
END;
$$;

CREATE OR REPLACE TRIGGER transactions_no_update
  BEFORE UPDATE ON "financeiro"."transactions"
  FOR EACH ROW EXECUTE FUNCTION financeiro.forbid_transaction_mutation();

CREATE OR REPLACE TRIGGER transactions_no_delete
  BEFORE DELETE ON "financeiro"."transactions"
  FOR EACH ROW EXECUTE FUNCTION financeiro.forbid_transaction_mutation();

-- ---------------------------------------------------------------------------
-- financeiro.transaction_reversals — estornos com justificativa obrigatória
-- Uma reversão por transação original (UNIQUE em original_transaction_id).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "financeiro"."transaction_reversals" (
  "id"                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "original_transaction_id" uuid        NOT NULL UNIQUE REFERENCES "financeiro"."transactions" ("id") ON DELETE RESTRICT,
  "reversal_transaction_id" uuid        NOT NULL UNIQUE REFERENCES "financeiro"."transactions" ("id") ON DELETE RESTRICT,
  "justification"           text        NOT NULL,
  "created_by"              uuid        NOT NULL REFERENCES public.users ("id"),
  "created_at"              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transaction_reversals_original_idx
  ON "financeiro"."transaction_reversals" ("original_transaction_id");

-- ---------------------------------------------------------------------------
-- financeiro.attachments — anexos polimórficos (NF, comprovantes, recibos)
-- ref_type + ref_id referenciam payables, receivables ou transactions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "financeiro"."attachments" (
  "id"          uuid                                PRIMARY KEY DEFAULT gen_random_uuid(),
  "ref_type"    "financeiro"."attachment_ref_type"  NOT NULL,
  "ref_id"      uuid                                NOT NULL,
  "file_url"    text                                NOT NULL,
  "file_name"   text                                NOT NULL,
  "file_size"   integer,
  "uploaded_by" uuid                                NOT NULL REFERENCES public.users ("id"),
  "created_at"  timestamptz                         NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attachments_ref_idx
  ON "financeiro"."attachments" ("ref_type", "ref_id");

-- ---------------------------------------------------------------------------
-- financeiro.bank_imports — importações de extrato OFX/CSV
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "financeiro"."bank_imports" (
  "id"            uuid                          PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id"    uuid                          NOT NULL REFERENCES "financeiro"."accounts" ("id") ON DELETE RESTRICT,
  "file_url"      text                          NOT NULL,
  "format"        "financeiro"."import_format"  NOT NULL,
  "imported_by"   uuid                          NOT NULL REFERENCES public.users ("id"),
  "imported_at"   timestamptz                   NOT NULL DEFAULT now(),
  "row_count"     integer                       NOT NULL DEFAULT 0,
  "matched_count" integer                       NOT NULL DEFAULT 0,
  "created_at"    timestamptz                   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bank_imports_account_id_idx  ON "financeiro"."bank_imports" ("account_id");
CREATE INDEX IF NOT EXISTS bank_imports_imported_at_idx ON "financeiro"."bank_imports" ("imported_at");

-- ---------------------------------------------------------------------------
-- financeiro.bank_import_rows — linhas parseadas: data, valor, descrição do extrato
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "financeiro"."bank_import_rows" (
  "id"                   uuid                              PRIMARY KEY DEFAULT gen_random_uuid(),
  "bank_import_id"       uuid                              NOT NULL REFERENCES "financeiro"."bank_imports" ("id") ON DELETE CASCADE,
  "date"                 date                              NOT NULL,
  "amount"               numeric(12,2)                     NOT NULL,
  "description"          text,
  "match_transaction_id" uuid                              REFERENCES "financeiro"."transactions" ("id") ON DELETE SET NULL,
  "status"               "financeiro"."import_row_status"  NOT NULL DEFAULT 'unmatched',
  "created_at"           timestamptz                       NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bank_import_rows_bank_import_id_idx      ON "financeiro"."bank_import_rows" ("bank_import_id");
CREATE INDEX IF NOT EXISTS bank_import_rows_status_idx              ON "financeiro"."bank_import_rows" ("status");
CREATE INDEX IF NOT EXISTS bank_import_rows_match_transaction_id_idx ON "financeiro"."bank_import_rows" ("match_transaction_id");

-- ---------------------------------------------------------------------------
-- financeiro.batch_approvals — lote semanal de pagamentos para aprovação dual
-- UNIQUE (week_start, week_end): 1 lote por semana.
-- approved_by ≠ authorized_by: enforced no Server Action (duas pessoas distintas).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "financeiro"."batch_approvals" (
  "id"             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "week_start"     date        NOT NULL,
  "week_end"       date        NOT NULL,
  "approved_by"    uuid        REFERENCES public.users ("id"),
  "approved_at"    timestamptz,
  "authorized_by"  uuid        REFERENCES public.users ("id"),
  "authorized_at"  timestamptz,
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("week_start", "week_end")
);

CREATE INDEX IF NOT EXISTS batch_approvals_week_start_idx
  ON "financeiro"."batch_approvals" ("week_start");

-- ---------------------------------------------------------------------------
-- financeiro.batch_approval_items — payables incluídos no lote semanal
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "financeiro"."batch_approval_items" (
  "id"                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "batch_approval_id" uuid        NOT NULL REFERENCES "financeiro"."batch_approvals" ("id") ON DELETE CASCADE,
  "payable_id"        uuid        NOT NULL REFERENCES "financeiro"."payables" ("id") ON DELETE RESTRICT,
  "created_at"        timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("batch_approval_id", "payable_id")
);

CREATE INDEX IF NOT EXISTS batch_approval_items_batch_id_idx   ON "financeiro"."batch_approval_items" ("batch_approval_id");
CREATE INDEX IF NOT EXISTS batch_approval_items_payable_id_idx ON "financeiro"."batch_approval_items" ("payable_id");

-- ===========================================================================
-- Row Level Security — DENY by default em todas as tabelas
-- ===========================================================================

-- ── accounts ─────────────────────────────────────────────────────────────────
ALTER TABLE "financeiro"."accounts" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "accounts_select_staff"
    ON "financeiro"."accounts" FOR SELECT TO authenticated
    USING (public.has_role('super_admin', 'diretor', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "accounts_mutate_admin"
    ON "financeiro"."accounts" FOR ALL TO authenticated
    USING (public.has_role('super_admin'))
    WITH CHECK (public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── categories ───────────────────────────────────────────────────────────────
ALTER TABLE "financeiro"."categories" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "categories_select_staff"
    ON "financeiro"."categories" FOR SELECT TO authenticated
    USING (public.has_role('super_admin', 'diretor', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "categories_mutate_admin"
    ON "financeiro"."categories" FOR ALL TO authenticated
    USING (public.has_role('super_admin'))
    WITH CHECK (public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── cost_centers ─────────────────────────────────────────────────────────────
ALTER TABLE "financeiro"."cost_centers" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cost_centers_select_staff"
    ON "financeiro"."cost_centers" FOR SELECT TO authenticated
    USING (public.has_role('super_admin', 'diretor', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cost_centers_mutate_admin"
    ON "financeiro"."cost_centers" FOR ALL TO authenticated
    USING (public.has_role('super_admin'))
    WITH CHECK (public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── budgets ──────────────────────────────────────────────────────────────────
ALTER TABLE "financeiro"."budgets" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "budgets_select_staff"
    ON "financeiro"."budgets" FOR SELECT TO authenticated
    USING (public.has_role('super_admin', 'diretor', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "budgets_mutate_admin"
    ON "financeiro"."budgets" FOR ALL TO authenticated
    USING (public.has_role('super_admin'))
    WITH CHECK (public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── budget_items ─────────────────────────────────────────────────────────────
ALTER TABLE "financeiro"."budget_items" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "budget_items_select_staff"
    ON "financeiro"."budget_items" FOR SELECT TO authenticated
    USING (public.has_role('super_admin', 'diretor', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "budget_items_mutate_admin"
    ON "financeiro"."budget_items" FOR ALL TO authenticated
    USING (public.has_role('super_admin'))
    WITH CHECK (public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── payables ─────────────────────────────────────────────────────────────────
ALTER TABLE "financeiro"."payables" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "payables_select_staff"
    ON "financeiro"."payables" FOR SELECT TO authenticated
    USING (
      "deleted_at" IS NULL
      AND public.has_role('super_admin', 'diretor', 'colaborador')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "payables_insert_staff"
    ON "financeiro"."payables" FOR INSERT TO authenticated
    WITH CHECK (public.has_role('super_admin', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- diretor pode aprovar (status pendente→aprovado); super_admin pode tudo.
-- Lógica fina de quem aprova vs. autoriza é enforced no Server Action.
DO $$ BEGIN
  CREATE POLICY "payables_update_approvers"
    ON "financeiro"."payables" FOR UPDATE TO authenticated
    USING (
      "deleted_at" IS NULL
      AND public.has_role('super_admin', 'diretor')
    )
    WITH CHECK (public.has_role('super_admin', 'diretor'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── receivables ──────────────────────────────────────────────────────────────
ALTER TABLE "financeiro"."receivables" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "receivables_select_staff"
    ON "financeiro"."receivables" FOR SELECT TO authenticated
    USING (
      "deleted_at" IS NULL
      AND public.has_role('super_admin', 'diretor', 'colaborador')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "receivables_mutate_admin"
    ON "financeiro"."receivables" FOR ALL TO authenticated
    USING (public.has_role('super_admin'))
    WITH CHECK (public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── transactions — INSERT only; UPDATE/DELETE bloqueados por trigger ──────────
ALTER TABLE "financeiro"."transactions" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "transactions_select_staff"
    ON "financeiro"."transactions" FOR SELECT TO authenticated
    USING (public.has_role('super_admin', 'diretor', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "transactions_insert_admin"
    ON "financeiro"."transactions" FOR INSERT TO authenticated
    WITH CHECK (public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── transaction_reversals ────────────────────────────────────────────────────
ALTER TABLE "financeiro"."transaction_reversals" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "transaction_reversals_select_staff"
    ON "financeiro"."transaction_reversals" FOR SELECT TO authenticated
    USING (public.has_role('super_admin', 'diretor', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "transaction_reversals_insert_admin"
    ON "financeiro"."transaction_reversals" FOR INSERT TO authenticated
    WITH CHECK (public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── attachments ──────────────────────────────────────────────────────────────
ALTER TABLE "financeiro"."attachments" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "attachments_select_staff"
    ON "financeiro"."attachments" FOR SELECT TO authenticated
    USING (public.has_role('super_admin', 'diretor', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "attachments_insert_staff"
    ON "financeiro"."attachments" FOR INSERT TO authenticated
    WITH CHECK (public.has_role('super_admin', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "attachments_delete_admin"
    ON "financeiro"."attachments" FOR DELETE TO authenticated
    USING (public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── bank_imports ─────────────────────────────────────────────────────────────
ALTER TABLE "financeiro"."bank_imports" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "bank_imports_select_admin"
    ON "financeiro"."bank_imports" FOR SELECT TO authenticated
    USING (public.has_role('super_admin', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bank_imports_insert_admin"
    ON "financeiro"."bank_imports" FOR INSERT TO authenticated
    WITH CHECK (public.has_role('super_admin', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── bank_import_rows ─────────────────────────────────────────────────────────
ALTER TABLE "financeiro"."bank_import_rows" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "bank_import_rows_select_admin"
    ON "financeiro"."bank_import_rows" FOR SELECT TO authenticated
    USING (public.has_role('super_admin', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bank_import_rows_insert_admin"
    ON "financeiro"."bank_import_rows" FOR INSERT TO authenticated
    WITH CHECK (public.has_role('super_admin', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- match_transaction_id update durante a conciliação
DO $$ BEGIN
  CREATE POLICY "bank_import_rows_update_admin"
    ON "financeiro"."bank_import_rows" FOR UPDATE TO authenticated
    USING (public.has_role('super_admin', 'colaborador'))
    WITH CHECK (public.has_role('super_admin', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── batch_approvals ───────────────────────────────────────────────────────────
ALTER TABLE "financeiro"."batch_approvals" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "batch_approvals_select_staff"
    ON "financeiro"."batch_approvals" FOR SELECT TO authenticated
    USING (public.has_role('super_admin', 'diretor', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "batch_approvals_insert_admin"
    ON "financeiro"."batch_approvals" FOR INSERT TO authenticated
    WITH CHECK (public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- diretor aprova; super_admin autoriza (duas pessoas distintas, enforced no Server Action)
DO $$ BEGIN
  CREATE POLICY "batch_approvals_update_approvers"
    ON "financeiro"."batch_approvals" FOR UPDATE TO authenticated
    USING (public.has_role('super_admin', 'diretor'))
    WITH CHECK (public.has_role('super_admin', 'diretor'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── batch_approval_items ──────────────────────────────────────────────────────
ALTER TABLE "financeiro"."batch_approval_items" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "batch_approval_items_select_staff"
    ON "financeiro"."batch_approval_items" FOR SELECT TO authenticated
    USING (public.has_role('super_admin', 'diretor', 'colaborador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "batch_approval_items_insert_admin"
    ON "financeiro"."batch_approval_items" FOR INSERT TO authenticated
    WITH CHECK (public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

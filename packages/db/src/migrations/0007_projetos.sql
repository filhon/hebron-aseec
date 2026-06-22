-- Migration: 0007_projetos
-- Cria tabelas do schema projetos: categories, organizations, organization_members,
-- projects, project_versions, compact_versions, evaluations, votes, contestations,
-- reports, report_attachments, payment_schedules.
-- RLS DENY-by-default com policies por papel e propriedade.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "projetos"."project_type" AS ENUM ('pontual', 'anual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "projetos"."project_stage" AS ENUM (
    'rascunho', 'validacao', 'votacao', 'homologacao',
    'aprovado', 'reprovado', 'em_execucao', 'concluido'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "projetos"."report_status" AS ENUM ('pendente', 'submitted', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "projetos"."payment_status" AS ENUM ('pendente', 'aprovado', 'pago', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "projetos"."contestation_status" AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "projetos"."evaluation_recommendation" AS ENUM ('approved', 'rejected', 'needs_revision');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- projetos.categories — árvore hierárquica de categorias de projeto
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "projetos"."categories" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       text        NOT NULL,
  "slug"       text        NOT NULL UNIQUE,
  "parent_id"  uuid        REFERENCES "projetos"."categories" ("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proj_categories_slug_idx
  ON "projetos"."categories" ("slug");

CREATE INDEX IF NOT EXISTS proj_categories_parent_id_idx
  ON "projetos"."categories" ("parent_id");

CREATE OR REPLACE TRIGGER proj_categories_updated_at
  BEFORE UPDATE ON "projetos"."categories"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projetos.organizations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "projetos"."organizations" (
  "id"                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome"              text        NOT NULL,
  "cnpj"              text        UNIQUE,
  "endereco"          text,
  "telefone"          text,
  "responsavel_legal" text,
  "denominacao"       text,
  "estatuto_url"      text,
  "created_by"        uuid        NOT NULL REFERENCES public.users ("id"),
  "created_at"        timestamptz NOT NULL DEFAULT now(),
  "updated_at"        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organizations_cnpj_idx
  ON "projetos"."organizations" ("cnpj");

CREATE INDEX IF NOT EXISTS organizations_created_by_idx
  ON "projetos"."organizations" ("created_by");

CREATE OR REPLACE TRIGGER organizations_updated_at
  BEFORE UPDATE ON "projetos"."organizations"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projetos.organization_members — N:N
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "projetos"."organization_members" (
  "organization_id" uuid        NOT NULL REFERENCES "projetos"."organizations" ("id") ON DELETE CASCADE,
  "user_id"         uuid        NOT NULL REFERENCES public.users ("id") ON DELETE CASCADE,
  "joined_at"       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("organization_id", "user_id")
);

CREATE INDEX IF NOT EXISTS org_members_user_id_idx
  ON "projetos"."organization_members" ("user_id");

-- ---------------------------------------------------------------------------
-- projetos.projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "projetos"."projects" (
  "id"                  uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  "title"               text                        NOT NULL,
  "description"         text,
  "tipo"                "projetos"."project_type"   NOT NULL,
  "stage"               "projetos"."project_stage"  NOT NULL DEFAULT 'rascunho',
  "category_id"         uuid                        REFERENCES "projetos"."categories" ("id") ON DELETE SET NULL,
  "edital_id"           uuid                        REFERENCES "documentos"."editals" ("id") ON DELETE SET NULL,
  "organization_id"     uuid                        REFERENCES "projetos"."organizations" ("id") ON DELETE SET NULL,
  "submitter_id"        uuid                        NOT NULL REFERENCES public.users ("id"),
  "parent_project_id"   uuid                        REFERENCES "projetos"."projects" ("id") ON DELETE SET NULL,
  "objectives"          text,
  "justification"       text,
  "target_audience"     text,
  "expected_results"    text,
  "ministry_region"     text,
  "ministry_area"       text,
  "budget_total"        numeric(12, 2),
  "parcelas"            integer,
  "meses"               integer,
  "evaluation_year"     integer,
  "score_ai"            numeric(5, 2),
  "score_ai_breakdown"  jsonb,
  "submitted_at"        timestamptz,
  "approved_at"         timestamptz,
  "started_at"          timestamptz,
  "concluded_at"        timestamptz,
  "deleted_at"          timestamptz,
  "created_at"          timestamptz                 NOT NULL DEFAULT now(),
  "updated_at"          timestamptz                 NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_stage_idx
  ON "projetos"."projects" ("stage");

CREATE INDEX IF NOT EXISTS projects_tipo_idx
  ON "projetos"."projects" ("tipo");

CREATE INDEX IF NOT EXISTS projects_submitter_id_idx
  ON "projetos"."projects" ("submitter_id");

CREATE INDEX IF NOT EXISTS projects_organization_id_idx
  ON "projetos"."projects" ("organization_id");

CREATE INDEX IF NOT EXISTS projects_edital_id_idx
  ON "projetos"."projects" ("edital_id");

CREATE INDEX IF NOT EXISTS projects_category_id_idx
  ON "projetos"."projects" ("category_id");

CREATE INDEX IF NOT EXISTS projects_parent_project_id_idx
  ON "projetos"."projects" ("parent_project_id");

CREATE INDEX IF NOT EXISTS projects_evaluation_year_idx
  ON "projetos"."projects" ("evaluation_year");

-- Partial index: apenas projetos não deletados
CREATE INDEX IF NOT EXISTS projects_deleted_at_idx
  ON "projetos"."projects" ("deleted_at")
  WHERE "deleted_at" IS NULL;

CREATE OR REPLACE TRIGGER projects_updated_at
  BEFORE UPDATE ON "projetos"."projects"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projetos.project_versions — snapshots imutáveis a cada mudança de stage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "projetos"."project_versions" (
  "id"             uuid                       PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id"     uuid                       NOT NULL REFERENCES "projetos"."projects" ("id") ON DELETE CASCADE,
  "version_number" integer                    NOT NULL,
  "stage"          "projetos"."project_stage" NOT NULL,
  "data"           jsonb                      NOT NULL,
  "created_by"     uuid                       NOT NULL REFERENCES public.users ("id"),
  "created_at"     timestamptz                NOT NULL DEFAULT now(),
  UNIQUE ("project_id", "version_number")
);

CREATE INDEX IF NOT EXISTS project_versions_project_id_idx
  ON "projetos"."project_versions" ("project_id");

-- ---------------------------------------------------------------------------
-- projetos.compact_versions — versão compacta gerada por IA para avaliadores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "projetos"."compact_versions" (
  "id"           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id"   uuid        NOT NULL REFERENCES "projetos"."projects" ("id") ON DELETE CASCADE,
  "content"      text        NOT NULL,
  "generated_by" text        NOT NULL,
  "created_at"   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compact_versions_project_id_idx
  ON "projetos"."compact_versions" ("project_id");

-- ---------------------------------------------------------------------------
-- projetos.evaluations — avaliação por diretor avaliador designado
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "projetos"."evaluations" (
  "id"             uuid                                PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id"     uuid                                NOT NULL REFERENCES "projetos"."projects" ("id") ON DELETE CASCADE,
  "evaluator_id"   uuid                                NOT NULL REFERENCES public.users ("id"),
  "score"          numeric(5, 2),
  "score_breakdown" jsonb,
  "recommendation" "projetos"."evaluation_recommendation",
  "notes"          text,
  "submitted_at"   timestamptz,
  "created_at"     timestamptz                         NOT NULL DEFAULT now(),
  "updated_at"     timestamptz                         NOT NULL DEFAULT now(),
  UNIQUE ("project_id", "evaluator_id")
);

CREATE INDEX IF NOT EXISTS evaluations_project_id_idx
  ON "projetos"."evaluations" ("project_id");

CREATE INDEX IF NOT EXISTS evaluations_evaluator_id_idx
  ON "projetos"."evaluations" ("evaluator_id");

CREATE OR REPLACE TRIGGER evaluations_updated_at
  BEFORE UPDATE ON "projetos"."evaluations"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projetos.votes — votação secreta
-- RLS proíbe JOIN visível por não-admin (super_admin/diretor apenas).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "projetos"."votes" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid        NOT NULL REFERENCES "projetos"."projects" ("id") ON DELETE CASCADE,
  "user_id"    uuid        NOT NULL REFERENCES public.users ("id"),
  "value"      boolean     NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("project_id", "user_id")
);

CREATE INDEX IF NOT EXISTS votes_project_id_idx
  ON "projetos"."votes" ("project_id");

-- ---------------------------------------------------------------------------
-- projetos.contestations
-- Máx. 2 por projeto (trigger) e 1 por pessoa por projeto (UNIQUE).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "projetos"."contestations" (
  "id"            uuid                            PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id"    uuid                            NOT NULL REFERENCES "projetos"."projects" ("id") ON DELETE CASCADE,
  "user_id"       uuid                            NOT NULL REFERENCES public.users ("id"),
  "justification" text                            NOT NULL,
  "status"        "projetos"."contestation_status" NOT NULL DEFAULT 'pending',
  "reviewed_by"   uuid                            REFERENCES public.users ("id"),
  "reviewed_at"   timestamptz,
  "created_at"    timestamptz                     NOT NULL DEFAULT now(),
  UNIQUE ("project_id", "user_id")
);

CREATE INDEX IF NOT EXISTS contestations_project_id_idx
  ON "projetos"."contestations" ("project_id");

-- Trigger: garante máximo de 2 contestações por projeto
CREATE OR REPLACE FUNCTION projetos.check_contestation_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM "projetos"."contestations"
    WHERE "project_id" = NEW.project_id
  ) >= 2 THEN
    RAISE EXCEPTION 'Máximo de 2 contestações por projeto atingido.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER contestations_limit_check
  BEFORE INSERT ON "projetos"."contestations"
  FOR EACH ROW EXECUTE FUNCTION projetos.check_contestation_limit();

-- ---------------------------------------------------------------------------
-- projetos.reports — relatórios periódicos de execução
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "projetos"."reports" (
  "id"           uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id"   uuid                        NOT NULL REFERENCES "projetos"."projects" ("id") ON DELETE CASCADE,
  "content"      text,
  "status"       "projetos"."report_status"  NOT NULL DEFAULT 'pendente',
  "due_date"     date,
  "period_start" date,
  "period_end"   date,
  "submitted_by" uuid                        REFERENCES public.users ("id"),
  "submitted_at" timestamptz,
  "reviewed_by"  uuid                        REFERENCES public.users ("id"),
  "reviewed_at"  timestamptz,
  "created_at"   timestamptz                 NOT NULL DEFAULT now(),
  "updated_at"   timestamptz                 NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_project_id_idx
  ON "projetos"."reports" ("project_id");

CREATE INDEX IF NOT EXISTS reports_status_idx
  ON "projetos"."reports" ("status");

CREATE INDEX IF NOT EXISTS reports_due_date_idx
  ON "projetos"."reports" ("due_date");

CREATE OR REPLACE TRIGGER reports_updated_at
  BEFORE UPDATE ON "projetos"."reports"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projetos.report_attachments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "projetos"."report_attachments" (
  "id"          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "report_id"   uuid        NOT NULL REFERENCES "projetos"."reports" ("id") ON DELETE CASCADE,
  "file_url"    text        NOT NULL,
  "file_name"   text        NOT NULL,
  "file_size"   integer,
  "uploaded_by" uuid        NOT NULL REFERENCES public.users ("id"),
  "created_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_attachments_report_id_idx
  ON "projetos"."report_attachments" ("report_id");

-- ---------------------------------------------------------------------------
-- projetos.payment_schedules — parcelas geradas na aprovação do projeto
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "projetos"."payment_schedules" (
  "id"         uuid                         PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid                         NOT NULL REFERENCES "projetos"."projects" ("id") ON DELETE CASCADE,
  "amount"     numeric(12, 2)               NOT NULL,
  "month"      integer                      NOT NULL,
  "due_date"   date                         NOT NULL,
  "status"     "projetos"."payment_status"  NOT NULL DEFAULT 'pendente',
  "created_at" timestamptz                  NOT NULL DEFAULT now(),
  "updated_at" timestamptz                  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_schedules_project_id_idx
  ON "projetos"."payment_schedules" ("project_id");

CREATE INDEX IF NOT EXISTS payment_schedules_due_date_idx
  ON "projetos"."payment_schedules" ("due_date");

CREATE INDEX IF NOT EXISTS payment_schedules_status_idx
  ON "projetos"."payment_schedules" ("status");

CREATE OR REPLACE TRIGGER payment_schedules_updated_at
  BEFORE UPDATE ON "projetos"."payment_schedules"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — DENY by default em todas as tabelas
-- ---------------------------------------------------------------------------
ALTER TABLE "projetos"."categories"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projetos"."organizations"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projetos"."organization_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projetos"."projects"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projetos"."project_versions"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projetos"."compact_versions"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projetos"."evaluations"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projetos"."votes"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projetos"."contestations"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projetos"."reports"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projetos"."report_attachments"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projetos"."payment_schedules"   ENABLE ROW LEVEL SECURITY;

-- ── projetos.categories ───────────────────────────────────────────────────
CREATE POLICY "proj_categories_select_authenticated"
  ON "projetos"."categories" FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "proj_categories_write_admin"
  ON "projetos"."categories" FOR ALL
  USING    (public.has_role('super_admin', 'diretor'))
  WITH CHECK (public.has_role('super_admin', 'diretor'));

-- ── projetos.organizations ────────────────────────────────────────────────
-- Admin vê todas; submissor vê organizações das quais é membro ou criador.
CREATE POLICY "organizations_select_member_or_admin"
  ON "projetos"."organizations" FOR SELECT
  USING (
    public.has_role('super_admin', 'diretor', 'conselheiro')
    OR "created_by" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM "projetos"."organization_members" om
      WHERE om.organization_id = "projetos"."organizations"."id"
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "organizations_insert_submissor"
  ON "projetos"."organizations" FOR INSERT
  WITH CHECK (
    public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador', 'submissor')
    AND "created_by" = auth.uid()
  );

CREATE POLICY "organizations_update_owner_or_admin"
  ON "projetos"."organizations" FOR UPDATE
  USING    ("created_by" = auth.uid() OR public.has_role('super_admin', 'diretor'))
  WITH CHECK ("created_by" = auth.uid() OR public.has_role('super_admin', 'diretor'));

-- ── projetos.organization_members ─────────────────────────────────────────
CREATE POLICY "org_members_select_member_or_admin"
  ON "projetos"."organization_members" FOR SELECT
  USING (
    public.has_role('super_admin', 'diretor', 'conselheiro')
    OR "user_id" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM "projetos"."organization_members" om
      WHERE om.organization_id = "projetos"."organization_members"."organization_id"
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_write_admin"
  ON "projetos"."organization_members" FOR ALL
  USING    (public.has_role('super_admin', 'diretor'))
  WITH CHECK (public.has_role('super_admin', 'diretor'));

-- ── projetos.projects ─────────────────────────────────────────────────────
-- Submissor: lê/edita os próprios (soft-delete filtra automaticamente).
-- Avaliador (conselheiro/diretor): lê projetos em votacao/homologacao.
-- Admin: lê e escreve tudo.
CREATE POLICY "projects_select_own"
  ON "projetos"."projects" FOR SELECT
  USING (
    "deleted_at" IS NULL
    AND "submitter_id" = auth.uid()
  );

CREATE POLICY "projects_select_reviewer"
  ON "projetos"."projects" FOR SELECT
  USING (
    "deleted_at" IS NULL
    AND "stage" IN ('votacao', 'homologacao', 'aprovado', 'reprovado', 'em_execucao', 'concluido')
    AND public.has_role('super_admin', 'diretor', 'conselheiro')
  );

CREATE POLICY "projects_insert_submissor"
  ON "projetos"."projects" FOR INSERT
  WITH CHECK (
    public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador', 'submissor')
    AND "submitter_id" = auth.uid()
  );

-- Submissor pode editar apenas projetos em rascunho; admin pode editar em qualquer stage.
CREATE POLICY "projects_update_rascunho_owner"
  ON "projetos"."projects" FOR UPDATE
  USING (
    "deleted_at" IS NULL
    AND "submitter_id" = auth.uid()
    AND "stage" = 'rascunho'
  )
  WITH CHECK (
    "submitter_id" = auth.uid()
    AND "stage" = 'rascunho'
  );

CREATE POLICY "projects_update_admin"
  ON "projetos"."projects" FOR UPDATE
  USING    ("deleted_at" IS NULL AND public.has_role('super_admin', 'diretor'))
  WITH CHECK (public.has_role('super_admin', 'diretor'));

-- Sem DELETE: soft-delete via deleted_at (imutabilidade).

-- ── projetos.project_versions ─────────────────────────────────────────────
-- Versões são imutáveis: sem UPDATE, sem DELETE.
CREATE POLICY "project_versions_select"
  ON "projetos"."project_versions" FOR SELECT
  USING (
    public.has_role('super_admin', 'diretor', 'conselheiro')
    OR EXISTS (
      SELECT 1 FROM "projetos"."projects" p
      WHERE p.id = "projetos"."project_versions"."project_id"
        AND p.submitter_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "project_versions_insert_system"
  ON "projetos"."project_versions" FOR INSERT
  WITH CHECK (public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador', 'submissor'));

-- ── projetos.compact_versions ─────────────────────────────────────────────
-- Versões compactas geradas por IA — leitura por avaliadores e admin.
CREATE POLICY "compact_versions_select"
  ON "projetos"."compact_versions" FOR SELECT
  USING (public.has_role('super_admin', 'diretor', 'conselheiro'));

CREATE POLICY "compact_versions_insert_system"
  ON "projetos"."compact_versions" FOR INSERT
  WITH CHECK (public.has_role('super_admin', 'diretor'));

-- ── projetos.evaluations ──────────────────────────────────────────────────
-- Avaliador vê/edita a própria; admin vê todas.
CREATE POLICY "evaluations_select_own_or_admin"
  ON "projetos"."evaluations" FOR SELECT
  USING (
    "evaluator_id" = auth.uid()
    OR public.has_role('super_admin', 'diretor')
  );

CREATE POLICY "evaluations_insert_evaluator"
  ON "projetos"."evaluations" FOR INSERT
  WITH CHECK (
    public.has_role('super_admin', 'diretor', 'conselheiro')
    AND "evaluator_id" = auth.uid()
  );

CREATE POLICY "evaluations_update_own_or_admin"
  ON "projetos"."evaluations" FOR UPDATE
  USING    ("evaluator_id" = auth.uid() AND "submitted_at" IS NULL
            OR public.has_role('super_admin', 'diretor'))
  WITH CHECK ("evaluator_id" = auth.uid() AND "submitted_at" IS NULL
              OR public.has_role('super_admin', 'diretor'));

-- ── projetos.votes — SIGILO TOTAL ─────────────────────────────────────────
-- INSERT: conselheiro/diretor registra o próprio voto.
-- SELECT: apenas super_admin/diretor vê votos individuais (sigilo de escrutínio).
CREATE POLICY "votes_insert_own"
  ON "projetos"."votes" FOR INSERT
  WITH CHECK (
    public.has_role('super_admin', 'diretor', 'conselheiro')
    AND "user_id" = auth.uid()
  );

CREATE POLICY "votes_select_admin_only"
  ON "projetos"."votes" FOR SELECT
  USING (public.has_role('super_admin', 'diretor'));

-- ── projetos.contestations ────────────────────────────────────────────────
-- Submissor vê e cria as próprias; diretor/admin vê e decide todas.
CREATE POLICY "contestations_select_own_or_admin"
  ON "projetos"."contestations" FOR SELECT
  USING (
    "user_id" = auth.uid()
    OR public.has_role('super_admin', 'diretor', 'conselheiro')
  );

CREATE POLICY "contestations_insert_own"
  ON "projetos"."contestations" FOR INSERT
  WITH CHECK (
    public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador', 'submissor')
    AND "user_id" = auth.uid()
  );

CREATE POLICY "contestations_update_admin"
  ON "projetos"."contestations" FOR UPDATE
  USING    (public.has_role('super_admin', 'diretor'))
  WITH CHECK (public.has_role('super_admin', 'diretor'));

-- ── projetos.reports ──────────────────────────────────────────────────────
-- Submissor vê/edita relatórios dos próprios projetos; admin vê todos.
CREATE POLICY "reports_select_own_or_admin"
  ON "projetos"."reports" FOR SELECT
  USING (
    public.has_role('super_admin', 'diretor', 'conselheiro')
    OR EXISTS (
      SELECT 1 FROM "projetos"."projects" p
      WHERE p.id = "projetos"."reports"."project_id"
        AND p.submitter_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "reports_insert_own_project"
  ON "projetos"."reports" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "projetos"."projects" p
      WHERE p.id = "projetos"."reports"."project_id"
        AND p.submitter_id = auth.uid()
        AND p.deleted_at IS NULL
    )
    OR public.has_role('super_admin', 'diretor')
  );

CREATE POLICY "reports_update_own_or_admin"
  ON "projetos"."reports" FOR UPDATE
  USING (
    public.has_role('super_admin', 'diretor')
    OR (
      "submitted_at" IS NULL
      AND EXISTS (
        SELECT 1 FROM "projetos"."projects" p
        WHERE p.id = "projetos"."reports"."project_id"
          AND p.submitter_id = auth.uid()
          AND p.deleted_at IS NULL
      )
    )
  )
  WITH CHECK (
    public.has_role('super_admin', 'diretor')
    OR "submitted_at" IS NULL
  );

-- ── projetos.report_attachments ───────────────────────────────────────────
CREATE POLICY "report_attachments_select"
  ON "projetos"."report_attachments" FOR SELECT
  USING (
    public.has_role('super_admin', 'diretor', 'conselheiro')
    OR EXISTS (
      SELECT 1 FROM "projetos"."reports" r
      JOIN "projetos"."projects" p ON p.id = r.project_id
      WHERE r.id = "projetos"."report_attachments"."report_id"
        AND p.submitter_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "report_attachments_insert"
  ON "projetos"."report_attachments" FOR INSERT
  WITH CHECK (
    "uploaded_by" = auth.uid()
    AND (
      public.has_role('super_admin', 'diretor')
      OR EXISTS (
        SELECT 1 FROM "projetos"."reports" r
        JOIN "projetos"."projects" p ON p.id = r.project_id
        WHERE r.id = "projetos"."report_attachments"."report_id"
          AND p.submitter_id = auth.uid()
          AND p.deleted_at IS NULL
      )
    )
  );

-- ── projetos.payment_schedules ────────────────────────────────────────────
-- Submissor vê as parcelas dos próprios projetos; admin/financeiro gerencia.
CREATE POLICY "payment_schedules_select_own_or_admin"
  ON "projetos"."payment_schedules" FOR SELECT
  USING (
    public.has_role('super_admin', 'diretor', 'conselheiro')
    OR EXISTS (
      SELECT 1 FROM "projetos"."projects" p
      WHERE p.id = "projetos"."payment_schedules"."project_id"
        AND p.submitter_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "payment_schedules_write_admin"
  ON "projetos"."payment_schedules" FOR ALL
  USING    (public.has_role('super_admin', 'diretor'))
  WITH CHECK (public.has_role('super_admin', 'diretor'));

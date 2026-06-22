-- Migration: 0007_projetos_rls
-- Refine RLS policies for schema projetos, per P-2.7 specification.
--
-- Changes from the initial policies in 0007_projetos.sql:
--   1. projects SELECT: super_admin sees all projects (any stage, including soft-deleted)
--   2. projects SELECT: submissor/colaborador scope extended to cover all org members
--   3. contestations INSERT: restricted to diretor/conselheiro (removes submissor/colaborador)
--   4. reports SELECT: removes conselheiro; access is super_admin/diretor + own-project submissor
--   5. report_attachments SELECT: mirrors reports restriction
--
-- score_ai / score_ai_breakdown masking: PostgreSQL RLS operates at row level, not column
-- level. These fields MUST be stripped in Server Actions before returning data to submissors
-- (RBAC gate in the action layer is the enforcement point for column-level secrecy).

-- ── projetos.projects ─────────────────────────────────────────────────────
-- Drop the two SELECT policies from 0007_projetos.sql and replace with three
-- granular policies that correctly separate admin, reviewer, and submissor scopes.

DROP POLICY IF EXISTS "projects_select_own"      ON "projetos"."projects";
DROP POLICY IF EXISTS "projects_select_reviewer"  ON "projetos"."projects";

-- super_admin: unrestricted — all stages, including soft-deleted rows.
CREATE POLICY "projects_select_admin"
  ON "projetos"."projects" FOR SELECT
  USING (public.has_role('super_admin'));

-- diretor/conselheiro: non-deleted projects at votacao or any later stage.
CREATE POLICY "projects_select_reviewer"
  ON "projetos"."projects" FOR SELECT
  USING (
    "deleted_at" IS NULL
    AND "stage" IN (
      'votacao', 'homologacao', 'aprovado', 'reprovado', 'em_execucao', 'concluido'
    )
    AND public.has_role('diretor', 'conselheiro')
  );

-- submissor/colaborador: own submissions OR any project of their organization.
-- Ensures org members see each other's projects without exposing cross-org data.
CREATE POLICY "projects_select_own_or_org"
  ON "projetos"."projects" FOR SELECT
  USING (
    "deleted_at" IS NULL
    AND (
      "submitter_id" = auth.uid()
      OR (
        "organization_id" IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM "projetos"."organization_members" om
          WHERE om.organization_id = "projetos"."projects"."organization_id"
            AND om.user_id = auth.uid()
        )
      )
    )
  );

-- ── projetos.contestations ────────────────────────────────────────────────
-- P-2.7: only diretor/conselheiro (and super_admin) may file a contestation.
-- Submissores and colaboradores are explicitly excluded.
--
-- max 1 contestation per person per project: enforced by UNIQUE ("project_id", "user_id")
-- max 2 contestations per project: enforced by check_contestation_limit trigger
-- Both constraints were created in 0007_projetos.sql and remain in effect.

DROP POLICY IF EXISTS "contestations_select_own_or_admin" ON "projetos"."contestations";
DROP POLICY IF EXISTS "contestations_insert_own"          ON "projetos"."contestations";

-- Actor sees own contestation; diretor/conselheiro/super_admin see all.
CREATE POLICY "contestations_select_own_or_reviewer"
  ON "projetos"."contestations" FOR SELECT
  USING (
    "user_id" = auth.uid()
    OR public.has_role('super_admin', 'diretor', 'conselheiro')
  );

-- Only diretor/conselheiro (or super_admin acting on their behalf) may contest.
CREATE POLICY "contestations_insert_reviewer"
  ON "projetos"."contestations" FOR INSERT
  WITH CHECK (
    public.has_role('super_admin', 'diretor', 'conselheiro')
    AND "user_id" = auth.uid()
  );

-- ── projetos.reports ──────────────────────────────────────────────────────
-- P-2.7: SELECT limited to super_admin and diretor (review/approval workflow).
-- Submissor retains read access to reports of their own projects.
-- Conselheiro removed from SELECT (conselheiros do not review reports).

DROP POLICY IF EXISTS "reports_select_own_or_admin" ON "projetos"."reports";

CREATE POLICY "reports_select_admin_or_own"
  ON "projetos"."reports" FOR SELECT
  USING (
    public.has_role('super_admin', 'diretor')
    OR EXISTS (
      SELECT 1 FROM "projetos"."projects" p
      WHERE p.id = "projetos"."reports"."project_id"
        AND p.submitter_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- ── projetos.report_attachments ───────────────────────────────────────────
-- Mirror the reports SELECT restriction: remove conselheiro.

DROP POLICY IF EXISTS "report_attachments_select" ON "projetos"."report_attachments";

CREATE POLICY "report_attachments_select"
  ON "projetos"."report_attachments" FOR SELECT
  USING (
    public.has_role('super_admin', 'diretor')
    OR EXISTS (
      SELECT 1 FROM "projetos"."reports" r
      JOIN "projetos"."projects" p ON p.id = r.project_id
      WHERE r.id = "projetos"."report_attachments"."report_id"
        AND p.submitter_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- Migration: 0096_projetos_submitter_contestations
-- P-2.17 (CORRETIVO) — PATCH-029: canal de contestação do submissor durante
-- a validação. Tabela distinta de projetos.contestations (essa continua
-- exclusiva da contestação de diretor/conselheiro na homologação — não
-- ganha coluna `kind`, preserva sua UNIQUE/trigger sem condicionais).
--
-- Formulário estruturado, uma vez por alteração: cada linha referencia o
-- project_version_id específico criado por updateProjectInValidation
-- (0095) — a UNIQUE nessa coluna impede uma segunda contestação sobre o
-- mesmo evento de alteração.
--
-- Reusa projetos.contestation_status (pending/accepted/rejected), criado em
-- 0007_projetos.sql — mesmo domínio de valores, sem tipo Postgres novo.

CREATE TABLE IF NOT EXISTS "projetos"."submitter_contestations" (
  "id"                  uuid                              PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id"          uuid                              NOT NULL REFERENCES "projetos"."projects" ("id") ON DELETE CASCADE,
  "project_version_id"  uuid                              NOT NULL REFERENCES "projetos"."project_versions" ("id") ON DELETE CASCADE,
  "submitter_id"        uuid                              NOT NULL REFERENCES public.users ("id"),
  "reason"              text                              NOT NULL,
  "status"              "projetos"."contestation_status"  NOT NULL DEFAULT 'pending',
  "response"            text,
  "resolved_by"         uuid                              REFERENCES public.users ("id"),
  "resolved_at"         timestamptz,
  "created_at"          timestamptz                       NOT NULL DEFAULT now(),
  UNIQUE ("project_version_id")
);

CREATE INDEX IF NOT EXISTS submitter_contestations_project_id_idx
  ON "projetos"."submitter_contestations" ("project_id");

-- ---------------------------------------------------------------------------
-- RLS — DENY by default. Submissor lê/cria só as próprias; super_admin lê e
-- resolve todas (escopo item 3 do prompt: "submissor lê e escreve só o que
-- é do próprio projeto; super_admin lê tudo" — sem diretor/conselheiro, ao
-- contrário de projetos.contestations).
-- ---------------------------------------------------------------------------
ALTER TABLE "projetos"."submitter_contestations" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submitter_contestations_select_own_or_admin" ON "projetos"."submitter_contestations";
CREATE POLICY "submitter_contestations_select_own_or_admin"
  ON "projetos"."submitter_contestations" FOR SELECT
  USING (
    "submitter_id" = auth.uid()
    OR public.has_role('super_admin')
  );

DROP POLICY IF EXISTS "submitter_contestations_insert_own" ON "projetos"."submitter_contestations";
CREATE POLICY "submitter_contestations_insert_own"
  ON "projetos"."submitter_contestations" FOR INSERT
  WITH CHECK (
    public.has_role('submissor', 'super_admin')
    AND "submitter_id" = auth.uid()
  );

-- Só super_admin resolve (aceita/rejeita) — o submissor nunca dá UPDATE na
-- própria linha (PATCH-029: "super_admin resolve e o ciclo fecha").
DROP POLICY IF EXISTS "submitter_contestations_update_admin" ON "projetos"."submitter_contestations";
CREATE POLICY "submitter_contestations_update_admin"
  ON "projetos"."submitter_contestations" FOR UPDATE
  USING    (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

GRANT SELECT, INSERT, UPDATE ON "projetos"."submitter_contestations" TO authenticated;

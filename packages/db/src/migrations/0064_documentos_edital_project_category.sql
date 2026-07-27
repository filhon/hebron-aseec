-- Migration: 0064_documentos_edital_project_category
--
-- Troca documentos.editals.project_category_id (FK para documentos.categories
-- — a árvore de categorias de DOCUMENTOS, nunca preenchível pelo select
-- "Categoria de projeto" do EditalForm) por project_category_slug text,
-- alinhado ao vocabulário de projetos.categories (mesmos slugs do enum
-- projectCategoryEnum em packages/validators/src/projetos). Confirmado antes
-- de aplicar: `SELECT count(*) FROM documentos.editals WHERE
-- project_category_id IS NOT NULL` = 0 no banco de dev — troca sem perda de
-- dados (P-1.23b).

DROP INDEX IF EXISTS "documentos"."editals_project_category_id_idx";

ALTER TABLE "documentos"."editals"
  DROP COLUMN IF EXISTS "project_category_id";

ALTER TABLE "documentos"."editals"
  ADD COLUMN "project_category_slug" text;

CREATE INDEX IF NOT EXISTS "editals_project_category_slug_idx"
  ON "documentos"."editals" ("project_category_slug");

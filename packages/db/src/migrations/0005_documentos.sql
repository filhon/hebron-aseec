-- Migration: 0005_documentos
-- Cria tabelas do schema documentos: categories, tags, documents,
-- document_tags, document_versions, editals, subscriptions, views.
-- RLS DENY-by-default com policies por visibilidade e papel.

-- ---------------------------------------------------------------------------
-- Enum: documentos.visibility
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "documentos"."visibility" AS ENUM ('public', 'internal', 'restricted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- documentos.categories — árvore hierárquica (parent_id auto-referência)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "documentos"."categories" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       text        NOT NULL,
  "slug"       text        NOT NULL UNIQUE,
  "parent_id"  uuid        REFERENCES "documentos"."categories" ("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS categories_slug_idx
  ON "documentos"."categories" ("slug");

CREATE INDEX IF NOT EXISTS categories_parent_id_idx
  ON "documentos"."categories" ("parent_id");

CREATE OR REPLACE TRIGGER categories_updated_at
  BEFORE UPDATE ON "documentos"."categories"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- documentos.tags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "documentos"."tags" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       text        NOT NULL,
  "slug"       text        NOT NULL UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tags_slug_idx
  ON "documentos"."tags" ("slug");

-- ---------------------------------------------------------------------------
-- documentos.documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "documentos"."documents" (
  "id"           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "title"        text        NOT NULL,
  "slug"         text        NOT NULL UNIQUE,
  "content_md"   text,
  "file_url"     text,
  "visibility"   "documentos"."visibility" NOT NULL DEFAULT 'internal',
  "category_id"  uuid        REFERENCES "documentos"."categories" ("id") ON DELETE SET NULL,
  "author_id"    uuid        NOT NULL REFERENCES public.users ("id"),
  "published_at" timestamptz,
  "deleted_at"   timestamptz,
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  "updated_at"   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_slug_idx
  ON "documentos"."documents" ("slug");

CREATE INDEX IF NOT EXISTS documents_visibility_idx
  ON "documentos"."documents" ("visibility");

-- Partial index: apenas documentos publicados
CREATE INDEX IF NOT EXISTS documents_published_at_idx
  ON "documentos"."documents" ("published_at" DESC)
  WHERE "published_at" IS NOT NULL;

CREATE INDEX IF NOT EXISTS documents_author_id_idx
  ON "documentos"."documents" ("author_id");

CREATE INDEX IF NOT EXISTS documents_category_id_idx
  ON "documentos"."documents" ("category_id");

CREATE OR REPLACE TRIGGER documents_updated_at
  BEFORE UPDATE ON "documentos"."documents"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- documentos.document_tags — junction table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "documentos"."document_tags" (
  "document_id" uuid NOT NULL REFERENCES "documentos"."documents" ("id") ON DELETE CASCADE,
  "tag_id"      uuid NOT NULL REFERENCES "documentos"."tags" ("id") ON DELETE CASCADE,
  PRIMARY KEY ("document_id", "tag_id")
);

-- ---------------------------------------------------------------------------
-- documentos.document_versions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "documentos"."document_versions" (
  "id"             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id"    uuid        NOT NULL REFERENCES "documentos"."documents" ("id") ON DELETE CASCADE,
  "content_md"     text,
  "file_url"       text,
  "version_number" integer     NOT NULL,
  "created_by"     uuid        NOT NULL REFERENCES public.users ("id"),
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("document_id", "version_number")
);

CREATE INDEX IF NOT EXISTS document_versions_document_id_idx
  ON "documentos"."document_versions" ("document_id");

-- ---------------------------------------------------------------------------
-- documentos.editals — extends documents (1-to-1 via PK → FK)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "documentos"."editals" (
  "id"                  uuid PRIMARY KEY REFERENCES "documentos"."documents" ("id") ON DELETE CASCADE,
  "opens_at"            timestamptz,
  "closes_at"           timestamptz,
  "project_type"        text,
  "project_category_id" uuid REFERENCES "documentos"."categories" ("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS editals_opens_at_idx
  ON "documentos"."editals" ("opens_at");

CREATE INDEX IF NOT EXISTS editals_closes_at_idx
  ON "documentos"."editals" ("closes_at");

CREATE INDEX IF NOT EXISTS editals_project_category_id_idx
  ON "documentos"."editals" ("project_category_id");

-- ---------------------------------------------------------------------------
-- documentos.subscriptions — alertas por categoria
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "documentos"."subscriptions" (
  "id"          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     uuid        NOT NULL REFERENCES public.users ("id") ON DELETE CASCADE,
  "category_id" uuid        NOT NULL REFERENCES "documentos"."categories" ("id") ON DELETE CASCADE,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "category_id")
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx
  ON "documentos"."subscriptions" ("user_id");

CREATE INDEX IF NOT EXISTS subscriptions_category_id_idx
  ON "documentos"."subscriptions" ("category_id");

-- ---------------------------------------------------------------------------
-- documentos.views — analytics de visualização
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "documentos"."views" (
  "id"          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id" uuid        NOT NULL REFERENCES "documentos"."documents" ("id") ON DELETE CASCADE,
  "user_id"     uuid        REFERENCES public.users ("id") ON DELETE SET NULL,
  "viewed_at"   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS views_document_id_idx
  ON "documentos"."views" ("document_id");

CREATE INDEX IF NOT EXISTS views_user_id_idx
  ON "documentos"."views" ("user_id");

CREATE INDEX IF NOT EXISTS views_viewed_at_idx
  ON "documentos"."views" ("viewed_at" DESC);

-- ---------------------------------------------------------------------------
-- Row Level Security — DENY by default em todas as tabelas
-- ---------------------------------------------------------------------------
ALTER TABLE "documentos"."categories"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documentos"."tags"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documentos"."documents"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documentos"."document_tags"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documentos"."document_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documentos"."editals"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documentos"."subscriptions"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documentos"."views"             ENABLE ROW LEVEL SECURITY;

-- ── documentos.categories ─────────────────────────────────────────────────
-- Qualquer autenticado pode ler; colaborador+ pode escrever.
CREATE POLICY "categories_select_authenticated"
  ON "documentos"."categories" FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "categories_write_colaborador"
  ON "documentos"."categories" FOR ALL
  USING    (public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador'))
  WITH CHECK (public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador'));

-- ── documentos.tags ───────────────────────────────────────────────────────
CREATE POLICY "tags_select_authenticated"
  ON "documentos"."tags" FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "tags_write_colaborador"
  ON "documentos"."tags" FOR ALL
  USING    (public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador'))
  WITH CHECK (public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador'));

-- ── documentos.documents ──────────────────────────────────────────────────
-- Visibilidade multi-camada: public → autenticado; internal → colaborador+;
-- restricted → conselheiro+. Documentos com deleted_at são invisíveis.
CREATE POLICY "documents_select_public"
  ON "documentos"."documents" FOR SELECT
  USING (
    "deleted_at" IS NULL
    AND "visibility" = 'public'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "documents_select_internal"
  ON "documentos"."documents" FOR SELECT
  USING (
    "deleted_at" IS NULL
    AND "visibility" = 'internal'
    AND public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador')
  );

CREATE POLICY "documents_select_restricted"
  ON "documentos"."documents" FOR SELECT
  USING (
    "deleted_at" IS NULL
    AND "visibility" = 'restricted'
    AND public.has_role('super_admin', 'diretor', 'conselheiro')
  );

-- Colaborador pode criar; author_id deve ser o próprio usuário.
CREATE POLICY "documents_insert_colaborador"
  ON "documentos"."documents" FOR INSERT
  WITH CHECK (
    public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador')
    AND "author_id" = auth.uid()
  );

-- Autor edita o próprio; diretor+ edita qualquer.
CREATE POLICY "documents_update_author_or_admin"
  ON "documentos"."documents" FOR UPDATE
  USING    ("author_id" = auth.uid() OR public.has_role('super_admin', 'diretor'))
  WITH CHECK ("author_id" = auth.uid() OR public.has_role('super_admin', 'diretor'));

-- Sem DELETE: soft delete via deleted_at (imutabilidade).

-- ── documentos.document_tags ──────────────────────────────────────────────
CREATE POLICY "document_tags_select_authenticated"
  ON "documentos"."document_tags" FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "document_tags_write_colaborador"
  ON "documentos"."document_tags" FOR ALL
  USING    (public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador'))
  WITH CHECK (public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador'));

-- ── documentos.document_versions ─────────────────────────────────────────
-- Colaborador+ pode ler versões; apenas autor original pode criar versões.
CREATE POLICY "document_versions_select_colaborador"
  ON "documentos"."document_versions" FOR SELECT
  USING (public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador'));

CREATE POLICY "document_versions_insert_colaborador"
  ON "documentos"."document_versions" FOR INSERT
  WITH CHECK (
    public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador')
    AND "created_by" = auth.uid()
  );

-- Versões são imutáveis: sem UPDATE, sem DELETE.

-- ── documentos.editals ────────────────────────────────────────────────────
-- Leitura: herda visibilidade do documento pai.
-- Escrita: diretor+ (editais têm implicações financeiras/jurídicas).
CREATE POLICY "editals_select"
  ON "documentos"."editals" FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "documentos"."documents" d
      WHERE d.id = "documentos"."editals"."id"
        AND d.deleted_at IS NULL
        AND (
          d.visibility = 'public'
          OR (d.visibility = 'internal'   AND public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador'))
          OR (d.visibility = 'restricted' AND public.has_role('super_admin', 'diretor', 'conselheiro'))
        )
    )
  );

CREATE POLICY "editals_write_diretor"
  ON "documentos"."editals" FOR ALL
  USING    (public.has_role('super_admin', 'diretor'))
  WITH CHECK (public.has_role('super_admin', 'diretor'));

-- ── documentos.subscriptions ─────────────────────────────────────────────
-- Usuário gerencia apenas as próprias inscrições; admin pode ler todas.
CREATE POLICY "subscriptions_select_own"
  ON "documentos"."subscriptions" FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "subscriptions_select_admin"
  ON "documentos"."subscriptions" FOR SELECT
  USING (public.has_role('super_admin', 'diretor'));

CREATE POLICY "subscriptions_insert_own"
  ON "documentos"."subscriptions" FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuário pode cancelar a própria inscrição.
CREATE POLICY "subscriptions_delete_own"
  ON "documentos"."subscriptions" FOR DELETE
  USING (user_id = auth.uid());

-- ── documentos.views ─────────────────────────────────────────────────────
-- Qualquer autenticado pode registrar view; users veem as próprias; admin vê tudo.
CREATE POLICY "views_insert_authenticated"
  ON "documentos"."views" FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "views_select_own"
  ON "documentos"."views" FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "views_select_admin"
  ON "documentos"."views" FOR SELECT
  USING (public.has_role('super_admin', 'diretor'));

-- Views são imutáveis: sem UPDATE, sem DELETE.

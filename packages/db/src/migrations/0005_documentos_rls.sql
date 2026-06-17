-- Migration: 0005_documentos_rls
-- Corrige e padroniza policies RLS do schema documentos.
--
-- Substitui as policies provisórias de 0005_documentos.sql com semântica correta:
--   • anon           → SELECT em documents/editals com visibility = 'public'
--   • auth           → SELECT em documents com visibility IN ('public', 'internal')
--   • restricted     → SELECT apenas para papéis com acesso: super_admin, diretor, conselheiro
--   • super_admin / diretor → CRUD em qualquer documento
--   • colaborador (editor) → INSERT (autor = self) + UPDATE (próprios documentos)
--   • document_versions e document_tags herdam visibilidade do documento pai
--   • subscriptions: apenas as próprias (user_id = auth.uid())

-- ---------------------------------------------------------------------------
-- documentos.categories
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "categories_select_authenticated" ON "documentos"."categories";
DROP POLICY IF EXISTS "categories_write_colaborador"    ON "documentos"."categories";

-- Anon pode listar categorias (necessário para navegar documentos públicos)
CREATE POLICY "categories_select_all"
  ON "documentos"."categories" FOR SELECT
  USING (true);

CREATE POLICY "categories_write_editor"
  ON "documentos"."categories" FOR ALL
  USING    (public.has_role('super_admin', 'diretor', 'colaborador'))
  WITH CHECK (public.has_role('super_admin', 'diretor', 'colaborador'));

-- ---------------------------------------------------------------------------
-- documentos.tags
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tags_select_authenticated" ON "documentos"."tags";
DROP POLICY IF EXISTS "tags_write_colaborador"    ON "documentos"."tags";

-- Anon pode listar tags (necessário para filtros na listagem pública)
CREATE POLICY "tags_select_all"
  ON "documentos"."tags" FOR SELECT
  USING (true);

CREATE POLICY "tags_write_editor"
  ON "documentos"."tags" FOR ALL
  USING    (public.has_role('super_admin', 'diretor', 'colaborador'))
  WITH CHECK (public.has_role('super_admin', 'diretor', 'colaborador'));

-- ---------------------------------------------------------------------------
-- documentos.documents
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_select_public"          ON "documentos"."documents";
DROP POLICY IF EXISTS "documents_select_internal"        ON "documentos"."documents";
DROP POLICY IF EXISTS "documents_select_restricted"      ON "documentos"."documents";
DROP POLICY IF EXISTS "documents_insert_colaborador"     ON "documentos"."documents";
DROP POLICY IF EXISTS "documents_update_author_or_admin" ON "documentos"."documents";

-- Anon: SELECT apenas documentos públicos não deletados
CREATE POLICY "documents_select_public"
  ON "documentos"."documents" FOR SELECT
  USING (
    "deleted_at" IS NULL
    AND "visibility" = 'public'
  );

-- Autenticado: SELECT em documentos internos não deletados
CREATE POLICY "documents_select_internal"
  ON "documentos"."documents" FOR SELECT
  USING (
    "deleted_at" IS NULL
    AND "visibility" = 'internal'
    AND auth.uid() IS NOT NULL
  );

-- Restricted: apenas papéis definidos (verificado via role_assignments)
CREATE POLICY "documents_select_restricted"
  ON "documentos"."documents" FOR SELECT
  USING (
    "deleted_at" IS NULL
    AND "visibility" = 'restricted'
    AND public.has_role('super_admin', 'diretor', 'conselheiro')
  );

-- INSERT: colaborador+ deve ser o autor (author_id = uid())
CREATE POLICY "documents_insert_editor"
  ON "documentos"."documents" FOR INSERT
  WITH CHECK (
    public.has_role('super_admin', 'diretor', 'colaborador')
    AND "author_id" = auth.uid()
  );

-- UPDATE: super_admin e diretor atualizam qualquer documento
CREATE POLICY "documents_update_admin"
  ON "documentos"."documents" FOR UPDATE
  USING    (public.has_role('super_admin', 'diretor'))
  WITH CHECK (public.has_role('super_admin', 'diretor'));

-- UPDATE: colaborador atualiza apenas os próprios documentos
CREATE POLICY "documents_update_own"
  ON "documentos"."documents" FOR UPDATE
  USING    ("author_id" = auth.uid() AND public.has_role('colaborador'))
  WITH CHECK ("author_id" = auth.uid() AND public.has_role('colaborador'));

-- Sem DELETE: soft delete via campo deleted_at (imutabilidade).
-- Coberto pelas políticas UPDATE acima.

-- ---------------------------------------------------------------------------
-- documentos.document_tags
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "document_tags_select_authenticated" ON "documentos"."document_tags";
DROP POLICY IF EXISTS "document_tags_write_colaborador"    ON "documentos"."document_tags";

-- SELECT: herda a visibilidade do documento pai (incluindo acesso anon a public)
CREATE POLICY "document_tags_select"
  ON "documentos"."document_tags" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "documentos"."documents" d
      WHERE d.id = "documentos"."document_tags"."document_id"
        AND d.deleted_at IS NULL
        AND (
          d.visibility = 'public'
          OR (d.visibility = 'internal'   AND auth.uid() IS NOT NULL)
          OR (d.visibility = 'restricted' AND public.has_role('super_admin', 'diretor', 'conselheiro'))
        )
    )
  );

-- Escrita: editor e acima
CREATE POLICY "document_tags_write_editor"
  ON "documentos"."document_tags" FOR ALL
  USING    (public.has_role('super_admin', 'diretor', 'colaborador'))
  WITH CHECK (public.has_role('super_admin', 'diretor', 'colaborador'));

-- ---------------------------------------------------------------------------
-- documentos.document_versions — herdam visibilidade do documento pai
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "document_versions_select_colaborador" ON "documentos"."document_versions";
DROP POLICY IF EXISTS "document_versions_insert_colaborador" ON "documentos"."document_versions";

-- SELECT: segue exatamente a visibilidade do documento pai
CREATE POLICY "document_versions_select"
  ON "documentos"."document_versions" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "documentos"."documents" d
      WHERE d.id = "documentos"."document_versions"."document_id"
        AND d.deleted_at IS NULL
        AND (
          d.visibility = 'public'
          OR (d.visibility = 'internal'   AND auth.uid() IS NOT NULL)
          OR (d.visibility = 'restricted' AND public.has_role('super_admin', 'diretor', 'conselheiro'))
        )
    )
  );

-- INSERT: editor cria versões; created_by deve ser o próprio usuário
CREATE POLICY "document_versions_insert_editor"
  ON "documentos"."document_versions" FOR INSERT
  WITH CHECK (
    public.has_role('super_admin', 'diretor', 'colaborador')
    AND "created_by" = auth.uid()
  );

-- Versões são imutáveis: sem UPDATE, sem DELETE.

-- ---------------------------------------------------------------------------
-- documentos.editals — visibilidade herdada do documento pai
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "editals_select"        ON "documentos"."editals";
DROP POLICY IF EXISTS "editals_write_diretor" ON "documentos"."editals";

-- SELECT: herda visibilidade do documento pai (anon acessa editais públicos)
CREATE POLICY "editals_select"
  ON "documentos"."editals" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "documentos"."documents" d
      WHERE d.id = "documentos"."editals"."id"
        AND d.deleted_at IS NULL
        AND (
          d.visibility = 'public'
          OR (d.visibility = 'internal'   AND auth.uid() IS NOT NULL)
          OR (d.visibility = 'restricted' AND public.has_role('super_admin', 'diretor', 'conselheiro'))
        )
    )
  );

-- Escrita de editais: apenas super_admin e diretor (implicações jurídicas/financeiras)
CREATE POLICY "editals_write_admin"
  ON "documentos"."editals" FOR ALL
  USING    (public.has_role('super_admin', 'diretor'))
  WITH CHECK (public.has_role('super_admin', 'diretor'));

-- ---------------------------------------------------------------------------
-- documentos.subscriptions — apenas as próprias
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "subscriptions_select_own"   ON "documentos"."subscriptions";
DROP POLICY IF EXISTS "subscriptions_select_admin" ON "documentos"."subscriptions";
DROP POLICY IF EXISTS "subscriptions_insert_own"   ON "documentos"."subscriptions";
DROP POLICY IF EXISTS "subscriptions_delete_own"   ON "documentos"."subscriptions";

-- Usuário vê apenas as próprias inscrições
CREATE POLICY "subscriptions_select_own"
  ON "documentos"."subscriptions" FOR SELECT
  USING (user_id = auth.uid());

-- Admin pode ver todas para fins de auditoria
CREATE POLICY "subscriptions_select_admin"
  ON "documentos"."subscriptions" FOR SELECT
  USING (public.has_role('super_admin', 'diretor'));

-- Usuário inscreve a si mesmo
CREATE POLICY "subscriptions_insert_own"
  ON "documentos"."subscriptions" FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuário cancela a própria inscrição
CREATE POLICY "subscriptions_delete_own"
  ON "documentos"."subscriptions" FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- documentos.views — analytics de visualização
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "views_insert_authenticated" ON "documentos"."views";
DROP POLICY IF EXISTS "views_select_own"           ON "documentos"."views";
DROP POLICY IF EXISTS "views_select_admin"         ON "documentos"."views";

-- Apenas autenticados registram views (user_id obrigatório para rastreio)
CREATE POLICY "views_insert_authenticated"
  ON "documentos"."views" FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Usuário vê apenas as próprias views
CREATE POLICY "views_select_own"
  ON "documentos"."views" FOR SELECT
  USING (user_id = auth.uid());

-- Admin vê todas para analytics
CREATE POLICY "views_select_admin"
  ON "documentos"."views" FOR SELECT
  USING (public.has_role('super_admin', 'diretor'));

-- Views são imutáveis: sem UPDATE, sem DELETE.

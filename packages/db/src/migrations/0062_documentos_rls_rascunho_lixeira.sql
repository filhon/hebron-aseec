-- Migration: 0062_documentos_rls_rascunho_lixeira
-- P-1.19b (corretivo) — fecha dois buracos de RLS deixados por 0005_documentos_rls.sql:
--
--   1. Rascunho não era gateado por RLS: as três policies de SELECT em
--      documentos.documents (e as herdadas em document_versions, document_tags,
--      editals) filtravam deleted_at/visibility mas não published_at. Um
--      rascunho com visibility='public' era legível por `anon` no banco.
--   2. Documento soft-deletado não tinha NENHUMA policy de SELECT que o
--      alcançasse — nem para quem o apagou nem para super_admin. Sem lixeira,
--      sem restauração; deleteDocument só funcionava contornando RLS
--      (withSystemRole).
--
-- Fix: published_at IS NOT NULL nas três policies públicas + uma nova policy
-- "own_draft" (autor ou super_admin/diretor, sem filtro de deleted_at/
-- published_at) que cobre rascunho e lixeira ao mesmo tempo. Espelhada em
-- document_versions/document_tags/editals, que herdam a visibilidade do pai.
--
-- Não mexe nas policies de escrita: o papel conselheiro decidido em P-1.19b
-- (item 3) é somente-leitura, então nenhuma policy de escrita muda aqui —
-- elas já excluíam conselheiro desde 0005_documentos_rls.sql.

-- ---------------------------------------------------------------------------
-- documentos.documents
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_select_public"     ON "documentos"."documents";
DROP POLICY IF EXISTS "documents_select_internal"   ON "documentos"."documents";
DROP POLICY IF EXISTS "documents_select_restricted" ON "documentos"."documents";

CREATE POLICY "documents_select_public"
  ON "documentos"."documents" FOR SELECT
  USING (
    "deleted_at" IS NULL
    AND "published_at" IS NOT NULL
    AND "visibility" = 'public'
  );

CREATE POLICY "documents_select_internal"
  ON "documentos"."documents" FOR SELECT
  USING (
    "deleted_at" IS NULL
    AND "published_at" IS NOT NULL
    AND "visibility" = 'internal'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "documents_select_restricted"
  ON "documentos"."documents" FOR SELECT
  USING (
    "deleted_at" IS NULL
    AND "published_at" IS NOT NULL
    AND "visibility" = 'restricted'
    AND public.has_role('super_admin', 'diretor', 'conselheiro')
  );

-- Rascunho e lixeira: autor sempre enxerga o próprio documento (qualquer
-- published_at/deleted_at); super_admin/diretor enxergam qualquer documento.
-- Sem esta policy, updateDocument/publishDocument (que leem o `before` sob
-- contexto autenticado) param de funcionar para rascunhos, e deleteDocument/
-- restoreDocument não conseguem satisfazer a checagem de SELECT que o
-- RETURNING de um UPDATE exige sobre a linha resultante.
CREATE POLICY "documents_select_own_draft"
  ON "documentos"."documents" FOR SELECT
  USING (
    "author_id" = auth.uid()
    OR public.has_role('super_admin', 'diretor')
  );

-- ---------------------------------------------------------------------------
-- documentos.document_versions — herda visibilidade do documento pai
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "document_versions_select" ON "documentos"."document_versions";

CREATE POLICY "document_versions_select"
  ON "documentos"."document_versions" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "documentos"."documents" d
      WHERE d.id = "documentos"."document_versions"."document_id"
        AND (
          d.author_id = auth.uid()
          OR public.has_role('super_admin', 'diretor')
          OR (
            d.deleted_at IS NULL
            AND d.published_at IS NOT NULL
            AND (
              d.visibility = 'public'
              OR (d.visibility = 'internal'   AND auth.uid() IS NOT NULL)
              OR (d.visibility = 'restricted' AND public.has_role('super_admin', 'diretor', 'conselheiro'))
            )
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- documentos.document_tags — herda visibilidade do documento pai
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "document_tags_select" ON "documentos"."document_tags";

CREATE POLICY "document_tags_select"
  ON "documentos"."document_tags" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "documentos"."documents" d
      WHERE d.id = "documentos"."document_tags"."document_id"
        AND (
          d.author_id = auth.uid()
          OR public.has_role('super_admin', 'diretor')
          OR (
            d.deleted_at IS NULL
            AND d.published_at IS NOT NULL
            AND (
              d.visibility = 'public'
              OR (d.visibility = 'internal'   AND auth.uid() IS NOT NULL)
              OR (d.visibility = 'restricted' AND public.has_role('super_admin', 'diretor', 'conselheiro'))
            )
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- documentos.editals — herda visibilidade do documento pai
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "editals_select" ON "documentos"."editals";

CREATE POLICY "editals_select"
  ON "documentos"."editals" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "documentos"."documents" d
      WHERE d.id = "documentos"."editals"."id"
        AND (
          d.author_id = auth.uid()
          OR public.has_role('super_admin', 'diretor')
          OR (
            d.deleted_at IS NULL
            AND d.published_at IS NOT NULL
            AND (
              d.visibility = 'public'
              OR (d.visibility = 'internal'   AND auth.uid() IS NOT NULL)
              OR (d.visibility = 'restricted' AND public.has_role('super_admin', 'diretor', 'conselheiro'))
            )
          )
        )
    )
  );

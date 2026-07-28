-- Migration: 0068_projetos_reports_submit_rls_fix
-- P-2.6b — achado ao testar o ciclo real de rejeição → reenvio sob RLS
-- (fora do escopo original do prompt, mas bloqueava o próprio teste
-- exigido pelo critério de aceite; corrigido aqui por decisão do Filipe —
-- ver SESSIONS.md).
--
-- "reports_update_own_or_admin" (0007_projetos.sql, nunca alterada desde
-- então) tem WITH CHECK "submitted_at IS NULL" no ramo do submissor. WITH
-- CHECK avalia a linha NOVA (pós-update) — e submitReport grava
-- submitted_at = now() na própria UPDATE que essa policy deveria permitir.
-- Resultado: nenhum submissor jamais conseguiu submeter um relatório pelo
-- caminho real, com RLS ativo via withAuthenticatedContext (P-0.10) — só
-- passava despercebido porque nenhum teste chamava submitReport pelo
-- pipeline autenticado (os existentes escrevem direto no banco, como
-- flow.test.ts, ou testam outras actions).
--
-- USING já garante que só uma linha ainda não submetida (submitted_at IS
-- NULL) é elegível para UPDATE pelo submissor — o WITH CHECK só precisa
-- confirmar posse do projeto (mesmo predicado de reports_insert_own_project
-- em 0007_projetos.sql), não repetir a condição da linha antiga contra a
-- linha nova.

DROP POLICY IF EXISTS "reports_update_own_or_admin" ON "projetos"."reports";

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
    OR EXISTS (
      SELECT 1 FROM "projetos"."projects" p
      WHERE p.id = "projetos"."reports"."project_id"
        AND p.submitter_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

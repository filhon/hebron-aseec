-- Migration: 0009_fix_rls_org_members_votes
-- Corrige dois problemas de RLS no schema projetos:
--
--  1. RECURSÃO INFINITA em organization_members:
--     A policy org_members_select_member_or_admin continha um EXISTS
--     auto-referencial (organização_members consultando organization_members),
--     causando infinite recursion ao acessar projetos.projects via usuário
--     com papel submissor (que ativa projects_select_own_or_org, que por sua
--     vez consulta organization_members).
--     FIX: extrair a consulta de membership para uma função SECURITY DEFINER
--     que roda como postgres (bypassrls), quebrando o ciclo.
--
--  2. CÉDULA SECRETA — diretor via votos:
--     A policy votes_select_admin_only permitia has_role('super_admin','diretor'),
--     mas a regra de negócio exige sigilo total: apenas super_admin lê votos
--     individuais. O diretor pode INSERIR o próprio voto mas não pode ler a
--     cédula de ninguém (nem a própria).
--     FIX: recriar a policy restrita a has_role('super_admin').

-- ── Helper SECURITY DEFINER ────────────────────────────────────────────────
-- Mantido em projetos (schema não exposto via Data API) para evitar que
-- anon/authenticated chamem diretamente.
-- Usa auth.uid() internamente — não aceita user_id externo.

CREATE OR REPLACE FUNCTION projetos.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projetos.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid()
  );
$$;

-- ── projetos.organization_members — policy corrigida ─────────────────────

DROP POLICY IF EXISTS "org_members_select_member_or_admin" ON "projetos"."organization_members";
CREATE POLICY "org_members_select_member_or_admin"
  ON "projetos"."organization_members" FOR SELECT
  USING (
    public.has_role('super_admin', 'diretor', 'conselheiro')
    OR "user_id" = auth.uid()
    OR projetos.is_org_member("organization_id")
  );

-- ── projetos.votes — cédula secreta restrita a super_admin ────────────────

DROP POLICY IF EXISTS "votes_select_admin_only" ON "projetos"."votes";
CREATE POLICY "votes_select_admin_only"
  ON "projetos"."votes" FOR SELECT
  USING (public.has_role('super_admin'));

-- Migration: 0025_fix_projetos_schema_grant
-- Achado colateral da sessão de P-0.13: o schema "projetos" está sem
-- GRANT USAGE para "authenticated" no banco de dev/staging, apesar de
-- 0014_grants_authenticated.sql já declará-lo e estar marcada como
-- aplicada (grants de tabela individuais existem, mas sem USAGE no schema
-- eles são inertes — "permission denied for schema projetos" antes mesmo
-- de qualquer policy ser avaliada). Drift do ambiente, não do código;
-- restaura o estado já documentado em 0014.

GRANT USAGE ON SCHEMA "projetos" TO authenticated;

-- P-9.1 — Revisão de Segurança (RLS Audit): correções de GRANTs / RLS.
--
-- Este arquivo corrige os achados de nível ALTO/CRÍTICO da auditoria que são
-- fixáveis via SQL (convenção G6.4). Achados que exigem refatoração de código de
-- app (S-02 leituras via `db` superuser, S-05 URL assinada de 10 anos) estão
-- documentados em SESSIONS.md, não aqui.
--
-- Idempotente: REVOKE de privilégio ausente e ENABLE RLS já ativo são no-ops —
-- seguro reaplicar pelo runner (packages/db/src/migrate.ts).

-- ─────────────────────────────────────────────────────────────────────────────
-- S-01 (CRÍTICO) — Schema `public` mantém os GRANTs default do Supabase
-- (`GRANT ALL ... TO anon, authenticated`), incluindo TRUNCATE / TRIGGER /
-- REFERENCES, que NÃO são filtrados por RLS. Com `anon` tendo USAGE em `public`,
-- uma requisição anônima poderia `TRUNCATE public.users` / `role_assignments`,
-- destruindo usuários e papéis. Os schemas de app foram travados em
-- 0014_grants_authenticated.sql; `public` nunca foi. Aqui reconciliamos os
-- GRANTs às policies existentes (todas keyed em auth.uid()/has_role, i.e.
-- `authenticated`) — "nenhum GRANT mais largo que a policy correspondente".
-- ─────────────────────────────────────────────────────────────────────────────

-- TRUNCATE / TRIGGER / REFERENCES não são cobertos por RLS e nenhum papel de app
-- os usa em runtime. Removê-los de anon e authenticated fecha o buraco do TRUNCATE.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE
  public.users,
  public.role_assignments,
  public.designations,
  public.consents,
  public.notifications
  FROM anon, authenticated;

-- `anon` não tem acesso concedido por NENHUMA policy destas tabelas (todas exigem
-- auth.uid()/has_role). Remove-se toda escrita de anon; o SELECT permanece porque
-- a RLS já retorna 0 linhas (contrato coberto por apps/admin/.../rls.test.ts).
REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.users,
  public.role_assignments,
  public.designations,
  public.consents,
  public.notifications
  FROM anon;

-- `authenticated`: aperta a DML para as policies que de fato existem. Cada REVOKE
-- abaixo é no-op comportamental (a RLS já nega), mas alinha o GRANT à policy:
--   users:         sem policy de DELETE
--   notifications: INSERT é TO service_role; sem policy de DELETE
--   consents:      sem policy de DELETE
REVOKE DELETE ON TABLE public.users, public.notifications, public.consents
  FROM authenticated;
REVOKE INSERT ON TABLE public.notifications
  FROM authenticated;

-- `public._migrations`: bookkeeping do runner (roda como owner/superuser). Não tem
-- RLS e não deve ser legível/gravável por anon nem authenticated.
REVOKE ALL PRIVILEGES ON TABLE public._migrations FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- S-03 (MÉDIO) — As partições de `admin.audit_log` estão com RLS desabilitado
-- (relrowsecurity = false, 0 policies). O acesso via tabela-pai aplica a RLS do
-- pai; o risco é acesso DIRETO à partição. `authenticated` hoje não tem GRANT nas
-- partições, mas habilitar RLS nelas garante DENY-by-default por introspecção.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  part regclass;
BEGIN
  FOR part IN
    SELECT inhrelid::regclass
    FROM pg_inherits
    WHERE inhparent = 'admin.audit_log'::regclass
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', part);
  END LOOP;
END $$;

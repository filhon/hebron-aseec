-- Migration: 0037_intranet_rls
-- P-5.7 — RLS Policies Intranet. Regras (BRAIN §3, defense in depth):
--   • super_admin      → full access em todo o schema (FOR ALL em toda tabela)
--   • diretor/conselheiro → SELECT + INSERT em announcements (autor = próprio
--                        usuário); SELECT em meeting_decisions; CRUD apenas na
--                        própria dashboard_config/briefing_preferences
--   • colaborador      → SELECT em announcements (sem INSERT); CRUD apenas na
--                        própria dashboard_config/briefing_preferences
--   • kpi_snapshots    → SELECT para todo o staff (super_admin/diretor/
--                        conselheiro/colaborador), leitura do cache de KPIs
--                        do dashboard; escrita só super_admin (cron roda como
--                        system-actor com esse papel, ver
--                        packages/db/src/system-actor.ts)
--   • briefing_preferences/kpi_snapshots não estão listadas por papel no
--     escopo do prompt (só announcements/meeting_decisions/dashboard_config);
--     aplicado por analogia — briefing_preferences segue o mesmo padrão
--     "própria linha" de dashboard_config (mesmo par de tabelas 1-linha-por-
--     usuário do Bloco A, P-5.4); kpi_snapshots segue o padrão de
--     admin.feature_flags (leitura para todo staff autenticado, escrita
--     restrita). Registrado em SESSIONS.md.
--   • demais papéis (submissor, aluno, hospede, ouvinte) → sem nenhuma policy
--                        que os inclua → zero acesso ao schema
--
-- GRANT: schema intranet nasceu depois de 0014_grants_authenticated.sql —
-- este arquivo já inclui os GRANTs (mesmo padrão de 0033_tarefas_rls.sql).

-- ===========================================================================
-- Row Level Security — DENY by default em todas as tabelas
-- ===========================================================================

-- ── announcements ────────────────────────────────────────────────────────
ALTER TABLE "intranet"."announcements" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_mutate_admin"
  ON "intranet"."announcements" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "announcements_select_staff"
  ON "intranet"."announcements" FOR SELECT TO authenticated
  USING (public.has_role('diretor', 'conselheiro', 'colaborador'));

-- Só diretor/conselheiro publicam; UPDATE/DELETE ficam só com super_admin
-- (não listados no escopo para diretor/conselheiro).
CREATE POLICY "announcements_insert_board"
  ON "intranet"."announcements" FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('diretor', 'conselheiro')
    AND "author_id" = auth.uid()
  );

-- ── meeting_decisions ────────────────────────────────────────────────────
ALTER TABLE "intranet"."meeting_decisions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_decisions_mutate_admin"
  ON "intranet"."meeting_decisions" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "meeting_decisions_select_board"
  ON "intranet"."meeting_decisions" FOR SELECT TO authenticated
  USING (public.has_role('diretor', 'conselheiro'));

-- ── dashboard_configs — uma linha por usuário ───────────────────────────
ALTER TABLE "intranet"."dashboard_configs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_configs_mutate_admin"
  ON "intranet"."dashboard_configs" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "dashboard_configs_write_own"
  ON "intranet"."dashboard_configs" FOR ALL TO authenticated
  USING (
    "user_id" = auth.uid()
    AND public.has_role('diretor', 'conselheiro', 'colaborador')
  )
  WITH CHECK (
    "user_id" = auth.uid()
    AND public.has_role('diretor', 'conselheiro', 'colaborador')
  );

-- ── briefing_preferences — uma linha por usuário (mesmo padrão acima) ───
ALTER TABLE "intranet"."briefing_preferences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "briefing_preferences_mutate_admin"
  ON "intranet"."briefing_preferences" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "briefing_preferences_write_own"
  ON "intranet"."briefing_preferences" FOR ALL TO authenticated
  USING (
    "user_id" = auth.uid()
    AND public.has_role('diretor', 'conselheiro', 'colaborador')
  )
  WITH CHECK (
    "user_id" = auth.uid()
    AND public.has_role('diretor', 'conselheiro', 'colaborador')
  );

-- ── kpi_snapshots — cache escrito por cron (system-actor = super_admin) ─
ALTER TABLE "intranet"."kpi_snapshots" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpi_snapshots_mutate_admin"
  ON "intranet"."kpi_snapshots" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "kpi_snapshots_select_staff"
  ON "intranet"."kpi_snapshots" FOR SELECT TO authenticated
  USING (public.has_role('diretor', 'conselheiro', 'colaborador'));

-- ===========================================================================
-- GRANTs — teto de permissão do role `authenticated`; RLS acima filtra por
-- linha dentro desse teto (mesma regra de 0014_grants_authenticated.sql).
-- Sem isto, "permission denied for schema intranet" antes de qualquer policy
-- ser avaliada. Toda sessão (inclusive super_admin) conecta como o mesmo
-- role Postgres `authenticated` — a distinção por papel é só RLS — então o
-- teto de GRANT precisa cobrir todo operação usada por QUALQUER policy FOR
-- ALL acima, não só as de diretor/colaborador.
-- ===========================================================================
GRANT USAGE ON SCHEMA "intranet" TO authenticated;

-- announcements/meeting_decisions não têm coluna deleted_at (sem soft-delete
-- modelado ainda) — nunca hard delete (BRAIN "imutabilidade"), por isso sem
-- GRANT DELETE nem para super_admin.
GRANT SELECT, INSERT, UPDATE          ON "intranet"."announcements"         TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "intranet"."meeting_decisions"     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "intranet"."dashboard_configs"     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "intranet"."briefing_preferences"  TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "intranet"."kpi_snapshots"         TO authenticated;

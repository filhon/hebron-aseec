-- Migration: 0022_flats_rls
-- P-7.7 — RLS Policies Flats. Habilita RLS em todo o schema "flats"
-- (deixado pendente em 0021_flats.sql) e define as políticas por papel:
--
--   super_admin          → full access em todo o schema
--   hóspede (requester)  → CRUD na própria reserva (flats.reservations) e
--                          nos dados vinculados a ela; SEM SELECT em
--                          flats.guests / flats.scoring_responses (PII e
--                          dado de saúde — mesma decisão já registrada nos
--                          comentários de schema/flats.ts em P-7.6)
--   diretor gestor       → public.has_designation('gestor') (helper de
--                          P-3.7, reaproveitado — G6.1: nenhum helper novo).
--                          SELECT em tudo + UPDATE para aprovar/rejeitar
--                          reservas e auxílios (flats.aid_requests)
--   diretor (qualquer)   → SELECT em flats.document_files (mesma regra já
--                          aplicada ao bucket "flats-documentos" em
--                          0020_storage_buckets.sql/BRAIN §5)
--   diretor/conselheiro  → NUNCA podem INSERT em flats.reservations
--                          (conflito de interesse: são também aprovadores)
--
-- Sem policy de DELETE em flats.reservations: BRAIN "Imutabilidade" —
-- cancelamento é UPDATE de status para 'cancelada', nunca hard delete.
-- Demais tabelas (dados de apoio da reserva, sem exigência de audit trail
-- própria) recebem DELETE para o hóspede dono, cobrindo edição do rascunho
-- antes da submissão final.

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE "flats"."units"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flats"."reservations"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flats"."preferred_periods"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flats"."guests"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flats"."vehicles"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flats"."scoring_responses"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flats"."aid_requests"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flats"."usage_history"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flats"."document_files"     ENABLE ROW LEVEL SECURITY;

-- ===========================================================================
-- flats.units — 2 fixas, sem rota de criação na v1 (BRAIN §6.8).
-- SELECT para todos os autenticados; mutação só super_admin.
-- ===========================================================================
CREATE POLICY "units_select_authenticated"
  ON "flats"."units" FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "units_super_admin_all"
  ON "flats"."units" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- ===========================================================================
-- flats.reservations
-- ===========================================================================
CREATE POLICY "reservations_super_admin_all"
  ON "flats"."reservations" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "reservations_select_own"
  ON "flats"."reservations" FOR SELECT TO authenticated
  USING ("requested_by" = auth.uid());

CREATE POLICY "reservations_select_gestor"
  ON "flats"."reservations" FOR SELECT TO authenticated
  USING (
    public.has_role('diretor')
    AND public.has_designation('gestor')
  );

-- Diretor/conselheiro nunca inserem — mesmo que requested_by = auth.uid()
-- (conflito de interesse: são também aprovadores/instância de governança).
CREATE POLICY "reservations_insert_own"
  ON "flats"."reservations" FOR INSERT TO authenticated
  WITH CHECK (
    "requested_by" = auth.uid()
    AND NOT public.has_role('diretor', 'conselheiro')
  );

CREATE POLICY "reservations_update_own"
  ON "flats"."reservations" FOR UPDATE TO authenticated
  USING ("requested_by" = auth.uid())
  WITH CHECK ("requested_by" = auth.uid());

CREATE POLICY "reservations_update_gestor"
  ON "flats"."reservations" FOR UPDATE TO authenticated
  USING (
    public.has_role('diretor')
    AND public.has_designation('gestor')
  )
  WITH CHECK (
    public.has_role('diretor')
    AND public.has_designation('gestor')
  );

-- ===========================================================================
-- flats.preferred_periods — sem PII; hóspede CRUD na própria reserva.
-- ===========================================================================
CREATE POLICY "preferred_periods_super_admin_all"
  ON "flats"."preferred_periods" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "preferred_periods_owner_all"
  ON "flats"."preferred_periods" FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."preferred_periods"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."preferred_periods"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  );

CREATE POLICY "preferred_periods_select_gestor"
  ON "flats"."preferred_periods" FOR SELECT TO authenticated
  USING (
    public.has_role('diretor')
    AND public.has_designation('gestor')
  );

-- ===========================================================================
-- flats.guests — PII (name, cpf, birth_date, email, phone). Hóspede grava a
-- própria (INSERT/UPDATE/DELETE), mas SEM SELECT — leitura restrita a
-- gestor de flats e super_admin (critério de aceite P-7.7, decisão já
-- registrada em schema/flats.ts P-7.6).
-- ===========================================================================
CREATE POLICY "guests_super_admin_all"
  ON "flats"."guests" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "guests_insert_own"
  ON "flats"."guests" FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."guests"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  );

CREATE POLICY "guests_update_own"
  ON "flats"."guests" FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."guests"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."guests"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  );

CREATE POLICY "guests_delete_own"
  ON "flats"."guests" FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."guests"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  );

CREATE POLICY "guests_select_gestor"
  ON "flats"."guests" FOR SELECT TO authenticated
  USING (
    public.has_role('diretor')
    AND public.has_designation('gestor')
  );

-- ===========================================================================
-- flats.vehicles — sem PII sensível fora do escopo; hóspede CRUD próprio.
-- ===========================================================================
CREATE POLICY "vehicles_super_admin_all"
  ON "flats"."vehicles" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "vehicles_owner_all"
  ON "flats"."vehicles" FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."vehicles"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."vehicles"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  );

CREATE POLICY "vehicles_select_gestor"
  ON "flats"."vehicles" FOR SELECT TO authenticated
  USING (
    public.has_role('diretor')
    AND public.has_designation('gestor')
  );

-- ===========================================================================
-- flats.scoring_responses — health_self_declared é dado sensível de saúde
-- (BRAIN §6.8 critério d). Mesma restrição de guests: hóspede grava, mas
-- SEM SELECT; gestor confirma/ajusta pontuação (BRAIN "IA no scoring",
-- PATCH-012) — por isso gestor também recebe UPDATE, não só SELECT.
-- ===========================================================================
CREATE POLICY "scoring_responses_super_admin_all"
  ON "flats"."scoring_responses" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "scoring_responses_insert_own"
  ON "flats"."scoring_responses" FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."scoring_responses"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  );

CREATE POLICY "scoring_responses_update_own"
  ON "flats"."scoring_responses" FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."scoring_responses"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."scoring_responses"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  );

CREATE POLICY "scoring_responses_delete_own"
  ON "flats"."scoring_responses" FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."scoring_responses"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  );

CREATE POLICY "scoring_responses_select_gestor"
  ON "flats"."scoring_responses" FOR SELECT TO authenticated
  USING (
    public.has_role('diretor')
    AND public.has_designation('gestor')
  );

CREATE POLICY "scoring_responses_update_gestor"
  ON "flats"."scoring_responses" FOR UPDATE TO authenticated
  USING (
    public.has_role('diretor')
    AND public.has_designation('gestor')
  )
  WITH CHECK (
    public.has_role('diretor')
    AND public.has_designation('gestor')
  );

-- ===========================================================================
-- flats.aid_requests — auxílio (diária + transporte), aprovado caso a caso
-- (BRAIN §6.8). Mesmo fluxo aprovar/rejeitar de reservations: gestor SELECT
-- + UPDATE.
-- ===========================================================================
CREATE POLICY "aid_requests_super_admin_all"
  ON "flats"."aid_requests" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "aid_requests_owner_all"
  ON "flats"."aid_requests" FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."aid_requests"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."aid_requests"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  );

CREATE POLICY "aid_requests_select_gestor"
  ON "flats"."aid_requests" FOR SELECT TO authenticated
  USING (
    public.has_role('diretor')
    AND public.has_designation('gestor')
  );

CREATE POLICY "aid_requests_update_gestor"
  ON "flats"."aid_requests" FOR UPDATE TO authenticated
  USING (
    public.has_role('diretor')
    AND public.has_designation('gestor')
  )
  WITH CHECK (
    public.has_role('diretor')
    AND public.has_designation('gestor')
  );

-- ===========================================================================
-- flats.usage_history — histórico imutável (regra dos 7 dias/12 meses,
-- BRAIN §6.8). Só leitura para o próprio hóspede; escrita restrita ao
-- gestor (gerada ao concluir a estadia) e super_admin. Sem UPDATE/DELETE —
-- mesma imutabilidade de admin.audit_log.
-- ===========================================================================
CREATE POLICY "usage_history_super_admin_all"
  ON "flats"."usage_history" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "usage_history_select_own"
  ON "flats"."usage_history" FOR SELECT TO authenticated
  USING ("user_id" = auth.uid());

CREATE POLICY "usage_history_select_gestor"
  ON "flats"."usage_history" FOR SELECT TO authenticated
  USING (
    public.has_role('diretor')
    AND public.has_designation('gestor')
  );

CREATE POLICY "usage_history_insert_gestor"
  ON "flats"."usage_history" FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('diretor')
    AND public.has_designation('gestor')
  );

-- ===========================================================================
-- flats.document_files — mesma regra do bucket "flats-documentos"
-- (0020_storage_buckets.sql / BRAIN §5): dono lê/escreve a própria pasta;
-- super_admin/diretor (qualquer, não só gestor) leem tudo.
-- ===========================================================================
CREATE POLICY "document_files_super_admin_all"
  ON "flats"."document_files" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "document_files_owner_all"
  ON "flats"."document_files" FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."document_files"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."document_files"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  );

CREATE POLICY "document_files_select_diretor"
  ON "flats"."document_files" FOR SELECT TO authenticated
  USING (public.has_role('diretor'));

-- ===========================================================================
-- GRANTs — teto de permissão do role `authenticated`; RLS acima filtra por
-- linha. Schema "flats" nasceu depois de 0014_grants_authenticated.sql,
-- então esta migration já inclui os GRANTs (mesmo padrão de
-- 0033_tarefas_rls.sql / 0020_plataforma_rls.sql).
-- ===========================================================================
GRANT USAGE ON SCHEMA "flats" TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON "flats"."units"              TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON "flats"."reservations"       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "flats"."preferred_periods"  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "flats"."guests"             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "flats"."vehicles"           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "flats"."scoring_responses"  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "flats"."aid_requests"       TO authenticated;
GRANT SELECT, INSERT                 ON "flats"."usage_history"      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "flats"."document_files"     TO authenticated;

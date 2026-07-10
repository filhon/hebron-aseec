-- Migration: 0042_intranet_meeting_decisions_select_admin
-- PATCH-017 (correção) — 0040_intranet_meeting_decisions_chair_rls.sql
-- substituiu a antiga policy FOR ALL "meeting_decisions_mutate_admin" por
-- policies separadas de INSERT/UPDATE para super_admin, mas essa policy
-- FOR ALL também dava SELECT implícito ao super_admin via sua cláusula
-- USING — perdido na troca. Sem SELECT, INSERT/UPDATE ... RETURNING falha
-- para super_admin (Postgres exige a policy de SELECT para devolver a
-- linha). meeting_decisions_select_board (diretor/conselheiro) não muda.

CREATE POLICY "meeting_decisions_select_admin"
  ON "intranet"."meeting_decisions" FOR SELECT TO authenticated
  USING (public.has_role('super_admin'));

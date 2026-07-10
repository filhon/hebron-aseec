-- Migration: 0040_intranet_meeting_decisions_chair_rls
-- PATCH-017 — quem preside a reunião (admin.meeting_sessions.chair_user_id)
-- passa a poder registrar e atualizar o status das decisões daquela sessão,
-- conforme BRAIN.md §6.6 ("presidente de sessão registra decisões").
-- super_admin continua podendo mutar qualquer decisão (débito de S-91/S-92/S-93).
--
-- Substitui "meeting_decisions_mutate_admin" (FOR ALL, só super_admin) por
-- policies separadas de INSERT/UPDATE, permissivas (combinadas com OR): a
-- policy de super_admin cobre o caso antigo, a de "chair" cobre o novo.
-- SELECT (meeting_decisions_select_board) não muda.

DROP POLICY IF EXISTS "meeting_decisions_mutate_admin" ON "intranet"."meeting_decisions";

CREATE POLICY "meeting_decisions_insert_admin"
  ON "intranet"."meeting_decisions" FOR INSERT TO authenticated
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "meeting_decisions_insert_chair"
  ON "intranet"."meeting_decisions" FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('diretor', 'conselheiro')
    AND EXISTS (
      SELECT 1 FROM "admin"."meeting_sessions" ms
      WHERE ms.id = meeting_session_id
        AND ms.chair_user_id = auth.uid()
    )
  );

CREATE POLICY "meeting_decisions_update_admin"
  ON "intranet"."meeting_decisions" FOR UPDATE TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "meeting_decisions_update_chair"
  ON "intranet"."meeting_decisions" FOR UPDATE TO authenticated
  USING (
    public.has_role('diretor', 'conselheiro')
    AND EXISTS (
      SELECT 1 FROM "admin"."meeting_sessions" ms
      WHERE ms.id = meeting_session_id
        AND ms.chair_user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role('diretor', 'conselheiro')
    AND EXISTS (
      SELECT 1 FROM "admin"."meeting_sessions" ms
      WHERE ms.id = meeting_session_id
        AND ms.chair_user_id = auth.uid()
    )
  );

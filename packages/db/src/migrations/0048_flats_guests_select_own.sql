-- Migration: 0048_flats_guests_select_own
-- P-7.9 — Integração UI ↔ Backend Flats.
--
-- 0022_flats_rls.sql (P-7.7) deu ao hóspede INSERT/UPDATE/DELETE em
-- flats.guests/flats.scoring_responses mas nenhum SELECT — leitura era
-- restrita a gestor/super_admin, sob a leitura literal do critério de
-- aceite de P-7.7 ("SELECT restrito a gestor de flats e super_admin",
-- registrada em SESSIONS.md S-128/P-7.7). Na prática isso bloqueia o
-- próprio hóspede de ler de volta os dados que ele mesmo submeteu — a tela
-- "Minhas reservas" (Bloco A, P-7.3/P-7.5b, validada pela diretoria) exige
-- guest.responsibleName/ministryType para o card de reserva.
--
-- Decisão (confirmada com Filipe): adicionar SELECT-own, mesmo padrão de
-- reservations_select_own — o hóspede lê só a própria linha
-- (reservation.requested_by = auth.uid()), nunca a de outro hóspede.
-- health_self_declared (dado sensível do critério d) fica incluído: é
-- autodeclarado pelo próprio hóspede no formulário, então ele já o
-- conhece — não há vazamento de dado de terceiro. O acesso "Meus Dados"
-- completo da LGPD (exportação, histórico de consentimento etc.) continua
-- um caminho separado, planejado para P-9.2.
-- ---------------------------------------------------------------------------

CREATE POLICY "guests_select_own"
  ON "flats"."guests" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."guests"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  );

CREATE POLICY "scoring_responses_select_own"
  ON "flats"."scoring_responses" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "flats"."reservations" r
      WHERE r.id = "flats"."scoring_responses"."reservation_id"
        AND r.requested_by = auth.uid()
    )
  );

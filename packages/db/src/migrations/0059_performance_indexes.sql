-- Migration: 0059_performance_indexes
-- P-9.3 — Índices para as consultas mais frequentes do ecossistema.
--
-- Todos os índices abaixo saíram de caminhos de consulta reais verificados no
-- código, não de suposição. O de maior impacto é o primeiro: `public.has_role()`
-- (0000_initial, redefinida em 0044) é STABLE SECURITY DEFINER e roda dentro do
-- USING de praticamente toda policy RLS dos 9 schemas —
--
--   SELECT 1 FROM public.role_assignments
--   WHERE user_id = auth.uid() AND role::text = ANY(roles) AND revoked_at IS NULL
--
-- — e `public.role_assignments` não tinha nenhum índice. Cada verificação de
-- papel (ou seja, todo acesso a linha sob RLS, em todo app) era um seq scan.
-- `resolveSession` (@hebron/auth/server) percorre as mesmas duas tabelas em
-- toda requisição autenticada.
--
-- Índices parciais (WHERE revoked_at IS NULL) porque revogação é soft (BRAIN:
-- imutabilidade — nunca DELETE): o índice indexa só as linhas vigentes, que são
-- as únicas consultadas nesses caminhos.

-- ── public.role_assignments ───────────────────────────────────────────────
-- (user_id, role) cobre exatamente o EXISTS de has_role() — index-only scan —
-- e serve resolveSession, que lê `role` filtrando por user_id.
CREATE INDEX IF NOT EXISTS "role_assignments_user_id_role_active_idx"
  ON "public"."role_assignments" USING btree ("user_id", "role")
  WHERE "revoked_at" IS NULL;

-- Fan-out de notificações por papel, sem user_id ("todos os diretores",
-- "todos os super_admin") — ~10 pontos entre apps/*/src/lib/notifications.ts.
CREATE INDEX IF NOT EXISTS "role_assignments_role_active_idx"
  ON "public"."role_assignments" USING btree ("role")
  WHERE "revoked_at" IS NULL;

-- ── public.designations ───────────────────────────────────────────────────
-- Segunda leitura de resolveSession (gestor/autorizador do usuário corrente).
CREATE INDEX IF NOT EXISTS "designations_user_id_active_idx"
  ON "public"."designations" USING btree ("user_id")
  WHERE "revoked_at" IS NULL;

-- ── intranet.announcements ────────────────────────────────────────────────
-- Feed do dashboard: ORDER BY published_at DESC, created_at DESC a cada carga.
CREATE INDEX IF NOT EXISTS "announcements_published_at_created_at_idx"
  ON "intranet"."announcements" USING btree ("published_at" DESC, "created_at" DESC);

-- ── intranet.meeting_decisions ────────────────────────────────────────────
-- Decisões carregadas por ata na tela de detalhe da reunião.
CREATE INDEX IF NOT EXISTS "meeting_decisions_meeting_session_id_idx"
  ON "intranet"."meeting_decisions" USING btree ("meeting_session_id");

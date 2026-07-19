-- Migration: 0058_data_deletion_requests
-- P-9.2 — LGPD: pedido de exclusão do titular (art. 18, VI). O titular abre um
-- "ticket" em "Meus Dados"; super_admin executa a anonimização (fluxo de
-- P-0.13, anonymizeUser) marcando "completed", ou recusa ("rejected") quando
-- há base legal para reter (ex.: obrigação contábil em curso). Sem DELETE —
-- o registro do exercício do direito é imutável.

DO $$ BEGIN
  CREATE TYPE "public"."data_deletion_request_status" AS ENUM (
    'pending',
    'completed',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "public"."data_deletion_requests" (
  "id"               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"          uuid        NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
  "status"           "public"."data_deletion_request_status" NOT NULL DEFAULT 'pending',
  "reason"           text,
  "resolved_by"      uuid        REFERENCES "public"."users"("id"),
  "resolved_at"      timestamptz,
  "resolution_notes" text,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_deletion_requests_user_id_idx
  ON "public"."data_deletion_requests" ("user_id");
CREATE INDEX IF NOT EXISTS data_deletion_requests_status_idx
  ON "public"."data_deletion_requests" ("status");

-- ---------------------------------------------------------------------------
-- Row Level Security — o titular abre e lê o próprio pedido; apenas
-- super_admin lê todos e resolve (executa/recusa). Consentimento e exclusão
-- não são delegáveis: ninguém abre pedido em nome de terceiro.
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."data_deletion_requests" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_deletion_requests_select_own"
  ON "public"."data_deletion_requests" FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "data_deletion_requests_select_admin"
  ON "public"."data_deletion_requests" FOR SELECT
  USING (public.has_role('super_admin'));

-- O titular só abre pedido para si e sempre em "pending" — nunca pode
-- inserir um pedido já marcado como resolvido.
CREATE POLICY "data_deletion_requests_insert_own"
  ON "public"."data_deletion_requests" FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Só super_admin resolve (executa a anonimização ou recusa por base legal).
CREATE POLICY "data_deletion_requests_update_admin"
  ON "public"."data_deletion_requests" FOR UPDATE
  USING     (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- Sem policy de DELETE: o registro do exercício do direito é imutável.

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "public"."data_deletion_requests" TO authenticated;

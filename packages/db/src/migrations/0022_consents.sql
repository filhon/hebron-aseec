-- Migration: 0022_consents
-- P-0.13 — LGPD: fundação (S1-03/F3-09). Consentimento granular por
-- finalidade: uma linha por (usuário, finalidade), revogável a qualquer
-- momento pelo próprio titular. Toda coleta de dado sensível (ex.: saúde
-- autodeclarada no Flats, P-7.4) deve gravar aqui um consentimento
-- específico para a finalidade "dado_saude" antes do envio do formulário.

DO $$ BEGIN
  CREATE TYPE "public"."consent_purpose" AS ENUM (
    'comunicacao',
    'newsletter',
    'dados_reserva',
    'dado_saude'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "public"."consents" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    uuid        NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
  "purpose"    "public"."consent_purpose" NOT NULL,
  "granted"    boolean     NOT NULL,
  "granted_at" timestamptz,
  "revoked_at" timestamptz,
  "source"     text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "consents_user_purpose_uniq" UNIQUE ("user_id", "purpose")
);

CREATE INDEX IF NOT EXISTS consents_user_id_idx ON "public"."consents" ("user_id");

-- ---------------------------------------------------------------------------
-- Row Level Security — o titular gerencia o próprio consentimento;
-- super_admin/diretor leem para fins de conformidade, nunca escrevem em
-- nome de terceiros (consentimento não é delegável).
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."consents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consents_select_own"
  ON "public"."consents" FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "consents_select_admin"
  ON "public"."consents" FOR SELECT
  USING (public.has_role('super_admin', 'diretor'));

CREATE POLICY "consents_insert_own"
  ON "public"."consents" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "consents_update_own"
  ON "public"."consents" FOR UPDATE
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sem policy de DELETE: revogação é `granted = false` + `revoked_at`, nunca
-- remoção de linha — mantém o histórico de quando o consentimento existiu.

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "public"."consents" TO authenticated;

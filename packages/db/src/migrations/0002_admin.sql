-- Migration: 0002_admin
-- Cria tabelas do schema admin e adiciona campos em public.users.
-- admin.audit_log é particionada por mês (RANGE em created_at).

-- ---------------------------------------------------------------------------
-- Enums no schema admin
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "admin"."audit_action" AS ENUM (
    'user.created',
    'user.updated',
    'user.suspended',
    'user.approved',
    'user.impersonated',
    'role.granted',
    'role.revoked',
    'invitation.created',
    'invitation.revoked',
    'setting.updated',
    'feature_flag.toggled',
    'email_template.updated',
    'meeting.created',
    'meeting.updated',
    'designation.assigned',
    'designation.revoked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "admin"."meeting_type" AS ENUM (
    'mensal',
    'ordinaria',
    'extraordinaria'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "admin"."meeting_status" AS ENUM (
    'scheduled',
    'in_progress',
    'concluded',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- admin.audit_log — particionada por RANGE (created_at)
-- PK composta obrigatória quando a tabela usa range partitioning.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "admin"."audit_log" (
  "id"          uuid        NOT NULL DEFAULT gen_random_uuid(),
  "actor_id"    uuid        NOT NULL REFERENCES public.users (id),
  "action"      "admin"."audit_action" NOT NULL,
  "entity"      text        NOT NULL,
  "entity_id"   uuid,
  "diff"        jsonb,
  "ip"          text,
  "user_agent"  text,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id", "created_at")
) PARTITION BY RANGE ("created_at");

-- Partições iniciais: mês corrente e dois meses seguintes.
-- A Inngest job (P-1.8) cria partições automaticamente mês a mês.
CREATE TABLE IF NOT EXISTS "admin"."audit_log_2026_05"
  PARTITION OF "admin"."audit_log"
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE IF NOT EXISTS "admin"."audit_log_2026_06"
  PARTITION OF "admin"."audit_log"
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE IF NOT EXISTS "admin"."audit_log_2026_07"
  PARTITION OF "admin"."audit_log"
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE INDEX IF NOT EXISTS audit_log_actor_id_idx
  ON "admin"."audit_log" ("actor_id");

CREATE INDEX IF NOT EXISTS audit_log_entity_entity_id_idx
  ON "admin"."audit_log" ("entity", "entity_id");

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
  ON "admin"."audit_log" ("created_at" DESC);

-- ---------------------------------------------------------------------------
-- admin.invitations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "admin"."invitations" (
  "id"          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "email"       text        NOT NULL,
  "roles"       jsonb       NOT NULL DEFAULT '[]',
  "token"       text        NOT NULL UNIQUE,
  "invited_by"  uuid        NOT NULL REFERENCES public.users (id),
  "expires_at"  timestamptz NOT NULL,
  "accepted_at" timestamptz,
  "revoked_at"  timestamptz,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invitations_email_idx
  ON "admin"."invitations" ("email");

CREATE INDEX IF NOT EXISTS invitations_token_idx
  ON "admin"."invitations" ("token");

-- ---------------------------------------------------------------------------
-- admin.email_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "admin"."email_templates" (
  "id"         uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"       text  NOT NULL UNIQUE,
  "subject"    text  NOT NULL,
  "body_html"  text  NOT NULL,
  "body_text"  text  NOT NULL,
  "variables"  jsonb NOT NULL DEFAULT '[]',
  "updated_by" uuid  REFERENCES public.users (id),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- admin.meeting_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "admin"."meeting_sessions" (
  "id"            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "date"          timestamptz NOT NULL,
  "type"          "admin"."meeting_type" NOT NULL,
  "chair_user_id" uuid        REFERENCES public.users (id),
  "status"        "admin"."meeting_status" NOT NULL DEFAULT 'scheduled',
  "notes"         text,
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  "updated_at"    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meeting_sessions_date_idx
  ON "admin"."meeting_sessions" ("date" DESC);

CREATE OR REPLACE TRIGGER meeting_sessions_updated_at
  BEFORE UPDATE ON "admin"."meeting_sessions"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- admin.feature_flags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "admin"."feature_flags" (
  "id"              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "key"             text    NOT NULL UNIQUE,
  "enabled"         boolean NOT NULL DEFAULT false,
  "description"     text,
  "rollout_percent" integer NOT NULL DEFAULT 100
    CHECK ("rollout_percent" BETWEEN 0 AND 100),
  "updated_by"  uuid        REFERENCES public.users (id),
  "updated_at"  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- admin.system_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "admin"."system_settings" (
  "id"          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "key"         text        NOT NULL UNIQUE,
  "value"       jsonb       NOT NULL,
  "label"       text        NOT NULL,
  "description" text,
  "is_public"   boolean     NOT NULL DEFAULT false,
  "updated_by"  uuid        NOT NULL REFERENCES public.users (id),
  "updated_at"  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- public.users — campos adicionais
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "phone"            text,
  ADD COLUMN IF NOT EXISTS "document_cpf"     text UNIQUE,
  ADD COLUMN IF NOT EXISTS "suspended_modules" jsonb NOT NULL DEFAULT '[]';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE "admin"."audit_log"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin"."invitations"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin"."email_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin"."meeting_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin"."feature_flags"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin"."system_settings" ENABLE ROW LEVEL SECURITY;

-- ── admin.audit_log ──────────────────────────────────────────────────────────
-- Super admin e diretor podem ler. Apenas service role insere (via funções).
CREATE POLICY "audit_log_select_admin"
  ON "admin"."audit_log" FOR SELECT
  USING (public.has_role('super_admin', 'diretor'));

CREATE POLICY "audit_log_insert_service"
  ON "admin"."audit_log" FOR INSERT
  WITH CHECK (true);

-- Audit log é imutável: sem UPDATE, sem DELETE.

-- ── admin.invitations ────────────────────────────────────────────────────────
CREATE POLICY "invitations_select_admin"
  ON "admin"."invitations" FOR SELECT
  USING (public.has_role('super_admin', 'diretor'));

CREATE POLICY "invitations_write_super_admin"
  ON "admin"."invitations" FOR ALL
  USING    (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- Token público lido durante o fluxo de aceite (sem autenticação ainda).
CREATE POLICY "invitations_select_by_token"
  ON "admin"."invitations" FOR SELECT
  USING (true);

-- ── admin.email_templates ────────────────────────────────────────────────────
CREATE POLICY "email_templates_select_admin"
  ON "admin"."email_templates" FOR SELECT
  USING (public.has_role('super_admin', 'diretor'));

CREATE POLICY "email_templates_write_super_admin"
  ON "admin"."email_templates" FOR ALL
  USING    (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- ── admin.meeting_sessions ───────────────────────────────────────────────────
-- Conselheiros e acima podem ler sessões.
CREATE POLICY "meeting_sessions_select_board"
  ON "admin"."meeting_sessions" FOR SELECT
  USING (public.has_role('super_admin', 'diretor', 'conselheiro'));

CREATE POLICY "meeting_sessions_write_admin"
  ON "admin"."meeting_sessions" FOR ALL
  USING    (public.has_role('super_admin', 'diretor'))
  WITH CHECK (public.has_role('super_admin', 'diretor'));

-- ── admin.feature_flags ──────────────────────────────────────────────────────
-- Flags públicas legíveis por qualquer autenticado; gestão só super_admin.
CREATE POLICY "feature_flags_select_authenticated"
  ON "admin"."feature_flags" FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "feature_flags_write_super_admin"
  ON "admin"."feature_flags" FOR ALL
  USING    (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- ── admin.system_settings ────────────────────────────────────────────────────
-- Configurações públicas legíveis por qualquer autenticado; privadas só admin.
CREATE POLICY "system_settings_select_public"
  ON "admin"."system_settings" FOR SELECT
  USING ("is_public" = true AND auth.uid() IS NOT NULL);

CREATE POLICY "system_settings_select_admin"
  ON "admin"."system_settings" FOR SELECT
  USING (public.has_role('super_admin', 'diretor'));

CREATE POLICY "system_settings_write_super_admin"
  ON "admin"."system_settings" FOR ALL
  USING    (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

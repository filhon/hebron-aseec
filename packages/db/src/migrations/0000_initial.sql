-- Migration: 0000_initial
-- Creates module schemas, shared enums, and public base tables with RLS.

-- ---------------------------------------------------------------------------
-- Module schemas
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS "admin";
CREATE SCHEMA IF NOT EXISTS "projetos";
CREATE SCHEMA IF NOT EXISTS "plataforma";
CREATE SCHEMA IF NOT EXISTS "radio";
CREATE SCHEMA IF NOT EXISTS "financeiro";
CREATE SCHEMA IF NOT EXISTS "intranet";
CREATE SCHEMA IF NOT EXISTS "documentos";
CREATE SCHEMA IF NOT EXISTS "flats";
CREATE SCHEMA IF NOT EXISTS "tarefas";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "public"."role" AS ENUM (
    'super_admin',
    'diretor',
    'conselheiro',
    'colaborador',
    'submissor',
    'aluno',
    'hospede',
    'ouvinte'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."designation_type" AS ENUM ('gestor', 'autorizador');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- public.users — mirror of auth.users (kept in sync via trigger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."users" (
  "id"           uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  "email"        text        NOT NULL UNIQUE,
  "full_name"    text,
  "avatar_url"   text,
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  "updated_at"   timestamptz NOT NULL DEFAULT now(),
  "suspended_at" timestamptz
);

-- Trigger: keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: sync new auth.users rows into public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- public.role_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."role_assignments" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  "role"       "public"."role" NOT NULL,
  "scope"      text        NOT NULL DEFAULT 'global',
  "scope_id"   uuid,
  "granted_by" uuid        REFERENCES public.users (id),
  "granted_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS role_assignments_user_id_idx ON public.role_assignments (user_id);
CREATE INDEX IF NOT EXISTS role_assignments_role_idx    ON public.role_assignments (role);

-- ---------------------------------------------------------------------------
-- public.designations — gestor / autorizador (configuration, not a role)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."designations" (
  "id"          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "type"        "public"."designation_type" NOT NULL,
  "user_id"     uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  "assigned_by" uuid        REFERENCES public.users (id),
  "assigned_at" timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- public.notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."notifications" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  "title"      text        NOT NULL,
  "body"       text,
  "read_at"    timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — DENY by default, explicit USING + WITH CHECK
-- ---------------------------------------------------------------------------
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;

-- Helper: check if the calling user has one of the given roles
CREATE OR REPLACE FUNCTION public.has_role(VARIADIC roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.role_assignments
    WHERE  user_id = auth.uid()
      AND  role::text = ANY(roles)
  );
$$;

-- ── public.users ────────────────────────────────────────────────────────────
-- Users may read their own row; admins may read all.
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_select_admin"
  ON public.users FOR SELECT
  USING (public.has_role('super_admin', 'diretor'));

-- Users may update their own non-sensitive fields.
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING    (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert is performed by the trigger (SECURITY DEFINER); service role only.
CREATE POLICY "users_insert_service"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── public.role_assignments ─────────────────────────────────────────────────
CREATE POLICY "role_assignments_select_own"
  ON public.role_assignments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "role_assignments_select_admin"
  ON public.role_assignments FOR SELECT
  USING (public.has_role('super_admin', 'diretor'));

-- Only super_admin may grant or revoke roles.
CREATE POLICY "role_assignments_write_super_admin"
  ON public.role_assignments FOR ALL
  USING    (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- ── public.designations ──────────────────────────────────────────────────────
CREATE POLICY "designations_select_admin"
  ON public.designations FOR SELECT
  USING (public.has_role('super_admin', 'diretor'));

CREATE POLICY "designations_write_super_admin"
  ON public.designations FOR ALL
  USING    (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- ── public.notifications ─────────────────────────────────────────────────────
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING    (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role / Edge Functions insert notifications on behalf of users.
CREATE POLICY "notifications_insert_service"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Migration: 0015_user_status
-- P-1.26 — Onboarding: convite, auto-signup com aprovação e MFA.
--
-- O órfão O-1 (S1-05/F2-A3): auto-signup não existe e "pending_approval"
-- nunca foi derivável do schema, então a UI de aprovação (S-16) foi omitida.
-- Esta migration introduce a coluna que fecha essa lacuna.
--
-- Modelagem: status é separado de suspended_modules — suspended_modules
-- governa o acesso de uma conta JÁ ATIVA (granular por módulo); status
-- governa a ENTRADA no ecossistema. Convite e criação manual (Admin) já são
-- pré-vetados por quem convida/cria, então nascem "active"; apenas o
-- auto-signup nasce "pending_approval", sinalizado via
-- raw_user_meta_data->>'signup_source' no momento de auth.signUp().

DO $$ BEGIN
  CREATE TYPE "public"."user_status" AS ENUM (
    'pending_approval',
    'active',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "status" "public"."user_status" NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS users_status_idx ON "public"."users" ("status");

-- ---------------------------------------------------------------------------
-- handle_new_user() — decide o status de entrada a partir do metadata que o
-- próprio fluxo de signUp() envia. Convite/criação manual não enviam
-- signup_source, então caem no default ('active') da coluna.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, status)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    CASE
      WHEN NEW.raw_user_meta_data ->> 'signup_source' = 'self'
        THEN 'pending_approval'::public.user_status
      ELSE 'active'::public.user_status
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Protege a coluna status contra auto-aprovação: users_update_own (RLS)
-- permite que o próprio usuário atualize sua linha, mas não deve permitir que
-- ele mesmo mude pending_approval -> active. Só super_admin (via
-- approveSignup/rejectSignup) pode transicionar o status após a criação da
-- conta.
--
-- auth.uid() IS NULL identifica a conexão direta que os apps usam para todo
-- o resto de suas mutações (Server Actions rodam sobre DATABASE_URL via
-- postgres.js/drizzle, fora do contexto PostgREST/JWT — decisão B ainda não
-- cobre as escritas, só as leituras planejadas para RLS real). Sem essa
-- distinção, approveSignup/rejectSignup (que corre por esse mesmo caminho)
-- seria bloqueada pelo próprio trigger que deveria proteger só o caminho
-- direto do usuário via PostgREST/supabase-js autenticado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_user_status_column()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role('super_admin') THEN
    RAISE EXCEPTION 'Apenas super_admin pode alterar o status de aprovação de um usuário.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_protect_status ON "public"."users";
CREATE TRIGGER users_protect_status
  BEFORE UPDATE ON "public"."users"
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_status_column();

-- ---------------------------------------------------------------------------
-- Bootstrap de instituição durante o auto-signup: o usuário ainda não tem
-- nenhum papel (só é atribuído "submissor" na aprovação), então as policies
-- normais de projetos.organizations/organization_members (que exigem papel)
-- não o deixariam criar nem entrar em uma organização. Estas duas funções
-- SECURITY DEFINER abrem uma janela estreita: só operam enquanto o próprio
-- usuário (auth.uid()) está com status = 'pending_approval', e só tocam a
-- própria linha de membership — nunca um terceiro.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_organizations_for_signup(_query text)
RETURNS TABLE(id uuid, nome text, cnpj text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, projetos AS $$
  SELECT o.id, o.nome, o.cnpj
  FROM projetos.organizations o
  WHERE (SELECT status FROM public.users WHERE id = auth.uid()) = 'pending_approval'
    AND (o.nome ILIKE '%' || _query || '%' OR o.cnpj = _query)
  ORDER BY o.nome
  LIMIT 10;
$$;

CREATE OR REPLACE FUNCTION public.self_signup_join_organization(
  _existing_org_id uuid,
  _new_org_nome text,
  _new_org_cnpj text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, projetos AS $$
DECLARE
  _status public.user_status;
  _org_id uuid;
BEGIN
  SELECT status INTO _status FROM public.users WHERE id = auth.uid();
  IF _status IS DISTINCT FROM 'pending_approval' THEN
    RAISE EXCEPTION 'Só é possível vincular instituição durante o cadastro pendente de aprovação.';
  END IF;

  IF _existing_org_id IS NOT NULL THEN
    SELECT o.id INTO _org_id FROM projetos.organizations o WHERE o.id = _existing_org_id;
    IF _org_id IS NULL THEN
      RAISE EXCEPTION 'Instituição não encontrada.';
    END IF;
  ELSE
    IF _new_org_nome IS NULL OR length(trim(_new_org_nome)) = 0 THEN
      RAISE EXCEPTION 'Informe o nome da instituição.';
    END IF;
    INSERT INTO projetos.organizations (nome, cnpj, created_by)
    VALUES (trim(_new_org_nome), NULLIF(trim(_new_org_cnpj), ''), auth.uid())
    RETURNING id INTO _org_id;
  END IF;

  INSERT INTO projetos.organization_members (organization_id, user_id)
  VALUES (_org_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN _org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_organizations_for_signup(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.self_signup_join_organization(uuid, text, text) TO authenticated;

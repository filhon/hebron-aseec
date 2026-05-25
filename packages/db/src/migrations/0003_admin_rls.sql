-- Migration: 0003_admin_rls
-- Revisa policies RLS do schema admin para aplicar DENY-by-default estrito.
--
-- Mudanças em relação a 0002_admin.sql:
--   • admin.audit_log : restringe leitura a super_admin apenas (remove diretor).
--   • admin.invitations: remove política pública por token; substitui por
--     política de email-match para usuários autenticados.
--     Fluxo de aceite sem autenticação → Server Action usa service role (bypassa RLS).

-- ---------------------------------------------------------------------------
-- admin.audit_log — somente super_admin pode ler
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_log_select_admin" ON "admin"."audit_log";

CREATE POLICY "audit_log_select_super_admin"
  ON "admin"."audit_log" FOR SELECT
  USING (public.has_role('super_admin'));

-- audit_log_insert_service permanece: escrita via funções SECURITY DEFINER.
-- Sem UPDATE, sem DELETE: imutabilidade garantida pela ausência de políticas.

-- ---------------------------------------------------------------------------
-- admin.invitations — super_admin tem acesso total (FOR ALL, definido em 0002).
-- Usuário autenticado cujo email coincide com o convite pode SELECT para aceitar.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "invitations_select_admin"    ON "admin"."invitations";
DROP POLICY IF EXISTS "invitations_select_by_token" ON "admin"."invitations";

-- Permite que o convidado autenticado leia apenas o convite destinado ao seu email.
-- auth.jwt() ->> 'email' lê o email do JWT do Supabase Auth.
CREATE POLICY "invitations_select_own_email"
  ON "admin"."invitations" FOR SELECT
  USING (email = (auth.jwt() ->> 'email'));

-- invitations_write_super_admin (FOR ALL, de 0002) já cobre SELECT + mutações
-- para super_admin; nenhuma policy adicional é necessária para esse papel.

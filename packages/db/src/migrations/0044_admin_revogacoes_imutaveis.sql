-- Migration: 0044_admin_revogacoes_imutaveis
-- PATCH-021 — revogação de papel/designação deixa de ser hard delete e passa
-- a ser UPDATE imutável (revoked_at/revoked_by/revocation_reason), alinhado
-- ao princípio de imutabilidade do ecossistema (BRAIN.md).
--
-- Crítico: public.has_role() é usada em ~290 policies de RLS em todos os
-- schemas do monorepo e lia public.role_assignments sem filtrar linhas
-- revogadas. Sem este CREATE OR REPLACE, revogar um papel deixaria de
-- remover a linha mas NÃO removeria o acesso em lugar nenhum do sistema —
-- pior que o hard delete anterior. packages/auth/src/server.ts (resolveSession,
-- usada por toda Server Action) recebeu o mesmo filtro na camada de aplicação.

ALTER TABLE public.role_assignments
  ADD COLUMN IF NOT EXISTS revoked_at        timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by        uuid REFERENCES public.users (id),
  ADD COLUMN IF NOT EXISTS revocation_reason text;

ALTER TABLE public.designations
  ADD COLUMN IF NOT EXISTS revoked_at        timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by        uuid REFERENCES public.users (id),
  ADD COLUMN IF NOT EXISTS revocation_reason text;

CREATE INDEX IF NOT EXISTS role_assignments_revoked_at_idx ON public.role_assignments (revoked_at);
CREATE INDEX IF NOT EXISTS designations_revoked_at_idx ON public.designations (revoked_at);

CREATE OR REPLACE FUNCTION public.has_role(VARIADIC roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.role_assignments
    WHERE  user_id = auth.uid()
      AND  role::text = ANY(roles)
      AND  revoked_at IS NULL
  );
$$;

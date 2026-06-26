-- Migration: 0009_financeiro_rls
-- Refina as políticas RLS do schema financeiro (P-3.7):
--   • Adiciona helper public.has_designation para verificar designação do usuário
--   • Colaborador financeiro: CRUD em transactions, payables, receivables
--   • batch_approvals UPDATE: restringe a super_admin e diretor com designation='gestor'
--   • projetos.payment_schedules SELECT: estende submissor a todos os membros da organização
--
-- Papéis cobertos:
--   super_admin     → full CRUD em financeiro.*
--   diretor gestor  → SELECT em tudo + UPDATE em batch_approvals (aprovação do lote)
--   diretor autorizador → SELECT em tudo (autorização enforced no Server Action)
--   colaborador     → CRUD em transactions, payables, receivables; SELECT nos demais
--   submissor       → SELECT em projetos.payment_schedules da própria organização
--   demais          → sem acesso ao schema financeiro

-- ---------------------------------------------------------------------------
-- Helper: verificar a designation do usuário corrente
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_designation(d text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.designations
    WHERE user_id = auth.uid()
      AND type::text = d
  );
$$;

-- ===========================================================================
-- financeiro.transactions
-- INSERT: estendido para colaborador.
-- UPDATE e DELETE: proibidos pelo trigger financeiro.forbid_transaction_mutation;
-- nenhuma policy é criada para essas operações (deny-by-default + trigger).
-- ===========================================================================
DROP POLICY IF EXISTS "transactions_insert_admin" ON "financeiro"."transactions";

CREATE POLICY "transactions_insert_collab"
  ON "financeiro"."transactions" FOR INSERT TO authenticated
  WITH CHECK (public.has_role('super_admin', 'colaborador'));

-- ===========================================================================
-- financeiro.receivables
-- CRUD para colaborador (soft-delete via UPDATE em deleted_at).
-- ===========================================================================
DROP POLICY IF EXISTS "receivables_mutate_admin" ON "financeiro"."receivables";

CREATE POLICY "receivables_insert_collab"
  ON "financeiro"."receivables" FOR INSERT TO authenticated
  WITH CHECK (public.has_role('super_admin', 'colaborador'));

-- UPDATE cobre atualizações de status, soft-delete (deleted_at) e edições gerais.
CREATE POLICY "receivables_update_collab"
  ON "financeiro"."receivables" FOR UPDATE TO authenticated
  USING (
    "deleted_at" IS NULL
    AND public.has_role('super_admin', 'colaborador')
  )
  WITH CHECK (public.has_role('super_admin', 'colaborador'));

-- ===========================================================================
-- financeiro.payables
-- UPDATE expandido para colaborador: gestão do ciclo de vida (rascunho → pago).
-- A separação aprovação (gestor) / autorização (autorizador ≠ gestor) é
-- enforced no Server Action — o RLS apenas limita o conjunto de atores.
-- ===========================================================================
DROP POLICY IF EXISTS "payables_update_approvers" ON "financeiro"."payables";

CREATE POLICY "payables_update_staff"
  ON "financeiro"."payables" FOR UPDATE TO authenticated
  USING (
    "deleted_at" IS NULL
    AND public.has_role('super_admin', 'diretor', 'colaborador')
  )
  WITH CHECK (public.has_role('super_admin', 'diretor', 'colaborador'));

-- ===========================================================================
-- financeiro.batch_approvals
-- UPDATE restrito a super_admin e diretor com designation='gestor'.
-- Diretor autorizador: somente SELECT (coberto pela policy existente de SELECT).
-- A regra approved_by ≠ authorized_by é enforced no Server Action.
-- ===========================================================================
DROP POLICY IF EXISTS "batch_approvals_update_approvers" ON "financeiro"."batch_approvals";

CREATE POLICY "batch_approvals_update_gestor"
  ON "financeiro"."batch_approvals" FOR UPDATE TO authenticated
  USING (
    public.has_role('super_admin')
    OR (
      public.has_role('diretor')
      AND public.has_designation('gestor')
    )
  )
  WITH CHECK (
    public.has_role('super_admin')
    OR (
      public.has_role('diretor')
      AND public.has_designation('gestor')
    )
  );

-- ===========================================================================
-- projetos.payment_schedules
-- Substitui a policy "payment_schedules_select_own_or_admin" de 0007_projetos.sql.
-- Submissor passa a ver as parcelas de qualquer projeto da sua organização
-- (antes: apenas projetos em que era o submitter direto).
-- ===========================================================================
DROP POLICY IF EXISTS "payment_schedules_select_own_or_admin" ON "projetos"."payment_schedules";

CREATE POLICY "payment_schedules_select_own_or_admin"
  ON "projetos"."payment_schedules" FOR SELECT
  USING (
    public.has_role('super_admin', 'diretor', 'conselheiro')
    OR EXISTS (
      SELECT 1 FROM "projetos"."projects" p
      WHERE p.id = "projetos"."payment_schedules"."project_id"
        AND p.deleted_at IS NULL
        AND (
          p.submitter_id = auth.uid()
          OR (
            p.organization_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM "projetos"."organization_members" om
              WHERE om.organization_id = p.organization_id
                AND om.user_id = auth.uid()
            )
          )
        )
    )
  );

-- Migration: 0070_financeiro_rls_alinhada
-- P-3.7b (CORRETIVO) — alinha a RLS de escrita de financeiro.accounts,
-- categories, budgets e budget_items ao gate de aplicação real, e concede o
-- UPDATE que financeiro.bank_imports nunca teve. Ref: S-157/S-63, G6.2,
-- CLAUDE.md ("Defense in depth: RBAC + RLS sempre, nunca apenas um").
--
-- As quatro tabelas abaixo tinham uma única policy "FOR ALL ... USING
-- (has_role('super_admin'))" cobrindo INSERT/UPDATE/DELETE. As actions reais
-- (createBankAccount = colaboradorAction; createCategory/updateCategory/
-- createBudget/updateBudget = diretorAction) rodavam sob withSystemRole só
-- para contornar essa policy — o comentário no próprio código (accounts.ts,
-- categories.ts) documentava o débito. Substituímos "FOR ALL" por policies
-- por operação: INSERT/UPDATE alinhados ao gate real, DELETE mantido em
-- super_admin (deleteCategory/deleteBudget já são superAdminAction, e não
-- havia UPDATE/DELETE de conta bancária em nenhuma action — nada muda ali
-- além de separar a policy por operação).

-- ---------------------------------------------------------------------------
-- 1. financeiro.accounts — INSERT estendido a colaborador/diretor
--    (createBankAccount = colaboradorAction). Sem action de UPDATE/DELETE
--    hoje; mantidos restritos a super_admin.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "accounts_mutate_admin" ON "financeiro"."accounts";
DROP POLICY IF EXISTS "accounts_insert_staff" ON "financeiro"."accounts";
DROP POLICY IF EXISTS "accounts_update_admin" ON "financeiro"."accounts";
DROP POLICY IF EXISTS "accounts_delete_admin" ON "financeiro"."accounts";

CREATE POLICY "accounts_insert_staff"
  ON "financeiro"."accounts" FOR INSERT TO authenticated
  WITH CHECK (public.has_role('super_admin', 'diretor', 'colaborador'));

CREATE POLICY "accounts_update_admin"
  ON "financeiro"."accounts" FOR UPDATE TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "accounts_delete_admin"
  ON "financeiro"."accounts" FOR DELETE TO authenticated
  USING (public.has_role('super_admin'));

-- ---------------------------------------------------------------------------
-- 2. financeiro.categories — INSERT/UPDATE estendidos a diretor
--    (createCategory/updateCategory = diretorAction). DELETE mantido em
--    super_admin (deleteCategory = superAdminAction).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "categories_mutate_admin" ON "financeiro"."categories";
DROP POLICY IF EXISTS "categories_insert_staff" ON "financeiro"."categories";
DROP POLICY IF EXISTS "categories_update_staff" ON "financeiro"."categories";
DROP POLICY IF EXISTS "categories_delete_admin" ON "financeiro"."categories";

CREATE POLICY "categories_insert_staff"
  ON "financeiro"."categories" FOR INSERT TO authenticated
  WITH CHECK (public.has_role('super_admin', 'diretor'));

CREATE POLICY "categories_update_staff"
  ON "financeiro"."categories" FOR UPDATE TO authenticated
  USING (public.has_role('super_admin', 'diretor'))
  WITH CHECK (public.has_role('super_admin', 'diretor'));

CREATE POLICY "categories_delete_admin"
  ON "financeiro"."categories" FOR DELETE TO authenticated
  USING (public.has_role('super_admin'));

-- ---------------------------------------------------------------------------
-- 3. financeiro.budgets — INSERT/UPDATE estendidos a diretor
--    (createBudget/updateBudget = diretorAction). DELETE mantido em
--    super_admin (deleteBudget = superAdminAction).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "budgets_mutate_admin" ON "financeiro"."budgets";
DROP POLICY IF EXISTS "budgets_insert_staff" ON "financeiro"."budgets";
DROP POLICY IF EXISTS "budgets_update_staff" ON "financeiro"."budgets";
DROP POLICY IF EXISTS "budgets_delete_admin" ON "financeiro"."budgets";

CREATE POLICY "budgets_insert_staff"
  ON "financeiro"."budgets" FOR INSERT TO authenticated
  WITH CHECK (public.has_role('super_admin', 'diretor'));

CREATE POLICY "budgets_update_staff"
  ON "financeiro"."budgets" FOR UPDATE TO authenticated
  USING (public.has_role('super_admin', 'diretor'))
  WITH CHECK (public.has_role('super_admin', 'diretor'));

CREATE POLICY "budgets_delete_admin"
  ON "financeiro"."budgets" FOR DELETE TO authenticated
  USING (public.has_role('super_admin'));

-- ---------------------------------------------------------------------------
-- 4. financeiro.budget_items — INSERT estendido a diretor (createBudget
--    insere as linhas na mesma transação). DELETE mantido em super_admin —
--    cobre o cascade de deleteBudget (superAdminAction), único caminho que
--    remove linhas hoje; sem action de UPDATE direta.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "budget_items_mutate_admin" ON "financeiro"."budget_items";
DROP POLICY IF EXISTS "budget_items_insert_staff" ON "financeiro"."budget_items";
DROP POLICY IF EXISTS "budget_items_update_admin" ON "financeiro"."budget_items";
DROP POLICY IF EXISTS "budget_items_delete_admin" ON "financeiro"."budget_items";

CREATE POLICY "budget_items_insert_staff"
  ON "financeiro"."budget_items" FOR INSERT TO authenticated
  WITH CHECK (public.has_role('super_admin', 'diretor'));

CREATE POLICY "budget_items_update_admin"
  ON "financeiro"."budget_items" FOR UPDATE TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "budget_items_delete_admin"
  ON "financeiro"."budget_items" FOR DELETE TO authenticated
  USING (public.has_role('super_admin'));

-- ---------------------------------------------------------------------------
-- 5. financeiro.bank_imports — GRANT UPDATE ausente desde 0014 (só SELECT,
--    INSERT) e nenhuma policy de UPDATE em 0010. autoMatchImport,
--    reconcileRow e confirmImport gravam matched_count sob withSystemRole
--    por não haver caminho algum, nem para super_admin, via authenticated.
-- ---------------------------------------------------------------------------
GRANT UPDATE ON "financeiro"."bank_imports" TO authenticated;

DROP POLICY IF EXISTS "bank_imports_update_staff" ON "financeiro"."bank_imports";

CREATE POLICY "bank_imports_update_staff"
  ON "financeiro"."bank_imports" FOR UPDATE TO authenticated
  USING (public.has_role('super_admin', 'colaborador'))
  WITH CHECK (public.has_role('super_admin', 'colaborador'));

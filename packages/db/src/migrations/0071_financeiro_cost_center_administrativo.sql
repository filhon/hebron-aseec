-- Migration: 0071_financeiro_cost_center_administrativo
-- P-3.11b (CORRETIVO) — saída (a) confirmada com o Filipe: centro de custo
-- administrativo passa a existir. Até aqui financeiro.cost_centers.project_id
-- era NOT NULL UNIQUE — um centro de custo só nascia de um projeto aprovado
-- (onProjectApproved, packages/db/src/projetos-approval.ts). Aluguel, folha,
-- energia, manutenção não tinham onde ser lançados, e checkBudgetAlert
-- (lib/notifications.ts) só conseguia disparar sobre gasto de projeto — a
-- fatia do orçamento com MENOS risco de estouro silencioso, porque já passa
-- por votação/homologação/parcelas. Ref: PROMPTS.md P-3.11b, BRAIN.md §6.5,
-- S-69.

-- ---------------------------------------------------------------------------
-- 1. project_id vira opcional. A UNIQUE por projeto continua valendo (um
--    projeto aprovado não pode gerar dois centros de custo — onProjectApproved
--    depende disso para sua idempotência via onConflictDoNothing) — mas como
--    índice único PARCIAL, não mais como constraint de coluna: um UNIQUE
--    comum já permitiria múltiplos NULL (semântica padrão do Postgres), mas o
--    índice parcial é explícito sobre a intenção — só linhas COM projeto
--    entram na unicidade.
-- ---------------------------------------------------------------------------
ALTER TABLE "financeiro"."cost_centers"
  ALTER COLUMN "project_id" DROP NOT NULL;

ALTER TABLE "financeiro"."cost_centers"
  DROP CONSTRAINT IF EXISTS "cost_centers_project_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "cost_centers_project_id_uniq"
  ON "financeiro"."cost_centers" ("project_id")
  WHERE "project_id" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. RLS — cost_centers ainda tinha a policy "FOR ALL ... super_admin" de
--    0010 (não coberta pelo alinhamento de 0070, que só tocou accounts/
--    categories/budgets/budget_items). createCostCenter/updateCostCenter
--    (apps/financeiro/src/actions/cost-centers.ts) são diretorAction — sem
--    este ajuste, um diretor passaria no gate de aplicação e falharia na
--    RLS. Mesmo padrão de 0070: INSERT/UPDATE alinhados ao gate real
--    (diretor+super_admin), sem action de DELETE hoje — mantido restrito a
--    super_admin por padrão de defesa em profundidade.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "cost_centers_mutate_admin" ON "financeiro"."cost_centers";
DROP POLICY IF EXISTS "cost_centers_insert_staff" ON "financeiro"."cost_centers";
DROP POLICY IF EXISTS "cost_centers_update_staff" ON "financeiro"."cost_centers";
DROP POLICY IF EXISTS "cost_centers_delete_admin" ON "financeiro"."cost_centers";

CREATE POLICY "cost_centers_insert_staff"
  ON "financeiro"."cost_centers" FOR INSERT TO authenticated
  WITH CHECK (public.has_role('super_admin', 'diretor'));

CREATE POLICY "cost_centers_update_staff"
  ON "financeiro"."cost_centers" FOR UPDATE TO authenticated
  USING (public.has_role('super_admin', 'diretor'))
  WITH CHECK (public.has_role('super_admin', 'diretor'));

CREATE POLICY "cost_centers_delete_admin"
  ON "financeiro"."cost_centers" FOR DELETE TO authenticated
  USING (public.has_role('super_admin'));

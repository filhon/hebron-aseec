-- Migration: 0072_financeiro_cost_center_audit_actions
-- P-3.11b (CORRETIVO) — createCostCenter/updateCostCenter (centro de custo
-- administrativo, sem projeto associado) precisam de valores próprios no
-- enum para o audit trail (G6.3). Arquivo separado de 0071: convenção deste
-- monorepo em toda migration que toca audit_action — ALTER TYPE ... ADD
-- VALUE nunca é combinado com outro DDL no mesmo arquivo (ver 0067/0029/0030
-- para o precedente explícito). ALTER TYPE ... ADD VALUE é não-transacional
-- — o runner (packages/db/src/migrate.ts) detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.cost_center.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.cost_center.updated';

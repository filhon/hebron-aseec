-- Migration: 0018_organization_budget_audit_actions
-- P-3.8b — novas ações de audit para o CRUD de financeiro.organization_budgets.
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.organization_budget.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.organization_budget.updated';

-- Migration: 0012_audit_action_modules
-- O enum admin.audit_action nunca recebeu os valores dos módulos Projetos e
-- Financeiro (F3-02): logProjectAudit/logFinanceiroAudit gravam ações que não
-- existem no tipo do banco, então todo INSERT falha silenciosamente (Projetos)
-- ou propaga erro (Financeiro).
-- Lista canônica: admin.ts:44-59 (Projetos, TS já continha os valores desde
-- P-2.8 mas a migration correspondente nunca foi criada) + os 20 valores de
-- FinanceiroAuditAction (apps/financeiro/src/lib/audit.ts).
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

-- Projetos
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'project.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'project.updated';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'project.submitted';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'project.stage_transition';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'project.deleted';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'vote.cast';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'vote.panic';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'evaluation.assigned';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'evaluation.submitted';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'contestation.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'report.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'report.submitted';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'organization.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'organization.updated';

-- Financeiro
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.payable.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.payable.cancelled';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.payable.approved';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.payable.authorized';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.payable.paid';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.receivable.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.receivable.received';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.transaction.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.transaction.reversed';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.import.confirmed';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.import.row.reconciled';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.batch.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.batch.approved';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.batch.authorized';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.category.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.category.updated';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.category.deleted';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.budget.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.budget.updated';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.budget.deleted';

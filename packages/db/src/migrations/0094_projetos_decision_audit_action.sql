-- Migration: 0094_projetos_decision_audit_action
-- P-2.15 (CORRETIVO) — a action `registerProjectDecision` audita com
-- 'project.decision_registered', valor novo do enum admin.audit_action. Sem
-- ele a auditoria falha em runtime (mesmo padrão de
-- 0092_projetos_vote_changed_audit_action.sql). ALTER TYPE ... ADD VALUE é
-- não-transacional — o runner (packages/db/src/migrate.ts) já detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'project.decision_registered';

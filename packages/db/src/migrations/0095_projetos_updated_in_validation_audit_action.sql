-- Migration: 0095_projetos_updated_in_validation_audit_action
-- P-2.16 (CORRETIVO) — a action `updateProjectInValidation` audita com
-- 'project.updated_in_validation', valor novo do enum admin.audit_action. Sem
-- ele a auditoria falha em runtime (mesmo padrão de
-- 0094_projetos_decision_audit_action.sql). ALTER TYPE ... ADD VALUE é
-- não-transacional — o runner (packages/db/src/migrate.ts) já detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'project.updated_in_validation';

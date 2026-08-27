-- Migration: 0097_projetos_submitter_contestation_created_audit_action
-- P-2.17 (CORRETIVO) — a action `createSubmitterContestation` audita com
-- 'submitter_contestation.created', valor novo do enum admin.audit_action.
-- Sem ele a auditoria falha em runtime (mesmo padrão de
-- 0095_projetos_updated_in_validation_audit_action.sql). ALTER TYPE ... ADD
-- VALUE é não-transacional — o runner (packages/db/src/migrate.ts) já
-- detecta isso. Isolado em arquivo próprio por convenção do monorepo
-- (PATCH-028) — mesma razão de não combinar com 0098 abaixo.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'submitter_contestation.created';

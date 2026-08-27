-- Migration: 0098_projetos_submitter_contestation_resolved_audit_action
-- P-2.17 (CORRETIVO) — a action `resolveSubmitterContestation` audita com
-- 'submitter_contestation.resolved', valor novo do enum admin.audit_action.
-- Isolado do ALTER TYPE de 0097 por convenção do monorepo (PATCH-028): cada
-- valor novo do enum em seu próprio arquivo não-transacional.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'submitter_contestation.resolved';

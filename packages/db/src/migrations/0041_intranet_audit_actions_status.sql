-- Migration: 0041_intranet_audit_actions_status
-- PATCH-017 — updateMeetingDecisionStatus é uma mutação auditável (G6.3) que
-- ainda não tinha valor correspondente em admin.audit_action.
--
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'meeting_decision.status_updated';

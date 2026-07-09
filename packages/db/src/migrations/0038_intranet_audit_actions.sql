-- Migration: 0038_intranet_audit_actions
-- P-5.8 — Server Actions Intranet (G6.3): CRUD de anúncios, decisões de
-- reunião e configuração de dashboard são mutações auditáveis que ainda não
-- tinham valor correspondente em admin.audit_action.
--
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'announcement.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'announcement.updated';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'meeting_decision.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'dashboard_config.updated';

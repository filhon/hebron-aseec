-- Migration: 0057_lgpd_data_access_audit_actions
-- P-9.2 — LGPD: superfícies de titular ("Meus Dados") e log de acesso a
-- dados pessoais. Novas ações de audit (G6.3). ALTER TYPE ... ADD VALUE é
-- não-transacional — o runner (migrate.ts) detecta isso pelo padrão e roda
-- fora de transação.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'data.exported';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'data.deletion_requested';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'data.deletion_executed';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'data.deletion_rejected';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'pii.accessed';

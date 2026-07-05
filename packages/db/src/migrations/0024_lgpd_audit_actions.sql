-- Migration: 0024_lgpd_audit_actions
-- P-0.13 — novas ações de audit para consentimento e anonimização.
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'consent.granted';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'consent.revoked';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'user.anonymized';

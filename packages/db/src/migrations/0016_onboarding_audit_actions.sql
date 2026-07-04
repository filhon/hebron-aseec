-- Migration: 0016_onboarding_audit_actions
-- P-1.26 — novas ações de audit para rejeição de cadastro e enrollment de MFA.
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'user.rejected';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'user.signup_requested';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'mfa.enrolled';

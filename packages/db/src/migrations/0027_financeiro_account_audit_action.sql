-- Migration: 0027_financeiro_account_audit_action
-- P-3.9 — nova ação de audit para o createBankAccount (bank-account-form
-- do Bloco A não tinha action correspondente até esta integração).
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.account.created';

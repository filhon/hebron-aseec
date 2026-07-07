-- Migration: 0028_financeiro_report_audit_action
-- P-3.10 — nova ação de audit para exportMonthlyReport (export manual de
-- relatório mensal em PDF+XLSX+ZIP pelo super_admin).
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.report.exported';

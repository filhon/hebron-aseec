-- Migration: 0073_financeiro_receivable_cancelled_audit_action
-- P-3.9c (CORRETIVO) — cancelReceivable (novo, "recebível cancelado" era um
-- valor de enum sem nenhuma action que o alcançasse) precisa de um valor
-- próprio no enum para o audit trail (G6.3). Arquivo separado: convenção
-- deste monorepo em toda migration que toca audit_action — ALTER TYPE ...
-- ADD VALUE nunca é combinado com outro DDL no mesmo arquivo (ver 0072/0067/
-- 0029/0030 para o precedente explícito). ALTER TYPE ... ADD VALUE é
-- não-transacional — o runner (packages/db/src/migrate.ts) detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.receivable.cancelled';

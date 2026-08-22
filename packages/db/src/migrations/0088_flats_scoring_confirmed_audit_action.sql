-- Migration: 0088_flats_scoring_confirmed_audit_action
-- P-7.13 — Assistência de IA no scoring de Flats: confirmScoringPoints
-- (apps/flats/src/actions/scoring.ts) grava um novo valor de audit_action
-- (G6.3) para a confirmação/ajuste manual do gestor nos critérios d, g, e —
-- sem isso a auditoria falha em runtime (mesmo padrão de
-- 0047_flats_audit_actions_p78.sql).
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'scoring.confirmed';

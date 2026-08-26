-- Migration: 0092_projetos_vote_changed_audit_action
-- P-2.8d (CORRETIVO) — decisão (b), PATCH-028: mudar de voto enquanto a
-- votação está aberta grava uma entrada de audit distinta de vote.cast (o
-- valor anterior é substituído, não apenas um voto novo sendo lançado) —
-- sem isso a auditoria falha em runtime (mesmo padrão de
-- 0088_flats_scoring_confirmed_audit_action.sql). ALTER TYPE ... ADD VALUE
-- é não-transacional — o runner (packages/db/src/migrate.ts) detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'vote.changed';

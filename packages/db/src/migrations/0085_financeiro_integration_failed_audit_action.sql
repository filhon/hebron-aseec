-- Migration: 0085_financeiro_integration_failed_audit_action
-- PACOTE 2 (CORRETIVO, AUDIT/04-BACKLOG-CORRECAO.md, FLX-001) — onProjectApproved
-- rodava fire-and-forget nos dois call sites (apps/projetos/src/actions/
-- projects.ts e packages/jobs/src/crons/projetos.ts), diferente das outras
-- quatro integrações cross-app do ecossistema. Passa a ser aguardada; a
-- falha precisa de um valor próprio no enum para o audit trail (G6.3).
-- Arquivo separado: convenção deste monorepo em toda migration que toca
-- audit_action — ALTER TYPE ... ADD VALUE nunca é combinado com outro DDL
-- no mesmo arquivo (ver 0074/0073/0072/0067/0029/0030). ALTER TYPE ... ADD
-- VALUE é não-transacional — o runner (packages/db/src/migrate.ts) detecta
-- isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.integration.failed';

-- Migration: 0029_financeiro_payable_bloqueio_audit_actions
-- P-3.11 — Integrações Cross-App Financeiro.
--   • Bloqueio por inadimplência de relatório de projeto (BRAIN §6.2):
--     novo status "bloqueado" em financeiro.payable_status.
--   • Duas novas ações de audit para o ciclo de bloqueio/override
--     (override exclusivo de super_admin, com justificativa obrigatória).
--
-- Escrita à mão (não via `drizzle-kit generate`): o snapshot rastreado em
-- src/migrations/meta ficou parado em 0014 (migrations 0015-0028 foram
-- aplicadas fora do fluxo do drizzle-kit — drift pré-existente, fora do
-- escopo deste prompt); gerar a partir dele produziria um diff reincluindo
-- todas essas 14 migrations sem idempotência (ADD COLUMN/ADD VALUE sem
-- IF NOT EXISTS), quebrando qualquer banco onde já foram aplicadas. Ver
-- SESSIONS.md para o registro completo desta decisão.
--
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.payable.blocked';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.payable.block_overridden';
ALTER TYPE "financeiro"."payable_status" ADD VALUE IF NOT EXISTS 'bloqueado';

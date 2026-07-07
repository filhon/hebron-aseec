-- Migration: 0032_tarefas_audit_actions
-- P-4.6 — Schema do Banco Tarefas (G6.3): aprovações de diretor
-- (tarefas.approval_requests) são mutação crítica — três novas ações de
-- audit para o ciclo de solicitação/aprovação/rejeição.
--
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'task.approval_requested';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'task.approved';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'task.rejected';

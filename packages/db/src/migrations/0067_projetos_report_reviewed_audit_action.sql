-- Migration: 0067_projetos_report_reviewed_audit_action
-- P-2.6b — reviewReport auditava como "report.submitted", a mesma ação do
-- envio pelo submissor; o log não respondia "quem aprovou este relatório".
-- Novo valor dedicado no enum, mesmo padrão de S-40 (0012_audit_action_modules).
--
-- Arquivo separado de 0066 (não a mesma migration): convenção deste
-- monorepo em todas as ~18 migrations que tocam audit_action — ALTER TYPE
-- ... ADD VALUE nunca é combinado com outro DDL no mesmo arquivo (ver
-- 0029/0030 para o precedente explícito). Débito de bookkeeping registrado
-- em SESSIONS.md: o prompt lista um único arquivo de migration; este é o
-- de infraestrutura óbvia que falta (G1).
--
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'report.reviewed';

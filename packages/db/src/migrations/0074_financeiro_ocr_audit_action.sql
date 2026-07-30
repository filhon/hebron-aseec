-- Migration: 0074_financeiro_ocr_audit_action
-- P-3.8c (CORRETIVO) — extractNfFromAttachment (liga o OCR de nota fiscal,
-- existente em packages/ai desde P-3.8, mas sem nenhum consumidor) precisa
-- de um valor próprio no enum para o audit trail (G6.3). Arquivo separado:
-- convenção deste monorepo em toda migration que toca audit_action — ALTER
-- TYPE ... ADD VALUE nunca é combinado com outro DDL no mesmo arquivo (ver
-- 0073/0072/0067/0029/0030 para o precedente explícito). ALTER TYPE ... ADD
-- VALUE é não-transacional — o runner (packages/db/src/migrate.ts) detecta
-- isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'financeiro.attachment.nf_extracted';

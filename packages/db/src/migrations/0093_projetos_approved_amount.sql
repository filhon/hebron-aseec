-- Migration: 0093_projetos_approved_amount
-- P-2.15 (CORRETIVO) — AUDIT/06 §1.1: o valor efetivamente APROVADO pela
-- diretoria nunca existiu no modelo de dados. `projetos.projects` só guardava
-- `budget_total` (o valor PEDIDO pelo submissor no wizard) — aprovar R$ 30 mil
-- de um pedido de R$ 50 mil gerava cronograma e `financeiro.payables` de
-- R$ 50 mil, sem caminho no módulo Projetos para corrigir
-- (`generatePaymentSchedule`/`getCommittedBudget` liam só `budget_total`).
--
-- Todas as colunas são NULLABLE de propósito: projetos já aprovados ficam com
-- NULL e o código passa a ler `approved_amount ?? budget_total` — o mesmo
-- padrão de fallback de 0091_projetos_meses_pagamento.sql, para não recalcular
-- nada já emitido (payment_schedules/payables são imutáveis).

ALTER TABLE "projetos"."projects"
  ADD COLUMN IF NOT EXISTS "approved_amount" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "approved_parcelas" integer,
  ADD COLUMN IF NOT EXISTS "approved_meses_pagamento" integer[],
  ADD COLUMN IF NOT EXISTS "approved_notes" text,
  ADD COLUMN IF NOT EXISTS "approved_by" uuid REFERENCES public.users ("id"),
  ADD COLUMN IF NOT EXISTS "approved_decision_at" timestamptz;

COMMENT ON COLUMN "projetos"."projects"."approved_amount" IS
  'Valor efetivamente aprovado pela diretoria (BRAIN §6.2 "Valor aprovado") — distinto de budget_total (o valor pedido). NULL em projetos anteriores a esta migration; generatePaymentSchedule/getCommittedBudget caem no fallback budget_total.';
COMMENT ON COLUMN "projetos"."projects"."approved_parcelas" IS
  'Número de parcelas decidido na aprovação, quando diferente de projects.parcelas (Q54 — o pontual pode ser dividido mesmo sendo pagamento único por padrão). NULL = usa projects.parcelas.';
COMMENT ON COLUMN "projetos"."projects"."approved_meses_pagamento" IS
  'Meses (1-12) escolhidos na aprovação, quando approved_parcelas é informado. Exigido junto com approved_parcelas (mesma coerência de checkMesesPagamentoCoherence).';
COMMENT ON COLUMN "projetos"."projects"."approved_notes" IS
  'Observação da diretoria registrada no ato da decisão (aprovação ou reprovação).';
COMMENT ON COLUMN "projetos"."projects"."approved_by" IS
  'Usuário (diretor/super_admin) que registrou a decisão pelo painel de decisão.';
COMMENT ON COLUMN "projetos"."projects"."approved_decision_at" IS
  'Momento em que a decisão (aprovação ou reprovação) foi registrada pelo painel — distinto de approved_at, que marca só a transição de estágio.';

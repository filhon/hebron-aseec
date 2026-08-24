-- Migration: 0091_projetos_meses_pagamento
-- P-2.6c (CORRETIVO) — os meses de pagamento escolhidos pelo submissor eram
-- coletados pelo wizard e validados (`checkMesesPagamentoCoherence`), mas
-- `projetos.projects` só guardava a CONTAGEM (`meses`). Sem a lista, o
-- gerador de cronograma (`generatePaymentSchedule`) montava o mês de cada
-- parcela como `(i % 12) + 1` — jan/fev/mar — e, via `onProjectApproved`, os
-- `financeiro.payables` nasciam com o vencimento errado. Um projeto aprovado
-- para pagar em ago/set/out virava desembolso em janeiro.
--
-- Coluna NULLABLE de propósito: projetos anteriores a esta migration não têm
-- o dado, e o gerador mantém para eles o comportamento antigo (Jan–N). Sem
-- backfill: `payment_schedules`/`payables` já emitidos são imutáveis (BRAIN)
-- e não são reescritos por este corretivo.

ALTER TABLE "projetos"."projects"
  ADD COLUMN IF NOT EXISTS "meses_pagamento" integer[];

COMMENT ON COLUMN "projetos"."projects"."meses_pagamento" IS
  'Meses (1-12) escolhidos pelo submissor para liberação das parcelas. NULL em projetos anteriores a 0091 — nesse caso generatePaymentSchedule cai no fallback Jan-N.';

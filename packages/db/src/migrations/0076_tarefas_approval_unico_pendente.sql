-- Migration: 0076_tarefas_approval_unico_pendente
-- P-4.8c (CORRETIVO) — nada em tarefas.approval_requests impedia duas linhas
-- 'pendente' para a mesma tarefa: requestApproval não verificava, e a tela
-- reabre o botão assim que o pedido anterior sai de "pendente" (correto após
-- rejeição — pede-se de novo). assembleTasks (apps/tarefas/src/lib/
-- queries.ts) escolhia UMA linha por Map, na ordem física que o SELECT sem
-- ORDER BY devolvesse — com duas pendentes, qual delas a diretoria via na
-- tela não era garantido por nenhuma regra. Ref: PROMPTS.md P-4.8c,
-- CLAUDE.md "governança dual".

-- ---------------------------------------------------------------------------
-- 1. Saneamento do passado: se uma tarefa já acumulou mais de um pedido
--    'pendente' (só possível hoje por essa ausência de guarda), mantém o
--    mais recente por requested_at e resolve os demais — nunca DELETE
--    (imutabilidade, CLAUDE.md). Não existe status "superado" no enum
--    approval_request_status, e criar um exigiria estender esse enum e, na
--    mesma migration, já usar o valor novo num UPDATE — o Postgres não
--    permite isso dentro de uma única transação (o valor só fica visível
--    depois do commit que o adicionou), o que forçaria uma segunda migration
--    só para isso. Usa 'rejeitado' (o terminal state
--    mais próximo do que aconteceu — o pedido deixou de valer) e deixa
--    explícito em notes que foi saneamento automático, não decisão do
--    diretor.
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY task_id
      ORDER BY requested_at DESC, id DESC
    ) AS rn
  FROM "tarefas"."approval_requests"
  WHERE status = 'pendente'
)
UPDATE "tarefas"."approval_requests" AS ar
SET
  status = 'rejeitado',
  resolved_at = now(),
  notes = concat_ws(
    ' — ',
    ar.notes,
    'Superado automaticamente (migration 0076): já havia um pedido mais recente para a mesma tarefa.'
  )
FROM ranked
WHERE ar.id = ranked.id
  AND ranked.rn > 1;

-- ---------------------------------------------------------------------------
-- 2. Daqui pra frente, o banco garante o que a action também passa a
--    verificar (defesa em profundidade — guarda na action sozinha é corrida
--    entre duas abas, e este é um fluxo auditado): no máximo um pedido
--    'pendente' por tarefa.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "approval_requests_task_pending_uniq"
  ON "tarefas"."approval_requests" ("task_id")
  WHERE "status" = 'pendente';

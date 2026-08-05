-- Migration: 0077_tarefas_recorrencia_unica_ativa
-- P-4.9d (CORRETIVO) — nada em tarefas.recurrence_rules impedia duas regras
-- ativas (sem end_date) para o mesmo task_template_id: o cron
-- (packages/jobs/src/crons/tarefas.ts::runTarefasRecurrence) instancia o
-- template uma vez por regra vencida, e assembleTasks (apps/tarefas/src/
-- lib/queries.ts) escolhia UMA linha por Map, sobrescrita pela ordem física
-- do SELECT sem ORDER BY — mesma classe de falha corrigida para
-- approval_requests em 0076. Ref: PROMPTS.md P-4.9d, S-81.

-- ---------------------------------------------------------------------------
-- 1. Saneamento do passado: se um template já acumulou mais de uma regra
--    sem end_date (só possível hoje por essa ausência de guarda), mantém a
--    criada mais recentemente ativa e encerra as demais agora — nunca
--    DELETE (imutabilidade, CLAUDE.md). "Encerrar" aqui é o mesmo mecanismo
--    que a ação "Encerrar recorrência" usa: grava end_date, não apaga nada.
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY task_template_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM "tarefas"."recurrence_rules"
  WHERE end_date IS NULL
)
UPDATE "tarefas"."recurrence_rules" AS rr
SET end_date = now()
FROM ranked
WHERE rr.id = ranked.id
  AND ranked.rn > 1;

-- ---------------------------------------------------------------------------
-- 2. Daqui pra frente, o banco garante o que a action também passa a
--    verificar (defesa em profundidade — guarda na action sozinha é corrida
--    entre duas abas): no máximo uma regra sem end_date por template. Uma
--    regra com end_date no futuro ainda conta como "ativa" para a guarda da
--    action (mesmo predicado do cron), mas o índice só cobre o caso comum
--    (sem end_date) — `now()` não é IMMUTABLE e não pode entrar num
--    predicado de índice parcial.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "recurrence_rules_task_template_active_uniq"
  ON "tarefas"."recurrence_rules" ("task_template_id")
  WHERE "end_date" IS NULL;

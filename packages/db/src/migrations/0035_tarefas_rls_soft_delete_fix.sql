-- Migration: 0035_tarefas_rls_soft_delete_fix
-- Corrige bug de RLS descoberto ao escrever apps/tarefas/src/__tests__/
-- rls.test.ts (P-4.12): colaborador não conseguia fazer soft-delete da
-- própria tarefa.
--
-- Causa: "tasks_select_staff" (SELECT) exige deleted_at IS NULL. O Postgres
-- também aplica essa condição de SELECT como checagem implícita sobre a NOVA
-- linha de um UPDATE, além do WITH CHECK explícito de
-- "tasks_update_own_or_assignee" — então, ao marcar deleted_at, a linha
-- deixava de satisfazer NENHUMA policy de visibilidade, e o UPDATE era
-- rejeitado com "new row violates row-level security policy for table
-- tasks", mesmo vindo do criador/assignee legítimo (isolado e confirmado via
-- ALTER POLICY temporário em transação revertida — só relaxar a policy de
-- UPDATE não resolvia; só relaxar "tasks_select_staff" resolvia).
--
-- Fix: "tasks_select_staff" passa a permitir que o próprio criador/assignee
-- continue vendo a tarefa mesmo após o soft-delete (abre caminho para uma
-- futura tela de "excluídas recentemente"); demais colaboradores/
-- diretor/conselheiro continuam sem ver tarefas já deletadas de terceiros —
-- a transparência interna sobre tarefas ativas não muda. As leituras do app
-- (apps/tarefas/src/lib/queries.ts) já filtram deleted_at IS NULL na camada
-- de aplicação, então nenhuma tarefa deletada passa a aparecer no
-- kanban/lista por causa desta mudança. Ver PATCH-015.

DROP POLICY IF EXISTS "tasks_select_staff" ON "tarefas"."tasks";

CREATE POLICY "tasks_select_staff"
  ON "tarefas"."tasks" FOR SELECT TO authenticated
  USING (
    public.has_role('colaborador', 'diretor', 'conselheiro')
    AND (
      "deleted_at" IS NULL
      OR "created_by" = auth.uid()
      OR EXISTS (
        SELECT 1 FROM "tarefas"."assignees" a
        WHERE a.task_id = "tarefas"."tasks"."id" AND a.user_id = auth.uid()
      )
    )
  );

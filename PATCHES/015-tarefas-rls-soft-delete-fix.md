# PATCH-015 — Tarefas: RLS bloqueava soft-delete pelo próprio criador/assignee

**Data:** 2026-07-08 (P-4.12 — Testes Tarefas)
**Motivo:** Ao escrever `apps/tarefas/src/__tests__/rls.test.ts` (P-4.12), o teste "colaboradorA faz soft-delete da própria tarefa" falhou com `new row violates row-level security policy for table "tasks"`, mesmo com `tasks_update_own_or_assignee` (P-4.7, `0033_tarefas_rls.sql`) permitindo UPDATE ao criador. O critério de aceite de P-4.7 ("Colaborador: SELECT em qualquer tarefa; UPDATE/DELETE só como creator/assignee — teste com 2 usuários") havia sido marcado `[x]` sem esse caminho de soft-delete ter sido de fato exercitado por um teste.

**Diagnóstico (isolado com `ALTER POLICY` em transações revertidas, não commitado):** `tasks_select_staff` (SELECT) exige `deleted_at IS NULL`. O Postgres aplica essa condição de SELECT como checagem implícita sobre a **nova linha** de um UPDATE, além do `WITH CHECK` explícito da própria policy de UPDATE — confirmado experimentalmente: relaxar o `WITH CHECK` de `tasks_update_own_or_assignee` para `true` **não** resolvia; só relaxar `tasks_select_staff` resolvia. Ou seja: ao marcar `deleted_at`, a linha deixava de satisfazer **nenhuma** policy de visibilidade aplicável, e o UPDATE (mesmo legítimo) era rejeitado.

**Impacto:** nenhum colaborador conseguia soft-deletar a própria tarefa desde que P-4.7 foi implementado (fase 4, antes de P-4.12). Não há evidência de uso em produção ainda (módulo tarefas não estava com testes de RLS até agora).

## Escopo

### ANTES (`0033_tarefas_rls.sql`)

```sql
CREATE POLICY "tasks_select_staff"
  ON "tarefas"."tasks" FOR SELECT TO authenticated
  USING (
    "deleted_at" IS NULL
    AND public.has_role('colaborador', 'diretor', 'conselheiro')
  );
```

### DEPOIS (`0035_tarefas_rls_soft_delete_fix.sql`)

```sql
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
```

O criador/assignee passa a reter visibilidade da própria tarefa mesmo após o soft-delete (abre caminho natural para uma futura tela de "excluídas recentemente"); os demais colaboradores/diretor/conselheiro continuam sem ver tarefas já deletadas de terceiros — a transparência interna sobre tarefas **ativas** não muda. As leituras do app (`apps/tarefas/src/lib/queries.ts`) já filtram `deleted_at IS NULL` na camada de aplicação, então nenhuma tarefa deletada passa a aparecer no kanban/lista por causa desta mudança — a RLS continua sendo a última camada de defesa (defense in depth), não a única.

## Arquivos afetados

- `packages/db/src/migrations/0035_tarefas_rls_soft_delete_fix.sql` (novo)
- `apps/tarefas/src/__tests__/rls.test.ts` (teste que expôs o bug — P-4.12)

## Critérios de aceite

- [x] Colaborador (criador) consegue fazer soft-delete da própria tarefa
- [x] Colaborador (assignee) consegue fazer soft-delete de tarefa da qual é responsável
- [x] Colaborador que não é criador/assignee continua sem ver a tarefa depois de deletada por outro
- [x] Kanban/lista do app continuam sem mostrar tarefas deletadas (filtro de `queries.ts` inalterado)
- [x] Teste de RLS (`rls.test.ts`) passa

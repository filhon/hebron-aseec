# PATCH-016 - Runtime: mutacoes devem rodar como usuario autenticado

**Data:** 2026-07-10
**Origem:** Debitos recorrentes em S-55, S-63, S-80 e S-91/S-93.
**Motivo:** BRAIN.md e PROMPTS.md G6 definem a decisao B: Server Actions devem executar como `authenticated`, propagando o JWT do usuario, e RLS deve ser camada ativa. Na pratica, varios fluxos de mutacao ainda usam `db` de `@hebron/db/client` diretamente. O gate de papel do action-client reduz o risco, mas a RLS fica inerte para mutacoes justamente nos modulos mais sensiveis.

## Prompt corretivo proposto

### P-0.17 - Runtime RLS para mutacoes criticas

**Fase:** 0
**Modulo:** fundacao
**Tipo:** integration
**Pre-condicoes:**

- Branch: `fix/P-0.17-runtime-rls-mutacoes`
- Dependencias: P-0.8, P-0.10 e P-0.15 concluidos
- Env vars: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Escopo:**

Criar um caminho compartilhado e incremental para Server Actions executarem escritas com contexto autenticado, sem reimplementar sessao em cada app e sem quebrar jobs/crons que precisam do ator sistema.

1. Em `packages/db`, adicionar um helper transacional baseado em `withAuthenticatedContext` para mutacoes de app:
   - recebe `actorId`;
   - aplica o claim de usuario/role do mesmo modo que as leituras RSC ja fazem;
   - aceita callback `tx`;
   - documenta explicitamente quando `db` superuser ainda e permitido: jobs, migrations, seeds e funcoes de sistema com `getSystemActorId`.
2. Migrar primeiro os fluxos criticos ja identificados como debito:
   - Tarefas: `apps/tarefas/src/actions/{tasks,comments,time-tracking,recurrence,templates,approvals}.ts`;
   - Intranet: `apps/intranet/src/actions/{announcements,dashboard,decisions,briefing}.ts`;
   - Financeiro: somente actions de governanca/ledger onde ha audit critico (`approval.ts`, `transactions.ts`, `payables.ts`, `reports.ts`), mantendo parsers e helpers puros fora do escopo.
3. Manter auditoria atomica: quando a action ja usa `db.transaction`, a migracao deve preservar uma unica transacao para mutacao principal + audit.
4. Adicionar testes de regressao por modulo confirmando que:
   - papel sem permissao passa pelo action-client ou pela RLS e falha;
   - usuario com permissao consegue executar o fluxo;
   - um `ALTER POLICY`/RLS relevante e exercitado pelo caminho da action, nao apenas por teste SQL isolado.

**Arquivos permitidos para criacao/edicao:**

- `packages/db/src/authenticated.ts`
- `packages/db/src/action-context.ts` (novo, se necessario)
- `packages/db/src/index.ts`
- `apps/tarefas/src/actions/*.ts`
- `apps/tarefas/src/__tests__/runtime-rls.test.ts`
- `apps/intranet/src/actions/*.ts`
- `apps/intranet/src/__tests__/runtime-rls.test.ts`
- `apps/financeiro/src/actions/{approval,transactions,payables,reports}.ts`
- `apps/financeiro/src/__tests__/runtime-rls.test.ts`

**Fora do escopo:**

- Migrar jobs de `packages/jobs`: jobs continuam sem sessao HTTP e usam ator sistema.
- Reescrever todas as queries de leitura que ja estao funcionando via RSC.
- Alterar regras de negocio ou relaxar policies para fazer actions passarem.

**Criterios de aceite:**

- [x] Nenhuma action migrada usa `db` direto para INSERT/UPDATE/DELETE fora do helper autenticado.
- [x] Falha de RLS aparece como erro de action compreensivel, sem vazar SQL bruto para UI.
- [x] Audit critico permanece atomico com a mutacao principal.
- [x] Testes novos provam pelo menos 1 mutacao real por modulo usando o caminho autenticado.
- [x] Jobs/crons existentes continuam verdes e nao dependem de cookies/sessao.
- [x] `pnpm turbo lint typecheck` passa.
- [x] Suites afetadas passam isoladamente.

## Observacao

Este patch e deliberadamente fundacional. Ele evita corrigir uma action por vez de forma divergente e fecha a contradicao mais perigosa entre a arquitetura declarada e o runtime atual.

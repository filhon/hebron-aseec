# PATCH-017 - Intranet: presidente da sessao registra decisoes de reuniao

**Data:** 2026-07-10
**Origem:** Debitos de S-91, S-92 e S-93.
**Motivo:** BRAIN.md §6.6 diz que o presidente de sessao registra decisoes. A implementacao atual restringe `intranet.meeting_decisions` a `super_admin`, entao um diretor/conselheiro que preside a reuniao ve as decisoes, mas nao consegue registrar a ata/action item. Isso tambem obriga a UI a esconder o formulario de decisao para papeis que deveriam operar o fluxo.

## Prompt corretivo proposto

### P-5.9b - Intranet: decisoes por presidente da sessao

**Fase:** 5
**Modulo:** intranet
**Tipo:** integration
**Pre-condicoes:**

- Branch: `fix/P-5.9b-intranet-decisoes-presidente`
- Dependencias: P-5.7, P-5.8 e P-5.9 concluidos
- Env vars: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Escopo:**

Alinhar RLS, Server Action e UI com a regra de negocio: quem preside a reuniao (`admin.meeting_sessions.chair_user_id`) pode registrar decisoes daquela sessao; `super_admin` continua podendo registrar qualquer decisao.

1. Criar migration de RLS para `intranet.meeting_decisions`:
   - `super_admin`: INSERT/UPDATE como hoje;
   - `diretor`/`conselheiro`: INSERT somente quando `meeting_session_id` aponta para uma `admin.meeting_sessions` em que `chair_user_id = auth.uid()`;
   - UPDATE de status permitido ao presidente da sessao e ao `super_admin`;
   - SELECT permanece para conselho/staff conforme policy atual.
2. Trocar `createMeetingDecision` de `superAdminAction` para action de conselho/staff com checagem explicita:
   - buscar a `meeting_session`;
   - validar que `ctx.actorId` e o presidente ou que o ator e `super_admin`;
   - manter criacao opcional de tarefa via `@hebron/integrations/tarefas`;
   - auditar `meeting_decision.created`.
3. Implementar `updateMeetingDecisionStatus`, consumindo `updateMeetingDecisionStatusSchema` ja existente em `@hebron/validators/intranet`.
4. Ajustar UI:
   - mostrar "Registrar decisao" para `super_admin` ou para o presidente da sessao;
   - expor alteracao de status para quem tem a mesma permissao;
   - nao mostrar controles que falhariam no backend.
5. Adicionar testes de RLS/action:
   - presidente diretor registra decisao da propria sessao;
   - diretor nao-presidente nao registra;
   - conselheiro presidente registra;
   - `super_admin` registra qualquer uma;
   - status atualiza com as mesmas regras.

**Arquivos permitidos para criacao/edicao:**

- `packages/db/src/migrations/<gerada>_intranet_meeting_decisions_chair_rls.sql`
- `packages/db/src/schema/intranet.ts` (somente se precisar ajustar tipos/exports)
- `apps/intranet/src/actions/decisions.ts`
- `apps/intranet/src/components/meeting-decision-dialog.tsx`
- `apps/intranet/src/components/meeting-decision-form.tsx`
- `apps/intranet/src/app/(dashboard)/reunioes/page.tsx`
- `apps/intranet/src/lib/queries.ts`
- `apps/intranet/src/__tests__/meeting-decisions.test.ts`
- `apps/intranet/src/__tests__/rls.test.ts`

**Criterios de aceite:**

- [x] Presidente da sessao consegue registrar decisao pela UI.
- [x] Diretor/conselheiro que nao preside a sessao nao consegue registrar decisao.
- [x] `super_admin` continua podendo registrar decisao em qualquer reuniao.
- [x] `updateMeetingDecisionStatus` existe e e acionavel pela tela.
- [x] Criar tarefa a partir da decisao continua funcionando e gerando `task_id`.
- [x] RLS cobre a regra; a action nao e a unica camada de seguranca.
- [x] Lint, types e testes do modulo passam.

## Decisao

Nao criar novo papel para "presidente". O dono da permissao ja existe no schema: `admin.meeting_sessions.chair_user_id`.

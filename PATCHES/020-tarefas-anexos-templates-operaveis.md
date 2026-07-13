# PATCH-020 - Tarefas: anexos e templates ficam totalmente operaveis pela UI

**Data:** 2026-07-10
**Origem:** Debitos de S-81.
**Motivo:** O modulo Tarefas ja tem tabela, RLS, bucket e action `createAttachment`, mas o formulario de criar/editar tarefa ainda mantem arquivos apenas em estado local. A tela de Templates tambem perdeu editar/ativar/desativar porque nao havia action. O resultado e um modulo funcional para tarefas simples, mas com duas capacidades visiveis ou esperadas ainda incompletas.

## Prompt corretivo proposto

### P-4.9b - Tarefas: anexos persistidos e gestao de templates

**Fase:** 4
**Modulo:** tarefas
**Tipo:** integration
**Pre-condicoes:**

- Branch: `fix/P-4.9b-tarefas-anexos-templates`
- Dependencias: P-4.8, P-4.9, P-4.12 e P-0.12 concluidos
- Env vars: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Escopo:**

Fechar as lacunas operacionais restantes da UI de Tarefas sem alterar o modelo de workspaces/status fixos.

1. Anexos:
   - ao criar tarefa, primeiro executar `createTask`, depois enviar cada arquivo via `createAttachment` com `parentType = "task"` e `parentId = task.id`;
   - ao editar tarefa, permitir adicionar novos anexos;
   - exibir erro por arquivo sem perder a tarefa ja criada;
   - manter leitura de anexos pelo caminho existente em `getTaskById`;
   - nao implementar delete de anexo para colaborador nesta rodada; delete permanece restrito a `super_admin` conforme RLS.
2. Templates:
   - adicionar schemas Zod compartilhados para `updateTaskTemplate` e `toggleTaskTemplate`;
   - implementar actions reais em `apps/tarefas/src/actions/templates.ts`;
   - reconectar botoes de renomear/editar e ativar/desativar na tela `/templates`;
   - impedir instanciacao de template inativo pela UI e pela action.
3. Testes:
   - action de anexo registra linha e retorna signed upload URL;
   - criar tarefa com anexo pela UI client chama os dois passos;
   - update/toggle de template persiste e respeita gate de papel;
   - template inativo nao instancia.

**Arquivos permitidos para criacao/edicao:**

- `packages/validators/src/tarefas/index.ts`
- `apps/tarefas/src/actions/tasks.ts`
- `apps/tarefas/src/actions/templates.ts`
- `apps/tarefas/src/components/task-form.tsx`
- `apps/tarefas/src/app/(dashboard)/my-tasks-client.tsx`
- `apps/tarefas/src/app/(dashboard)/workspace/[slug]/board-client.tsx`
- `apps/tarefas/src/app/(dashboard)/tarefa/[id]/task-detail-client.tsx`
- `apps/tarefas/src/app/(dashboard)/templates/templates-client.tsx`
- `apps/tarefas/src/__tests__/attachments.test.ts`
- `apps/tarefas/src/__tests__/templates.test.ts`

**Criterios de aceite:**

- [x] Criar tarefa com arquivo selecionado persiste a tarefa, registra anexo e gera upload assinado.
- [x] Editar tarefa permite adicionar novos anexos.
- [x] Falha de upload mostra erro especifico sem duplicar tarefa.
- [x] Template pode ser editado e ativado/desativado pela UI.
- [x] Template inativo nao pode ser instanciado.
- [x] RLS de anexos continua respeitada.
- [x] Lint, types e testes de Tarefas passam.

## Fora do escopo

- Versionamento de anexos.
- Remocao de anexos por colaborador.
- Templates com editor visual avancado de subtarefas alem do que `TemplateForm` ja suporta.

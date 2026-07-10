# PATCH-019 - Projetos -> Tarefas: checklist padrao precisa nascer configurado

**Data:** 2026-07-10
**Origem:** Debito de S-83.
**Motivo:** `onProjectSubmitted` ja cria checklist real via `createAutoTaskChecklist`, mas depende de `admin.system_settings.projetos_analysis_checklist_template`. A chave e o template nao sao seedados nem criaveis pela UI atual de settings, entao a primeira submissao real apos P-4.11 tende a falhar na integracao e notificar o super_admin para uma configuracao manual que o sistema ainda nao oferece.

## Prompt corretivo proposto

### P-4.11b - Seed e configuracao do checklist padrao de analise

**Fase:** 4
**Modulo:** tarefas
**Tipo:** integration
**Pre-condicoes:**

- Branch: `fix/P-4.11b-checklist-projetos-seed`
- Dependencias: P-4.8, P-4.9, P-4.11 e P-0.15 concluidos
- Env vars: `DATABASE_URL`

**Escopo:**

Garantir que Projetos -> Tarefas funcione em ambiente novo sem insercao manual fora do sistema.

1. Criar seed/migration idempotente para:
   - localizar/criar workspace `administrativo`;
   - criar template ativo "Checklist de analise de projeto";
   - criar itens minimos do checklist, alinhados com o fluxo de Projetos:
     - validar documentacao enviada;
     - revisar resumo e versao compacta;
     - conferir orcamento e teto institucional;
     - preparar pauta de avaliacao;
     - registrar pendencias para o submissor, se houver;
   - gravar `admin.system_settings` com chave `projetos_analysis_checklist_template` apontando para o template.
2. Ajustar `apps/admin/src/actions/settings.ts` ou criar action especifica para permitir trocar esse template no Admin sem SQL manual.
3. Adicionar uma pequena UI no Admin ou em Tarefas para visualizar qual template esta associado a Projetos.
4. Manter fallback de notificacao em `onProjectSubmitted`: se alguem apagar/inativar o template, a falha continua visivel.

**Arquivos permitidos para criacao/edicao:**

- `packages/db/src/seed.ts`
- `packages/db/src/migrations/<gerada>_tarefas_projetos_checklist_seed.sql` (se o projeto preferir seed via migration idempotente)
- `apps/admin/src/actions/settings.ts`
- `apps/admin/src/app/(dashboard)/configuracoes/page.tsx`
- `apps/tarefas/src/app/(dashboard)/templates/page.tsx`
- `apps/tarefas/src/app/(dashboard)/templates/templates-client.tsx`
- `packages/integrations/src/projetos-tarefas.ts`
- `packages/integrations/src/__tests__/projetos-tarefas.test.ts`

**Criterios de aceite:**

- [x] Banco novo recebe template ativo e setting `projetos_analysis_checklist_template`.
- [x] `onProjectSubmitted` cria tarefas de checklist sem configuracao manual previa.
- [x] Super_admin consegue trocar o template associado sem editar banco diretamente.
- [x] Template inativo/removido ainda gera notificacao de falha compreensivel.
- [x] Teste cobre ambiente com seed e ambiente com setting ausente.
- [x] Lint, types e testes afetados passam.

## Decisao

Este patch nao muda a semantica de Tarefas automaticas: elas continuam nascendo sem assignee e com `needsManualAssignment = true`, para atribuicao manual posterior pelo super_admin.

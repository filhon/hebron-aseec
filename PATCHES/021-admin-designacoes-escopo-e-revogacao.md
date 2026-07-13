# PATCH-021 - Admin: designacoes sem campo fantasma e revogacao imutavel

**Data:** 2026-07-10
**Origem:** Debitos de S-59.
**Motivo:** `DesignationForm` exibe "Escopo", mas a tabela `admin.designations` nao tem coluna correspondente e a action descarta o valor. Alem disso, revogar papel/designacao ainda usa hard delete; a organizacao preserva a trilha via audit log, mas perde o estado historico na propria tabela. Isso conflita com o principio geral de imutabilidade do ecossistema.

## Prompt corretivo proposto

### P-1.25b - Admin: designacoes honestas e revogacao sem hard delete

**Fase:** 1
**Modulo:** admin
**Tipo:** integration
**Pre-condicoes:**

- Branch: `fix/P-1.25b-admin-designacoes-revogacao`
- Dependencias: P-1.25 e P-0.13 concluidos
- Env vars: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Escopo:**

Corrigir a divergencia entre UI e schema e substituir hard delete por revogacao auditavel.

1. Campo "Escopo":
   - remover o seletor do `DesignationForm`, porque o BRAIN define designacoes especiais por funcao, nao por escopo arbitrario;
   - remover schemas/campos mortos em validators/types, se existirem;
   - garantir que a UI nao sugira capacidade que o backend ignora.
2. Revogacao:
   - adicionar colunas `revoked_at`, `revoked_by`, `revocation_reason` em `admin.role_assignments` e `admin.designations`, ou equivalentes conforme o schema atual;
   - mudar `revokeRole` e `updateDesignation(action: "revoke")` para UPDATE imutavel em vez de DELETE;
   - queries de papeis/designacoes ativos devem filtrar `revoked_at IS NULL`;
   - audit log continua obrigatorio.
3. Compatibilidade:
   - manter FKs e dados existentes;
   - se houver linhas ja deletadas historicamente, nao tentar reconstruir.

**Arquivos permitidos para criacao/edicao (corrigido apos validacao contra a codebase — ver "Correcoes pos-validacao" abaixo):**

- `packages/db/src/schema/public.ts` (role_assignments e designations vivem em `public`, nao em `admin`)
- `packages/db/src/migrations/0044_admin_revogacoes_imutaveis.sql`
- `packages/validators/src/admin/index.ts`
- `packages/types/src/admin/index.ts`
- `apps/admin/src/actions/roles.ts` (updateDesignation ja vivia aqui; nao havia motivo para criar `designations.ts` separado)
- `apps/admin/src/components/designation-form.tsx`
- `apps/admin/src/app/(dashboard)/configuracoes/page.tsx` (nao `usuarios/[id]/page.tsx` — ver correcao)
- `packages/auth/src/server.ts` (critico — ver correcao)
- `apps/admin/src/__tests__/roles-designations.test.ts`

**Criterios de aceite:**

- [x] Formulario de designacao nao exibe campo que nao persiste.
- [x] Revogar papel atualiza linha com `revoked_at`, nao faz DELETE.
- [x] Revogar designacao atualiza linha com `revoked_at`, nao faz DELETE.
- [x] Leituras de permissoes ativas ignoram revogadas.
- [x] Audit log registra revogacao com ator e motivo quando aplicavel.
- [x] Teste cobre revogacao e garante que linha historica permanece.
- [x] Lint, types e testes de Admin passam.

## Decisao

Remover "Escopo" e mais simples e mais alinhado ao BRAIN do que adicionar uma coluna generica sem regra de negocio consumidora.

## Correcoes pos-validacao (antes de executar)

Ao validar o prompt corretivo contra o estado atual da codebase, duas lacunas seriam graves o suficiente para tornar a revogacao um placebo se o escopo original fosse seguido a risca:

1. **`packages/auth/src/server.ts` (`resolveSession`) faltava na lista.** E o unico ponto de resolucao de RBAC usado por toda Server Action nos 9 apps (via `adminAction`/`baseAction` em cada `lib/safe-action.ts`). Sem filtrar `revoked_at IS NULL` nas queries de `role_assignments`/`designations` ali, marcar uma linha como revogada nao removeria acesso algum — so um DELETE fazia isso antes.
2. **A funcao SQL `public.has_role()` (definida em `0000_initial.sql`) faltava na lista.** E usada em ~290 ocorrencias de policies RLS em todos os schemas do monorepo (admin, financeiro, projetos, documentos, tarefas, intranet, storage). Sem `CREATE OR REPLACE FUNCTION public.has_role` com `AND revoked_at IS NULL`, a RLS inteira do ecossistema continuaria enxergando papeis revogados como ativos.
3. **Caminho de arquivo errado**: quem renderiza `DesignationForm`/`DesignationPanel` e `apps/admin/src/app/(dashboard)/configuracoes/page.tsx` (aba "Designacoes"), nao `usuarios/[id]/page.tsx`.

A migration `0044_admin_revogacoes_imutaveis.sql` cobre os itens 1 e 2 (ALTER TABLE + `CREATE OR REPLACE FUNCTION public.has_role`); `packages/auth/src/server.ts` foi adicionado ao escopo executado. Validado rodando as suites de RLS de admin, financeiro e intranet apos a migration — 100% verde, sem regressao (o filtro so exclui linhas com `revoked_at` preenchido; dados existentes tem a coluna NULL).

`revocation_reason` foi adicionado como parametro opcional nas actions (`revokeRole`, `updateDesignation`) e persistido quando informado, mas nenhuma UI de revogacao ganhou campo de texto para preenche-lo — decisao deliberada para nao reintroduzir o mesmo padrao de "campo fantasma" que este patch corrige, mantendo o escopo minimo ao bug descrito.

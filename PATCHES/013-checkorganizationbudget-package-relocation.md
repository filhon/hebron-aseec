# PATCH-013 — `checkOrganizationBudget` muda de app para `packages/integrations` (fecha o workaround do S-40)

**Data:** 2026-07-07 (P-3.11, S-71)
**Motivo:** PROMPTS.md P-3.11 pede para "remover definitivamente o workaround `admin.system_settings` (S-40)". A camada de dados desse workaround já tinha sido removida em **P-3.8b / PATCH-009** (S-63): a tabela `financeiro.organization_budgets` passou a ser a fonte real, e `checkOrganizationBudget` já lia dessa tabela, não mais de `admin.system_settings`. O que restava era a camada **arquitetural**: a função continuava vivendo dentro de `apps/projetos/src/actions/projects.ts` — lógica de integração cross-app (Projetos consultando uma regra que, por definição de negócio, é "do Financeiro") morando dentro do app, em vez de exposta via `packages/integrations` (P-0.15, regra "app nunca importa lógica cross-app diretamente"). Esta é a peça final: `checkOrganizationBudget` migrou para `packages/integrations/src/projetos.ts`, sem nenhuma mudança de comportamento (mesma query, mesma semântica fail-open, mesmas mensagens de erro).

**Impacto:**

- `checkOrganizationBudget` sai de `apps/projetos/src/actions/projects.ts` e passa a viver em `packages/integrations/src/projetos.ts`, importada de volta por `apps/projetos` via `@hebron/integrations/projetos`.
- Nenhuma migration de banco — `financeiro.organization_budgets` já existia (PATCH-009); este PATCH é puramente sobre localização de código.
- Fecha a referência "S-40" do PROMPTS.md: a partir de agora não há mais nenhum código de regra de negócio cross-app Projetos↔Financeiro vivendo dentro de um app.

**Antes** (`apps/projetos/src/actions/projects.ts`, função privada não exportada):

```ts
async function checkOrganizationBudget(
  organizationId: string,
  year: number,
  newProjectBudget: number,
): Promise<void> {
  /* ... consulta financeiro.organization_budgets ... */
}
```

**Depois** (`packages/integrations/src/projetos.ts`, exportada e reusável por qualquer app):

```ts
export async function checkOrganizationBudget(
  organizationId: string,
  year: number,
  newProjectBudget: number,
): Promise<void> {
  /* mesma lógica, movida de app para package */
}
```

# PATCH-009 — `financeiro.organization_budgets`: teto de orçamento por instituição ganha dono

**Data:** 2026-07-04 (decisão + implementação em P-3.8b, S-63)
**Registrado retroativamente em:** 2026-07-06 (P-0.16)
**Motivo:** BRAIN.md §6.2 sempre disse que o orçamento por instituição/ano é definido "no Financeiro", mas nenhuma tabela do Financeiro o modelava — o código real usava um workaround (`admin.system_settings`, JSONB genérico) sem UI própria. A auditoria (S1-01, C-9) apontou que a regra central Projetos↔Financeiro ("sistema bloqueia submissão se total excede orçamento") corria o risco de calcificar como JSONB de configurações, sem trilha nem tela de gestão. Confirmado o modelo (Fase 1 Q1), a tabela `financeiro.organization_budgets (organization_id, year, amount)` e a UI de gestão foram implementadas em **P-3.8b**; `checkBudget` (Projetos) passou a consultá-la em vez do workaround anterior. Já registrado informalmente em SESSIONS S-63 ("PATCH registrado da mudança de modelo de orçamento — não há PATCH formal ainda; reconstrução autorizada só em P-0.16") — este arquivo é essa reconstrução.

**Impacto:**

- Nova tabela `financeiro.organization_budgets` + UI de gestão no Financeiro.
- `checkBudget` (Projetos, cross-schema) migra de `admin.system_settings` para a tabela dedicada.
- `admin.system_settings` deixa de carregar uma regra de negócio central — volta a ser só configuração técnica genérica, como o resto do BRAIN sempre pressupôs.

**Antes** (`BRAIN.md` §6.2, Orçamento e instituições — antes desta sessão):

```
- Orçamento definido por instituição, por ano-calendário (jan-dez), no Financeiro
```

(sem tabela nomeada; implementação real usava `admin.system_settings` como workaround, nunca documentado como tal no BRAIN.)

**Depois** (`BRAIN.md` §6.2, texto vigente):

```
- Orçamento definido por instituição, por ano-calendário (jan-dez), no Financeiro (tabela `financeiro.organization_budgets` + UI de gestão — P-3.8b / PATCH-009; substitui o workaround anterior em `admin.system_settings`)
```

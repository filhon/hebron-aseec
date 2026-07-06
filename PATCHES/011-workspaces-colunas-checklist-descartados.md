# PATCH-011 — Tarefas/Flats: workspaces custom, colunas custom e checklist de inventário descartados

**Data:** 2026-07-02 (decisão, Fase 1 da auditoria, delegada ao critério do auditor — Fase 4/Tarefas e Fase 7/Flats ainda pendentes)
**Registrado retroativamente em:** 2026-07-06 (P-0.16)
**Motivo:** Mesma origem de PATCH-010 (S1-23, Fase 1 Q8 — delegação de julgamento; sem veto do Filipe na Fase 4, Q5). Três itens dos prompts pendentes contradiziam regra já definida no BRAIN ou exigiam modelagem inexistente:

1. **Workspaces "6 fixos + custom" (P-4.6):** BRAIN §6.9 é explícito — "workspaces fixos". Workspace customizável exigiria um modelo de membership/acesso que nenhum prompt cria; foi exatamente essa lacuna que produziu a frase órfã "workspaces que tem acesso" em P-4.7 (achado da auditoria).
2. **Colunas customizáveis por workspace (P-4.3):** conflita com o enum fixo de 4 status definido em P-4.1 (BRAIN §6.9); a tela também não tinha arquivo permitido (mesmo defeito que deixou 4 telas do Financeiro sem dono, S1-14).
3. **Checklist de inventário no check-in dentro do sistema (P-7.4/P-7.8):** BRAIN §6.8 é explícito — "check-in presencial na recepção do condomínio (sem smart locks ou check-in autônomo na v1)". O sistema registra a transição de status + timestamp (necessário para `usage_history` e agendamento de limpeza), mas não um checklist de inventário.

**Impacto:**

- `BRAIN.md` §8 ganha uma nova subseção "Descartado" distinguindo estes itens de "removido/deferido para v2+" — não é que fiquem para depois, é que não entram, ponto.
- P-4.3 (patch aplicado): remove "Configuração do workspace (colunas customizáveis)" do escopo.
- P-4.6/P-4.7 (patch aplicado): workspaces continuam os 6 fixos definidos em §6.9; modelo de acesso simplificado (todos os papéis internos colaborador+ enxergam os 6 workspaces — sem tabela de membership).
- P-7.4/P-7.8 (patch aplicado): check-in registra só status + timestamp.

**Antes** (prompts pendentes, antes do patch da Fase 4 da auditoria — escopo original de `AUDIT/04-prompts-pendentes.md` antes desta decisão):

```
P-4.3: "Configuração do workspace (colunas customizáveis)" — sem arquivo permitido, sem base no BRAIN.
P-4.6/P-4.7: workspaces "6 fixos + custom"; frase "workspaces que tem acesso" (pressupõe membership inexistente).
P-7.4/P-7.8: "checklist de inventário" no check-in.
```

**Depois** (`BRAIN.md` §8, nova subseção — texto vigente):

```
### Descartado (scope creep sem base no BRAIN — decisão D-5, PATCH-011)

Diferente do "removido/deferido" acima, os itens abaixo não ficam para v2+ — foram rejeitados porque
contradiziam regra já definida no BRAIN ou exigiam modelagem que nenhum prompt criava:

- Workspaces customizáveis além dos 6 fixos (Tarefas) — contradiz §6.9 ("workspaces fixos"); exigiria
  modelo de membership/acesso que nenhum prompt cria
- Colunas customizáveis por workspace (Tarefas) — conflita com os 4 status fixos definidos em §6.9
- Checklist de inventário no check-in dentro do sistema (Flats) — check-in é presencial na recepção
  (§6.8); o sistema registra só a transição de status + timestamp
```

Os patches de P-4.3, P-4.6, P-4.7, P-7.4 e P-7.8 (`AUDIT/patches/`) aplicam esta decisão nos prompts pendentes correspondentes.

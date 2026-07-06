# PATCH-008 — KPI "doações do mês" definido: categoria "Doações" do plano de contas

**Data:** 2026-07-02 (decisão, Fase 1 da auditoria — implementação prevista em P-5.1/P-5.8, ainda pendentes)
**Registrado retroativamente em:** 2026-07-06 (P-0.16)
**Motivo:** BRAIN.md §6.6 (Intranet) sempre listou "doações do mês" como KPI do dashboard, mas o Financeiro (§6.5) nunca modelou "doação" como conceito distinto — não existe tabela/flag separando doação de qualquer outra receita. A auditoria (S1-24, CS-12) perguntou qual query definiria o KPI. O Filipe definiu (Fase 1 Q10): o valor é a soma das transações de receita lançadas na categoria "Doações" do plano de contas hierárquico (§6.5), no mês corrente — não uma tabela nova, e sim uma categorização já prevista na árvore de contas. Isto desbloqueia P-5.1 (Bloco A, mock deve refletir a definição) e P-5.8 (Bloco B, query real).

**Impacto:**

- Nenhuma tabela nova: `financeiro.categories` (plano de contas) precisa ter (ou ganhar via seed, P-9.5) uma categoria "Doações".
- KPI = `SUM(transactions.amount) WHERE category = 'Doações' AND type = 'receita' AND date BETWEEN início-do-mês AND fim-do-mês`.
- P-5.1 (mock) e P-5.8 (query real) devem refletir esta definição, não inventar uma tabela `donations` separada.

**Antes** (`BRAIN.md` §6.6, Intranet — antes desta sessão):

```
- KPIs iniciais: projetos ativos, alunos na Plataforma, doações do mês, audiência da Rádio
```

**Depois** (`BRAIN.md` §6.6, texto vigente):

```
- KPIs iniciais: projetos ativos, alunos na Plataforma, doações do mês (soma das transações de receita lançadas na categoria "Doações" do plano de contas no mês corrente — P-5.1/P-5.8, PATCH-008), audiência da Rádio
```

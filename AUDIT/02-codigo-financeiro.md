# AUDIT/02 — Verificação spec ↔ código — Financeiro (P-3.1 a P-3.8 + commit fora de fluxo `502dec4`)

**Fase:** 2 · **Data:** 2026-07-02 · **Auditor:** agente Fable 5
**Contexto:** Bloco B parou em P-3.8; P-3.9 (integração UI) está pendente — logo é **esperado** que as telas usem mock e as actions não tenham chamadores. Os veredictos abaixo descontam isso; o que não é descontável são divergências entre o que SESSIONS/PROMPTS declaram e o que o código faz.

## Tabela de veredictos

| Prompt                    | Veredito                                          | Evidência-chave                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-3.1 Tipos               | **Implementado fiel**                             | `Transaction` readonly; `BatchApproval` com approvedBy/authorizedBy; exports explícitos                                                                                                                                                                                                                                                           |
| P-3.2 Componentes         | **Implementado fiel** (1 morto)                   | Vivos e ligados às páginas mock: `transaction-table`, `cash-flow-chart`, `budget-comparison`, `conciliation-view`, `category-tree`, `batch-approval-card`. **Morto: `payable-card`** (zero imports — critério "[x] PayableCard com cores" existe só como arquivo)                                                                                 |
| P-3.3 Páginas             | **Implementado com desvio já apontado (S1-14)**   | 8 páginas do prompt existem; das 4 telas do escopo sem arquivo permitido, 2 foram criadas **fora de fluxo** (`centros-custo/`, `relatorios/`, commit `502dec4`, mock) e 2 seguem inexistentes (contas a receber, fluxo de caixa projetado como página própria)                                                                                    |
| P-3.4 Formulários         | **Implementado fiel para Bloco A**                | 6 forms com RHF+Zod ligados às páginas (S-49/commit `4b68f72`); submits são `console.log(...)` (`expense-form.tsx:124`, `revenue-form.tsx:117`, `reversal-form.tsx:106`, `budget-form.tsx:155`, `batch-approval-form.tsx:175`) — aceitável até P-3.9, é a fronteira exata do trabalho pendente. `import-form` morto por decisão registrada (S-49) |
| P-3.5 Estados             | **Implementado fiel**                             | Loading simulado `setTimeout(1200)` (`page.tsx:244`, `conciliacao/page.tsx:181`) — documentado como mock Bloco A; `transaction-table-skeleton` criado e **nunca usado** (menor)                                                                                                                                                                   |
| P-3.6 Schema              | **Implementado fiel**                             | `0010_financeiro.sql`: 14 tabelas; trigger `forbid_transaction_mutation`; UNIQUE duplo em reversals; RLS em todas as tabelas (`:422–551`); numeração divergente documentada (S-51)                                                                                                                                                                |
| P-3.7 RLS                 | **Implementado fiel como SQL; inócuo em runtime** | `0009_financeiro_rls.sql` cria `has_designation` e policies granulares (gestor UPDATE em batch_approvals etc.). Como toda action roda em conexão superuser, **nenhuma dessas policies participa do fluxo real** — a separação por designation não existe em nenhuma camada executável (F2-F1)                                                     |
| P-3.8 Actions             | **Implementado com desvios relevantes**           | Imutabilidade real (INSERT-only + guarda de estorno duplo); import OFX/CSV com parsers próprios; match automático; lote semanal; OCR em `packages/ai/src/financeiro/ocr.ts`. Desvios: F2-F1 (designation), F2-F2 (destinatário do lote), mapeamentos em `notes` (documentados S-53)                                                               |
| `502dec4` (fora de fluxo) | **Parcialmente morto**                            | `bank-account-form.tsx`: **zero imports + submit `console.log` (`:78`)** — o "botão morto" que motivou o pedido do Filipe continua sem função, agora com um formulário morto atrás; `centros-custo/page.tsx` e `relatorios/page.tsx` são telas mock razoáveis, sem prompt/critério/sessão                                                         |

## Achados detalhados

### F2-F1 (ALTO) — Governança dual: a separação gestor/autorizador declarada não existe no código executável

S-52: "a separação quem-aprova vs. quem-autoriza é **enforced no Server Action com verificação de designation**". S-53 marca "[x] Aprovação de lote: diretor gestor aprova". O código: grep por `designation` em `apps/financeiro/src` → **zero ocorrências**. `approveBatch` usa `diretorAction` (qualquer diretor — `safe-action.ts:71–77`, `approval.ts:194–196`); nenhuma consulta a `public.designations`. A única camada que restringiria ao gestor é a RLS `batch_approvals_update_gestor` (`0009_financeiro_rls.sql:83`) — bypassada pela conexão superuser em todas as actions. O que o código realmente garante: `authorizeBatch` exige super_admin e `approvedBy ≠ authorizedBy` (`approval.ts:297–312`) — governança dual "duas pessoas" existe, mas o modelo do BRAIN (designations gestor/autorizador) não. **Divergência SESSIONS × código — o registro histórico afirma um enforcement que não existe.**

### F2-F2 (MÉDIO) — Lote semanal notifica todos os diretores, não o diretor gestor

P-3.8: "Lote semanal: agrupa payables da semana, **envia email ao diretor gestor**". `approval.ts:130–134`: query por `role = 'diretor'` (todos) e e-mail para cada um (`:151–171`). Sem filtro por designation. Consequência: diretores sem designação de gestor recebem cobrança de aprovação que não lhes cabe; coerente com F2-F1.

### F2-F3 (MÉDIO) — Telas de governança sem prompt que as integre

Herdado de S1-10/S1-14 e confirmado no código: `contas-pagar/page.tsx` (fluxo lote→aprovação, o coração da governança) está fora dos arquivos permitidos do P-3.9, e as actions de aprovação (`createWeeklyBatch`, `approveBatch`, `authorizeBatch`, `markPayableAsPaid`) não terão chamador quando P-3.9 for executado como escrito. Sem patch, o módulo "fecha" com o fluxo de dinheiro operável só por teste.

### F2-F4 (BAIXO) — Limitações documentadas do parser confirmadas

`import.ts:69, 94`: CSV com `split(",")` fixo (bancos BR usam `;` — débito S-53 aberto) e split ingênuo que quebra campos entre aspas contendo vírgula. Datas DD/MM/YYYY e YYYY-MM-DD cobertas (`:105–108`).

### F2-F5 (BAIXO) — Workarounds de schema documentados e confirmados

CNPJ/nome de pagador concatenados em `notes`; `budget.name` com prefixo `"Budget: "` em `notes` (S-53, decisões registradas). Dados de negócio consultáveis presos em texto — já capturado como S1-21(ii); nenhum caso novo.

### Verificações que passaram

- Imutabilidade de `transactions` é real e em profundidade: trigger no banco + nenhuma action faz UPDATE/DELETE + estorno cria contra-transação com guarda de duplicidade (UNIQUE nas duas direções).
- `markPayableAsPaid` exige status `autorizado` e cria transação de débito imutável (`approval.ts:371–409`) — ciclo de vida do payable respeitado.
- Gates por papel presentes em 100% das actions (`colaboradorAction`/`diretorAction`/`superAdminAction`).
- Audit log em toda mutação com 19 action types.
- 0 testes no app — coerente com P-3.12 pendente (não é achado; vira achado se P-3.12 não fechar).

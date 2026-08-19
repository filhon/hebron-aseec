# 05 — RESUMO EXECUTIVO

**Auditoria final pré-produção · Ecossistema Hebron Aseec · 2026-08-19**
Escopo: 9 apps, 10 packages, 92 migrations, 102 tabelas, 314 policies RLS, ~220 Server Actions.
Método: read-only, adversarial, com evidência em `arquivo:linha` para cada achado.

---

# VEREDITO: **NO-GO**

Existe **1 achado P0 aberto**. A regra é objetiva: qualquer P0 impede produção.

O P0 não é uma falha de arquitetura nem um problema difícil. É uma **tela que falta**:

> O sistema aceita pedidos de exclusão de dados pessoais e **não tem nenhum caminho para atendê-los**. `executeDataDeletion` e `rejectDataDeletion` existem, estão testados e não têm um único chamador em `apps/`. Nenhuma tela lista `public.data_deletion_requests`. O titular clica, o ticket é gravado, e ninguém no sistema consegue resolvê-lo.
> — `[D8-001]`

Isso é pior do que não oferecer o botão: o banco acumula prova documental, datada e justificada, de solicitações que a organização não cumpre — exatamente o registro que uma fiscalização da ANPD leria primeiro. As duas funções necessárias já estão prontas e testadas; falta a UI e duas server actions. **Escopo de uma sessão.**

Fechado o P0, o veredito passa a **GO COM RESSALVAS**, com os 15 P1 endereçados pelos pacotes 2 a 7 do backlog.

---

## Contagem de achados

### Por severidade

| Severidade | Qtd    | O que são                                                                        |
| ---------- | ------ | -------------------------------------------------------------------------------- |
| **P0**     | **1**  | LGPD: direito de exclusão sem caminho de execução                                |
| **P1**     | 15     | 7 ausências de entregável v1, 4 costuras rompidas, 2 de produção, 2 de qualidade |
| **P2**     | 15     | Robustez, escala, gates residuais, desvios de especificação                      |
| **P3**     | 10     | Consistência, código morto, registro                                             |
| **Total**  | **41** |                                                                                  |

### Por domínio

| Domínio                          | Qtd | P0  | P1  | P2  | P3  |
| -------------------------------- | --- | --- | --- | --- | --- |
| Verificação negativa (ausências) | 12  | —   | 7   | 4   | 1   |
| D1 — Autorização e multi-tenancy | 6   | —   | 2   | 3   | 1   |
| D2 — Integridade de dados        | 2   | —   | 1   | 1   | —   |
| D3 — Costuras do monorepo        | 3   | —   | —   | —   | 3   |
| D4 — Incompletude disfarçada     | 5   | —   | 1   | 4   | —   |
| D5 — Jobs, idempotência e cache  | 3   | —   | —   | 2   | 1   |
| D6 — Drift PRD ↔ código          | 4   | —   | —   | 1   | 3   |
| D7 — Padrões e APIs              | 1   | —   | 1   | —   | —   |
| D8 — Produção e LGPD             | 3   | 1   | 1   | —   | 1   |
| Fluxos ponta a ponta (FLX)       | 2   | —   | 2   | —   | —   |

---

## Top 10 riscos

| #   | Achado                                                           | Por que está aqui                                                                                                                                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **`[D8-001]` LGPD sem caminho de execução**                      | Único P0. Risco legal com prazo e sanção; o próprio banco documenta o descumprimento.                                                                                                                                                                                                                                          |
| 2   | **`[FLX-001]` Projeto aprovado sem pagamentos**                  | `onProjectApproved` roda em fogo-e-esquece nos seus 2 call sites — o BRAIN §7 proíbe isso nominalmente para mutação crítica, e as outras 4 integrações obedecem. Se falhar (ou se o container congelar antes da promise resolver), o projeto fica aprovado e nenhum payable existe. Nada avisa.                                |
| 3   | **`[D2-001]` `ON DELETE CASCADE` de `auth.users`**               | Um clique em "Delete user" no painel do Supabase apaga 17 tabelas, incluindo `public.consents` (a prova de base legal) e `plataforma.certificates` (verificáveis publicamente). A única coisa que hoje freia a cascata é `projetos.votes` ter ficado sem cláusula `ON DELETE` — proteção acidental que só cobre quem já votou. |
| 4   | **`[NEG-004]` P-9.5 nunca executado**                            | Os 13 critérios do prompt de deploy estão `[ ]`. Não há `deploy.yml` nem `vercel.json`. Por definição, bloqueia go-live.                                                                                                                                                                                                       |
| 5   | **`[D1-002]` Signed URL de comprovante fiscal sem autenticação** | `createReceiptSignedUrl` é exportada de arquivo `"use server"` — logo, um Server Action invocável — e vai direto ao service role sem checar sessão, papel ou o formato do path. O caso concreto é o colaborador cujo papel foi revogado.                                                                                       |
| 6   | **`[NEG-007]` Zero observabilidade**                             | 9 apps indo a produção sem Sentry, Axiom, PostHog ou Better Stack. Combinado com `[D4-004]`, um erro em produção é invisível ao usuário _e_ à equipe.                                                                                                                                                                          |
| 7   | **`[D4-004]` As 267 mensagens de erro nunca chegam ao usuário**  | Nenhum app define `handleServerError`; a biblioteca substitui tudo por _"Something went wrong while executing the operation."_ Um diretor barrado pela governança dual lê uma frase em inglês. Contradiz P-9.4, que marcou "tom institucional consistente" como cumprido.                                                      |
| 8   | **`[NEG-008]` Sem security headers**                             | Nenhum `headers()` em `packages/config/src/next.ts`; os 9 apps herdam. Sem `frame-ancestors`, as telas de aprovação financeira e votação podem ser embutidas em iframe de terceiro.                                                                                                                                            |
| 9   | **`[FLX-002]` Impersonação não impersona**                       | Declarada **ESSENCIAL** no BRAIN §6.1. Toda a moldura existe (HMAC, expiração, audit, banner) e `resolveSession` nunca lê o cookie. O audit registra que a impersonação aconteceu; ela não aconteceu.                                                                                                                          |
| 10  | **`[NEG-003]` P-9.0 (migração do legado) não existe**            | Declarado escopo v1 e pré-condição de P-9.5, sem prompt e sem código. Os ~150 usuários atuais não têm caminho de entrada no sistema novo.                                                                                                                                                                                      |

---

## Padrões sistêmicos

Cinco padrões explicam a maioria dos 41 achados. Corrigir a causa vale mais que corrigir os sintomas.

### A — "A primitiva foi entregue; a porta nunca foi aberta" (5 achados, inclui o P0)

`[D8-001]`, `[D8-002]`, `[FLX-002]`, `[NEG-012]`, e o `parent_project_id` de `[NEG-002]`.

Em cada caso existe uma implementação correta, testada e sem nenhum consumidor: `executeDataDeletion` sem tela, `logPiiAccess` sem chamador, o cookie de impersonação sem ninguém que o honre, o player HLS sem pipeline de upload, a coluna de renovação que nada preenche.

**Causa raiz:** os prompts são delimitados por "arquivos permitidos". Quando o consumidor natural cai fora dessa lista, a sessão entrega a primitiva, registra o débito e segue. `SESSIONS.md:12737-12744` faz isso explicitamente para os dois casos de LGPD — _"não está nos arquivos permitidos deste prompt — corretivo futuro"_. O débito é registrado com honestidade e **não tem dono nem prazo**; nada o transforma em prompt.

**Correção sistêmica:** um débito registrado numa sessão deve virar linha em `PROMPTS.md` na mesma sessão. E o critério de aceite de um prompt que entrega primitiva precisa exigir o chamador, ou declarar o prompt sucessor pelo nome.

_Nota de calibração:_ este mesmo padrão já foi atacado com sucesso nas Server Actions — P-2.8c, P-3.9c, P-3.8c e P-1.16c fecharam a classe inteira, e a varredura desta auditoria confirmou **zero actions órfãs** hoje. O que ficou de fora foram as primitivas em `packages/`.

### B — "A camada declarada existe em 1 app de 9" (3 achados)

`[D1-001]` middleware (1 de 9), `[D4-002]` fronteira de erro (3 de 9), `[D3-002]` gate de sessão copiado em 12 variantes.

**Causa raiz:** não há um pacote de infraestrutura por app. Cada app reimplementa ou pula. `PROMPTS.md:952` chega a afirmar como fato consumado que "o middleware de cada app bloqueia o acesso" — a spec assumiu uniformidade que nunca foi construída.

**Correção sistêmica:** Pacote 3 do backlog — infra de app compartilhada em `packages/auth`, montada nos 9.

### C — "Onde o banco impõe, não deriva; onde só o código impõe, deriva" (contraste, não achado)

Este é o padrão mais útil do relatório, e ele aparece como **contraste entre o que deu certo e o que não deu**:

| Regra                       | Imposta por                                    | Resultado             |
| --------------------------- | ---------------------------------------------- | --------------------- |
| Imutabilidade de lançamento | trigger + grant + ausência de policy           | ✅ íntegra (`FLX-03`) |
| Estorno único               | `UNIQUE original_transaction_id`               | ✅ íntegra            |
| Double-booking de flat      | `EXCLUDE USING gist ... WHERE status IN (...)` | ✅ íntegra            |
| Voto duplo                  | `UNIQUE (project_id, user_id)`                 | ✅ íntegra            |
| Aprovação pendente única    | índice único parcial                           | ✅ íntegra            |
| **Conflito de interesse**   | só código, em 1 de 3 portas                    | ⛔ `[D6-002]`         |
| **Redação de PII no audit** | lista de strings mantida à mão                 | ⚠️ `[D8-003]`         |
| **Papel para contestar**    | só RLS; gate de action ausente                 | ⚠️ `[D1-004]`         |
| **Hard delete de usuário**  | nada — CASCADE permite                         | ⛔ `[D2-001]`         |

Toda regra que foi empurrada para o Postgres sobreviveu a 256 sessões sem drift. Toda regra que ficou só em TypeScript derivou. Não é uma coincidência do projeto; é o argumento a favor da decisão B (PATCH-004) que o próprio BRAIN já tomou, aplicado com mais rigor.

### D — "Falha silenciosa como comportamento padrão" (5 achados)

`[FLX-001]` fogo-e-esquece, `[D4-001]` catch que vira 400, `[D4-004]` mensagem substituída, `[D5-001]` e-mail não reenviado no retry, `[D1-005]` UPDATE que pode virar no-op sem sinal.

Em todos, o sistema **prossegue reportando sucesso** enquanto algo não aconteceu. E como não há Sentry (`[NEG-007]`), o log estruturado que existe não tem destino. A combinação é o que torna o padrão perigoso: falhar em silêncio é tolerável se alguém for avisado; aqui ninguém é.

### E — "Drift de registro" (4 achados)

`[D6-001]` (3 corretivos "pendentes", nenhum pendente de fato), `[NEG-003]` (P-9.0 citado como pré-condição e inexistente), `[NEG-004]`, e os critérios `[x]` de P-9.2 que descrevem o teste em vez do produto.

**Causa raiz:** o critério de aceite às vezes descreve o artefato entregue, não a capacidade do produto. `[x] Exclusão executada anonimiza PII de verdade (teste fim-a-fim com usuário fixture)` é literalmente verdadeiro — e o produto não faz. Uma auditoria por fase nunca pegaria: o teste passa.

**Correção sistêmica:** critérios de aceite redigidos do ponto de vista do usuário ("o super_admin consegue executar o pedido"), não do artefato ("o teste passa").

---

## O que está bom (calibração)

Um relatório com 41 achados precisa dizer o que **não** encontrou, ou a diretoria não consegue dimensionar o risco. Verificado e íntegro:

- **RLS: 102 de 102 tabelas** com row level security habilitada, 314 policies vivas. Nenhuma exceção. Das 11 policies `USING(true)`, todas são SELECT sobre dado genuinamente público (catálogo da rádio, taxonomia do portal de documentos).
- **Cruzamento escrita × policy:** de todo `.update()`/`.delete()` do Drizzle no monorepo, **um único** caso escreve onde não há policy — e é o `[D1-005]`, que hoje funciona por usar o handle superuser.
- **Imutabilidade financeira:** imposta por trigger, grant e ausência de policy — três mecanismos independentes no banco. `FLX-03` (estorno) é o único fluxo desta auditoria íntegro em **todos** os elos.
- **Governança dual:** `BRAIN.md` §6.5 implementada corretamente, incluindo a checagem explícita de que o autorizador difere do aprovador.
- **Sigilo do voto:** preservado. `withSystemRole` eleva só a leitura agregada e devolve contagens, nunca identidade.
- **Zero Server Actions órfãs** entre as ~220 do ecossistema.
- **Zero `any`, zero `@ts-ignore`, zero `TODO/FIXME/HACK`** em código de produção.
- **Zero segredos** em bundle de cliente; toda `NEXT_PUBLIC_*` justificada.
- **`pnpm turbo lint` passa integralmente** (19/19 workspaces).
- **Isolamento entre apps** verificado por script no CI (`check:cross-app-imports`) — nenhum import relativo atravessando.
- **Versões unificadas por catalog** para as três dependências que já causaram drift, com o motivo documentado no `pnpm-workspace.yaml`.
- **Nenhuma redução silenciosa de escopo:** a busca por "por enquanto / simplificado / provisório" em todo o código retornou 2 hits, ambos legítimos. As ausências deste ecossistema são prompts que nunca foram escritos — não implementações amputadas.

A qualidade do código é consistentemente alta e a disciplina de convenções é real. **As falhas se concentram nas costuras** — entre a action e a integração cross-app, entre a primitiva e a tela, entre o cookie e a sessão, entre o registro e a leitura. É precisamente o tipo de defeito que uma auditoria por fase não vê, porque cada lado da costura passa no seu próprio critério de aceite.

---

## Caminho recomendado até o GO

| Ordem | Pacote                                                   | Esforço estimado                         | Resultado                                             |
| ----- | -------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| 1     | **Pacote 1** — LGPD                                      | 1 sessão                                 | **Remove o P0.** Veredito passa a GO COM RESSALVAS    |
| 2     | **Pacote 2** — costuras que perdem dinheiro e registros  | 1–2 sessões                              | Fecha os 3 riscos de perda silenciosa                 |
| 3     | **Pacote 4** — erros que o usuário lê + CI verde         | 1 sessão                                 | Devolve o portão de qualidade e a microcopy           |
| 4     | **Pacote 7** — decisão sobre escopo v1 pendente          | 1 sessão de decisão + N de implementação | Elimina o drift entre BRAIN e realidade; libera P-9.0 |
| 5     | **Pacote 3** — middleware                                | 1 sessão                                 | Restaura a camada 1 nos 9 apps                        |
| 6     | **Pacote 6** — impersonação: implementar ou revogar      | decisão + 1 sessão                       | Encerra a divergência entre o BRAIN e o audit log     |
| 7     | **Pacote 5** — P-9.5 com headers, Sentry e rate limiting | 1–2 sessões                              | **Go-live**                                           |
| 8     | Pacotes 8–11                                             | pós-produção                             | Robustez, gates residuais, IA, higiene                |

Duas observações sobre a ordem. **P-9.0 (migração do legado) está dentro do Pacote 7 e é pré-condição de P-9.5** — se ficar para depois, o go-live acontece com uma base de usuários vazia. E o **Pacote 5 é o último de propósito**: security headers e Sentry só valem se instalados sobre um código cujas costuras já foram fechadas — colocar observabilidade antes serviria apenas para assistir as falhas dos pacotes 2 e 4 acontecerem.

---

## Como este relatório foi produzido

Todos os achados citam `arquivo:linha` com trecho literal de arquivo aberto nesta sessão. Nenhum foi registrado a partir de memória de API: as duas afirmações que dependem de comportamento de biblioteca foram verificadas no código-fonte do pacote **instalado** (`next-safe-action@7.10.8` em `dist/index.mjs:1008-1014`; `next@15.5.18`, `openai@4.104.0`).

As ausências (`NEG-*`) declaram os locais e padrões pesquisados e distinguem busca exaustiva de busca parcial — todas as 12 são exaustivas.

A matriz de RLS, o cruzamento escrita × policy, o mapa de FKs sem índice e o inventário de Server Actions órfãs foram produzidos por scripts sobre os 92 arquivos `.sql` e todo o código de `apps/` e `packages/`, não por amostragem.

`pnpm turbo lint` e `pnpm turbo typecheck` foram executados. Registro o método porque ele quase escondeu o `[D7-001]`: **rodar `pnpm turbo typecheck | tail` reporta exit 0** — o código de saída é o do `tail` — e a saída truncada mostra apenas pacotes bem-sucedidos. A falha só aparece lendo o conteúdo do arquivo de saída.

### Saídas desta auditoria

```
AUDIT/
├── 00-VARREDURA.md              — Fase 0: varredura mecânica, todo hit triado
├── 01-VERIFICACAO-NEGATIVA.md   — Fase 1: 12 ausências + contra-prova do que existe
├── 02-DOMINIOS/
│   ├── D1-autorizacao.md        — matriz RLS 102×4, mapa de service role, 85 withSystemRole
│   ├── D2-dados.md              — constraints, moeda, imutabilidade, CASCADE, índices
│   ├── D3-monorepo.md           — isolamento, Zod, design system, deps
│   ├── D4-incompletude.md       — código morto, paginação, N+1, mensagens de erro
│   ├── D5-jobs-cache.md         — idempotência, uploads, camada de IA
│   ├── D6-drift-prd.md          — máquina de estados, validações, conflito de interesse
│   ├── D7-padroes.md            — Next 15, versões, CI
│   └── D8-producao-lgpd.md      — headers, PII, LGPD ponta a ponta
├── 03-FLUXOS.md                 — Fase 3: 8 fluxos críticos rastreados elo a elo
├── 04-BACKLOG-CORRECAO.md       — Fase 4: 11 pacotes prontos para virar prompt
└── 05-RESUMO-EXECUTIVO.md       — este arquivo
```

# AUDIT/RELATORIO — Relatório consolidado da auditoria

**Fase:** 5 (consolidação) · **Data:** 2026-07-02 · **Auditor:** agente Fable 5 (read-only fora de `AUDIT/`)
**Fontes:** `00-inventario.md`, `01-specs.md`, `02-codigo-*.md` (síntese + 5 detalhados), `03-tecnico.md`, `04-prompts-pendentes.md` + `patches/` (43 arquivos), com as respostas do Filipe às perguntas das Fases 0–4 incorporadas como decisões registradas.

---

## 1. Sumário executivo

O projeto declara 54 de 123 unidades de prompt concluídas (~42%). A auditoria confirmou que **tudo que foi declarado existe como arquivo — e nada declarado está inteiramente operante**. O problema do Hebron Aseec hoje não é código faltante: é código desconectado da UI, segurança declarada em camadas que não executam e um registro histórico (SESSIONS/PROMPTS) que não sobrevive à verificação contra o código.

O que está genuinamente sólido: as migrations e a RLS como artefatos SQL (deny-by-default consistente, policies granulares, triggers de imutabilidade financeira), os 11 conjuntos de testes de integração reais (admin, documentos, projetos), o design system pós-P-0.2b, o TypeScript (zero `any`, zero `@ts-ignore` em produção), a validação de borda com next-safe-action + Zod em 100% das actions, e o desenho do `packages/auth`. A fundação de qualidade existe.

O que está quebrado se divide em três estratos:

1. **Runtime quebrado em silêncio (3 críticos técnicos).** A resolução de sessão copiada à mão em admin/projetos/financeiro não funciona — toda Server Action com gate nega acesso inclusive a usuários logados (F3-03). O enum de auditoria no banco não tem os valores de projetos/financeiro — a trilha de auditoria dos dois módulos de governança é permanentemente vazia, com o erro engolido (F3-02). E as partições de `admin.audit_log` acabam em **2026-08-01** sem job que crie as próximas — prazo físico a 30 dias (F3-01). Nada disso foi percebido porque não há CI, o financeiro tem zero testes e as suítes existentes mockam exatamente a camada de sessão.
2. **Exposição de dados em todo app deployável (4 críticos de segurança).** Admin inteiro legível por anônimo (CPF, e-mails, audit log), documentos `internal`/`restricted` servidos sem sessão, área editorial sem autenticação, score IA visível a submissor autenticado. A RLS correspondente está correta e testada — a exposição existe porque as páginas leem via conexão superuser sem gate próprio. Mitigante: nada está deployado (confirmado pelo Filipe); condição absoluta antes de qualquer deploy.
3. **Produto inoperante sob dashboards vivos.** Em Projetos, 3 de 17 actions têm caminho de UI; kanban não persiste; relatório é botão morto; nenhuma pessoa nova consegue entrar no sistema (convite aponta para rota inexistente, auto-signup não existe); a governança dual do financeiro não checa designation em nenhuma camada executável; ~26 componentes do Bloco A viraram código morto.

As causas são sistêmicas, não incidentes (5 padrões na §3), e os 69 prompts pendentes — escritos antes do código existir — **reproduziriam todos esses padrões em 5 módulos novos** se executados como estão. A Fase 4 produziu o antídoto: 16 prompts corretivos novos (Ondas 0–2), patches para 49 prompts pendentes e 5 prompts de feature decorrentes de decisões já tomadas pelo Filipe.

**Veredito de prontidão (detalhe na §6): NÃO como está; SIM após a Onda 0** — com P-0.7 executado antes de 2026-08-01. O plano de retomada da §4 é executável imediatamente.

---

## 2. Achados por severidade

Consolidação com deduplicação: achados de fases diferentes sobre a mesma causa aparecem numa linha, com todos os IDs de origem. Evidência completa (arquivo:linha) nos relatórios de origem indicados.

### 2.1 CRÍTICOS (11)

| # | IDs de origem | Achado · localização | Evidência (resumo) | Impacto | Recomendação |
| --- | --- | --- | --- | --- | --- |
| C-1 | F3-01 | **Partições do audit_log acabam em 2026-08-01**; job prometido (Inngest) não existe · `0002_admin.sql:64-78` | 3 partições (05–07/2026), sem DEFAULT; grep `inngest` no código: zero | A partir de 01/08, toda mutação auditada de admin/documentos **falha**; projetos/financeiro perdem auditoria em silêncio | **P-0.7 antes de 2026-08-01**: partições até 2027 + DEFAULT + `pg_cron` (decisão F3-Q1a) |
| C-2 | F3-02 | **Auditoria de projetos e financeiro nunca grava**: enum `admin.audit_action` sem os valores desses módulos; erro engolido por catch · `apps/{projetos,financeiro}/src/lib/audit.ts` | Nenhum `ALTER TYPE` com valores `project.*`/`financeiro.*` em migration; schema TS diverge do banco; únicos 2 `as unknown as` do monorepo marcam o drift | Trilha de auditoria dos módulos de votação e dinheiro permanentemente vazia, sem alarme | P-0.7 (`ADD VALUE IF NOT EXISTS`) + semântica decidida (F3-Q4): falha de audit **aborta** a operação em módulos de governança |
| C-3 | F3-03, F3-08 | **Gate de sessão de admin/projetos/financeiro rejeita todo mundo**: resolução manual de sessão via header `cookie` que o GoTrue ignora · `safe-action.ts` dos 3 apps (2 cópias byte a byte) | Verificado em `GoTrueClient.js`: sem sessão em memória, `getUser()` falha sem consultar servidor; documentos usa `@hebron/auth` e funciona | Nenhuma Server Action gated dos 3 apps funciona em runtime; P-3.9/P-2.9c fiariam UI em actions que negam sempre | P-0.8: kit único em `@hebron/auth` (padrão documentos), apagar as cópias, 1 teste de sessão sem mock por app |
| C-4 | F2-A1 | **Admin inteiro sem proteção de leitura** · `(dashboard)/layout.tsx:13-53`; sem middleware | Layout não autentica; páginas RSC leem via superuser | Anônimo lê nome/e-mail/CPF/telefone de todos, audit log, convites | P-1.25 (gate super_admin no layout) + P-0.10 (leituras via client authenticated) — **antes de qualquer deploy** |
| C-5 | F2-D1 | **Portal de documentos serve `internal` a anônimos e `[slug]` não filtra visibility** · `page.tsx:238-239`, `[slug]/page.tsx:141-198` | Filtro hardcoded public+internal sem sessão; `restricted` renderizado + signed URL por slug | Documento restrito acessível a qualquer um com o link | P-1.27 + P-0.10 (a RLS de P-1.19, correta, passa a executar) |
| C-6 | F2-D2 | **Área editorial sem nenhuma autenticação** · `editorial/layout.tsx` | Grep auth: zero; label "Acesso restrito" decorativa | Rascunhos e KPIs expostos a anônimos | P-1.27 (gate editor/super_admin) |
| C-7 | F2-P4 | **Submissor autenticado vê score IA, breakdown e votos** · `(diretoria)/layout.tsx:11-14`, `pipeline/[id]/page.tsx:122-124` | Área exige só login; `role="diretor"` hardcoded; SESSIONS (S-38/39) afirmava enforcement que não existe | Viola BRAIN §6.2 (score oculto de submissor; voto secreto) | P-2.9c (gate de papel + papel real nas queries) + P-0.10 |
| C-8 | F2-A3, S1-05 (O-1/O-2) | **Nenhuma pessoa nova consegue entrar no sistema** · `actions/invitations.ts:59,142-227` | E-mail de convite aponta p/ `/convite` (rota inexistente); `acceptInvitation` não cria conta nem papéis; auto-signup e migração do legado sem prompt (lacunas confirmadas, F0-Q7) | Go-live impossível; módulo Projetos inutilizável por submissor real | P-1.26 (convite fim-a-fim + auto-signup + aprovação) e P-9.0 (migração dos ~150 usuários) |
| C-9 | S1-01 | **Teto de orçamento por instituição sem dono**: BRAIN diz "no Financeiro"; código usa workaround `admin.system_settings`; P-3.x pendentes não o criam | S-40 prometia `financeiro.organization_budgets` — tabela não existe em prompt algum | Regra central Projetos↔Financeiro calcificaria como JSONB de settings sem UI nem trilha | Decidido (F1-Q1): `organization_budgets` + UI no P-3.8b; `checkBudget` migra; PATCH registrado |
| C-10 | S1-02, F3-05, S1-08 | **"Defense in depth" não executa**: conexão superuser bypassa RLS em 100% das actions/leituras; zero GRANTs; middleware (camada 1) só no intranet | BRAIN §9 promete 3 camadas; módulos operam com 0–1 | Decisão adiada a P-9.1 faria ~30 prompts herdarem o padrão | Decidido (F1-Q2): **opção B** (authenticated+JWT). P-0.10 cria grants + corrige policies + adota client authenticated; G5 patcheado com gate de papel |
| C-11 | S1-03, F3-09 | **LGPD como retrofit**: PII e dado de saúde (Flats, sensível — art. 5º II) especificados antes de qualquer base de consentimento; audit imutável guarda PII em diffs; imutabilidade × direito de exclusão sem resolução | Grep consent em código: zero; P-9.2 era o único prompt, no fim do plano | Fases 6–7 coletariam dado sensível sem consentimento; direito de eliminação inexecutável | Decidido (F1-Q4, F3-Q5): P-0.13 (consents, anonimização, política de PII em diffs, emenda ao BRAIN) **antes das fases 6–7** |

### 2.2 ALTOS (16)

| # | IDs de origem | Achado | Correção prevista |
| --- | --- | --- | --- |
| A-1 | S1-04, F3-06, F3-07, F2-M2 | Banco novo não se reconstrói: 0000 duplicada (users nasce **sem FK** para auth.users — silencioso), `0009_financeiro_rls` ordena antes de `0010_financeiro` (falha alto); drizzle-kit abandonado (journal só conhece a 0000); numeração dos prompts pendentes já colide | P-0.7 (saneamento) + P-0.11 (drizzle-kit reconciliado, decisão F3-Q7) + `patches/migracoes-numeracao.md` (13 prompts) |
| A-2 | S1-06, F3-01, CS-5 | Infra Inngest pressuposta por 8+ features (recorrência, briefing, lembretes, snapshot) e criada por nenhum prompt; critérios [~] acumulados nunca fecham | P-0.14 (`packages/jobs` + crons pendentes das fases 1–3) |
| A-3 | S1-07, F2-M1 | MFA "obrigatório" para super_admin/diretor sem enrollment nem enforcement (challenge só para quem já tem TOTP) | Decidido (F1-Q5): bloqueante com tela de enrollment — P-1.26 |
| A-4 | S1-09, CS-6 | Contrato cross-app indefinido; prompts pendentes mandam app importar app (proibido); `createAutoTask` nasceria em `apps/tarefas` consumida por 5 apps | P-0.15 (`packages/integrations` + contrato de settings) + patches nos 6 prompts |
| A-5 | S1-10, S1-14, F2-F3 | P-3.9 inexecutável sem suposição: faltam `contas-pagar` (governança dual!), 4 telas do escopo do P-3.3, arquivos G5, padrão RSC | `patches/P-3.9.md` (decisão F1-Q9: as 4 telas entram) |
| A-6 | S1-11 | Bloqueio de pagamentos por inadimplência de relatório: regra do BRAIN sem mecanismo em prompt algum (risco de virar só e-mail) | `patches/P-3.11.md` (estado bloqueado + checagem no lote + override auditado) |
| A-7 | F2-P1 | Projetos: 3/17 actions com caminho de UI; submeter, transições, contestação, pânico, avaliação, organizações e relatórios sem fiação; kanban `console.log` | P-2.9c (critérios de operabilidade fluxo a fluxo) |
| A-8 | F2-A4, PD-2 | ~26 componentes do Bloco A órfãos nos 4 apps (incl. TanStack Table e RHF prometidos na stack); 3 formulários com submit falso (`setTimeout`); a UI validada não é a que roda | Decidido (F2-Q6): reconectar — P-1.25/P-1.27/P-2.9c + critério "zero órfãos" nos P-X.9 patcheados |
| A-9 | F2-F1, F2-F2 | Governança dual do financeiro sem designation em camada executável (`approveBatch` aceita qualquer diretor); SESSIONS afirmava o contrário; e-mail de lote para todos os diretores | Decidido (F2-Q4): modelo do BRAIN é o alvo — P-3.8b |
| A-10 | F3-11, F3-19 | Importação bancária: `confirmImport` persiste linhas reenviadas pelo **cliente** (adulteráveis); extrato original nunca armazenado (retenção legal: 5 anos, F3-Q6); parser CSV ingênuo | P-3.8b (re-parse server-side + upload a bucket de P-0.12) |
| A-11 | F2-A2 | `resetPassword` gera link de recovery e o descarta; ação reporta sucesso, usuário não recebe nada | P-1.25 |
| A-12 | F2-D4, F2-P3, S1-25 | Cadeias mortas: assinatura→publicação→e-mail sem elo vivo (documentos); edital→wizard aberto nas duas pontas "concluídas" (prefill nunca lido) | P-1.27 + P-2.9c |
| A-13 | F3-04, F3-15, F3-18 | Policies que viram exposição na decisão B: `invitations_select_by_token USING (true)` expõe token (tomada de conta); `WITH CHECK (true)` sem `TO` vale para `anon` | P-0.10 (DROP/`TO service_role`) — pré-requisito da virada |
| A-14 | F3-08, F3-12 | Transversais copiados por app e já divergentes: sessão ×3, audit ×4 (semânticas de erro opostas), notificações ×3; supabase-js em 2 versões (60 minors) | P-0.8 |
| A-15 | F3-10 | Sem CI (`.github/` não existe, contradiz CLAUDE.md); financeiro com **zero** testes e sem script `test`; packages compartilhados sem testes; suítes mockam a camada onde vive C-3 | P-0.9 (CI + migrations em banco efêmero) + patch P-3.12 |
| A-16 | F2-X1, S1-15, S1-16 | Registro histórico não confiável: ~14,8k linhas em commits sem sessão (`3be389f`, `a088f6c`), 6 anomalias estruturais no SESSIONS, PATCHES/ vazio com 3+ decisões mudadas | P-0.16 (retificação + PATCHes retroativos, autorizado F0-Q4) |

### 2.3 MÉDIOS (resumo — detalhe nos relatórios de origem)

| IDs | Tema |
| --- | --- |
| F2-P5, F2-P6 | Quórum conta atribuições, não pessoas; votação sem encerramento no caso comum → P-2.9c (decisão F2-Q5: fechamento manual pelo super_admin) |
| F2-A5, F2-M4 | Reuniões com 4 botões mortos e actions sem chamador; `bank-account-form` segue morto → P-1.25 / P-3.9 |
| F3-13 | Cookie de impersonação forjável (sem MAC) — polui trilha, não escala privilégio → assinar (HMAC) no P-0.8 |
| F3-14 | Pool postgres novo a cada render em `convites/page.tsx` — esgotamento de conexões → P-0.8 |
| S1-12, S1-13 | Contradições internas do BRAIN sobre IA (embeddings v1×v2+; scoring flats; renovação) → decidido (F1-Q3): prompts P-2.13, P-2.14, P-7.13 |
| S1-17 | "Validação da diretoria OK" sem critério nem registro → 1 linha no SESSIONS por Bloco A (processo, custo zero) |
| S1-18–S1-24 | Consumo de settings sem contrato (→P-0.15); avaliador por afinidade (→v1.x, D-7); export PDF+XLSX+ZIP (→P-3.10, F1-Q7); Google Calendar (→P-5.13, feed ICS, D-2); representação monetária/JSONB/Storage implícitos (→P-0.12 + BRAIN); erro e a11y sem padrão (→BRAIN + critérios); scope creep decidido em D-5; semânticas de KPI definidas (doações F1-Q10; audiência D-3 heartbeat) |
| F2-M3 | Higiene de tokens: hex maiúsculo escapou do grep; aliases deprecated em código novo → patches leves |

### 2.4 BAIXOS (agrupado)

Drawer/Tooltip nunca criados; `packages/config` stub (validação de env prometida na S-1 — teria mascarado menos o C-3); client drizzle tipado só com schema public; `financeiro-stubs.ts` morto; actions inline com `formData.get(...) as string` (mitigado); FAQ hardcoded; `documentos.views` sem retenção (LGPD, → P-0.13); higiene de specs (S1-26: contadores, versões de modelo, i18n nunca declarado, PRODUCT.md com 2 divergências). Todos endereçados em P-0.8/P-0.13/P-0.16/patches-leves.

---

## 3. Padrões (o que explica a maioria dos achados)

**PA-1 — A camada declarada não é a camada que executa.** RLS excelente que nenhuma query avalia (conexão superuser), policies `TO authenticated` sem grants, gate de sessão que nega todo mundo, enum de audit sem os valores usados, "3 camadas obrigatórias" com 0–1 ativas. Em toda dupla intenção/execução, a execução é outra. Explica C-2…C-7, C-10, A-13. *(PD-3 + PT-1)*

**PA-2 — "Concluído" significa leitura viva, operação morta — e o Bloco A vira código morto.** Os P-X.9 foram cumpridos como "substituir mocks": dashboards leem dados reais, mutações críticas ficam sem fiação (3/17 actions, botões mortos, kanban cosmético), e os componentes validados do Bloco A são abandonados em reescritas inline. Explica C-8 parcial, A-7, A-8, A-11, A-12. É o padrão que os P-4.9–P-8.9 repetiriam sem os patches. *(PD-1 + PD-2)*

**PA-3 — Cópia local em vez de package compartilhado; cada cópia apodrece sozinha.** Sessão ×3 (o bug crítico existe em triplicata), audit ×4 com semânticas de erro opostas (fail-silent justamente nos módulos de governança), notificações ×3, duas versões de supabase-js. Explica C-3, parte de C-2, A-14. *(PT-2 + PT-4)*

**PA-4 — Infra prometida em comentário ou spec, nunca criada; débito sem dono.** "Inngest cria as partições" (não existe), "added via ALTER TYPE in P-2.8 migration" (não existe), "URL stored after upload" (placeholder), CI declarado no CLAUDE.md (`.github/` não existe), débitos remetidos a prompts que não os cobrem. Comentários e checklists deste projeto não são evidência. Explica C-1, C-2, A-2, A-15, parte de A-16. *(PT-3 + PD-4)*

**PA-5 — O registro histórico subrepresenta e às vezes contradiz o código.** Milhares de linhas sem sessão; SESSIONS afirmando enforcement que o código não contém (score, designation); critérios [x] que não sobrevivem à verificação em ~8 prompts; PATCHES/ vazio. Consequência operacional: **nenhum [x] do PROMPTS.md é fato sem verificação pontual** — regra que esta auditoria aplicou e que o processo pós-retomada precisa institucionalizar (critérios de operabilidade + CI). *(PD-5)*

---

## 4. Plano de correção priorizado

Ordem confirmada pelo Filipe (F4-Q7). Detalhe integral: `04-prompts-pendentes.md` §4/§9 e `patches/`.

### 4.1 Antes de retomar qualquer implementação (bloqueante, sequencial)

**ONDA 0 — estancar:**

1. **P-0.7 — Resgate do banco** · **URGENTE, prazo físico 2026-08-01** (partições) · também: enum de audit, 0000 duplicada, renumeração 0009→0011
2. **P-0.8 — Kit de backend compartilhado** (sessão/audit/notificações em package; sem ele, toda action nova nasce quebrada)
3. **P-0.9 — CI mínimo** (trava regressões antes do volume de correções)
4. **P-0.10 — Decisão B: RLS ativa** (grants + fixes de policies + leituras authenticated — fecha C-4…C-7 e C-10 pela raiz)
5. **P-0.11 — drizzle-kit reconciliado** (impede o próximo F3-02)

**ONDA 1 — tornar verdadeiros os módulos "concluídos"** (antes de P-3.9, porque as fases seguintes consomem onboarding, integrações e governança que hoje não operam):

P-0.12 (Storage) → P-1.25 (Admin protegido e fiado) → P-1.26 (onboarding + MFA bloqueante) → P-1.27 (Documentos: visibilidade real) → P-2.9c (Projetos operável) → P-3.8b (governança e conciliação verdadeiras + `organization_budgets`)

### 4.2 Em paralelo (após a Onda 0)

**ONDA 2 — fundações:** P-0.13 (LGPD — obrigatório antes das fases 6–7) · P-0.14 (Inngest — antes de P-3.10/P-4.8) · P-0.15 (`packages/integrations` — antes de P-4.11) · P-0.16 (registro retroativo: PATCHes, retificação do SESSIONS, emendas ao BRAIN — pode rodar a qualquer momento após a Onda 0).

### 4.3 Retomada do plano (com patches aplicados)

P-3.9 → P-3.10 → P-3.11 → P-3.12 · [P-2.13, P-2.14 flexíveis] · Fase 4 → Fase 5 (+P-5.13) → Fase 6 → Fase 7 (+P-7.13) → Fase 8 · P-9.0 (migração do legado) → P-9.1–P-9.5 (P-9.1 e P-9.2 reescritos — as decisões que eles tomariam já foram tomadas).

### 4.4 Aceitável adiar (com justificativa)

- **Sugestão de avaliador por afinidade (O-6)** → v1.x pós-go-live: designação manual funciona, volume baixo (D-7, confirmado).
- **Templates de e-mail com IA (O-13)** → v1.x (D-7).
- **Workspaces custom, colunas custom, checklist de inventário no check-in** → descartados (D-5, sem veto do Filipe) — contradiziam o BRAIN ou exigiam modelagem que nenhum prompt cria.
- **F3-16/F3-20 e demais BAIXOS de ergonomia** → oportunisticamente, dentro dos prompts que já tocam os arquivos.

---

## 5. Perguntas em aberto

**Nenhuma pergunta bloqueante permanece.** As 26 perguntas acumuladas nas Fases 0–4 foram todas respondidas pelo Filipe e as respostas estão incorporadas como decisões nos prompts corretivos e patches. Ficam três pontos de atenção que dependem de ação ou hábito seu, não de decisão nova:

1. **Prazo físico:** P-0.7 precisa rodar antes de **2026-08-01** — restam ~30 dias. É a primeira sessão da retomada.
2. **Lista canônica de audit actions (F3-Q2):** sua resposta ("as planejadas deverão estar nos prompts") vira regra operacional — cada P-X.6 patcheado inclui o `ALTER TYPE` do próprio módulo (CS-4). Sem decisão adicional, mas exige disciplina na execução.
3. **Registro das validações de Bloco A (S1-17):** ficou combinado o formato mínimo (1 linha no SESSIONS por bloco: "validado por Filipe em DATA, ajustes X"). Depende de você adotar o hábito a partir da Fase 4.

---

## 6. Veredito de prontidão

**O projeto está pronto para retomar a implementação dos ~70% restantes? Não como está; sim, com condições — e as condições estão prontas para execução.**

- **Não como está** porque: (a) toda Server Action gated de 3 dos 4 apps falha em runtime (C-3) — qualquer prompt de integração fiaria UI em actions mortas; (b) os prompts pendentes assumem numeração de migrations ocupada, infra inexistente e o padrão de sessão quebrado — executá-los sem patch reproduziria os achados da Fase 2 em 5 módulos novos; (c) há um prazo físico (C-1) que quebra a auditoria de admin/documentos em 2026-08-01 independentemente de qualquer retomada.
- **Sim, com condições**, porque nada encontrado é estrutural-irrecuperável: a fundação (RLS, migrations como SQL, testes existentes, design system, tipagem) é sólida; as causas são 5 padrões conhecidos com antídoto definido; todas as decisões de negócio e arquitetura que estavam em aberto foram tomadas pelo Filipe durante a auditoria; e os artefatos de correção já existem (16 corretivos redigidos com critérios verificáveis, 43 arquivos de patch em `AUDIT/patches/`).

**Condições, em ordem:**

1. Executar a **Onda 0** integralmente (P-0.7 → P-0.11), com P-0.7 antes de 2026-08-01. Nenhum prompt de feature antes disso.
2. Executar a **Onda 1** antes de P-3.9 — os módulos "concluídos" precisam ficar verdadeiros antes de construir sobre eles.
3. Aplicar os **patches da Fase 4** aos prompts pendentes antes de executá-los (nenhum P-X.9 roda no formato original).
4. **Não deployar nada publicamente** antes de P-0.10 + P-1.25/P-1.26/P-1.27 (os 4 críticos de exposição são hoje inertes só porque tudo roda em localhost).
5. P-0.13 (LGPD) antes das fases 6–7; P-0.14 (Inngest) antes de P-3.10/P-4.8; P-9.0 (migração do legado) antes do go-live.

Cumpridas as condições 1–3, a retomada não é apenas viável — o plano resultante é mais bem especificado do que o original, porque cada prompt agora carrega as decisões que antes seriam tomadas às cegas pelo implementador.

---

*Fase 5 concluída. A auditoria (Fases 0–5) está encerrada. Próximo passo operacional: sessão de implementação do **P-0.7** (redação completa em `04-prompts-pendentes.md` §4, Onda 0), em sessão nova, fora do regime read-only desta auditoria.*

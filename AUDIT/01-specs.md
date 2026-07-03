# AUDIT/01 — Auditoria das Specs (coerência interna)

**Fase:** 1 (specs — BRAIN.md, SESSIONS.md, PROMPTS.md, PRODUCT.md; entrada: `AUDIT/00-inventario.md`)
**Data:** 2026-07-02
**Auditor:** agente Fable 5 (sessão de auditoria, read-only fora de `AUDIT/`)
**Escopo:** coerência interna das specs. Nenhum veredito aqui depende de leitura de código — onde o código é citado, é via registro das SESSIONS (testemunho) ou do inventário; a verificação spec ↔ código é a Fase 2.
**Convenção de IDs:** `S1-NN`. Categorias do prompt de auditoria: (1) contradições, (2) órfãos, (3) prompts ambíguos, (4) ordem/dependências, (5) critérios de aceite, (6) decisões implícitas, (7) transversais. Cada achado indica a(s) categoria(s).

---

## Sumário por severidade

| Severidade | Qtd          | IDs                 |
| ---------- | ------------ | ------------------- |
| CRÍTICO    | 3            | S1-01, S1-02, S1-03 |
| ALTO       | 8            | S1-04 … S1-11       |
| MÉDIO      | 14           | S1-12 … S1-25       |
| BAIXO      | 1 (agrupado) | S1-26               |

Nota de honestidade: os critérios de aceite dos prompts são, no geral, **bons** — específicos, verificáveis, com listas "SEM" explícitas na Rádio e problema/contexto nos corretivos. Os achados abaixo são as exceções, não a regra. "Nenhum achado" vale para: dependências circulares entre prompts (não encontrei nenhuma).

---

## CRÍTICO

### S1-01 — Orçamento por instituição/ano: contradição BRAIN ↔ PROMPTS com workaround em calcificação `(cat. 1, 2)`

**Evidência:**

- BRAIN §6.2 ("Orçamento e instituições"): "Orçamento definido por instituição, por ano-calendário (jan-dez), **no Financeiro**. Sistema bloqueia submissão se total excede orçamento."
- P-2.8 (concluído): bloqueio implementado contra `admin.system_settings` com chave `projetos_budget_{orgId}_{year}` — S-40 registra: "quando o módulo Financeiro for construído, substituir pela query `financeiro.organization_budgets`".
- P-3.6 (concluído): criou `budgets`/`budget_items` **por centro de custo/categoria** — modelo diferente; nenhuma tabela `organization_budgets`.
- P-3.9–P-3.12 (pendentes): nenhum menciona orçamento por instituição. P-3.11 ("executado vs orçado em tempo real") fala do orçamento por centro de custo, não do teto de submissão.
- Filipe confirmou (Fase 0, pergunta 7): não foi adiamento consciente — é lacuna.

**Impacto:** a regra de negócio central que liga Projetos ao Financeiro (teto de submissão) não tem dono. Se P-3.9–3.12 forem executados como estão, o Financeiro "fecha" sem a tabela, o workaround via `system_settings` vira permanente sem decisão, e o super_admin terá que manter orçamentos por instituição num campo JSONB de configurações — sem UI, sem audit trail financeiro, sem relação com `budgets`.

**Recomendação:** antes de P-3.9, decidir o modelo (proposta: `financeiro.organization_budgets(organization_id, year, amount)` + UI no Financeiro + `checkBudget` do Projetos passando a consultar essa tabela) e criar prompt corretivo P-3.6b ou incluir no patch de P-3.11. Registrar PATCH.

---

### S1-02 — Postura RLS × conexão superuser: decisão adiada para o último prompt contradiz princípio inviolável `(cat. 1, 4)`

**Evidência:**

- BRAIN §9 ("Princípios invioláveis"): "**Defense in depth:** RBAC + RLS sempre, nunca apenas um."
- BRAIN §3 (⚠️ Decisão técnica pendente): admite que hoje as Server Actions conectam via `DATABASE_URL` (superuser), **bypassando RLS** — a camada 3 protege só o canal direto. Decisão (A) vs (B) delegada a P-9.1.
- P-9.1 é o penúltimo prompt do plano (após Fases 4–8). Todos os Bloco B pendentes (Tarefas, Intranet, Plataforma, Flats, Rádio — ~30 prompts) herdarão o padrão superuser antes da decisão.
- S-15 registra a origem do padrão: "Conexões diretas via `DATABASE_URL` em todos os actions para contornar RLS".

**Impacto:** se a decisão em P-9.1 for (B) — actions como `authenticated` com JWT —, o retrabalho cobrirá as actions de **9 apps** em vez de 4. Se for (A), tudo bem tecnicamente, mas o princípio inviolável do BRAIN está falso na prática durante todo o desenvolvimento, e o único guard-rail ("garantir que NENHUMA action pule o gate de RBAC") não tem verificação automatizada especificada em nenhum prompt intermediário. Módulos que movimentam dinheiro (Financeiro, Flats→despesas) operam nesse regime.

**Recomendação:** antecipar a decisão para **agora** (antes de P-3.9), não em P-9.1. Se ficar (A): reescrever BRAIN §9 para o modelo de ameaça honesto e adicionar critério de aceite padrão em todo P-X.8 ("toda action passa por gate RBAC — verificado por teste"). Se (B): definir o padrão de client autenticado uma vez, em package compartilhado, antes das próximas fases.

---

### S1-03 — LGPD como retrofit (P-9.2) com coleta de dado sensível especificada antes de qualquer base de consentimento `(cat. 2, 7)`

**Evidência:**

- BRAIN §9 (checklist por prompt): "LGPD compliance (consentimento granular, 'Meus Dados')" — consta como critério de **todo** prompt.
- Nenhum prompt de cadastro/formulário concluído ou pendente implementa consentimento; a modelagem de consentimento (`packages/db/src/schema/consent.ts`) só existe em **P-9.2**, último bloco do plano.
- Dados pessoais já especificados/coletados antes disso: `public.users.phone`, `document_cpf` (P-1.6, concluído); Flats P-7.4 (pendente) especifica upload de documento de identidade, CPF e data de nascimento de acompanhantes **e "Saúde: autodeclarada"** (BRAIN §6.8, critério d) — dado de saúde é dado sensível na LGPD (art. 5º, II), mesmo autodeclarado e sem laudo.
- Não há em nenhuma spec: base legal por tipo de dado, política de retenção (P-9.2 menciona "configurável" sem definição), ou tratamento do conflito **imutabilidade/soft-delete (princípio inviolável) × direito de exclusão** — o BRAIN exige "nunca hard delete" e a LGPD exige exclusão real em certos casos; nenhum documento resolve isso.

**Impacto:** se as Fases 4–8 forem executadas como escritas, o sistema coletará dado sensível (saúde, no Flats) sem consentimento modelado, e o retrofit em P-9.2 terá que reabrir formulários de 5 módulos. O conflito imutabilidade × exclusão é decisão arquitetural (anonimização? crypto-shredding?) que fica mais cara a cada tabela criada.

**Recomendação:** (a) resolver o conflito imutabilidade × exclusão como decisão de BRAIN agora; (b) mover o schema de consentimento para antes da Fase 6/7 (cadastros Plataforma e Flats); (c) adicionar step de consentimento ao P-7.4 via patch. O item "Meus Dados" pode continuar em P-9.2.

---

## ALTO

### S1-04 — Migrations: numeração duplicada, ordem alfabética inválida e colisões já embutidas nos prompts pendentes `(cat. 1, 4)`

**Evidência (fatos do inventário §1.3/§3.2, confirmados nos arquivos):**

- Contrato do runner (P-0.3b): aplica `.sql` em **ordem alfabética**. Diretório real tem números duplicados (`0005` ×2, `0007` ×2, `0009` ×2) e `0009_financeiro_rls.sql` (refina policies) ordena **antes** de `0010_financeiro.sql` (cria as tabelas) — aplicação do zero falha.
- Prompts pendentes citam números já ocupados: P-4.6 → `0010_tarefas.sql` (0010 = financeiro), P-5.6 → `0012`, P-6.6 → `0014`, P-7.6 → `0016`, P-8.6 → `0018`, P-9.1/9.2/9.3 → `0020–0022`. Nenhum considera os deslocamentos já ocorridos (documentados em S-28, S-38, S-51: o número do prompt divergiu do arquivo real em 3 dos 4 módulos).
- Nenhuma spec define a convenção de numeração (prefixo único? sequência global? quem "reserva" o número?). A divergência prompt→arquivo se repetiu 4 vezes sem que PROMPTS.md fosse corrigido.

**Impacto:** banco novo (ambiente de teste, staging, recuperação de desastre) não é reconstituível pelo runner. Cada prompt pendente de schema exigirá que o implementador "adivinhe" o número certo — exatamente o tipo de suposição que o método proíbe.

**Recomendação:** prompt corretivo único antes da Fase 4: renumerar/renomear arquivos para ordem alfabética válida (com atualização de `public._migrations` — os IDs registrados mudam), documentar convenção no README do db, e patch em massa nos números citados em P-4.6…P-9.3.

---

### S1-05 — Porta de entrada sem prompt: auto-signup com aprovação (O-1) e migração de usuários do legado (O-2) `(cat. 2)`

**Evidência:**

- BRAIN §6.1: "Cadastro unificado com aprovação (auto-signup + aprovação por super_admin)"; §6.2: "Auto-signup com fluxo de aprovação: cria conta → seleciona/cria instituição → super_admin aprova"; §8 (v1 mantido): "Migração de usuários do sistema legado".
- Nenhum dos 119 prompts implementa qualquer um dos dois. S-5 fixou `shouldCreateUser: false` no magic link ("cadastro é processo separado"); S-16 registrou que o botão de aprovação foi **omitido da UI** porque `pending_approval` não é derivável do schema.
- Filipe confirmou (Fase 0, pergunta 7): lacuna, não adiamento.

**Impacto:** o módulo Projetos — declarado concluído — não é utilizável por um submissor real que ainda não exista em `public.users`. O go-live depende dos dois itens e nenhum tem dono, estimativa ou posição na sequência. A Plataforma (§6.3: "requer cadastro com aprovação") e a Rádio (materiais exclusivos: "cadastro + aprovação") também dependem do mesmo fluxo.

**Recomendação:** criar prompts novos (sugestão: P-1.25 auto-signup + aprovação, tocando `apps/intranet` login/cadastro + Admin; P-9.0 migração do legado, antes do deploy) e decidir o mecanismo de `pending_approval` no schema (coluna em `users`? tabela própria?) — decisão de modelagem, não do implementador.

---

### S1-06 — Infra Inngest: pressuposta por 6+ prompts, criada por nenhum (O-3) `(cat. 2, 4)`

**Evidência:**

- BRAIN §2: "Background jobs: Inngest".
- Dependem de jobs agendados sem que nenhum prompt monte cliente/deploy/crons: partições futuras de `audit_log` (S-13), `autoCreateMonthlyMeetings` (S-15, "trigger não configurado"), lembrete de edital 7 dias (S-30), homologação "7 dias sem contestação → notificar" (P-2.8 — a _transição_ após 7 dias não tem executor), lembretes de relatório (P-2.10, dois critérios [~]), recorrência de tarefas (P-4.8: "job Inngest que cria tarefa na next_run_at"), briefing (P-5.10), snapshot de audiência (P-8.11).
- Grep em PROMPTS.md: nenhum prompt tem arquivo `inngest` na lista de permitidos.

**Impacto:** os critérios [~] acumulados nunca fecharão; P-4.8 é inexecutável como escrito (critério de aceite exige job Inngest que não tem onde existir). Cada módulo novo adiciona mais dependência ao vazio.

**Recomendação:** prompt novo de infraestrutura (ex.: P-3.13 ou P-4.0 — "Inngest: cliente em `packages/jobs` ou app dedicado, deploy, registro de crons existentes") antes da Fase 4, liquidando os [~] das fases 1–3 no mesmo prompt.

---

### S1-07 — MFA "obrigatório" sem enforcement e sem enrollment (O-4) `(cat. 2)`

**Evidência:**

- BRAIN §2: "MFA: TOTP **obrigatório** para super_admin e diretor".
- P-0.4 (concluído) implementou apenas o challenge para quem **já tem** TOTP enrolled — S-5: "usuários sem fator TOTP enrolled não passam pelo step MFA"; enrollment exige Supabase Dashboard (débito S-5). Nenhum prompt posterior cria tela de enrollment nem enforcement (bloquear sessão aal1 de super_admin/diretor sem fator).
- "Obrigatório" nunca é definido operacionalmente em nenhuma spec: obrigatório no primeiro login? Com prazo? Bloqueante?

**Impacto:** o controle de segurança mais forte prometido para as contas mais privilegiadas (que aprovam pagamentos) é, na prática, opcional e depende de operação manual no dashboard do Supabase. A spec dá por existente algo que nenhum prompt entrega.

**Recomendação:** prompt novo (tela de perfil/segurança com enrollment + enforcement no middleware/login para papéis exigidos), idealmente antes do Financeiro entrar em produção. Definir "obrigatório" no BRAIN (proposta: bloqueia acesso a apps não-públicos até enrolar).

---

### S1-08 — Camada 1 do modelo de permissões (middleware) sem prompt em 8 dos 9 apps `(cat. 1, 2)`

**Evidência:**

- BRAIN §3: "**Três camadas obrigatórias, nunca apenas uma:** 1. Middleware Next.js — bloqueia rota antes de renderizar; 2. gates; 3. RLS."
- Único middleware com prompt: `apps/intranet/src/middleware.ts` (P-0.4). Nenhum prompt de nenhum módulo (P-1.x, P-2.x, P-3.x, nem os pendentes P-4–P-8) lista `middleware.ts` nos arquivos permitidos. A proteção que os prompts especificam é via layout Server Component (`getAuthUser()` + redirect — G5/P-2.9b) e gates de action.
- S-25/S-26 registram "Auth guard é UI-only; middleware real implementado em P-1.18" — mas P-1.18 é prompt de **schema** e não contém middleware. O débito apontou para um prompt que não o cobre; nenhum prompt posterior o recolheu.

**Impacto:** combinado com S1-02 (RLS bypassada nas actions), módulos podem operar com **uma** camada efetiva (gate de action) em vez de três. No mínimo, o BRAIN promete uma arquitetura que os PROMPTS não constroem — contradição estrutural entre a spec de segurança e o plano de execução. (Se a proteção por layout é a decisão real, ela precisa estar escrita no BRAIN no lugar do middleware.)

**Recomendação:** decisão explícita: (a) middleware por app vira requisito com prompt (um corretivo cobrindo admin/documentos/projetos/financeiro + inclusão nos P-X.9 pendentes), ou (b) BRAIN §3 é emendado para "proteção de rota via layout server-side" com racional. Verificação do estado real do documentos (área editorial) fica para a Fase 2.

---

### S1-09 — Contrato cross-app indefinido: onde vive a lógica de integração e como um app chama o outro `(cat. 3, 6)`

**Evidência:**

- BRAIN §7 define **o quê** (tabela de integrações) e um mecanismo genérico ("dados via banco, eventos via Realtime + triggers + Inngest") que nenhum prompt implementa (O-18). O padrão real que emergiu (S-43) é outro: chamada direta fire-and-forget dentro do app de origem (`apps/projetos/src/lib/integrations/*.ts`).
- P-4.11: "Function pública `createAutoTask` que outros módulos chamam" — arquivo em `apps/tarefas/src/lib/integrations/auto-tasks.ts`. P-5.8 manda a Intranet chamar `createAutoTask`. **Apps não podem importar código de outros apps** no monorepo (inversão proibida, citada na Fase 3 do próprio prompt de auditoria); a spec não diz se isso vira package compartilhado, insert cross-schema direto, HTTP, ou trigger.
- Mesmo problema já materializado: `getProjectParticipationScore` (P-2.11) vive em `apps/projetos/src/lib/integrations/documentos.ts` (nome de arquivo, aliás, incoerente — é integração com _flats_), mas quem precisa dela é o P-7.8/P-7.11 (`apps/flats`). P-7.11 lista `apps/flats/src/lib/integrations/projetos.ts` — o implementador terá que duplicar a lógica ou inventar o contrato.
- P-5.8 "Busca global cross-app (consulta todos os schemas)": sem contrato de permissão (a busca respeita a visibilidade por papel de cada módulo? via RLS — que as actions bypassam — ou reimplementada?), sem definição do que é indexável.

**Impacto:** ambiguidade de contrato entre apps é exatamente a classe que o prompt de auditoria manda tratar como ALTO. Cada implementador das fases 4–8 decidirá sozinho, e as decisões não vão convergir.

**Recomendação:** decisão única antes da Fase 4, registrada no BRAIN: lógica de integração consumida por N apps vive em package (`packages/integrations` ou funções no `packages/db`); eventos assíncronos via Inngest (depende de S1-06); busca global com contrato explícito de escopo por papel. Patch nos P-4.11, P-5.8, P-5.11, P-7.11.

---

### S1-10 — P-3.9 (próximo prompt) não é executável sem suposição `(cat. 3, 5)`

**Evidência:**

- G5 (Instruções Globais) exige que **todo P-X.9** inclua `(grupo)/layout.tsx` + `shell.tsx` + `actions/auth.ts` nos arquivos permitidos, "a partir de P-3.9". A lista de arquivos permitidos do P-3.9 **não os inclui** (só páginas + remoção do mock) — a regra G5 e o prompt que a motivou não foram reconciliados.
- `contas-pagar/page.tsx` está fora dos arquivos permitidos do P-3.9, embora seja tela mockada (P-3.3/P-3.4) contendo o fluxo central de governança dual (lote semanal → aprovação). Nenhum outro prompt pendente a integra: P-3.10 é notificações, P-3.11 é cross-app. A tela do fluxo mais crítico do módulo ficaria mockada para sempre.
- As páginas do Financeiro são todas `"use client"` com `setTimeout` simulando loading (S-48/S-50); o P-3.9 não diz se converte para RSC (padrão dos outros módulos) ou mantém client + actions — decisão arquitetural do módulo deixada ao implementador.

**Impacto:** o primeiro prompt da retomada repete a lacuna que gerou o corretivo P-2.9b, e deixa o fluxo de aprovação de pagamentos fora da integração.

**Recomendação:** patch no P-3.9 antes de executar: adicionar `contas-pagar/page.tsx`, `(dashboard)/layout.tsx`, `(dashboard)/shell.tsx`, `actions/auth.ts` aos permitidos; declarar o padrão RSC + Suspense como alvo (consistente com admin/documentos/projetos).

---

### S1-11 — Bloqueio de pagamentos por inadimplência de relatório: regra sem mecanismo (O-9) `(cat. 2)`

**Evidência:**

- BRAIN §6.2: "Inadimplência bloqueia pagamentos (super_admin pode sobrescrever)".
- P-2.10 tem critério "[x] Bloqueio por falta de relatório → submissor + super_admins" — mas isso é a **notificação** do bloqueio. Nenhum prompt define o mecanismo: o que muda em `payment_schedules`/`payables` quando um relatório vence? Onde vive o override do super_admin? Quem detecta a inadimplência (job — cai em S1-06)?
- P-3.11 (pendente) conecta Projetos→Financeiro mas não menciona a regra.

**Impacto:** regra de governança financeira com efeito em dinheiro real não tem especificação executável; o risco é ela ser "implementada" só como e-mail.

**Recomendação:** especificar no patch de P-3.11 (estado `bloqueado` em payables de projeto + checagem na inclusão em lote + action de override auditada) ou prompt corretivo próprio.

---

## MÉDIO

### S1-12 — Contradição interna do BRAIN: detecção de duplicidade via embeddings é v1 (§6.2) e v2+ (§8) ao mesmo tempo `(cat. 1)`

BRAIN §6.2 lista "Detecção de duplicidade via embeddings (pgvector)" sob IA do módulo; §8 defere "Busca semântica / pgvector / embeddings" para v2+. Nenhum prompt implementa (coerente com §8, contradiz §6.2). **Recomendação:** editar §6.2 marcando o item como v2+ (ou promovê-lo com prompt). Pergunta Q2 abaixo.

### S1-13 — IA prometida no §8 sem prompt: scoring de flats e detecção de renovação `(cat. 1, 2)`

§8 (v1 mantido) lista "IA: scoring de flats (critérios subjetivos)" — mas §6.8 especifica scoring 100% determinístico (tabela de pontos) e P-7.8 o segue; e "detecção de renovação (auto-preenche de projetos anteriores)" — nenhum prompt a implementa (P-2.x concluídos; nenhum pendente a cobre). **Recomendação:** decidir (Q3): ou remover do §8, ou criar prompts. Como estão, o §8 promete duas features de IA que o plano não entrega.

### S1-14 — P-3.3: escopo lista 4 telas que não estão nos arquivos permitidos nem nos critérios `(cat. 5)`

Escopo do P-3.3 menciona "Contas a receber. … Fluxo de caixa projetado. Centros de custo (por projeto). … Relatórios." — nenhuma tem arquivo permitido (`contas-receber/page.tsx` etc. não existem na lista) nem critério de aceite. O prompt foi dado como concluído sem essas telas e nada registra a decisão de dropá-las. Consequência viva: `receivables` tem actions (P-3.8) e nenhuma tela em nenhum prompt. **Recomendação:** decidir se as 4 telas entram (patch em P-3.9) ou saem (editar escopo do P-3.3 retroativamente + PATCH).

### S1-15 — Registro histórico do SESSIONS com 5 anomalias estruturais `(cat. 1)`

(i) Índice S-21 ≠ corpo S-21 (rótulo "P-1.13b" não existe no PROMPTS); (ii) sessão real do P-1.12b sem número; (iii) S-45 no índice sem corpo; (iv) P-1.21 no corpo sem número/índice; (v) P-1.19 e P-2.12 marcados [x] sem sessão; (vi) P-2.11 `parcial` no SESSIONS vs todos critérios [x]/[~] no PROMPTS. Filipe já confirmou os fatos (Fase 0, perguntas 1–2). **Impacto:** o log append-only — única memória entre sessões — não é confiável como está. **Recomendação:** entrada retificadora única no SESSIONS (append, sem editar as antigas) normalizando os seis pontos.

### S1-16 — PATCHES/ vazio com pelo menos 3 mudanças de decisão não registradas `(cat. 1)`

Tipografia Inter→Parkinsans (revogação registrada só como nota no BRAIN §5), escopo da Rádio "drasticamente simplificado" (§6.4), remoções da v1 (§8). Filipe autorizou reconstrução retroativa (Fase 0, pergunta 4). **Recomendação:** criar os PATCHes retroativos numerados antes da retomada.

### S1-17 — "Validação da diretoria OK" é pré-condição de todo P-X.6 sem critério nem registro `(cat. 5)`

Toda entrada de Bloco B tem pré-condição "validação da diretoria OK"; nenhuma sessão registra essa validação (nem como feita nem como dispensada), e não há definição do que a constitui (Filipe esclareceu na Fase 0: é validação dele, com compartilhamento eventual com um diretor). **Recomendação:** definir formalmente (1 linha no SESSIONS por Bloco A: "validado por Filipe em DATA, ajustes X") — barato e fecha o buraco de auditabilidade.

### S1-18 — Admin → Todos (push de configurações globais) sem prompt (O-14) `(cat. 2)`

BRAIN §7: "Push de configurações globais (logos, textos, feature flags)". P-1.8 cobre o CRUD no Admin; nenhum prompt especifica como os outros 8 apps **consomem** settings/flags (query direta a `admin.system_settings`? cache? no build?). Cada app da Fase 4+ decidirá sozinho. **Recomendação:** definir o contrato de consumo (provável: helper em `packages/db` + cache) e citar nos P-X.9 pendentes.

### S1-19 — Sugestão de avaliador por afinidade sem prompt (O-6) `(cat. 2)`

BRAIN §6.2 ("Avaliação"): "Designação: **mix de sugestão do sistema** (afinidade: região, categoria, histórico) + atribuição manual". P-2.8 cobre designar/registrar parecer; a sugestão automática não existe em nenhum prompt. **Recomendação:** decidir se fica para v1.x (registrar em §8) ou criar prompt.

### S1-20 — Export mensal PDF+XLSX+ZIP (O-10) e Google Calendar (O-11) sem prompt `(cat. 2)`

§6.5: "relatório mensal com recibos exportado como PDF+XLSX+ZIP pelo super_admin" — P-3.10 cobre só o e-mail automático mensal; a ação manual de export com ZIP de recibos não existe. §6.6: "Calendário compartilhado (integração Google Calendar)" — P-5.3/P-5.9 usam apenas `admin.meeting_sessions`. **Recomendação:** decidir escopo (Q6/Q7).

### S1-21 — Decisões arquiteturais implícitas sem dono na spec `(cat. 6)`

(i) **Representação monetária**: nunca especificada; o implementado é `numeric` em Reais com `parseFloat` para formatação (S-42) — convenção OK, mas viva só em nota de sessão; (ii) **campos de formulário sem coluna → JSONB/notes**: padrão silencioso consolidado (`project_versions.data` em S-40; `notes` com prefixo "Budget: " e CNPJs concatenados em S-53) — dados de negócio consultáveis presos em texto/JSONB sem decisão registrada; (iii) **Supabase Storage**: nenhum prompt cria buckets nem define policies de Storage (débito S-29: bucket `hebron-docs` manual); uploads de vídeo (P-2.4), comprovantes (P-3.4), documentos de identidade (P-7.4) dependem de buckets não especificados. **Recomendação:** 3 parágrafos novos no BRAIN §4/§6.5 + prompt corretivo de Storage (buckets + policies) antes da Fase 7 (documentos de identidade = dado pessoal em storage).

### S1-22 — Transversais sem padrão: tratamento de erro e acessibilidade `(cat. 7)`

(i) **Erro**: nenhuma spec define padrão (retry? toast? Sentry só em P-9.5); o padrão emergente é fire-and-forget com `.catch(console.error)` para integrações e IA (S-40, S-43) — erro engolido como convenção; (ii) **acessibilidade**: zero requisitos em BRAIN/PROMPTS (só decisões pontuais de sessão, ex. ARIA em S-7) — para um público "em transição tecnológica" e um portal público, é lacuna de requisito, não de código. **Recomendação:** seção curta no BRAIN (padrão de erro por tipo: mutação crítica nunca fire-and-forget; a11y: alvo WCAG AA nos fluxos públicos) + critério de aceite padrão nos prompts de UI pendentes.

### S1-23 — Scope creep embutido nos prompts pendentes sem ancoragem no BRAIN `(cat. 1, 3)`

Do inventário §4.2, os casos com consequência de modelagem: **quizzes** (P-6.1–P-6.8: tabelas `quizzes`, `quiz_questions`, `quiz_attempts`, `passing_score`) — BRAIN §6.3 define certificação como "concluir trilha = certificado", sem quiz; **certificado com hash de verificação pública** (P-6.x) — não consta no BRAIN; **notas pessoais em timestamp** (NoteWidget, P-6.2/P-6.6); **workspaces "6 fixos + custom"** (P-4.6) vs BRAIN §6.9 "workspaces fixos"; **check-in com checklist de inventário no sistema** (P-7.4/P-7.8) vs BRAIN "check-in presencial na recepção". Nenhum é absurdo, mas cada um cria tabela/fluxo que o BRAIN não pediu — e o método diz que BRAIN vence. **Recomendação:** decidir item a item antes das fases 4/6/7 (Q8) e alinhar BRAIN ou PROMPTS.

### S1-24 — Semânticas indefinidas em KPIs e Rádio `(cat. 3)`

(i) "Doações do mês" (KPI, P-5.1/P-5.8): o Financeiro não modela "doação" como conceito distinto (receivables/categorias); qual query define o KPI? (ii) Audiência da Rádio (P-8.11): "listener_stats" sem definição do que conta como ouvinte (page view? minutos? sessões?); (iii) Auto DJ (P-8.8): cada ouvinte em ponto diferente + "tocando agora" global informativo — semântica aceita, mas o BRAIN §6.4 descreve como se fosse rádio síncrona; ajustar §6.4 evita expectativa errada da diretoria. **Recomendação:** definir as três semânticas antes dos respectivos prompts.

### S1-25 — Débito com dono inexistente: prefill do wizard `(cat. 4)`

S-43: wizard não chama `getEditalPrefill`; débito remetido ao "prompt UI do módulo documentos" — que já foi todo executado. Nenhum prompt pendente cobre o wiring; a integração Documentos→Projetos (P-1.23 + P-2.11, marcados concluídos) está funcionalmente aberta. Padrão a observar: débito remetido a prompt futuro que não existe. **Recomendação:** anexar ao patch de P-3.9? Não — é do Projetos; criar micro-corretivo P-2.9c ou incluir num prompt de liquidação de débitos.

---

## BAIXO (agrupado)

### S1-26 — Higiene de specs `(cat. 1, 5, 7)`

- Cabeçalho do PROMPTS.md: "119 prompts + **3** correções" — são 4 (P-2.9b não somado); Sumário não lista os corretivos.
- BRAIN §5 e PROMPTS G3 dizem que design-refs existem para "admin, documentos, financeiro" — `design-refs/projetos/` já existe.
- BRAIN §2 cita "Claude Sonnet 4.6 / Opus 4.6" para geração de código; G1 cita "Sonnet 4.7" — inconsistência cosmética entre specs.
- i18n nunca declarado (pt-BR implícito em tudo) — 1 linha no BRAIN resolve.
- O-13 (templates de email editáveis **com IA**, §8) sem prompt — decidir se sai do §8.
- O-15/O-16 (Axiom, PostHog, Vercel Analytics, cache Upstash) citados no §2 sem prompt — ou entram em P-9.5 via patch, ou saem do stack declarado.
- P-9.4 (copy review): critérios subjetivos ("nenhuma frase cara de IA") — aceitável para prompt de revisão humana, mas vale listar os grep-áveis (ex.: `!`, "vamos lá", "incrível").
- PRODUCT.md (contexto: gerado pela skill impeccable, usado como referência de design): coerente com o BRAIN em marca/tom/princípios. Duas divergências menores: diz "ferramentas para equipe interna, **não produto público**" — Documentos (portal público) e Rádio (ouvinte anônimo) são públicos; e restringe citações bíblicas a "NT ou Salmos" — regra que não existe no BRAIN (e S-6 usou Lamentações 3:25). Inofensivo, mas como a skill lê esse arquivo em todo trabalho de UI, vale corrigir as duas linhas.

---

## Observações (preferência, sem severidade)

- O formato dos prompts corretivos (problema/contexto → escopo ordenado → critérios) é visivelmente melhor que o dos prompts originais; se houver rodada de patches (Fase 4 da auditoria), vale adotar esse formato como padrão.
- `apps/projetos/src/lib/integrations/documentos.ts` contém `getProjectParticipationScore` (integração com Flats) — nome de arquivo enganoso; renomear quando o contrato cross-app (S1-09) for decidido.
- A tabela de G4 (tokens) duplica BRAIN §5; considerar referência única para não divergirem no futuro.

---

## Perguntas para o Filipe (Fase 1)

1. **(S1-01)** Confirma o modelo `financeiro.organization_budgets` (orçamento por instituição + ano-calendário, editável no Financeiro) como fonte do teto de submissão? Posso propor o prompt corretivo nesses termos na Fase 4 da auditoria?

R. Confirmo! Pode propor o prompt corretivo na Fase 4.

2. **(S1-02)** A decisão superuser (A) vs authenticated+JWT (B) pode ser tomada **agora**, antes de P-3.9, em vez de esperar P-9.1? Se precisar de insumo, a Fase 3 da auditoria levanta o custo real de (B) no código atual.

R. Pretendo seguir o BRAIN e as regras de segurança definidas. Então, tomei a decisão de seguir com (B).

3. **(S1-12/S1-13)** Três features de IA prometidas e sem prompt: duplicidade via embeddings, scoring de flats com IA, detecção de renovação. Para cada uma: v1 (criar prompt) ou v2+ (corrigir BRAIN §6.2/§8)?

R. Pode criar os prompts.

4. **(S1-03)** Como resolver imutabilidade (soft-delete "inviolável") × direito de exclusão LGPD: anonimização dos campos pessoais mantendo o registro contábil/auditável? Preciso da direção para o patch de P-9.2 e do Flats.

R. Eu não estou acima da lei! Mude o BRAIN para atender o direito de exclusão LGPD em qualquer dado que seja exigido por lei.

5. **(S1-07)** "MFA obrigatório" deve **bloquear** o acesso de super_admin/diretor sem TOTP enrolado (com tela de enrollment no primeiro login), ou permanece "recomendado" na v1?

R. Sim, deve bloquear até o super_admin/diretor ativá-lo (com tela de enrollment no primeiro login).

6. **(S1-20)** Google Calendar na Intranet: mantém na v1 (vira prompt) ou desce para v2+ (corrigir §6.6)?

R. Manter na v1 (virar prompt).

7. **(S1-20)** Export manual mensal PDF+XLSX+ZIP com recibos: v1 (patch em P-3.9/P-3.10) ou v2+?

R. Manter na v1.

8. **(S1-23)** Itens dos prompts sem base no BRAIN — quizzes, certificado com hash público, notas em timestamp, workspaces custom, checklist de inventário no check-in: quais você **quer** (atualizo o BRAIN) e quais remove dos prompts?

R. Você faz análises melhores que eu. Eu votaria para atualizar o BRAIN, mas o que você julga necessário manter ou descartável para tirar?

9. **(S1-14)** As telas "Contas a receber", "Fluxo de caixa projetado", "Centros de custo" e "Relatórios" do Financeiro: entram no P-3.9 (patch) ou saem do escopo do módulo?

R. Entram.

10. **(S1-24)** O que conta como "doação" para o KPI da Intranet — receitas de categoria específica do plano de contas? Quais categorias?

R. Doações são lançamento do tipo despesa. São os recursos que são enviados para as instituições com projetos aprovados. Haverá uma categoria específica no plano de conta para as doações. Cada projeto também terá seu próprio centro de custo.

---

_Próxima fase: **FASE 2 — Verificação spec ↔ código** (54 unidades concluídas, divididas por app: fundação, admin, documentos, projetos, financeiro — inventário §5). Rodar em sessão nova; as respostas às perguntas acima podem vir antes ou durante._

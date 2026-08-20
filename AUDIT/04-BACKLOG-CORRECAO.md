# 04 — BACKLOG DE CORREÇÃO

> 41 achados agrupados em **11 pacotes coesos**, ordenados por risco. Cada pacote está redigido no padrão de `PROMPTS.md` (contexto, objetivo, arquivos envolvidos, critérios de aceite) e pode virar prompt de implementação sem reescrita.
> Numeração sugerida: `P-A.1` … `P-A.11` (A de auditoria), para não colidir com a sequência de fases.

## Mapa de risco

| Pacote                                          | Severidade máx. | Achados                                                                  | Bloqueia produção?              |
| ----------------------------------------------- | --------------- | ------------------------------------------------------------------------ | ------------------------------- |
| **1 — LGPD: fechar o direito de exclusão**      | **P0**          | D8-001, D8-002, D8-003, D1-005                                           | **SIM**                         |
| 2 — As costuras que perdem dinheiro e registros | P1              | FLX-001, D2-001, D1-002                                                  | não, mas é o próximo risco real |
| 3 — Camada 1: middleware nos 8 apps             | P1              | D1-001, D3-002                                                           | não                             |
| 4 — O que o usuário lê quando algo falha        | P1              | D4-004, D4-002, D7-001                                                   | não                             |
| 5 — Prontidão de produção (P-9.5)               | P1              | NEG-004, NEG-007, NEG-008, NEG-006, D3-003                               | **SIM** (é o deploy)            |
| 6 — Impersonação: implementar ou revogar        | P1              | FLX-002                                                                  | não                             |
| 7 — Escopo v1 pendente (decisão da diretoria)   | P1              | NEG-001, NEG-002, NEG-003, NEG-012, NEG-009, NEG-010                     | decisão                         |
| 8 — Robustez do Financeiro em escala            | P2              | D4-003, D2-002, D5-001, D6-003                                           | não                             |
| 9 — Gates e RLS residuais                       | P2              | D1-004, D1-006, D6-002                                                   | não                             |
| 10 — Camada de IA                               | P2              | D5-003                                                                   | não                             |
| 11 — Higiene e registro                         | P3              | D3-001, D4-001, D4-005, D5-002, D6-001, D6-004, D1-003, NEG-011, NEG-005 | não                             |

---

## PACOTE 1 — LGPD: fechar o direito de exclusão (P0)

**Fase:** correção · **Módulo:** admin + fundação · **Tipo:** integration

### Contexto

`P-9.2` entregou toda a fundação LGPD e marcou seus critérios como cumpridos. A verificação em código mostra que **dois dos entregáveis existem como primitiva testada e nunca receberam porta de entrada** — e o próprio `SESSIONS.md:12737-12744` registrou os dois como "corretivo futuro", que nunca foi escrito.

Hoje o titular consegue **pedir** a exclusão dos seus dados (`requestDataDeletion` grava um ticket `pending`), e **ninguém no sistema consegue atender o pedido**: `executeDataDeletion` e `rejectDataDeletion` não têm nenhum chamador em `apps/`, e nenhuma tela lista `public.data_deletion_requests`. O sistema acumula prova documental de pedidos não cumpridos.

### Objetivo

Tornar o ciclo de exclusão executável ponta a ponta e instrumentar o log de acesso a PII de terceiros, cumprindo o art. 18, VI e o art. 37 da LGPD.

### Arquivos envolvidos

- `apps/admin/src/app/(dashboard)/lgpd/page.tsx` _(criar)_ — lista de tickets `pending`/`completed`/`rejected`
- `apps/admin/src/actions/lgpd.ts` _(criar)_ — `resolveDeletionRequest` e `rejectDeletionRequest` sob `adminAction`, delegando a `executeDataDeletion`/`rejectDataDeletion`
- `apps/admin/src/components/admin-shell.tsx` — item de menu
- `apps/flats/src/lib/queries.ts` — chamar `logPiiAccess` na leitura de CPF/documento do hóspede pelo gestor
- `apps/admin/src/app/(dashboard)/usuarios/[id]/page.tsx` — chamar `logPiiAccess` na leitura do cadastro completo
- `packages/db/src/audit.ts` — acrescentar `"name"`, `"cpf"`, `"birthDate"`, `"plate"` a `SENSITIVE_AUDIT_FIELDS`
- `packages/db/src/anonymization.ts` — `.returning()` no UPDATE de `admin.audit_log`, falhando alto se 0 linhas

### Critérios de aceite

- [x] super_admin vê a fila de pedidos de exclusão e consegue executar e rejeitar, com justificativa
- [x] Executar o pedido anonimiza a PII de verdade (teste de integração sobre o caminho de **produto**, não só sobre a primitiva)
- [x] Rejeitar registra motivo e notifica o titular
- [x] Leitura de CPF/documento de terceiro grava entrada de audit (teste que abre a tela e verifica a linha)
- [x] `SENSITIVE_AUDIT_FIELDS` cobre toda coluna de PII do schema — com teste que falha se uma nova coluna de PII entrar sem ser listada
- [x] `anonymizeUser` falha (não retorna sucesso) se o UPDATE em `admin.audit_log` afetar 0 linhas
- [x] Lint passa · Types passam

---

## PACOTE 2 — As costuras que perdem dinheiro e registros (P1)

**Fase:** correção · **Módulo:** projetos, financeiro, fundação · **Tipo:** integration

### Contexto

Três defeitos independentes, unidos por um traço: cada um deixa o sistema perder algo silenciosamente.

1. **`FLX-001`** — `onProjectApproved` (cria centro de custo e os payables do projeto aprovado) roda em fogo-e-esquece nos seus dois call sites, exatamente o que `BRAIN.md:559-563` proíbe para mutação crítica. As outras quatro integrações do ecossistema (`onFlatsAssistanceApproved`, `onFlatsReservationConfirmed`, `onMeetingActionItemDecided`, `onProjectSubmitted`) usam `await` + `try/catch`. Só a do dinheiro não.
2. **`D2-001`** — `public.users` referencia `auth.users` com `ON DELETE CASCADE`, e 17 tabelas caem junto, incluindo `public.consents` (prova de base legal), `plataforma.certificates` (verificáveis publicamente) e `public.role_assignments`.
3. **`D1-002`** — `createReceiptSignedUrl` é exportada de um arquivo `"use server"`, o que a torna um Server Action invocável, e não faz nenhuma checagem antes de assinar uma URL do bucket de comprovantes fiscais com service role.

### Objetivo

Fechar as três perdas: a integração financeira passa a ser aguardada e observável; o hard delete de usuário passa a ser impossível no banco; a assinatura de comprovante passa a exigir sessão e papel.

### Arquivos envolvidos

- `apps/projetos/src/actions/projects.ts` (~744) e `packages/jobs/src/crons/projetos.ts` (~281) — `await` + `try/catch` + notificação ao super_admin em caso de falha
- `packages/db/src/migrations/NNNN_fk_users_restrict.sql` _(criar)_ — `public.users → auth.users` de CASCADE para RESTRICT; revisar as 17 filhas uma a uma (preferências de UI podem manter CASCADE; registros institucionais viram RESTRICT)
- `apps/financeiro/src/lib/storage.ts` _(criar)_ — mover `createReceiptSignedUrl` para módulo **sem** `"use server"`
- `apps/financeiro/src/actions/attachments.ts`, `apps/financeiro/src/actions/ocr.ts` — importar do novo módulo

### Critérios de aceite

- [x] Nenhuma integração cross-app de mutação roda sem `await` — grep por `on[A-Z]\w+\(.*\)\.catch\(` em `apps/` e `packages/jobs/` retorna vazio
- [x] Falha de `onProjectApproved` gera notificação para super_admin (projeto aprovado sem payables exige intervenção humana)
- [x] Teste: aprovar projeto com integração falhando deixa rastro observável, não só `console.error`
- [ ] `DELETE FROM auth.users` de um usuário com certificado/consentimento/papel **falha** por FK — **ADIADO (S-258).** Migration escrita, aplicada e verificada fim-a-fim contra o banco de dev (funcionava), depois **revertida**: `public.users → auth.users` não tem FK nenhuma hoje (confirmado via `pg_constraint`), e 84 arquivos de teste inserem fixtures em `public.users` com UUIDs sintéticos sem `auth.users` correspondente — criar a FK quebra o `INSERT` da fixture, não só o hard-delete. Requer decidir o padrão de fixture de teste antes de retomar (ver S-258 em `SESSIONS.md`). `deleteTestAuthUser` (`packages/auth/src/testing.ts`) já foi corrigida nesta sessão para não vazar `public.users` órfão, independente da FK.
- [x] Nenhuma função exportada de arquivo `"use server"` acessa service role sem gate — inventário no PR
- [x] Lint passa · Types passam

---

## PACOTE 3 — Camada 1: middleware nos 8 apps (P1)

**Fase:** correção · **Módulo:** fundação (todos) · **Tipo:** config

### Contexto

`BRAIN.md:121-125` declara três camadas obrigatórias, a primeira sendo o middleware Next.js. **Apenas `apps/intranet` tem `middleware.ts`.** `PROMPTS.md:952` e `:994` afirmam como fato consumado que "o middleware de cada app bloqueia o acesso" e que "RBAC real continua no middleware + RLS de cada app" — não é o caso.

Os 8 apps gateiam no layout do segmento protegido (`require*Session()`), então **não há rota renderizando dado protegido para anônimo**. As consequências reais da ausência são outras: os route handlers da Rádio ficam sem camada acima da função; o access token expirado não é renovado em navegação de leitura (atrito recorrente para um público que acessa ~1x/mês); e a reescrita do cookie com `domain=.hebronaseec.com.br` só acontece se o usuário passar pela intranet.

O gate de sessão, além disso, está copiado em 12 variantes entre `lib/session.ts` e `lib/queries.ts`, sem convenção de onde mora, e **nenhuma delas preserva `return_to`** — todas redirecionam para `CANONICAL_LOGIN_URL` puro, perdendo a rota original.

### Objetivo

Um middleware compartilhado, montado nos 9 apps, cobrindo páginas e `/api`, com refresh de sessão, redirect preservando `return_to` e reescrita do cookie de domínio.

### Arquivos envolvidos

- `packages/auth/src/app-middleware.ts` _(criar)_ — `createHebronMiddleware({ roles, publicPaths })`
- `apps/{admin,projetos,plataforma,radio,financeiro,documentos,flats,tarefas}/src/middleware.ts` _(criar, 8 arquivos)_
- `apps/intranet/src/middleware.ts` — migrar para o helper compartilhado
- `packages/auth/src/index.ts` — export
- `apps/*/src/lib/session.ts` e `apps/*/src/lib/queries.ts` — reduzir os 12 `require*Session` a chamadas de um `createRoleGate(roles)` compartilhado

### Critérios de aceite

- [x] Os 9 apps têm `middleware.ts` com `matcher` cobrindo páginas **e** `/api`
- [ ] Sessão expirada é renovada em navegação de leitura (teste com token vencido) — **PARCIAL.** O mecanismo (`supabase.auth.getUser()` + `setAll` reescrevendo os cookies na resposta) é o mesmo que já rodava em produção só no intranet, agora compartilhado pelos 9 — mas nenhuma sessão desta correção escreveu um teste automatizado com um JWT vencido de verdade; validar manualmente ou com um teste de integração fica para uma sessão futura.
- [x] Redirect para login preserva `return_to` e devolve o usuário à rota original após autenticar — inclui um gap que não estava no escopo original do achado: `safeRedirectTarget` (intranet `/post-login`) só aceitava caminho relativo, então o `return_to` cross-app (8 dos 9 apps logam em `app.hebronaseec.com.br`, origem diferente da sua própria) era descartado silenciosamente para "/". Corrigido junto (`resolveReturnToDestination`, `packages/auth/src/app-middleware.ts`), com teste unitário cobrindo origem confiável/não confiável/typosquat/dev vs. produção.
- [x] `runtime = "nodejs"` onde o middleware toca o banco; nenhuma API Node em edge — verificado nos 9 `functions-config-manifest.json` pós-build.
- [x] O gate de papel vive em um único lugar; nenhuma cópia local sobra — os 12 `require*Session` (`grep` confirmou a contagem) agora chamam `createRoleGate` (`packages/auth/src/role-gate.ts`).
- [x] Lint passa · Types passam

---

## PACOTE 4 — O que o usuário lê quando algo falha (P1)

**Fase:** correção · **Módulo:** todos · **Tipo:** integration

### Contexto

`next-safe-action@7.10.8` substitui a mensagem de qualquer erro lançado por `"Something went wrong while executing the operation."` quando o cliente não define `handleServerError` — verificado no código-fonte do pacote instalado (`dist/index.mjs:1008-1014`). **Nenhum dos 9 apps define.** As **267** mensagens de negócio escritas em português nas actions nunca chegam à tela, embora a UI leia `result.serverError` para exibi-las.

O usuário que tenta autorizar um lote que ele mesmo aprovou não lê "o autorizador deve ser uma pessoa diferente do aprovador (governança dual)". Isso contradiz `BRAIN.md:678` ("público-alvo em transição tecnológica — interfaces simples") e o P-9.4 (Copy Review), cujos critérios de tom institucional foram marcados como cumpridos.

No mesmo eixo: 6 dos 9 apps não têm `error.tsx`, então uma exceção não capturada em Server Component cai na tela de erro padrão do Next.js. E `pnpm turbo typecheck` **falha** hoje (`@hebron/auth`, fixture sem `nickname`), deixando o CI vermelho — o que faz um erro de tipo novo passar despercebido no meio da falha já esperada.

### Objetivo

Toda falha de negócio chega ao usuário com a mensagem que o desenvolvedor escreveu; toda falha inesperada tem fronteira de erro institucional; o portão de qualidade volta a ser confiável.

### Arquivos envolvidos

- `packages/auth/src/safe-action-error.ts` _(criar)_ — `BusinessError` + `handleServerError` compartilhado (repassa a mensagem de `BusinessError`, genérica + log para o resto)
- `apps/*/src/lib/safe-action.ts` (9 arquivos) — passar `handleServerError`
- `apps/{admin,plataforma,radio,intranet,flats,tarefas}/src/app/error.tsx` e `global-error.tsx` _(criar, 12 arquivos)_ — copiar o padrão de `apps/projetos/src/app/`
- `packages/auth/src/__tests__/data-deletion.test.ts:89` — acrescentar `nickname` ao fixture

### Critérios de aceite

- [x] Uma action que lança erro de negócio devolve a mensagem em português na UI (teste por app) — `packages/auth/src/safe-action-error.ts` (`BusinessError` + `handleServerError`), passado a `createSafeActionClient` nos 9 `apps/*/src/lib/safe-action.ts`. Os ~393 `throw new Error(...)` em `apps/*/src/actions/**`, nos 9 `lib/safe-action.ts` (gates de papel) e no `resolveSession`/`data-deletion.ts` compartilhados (`packages/auth`) viraram `BusinessError` — a plumbing é byte-idêntica nos 9 apps. "Teste por app" coberto por: unit test exaustivo do mecanismo compartilhado (`packages/auth/src/__tests__/safe-action-error.test.ts`) + um teste de integração real contra o banco em `apps/admin/src/__tests__/actions.test.ts` provando que `result.serverError` chega com a mensagem exata (não a genérica) numa action real.
- [x] Erro inesperado devolve a genérica **e** vai para o log estruturado (nunca a mensagem crua) — coberto pelo mesmo unit test (`console.error(JSON.stringify({event: "safe_action_unexpected_error", ...}))`).
- [x] Os 9 apps têm `error.tsx` + `global-error.tsx` com identidade visual Hebron — 6 apps criados (admin, plataforma, radio, flats, tarefas + intranet); intranet não tem `layout.tsx` raiz (usa o padrão "multiple root layouts" do Next.js via route groups `(auth)`/`(dashboard)`, cada um com seu próprio `<html>`/`<body>`), então recebeu `error.tsx` em cada route group (2 arquivos) + `global-error.tsx` único na raiz — 13 arquivos no total, não 12; verificado com `next build` real nos 9 apps (não só typecheck).
- [x] `pnpm turbo lint typecheck` verde — **verificado lendo a saída**: 19/19 pacotes lint, 19/19 typecheck, sem cache stale.
- [x] Nenhuma mensagem de erro do sistema em inglês visível ao usuário — as únicas mensagens em inglês remanescentes (`Missing required environment variable: ...`) são falhas de configuração fail-fast, nunca disparadas por uma ação do usuário; se disparassem dentro de uma Server Action, `handleServerError` as mascara para a genérica em português mesmo assim (não são `BusinessError`).

**Achado fora de escopo, registrado mas não corrigido nesta sessão:** ao rodar a suíte completa (`pnpm turbo test`), `apps/documentos/src/__tests__/actions.test.ts` (`updateCategory`) revelou que `SENSITIVE_AUDIT_FIELDS` (PACOTE 1/S-257) redige qualquer campo chamado `name` em **qualquer** entidade, não só nomes de pessoa — o nome de uma categoria de documento vira `{ redacted: true }` no audit log. Pré-existente à esta sessão, não causado por PACOTE 4. Ver memória `project_sensitive_audit_fields_name_overredaction`.

---

## PACOTE 5 — Prontidão de produção (P-9.5) (P1, bloqueia go-live)

**Fase:** 9 · **Módulo:** fundação · **Tipo:** config

### Contexto

`P-9.5 (Deploy Final)` nunca rodou: os 13 critérios estão `[ ]`, não existe `.github/workflows/deploy.yml` nem `apps/*/vercel.json`. Junto com ele, três camadas prometidas na stack não existem em nenhum lugar do código: **security headers** (nenhum `headers()` em `packages/config/src/next.ts`, e os 9 apps consomem `createNextConfig()` sem override), **observabilidade** (nenhum Sentry/PostHog/Axiom/Better Stack) e **rate limiting** (nenhuma dependência Upstash).

A ausência de headers é a mais concreta: sem `frame-ancestors`/`X-Frame-Options`, as telas de aprovação financeira e de votação de projeto podem ser embutidas em iframe de terceiro.

Também não há `.env.example` por app — o deploy são 9 projetos Vercel independentes e não existe documento dizendo quais variáveis cada um precisa, o que leva a colar `SUPABASE_SERVICE_ROLE_KEY` em apps que não a usam.

### Objetivo

Executar P-9.5 com as camadas de produção que faltam, tratando-as como pré-requisito e não como polimento.

### Arquivos envolvidos

- `packages/config/src/next.ts` — `async headers()` com CSP (começar em `report-only`), HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- `apps/*/sentry.{client,server,edge}.config.ts` _(criar)_ + `@sentry/nextjs`
- `packages/config/src/rate-limit.ts` _(criar)_ — `@upstash/ratelimit`, aplicado em `/api/heartbeat`, login, cadastro e submissão de projeto
- `.github/workflows/deploy.yml` _(criar)_
- `apps/*/.env.example` _(criar, 9 arquivos)_ — derivados do que cada app efetivamente lê
- `packages/db/src/seed.ts` — seed de produção conforme o escopo de P-9.5

### Critérios de aceite

- [x] Os 9 apps enviam o conjunto completo de security headers (verificado por requisição real) — `packages/config/src/next.ts` (`createNextConfig`), verificado com `next build`+`next start`+`curl` real no app admin (os outros 8 usam o mesmo `createNextConfig`, sem override). CSP em `Report-Only` conforme pedido; endurecer para bloqueante fica para depois de observar violações em produção.
- [ ] Sentry captura erro em todos os 9 apps (teste com erro proposital) — **PARCIAL.** SDK completo nos 9 apps (`@sentry/nextjs`, `instrumentation.ts`+`instrumentation-client.ts`, `withSentryConfig`, os 23 `error.tsx`/`global-error.tsx` chamando `Sentry.captureException`), build real verificado sem DSN configurado (SDK desliga sozinho). Falta criar os 9 projetos Sentry e testar captura em produção — ver `AUDIT/PACOTE-5-RUNBOOK.md` §5.
- [x] `/api/heartbeat` recusa acima do limite configurado — `packages/auth/src/rate-limit.ts` + `apps/radio/.../heartbeat/route.ts` (60/5min por IP, 429 real), mais `acceptInvitation` (intranet) e `submitProject` (projetos). Testado com o limitador em memória (`packages/auth/src/__tests__/rate-limit.test.ts`, 6 testes); proteção real entre instâncias serverless depende de Upstash em produção (runbook §6).
- [x] Cada app tem `.env.example` só com as variáveis que ele lê; nenhum app sem uso de service role recebe a chave — 9 arquivos criados a partir do grep real de `process.env` por app + o que cada pacote compartilhado exige incondicionalmente (mapa completo na sessão).
- [ ] `INNGEST_SIGNING_KEY` configurada em produção (sem ela o serve opera em modo dev) — ação manual, runbook §8.
- [ ] Todos os crons do catálogo registrados em produção, verificados 1 a 1 — catálogo completo dos 16 crons levantado e documentado no runbook §8; verificação em produção é manual, pós-deploy.
- [ ] pg_cron de partições ativo; SSO verificado entre os 9 subdomínios — ação manual (depende do Supabase de produção e dos domínios reais no ar), runbook §4 e §9.
- [ ] Demais critérios originais de P-9.5 — **PARCIAL.** `.github/workflows/deploy.yml` criado (dispara após CI verde na main, um job por app via Vercel CLI); falta criar os 9 projetos Vercel + secrets no GitHub (runbook §1–2), Better Stack (runbook §7), aplicar a migration no Supabase de produção e migrar os usuários do legado (P-9.0 — fora do escopo desta sessão, é o PACOTE 7). Seed de produção estendido (`packages/db/src/seed/producao.ts`): plano de contas com "Doações", 2 super_admins e as 3 designações, todos idempotentes e sem identidade inventada (lêem de env var, pulam com aviso se ausente) — 6 workspaces/2 unidades de flat/8 papéis já vinham prontos por migration, confirmado nesta sessão. Checklist operacional completo em `AUDIT/PACOTE-5-RUNBOOK.md`.

---

## PACOTE 6 — Impersonação: implementar ou revogar (P1)

**Fase:** correção · **Módulo:** admin + fundação · **Tipo:** integration

### Contexto

`BRAIN.md:279` marca a impersonação como **ESSENCIAL**, com propósito declarado: _"usado para suporte telefônico sem AnyDesk"_. O que existe é a moldura completa e bem-feita — cookie assinado com HMAC-SHA256 e `timingSafeEqual`, falha fechada em produção sem segredo, expiração de 8h, audit de início e fim com duração e IP, banner persistente. O que não existe é o núcleo: **`resolveSession` (`packages/auth/src/server.ts:71-116`) nunca lê o cookie**. Busca exaustiva: só duas leituras no repositório inteiro, ambas em `apps/admin` (gravar/limpar e renderizar o banner).

Na prática, "impersonar" grava um cookie, mostra uma tarja no Admin e registra no audit que a impersonação aconteceu — enquanto o super_admin continua sendo ele mesmo, em todos os 9 apps. O propósito declarado é inatingível. Não há risco de segurança (nada honra o cookie), há risco de registro: o audit afirma um fato que não ocorreu.

### Objetivo

Decidir com a diretoria e executar uma das duas saídas — sem terceira opção.

**(a) Implementar:** `resolveSession` lê e valida o cookie; se válido, devolve `actorId`/`roles` do impersonado, preservando o super_admin real como ator no audit. Banner sobe para `AppShell` (`packages/ui`), aparecendo nos 9 apps.
**(b) Revogar:** PATCH removendo "ESSENCIAL" do BRAIN §6.1; apagar cookie, banner, actions e a ação de audit.

### Arquivos envolvidos

_(caminho a)_ `packages/auth/src/server.ts`, `packages/ui/src/components/app-shell.tsx`, `packages/db/src/audit.ts`
_(caminho b)_ `apps/admin/src/actions/impersonation.ts`, `packages/auth/src/impersonation.ts`, `apps/admin/src/app/(dashboard)/layout.tsx`, `BRAIN.md`, `PATCHES/`

### Critérios de aceite (caminho a)

- [ ] Impersonar e abrir Projetos/Plataforma/Flats mostra o que o usuário-alvo vê
- [ ] O audit registra o super_admin como ator, nunca o impersonado
- [ ] Banner visível nos 9 apps enquanto a impersonação estiver ativa
- [ ] Impersonação não permite ao super_admin fazer nada que ele já não pudesse (sem escalonamento)
- [ ] Expiração de 8h encerra a sessão impersonada

---

## PACOTE 7 — Escopo v1 pendente: decisão da diretoria (P1)

**Fase:** decisão + correção · **Módulo:** projetos, flats, plataforma, intranet · **Tipo:** decisão

### Contexto

Seis entregáveis declarados no escopo v1 não existem em código. Diferente dos demais pacotes, aqui a primeira entrega é uma **decisão**, não código — para cada item, implementar ou emitir PATCH revogando.

| Item                                             | Onde está declarado                                                | Estado                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **P-2.14** duplicidade de projetos via pgvector  | `BRAIN.md:576`, PATCH-012 (Filipe: _"Pode criar os prompts"_)      | prompt nunca escrito; **0 ocorrências de `pgvector`/`embedding` no repositório** |
| **P-2.13** detecção de renovação                 | `BRAIN.md:575`, PATCH-012, **e PRD requisito 5**                   | `parent_project_id` existe e nunca é preenchido                                  |
| **P-7.13** assistência de IA no scoring de flats | `BRAIN.md:577`, PATCH-012                                          | prompt nunca escrito                                                             |
| **P-9.0** migração de usuários do legado         | `BRAIN.md:580`; `PROMPTS.md:10531` o declara pré-condição de P-9.5 | **não existe como prompt**                                                       |
| **Bunny.net Stream** (vídeo do LMS)              | `BRAIN.md:53`, `.docs/Claude.md` §4.3                              | instrutor cola URL à mão; sem upload, sem URL assinada                           |
| **Google Calendar** (Intranet)                   | `BRAIN.md:428`                                                     | calendário interno existe; integração não                                        |

O **P-9.0 é o mais urgente dos seis**: os ~150 usuários atuais não têm caminho de entrada no sistema novo, e P-9.5 o declara pré-condição.

O requisito 5 do PRD (formulário "inteligente" que avisa duplicidade e auto-preenche renovação) é exigência direta do documento de produto, não só do BRAIN — merece peso maior na decisão.

### Critérios de aceite

- [ ] Cada um dos seis tem destino explícito registrado: prompt escrito **ou** PATCH revogando
- [ ] `BRAIN.md` §8 reflete a decisão — nenhum item continua em "Mantido na v1" sem prompt correspondente
- [ ] P-9.0 escrito e executado antes de P-9.5 (extração do legado → `auth.users` via Admin API → convite/reset em massa)
- [ ] Se Bunny for revogada: assumir explicitamente que o vídeo é hospedado fora com link público, e registrar a consequência de acesso (hoje a URL colada não é assinada — quem tiver o link assiste sem matrícula)

---

## PACOTE 8 — Robustez do Financeiro em escala (P2)

**Fase:** correção · **Módulo:** financeiro · **Tipo:** integration

### Contexto

`getTransactions()` (`apps/financeiro/src/lib/queries.ts:211-224`) faz `tx.select().from(transactions)` — sem `where`, sem `limit`, sem `orderBy` — e o mesmo para `transactionReversals`. São 10 selects irrestritos no Financeiro, dos quais 6 sobre tabelas que crescem sem teto. **Não existe paginação em nenhuma listagem do ecossistema** (`.offset(`/cursor: 0 ocorrências). A tela de auditoria do Admin usa `.limit(500)` sem paginação, o que torna inalcançável qualquer registro além dos 500 mais recentes — enquanto `BRAIN.md:282` promete "audit logs pesquisáveis com filtros avançados".

Somam-se: 8 FKs sem índice em caminhos de consulta reais, o lote semanal que não reenvia e-mail no retry (`D5-001`), e a conciliação que sugere payable/receivable só por valor quando `BRAIN.md:413` especifica "valor + data + descrição".

### Objetivo

Tirar o Financeiro do formato "carrega tudo" antes que o volume force, e fechar os dois desvios de especificação.

### Arquivos envolvidos

- `apps/financeiro/src/lib/queries.ts` — `where` por período (padrão: mês corrente), `orderBy(desc(date))`, `limit`/`offset` em `getTransactions`, `getPayables`, `getReceivables`, `getBatchApprovals`
- `apps/admin/src/app/(dashboard)/auditoria/page.tsx` — paginação por cursor sobre `created_at`
- `packages/db/src/migrations/NNNN_fk_indexes.sql` _(criar)_ — os 8 índices de `D2-002`
- `packages/jobs/src/crons/financeiro.ts` — separar em `step.run("create-batch")` + `step.run("notify-recipients")`; guarda de idempotência passa a considerar se a notificação ocorreu
- `apps/financeiro/src/actions/conciliation.ts` — janela de data + descrição na sugestão de payable/receivable

### Critérios de aceite

- [ ] Nenhuma listagem carrega tabela inteira; toda tela de lançamento tem filtro de período e paginação
- [ ] Auditoria alcança registros além dos 500 mais recentes
- [ ] Falha no envio do e-mail do lote não impede o reenvio no retry (teste simulando falha no destinatário 2 de 3)
- [ ] Sugestão de conciliação usa valor + data + descrição
- [ ] Lint passa · Types passam

---

## PACOTE 9 — Gates e RLS residuais (P2)

**Fase:** correção · **Módulo:** projetos, admin, intranet, plataforma, financeiro · **Tipo:** integration

### Contexto

Quatro pontos onde a defesa em profundidade está reduzida sem que isso tenha sido decidido:

1. **`D1-004`** — `createContestation` (`apps/projetos/src/actions/projects.ts:788`) devolve um projeto de homologação para votação e usa `projetosAction`, que só verifica autenticação. Só a RLS impede um submissor. Correção: trocar por `conselheiroDiretorAction`, que já existe no mesmo arquivo — uma linha.
2. **`D6-002`** — a regra de conflito de interesse do `BRAIN.md:151-154` é verificada em `apps/admin/src/actions/roles.ts` e **não** nos outros dois caminhos que gravam papéis (`users.ts:478`, `invitations.ts:122`). `sendInvitation` aceita `["diretor","submissor"]` sem reclamar.
3. **`D1-006`** — `getCourseCoverReadUrl` e `getMyAvatarReadUrl` assinam qualquer `storagePath` que o cliente enviar, sem verificar propriedade. O padrão certo está no mesmo arquivo: `getMyAvatarUploadUrl` **constrói** o path a partir de `ctx.actorId`.
4. **Débito PATCH-016** — a policy `batch_approvals_update_gestor` não contempla o autorizador, então a autorização de pagamento roda sob `withSystemRole`, contornando a camada 3 na mutação financeira mais sensível do ecossistema.

### Arquivos envolvidos

- `apps/projetos/src/actions/projects.ts` (~788)
- `packages/db/src/conflict-of-interest.ts` _(criar)_ — extrair `checkConflictOfInterest`
- `apps/admin/src/actions/roles.ts`, `apps/admin/src/actions/users.ts`, `apps/intranet/src/actions/invitations.ts`, `apps/admin/src/actions/invitations.ts`
- `apps/plataforma/src/actions/uploads.ts`, `apps/intranet/src/actions/profile.ts`
- `packages/db/src/migrations/NNNN_batch_approvals_autorizador.sql` _(criar)_

### Critérios de aceite

- [ ] `createContestation` recusa submissor **na camada de aplicação**, com mensagem clara
- [ ] Os três caminhos de concessão de papel recusam a combinação diretor+submissor / conselheiro+hóspede; `sendInvitation` falha cedo
- [ ] Leitura de avatar e capa só assina path que pertence ao recurso/usuário pedido
- [ ] `authorizeBatch` roda sem `withSystemRole` — a policy cobre diretor com designação `autorizador`
- [ ] Teste de RLS por papel para cada um dos quatro pontos

---

## PACOTE 10 — Camada de IA (P2)

**Fase:** correção · **Módulo:** projetos, financeiro · **Tipo:** integration

### Contexto

Os três módulos de `packages/ai` constroem o client sem `timeout` (`new OpenAI({ apiKey })`), e `scoreProject` interpola texto livre do submissor direto no prompt (`scoring.ts:94-134`): `title`, `objectives`, `justification`, `targetAudience`, `expectedResults`. Um submissor pode escrever instruções no campo Justificativa; o prompt pede JSON com `"score"` e roda em `temperature: 0.3`.

O score alimenta a triagem da diretoria e o submissor **não o vê** — então uma manipulação bem-sucedida também não é percebida. O tratamento de falha, por outro lado, está correto (`try/catch` não-bloqueante com log estruturado, `apps/projetos/src/actions/projects.ts:581-583`) e não deve ser mexido.

O padrão certo já existe no repositório: `ocr.ts:119` passa o contexto adicional como **mensagem separada** em vez de concatenar.

### Arquivos envolvidos

- `packages/ai/src/projects/scoring.ts`, `packages/ai/src/projects/compact-version.ts`, `packages/ai/src/financeiro/ocr.ts`

### Critérios de aceite

- [ ] Os três clients declaram `timeout` compatível com o limite da Server Function e `maxRetries` explícito
- [ ] Texto do submissor vai em mensagem `user` separada e delimitada; o `system` instrui que é dado a avaliar, não instrução a seguir
- [ ] Teste com payload de injeção conhecido não altera o score
- [ ] O comportamento não-bloqueante em falha permanece inalterado

---

## PACOTE 11 — Higiene, consistência e registro (P3)

**Fase:** correção · **Módulo:** todos · **Tipo:** ui + config

### Contexto

Nove itens de baixo risco, agrupados por serem todos mecânicos.

- **`D6-004`** — `ProjectStage` tem 9 valores em `packages/types` e 8 no banco; `"cancelado"` sobrevive em 5 pontos de UI e num `return` defensivo (`pipeline/page.tsx:196-199`). O cancelamento no BRAIN §6.2 é soft-delete, não estágio.
- **`D6-001`** — `PROMPTS.md:26,51,56,57` diz "3 pendentes"; P-0.4b foi feito em S-172, P-7.1b foi absorvido por S-121, e P-7.5b foi superado por P-7.6–P-7.12. Nenhum está pendente.
- **`D3-001`** — `CommandMenu` vive em `apps/tarefas` em vez de `packages/ui`; `DataTable`/`Combobox`/`DatePicker` não existem, e TanStack Table (declarado na stack) é usado em 1 arquivo de todo o monorepo.
- **`D4-001`** — `apps/radio/src/app/api/heartbeat/route.ts:39`: `catch { return 400 "trackId inválido" }` transforma qualquer falha de banco em erro de validação, sem log. O sintoma em produção seria "a audiência caiu para zero".
- **`D4-005`** — N+1 em `plataforma/lib/queries.ts:954` (uma transação por certificado) e `flats/lib/queries.ts:372` (uma chamada de storage por documento). A correção já existe no repositório: `resolveAvatarReadUrls` (`intranet/lib/queries.ts:191`) usa `createSignedUrls` em lote.
- **`D5-002`** — arquivo antigo de avatar e capa nunca é removido ao ser substituído.
- **`D1-003`** — `createAidRequest` e `checkAndIssueCertificate` exportadas de arquivos `"use server"` (não exploráveis, mas superfície desnecessária).
- **`NEG-011`** — portal de Documentos sem `sitemap.ts`, `robots.ts` e structured data (OG tags existem).
- **`NEG-005`** — Flats e Rádio nunca receberam sessão de auditoria de bloco, ao contrário dos outros 5 módulos.
- **Resíduo:** `0019_shocking_wrecking_crew.sql` — migration auto-gerada pelo drizzle-kit que sobreviveu ao P-0.3c; já aplicada em produção, então renomear exige `ID_RENAMES` (`packages/db/src/migrate.ts:41`).

### Critérios de aceite

- [ ] `ProjectStage` tem 8 valores; nenhum ramo morto de `"cancelado"` sobra
- [ ] `PROMPTS.md` reflete o estado real das correções
- [ ] `CommandMenu` em `packages/ui`; decisão explícita sobre TanStack Table (adotar ou remover da stack declarada)
- [ ] `/api/heartbeat` distingue falha de infraestrutura (500 + log) de FK inválida (400)
- [ ] Nenhuma consulta abre conexão por linha
- [ ] Arquivo substituído de avatar/capa é removido do bucket
- [ ] `sitemap.ts` + `robots.ts` no portal de Documentos
- [ ] Sessões de auditoria de bloco de Flats e Rádio executadas, ou risco aceito por escrito

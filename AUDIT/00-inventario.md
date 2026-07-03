# AUDIT/00 — Inventário e Mapa de Rastreabilidade

**Fase:** 0 (inventário — sem julgamento de mérito)
**Data:** 2026-07-02
**Auditor:** agente Fable 5 (sessão de auditoria, read-only fora de `AUDIT/`)
**Insumos lidos integralmente:** `BRAIN.md` (546 linhas), `SESSIONS.md` (2058 linhas), `PROMPTS.md` (4681 linhas). Estrutura do repo verificada no filesystem e no git.
**Specs auxiliares localizadas (leitura profunda deferida às Fases 1–2):** `.docs/` contém PRD (97 l), Identidade Visual (298 l), Edital Flats (91 l), Claude.md (856 l), SDD-STRUCTURE.md (381 l), Respostas1–10 (~860 l), CL_FASE1.md (337 l), DS_AUDIT.md (172 l). Na raiz: `PRODUCT.md` (não referenciado por BRAIN/CLAUDE/PROMPTS).

---

## 1. Estrutura real do monorepo

### 1.1 Apps — código real vs. scaffold

| App | Arquivos ts/tsx em `src/` | Estado real | Fase no plano |
| --- | --- | --- | --- |
| `apps/admin` | 44 | **Código real** — páginas, components, actions, 4 suites de teste + setup | Fase 1 (concluída) |
| `apps/documentos` | 48 | **Código real** — portal público, editorial, actions, 3 suites de teste + setup | Fase 1 (concluída) |
| `apps/projetos` | 57 | **Código real** — submissor + diretoria, wizard, actions, 4 suites de teste + setup | Fase 2 (concluída) |
| `apps/financeiro` | 39 | **Código real** — Bloco A completo + schema/RLS/actions do Bloco B; **0 testes**; UI ainda mockada (P-3.9 pendente) | Fase 3 (em andamento — parou em P-3.8) |
| `apps/intranet` | 4 | **Parcial** — apenas login canônico + middleware (produto do P-0.4, não da Fase 5) | Fase 5 (pendente) |
| `apps/plataforma` | 0 | **Scaffold** — só package.json, tsconfig, eslint.config, next-env.d.ts | Fase 6 (pendente) |
| `apps/radio` | 0 | **Scaffold** (idem) | Fase 8 (pendente) |
| `apps/flats` | 0 | **Scaffold** (idem) | Fase 7 (pendente) |
| `apps/tarefas` | 0 | **Scaffold** (idem) | Fase 4 (pendente) |

### 1.2 Packages

| Package | Arquivos | Conteúdo real |
| --- | --- | --- |
| `packages/ui` | 20 | tokens.css, patterns.css, 18 componentes (AppShell, sidebar, estados, notificações, impersonation-banner, brand-mark…) |
| `packages/db` | 12 | client, migrate.ts (runner), schemas: public, admin, documentos, projetos, financeiro, notifications + rls/admin.ts |
| `packages/auth` | 7 | client browser/middleware, MFA, impersonation, types |
| `packages/email` | 13 | layout, send, 14 templates (admin 3, documentos 3, projetos 4 + base) |
| `packages/validators` | 5 | admin, documentos, projetos, financeiro |
| `packages/types` | 6 | roles, admin, documentos, projetos, financeiro |
| `packages/ai` | 4 | projects/scoring, projects/compact-version, financeiro/ocr |
| `packages/config` | 1 | stub (`src/index.ts`) — validação de env com t3-env citada na S-1 mas nunca implementada |

Schemas de banco **sem** arquivo Drizzle nem migration: `tarefas`, `intranet`, `plataforma`, `flats`, `radio` (os `CREATE SCHEMA` existem desde 0000, sem tabelas — conforme plano).

### 1.3 Migrations (`packages/db/src/migrations/`)

Ordem alfabética real (a que o runner de P-0.3b aplica):

```
0000_easy_alex_power.sql        (gerada pelo Drizzle Kit)
0000_initial.sql
0001_notifications.sql
0002_admin.sql
0003_admin_rls.sql
0004_invitation_accepted_enum.sql
0005_documentos.sql
0005_documentos_rls.sql         ← número duplicado (0005)
0006_documentos_audit_actions.sql
0007_projetos.sql
0007_projetos_rls.sql           ← número duplicado (0007)
0008_project_attachments.sql
0009_financeiro_rls.sql         ← número duplicado (0009) e ordena ANTES de
0009_fix_rls_org_members_votes.sql
0010_financeiro.sql             ← …0010, que cria as tabelas que 0009_financeiro_rls altera
```

**Fato registrado (verificação na Fase 3):** em ordem alfabética, `0009_financeiro_rls.sql` (refina policies do schema financeiro) precede `0010_financeiro.sql` (cria as tabelas). Se aplicadas do zero pelo runner, a ordem é inválida. Não julgo aqui se o banco atual foi aplicado manualmente na ordem correta — verificar na Fase 3.

Divergência de numeração prompt ↔ arquivo (documentada nas SESSIONS, fato): P-1.18 pedia `0004_documentos.sql` → saiu `0005`; P-2.6 pedia `0006` → saiu `0007`; P-3.6 pedia `0008` → saiu `0010`; P-3.7 pedia `0009` → saiu `0009_financeiro_rls` (colidindo com `0009_fix_rls...`).

### 1.4 Referências de design e documentos avulsos

- `design-refs/`: `admin`, `documentos`, `financeiro`, `projetos`, `logotipos` (+ README). BRAIN §5 cita "hoje: admin, documentos, financeiro" — `projetos` chegou depois, consistente com "os demais chegam conforme gerados".
- `PATCHES/`: **vazio** (só `.gitkeep`). Nenhum PATCH registrado até hoje.
- Raiz: `PRODUCT.md` (não referenciado por nenhuma spec), `__test_db.mjs` (script solto), `PROMPT_AUDITORIA.md` (este processo).
- `.docs/` contém `CL_FASE1.md` e `DS_AUDIT.md`, não referenciados por BRAIN/CLAUDE/PROMPTS.

---

## 2. Matriz de rastreabilidade — BRAIN → prompts

Convenção de status: **C** = declarado concluído · **P** = pendente · **~** = parcial declarado · **∅** = sem prompt (órfão, ver §4).

### §2–§3 Fundação, stack e arquitetura

| Requisito/decisão do BRAIN | Prompt(s) | Status |
| --- | --- | --- |
| Monorepo pnpm+Turbo, 9 apps, 8 packages, TS strict | P-0.1 | C |
| Design system fork shadcn, tokens, tipografia Parkinsans+Titillium | P-0.2, P-0.2b, P-1.12b | C |
| Supabase + Drizzle, schemas por app, tabelas public | P-0.3, P-0.3b | C |
| Auth email+senha+magic link, SSO cookie domínio raiz, login canônico | P-0.4 | C |
| MFA TOTP obrigatório super_admin/diretor | P-0.4 | C (verify: fluxo challenge existe; **UI de enrollment sem prompt** — débito S-5, órfão §4.1) |
| AppShell/layout compartilhado | P-0.5 | C |
| Notificações in_app + email (Resend/React Email) | P-0.6 | C |
| RBAC 3 camadas (middleware + gates + RLS) | P-0.4 + P-X.7 de cada módulo + P-9.1 | C p/ admin, documentos, projetos, financeiro; P demais |
| Decisão pendente: conexão superuser bypassa RLS nas actions | P-9.1 (auditar e decidir) | P |
| Papéis (8) e designações (gestor/autorizador/avaliador) | P-0.3, P-1.8, P-3.7 | C |
| Conflitos de interesse (diretor ≠ submissor/hóspede) | P-1.8, P-1.12, P-7.7 | C (admin) / P (flats) |
| Deploy Vercel 9 projetos, DNS, CI/CD, seed | P-9.5 | P |
| Observabilidade: Sentry + Better Stack | P-9.5 | P |
| Observabilidade: Axiom/logs, PostHog/métricas, Vercel Analytics | ∅ | órfão §4.1 |
| Background jobs Inngest (infra/cliente) | ∅ (usado como pressuposto em P-1.8, P-2.10, P-4.8, P-5.10, P-8.11, mas nenhum prompt monta a infra) | órfão §4.1 |
| Cache Upstash Redis (feature flags) | ∅ | órfão §4.1 |
| Realtime como barramento de eventos cross-app (§7 "regra geral") | ∅ (só uso pontual em P-8.8) | órfão §4.1 |

### §6.1 Admin (Fase 1)

| Requisito | Prompt(s) | Status |
| --- | --- | --- |
| Tipos, componentes, telas, forms, estados (Bloco A) | P-1.1–P-1.5 | C |
| Schema admin (audit_log particionado, invitations, templates, reuniões, flags, settings) | P-1.6 | C |
| RLS admin DENY-by-default | P-1.7 | C |
| Server Actions (CRUD usuários, convites, papéis, designações, flags, reuniões) + audit | P-1.8 | C |
| Integração UI↔backend | P-1.9 | C |
| Notificações/templates editáveis | P-1.10 | C |
| Impersonação auditada com banner | P-1.11 | C |
| Testes (RLS, actions, conflito, impersonação) | P-1.12 | C |
| **Cadastro unificado auto-signup + aprovação por super_admin** | ∅ — S-16 registra que `pending_approval` não é derivável do schema e o botão foi omitido | órfão §4.1 |
| Reunião mensal auto-criada (1ª quarta) | P-1.8 (action existe; **trigger/cron Inngest não configurado** — débito S-15) | ~ |

### §6.7 Documentos (Fase 1)

| Requisito | Prompt(s) | Status |
| --- | --- | --- |
| Bloco A (tipos, componentes, telas, forms, estados) | P-1.13–P-1.17 | C |
| Schema documentos (visibility, árvore, versões, editais, subscriptions, views) | P-1.18 | C |
| RLS documentos | P-1.19 | C em PROMPTS; **sem entrada no SESSIONS** (ver §7.2) |
| Server Actions (CRUD, upload, versionamento, busca, views) | P-1.20 | C |
| Integração UI↔backend | P-1.21 | C (entrada no corpo do SESSIONS sem número S-, fora do índice) |
| Notificações (novo doc, edital aberto/fechando) | P-1.22 | C (funções criadas; **não chamadas pelas actions** — débito S-30; job 7 dias sem Inngest) |
| Edital → botão submeter projeto com query params | P-1.23 | C |
| Testes | P-1.24 | C |
| Versionamento com histórico | P-1.18/P-1.20 | C |
| Visibilidade public/internal/restricted por papel | P-1.18/P-1.19 | C |

### §6.2 Projetos (Fase 2)

| Requisito | Prompt(s) | Status |
| --- | --- | --- |
| Bloco A completo | P-2.1–P-2.5 | C |
| Schema projetos (orgs N:N, projects, versions, votes, contestations, reports, payment_schedules) | P-2.6 | C |
| RLS (voto secreto, score oculto de submissor) | P-2.7 | C |
| State machine, votação/quórum/pânico, contestação (2/proj, 1/pessoa), soft-delete | P-2.8 | C |
| Bloqueio por orçamento excedido | P-2.8 | C — **workaround**: consulta `admin.system_settings`, não o Financeiro (S-40); BRAIN diz "orçamento definido no Financeiro" |
| Score IA + versão compacta (GPT-4.1, critérios/template do Admin) | P-2.8 + packages/ai | C |
| Integração UI↔backend | P-2.9, P-2.9b | C |
| Notificações (9 fluxos) | P-2.10 | C com 2 itens [~] (lembretes de relatório e lista p/ avaliador — dependem de Inngest inexistente) |
| Cross-app (Financeiro stub, Tarefas stub, edital prefill, score flats) | P-2.11 | **parcial** (S-43); PROMPTS marca [x] com 1 [~] |
| Testes (RLS, state machine, votação, fluxo) | P-2.12 | C em PROMPTS; **sem entrada no SESSIONS** (ver §7.2) |
| Designação de avaliador: **sugestão do sistema por afinidade** (região, categoria, histórico) | ∅ — P-2.8 cobre designar/registrar parecer; a sugestão automática por afinidade não aparece em nenhum prompt | órfão §4.1 |
| **Detecção de duplicidade via embeddings** | ∅ — BRAIN §6.2 lista sob IA, mas §8 defere embeddings para v2+ (tensão interna, Fase 1) | órfão/contradição §4.1 |
| **Detecção de renovação (auto-preenche de projetos anteriores)** | ∅ — mantida na v1 (§8), nenhum prompt a implementa | órfão §4.1 |
| Inadimplência de relatório **bloqueia pagamentos** (override super_admin) | P-2.10 notifica o bloqueio; nenhum prompt especifica o mecanismo de bloqueio em si | órfão parcial §4.1 |
| Periodicidade de relatório configurável por projeto | P-2.1/P-2.6 (campos) | C (verificar na Fase 2) |

### §6.5 Financeiro (Fase 3)

| Requisito | Prompt(s) | Status |
| --- | --- | --- |
| Bloco A completo | P-3.1–P-3.5 | C |
| Schema (14 tabelas; transactions imutável por trigger) | P-3.6 | C |
| RLS + has_designation | P-3.7 | C |
| Actions (imutabilidade, estorno, import OFX/CSV, match, lote semanal, governança dual, OCR) | P-3.8 | C |
| Integração UI↔backend | P-3.9 | **P — primeiro prompt pendente** |
| Notificações (lote, alerta 80%, relatório mensal) | P-3.10 | P |
| Cross-app real (Projetos→Financeiro, executado vs orçado) | P-3.11 | P |
| Testes | P-3.12 | P |
| **Orçamento por instituição/ano (teto de submissão de projetos)** | ∅ — P-3.6 criou `budgets`/`budget_items` por centro de custo/categoria; a tabela `financeiro.organization_budgets` prevista na S-40 não existe em nenhum prompt | órfão §4.1 |
| Relatório mensal com recibos **PDF+XLSX+ZIP exportado pelo super_admin** | P-3.10 cobre e-mail mensal PDF+XLSX; export manual com ZIP de recibos não aparece | órfão parcial §4.1 |

### §6.9 Tarefas (Fase 4) · §6.6 Intranet (Fase 5) · §6.3 Plataforma (Fase 6) · §6.8 Flats (Fase 7) · §6.4 Rádio (Fase 8)

Todos pendentes (nenhum checkbox marcado). Cobertura requisito→prompt em resumo:

| Requisito BRAIN | Prompt(s) | Observação de cobertura |
| --- | --- | --- |
| Tarefas: workspaces fixos, 3 views, recorrência, templates, aprovações de diretor, foco/pomodoro, time tracking, Cmd+K | P-4.1–P-4.12 | Cobertura completa no papel |
| Tarefas auto-geradas de outros módulos, sem assignee | P-4.11 (`createAutoTask`) | Coberto |
| Intranet: dashboard widgets, anúncios, KPIs, diretório, reuniões/decisões, busca global, briefing | P-5.1–P-5.12 | Coberto |
| Intranet: **calendário compartilhado com integração Google Calendar** | ∅ — P-5.3/P-5.9 usam apenas `admin.meeting_sessions` | órfão §4.1 |
| Plataforma: cursos, trilha sequencial, quiz, certificado automático, fóruns, busca simples | P-6.1–P-6.12 | Coberto |
| Plataforma: manuais líder/liderado como conteúdo de curso | (implícito em P-6.x) | Sem prompt de carga de conteúdo/curso piloto |
| **Migração de usuários do sistema legado** (v1 mantido, §8) | ∅ — nenhum prompt em nenhuma fase | órfão §4.1 |
| Flats: elegibilidade, 3 períodos, scoring 10 critérios/80 pts, desempate, 7d/12m, auxílio→Financeiro, check-in presencial | P-7.1–P-7.12 | Coberto |
| Flats: **IA para scoring (critérios subjetivos — item do §8 v1)** | ∅ — P-7.8 define scoring determinístico; nenhum uso de IA | órfão §4.1 |
| Rádio: escopo reduzido (Auto DJ, R2, PWA, termos, materiais exclusivos) | P-8.1–P-8.12 | Coberto, inclusive "SEM" explícitos |
| Rádio → Intranet KPI audiência | P-8.11 | Coberto |

### §7 Integrações cross-app

| Integração | Prompt(s) | Status |
| --- | --- | --- |
| Projetos → Financeiro (centro de custo + pagamentos não aprovados) | P-2.11 (stub) → P-3.11 (real) | ~ / P |
| Financeiro → Projetos (executado vs orçado) | P-3.11 | P |
| Tarefas → Projetos (checklist de análise) | P-2.11 (stub) → P-4.11 (real) | ~ / P |
| Plataforma → Intranet (KPI alunos) | P-5.11 (stub) → P-6.11 | P |
| Rádio → Intranet (audiência) | P-5.11 (stub) → P-8.11 | P |
| Flats → Tarefas (limpeza) | P-4.11 (stub) → P-7.11 | P |
| Flats → Financeiro (auxílio → despesas) | P-3.11 (stub) → P-7.11 | P |
| Documentos → Projetos (edital → wizard) | P-1.23 + P-2.11 | C / ~ (wizard ainda não chama `getEditalPrefill` — débito S-43) |
| Intranet → Tarefas (decisões → tarefas) | P-4.11 (stub) → P-5.11 | P |
| **Admin → Todos (push de configurações globais: logos, textos, flags)** | ∅ — P-1.8 cobre CRUD de settings/flags no Admin; o mecanismo de propagação/consumo pelos demais apps não tem prompt | órfão §4.1 |

### §8 Escopo v1 — itens mantidos, checagem de cobertura

| Item v1 | Coberto por | Status |
| --- | --- | --- |
| OCR notas fiscais | P-3.8 | C |
| Conciliação OFX/CSV | P-3.8 | C |
| Impersonação auditada | P-1.11 | C |
| IA: scoring, versão compacta, triagem | P-2.8 | C |
| IA: **detecção de renovação** | ∅ | órfão |
| IA: **scoring de flats** | ∅ (P-7.8 é determinístico) | órfão |
| Templates de email editáveis **com IA** | P-1.10 cobre editável; assistência de IA não aparece | órfão parcial |
| MFA TOTP | P-0.4 (enrollment UI órfã) | ~ |
| **Migração de usuários do legado** | ∅ | órfão |
| Modo foco + pomodoro | P-4.2/P-4.3 | P |
| Time tracking | P-4.2/P-4.8 | P |
| Fóruns de discussão | P-6.2/P-6.8 | P |

### Transversais (LGPD, erro, observabilidade, a11y)

| Tema | Cobertura em prompt | Observação |
| --- | --- | --- |
| LGPD | P-9.2 (único prompt dedicado) + item de checklist "consentimento granular" em todo prompt | Consentimento granular referido no checklist do BRAIN §9, mas nenhum prompt de cadastro o implementa antes de P-9.2 — insumo Fase 1 |
| Tratamento de erro / observabilidade | P-9.3 (performance), P-9.5 (Sentry) | Sem prompt de padrão de tratamento de erro; logging estruturado (Axiom) sem prompt |
| Acessibilidade | ∅ (aparece só como decisão pontual em sessões, ex. ARIA em S-7) | Sem requisito nem prompt — insumo Fase 1 |
| i18n | ∅ | pt-BR implícito; nunca declarado — insumo Fase 1 |

---

## 3. Matriz prompt → status declarado → artefatos

**Contagem geral:** 119 prompts base + 4 corretivos executados/definidos (P-0.2b, P-0.3b, P-1.12b, P-2.9b — o cabeçalho do PROMPTS.md diz "3 correções"; P-2.9b não foi somado lá).
**Declarados concluídos:** 50 base + 4 corretivos = **54** (≈ 42% dos 119 base — o prompt de auditoria menciona "~30%").

### 3.1 Concluídos (fronteira da Fase 2)

| Prompt | Sessão | Status SESSIONS | Artefatos declarados (verificação na Fase 2) |
| --- | --- | --- | --- |
| P-0.1 | S-1, S-2 | concluido | raiz do monorepo, tooling/, package.json de 9 apps + 8 packages |
| P-0.2 | S-3 | concluido | packages/ui (tokens antigos + 6 componentes) — corrigido por P-0.2b |
| P-0.2b | S-20 | concluido | packages/ui/src/tokens.css (reescrito), styles/patterns.css, 17 componentes migrados |
| P-0.3 | S-4 | concluido | packages/db (client, schema public, 0000_initial), packages/types/roles |
| P-0.3b | S-22 | concluido | packages/db/src/migrate.ts, README, drizzle.config |
| P-0.4 | S-5 | concluido | packages/auth, apps/intranet login + middleware |
| P-0.5 | S-6 | concluido | packages/ui: app-shell, sidebar, page-header, estados, user-menu |
| P-0.6 | S-7 | concluido | schema notifications + 0001, notification-bell/center, packages/email base |
| P-1.1–P-1.5 | S-8–S-12 | concluido | apps/admin Bloco A + validators/admin + types/admin |
| P-1.6 | S-13 | concluido | schema admin + 0002 (partições audit_log) |
| P-1.7 | S-14 | concluido | 0003_admin_rls + rls/admin.ts |
| P-1.8 | S-15 | concluido | apps/admin/src/actions/* + lib/audit, lib/safe-action |
| P-1.9 | S-16 | concluido | 7 páginas admin em RSC + remoção mock-data |
| P-1.10 | S-17 | concluido | 3 templates email + tela templates-email |
| P-1.11 | S-18 | concluido | impersonation (auth+ui+actions), filtros/export auditoria |
| P-1.12 | S-19 | concluido | apps/admin/src/__tests__ (45 testes declarados) |
| P-1.12b | (entrada sem nº, 2026-06-15) | concluido | admin.css esvaziado, hex→tokens, botões → `<Button>` |
| P-1.13 | S-23 | concluido (validação retrospectiva — arquivos já existiam em commit anterior) | types/validators/mock documentos |
| P-1.14–P-1.17 | S-24–S-27 | concluido | apps/documentos Bloco A |
| P-1.18 | S-28 | concluido | schema documentos + 0005_documentos.sql |
| **P-1.19** | **sem entrada** | — (PROMPTS marca [x]; `0005_documentos_rls.sql` existe) | migration RLS documentos |
| P-1.20 | S-29 | concluido | apps/documentos/src/actions/* |
| P-1.21 | entrada "Sessão P-1.21" sem nº S-, fora do índice | concluido | 7 páginas documentos integradas, mock removido |
| P-1.22 | S-30 | concluido | 3 templates + lib/notifications (não chamadas pelas actions — débito) |
| P-1.23 | S-31 | concluido | edital-submit-button, types/projetos placeholder |
| P-1.24 | S-32 | concluido | apps/documentos/src/__tests__ |
| P-2.1–P-2.5 | S-33–S-37 | concluido | apps/projetos Bloco A (rota divergente: `(diretoria)/pipeline/*` em vez de `(diretoria)/*` — registrado S-37) |
| P-2.6 | S-38 | concluido | schema projetos + 0007_projetos.sql |
| P-2.7 | S-39 | concluido | 0007_projetos_rls.sql |
| P-2.8 | S-40 | concluido | actions projetos + packages/ai/projects/* |
| P-2.9 | S-41 | concluido | páginas integradas + lib/queries, mock removido |
| P-2.9b | S-44 | concluido | shells server/client + logoutAction |
| P-2.10 | S-42 | concluido (2 critérios [~] no PROMPTS) | 4 templates + notifications (lembretes dependem de Inngest) |
| P-2.11 | S-43 | **parcial** (PROMPTS marca [x] com 1 [~]) | integrations/* + financeiro-stubs |
| **P-2.12** | **sem entrada** | — (PROMPTS marca [x]; 4 suites + setup existem em `apps/projetos/src/__tests__/`) | testes projetos |
| P-3.1 | S-46 | concluido | types/validators/mock financeiro |
| P-3.2–P-3.5 | S-47–S-50 | concluido | apps/financeiro Bloco A |
| P-3.6 | S-51 | concluido | schema financeiro + 0010_financeiro.sql |
| P-3.7 | S-52 | concluido | 0009_financeiro_rls.sql + has_designation |
| P-3.8 | S-53 | concluido | actions financeiro + packages/ai/financeiro/ocr |

Entradas de sessão **sem prompt correspondente**: S-45 "Polish — apps/projetos/src/app" (no índice, **sem corpo**); commits `4db663a` (AdminShell/icons), `502dec4` (`bank-account-form.tsx` — arquivo existe em apps/financeiro, não citado em nenhum prompt nem sessão), `financeiro-logo.tsx` (idem), `4b68f72` ("Refactor code structure"). Ver §7.

### 3.2 Pendentes (fronteira da Fase 4)

| Bloco | Prompts | Módulo/artefatos previstos |
| --- | --- | --- |
| Financeiro B (restante) | P-3.9–P-3.12 | integração UI, notificações, cross-app real, testes |
| Tarefas | P-4.1–P-4.12 | apps/tarefas completo + schema tarefas (migration prevista "0010/0011" — números já ocupados) |
| Intranet | P-5.1–P-5.12 | apps/intranet completo + schema intranet |
| Plataforma | P-6.1–P-6.12 | apps/plataforma completo + schema plataforma |
| Flats | P-7.1–P-7.12 | apps/flats completo + schema flats |
| Rádio | P-8.1–P-8.12 | apps/radio completo + schema radio + R2 |
| Polimento | P-9.1–P-9.5 | security audit, LGPD, performance, copy, deploy |

Fato para a Fase 4: os números de migration citados nos prompts pendentes (P-4.6 `0010_tarefas.sql`, P-5.6 `0012`, P-6.6 `0014`, P-7.6 `0016`, P-8.6 `0018`, P-9.x `0020–0022`) **já colidem** com a numeração real do diretório (0010 ocupado pelo financeiro).

---

## 4. Órfãos e não-ancorados

### 4.1 Requisitos do BRAIN sem prompt (órfãos) — insumo da Fase 1

| # | Requisito órfão | Origem no BRAIN | Gravidade aparente (a confirmar na Fase 1) |
| --- | --- | --- | --- |
| O-1 | Auto-signup com fluxo de aprovação (conta → instituição → aprovação super_admin) | §6.1, §6.2 | Alta — é a porta de entrada de submissores; S-16 já registrou a lacuna |
| O-2 | Migração de usuários do sistema legado | §8 (v1 mantido) | Alta — pré-requisito de go-live |
| O-3 | Infraestrutura Inngest (cliente, deploy, crons) | §2; pressuposta por P-1.8, P-2.10, P-4.8, P-5.10, P-8.11 | Alta — vários critérios [~] já dependem dela |
| O-4 | UI de enrollment MFA TOTP | §2 (MFA obrigatório p/ super_admin/diretor) | Média — hoje exige Supabase Dashboard (débito S-5) |
| O-5 | Orçamento por instituição/ano no Financeiro (`organization_budgets`) | §6.2 + §6.5 | Alta — bloqueio de submissão usa workaround via system_settings |
| O-6 | Sugestão de avaliador por afinidade (região/categoria/histórico) | §6.2 | Média |
| O-7 | Detecção de renovação (auto-preenchimento) | §6.2, §8 | Média |
| O-8 | Detecção de duplicidade via embeddings | §6.2 vs §8 (v2+) — contradição interna | Fase 1 decide |
| O-9 | Mecanismo de bloqueio de pagamentos por inadimplência de relatório (com override) | §6.2 | Média |
| O-10 | Export mensal PDF+XLSX+ZIP com recibos (ação manual do super_admin) | §6.5 | Média |
| O-11 | Integração Google Calendar (calendário compartilhado) | §6.6 | Média |
| O-12 | IA para scoring de flats | §8 vs P-7.8 determinístico | Fase 1 decide |
| O-13 | Templates de email editáveis **com IA** | §8 | Baixa |
| O-14 | Admin → Todos: push/consumo de configurações globais (logos, textos, flags) pelos apps | §7 | Média |
| O-15 | Observabilidade: Axiom/logs, PostHog, Vercel Analytics | §2 | Baixa (Sentry/Better Stack estão em P-9.5) |
| O-16 | Cache Upstash (feature flags) | §2 | Baixa |
| O-17 | Consentimento granular no cadastro antes de P-9.2 (LGPD como retrofit, não requisito de cada cadastro) | §9 checklist vs prompts | Fase 1 decide |
| O-18 | Barramento de eventos cross-app (Realtime + triggers + Inngest) como mecanismo geral | §7 | Média — cada integração hoje é chamada direta fire-and-forget |

### 4.2 Prompts/artefatos sem ancoragem clara no BRAIN

| # | Item | Onde | Observação |
| --- | --- | --- | --- |
| N-1 | NoteWidget — notas pessoais em timestamp do vídeo | P-6.2, P-6.6, P-6.8 | BRAIN §6.3 não menciona notas de aluno |
| N-2 | Quiz (tipos, editor, attempts, passing_score) | P-6.1–P-6.8 | BRAIN §6.3 não menciona quizzes; certificação é "concluir trilha = certificado" |
| N-3 | Certificado com hash de verificação pública | P-6.1, P-6.6, P-6.8 | Não consta no BRAIN |
| N-4 | Workspaces "6 fixos **+ custom**" | P-4.6 | BRAIN §6.9 define 6 fixos, não menciona custom |
| N-5 | Colunas customizáveis por workspace | P-4.3 | Não consta no BRAIN |
| N-6 | Check-in com checklist de inventário no sistema | P-7.4, P-7.8 | BRAIN diz check-in presencial na recepção; papel do sistema no check-in não especificado |
| N-7 | Fluxo de caixa projetado 30/60/90 dias | P-3.2, P-3.3 | Não consta no BRAIN §6.5 |
| N-8 | SEO/OG tags no portal de documentos | P-1.15 | Razoável para portal público, mas sem base no BRAIN |
| N-9 | `bank-account-form.tsx`, `financeiro-logo.tsx`, AdminShell/ícones (commits 502dec4, 4db663a) | código real | Sem prompt e sem sessão — origem desconhecida |
| N-10 | "Polish — apps/projetos/src/app" (S-45) | índice SESSIONS | Sessão fora do fluxo de prompts, sem corpo descritivo |

---

## 5. Fronteira dos concluídos (entrada da Fase 2)

54 unidades a verificar contra código, agrupadas por app para possível divisão em sessões:

1. **Fundação** (8): P-0.1, P-0.2, P-0.2b, P-0.3, P-0.3b, P-0.4, P-0.5, P-0.6 → `packages/*`, `apps/intranet` (login)
2. **Admin** (14): P-1.1–P-1.12, P-1.12b (+ commits de AdminShell fora de prompt) → `apps/admin`, `packages/db` (admin), `packages/email`
3. **Documentos** (12): P-1.13–P-1.24 — atenção a P-1.19 e P-1.21 (registro irregular) → `apps/documentos`
4. **Projetos** (14): P-2.1–P-2.12, P-2.9b (+ S-45 "Polish") — atenção a P-2.11 parcial e P-2.12 sem sessão → `apps/projetos`, `packages/ai`
5. **Financeiro** (8): P-3.1–P-3.8 (+ `bank-account-form.tsx` sem prompt; 0 testes no app) → `apps/financeiro`, `packages/db` (financeiro), `packages/ai`

Pontos de atenção herdados das próprias SESSIONS (auto-relato) que a Fase 2 deve confirmar no código:
- Conexão superuser bypassa RLS em **todas** as actions (S-15, BRAIN §3) — verificar se todo action tem gate RBAC.
- `audit_log_insert_service` com `WITH CHECK (true)` (S-14).
- Score IA mascarado só em aplicação, não em RLS (S-38/S-39).
- Notificações de documentos criadas mas não chamadas (S-30); template de convite inline (S-15/S-17).
- Partições futuras de audit_log dependem de job inexistente (S-13).
- Governança dual (aprovador ≠ autorizador) enforced só em Server Action (S-51/S-53).
- Campos de formulário sem coluna no DB persistidos em JSONB `project_versions.data` (S-40) e `notes` com prefixo no financeiro (S-53).

---

## 6. Estado declarado vs. plano — leitura seca

- Fases 0–2 declaradas 100% concluídas; Fase 3 concluída até P-3.8 (backend pronto, UI ainda mockada, sem testes).
- Pausas de validação com a diretoria estão previstas ao fim de cada Bloco A; SESSIONS não registra nenhuma dessas validações (nem como bloqueio nem como aprovação). Não afirmo que não ocorreram — apenas que não há registro.
- PATCHES/ vazio apesar de pelo menos duas mudanças de decisão documentadas em outros lugares (tipografia Inter→Parkinsans "revogada" no BRAIN §5; escopo da Rádio "drasticamente simplificado" no §6.4). O método (CLAUDE.md/SESSIONS header) exige PATCH quando decisão do BRAIN muda.

---

## 7. Anomalias de registro (fatos, sem julgamento — insumo Fases 1–2)

1. **Índice ↔ corpo do SESSIONS divergem:** S-21 no índice = "P-1.12b Ajustes Menores DS Admin"; o corpo S-21 é "P-1.13b — Verificação Design System" (branch `feat/P-1.13b-minors-adjustments`, um rótulo de prompt que não existe no PROMPTS.md). A sessão do P-1.12b real existe no corpo **sem número**. S-45 existe no índice **sem corpo**. P-1.21 existe no corpo **sem número e fora do índice**.
2. **Prompts marcados [x] sem sessão:** P-1.19 e P-2.12 (artefatos existem no repo; registro histórico ausente).
3. **Trabalho sem prompt:** commits `502dec4` (bank-account-form), `4db663a` (AdminShell/ícones), `4b68f72` (refactor), S-45 (Polish). O fluxo SDD ("uma sessão = um prompt") não os cobre.
4. **Numeração de migrations divergente e duplicada** (ver §1.3), com risco de ordem alfabética inválida para `0009_financeiro_rls` < `0010_financeiro` e colisões futuras já embutidas nos prompts pendentes.
5. **P-2.11:** SESSIONS diz `parcial`, PROMPTS marca todos os critérios [x]/[~] — os dois registros discordam.
6. **`packages/config`** segue stub; a S-1 declarou que ele seria "validação de env em runtime com t3-env" — nunca implementado, nenhum débito registrado.
7. **PRODUCT.md** na raiz duplica parcialmente BRAIN §5/§6 sem ser referenciado por nenhuma spec.
8. O prompt de auditoria fala em "~30% concluídos"; o declarado real é ≈ 42% dos prompts base.

---

## 8. Perguntas para o Filipe (acumuladas na Fase 0)

1. **P-1.19 e P-2.12** estão marcados concluídos com artefatos no repo, mas sem entrada no SESSIONS. Foram executados em sessões não registradas? Confirmo os dois na fronteira da Fase 2?

R. Após algumas sessões o agente registrava o progresso automaticamente em SESSIONS.md. Em algumas outras não e eu acabava tendo que solicitar o registro. Pode ter acontecido de, em alguma sessão, o agente não ter registrado e eu não ter pedido. Pode confirmar os dois na fronteira da Fase 2.

2. **Trabalho fora do fluxo SDD** (`bank-account-form.tsx`, `financeiro-logo.tsx`, AdminShell/ícones, S-45 "Polish", commit "Refactor code structure"): é trabalho seu manual, de agente, ou de outra origem? Devo auditá-lo na Fase 2 como se fosse parte dos prompts, ou tratá-lo à parte?

R. É provável que tenha sido algum elemento inserido pelas referências de design geradas pelo Claude Design. Quando fui validar a UI, havia um botão morto, sem nenhuma função. Então, pedi para o agente verificar e implementar uma solução. Por isso, ficou fora do fluxo SDD. Isso deve ser auditado na Fase 2 como se fosse parte dos prompts.

3. **Fronteira da Fase 2:** o prompt de auditoria diz "~30%", mas o declarado é ~42% (54 unidades). Verifico **todas** as 54, ou você quer priorizar algum subconjunto?

R. Eu fiz uma suposição do andamento do desenvolvimento quando disse os 30%. Verifique todas as 54, sem priorização.

4. **PATCHES/ vazio:** as mudanças de decisão já ocorridas (tipografia revogada, escopo da Rádio, remoções da v1) foram anteriores à criação do mecanismo de PATCH, ou o registro deveria ser reconstituído retroativamente?

R. Talvez eu não tivesse essa instrução clara no meu escopo e não tenha solicitado o registro dessas informações. Construa o registro retroativamente.

5. **PRODUCT.md** (raiz): é fonte de verdade complementar (deve entrar na auditoria de coerência da Fase 1) ou documento morto?

R. O PRODUCT.md é um arquivo gerado pela skill impecabble. Ele é usado como referência sempre que essa skill é invocada. Acredito que ele pode ser incluído na auditoria, mas com esse contexto.

6. **Validações com a diretoria** nas pausas dos Blocos A: ocorreram? Há registro fora do repo (e-mail, ata)? Isso muda o peso que a Fase 2 dá a divergências de UI.

R. A validação com a diretoria é uma etapa para que EU possa validar o que foi feito. Em algum momento, compartilho o progresso com um dos diretores que está mais ligado a minha diretoria. As pausas entre a UI e backend são extremamente importantes, pois consigo ajustar algum detalhe visual antes de seguir para a integração.

7. **Órfãos de alto impacto** (O-1 auto-signup, O-2 migração de legado, O-3 infra Inngest, O-5 orçamento por instituição): algum deles foi conscientemente adiado/descartado em decisão não registrada? A resposta define se a Fase 1 os classifica como lacuna de spec ou decisão implícita.

R. Não. Eu não adiei ou descartei nenhum deles. Penso que são lacunas mesmo.

---

*Próxima fase: **FASE 1 — Auditoria das specs (coerência interna)**, usando este inventário como entrada. Rodar em sessão nova conforme o método.*

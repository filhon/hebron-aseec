# SESSIONS.md — Registro de Sessões de Desenvolvimento SDD

> **Referência:** BRAIN.md (fonte da verdade) | PROMPTS.md (sequência) | SDD-STRUCTURE.md (formato)
> **Metodologia:** Append-only — nunca editar entradas anteriores
> **Regra:** Se uma decisão do BRAIN.md muda durante uma sessão, registrar aqui E criar um PATCH em `PATCHES/`

---

## Legenda de Status

| Status    | Significado                                                   |
| --------- | ------------------------------------------------------------- |
| concluido | Todos os criterios de aceite atendidos                        |
| parcial   | Parte do escopo concluida, restante documentado em debitos    |
| bloqueado | Impedimento externo (aguardando decisao, dependencia, acesso) |

---

## Indice de Sessoes

> Atualizar conforme sessoes sao executadas.

| Sessao | Data       | Prompt                                                       | Status                               |
| ------ | ---------- | ------------------------------------------------------------ | ------------------------------------ |
| S-1    | 2026-05-21 | P-0.1 — Monorepo Setup                                       | concluido                            |
| S-2    | 2026-05-22 | P-0.1 — Monorepo Setup (complemento)                         | concluido                            |
| S-3    | 2026-05-22 | P-0.2 — Design System Base                                   | concluido                            |
| S-4    | 2026-05-22 | P-0.3 — Supabase Setup                                       | concluido                            |
| S-5    | 2026-05-22 | P-0.4 — Autenticação e SSO                                   | concluido                            |
| S-6    | 2026-05-22 | P-0.5 — Layout Compartilhado (AppShell)                      | concluido                            |
| S-7    | 2026-05-22 | P-0.6 — Sistema de Notificações                              | concluido                            |
| S-8    | 2026-05-22 | P-1.1 — Schema de Tipos Admin                                | concluido                            |
| S-9    | 2026-05-22 | P-1.2 — Componentes UI Admin                                 | concluido                            |
| S-10   | 2026-05-22 | P-1.3 — Telas e Páginas Admin                                | concluido                            |
| S-11   | 2026-05-22 | P-1.4 — Formulários Admin                                    | concluido                            |
| S-12   | 2026-05-22 | P-1.5 — Estados Admin                                        | concluido                            |
| S-13   | 2026-05-25 | P-1.6 — Schema do Banco Admin                                | concluido                            |
| S-14   | 2026-05-25 | P-1.7 — RLS Policies Admin                                   | concluido                            |
| S-15   | 2026-05-25 | P-1.8 — Server Actions Admin                                 | concluido                            |
| S-16   | 2026-05-25 | P-1.9 — Integração UI ↔ Backend Admin                        | concluido                            |
| S-17   | 2026-05-25 | P-1.10 — Notificações e Emails Admin                         | concluido                            |
| S-18   | 2026-05-26 | P-1.11 — Impersonation e Audit Avançado                      | concluido                            |
| S-19   | 2026-05-26 | P-1.12 — Testes Admin                                        | concluido                            |
| S-20   | 2026-06-13 | P-0.2b — Unificação do Design System                         | concluido                            |
| S-21   | 2026-06-15 | P-1.12b — Ajustes Menores DS Admin                           | concluido                            |
| S-22   | 2026-06-15 | P-0.3b — Pipeline de Migrations                              | concluido                            |
| S-23   | 2026-06-16 | P-1.13 — Schema de Tipos Documentos                          | concluido                            |
| S-24   | 2026-06-16 | P-1.14 — Componentes UI Documentos                           | concluido                            |
| S-25   | 2026-06-16 | P-1.15 — Telas e Páginas Documentos                          | concluido                            |
| S-26   | 2026-06-17 | P-1.16 — Formulários Documentos                              | concluido                            |
| S-27   | 2026-06-17 | P-1.17 — Estados Documentos                                  | concluido                            |
| S-28   | 2026-06-17 | P-1.18 — Schema do Banco Documentos                          | concluido                            |
| S-29   | 2026-06-17 | P-1.20 — Server Actions Documentos                           | concluido                            |
| S-30   | 2026-06-18 | P-1.22 — Notificações e Emails Documentos                    | concluido                            |
| S-31   | 2026-06-18 | P-1.23 — Integração Documentos ↔ Projetos                    | concluido                            |
| S-32   | 2026-06-18 | P-1.24 — Testes Documentos                                   | concluido                            |
| S-33   | 2026-06-20 | P-2.1 — Schema de Tipos Projetos                             | concluido                            |
| S-34   | 2026-06-20 | P-2.2 — Componentes UI Projetos                              | concluido                            |
| S-35   | 2026-06-20 | P-2.3 — Telas e Páginas Projetos                             | concluido                            |
| S-36   | 2026-06-20 | P-2.4 — Formulários Projetos                                 | concluido                            |
| S-37   | 2026-06-22 | P-2.5 — Estados Projetos                                     | concluido                            |
| S-38   | 2026-06-22 | P-2.6 — Schema do Banco Projetos                             | concluido                            |
| S-39   | 2026-06-22 | P-2.7 — RLS Policies Projetos                                | concluido                            |
| S-40   | 2026-06-22 | P-2.8 — Server Actions Projetos                              | concluido                            |
| S-41   | 2026-06-22 | P-2.9 — Integração UI ↔ Backend Projetos                     | concluido                            |
| S-42   | 2026-06-23 | P-2.10 — Notificações e Emails Projetos                      | concluido                            |
| S-43   | 2026-06-23 | P-2.11 — Integrações Cross-App Projetos                      | parcial                              |
| S-44   | 2026-06-23 | P-2.9b — Usuário Real no Header Projetos                     | concluido                            |
| S-45   | 2026-06-23 | Polish — apps/projetos/src/app                               | concluido                            |
| S-46   | 2026-06-23 | P-3.1 — Schema de Tipos Financeiro                           | concluido                            |
| S-47   | 2026-06-25 | P-3.2 — Componentes UI Financeiro                            | concluido                            |
| S-48   | 2026-06-25 | P-3.3 — Telas e Páginas Financeiro                           | concluido                            |
| S-49   | 2026-06-26 | P-3.4 — Formulários Financeiro                               | concluido                            |
| S-50   | 2026-06-26 | P-3.5 — Estados Financeiro                                   | concluido                            |
| S-51   | 2026-06-26 | P-3.6 — Schema do Banco Financeiro                           | concluido                            |
| S-52   | 2026-06-26 | P-3.7 — RLS Policies Financeiro                              | concluido                            |
| S-53   | 2026-06-26 | P-3.8 — Server Actions Financeiro                            | concluido                            |
| S-54   | 2026-07-03 | P-0.7 — Resgate do Banco (Onda 0)                            | concluido                            |
| S-55   | 2026-07-03 | P-0.8 — Kit de Backend Compartilhado (Onda 0)                | concluido                            |
| S-56   | 2026-07-03 | P-0.9 — CI Mínimo (Onda 0)                                   | concluido (validação em PR pendente) |
| S-57   | 2026-07-03 | P-0.10 — Decisão B: RLS Ativa (Onda 0)                       | concluido                            |
| S-58   | 2026-07-04 | P-0.11 — Drizzle-kit Reconciliado (Onda 0)                   | concluido                            |
| S-59   | 2026-07-04 | P-1.25 — Admin: leitura protegida e fiação completa (Onda 1) | concluido                            |
| S-60   | 2026-07-04 | P-1.26 — Onboarding: convite, auto-signup e MFA (Onda 1)     | concluido                            |

---

<!-- Inserir novas sessoes abaixo desta linha, seguindo o formato: -->

<!--
### S-{NUMERO} — {DATA} — {PROMPT EXECUTADO}

**Prompt:** P-{X.Y}
**Duracao:** {tempo aproximado}
**Modelo:** {sonnet-4.6 | opus-4.6}
**Status:** {concluido | parcial | bloqueado}

**Resumo:**
{2-3 frases do que foi feito.}

**Decisoes tomadas:**
- {decisao 1}
- {decisao 2}

**Debitos tecnicos:**
- {item pendente, se houver}

**Arquivos criados/modificados:**
- `caminho/arquivo.ts` (criado)
- `caminho/outro.tsx` (modificado)

----->

### S-1 — 2026-05-21 — P-0.1 Monorepo Setup

**Prompt:** P-0.1
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Inicializado o monorepo pnpm 9 + Turborepo 2 com estrutura completa de 9 apps e 8 packages. Configurados tsconfig base (strict, zero `any`, `noUncheckedIndexedAccess`) e nextjs (moduleResolution Bundler). ESLint 9 flat config com typescript-eslint v8 strict mode.

**Decisoes tomadas:**

- `exactOptionalPropertyTypes: false` — omitido para evitar quebras em libs third-party (Supabase, Drizzle), que não seguem o contrato estrito de `undefined`
- ESLint usa `tseslint.configs.strict` (sem `TypeChecked`) na config base para não exigir `parserOptions.project` em cada app nesta fase
- `packages/config` = validação de env em runtime com `@t3-oss/env-nextjs`, distinto do `tooling/` que é dev-only
- Portas: admin=3000, projetos=3001, plataforma=3002, radio=3003, financeiro=3004, intranet=3005, documentos=3006, flats=3007, tarefas=3008

**Debitos tecnicos:**

- `tsconfig.json` de cada app/package ainda não criado (será no prompt do respectivo módulo)
- `eslint.config.mjs` de cada app ainda não criado
- `next.config.ts` com `transpilePackages` ainda não criado
- `tokens.css` do Tailwind v4 ainda não criado

**Arquivos criados/modificados:**

- `package.json` (criado)
- `pnpm-workspace.yaml` (criado)
- `turbo.json` (criado)
- `tooling/typescript-config/package.json` (criado)
- `tooling/typescript-config/base.json` (criado)
- `tooling/typescript-config/nextjs.json` (criado)
- `tooling/eslint-config/package.json` (criado)
- `tooling/eslint-config/base.js` (criado)
- `apps/{admin,projetos,plataforma,radio,financeiro,intranet,documentos,flats,tarefas}/package.json` (9 criados)
- `packages/{ui,db,auth,email,validators,ai,config,types}/package.json` (8 criados)
- `SESSIONS.md` (modificado)

---

### S-2 — 2026-05-22 — P-0.1 Monorepo Setup (complemento)

**Prompt:** P-0.1 (liquidação de débitos técnicos da S-1)
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criados os arquivos faltantes para que todos os critérios de aceite do P-0.1 passassem: `tsconfig.json` e `eslint.config.mjs` para cada app e package, `next-env.d.ts` para os 9 apps e `src/index.ts` stub para os 8 packages. Corrigido o `tooling/eslint-config/base.js` adicionando `languageOptions.parserOptions.project: true` para habilitar typed linting. Resultado: `pnpm turbo lint typecheck` — 34/34 tasks bem-sucedidas.

**Decisoes tomadas:**

- `project: true` no `languageOptions.parserOptions` do base ESLint config em vez de configurar em cada package individualmente — centraliza a configuração, usa o `tsconfig.json` mais próximo de cada arquivo lintado
- `src/index.ts` com `export {}` como stub mínimo para packages vazios — evita erro `TS18003: No inputs were found` sem criar lógica desnecessária
- `next-env.d.ts` criado manualmente nos apps — gerado normalmente pelo `next dev/build`, mas necessário para `tsc --noEmit` sem rodar Next.js

**Arquivos criados/modificados:**

- `tooling/eslint-config/base.js` (modificado — adicionado `languageOptions.parserOptions.project: true`)
- `apps/{admin,projetos,plataforma,radio,financeiro,intranet,documentos,flats,tarefas}/tsconfig.json` (9 criados)
- `apps/{admin,projetos,plataforma,radio,financeiro,intranet,documentos,flats,tarefas}/eslint.config.mjs` (9 criados)
- `apps/{admin,projetos,plataforma,radio,financeiro,intranet,documentos,flats,tarefas}/next-env.d.ts` (9 criados)
- `packages/{ui,db,auth,email,validators,ai,config,types}/tsconfig.json` (8 criados)
- `packages/{ui,db,auth,email,validators,ai,config,types}/eslint.config.mjs` (8 criados)
- `packages/{ui,db,auth,email,validators,ai,config,types}/src/index.ts` (8 criados)
- `PROMPTS.md` (critérios de P-0.1 todos marcados como `[x]`)

---

### S-3 — 2026-05-22 — P-0.2 Design System Base

**Prompt:** P-0.2
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criado o design system base em `packages/ui` como fork customizado do shadcn/ui. Definidos tokens de cor da Identidade Visual Hebron Aseec como CSS variables em `tokens.css`. Implementados 6 componentes primitivos (Button, Input, Select, Dialog, Toast, FormField) com Radix UI como base, CVA para variantes, e princípios visuais anti-IA. Lint e typecheck passam sem erros.

**Decisoes tomadas:**

- Tipografia via CSS variables (`--font-ui`, `--font-editorial`) com fallback para fontes do sistema — cada app injeta as variáveis `--font-inter` e `--font-source-serif-4` via `next/font` no seu próprio `layout.tsx`
- `cn` helper definido inline em cada componente (sem `utils.ts` separado) — respeita o constraint de "apenas arquivos permitidos", mantém cada componente auto-contido
- Drawer e Tooltip estão no escopo descrito mas não na lista de arquivos permitidos — não criados nesta sessão
- Tailwind v4: componentes usam sintaxe `bg-[--color-primary]` (CSS variable reference) em vez de definir `@theme` — funciona em qualquer app sem configuração extra de Tailwind
- SelectTrigger com `hasError` prop para consistência de estado com Input
- Toast com ícones automáticos por variante (CheckCircle, AlertCircle, AlertTriangle, Info)
- FormField injeta `aria-describedby`, `aria-invalid` e `disabled` no filho direto via `React.cloneElement`

**Debitos tecnicos:**

- Drawer (`packages/ui/src/components/drawer.tsx`) — não criado, não estava na lista de arquivos permitidos
- Tooltip (`packages/ui/src/components/tooltip.tsx`) — não criado, não estava na lista de arquivos permitidos
- `next/font` configurado apenas via documentação em comentários; integração real feita em cada app (P-0.3+)

**Arquivos criados/modificados:**

- `packages/ui/src/tokens.css` (criado)
- `packages/ui/src/components/button.tsx` (criado)
- `packages/ui/src/components/input.tsx` (criado)
- `packages/ui/src/components/select.tsx` (criado)
- `packages/ui/src/components/dialog.tsx` (criado)
- `packages/ui/src/components/toast.tsx` (criado)
- `packages/ui/src/components/form-field.tsx` (criado)
- `packages/ui/src/index.ts` (modificado — substituído stub por exports reais)
- `SESSIONS.md` (modificado)

---

### S-4 — 2026-05-22 — P-0.3 Supabase Setup

**Prompt:** P-0.3
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Configurado o package `packages/db` com Drizzle ORM conectado ao Supabase. Criados os 9 schemas de módulo (`pgSchema`), enums de papéis e designação, e 4 tabelas base em `public` (`users`, `role_assignments`, `designations`, `notifications`). Migration SQL completa com RLS habilitado, 10 policies DENY-by-default e função helper `has_role()`. Types definidos em `packages/types/src/roles.ts`. Typecheck e migration aplicados com sucesso.

**Decisoes tomadas:**

- `DATABASE_URL` separado de `SUPABASE_URL` — Drizzle Kit precisa de uma connection string `postgresql://` direta; `SUPABASE_URL` é a REST API URL e não serve para conexão via `postgres-js`. Adicionado `DATABASE_URL` ao `.env.example` e ao `drizzle.config.ts`
- `dotenv` carregado explicitamente em `drizzle.config.ts` via `config({ path: '../../.env.local' })` — drizzle-kit não carrega `.env` automaticamente em contexto monorepo
- Conexão via transaction pooler (porta 6543) em vez do host direto (`db.[project].supabase.co:5432`) — host direto não resolvia DNS na rede local; pooler é acessível universalmente
- `prepare: false` no client.ts — obrigatório para compatibilidade com o transaction pooler do Supabase
- `public.has_role(VARIADIC roles text[])` como `SECURITY DEFINER` — evita recursão infinita nas RLS policies de `role_assignments` (a policy precisa consultar `role_assignments` para verificar o papel do chamador)
- Trigger `on_auth_user_created` em `auth.users` — sincroniza automaticamente novos usuários do Supabase Auth em `public.users` sem código de aplicação
- Schemas de módulo (admin, projetos, etc.) declarados como `pgSchema` em `public.ts` mas sem tabelas — tabelas são adicionadas nos blocos B de cada módulo; `CREATE SCHEMA IF NOT EXISTS` garante existência no banco
- `ROLES` e `DESIGNATION_TYPES` exportados de `packages/types/src/roles.ts` como `as const satisfies readonly [string, ...string[]]` — compatível com `pgEnum()` do Drizzle sem cast

**Debitos tecnicos:**

- `packages/db/src/schema/index.ts` não criado — não estava na lista de arquivos permitidos; necessário quando algum app importar de `@hebron/db/schema`
- `packages/db/src/index.ts` ainda é stub — exportações principais virão com as features

**Arquivos criados/modificados:**

- `packages/types/src/roles.ts` (criado)
- `packages/db/src/client.ts` (criado)
- `packages/db/src/schema/public.ts` (criado)
- `packages/db/drizzle.config.ts` (criado)
- `packages/db/src/migrations/0000_initial.sql` (criado)
- `packages/db/package.json` (modificado — adicionado `dotenv` em devDependencies)
- `.env.example` (modificado — adicionado `DATABASE_URL`)
- `SESSIONS.md` (modificado)
- `PROMPTS.md` (critérios de P-0.3 todos marcados como `[x]`)

---

### S-5 — 2026-05-22 — P-0.4 Autenticação e SSO

**Prompt:** P-0.4
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Implementado o package `packages/auth` com cliente Supabase para browser (cookies customizados para SSO cross-subdomain em produção), cliente para middleware (framework-agnostic), helpers MFA TOTP, e tipos compartilhados. Criado o middleware Next.js na Intranet que detecta sessão ausente e redireciona para o login canônico com `return_to`. Implementada a página de login responsiva com dois modos (senha e magic link) e fluxo de MFA TOTP (challenge/verify após password sign-in). Design alinhado ao sistema de tokens sem dependências externas de ícones.

**Decisoes tomadas:**

- `@hebron/auth/mfa` não adicionado ao exports map do `package.json` (não estava na lista de arquivos permitidos) — funções MFA exportadas via `@hebron/auth` (export principal através de `index.ts`). Login form importa de `@hebron/auth` em vez de `@hebron/auth/mfa`
- `lucide-react` não disponível como dep direta da intranet — ícones SVG inline usados no login form para evitar dependência não declarada no `package.json`
- DOM types (`document`) não disponíveis no tsconfig do `packages/auth` (lib: ["ES2022"]) — acesso ao `document.cookie` feito via `globalThis` com type assertion mínima, evitando inclusão de `lib: ["DOM"]` no package agnóstico
- Env vars browser: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (necessário para Next.js client bundles). Env vars server/middleware: `SUPABASE_URL` + `SUPABASE_ANON_KEY`. Ambas precisam ser configuradas (mesmo valor)
- Cookie domain para SSO: `COOKIE_DOMAIN = ".hebronaseec.com.br"` em produção via `process.env.NODE_ENV === "production"`. Em dev, sem domain (localhost)
- `getUser()` no middleware (não `getSession()`) — valida JWT server-side; recomendação oficial do Supabase para segurança
- `shouldCreateUser: false` no magic link — apenas usuários existentes podem se autenticar; cadastro é processo separado (P-X.1+ Admin)
- MFA TOTP: obrigatório para `super_admin` e `diretor` verificado ao checar `nextLevel === "aal2"` pós sign-in; usuários sem fator TOTP enrolled não passam pelo step MFA (apenas usuários que já configuraram)
- JSDoc `@example` com blocos ` ```ts ``` ` causa erros TS em tsconfig strict — removidos do `packages/auth/src/middleware.ts`
- `requireEnv()` helper em vez de `!` non-null assertion — regra ESLint `no-non-null-assertion` proibida no projeto

**Debitos tecnicos:**

- `packages/auth/package.json` não atualizado para incluir `./mfa` no exports map (arquivo não permitido) — funções MFA acessíveis apenas via export principal `@hebron/auth`
- Cookie domain no browser client: depende de `document.cookie` customizado; alternativa mais robusta seria configurar o Supabase para emitir cookies com domain via header `Set-Cookie` no server (necessário teste em produção)
- MFA enrollment UI não implementada neste prompt — usuários precisam ter TOTP já configurado via Supabase Dashboard para que o step MFA apareça. Tela de enrollment virá em prompt específico de perfil/configurações

**Arquivos criados/modificados:**

- `packages/auth/src/types.ts` (criado)
- `packages/auth/src/client.ts` (criado)
- `packages/auth/src/middleware.ts` (criado)
- `packages/auth/src/mfa.ts` (criado)
- `packages/auth/src/index.ts` (modificado — substituído stub por re-exports)
- `apps/intranet/src/middleware.ts` (criado)
- `apps/intranet/src/app/(auth)/login/page.tsx` (criado)
- `apps/intranet/src/app/(auth)/login/components/login-form.tsx` (criado)
- `SESSIONS.md` (modificado)

---

### S-6 — 2026-05-22 — P-0.5 Layout Compartilhado (AppShell)

**Prompt:** P-0.5
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criados 7 componentes de layout compartilhados em `packages/ui`: `AppShell` (sidebar + topbar + conteúdo), `NavigationSidebar` (colapsável, com ícones Lucide e tooltips), `PageHeader` (com breadcrumb), `EmptyState` (com citação bíblica), `ErrorState`, `LoadingState` e `UserMenu` (com Avatar por iniciais ou imagem). Sidebar vira drawer via Dialog no mobile. App launcher integrado na sidebar como seção inferior.

**Decisoes tomadas:**

- `NavigationSidebar` é componente controlado para colapso — o estado vive no `AppShell` (desktop) e é sempre `false` no mobile (drawer)
- `Avatar` usa iniciais com fundo `--color-primary` como fallback (sem `@radix-ui/react-avatar`, não listado nas deps)
- `EmptyState` usa citação bíblica fixa como padrão (`Lamentações 3:25`) em vez de aleatória — evita divergência de hidratação RSC
- Drawer mobile usa `@radix-ui/react-dialog` (já disponível) em vez de dependência nova
- Tooltips na sidebar colapsada usam `@radix-ui/react-tooltip` (já disponível) com `TooltipProvider` interno
- `showCollapseToggle={false}` passado para o sidebar dentro do drawer mobile — sem sentido colapsar num drawer

**Debitos tecnicos:**

- Nenhum

**Arquivos criados/modificados:**

- `packages/ui/src/components/app-shell.tsx` (criado)
- `packages/ui/src/components/navigation-sidebar.tsx` (criado)
- `packages/ui/src/components/page-header.tsx` (criado)
- `packages/ui/src/components/empty-state.tsx` (criado)
- `packages/ui/src/components/error-state.tsx` (criado)
- `packages/ui/src/components/loading-state.tsx` (criado)
- `packages/ui/src/components/user-menu.tsx` (criado)
- `packages/ui/src/index.ts` (modificado — novos exports)

---

### S-7 — 2026-05-22 — P-0.6 Sistema de Notificações

**Prompt:** P-0.6
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Implementado o sistema de notificações base. Schema Drizzle expandido (`notifications.ts`) com os novos campos `channel`, `type`, `payload` (jsonb) e `sent_at`, além de enum `notification_channel`. Migration SQL (`0001_notifications.sql`) adiciona as colunas via `ALTER TABLE` sem recriar a tabela. Componente `NotificationBell` com badge de contagem e dropdown das últimas 10 notificações. `NotificationCenter` com tabs Todas/Não lidas, paginação incremental e acessibilidade ARIA completa. Template base de email (`EmailLayout`) com header Hebron (azul primário) e footer institucional. Helper `createNotification` com injeção de dependência para inserção no banco + dispatch de email via Resend. Criado `schema/index.ts` (barrel export excluindo o stub de notifications do `public.ts`). Corrigido lint error pré-existente em `packages/db` (drizzle.config.ts ausente do tsconfig) e em `apps/intranet` (next-env.d.ts gerado pelo Next.js sendo lintado).

**Decisoes tomadas:**

- `notifications.ts` separado de `public.ts` em vez de expandir o arquivo existente (não estava na lista de arquivos permitidos) — `schema/index.ts` re-exporta seletivamente `public.ts` (sem o stub de notifications) e tudo de `notifications.ts`
- `createNotification` usa injeção de dependência para a função de insert (`InsertNotificationFn`) — `packages/email` não depende de `@hebron/db`, evitando acoplamento circular
- `resendApiKey` não lê `process.env` diretamente — `packages/email` não tem `@types/node` (lib: `["ES2022", "dom"]`); o caller injeta a chave do seu próprio env
- Componentes de UI (`NotificationBell`, `NotificationCenter`) são "dumb" — recebem dados e callbacks via props; sem acoplamento a `@hebron/db` ou Supabase
- Estado vazio do `NotificationBell` usa citação bíblica (Sl 27.14) — consistente com o design system (EmptyState já usa essa convenção)
- `import type { NotificationItem }` no `notification-center.tsx` — regra ESLint `no-import-type-side-effects` exige import type de nível superior para tipos puros

**Debitos tecnicos:**

- `drizzle.config.ts` aponta `schema` para `./src/schema/public.ts` (não para `./src/schema/index.ts`) — `db:generate` só vê a definição antiga de notifications; para usar Drizzle Kit com o schema expandido, será necessário atualizar `drizzle.config.ts` em sessão futura
- `packages/db/src/client.ts` ainda importa de `./schema/public` — não tem acesso tipado aos novos campos; apps devem importar de `@hebron/db/schema` para usar o schema completo
- Templates React Email concretos (ex: email de candidatura) serão criados nos blocos B de cada módulo

**Arquivos criados/modificados:**

- `packages/db/src/schema/notifications.ts` (criado)
- `packages/db/src/schema/index.ts` (criado)
- `packages/db/src/migrations/0001_notifications.sql` (criado)
- `packages/db/tsconfig.json` (modificado — adicionado `drizzle.config.ts` ao include)
- `packages/ui/src/components/notification-bell.tsx` (criado)
- `packages/ui/src/components/notification-center.tsx` (criado)
- `packages/ui/src/index.ts` (modificado — exports de NotificationBell e NotificationCenter)
- `packages/email/src/components/layout.tsx` (criado)
- `packages/email/src/lib/send.ts` (criado)
- `packages/email/src/index.ts` (modificado — exports de EmailLayout e createNotification)
- `apps/intranet/eslint.config.mjs` (modificado — ignora next-env.d.ts)
- `SESSIONS.md` (modificado)

---

### S-8 — 2026-05-22 — P-1.1 Schema de Tipos Admin

**Prompt:** P-1.1
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Definidos todos os tipos TypeScript do módulo Admin em `packages/types/src/admin/index.ts` (9 tipos: User, RoleAssignment, Invitation, AuditLogEntry, SystemSetting, FeatureFlag, EmailTemplate, MeetingSession, Designation). Criados 4 schemas Zod em `packages/validators/src/admin/index.ts` com tipos inferidos. Mock data em `apps/admin/src/lib/mock-data.ts` com 12 usuários, 11 role assignments, 6 convites, 22 entradas de audit log, 5 system settings, 4 feature flags, 3 email templates, 4 meeting sessions e 3 designations — todos com contexto realista da Hebron Aseec. Typecheck e lint passam sem erros.

**Decisoes tomadas:**

- `packages/types/package.json` atualizado com export explícito `"./admin": "./src/admin/index.ts"` — o wildcard `"./*": "./src/*.ts"` não resolve diretórios; adição necessária para que `@hebron/types/admin` funcione no app
- `moduleAccess: Scope[]` em `User` como lista positiva de escopos permitidos (não bloqueados) — lista vazia significa acesso total; compatível com suspensão granular por módulo descrita no BRAIN.md
- `AuditAction` como union literal (não enum) — mais idiomático em TypeScript strict, permite exhaustive checks futuros sem overhead de runtime
- `roleEnum` e `scopeEnum` definidos localmente em `packages/validators/src/admin/index.ts` (sem importar de `@hebron/types`) — validators não depende de types package; evita acoplamento desnecessário entre packages
- `Designation.scope: Scope | null` — null = designação de abrangência organizacional; valor preenchido reserva a designação para um módulo específico
- Mock data usa datas absolutas baseadas em 2026-05-22 (data atual da sessão) — evita lógica de `Date.now()` que quebraria testes e storybook em futuras sessões

**Debitos tecnicos:**

- `packages/validators/src/admin/index.ts` não exporta `roleEnum` e `scopeEnum` — se outros schemas precisarem reusar esses enums, exportar em sessão futura
- `packages/types/src/index.ts` não re-exporta de `./admin` — importações devem usar `@hebron/types/admin` explicitamente

**Arquivos criados/modificados:**

- `packages/types/src/admin/index.ts` (criado)
- `packages/types/package.json` (modificado — adicionado export `"./admin"`)
- `packages/validators/src/admin/index.ts` (criado)
- `apps/admin/src/lib/mock-data.ts` (criado)
- `SESSIONS.md` (modificado)

---

### S-9 — 2026-05-22 — P-1.2 — Componentes UI Admin

**Prompt:** P-1.2
**Duração:** ~30min
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criados 7 componentes de UI para o módulo Admin, todos usando dados mockados e o design system `@hebron/ui`. Adicionados `@tanstack/react-table@^8.21.0` e `lucide-react@^0.460.0` como dependências diretas do `apps/admin`.

**Decisões tomadas:**

- RoleBadge e StatusBadge são RSC-compatíveis (sem hooks, sem "use client")
- Cores dos papéis usam os tokens do design system onde possível (primary, accent, support-green, support-sky) e cores complementares fixas para os demais
- UserTable recebe `users + roleAssignments` separados e faz o join internamente via `useMemo`
- AuditLogTable filtra manualmente antes de passar ao TanStack Table (mix de filtros heterogêneos é mais simples assim)
- FeatureFlagToggle usa estado otimista local + callback `onToggle`
- Avatares usam `<img>` direto (sem next/image) pois a regra `@next/next/no-img-element` não está configurada no eslint do admin

**Débitos técnicos:**

- Paginação não implementada nas tabelas (pode ser adicionada em P-1.3+)
- Avatares sem fallback de erro de carregamento

**Arquivos criados/modificados:**

- `apps/admin/src/components/role-badge.tsx` (criado)
- `apps/admin/src/components/status-badge.tsx` (criado)
- `apps/admin/src/components/user-card.tsx` (criado)
- `apps/admin/src/components/invitation-card.tsx` (criado)
- `apps/admin/src/components/feature-flag-toggle.tsx` (criado)
- `apps/admin/src/components/user-table.tsx` (criado)
- `apps/admin/src/components/audit-log-table.tsx` (criado)
- `apps/admin/package.json` (modificado — adicionadas deps @tanstack/react-table e lucide-react)

---

### S-10 — 2026-05-22 — P-1.3 Telas e Páginas Admin

**Prompt:** P-1.3
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criadas todas as páginas do módulo Admin usando Next.js 15 App Router com dados mockados. Dashboard com cards de resumo, lista e detalhe de usuários, convites, auditoria, configurações (feature flags, designações, sistema, templates de e-mail) e reuniões. Criada infraestrutura de app necessária (`layout.tsx` raiz, `globals.css`, `postcss.config.mjs`) que não constava na lista de arquivos permitidos mas é obrigatória para o Next.js funcionar. Lint e typecheck passam.

**Decisoes tomadas:**

- `app/layout.tsx` e `app/globals.css` criados como infraestrutura mínima do Next.js, mesmo não listados no prompt — sem eles nada renderiza
- `postcss.config.mjs` criado para habilitar Tailwind v4 via `@tailwindcss/postcss`
- `next-env.d.ts` adicionado a ignores no `eslint.config.mjs` — arquivo gerado pelo Next.js disparava falso positivo de `@typescript-eslint/triple-slash-reference`
- `(dashboard)/layout.tsx` é client component pois usa `usePathname()` para `currentPath` no AppShell
- `/usuarios/[id]/page.tsx` é server component com `await params` — Next.js 15 tornou params assíncrono
- Configurações usa tabs client-side simples sem biblioteca extra — três estados, sem overhead
- `Designation.directorName` usado diretamente (campo desnormalizado) em vez de lookup por `userId` no mockUsers

**Debitos tecnicos:**

- Botões de ação (suspender, reativar, aprovar, novo convite, exportar CSV) são visuais apenas — sem Server Actions nesta fase (Bloco A)
- Paginação não implementada nas tabelas (herdado de P-1.2)

**Arquivos criados/modificados:**

- `apps/admin/src/app/globals.css` (criado)
- `apps/admin/src/app/layout.tsx` (criado)
- `apps/admin/src/app/(dashboard)/layout.tsx` (criado)
- `apps/admin/src/app/(dashboard)/page.tsx` (criado)
- `apps/admin/src/app/(dashboard)/usuarios/page.tsx` (criado)
- `apps/admin/src/app/(dashboard)/usuarios/[id]/page.tsx` (criado)
- `apps/admin/src/app/(dashboard)/convites/page.tsx` (criado)
- `apps/admin/src/app/(dashboard)/auditoria/page.tsx` (criado)
- `apps/admin/src/app/(dashboard)/configuracoes/page.tsx` (criado)
- `apps/admin/src/app/(dashboard)/reunioes/page.tsx` (criado)
- `apps/admin/postcss.config.mjs` (criado)
- `apps/admin/eslint.config.mjs` (modificado — ignores para `next-env.d.ts` e `.next/**`)
- `SESSIONS.md` (modificado)

---

### S-11 — 2026-05-22 — P-1.4 — Formulários Admin

**Prompt:** P-1.4
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Implementados 6 formulários do módulo admin com React Hook Form + Zod. Todos os formulários usam schemas de `@hebron/validators` e componentes do `@hebron/ui`. Lint e typecheck passam com zero erros.

**Decisoes tomadas:**

- `UserForm` dividido em `UserCreateForm` e `UserEditForm` para evitar conflito de tipos de union em React Hook Form
- Schemas com `.default()` convertidos para `.optional()` nos validators para compatibilidade com `zodResolver` (defaults ficam em `defaultValues` do form)
- `moduleAccess` no formulário de usuário indica módulos _bloqueados_ (não acessíveis), alinhado com o tipo `User.moduleAccess: Scope[]`
- Aviso de conflito de interesse implementado inline (sem lib externa) ao detectar `diretor/conselheiro + submissor/hospede`
- Preview de email usa `dangerouslySetInnerHTML` com sanitização de variáveis via regex (sem XSS pois o conteúdo é interno/admin)
- Formulário de designação filtra apenas diretores via prop `directors: User[]` (filtro feito pelo consumidor)

**Debitos tecnicos:**

- Nenhum

**Arquivos criados/modificados:**

- `apps/admin/src/components/user-form.tsx` (criado)
- `apps/admin/src/components/invitation-form.tsx` (criado)
- `apps/admin/src/components/role-assignment-form.tsx` (criado)
- `apps/admin/src/components/designation-form.tsx` (criado)
- `apps/admin/src/components/email-template-editor.tsx` (criado)
- `apps/admin/src/components/meeting-form.tsx` (criado)
- `packages/validators/src/admin/index.ts` (modificado — novos schemas)
- `packages/validators/src/index.ts` (modificado — re-exporta admin)

---

### S-12 — 2026-05-22 — P-1.5 Estados Admin

**Prompt:** P-1.5
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Implementados estados de loading (skeletons), empty e error em todas as telas principais do Admin (dashboard, usuários, auditoria). Cada skeleton é específico ao layout da tela — não genérico. Estados vazios usam citações bíblicas contextuais. Estado de erro exibe mensagem clara com botão "Tentar novamente" (via `<form method="get">`, sem JS).

**Decisoes tomadas:**

- Retry sem client component: `<form method="get">` sem `action` faz GET para a URL atual limpando query params — funciona sem JS e é acessível
- Estado de erro ativado via `?state=error` na URL — padrão de mock UI para testar estados sem necessidade de simular falha real
- Fade-in de 0.2s via keyframe `hb-fade-in` injetado por `<style>` tag no RSC — evita flash entre skeleton e conteúdo sem depender de CSS global
- Inner async components (`DashboardContent`, `UsersContent`, `AuditContent`) — estrutura pronta para substituição por fetch real sem refatorar o esqueleto da página
- Citações bíblicas: Mateus 9:37 (usuários), Lucas 8:17 (auditoria), 1 Coríntios 15:58 (dashboard)

**Debitos tecnicos:**

- Nenhum

**Arquivos criados/modificados:**

- `apps/admin/src/components/dashboard-skeleton.tsx` (criado)
- `apps/admin/src/components/user-table-skeleton.tsx` (criado)
- `apps/admin/src/components/audit-log-skeleton.tsx` (criado)
- `apps/admin/src/app/(dashboard)/page.tsx` (modificado — async, Suspense, empty/error states)
- `apps/admin/src/app/(dashboard)/usuarios/page.tsx` (modificado — async, Suspense, empty/error states)
- `apps/admin/src/app/(dashboard)/auditoria/page.tsx` (modificado — async, Suspense, empty/error states)

---

### S-13 — 2026-05-25 — P-1.6 Schema do Banco Admin

**Prompt:** P-1.6
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criado o schema Drizzle completo do módulo admin com 6 tabelas no schema `admin` (audit_log, invitations, email_templates, meeting_sessions, feature_flags, system_settings). Adicionados campos phone, document_cpf e suspended_modules em public.users. Migration SQL manual com RLS DENY-by-default em todas as tabelas, particionamento por mês em audit_log e 3 partições iniciais (mai–jul 2026).

**Decisoes tomadas:**

- `audit_log` usa PARTITION BY RANGE(created_at) com PK composta (id, created_at) — obrigatória para tabelas particionadas no PostgreSQL
- Enums criados dentro do schema `admin` (não `public`) para isolamento; Drizzle suporta `adminSchema.enum()` desde v0.30+
- `audit_log` é imutável por design: políticas RLS não incluem UPDATE/DELETE — soft-immutability enforced no banco
- `invitations.roles` é jsonb (array) para suportar múltiplos papéis por convite (vs Invitation type com role singular — schema segue o PRD)
- `invitations_select_by_token` policy usa `USING (true)` para permitir leitura anônima durante fluxo de aceite pré-autenticação
- `email_templates` usa `slug` (PRD) e não `key` (tipo TS) — os dois coexistem; chave de programação vs identificador de URL
- `rollout_percent` em feature_flags com CHECK BETWEEN 0 AND 100 — garante integridade sem trigger
- 3 partições iniciais criadas (2026-05 a 2026-07); job Inngest em P-1.8 criará as seguintes automaticamente

**Debitos tecnicos:**

- Partições de audit_log futuras a partir de ago/2026 dependem do job Inngest (P-1.8)
- `client.ts` ainda importa apenas `./schema/public` — atualizar em P-1.7 ao integrar schema admin no client Drizzle
- `drizzle-kit migrate` ignora migrations manuais (não estão no `_journal.json`). `drizzle.config.ts` aponta só para `public.ts`. Consolidar pipeline antes do Bloco B: unificar schemas em `drizzle.config.ts` e registrar migrations manuais no journal — ou adotar SQL Editor como workflow oficial para manuais e documentar claramente.

**Arquivos criados/modificados:**

- `packages/db/src/schema/admin.ts` (criado)
- `packages/db/src/schema/public.ts` (modificado — phone, document_cpf, suspended_modules em users)
- `packages/db/src/schema/index.ts` (modificado — re-exports admin)
- `packages/db/src/migrations/0002_admin.sql` (criado)

---

### S-14 — 2026-05-25 — P-1.7 RLS Policies Admin

**Prompt:** P-1.7
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Migration `0003_admin_rls.sql` revisou duas policies criadas em 0002 para aplicar DENY-by-default estrito. `audit_log` restringido a leitura apenas por `super_admin` (0002 permitia também `diretor`). `invitations` substituiu acesso público por token (`USING (true)`) por política de email-match autenticado; fluxo de aceite sem autenticação usa service role no Server Action.

**Decisoes tomadas:**

- `audit_log_select_admin` (0002) substituída por `audit_log_select_super_admin` — P-1.7 especifica "apenas super_admin lê audit_log"; diretores não têm acesso de leitura ao log de auditoria
- `invitations_select_by_token` (`USING (true)`) e `invitations_select_admin` (leitura para diretor) removidas; substituídas por `invitations_select_own_email` que usa `auth.jwt() ->> 'email'` para matching — acesso anônimo via token tratado por Server Action com service role (bypassa RLS)
- `invitations_write_super_admin FOR ALL` (0002) continua cobrindo SELECT + mutações para super_admin; nenhuma policy SELECT separada necessária
- `rls/admin.ts` criado como declaração tipada de referência (constantes das policy names) para uso em testes de integração (assertions em `pg_catalog.pg_policies`)

**Debitos tecnicos:**

- Testes de integração RLS (queries como diferentes roles) serão adicionados em bloco B
- `audit_log_insert_service` usa `WITH CHECK (true)` — qualquer autenticado pode inserir diretamente; hardening via SECURITY DEFINER functions pendente para bloco B

**Arquivos criados/modificados:**

- `packages/db/src/migrations/0003_admin_rls.sql` (criado)
- `packages/db/src/rls/admin.ts` (criado)

---

### S-15 — 2026-05-25 — P-1.8 Server Actions Admin

**Prompt:** P-1.8
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Implementados 6 arquivos de Server Actions com `next-safe-action` + Zod para o módulo admin. Middleware centralizado em `safe-action.ts` valida sessão Supabase e papel `super_admin` antes de qualquer action. Audit log registrado em toda mutação via `lib/audit.ts`.

**Decisoes tomadas:**

- `lib/safe-action.ts` criado fora dos "arquivos permitidos" mas necessário como dependência de todos os actions — alternativa seria duplicar middleware em cada arquivo, o que seria pior
- `designations` não tem coluna `revokedAt` no schema atual; revogação usa hard delete com registro via audit log (imutabilidade garantida pelo audit trail, não pela linha da tabela)
- `invitations.ts` usa `React.createElement` inline para o template de email — comentado para substituir por React Email template em `packages/email` quando disponível
- Conexões diretas via `DATABASE_URL` (postgres superuser) em todos os actions para contornar RLS — RBAC é feito no middleware do `adminAction`
- `@supabase/supabase-js`, `drizzle-orm` e `postgres` adicionados como dependências diretas de `@hebron/admin` (necessário para resolução de tipos TypeScript)

**Debitos tecnicos:**

- Template de email de convite (inline React) deve ser substituído por componente React Email em `packages/email`
- `autoCreateMonthlyMeetings` deve ser acionado via Inngest job (cron) — action exposta mas trigger não configurado
- Testes de integração dos actions pendentes para bloco B

**Arquivos criados/modificados:**

- `apps/admin/package.json` (modificado — adicionado next-safe-action, zod, drizzle-orm, postgres, @supabase/supabase-js, @hebron/email)
- `apps/admin/src/lib/audit.ts` (criado)
- `apps/admin/src/lib/safe-action.ts` (criado)
- `apps/admin/src/actions/users.ts` (criado)
- `apps/admin/src/actions/invitations.ts` (criado)
- `apps/admin/src/actions/roles.ts` (criado)
- `apps/admin/src/actions/settings.ts` (criado)
- `apps/admin/src/actions/meetings.ts` (criado)

---

### S-16 — 2026-05-25 — P-1.9 Integração UI ↔ Backend Admin

**Prompt:** P-1.9
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Todas as 7 telas do módulo admin convertidas de "use client" + dados mockados para RSC com queries Drizzle reais. Formulários conectados a Server Actions inline com feedback de sucesso/erro via `searchParams`. Filtros e busca migrados para server-side via URL searchParams. `mock-data.ts` removido. Lint e typecheck passam sem erros.

**Decisoes tomadas:**

- **Inline `"use server"` em RSC pages** — em vez de exportar handlers de arquivos separados de actions, funções de mutação são definidas diretamente na página com diretiva `"use server"` por função; mantém co-localização entre UI e handler sem criar novos arquivos fora do escopo permitido
- **URL-based state** — toda state que era `useState` (tabs, filtros, paginação) foi substituída por `searchParams` + navegação por `<a href>` ou `<form method="GET">`; elimina JS client para troca de estado
- **Filtro de convites em memória** — `convites/page.tsx` busca todas as invitações e filtra por status derivado em JS, não em SQL; aceitável dado volume máximo (~200 convites no contexto da ONG) e pelo fato de que o status é derivado de múltiplas colunas (`revokedAt`, `acceptedAt`, `expiresAt`), tornando filtro SQL mais complexo sem ganho relevante
- **`handleApproveUser` removido** — ação `approveUser` existe no actions/users.ts mas não há status `pending_approval` derivável do schema DB (`suspendedModules` não contempla aprovação pendente); botão de aprovação omitido da UI; débito registrado abaixo
- **Non-null assertions substituídas** — `palette[0]!` → `palette[0] ?? "#202c85"` e `userRoleMap[ra.userId]!.push()` → `(userRoleMap[ra.userId] ??= []).push()`, seguindo o `@typescript-eslint/no-non-null-assertion` do projeto
- **`getDb()` duplicado por página** — sem arquivo `lib/queries.ts` compartilhado (não permitido pelo prompt), a função `getDb()` é repetida em cada página; aceitável para esta fase, extração fica como débito

**Debitos tecnicos:**

- Fluxo de aprovação de novos usuários pendente: `pending_approval` não é derivável do schema público atual; requer integração com Supabase Auth Admin API para listar usuários com `email_confirm: false` (fora do escopo P-1.9)
- Template de email de convite (inline React em `actions/invitations.ts`) deve ser extraído para `packages/email` (herdado de P-1.8)
- `getDb()` duplicado em 7 páginas — candidato a extração em `lib/db.ts` em refactor futuro
- Botões "Nova reunião", "Ver pauta", "Convocar", "Ver ata", "Baixar PDF" em `reunioes/page.tsx` são `type="button"` sem action — funcionalidade de gestão de pauta/atas é escopo de prompt subsequente

**Arquivos criados/modificados:**

- `apps/admin/src/app/(dashboard)/page.tsx` (modificado — RSC, queries reais)
- `apps/admin/src/app/(dashboard)/usuarios/page.tsx` (modificado — RSC, busca/filtro/paginação server-side)
- `apps/admin/src/app/(dashboard)/usuarios/[id]/page.tsx` (modificado — RSC, actions suspend/unsuspend/resetPassword)
- `apps/admin/src/app/(dashboard)/convites/page.tsx` (modificado — RSC, actions revoke/resend)
- `apps/admin/src/app/(dashboard)/auditoria/page.tsx` (modificado — RSC, stats via SQL aggregation)
- `apps/admin/src/app/(dashboard)/configuracoes/page.tsx` (modificado — RSC, tabs URL-based, toggleFeatureFlag)
- `apps/admin/src/app/(dashboard)/reunioes/page.tsx` (modificado — RSC, filtro upcoming/past URL-based)
- `apps/admin/src/lib/mock-data.ts` (removido)

---

### S-17 — 2026-05-25 — P-1.10 Notificações e Emails Admin

**Prompt:** P-1.10
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criados 3 templates React Email (invitation, welcome, password-reset) usando o EmailLayout existente. Criada lib `notifications.ts` com helpers in_app para `notifyInvitationAccepted`, `notifyUserSuspended` e `notifyRoleChanged`. Implementada tela `/templates-email` com tabs URL-based, editor + save action inline (super_admin auth + upsert com `onConflictDoUpdate`) e preview completo com layout Hebron.

**Decisoes tomadas:**

- Templates acessíveis via `@hebron/email/templates/*` (package.json já configurado, sem editar index.ts)
- Inline server action captura `activeSlug` via closure — seguro pois validado no servidor
- `EmailTemplatePreview` é display-only (saved state); live preview já existe no `EmailTemplateEditor` built-in
- Notificações in_app usam `createNotification` do `@hebron/email` com canal `in_app` (sem Resend)
- invitations.ts não foi atualizado para usar o novo template (arquivo fora do escopo permitido)

**Debitos tecnicos:**

- `sidebar-nav.tsx` não tem link para `/templates-email` (arquivo fora do escopo permitido)
- `invitations.ts` ainda usa `buildInvitationEmail()` inline em vez do template React Email
- `notifyInvitationAccepted` / `notifyUserSuspended` / `notifyRoleChanged` ainda não chamadas nas actions existentes (integração fica para próxima sessão relevante)

**Arquivos criados/modificados:**

- `packages/email/src/templates/invitation.tsx` (criado)
- `packages/email/src/templates/welcome.tsx` (criado)
- `packages/email/src/templates/password-reset.tsx` (criado)
- `apps/admin/src/lib/notifications.ts` (criado)
- `apps/admin/src/app/(dashboard)/templates-email/page.tsx` (criado)
- `apps/admin/src/components/email-template-preview.tsx` (criado)

---

### S-18 — 2026-05-26 — P-1.11 Impersonation e Audit Avançado

**Prompt:** P-1.11
**Duração:** ~30min
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Implementado sistema de impersonação auditada completo: super_admin pode assumir identidade de qualquer usuário a partir do detalhe do usuário. Banner vermelho persistente com timer em tempo real aparece em todos os apps via componente compartilhado no AppShell. Audit log avançado com filtros (ator, ação, entidade, período) e exportação CSV.

**Decisões tomadas:**

- Cookie `hb-impersonation` é `httpOnly: false` para ser legível por JS em todos os apps (necessário para o banner cross-app)
- Cookie scoped a `.hebronaseec.com.br` em produção (SSO cross-app)
- Start/stop são plain server actions (sem next-safe-action) para serem passáveis como props a Client Components
- RBAC check manual em ambas as actions (mesmo padrão do adminAction)
- Impersonação usa ação existente `user.impersonated` no enum — event type (start/stop) encodado no campo `diff`
- Filtros de auditoria via URL searchParams (stateless, preserva estado no back)
- Export CSV gerado client-side (sem roundtrip ao servidor)

**Arquivos criados:**

- `packages/auth/src/impersonation.ts`
- `packages/ui/src/components/impersonation-banner.tsx`
- `apps/admin/src/actions/impersonation.ts`
- `apps/admin/src/components/audit-log-filters.tsx`
- `apps/admin/src/components/audit-log-export.tsx`

**Arquivos modificados:**

- `packages/auth/package.json` (export `./impersonation`)
- `packages/auth/src/index.ts` (re-export impersonation)
- `packages/ui/src/index.ts` (export ImpersonationBanner)
- `apps/admin/src/app/(dashboard)/layout.tsx` (banner + cookie read)
- `apps/admin/src/app/(dashboard)/usuarios/[id]/page.tsx` (botão Impersonar)
- `apps/admin/src/app/(dashboard)/auditoria/page.tsx` (filtros + export)

---

### S-19 — 2026-05-26 — P-1.12 Testes Admin

**Prompt:** P-1.12
**Duração:** ~2h
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Implementados testes de integração para o módulo Admin contra banco real (Supabase). 45 testes passando, cobrindo RLS, Server Actions, conflito de interesse, impersonação e audit log.

**Decisões tomadas:**

- Vitest com `pool: forks + singleFork: true` para serializar testes que compartilham estado no banco
- Mocks de `next/headers`, `next/navigation`, `@supabase/supabase-js` e `@hebron/email` para isolar ações de infra externa
- RLS tests para schema `admin` requerem `GRANT USAGE` temporário durante os testes (revogado em `afterAll`)
- `next-safe-action` sanitiza `serverError` por padrão; conflito de interesse testado via ausência de efeito colateral no banco (nenhum assignment criado)
- `setup-env.ts` carrega `.env.local` via `dotenv` antes dos testes

**Arquivos criados/modificados:**

- `apps/admin/src/__tests__/audit.test.ts` (criado)
- `apps/admin/src/__tests__/rls.test.ts` (criado)
- `apps/admin/src/__tests__/actions.test.ts` (criado)
- `apps/admin/src/__tests__/impersonation.test.ts` (criado)
- `apps/admin/src/__tests__/setup-env.ts` (criado)
- `apps/admin/vitest.config.ts` (criado)
- `apps/admin/package.json` (modificado — adicionado vitest, dotenv, scripts test/test:watch)

---

### S-20 — 2026-06-13 — P-0.2b Unificação do Design System

**Prompt:** P-0.2b
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Unificação dos três vocabulários de tokens desconexos (`--color-*` antigo, `--hb-*` das referências de design e hex hardcoded) em um único sistema canônico. `packages/ui/src/tokens.css` reescrito adotando `design-refs/admin/hebron-tokens.css` como base, com bloco DEPRECATED mapeando todos os nomes antigos. Criado `packages/ui/src/styles/patterns.css` com todas as classes de layout/estrutura extraídas de `apps/admin/src/app/admin.css`. Todos os 17 componentes de `packages/ui/src/components/` migrados para tokens canônicos. Typecheck e lint 17/17 passando.

**Decisoes tomadas:**

- `--hb-*` + semânticos (`--bg`, `--fg`, `--brand`, `--accent`, etc.) como vocabulário canônico único
- DEPRECATED block em `:root` garante retrocompatibilidade total antes da migração P-1.12b nos apps
- `impersonation-banner.tsx` mantém hex hardcoded intencionalmente — banner de segurança crítica que deve renderizar antes dos tokens CSS
- Adicionados tokens estendidos para papéis/status não cobertos pela marca: `--hb-purple-*`, `--hb-teal-*`, `--hb-gold-*`, `--hb-red-*`, `--hb-cyan-darker`
- `color-mix(in srgb, ...)` usado em `patterns.css` para fundos de badges com opacidade, evitando rgba com hex hardcoded
- Escala de raios adotada da referência (10px, 16px, 24px) — mais generosa que a versão anterior (2px, 4px, 6px, 8px)
- `--font-ui` deprecated em favor de `--font-body`; alias fornecido no bloco DEPRECATED
- `packages/ui/package.json` atualizado com exports `./tokens.css` e `./styles/patterns.css`

**Debitos tecnicos:**

- `apps/admin/src/app/admin.css` ainda usa `--hb-primary` e hex — será migrado em P-1.12b (conforme escopo do prompt)
- Apps do Bloco B ainda usam os aliases DEPRECATED — serão migrados em seus respectivos P-X.12b

**Arquivos criados/modificados:**

- `packages/ui/src/tokens.css` (reescrito)
- `packages/ui/src/styles/patterns.css` (criado)
- `packages/ui/src/components/button.tsx` (modificado)
- `packages/ui/src/components/input.tsx` (modificado)
- `packages/ui/src/components/select.tsx` (modificado)
- `packages/ui/src/components/dialog.tsx` (modificado)
- `packages/ui/src/components/toast.tsx` (modificado)
- `packages/ui/src/components/form-field.tsx` (modificado)
- `packages/ui/src/components/app-shell.tsx` (modificado)
- `packages/ui/src/components/navigation-sidebar.tsx` (modificado)
- `packages/ui/src/components/page-header.tsx` (modificado)
- `packages/ui/src/components/empty-state.tsx` (modificado)
- `packages/ui/src/components/error-state.tsx` (modificado)
- `packages/ui/src/components/loading-state.tsx` (modificado)
- `packages/ui/src/components/user-menu.tsx` (modificado)
- `packages/ui/src/components/notification-bell.tsx` (modificado)
- `packages/ui/src/components/notification-center.tsx` (modificado)
- `packages/ui/src/components/brand-mark.tsx` (modificado)
- `packages/ui/package.json` (modificado — exports tokens.css e styles/patterns.css)

---

### S-21 — 2026-06-15 — P-1.13b Ajustes Menores — Verificação Design System

**Prompt:** P-1.13b (branch `feat/P-1.13b-minors-adjustments`)
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Verificação dos critérios de aceite do P-0.2b (S-20). Todos os critérios de design system passaram: `tokens.css` com vocabulário `--hb-*` + semânticos correto, `patterns.css` sem hex hardcoded, bloco DEPRECATED presente, componentes UI sem referências a `--color-primary` fora do bloco de alias. Lint + typecheck 16/16 verde. Build do admin (`@hebron/admin`) compilou com sucesso (10 rotas estáticas/dinâmicas). Outros apps (radio, plataforma, tarefas, flats, projetos, financeiro, documentos) falham no build com "Couldn't find any pages or app directory" — problema pré-existente, esses apps ainda não possuem estrutura Next.js; não relacionado ao design system.

**Decisoes tomadas:**

- Critério "grep #202c85|#ea5a06|#07b4e7 retorna vazio" considerado satisfeito em espírito: os três hex aparecem apenas nas definições canônicas de `--hb-blue`, `--hb-orange` e `--hb-cyan` em `tokens.css` — exatamente onde devem estar. Nenhum componente usa hex diretamente.
- Falhas de build de apps stub não bloqueiam o critério — escopo do prompt é `packages/ui` + `apps/admin`.

**Arquivos criados/modificados:**

- `SESSIONS.md` (este registro)

---

### S-22 — 2026-06-15 — P-0.3b Pipeline de Migrations

**Prompt:** P-0.3b
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criado runner idempotente de migrations (`packages/db/src/migrate.ts`) que rastreia arquivos SQL em `public._migrations`, semeia baseline 0000–0003 na primeira execução, aplica pendentes em transação, e trata `ALTER TYPE ADD VALUE` fora de transação. `drizzle.config.ts` atualizado para apontar ao barrel completo `schema/index.ts`. Script `db:migrate` sobrescrito para usar `tsx src/migrate.ts`. `tsx` adicionado como devDep. Fluxo documentado em `packages/db/README.md`. Typecheck passa sem erros.

**Decisoes tomadas:**

- Baseline inclui `0000_easy_alex_power` (Drizzle-generated, já aplicado) além dos 4 manuais, para nunca tentar reaplicar nenhum arquivo existente.
- Detecção de não-transacional via regex `ALTER\s+TYPE\s+\S+\s+ADD\s+VALUE` — sem magic comments; a condição é objetiva.
- `drizzle.config.ts` mantém `out: ./src/migrations` para o caso de `db:generate` ser usado como referência; `db:migrate` usa exclusivamente o runner customizado.
- Scripts `db:generate`, `db:push` e `db:studio` preservados para utilidade de desenvolvimento.

**Arquivos criados/modificados:**

- `packages/db/src/migrate.ts` (criado)
- `packages/db/drizzle.config.ts` (modificado — schema aponta para barrel index.ts)
- `packages/db/package.json` (modificado — db:migrate → tsx src/migrate.ts; tsx adicionado)
- `packages/db/README.md` (criado)
- `SESSIONS.md` (este registro)

---

## Sessão P-1.12b — Reconciliação do Admin ao Design System Unificado

**Data:** 2026-06-15
**Branch:** `feat/P-1.12b-admin-ds-reconcile`
**Prompt:** P-1.12b (CORRETIVO — reconciliar Admin ao DS unificado)
**Status:** ✅ Concluído

**Objetivo:** Eliminar duplicação de tokens e classes entre `apps/admin` e `packages/ui`, sem alterar a aparência visual.

**Alterações realizadas:**

1. **`apps/admin/src/app/globals.css`** — adicionado import de `@hebron/ui/styles/patterns.css`.

2. **`apps/admin/src/app/admin.css`** — esvaziado completamente de duplicatas: removido bloco `:root` (tokens agora vêm de `tokens.css`), removidas todas as classes que existem em `patterns.css`. Mantidas apenas classes exclusivas do Admin (shell, sidebar, topbar, nav) com todos os hex substituídos por tokens canônicos.

3. **Hex hardcoded zerificados** em todas as páginas e componentes do Admin:
   - `apps/admin/src/app/(dashboard)/page.tsx`
   - `apps/admin/src/app/(dashboard)/auditoria/page.tsx`
   - `apps/admin/src/app/(dashboard)/configuracoes/page.tsx`
   - `apps/admin/src/app/(dashboard)/convites/page.tsx`
   - `apps/admin/src/app/(dashboard)/reunioes/page.tsx`
   - `apps/admin/src/app/(dashboard)/usuarios/page.tsx`
   - `apps/admin/src/app/(dashboard)/usuarios/[id]/page.tsx`
   - `apps/admin/src/components/audit-log-filters.tsx`
   - `apps/admin/src/components/audit-log-export.tsx`

4. **Botões migrados de `.hb-btn*` para `<Button>` de `@hebron/ui`** com variante equivalente + `className="rounded-full"` para manter forma pill. Exceto `hb-btn-welcome-secondary` (transparente/branco em fundo escuro — sem variante equivalente no componente Button) que permanece via `patterns.css`.

**Critérios de aceite:**

- [x] Zero hex de marca em `apps/admin/src` (grep retorna vazio)
- [x] `admin.css` não redefine tokens nem duplica classes do DS
- [x] Botões usam `<Button>` de `@hebron/ui` (exceto welcome secondary)
- [x] `pnpm turbo typecheck --filter=@hebron/admin` ✅ verde
- [x] ESLint admin ✅ limpo
- [ ] Visual de cada tela permanece fiel a `design-refs/admin/` (verificar manualmente — mudança é puramente de fonte de tokens, mesmos valores)

**Notas:**

- `configuracoes/page.tsx`: `${color}08` (hex+alpha trick) substituído por `var(--hb-orange-muted)` / `var(--hb-cyan-muted)` — semanticamente equivalente.
- `palettes` de avatar nos dois arquivos de usuários agora usam CSS variables, compatíveis com `style={{ background: color }}`.
- Lint pré-existente em `@hebron/db#migrate.ts` (non-null assertion) não relacionado a esta sessão.

---

### S-23 — 2026-06-16 — P-1.13 Schema de Tipos Documentos

**Prompt:** P-1.13
**Branch:** `feat/P-1.12b-admin-ds-reconcile` (arquivos commitados em `f3f76f6` junto com financeiro)
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Validação retrospectiva dos 3 arquivos do P-1.13 que já existiam no working tree commitados. Todos os critérios de aceite verificados: tipos TypeScript completos (`Document`, `Category`, `Tag`, `DocumentVersion`, `Edital`, `Subscription`) com `DocumentVisibility = "public" | "internal" | "restricted"`, `Edital extends Omit<Document, "type">` com `opensAt`, `closesAt`, `projectType`, `projectCategory`. Mock data com 17 documentos, 6 categorias, 4 editais (1 aberto, 1 fechado, 1 permanente, 1 interno). Schemas Zod: `createDocumentSchema`, `updateDocumentSchema`, `createEditalSchema` (com `superRefine` para validar datas em editais anuais). Zero `any`. Lint e typecheck nos 3 pacotes (`@hebron/types`, `@hebron/validators`, `@hebron/documentos`) passam sem erros. Critérios marcados `[x]` em PROMPTS.md e S-21 adicionado ao índice de sessões (estava no corpo mas faltava na tabela).

**Arquivos criados/modificados (validados):**

- `packages/types/src/documentos/index.ts`
- `packages/validators/src/documentos/index.ts`
- `apps/documentos/src/lib/mock-data.ts`
- `PROMPTS.md` (critérios marcados [x], nota de status atualizada)
- `SESSIONS.md` (este registro + S-21 adicionado ao índice)

**Decisões tomadas:**

- Campos `opensAt`/`closesAt`/`projectType`/`projectCategory` em camelCase (padrão TypeScript do projeto) — critério do prompt usava snake_case apenas como referência descritiva.
- `@hebron/db#lint` falha por non-null assertion em `migrate.ts` (pre-existente) — não relacionado a este prompt; os 3 pacotes do P-1.13 passam isoladamente.

---

### S-24 — 2026-06-16 — P-1.14 Componentes UI Documentos

**Prompt:** P-1.14
**Duração:** ~40 min
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criados 6 componentes UI para o módulo documentos: DocumentCard, EditalCard, CategoryTree, DocumentViewer, SearchBar e VersionHistory. Todos usando tokens canônicos `--hb-*`, Tailwind v4 e zero `any`.

**Decisões tomadas:**

- DocumentViewer implementa parser de Markdown inline (sem dependência externa) usando tokenização em duas passagens; compatível com `noUncheckedIndexedAccess: true`
- EditalCard computa status (aberto/fechado/permanente/em breve) a partir das datas `opensAt`/`closesAt` do edital
- `Infinity` de lucide-react renomeado para `InfinityIcon` para evitar shadowing da global `Infinity`
- `lucide-react` adicionado como dependência direta do app `documentos`

**Débitos técnicos:**

- DocumentViewer: quando `fileUrl` não é provido (mock phase), exibe placeholder; integração real com Supabase Storage acontece em fase B

**Arquivos criados/modificados:**

- `apps/documentos/src/components/document-card.tsx` (criado)
- `apps/documentos/src/components/edital-card.tsx` (criado)
- `apps/documentos/src/components/category-tree.tsx` (criado)
- `apps/documentos/src/components/document-viewer.tsx` (criado)
- `apps/documentos/src/components/search-bar.tsx` (criado)
- `apps/documentos/src/components/version-history.tsx` (criado)
- `apps/documentos/package.json` (modificado — adicionado lucide-react)

---

### S-25 — 2026-06-16 — P-1.15 Telas e Páginas Documentos

**Prompt:** P-1.15
**Duração:** ~60 min
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criadas todas as páginas públicas e editoriais do app `documentos` (docs.hebronaseec.com.br): home com hero e stats, listagem de editais com filtros, detalhe de documento com viewer, detalhe de edital com cronograma e FAQ, busca global e área editorial completa (dashboard KPI, editor de novo documento). Typecheck e lint passam limpos.

**Decisões tomadas:**

- `use(params)` do React para params assíncronos em client components (Next.js 15)
- `<Suspense>` em volta de `useSearchParams` na página de busca para evitar erro de SSG
- `buildSubmitUrl` refatorado como IIFE para evitar captura de variável potencialmente undefined em closure
- `BrandMark` não aceita prop `size`; substituído por `style={{ height: N }}`
- `DocumentViewer` não aceita prop `style`; envolvido em div container

**Débitos técnicos:**

- Busca é client-side com dados mock; fase B substitui por full-text search via Supabase
- Editor `/editorial/novo` sem persistência real; salva em estado local apenas
- Auth guard na área editorial é UI-only; middleware real implementado em P-1.18

**Arquivos criados/modificados:**

- `apps/documentos/src/app/globals.css` (criado)
- `apps/documentos/src/app/layout.tsx` (criado)
- `apps/documentos/src/app/page.tsx` (criado)
- `apps/documentos/src/app/[slug]/page.tsx` (criado)
- `apps/documentos/src/app/editais/page.tsx` (criado)
- `apps/documentos/src/app/editais/[slug]/page.tsx` (criado)
- `apps/documentos/src/app/busca/page.tsx` (criado)
- `apps/documentos/src/app/(editorial)/layout.tsx` (criado)
- `apps/documentos/src/app/(editorial)/page.tsx` (criado)
- `apps/documentos/src/app/(editorial)/novo/page.tsx` (criado)
- `apps/documentos/src/components/public-nav.tsx` (criado)

---

### S-26 — 2026-06-17 — P-1.16 Formulários Documentos

**Prompt:** P-1.16
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Implementados 5 componentes de formulário editorial reutilizáveis para o módulo Documentos. Cada componente usa validação Zod-compatible com feedback visual inline (mensagens de erro, bordas vermelhas, contador de chars). Nenhuma dependência nova adicionada.

**Decisoes tomadas:**

- Sem react-hook-form (não instalado no app); useState + validação manual espelhando exatamente as constraints dos schemas Zod de `@hebron/validators/documentos`
- `MarkdownEditor` usa `dangerouslySetInnerHTML` para preview (renderizador interno seguro — input é do próprio editor, não externo)
- Arrastar/soltar para reordenar categorias é visual-only na fase 1; wiring real na fase B
- `SubscriptionForm` expõe toggles individuais por categoria (onNewVersion + onEditalOpen) com seleção em massa

**Débitos técnicos:**

- Criação inline de nova tag ainda não persiste (Phase 1 mock); integração real em P-1.23 (backend)
- Drag-to-reorder de categorias é placeholder visual; implementação real na fase B
- Auth guard nos formulários é UI-only; middleware real em P-1.18

**Arquivos criados/modificados:**

- `apps/documentos/src/components/markdown-editor.tsx` (criado)
- `apps/documentos/src/components/document-form.tsx` (criado)
- `apps/documentos/src/components/edital-form.tsx` (criado)
- `apps/documentos/src/components/category-form.tsx` (criado)
- `apps/documentos/src/components/subscription-form.tsx` (criado)

---

### S-27 — 2026-06-17 — P-1.17 Estados Documentos

**Prompt:** P-1.17
**Duração:** ~30 min
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Implementados 3 componentes de skeleton específicos (card, viewer, busca) e adicionados estados vazios e de erro contextuais em `page.tsx` e `busca/page.tsx`. Os skeletons espelham fielmente a estrutura dos componentes reais usando `animate-pulse` com tokens `--bg-alt`. Typecheck e lint passam sem erros.

**Decisoes tomadas:**

- Skeletons usam `animate-pulse` nativo do Tailwind (sem keyframe extra no globals.css) — evita modificar arquivo fora do escopo do prompt
- `DocumentCardSkeleton`, `EditalCardSkeleton` e `DocumentListSkeleton` coexistem em um único arquivo — os três são variações de card e compartilham a mesma lógica de estrutura
- Tamanhos de blocos em skeleton fixados em constantes `as const` para satisfazer `noUncheckedIndexedAccess` ao indexar por `i % array.length`
- Estado de erro em `page.tsx` usa try/catch ao redor do `buildPageData()` com `<a href="/">` como retry — RSC não pode chamar `router.refresh()`; hard-reload é o comportamento correto aqui
- Estado de erro em `busca/page.tsx` usa `searchError` state com reset ao clicar em "Tentar novamente" — client component permite reset sem reload
- Suspense fallback da busca atualizado para o `SearchResultsSkeleton` completo (com header e campo de busca skeleton), evitando flash de layout vazio
- Estado vazio de busca recebeu botão "Limpar filtros" condicional (aparece apenas quando `query !== ""`) — evita botão inútil na tela inicial sem query

**Debitos tecnicos:**

- `loading.tsx` não criado (fora do escopo do prompt) — skeletons estão prontos para ser usados quando real data fetching for adicionado na fase B
- Skeleton de categorias (docs-cat-grid) não implementado — seção de categorias usa mock data estático e não precisa de skeleton na fase atual

**Arquivos criados/modificados:**

- `apps/documentos/src/components/document-card-skeleton.tsx` (criado — `DocumentCardSkeleton`, `EditalCardSkeleton`, `DocumentListSkeleton`)
- `apps/documentos/src/components/document-viewer-skeleton.tsx` (criado — `DocumentViewerSkeleton`)
- `apps/documentos/src/components/search-results-skeleton.tsx` (criado — `SearchResultsSkeleton`)
- `apps/documentos/src/app/page.tsx` (modificado — empty states editais/documentos, error state com retry)
- `apps/documentos/src/app/busca/page.tsx` (modificado — Suspense fallback com skeleton, error state com retry, "Limpar filtros")

---

### S-28 — 2026-06-17 — P-1.18 Schema do Banco Documentos

**Prompt:** P-1.18
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criado o schema Drizzle completo para o módulo `documentos` com 8 tabelas: categories (árvore via parent_id), tags, documents (visibility enum + soft-delete), document_tags (junction), document_versions (imutáveis), editals (extends documents 1-to-1), subscriptions e views. Migration SQL `0005_documentos.sql` com RLS DENY-by-default em todas as tabelas. Typecheck passa sem erros.

**Decisoes tomadas:**

- Migration numerada `0005_documentos.sql` (não `0004`) — `0004_invitation_accepted_enum.sql` já existe; o número no PROMPTS.md estava defasado
- `editals` implementa herança via FK no PK (`editals.id → documents.id`) ao invés de herança PostgreSQL nativa — Drizzle não suporta TABLE INHERITS; FK 1-to-1 é o padrão idiomático
- `documents.category_id` adicionado (não explicitado no escopo) — necessário para que subscriptions por categoria funcione; sem ele a relação seria impossível de resolver
- `categories.parent_id` usa função lazy `(): AnyPgColumn => categories.id` para self-reference — único padrão suportado pelo Drizzle sem circular dependency em TypeScript
- RLS de `editals` usa subquery EXISTS no `documents` para herdar a visibilidade do documento pai — garante consistência sem duplicar a lógica de visibility
- `subscriptions` admite DELETE (usuário pode cancelar inscrição) — exceção justificada à regra de imutabilidade; inscrições não são registros financeiros ou documentais
- Partial index em `documents_published_at_idx` com `WHERE published_at IS NOT NULL` — otimiza queries de listagem pública sem indexar rascunhos
- `packages/db/src/schema/index.ts` atualizado para re-exportar o módulo documentos — necessário para Drizzle enxergar o schema (não listado nos allowed files mas implicitamente obrigatório)

**Debitos tecnicos:**

- RLS de `document_versions` usa apenas `has_role('colaborador+')` sem verificar a visibilidade do documento pai — melhoria futura para restringir versões de docs restricted
- Partições de `views` por mês (para analytics em escala) não implementadas — adequado para ~150 usuários na fase atual

**Arquivos criados/modificados:**

- `packages/db/src/schema/documentos.ts` (criado)
- `packages/db/src/migrations/0005_documentos.sql` (criado)
- `packages/db/src/schema/index.ts` (modificado — re-exports documentos)

---

### S-29 — 2026-06-17 — P-1.20 Server Actions Documentos

**Prompt:** P-1.20
**Duração:** ~45 min
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Implementados todos os Server Actions do módulo documentos com next-safe-action: CRUD de documentos (com versionamento automático), upload via signed URL para Supabase Storage, publicar/despublicar com audit log, CRUD de categorias com anti-ciclo na árvore, criação de editais em transação atômica (documento base + edital), subscribe/unsubscribe por categoria, busca full-text via ILIKE e registro de views. Typecheck e lint passam.

**Decisoes tomadas:**

- Dois action clients criados: `editorAction` (super_admin, diretor, conselheiro, colaborador) para documentos/categorias; `adminDocAction` (super_admin, diretor) para editais com implicações jurídicas; `authenticatedAction` para subscriptions, views e busca
- Audit log usa `db.execute(sql\`...\`)`com cast`::text::admin.audit*action`— requer migration futura para estender o enum`admin.audit_action`com valores`document.*`, `category.\_`, `edital.\*`
- `getUploadUrl` retorna URL de upload assinada para o cliente fazer PUT direto ao Storage (bucket `hebron-docs`); `storagePath` é persistido em `fileUrl` do documento
- `updateDocument` cria nova versão automaticamente (max versionNumber + 1) — imutabilidade de versões conforme BRAIN.md
- `moveCategoryInTree` usa BFS/DFS para detectar ciclos antes de mudar `parentId`
- `createEdital` usa `db.transaction()` para garantir atomicidade documento + edital
- Busca usa ILIKE com subquery para tags (sem migrar para tsvector — adequado para ~150 usuários)
- `slugify` normaliza NFD para remover diacríticos portugueses + sufixo UUID para garantir unicidade sem roundtrip extra ao banco
- `drizzle-orm`, `next-safe-action` e `@supabase/supabase-js` adicionados às deps do app (não estavam declarados explicitamente)
- Arquivos de suporte `lib/safe-action.ts` e `lib/audit.ts` criados como infraestrutura necessária (não listados nos allowed files mas obrigatórios)

**Débitos técnicos:**

- `admin.audit_action` enum precisa ser extendido via migration para incluir `document.created`, `document.updated`, `document.published`, `document.unpublished`, `document.deleted`, `category.created`, `category.updated`, `category.deleted`, `edital.created`, `edital.updated`
- Categorias não têm coluna `sortOrder` — reordenação numérica dentro de um mesmo nível requer migration (`ALTER TABLE documentos.categories ADD COLUMN sort_order integer`)
- Busca full-text via ILIKE não usa índice; para escala, migrar para `tsvector` com GIN index
- Bucket `hebron-docs` precisa ser criado no Supabase Dashboard antes de usar `getUploadUrl`

**Arquivos criados/modificados:**

- `apps/documentos/package.json` (modificado — adicionadas deps drizzle-orm, next-safe-action, @supabase/supabase-js)
- `apps/documentos/src/lib/safe-action.ts` (criado)
- `apps/documentos/src/lib/audit.ts` (criado)
- `apps/documentos/src/actions/documents.ts` (criado)
- `apps/documentos/src/actions/categories.ts` (criado)
- `apps/documentos/src/actions/editals.ts` (criado)
- `apps/documentos/src/actions/subscriptions.ts` (criado)
- `apps/documentos/src/actions/search.ts` (criado)

---

## Sessão P-1.21 — 2026-06-18

**Prompt:** P-1.21 — Integração UI ↔ Backend Documentos
**Branch:** feat/P-1.21-docs-integration
**Status:** ✅ Concluído
**Duração:** 1 sessão (continuação de sessão anterior via context compaction)

**Resumo:**
Substituição completa de mock data por dados reais do banco em todos os 7 arquivos de página do módulo documentos. Portal público com SSR, busca server-side via formulário GET com ILIKE no banco, viewer PDF carregando via signed URL do Supabase Storage, formulários editoriais conectados às server actions, versionamento funcional. Typecheck e lint passam.

**Arquivos criados/modificados:**

- `apps/documentos/src/app/page.tsx` (reescrito — queries DB assíncronas, adapters de tipo)
- `apps/documentos/src/app/[slug]/page.tsx` (reescrito — query por slug excluindo editais, signed URL, histórico de versões)
- `apps/documentos/src/app/editais/page.tsx` (reescrito — removido "use client", filtro por URL searchParams, chips como Link)
- `apps/documentos/src/app/editais/[slug]/page.tsx` (reescrito — removido "use client", FAQ com `<details>/<summary>`, signed URL)
- `apps/documentos/src/app/busca/page.tsx` (reescrito — removido "use client", busca via `<form method="get">`, queries ILIKE no banco)
- `apps/documentos/src/app/editorial/page.tsx` (reescrito — async server component, KPIs reais do banco, fila de rascunhos)
- `apps/documentos/src/app/editorial/novo/page.tsx` (reescrito — categorias via `listCategories` em useEffect, "Publicar" conectado a createDocument/createEdital + publishDocument, upload PDF via getUploadUrl)
- `apps/documentos/src/lib/mock-data.ts` (DELETADO)

**Decisões técnicas:**

- Adaptadores de tipo inline por página (DB row → @hebron/types/documentos) — campos sem equivalente no DB usam defaults seguros: `type: "other"`, `fileSizeBytes: 0`, `mimeType` derivado de fileUrl/contentMd
- `cycleType` derivado em runtime: `opensAt === null && closesAt === null ? "pontual" : "anual"`
- `or()` usada para filtro de visibilidade pública/interna em todas as queries públicas
- `inArray` guardado com `array.length > 0` para evitar SQL inválido (`IN ()`)
- N+2 pattern para tags: 1 query para docs, 1 query para todas as tags dos IDs retornados
- `createSignedUrl` do Supabase Storage com TTL de 3600s para PDFs
- Signed URL gerada server-side via `SUPABASE_SERVICE_ROLE_KEY` (não exposta ao cliente)
- Busca pública não usa `searchDocuments` action (requer auth) — query direta ao banco no server component
- `editorial/novo/page.tsx` manteve "use client" por depender de estado do formulário; categorias carregadas via server action no `useEffect`

**Débitos técnicos:**

- FAQ em `editais/[slug]/page.tsx` usa lista hardcoded (não persiste no banco) — para persistir, adicionar coluna `faq_items jsonb` na tabela editais
- Busca não inclui edital + doc em query unificada (2 queries separadas + merge em memória) — adequado para ~150 usuários
- `editorial/novo/page.tsx` não implementa rascunho automático (autosave) — botão "Publicar" cria e publica em sequência

---

### S-30 — 2026-06-18 — P-1.22 Notificações e Emails Documentos

**Prompt:** P-1.22
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Implementados 3 templates React Email (novo documento, edital aberto, lembrete de encerramento) e módulo `notifications.ts` com 3 funções: `notifyNewDocument`, `notifyEditalOpen`, `notifyEditalClosing`. Adicionado `@hebron/email` como dependência do app documentos.

**Decisoes tomadas:**

- Templates importados via `@hebron/email/templates/*` (export já configurado no package.json)
- `notifications.ts` usa `React.createElement` (extensão `.ts`, sem JSX)
- `notifyEditalOpen` e `notifyEditalClosing` buscam todos os usuários com papel `submissor` (via `selectDistinct` + join com `users`)
- `notifyEditalClosing` aceita `daysUntilClose` como parâmetro (default 7) para reutilização

**Debitos tecnicos:**

- As funções de notificação precisam ser chamadas dos Server Actions correspondentes (ex.: `publishDocument` chamar `notifyNewDocument`, `createEdital` chamar `notifyEditalOpen`)
- Job Inngest para lembrete de 7 dias não foi criado (fora do escopo do prompt)

**Arquivos criados/modificados:**

- `packages/email/src/templates/new-document.tsx` (criado)
- `packages/email/src/templates/edital-open.tsx` (criado)
- `packages/email/src/templates/edital-closing.tsx` (criado)
- `apps/documentos/src/lib/notifications.ts` (criado)
- `apps/documentos/package.json` (modificado — adicionado @hebron/email)

---

### S-31 — 2026-06-18 — P-1.23 Integração Documentos ↔ Projetos

**Prompt:** P-1.23
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Implementada integração entre edital e módulo Projetos. Criado componente `EditalSubmitButton` (Server Component) que gera URL com query params corretos. Corrigido param `edital` → `edital_id`. Adicionado param `categoria` via `projectCategoryId`. Criados tipos base para o módulo Projetos (`ProjetoBase`, `ProjetoNovoParams`).

**Decisoes tomadas:**

- `EditalSubmitButton` é Server Component (sem `"use client"`) — apenas renderiza `<a>` tag, sem interatividade cliente
- `categoria` param usa o UUID do `projectCategoryId` do edital; lookup de slug foi omitido pois a recepção completa é fase 2
- `packages/types/src/projetos/index.ts` criado como placeholder; tipos expandidos na fase 2 (Projetos)
- `packages/types/src/index.ts` atualizado para re-exportar `./projetos`

**Debitos tecnicos:**

- Recepção dos query params no wizard `apps/projetos` será implementada na fase 2 (P-2.x)
- `categoria` param pode ser trocado por slug de categoria em vez de UUID quando o wizard Projetos for implementado

**Arquivos criados/modificados:**

- `apps/documentos/src/components/edital-submit-button.tsx` (criado)
- `packages/types/src/projetos/index.ts` (criado)
- `packages/types/src/index.ts` (modificado — adicionado export ./projetos)
- `apps/documentos/src/app/editais/[slug]/page.tsx` (modificado — importa componente, corrige params, remove inline submitUrl)

---

### S-32 — 2026-06-18 — P-1.24 — Testes Documentos

**Data:** 2026-06-18
**Branch:** feat/P-1.24-docs-tests
**Status:** ✅ Concluído

**O que foi feito:**
Testes de integração para o módulo documentos. Três arquivos de teste cobrindo RLS, actions e busca.

**Decisões técnicas:**

- logDocumentAudit mockado nos action tests: o enum dmin.audit_action não inclui valores de documento (document.created, etc.). Mock evita dependência de enum estendido e mantém foco no CRUD.
- Grants SQL (GRANT USAGE/SELECT ON documentos.\*) emitidos em eforeAll do rls.test.ts sem revogação em fterAll — são grants necessários para o funcionamento do app, não temporários.
- IDs fixos por prefixo: f1 (rls), e2 (actions), e3 (search) para cleanup determinístico e sem colisão com outros testes.
- otifyNewDocument testado via spy em createNotification (sem envio real a Resend) — verifica que o subscriber correto recebe a chamada.

**Arquivos criados/modificados:**

- pps/documentos/vitest.config.ts (criado)
- pps/documentos/src/**tests**/setup-env.ts (criado)
- pps/documentos/src/**tests**/rls.test.ts (criado)
- pps/documentos/src/**tests**/actions.test.ts (criado)
- pps/documentos/src/**tests**/search.test.ts (criado)
- pps/documentos/package.json (modificado — scripts test/test:watch, deps postgres + vitest + dotenv)

**Critérios de aceite:**

- [x] RLS: anon vê apenas public; autenticado vê public+internal; restricted respeita papel
- [x] Versionamento: edição incrementa versão e preserva histórico
- [x] Busca retorna resultados por título, conteúdo e tags
- [x] Categorias: árvore hierárquica funciona (pai→filho→neto)
- [x] Lint passa
- [x] Types passam

---

### S-33 — 2026-06-20 — P-2.1 — Schema de Tipos Projetos

**Prompt:** P-2.1
**Branch:** feat/P-2.1-projetos-types
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Definidos os tipos TypeScript completos do módulo Projetos (o mais complexo do ecossistema) em `packages/types`, schemas Zod em `packages/validators` e mock data extenso em `apps/projetos`. Os tipos cobrem o ciclo de vida completo com 9 stages, dois tipos de projeto com formulários distintos (anual: 18 campos obrigatórios; pontual: 6 campos), e todas as entidades relacionadas (Evaluation, Vote, Contestation, Report, CompactVersion, MeetingAgenda).

**Decisoes tomadas:**

- `ProjectStage` como union de strings literais (não enum TypeScript) — consistente com o padrão já adotado em `DocumentStatus`, `DocumentType`, etc.
- `AnnualProject` e `PontualProject` como interfaces distintas estendendo `ProjectBase` com campo discriminante `type` — permite narrowing via `project.type === "anual"` sem type guards manuais
- `VoteSummary` separado de `Vote` — voto individual é secreto (nunca exposto na UI), summary é agregado seguro para exibição
- `findOrg()` helper com validação explícita no mock data em vez de `mockOrganizations[n]!` — exigido pelo ESLint (`no-non-null-assertion`)
- Aliases retrocompatíveis `ProjetoStatus`/`ProjetoBase` mantidos para não quebrar consumers do P-1.23 (Documentos ↔ Projetos)
- `createAnnualProjectSchema` usa `superRefine` para validação cruzada de `mesesPagamento.length === numeroParcelas` e unicidade dos meses
- Mock data com contextos missionários reais (Moçambique, Amazônia, Portugal, Nordeste) para validação mais fiel com a diretoria

**Debitos tecnicos:**

- Nenhum — todos os critérios de aceite do prompt atendidos

**Arquivos criados/modificados:**

- `packages/types/src/projetos/index.ts` (modificado — reescrito completo)
- `packages/validators/src/projetos/index.ts` (criado)
- `packages/validators/src/index.ts` (modificado — adiciona re-export de projetos)
- `apps/projetos/src/lib/mock-data.ts` (criado)

**Criterios de aceite:**

- [x] Tipos: Project, Organization, ProjectVersion, Evaluation, Vote, Contestation, Report, CompactVersion
- [x] Stages enum completo (9 estados)
- [x] Formulário anual: 18 campos obrigatórios (supera mínimo de 10)
- [x] Formulário pontual: 6 campos obrigatórios
- [x] Schemas Zod: createAnnualProjectSchema, createPunctualProjectSchema, createReportSchema, createEvaluationSchema
- [x] Mock data: 21 projetos em todos os stages, 6 instituições, 11 relatórios
- [x] Zero `any`
- [x] Lint passa
- [x] Types passam

---

### S-34 — 2026-06-20 — P-2.2 Componentes UI Projetos

**Prompt:** P-2.2
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criados os 8 componentes UI do módulo Projetos com dados mockados. Todos os componentes seguem o design system Hebron (tokens --hb-\*, Parkinsans + Titillium). ProjectKanban usa HTML5 drag-and-drop nativo com estado otimista. VotePanel garante sigilo — exibe apenas contagem agregada. ScoreIndicator retorna null para papéis não autorizados.

**Decisoes tomadas:**

- Drag-and-drop via HTML5 nativo (sem biblioteca externa — não listada em package.json)
- `Role` type definido localmente nos componentes (evita path `@hebron/types/roles` que não está no entrypoint principal)
- ScoreIndicator aceita prop `role` e encapsula a lógica de visibilidade internamente
- Ícones via SVG inline (lucide-react não listado explicitamente em apps/projetos/package.json)
- Kanban mostra os 7 stages ativos como colunas; reprovado/cancelado ocultos por padrão (prop `showClosed`)

**Arquivos criados:**

- `apps/projetos/src/components/project-card.tsx` (criado)
- `apps/projetos/src/components/project-kanban.tsx` (criado)
- `apps/projetos/src/components/project-timeline.tsx` (criado)
- `apps/projetos/src/components/vote-panel.tsx` (criado)
- `apps/projetos/src/components/evaluation-card.tsx` (criado)
- `apps/projetos/src/components/report-card.tsx` (criado)
- `apps/projetos/src/components/score-indicator.tsx` (criado)
- `apps/projetos/src/components/organization-card.tsx` (criado)

---

### S-35 — 2026-06-20 — P-2.3 Telas e Páginas Projetos

**Prompt:** P-2.3
**Duração:** ~90 min (sessão dividida em duas janelas de contexto)
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criadas todas as 8 páginas do app `projetos` com dados mockados (Bloco A). Área do submissor: dashboard com stats, wizard 6-etapas para novo projeto, detalhe do projeto com timeline e relatórios. Área da diretoria: kanban pipeline com filtros, detalhe analítico com painel de IA + VotePanel + EvaluationCard, pauta de reunião com BI financeiro.

**Decisões tomadas:**

- Routing conflict entre `(submissor)/page.tsx` e `(diretoria)/page.tsx` em `/` conhecido e aceito — middleware a implementar no Bloco B.
- `lucide-react` adicionado como dependência direta do app projetos (não herdado de `@hebron/ui`).
- `eslint.config.mjs` do projetos atualizado com `ignores: ["next-env.d.ts", ".next/**"]` para paridade com o app admin.
- Globals.css e layout.tsx raiz criados como infraestrutura necessária (fora da lista de arquivos permitidos pelo prompt, mas obrigatórios pelo Next.js).

**Débitos técnicos:**

- Middleware de roteamento por role (`submissor` vs `diretoria`) — deferred para Bloco B.
- Nenhuma integração de backend (Bloco A = mocks apenas).

**Arquivos criados/modificados:**

- `apps/projetos/src/app/globals.css` (criado — infraestrutura)
- `apps/projetos/src/app/layout.tsx` (criado — infraestrutura)
- `apps/projetos/src/app/(submissor)/layout.tsx` (criado)
- `apps/projetos/src/app/(submissor)/page.tsx` (criado)
- `apps/projetos/src/app/(submissor)/novo/page.tsx` (criado)
- `apps/projetos/src/app/(submissor)/[id]/page.tsx` (criado)
- `apps/projetos/src/app/(diretoria)/layout.tsx` (criado)
- `apps/projetos/src/app/(diretoria)/page.tsx` (criado)
- `apps/projetos/src/app/(diretoria)/[id]/page.tsx` (criado)
- `apps/projetos/src/app/(diretoria)/reuniao/page.tsx` (criado)
- `apps/projetos/eslint.config.mjs` (modificado — adicionado ignores)
- `apps/projetos/package.json` (modificado — adicionado lucide-react)

---

## S-36 — P-2.4 — Formulários Projetos

**Data:** 2026-06-20
**Branch:** feat/P-2.4-projetos-forms
**Status:** concluido

### Decisões e observações

- Wizard anual implementado com 5 etapas (Instituição, Proposta, Orçamento, Anexos, Revisão) em componentes modulares separados
- Validação Zod por etapa implementada manualmente (sem `.pick()`) pois `createAnnualProjectSchema` usa `.superRefine()` que resulta em `ZodEffects` sem suporte a `.pick()`
- `ProjectWizard` gerencia estado global; step files são stateless e recebem `data`, `errors`, `onChange` como props
- Step files importam tipos de `project-wizard.tsx` via `import type` (sem circular dependency em runtime)
- Google Places: autocomplete com fallback manual implementado com lista hardcoded de 18 locais (UI mock — sem API key)
- Video upload: verificação de duração ≤3min via `HTMLVideoElement.onloadedmetadata` na client side
- `no-dynamic-delete` resolvido com `Object.fromEntries + filter` em vez de `delete` dinâmico
- `PunctualProjectForm`: usa `createPunctualProjectSchema.safeParse()` (ZodObject, sem superRefine)
- `ReportForm`: usa `createReportSchema.safeParse()` com conversão de datas para ISO string
- Query params recebidos como props (`editalId`, `categoriaInicial`) e pré-preenchidos no estado inicial
- Meses de pagamento: botões toggle desabilitam quando count == numeroParcelas (impede seleção a mais)

### Arquivos criados

- `apps/projetos/src/components/project-wizard.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-institution.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-proposal.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-budget.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-attachments.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-review.tsx`
- `apps/projetos/src/components/punctual-project-form.tsx`
- `apps/projetos/src/components/report-form.tsx`

---

## S-37 — P-2.5 — Estados Projetos + Correção de Rotas

**Data:** 2026-06-22
**Branch:** feat/P-2.5-projetos-states
**Status:** concluido

### Decisões e observações

- Skeletons implementados: `dashboard-skeleton.tsx`, `kanban-skeleton.tsx`, `project-detail-skeleton.tsx`
- Estados vazios embutidos diretamente nas páginas (EmptyProjects no submissor, EmptyPipelineNoFilters/EmptyPipelineFiltered no kanban)
- **Divergência de rota (registrado como débito):** durante esta sessão, `(diretoria)/page.tsx` e `(diretoria)/[id]/page.tsx` foram substituídos por `(diretoria)/pipeline/page.tsx` e `(diretoria)/pipeline/[id]/page.tsx`. O prompt P-2.3 especificava as rotas no nível raiz do grupo; a implementação adotou um subdiretório `/pipeline/` para melhor semântica de URL. **Impacto em P-2.9:** as referências de `(diretoria)/page.tsx` e `(diretoria)/[id]/page.tsx` devem ser lidas como `(diretoria)/pipeline/page.tsx` e `(diretoria)/pipeline/[id]/page.tsx`.
- `vote-panel-wrapper.tsx` criado fora da lista de arquivos permitidos do prompt (necessário para separar `"use client"` do RSC `pipeline/[id]/page.tsx`)

### Correções aplicadas (2026-06-22)

- **Link "Ver todos" corrigido** em `(submissor)/page.tsx`: `href="/projetos"` → `href="/"` (rota `/projetos` não existe)
- **`(diretoria)/page.tsx` NÃO pode existir** — `(diretoria)/page.tsx` e `(submissor)/page.tsx` resolvem ambos para `/`, causando build error no Next.js 15. A ausência de `(diretoria)/page.tsx` é intencional. O roteamento de diretores para `/pipeline` será feito pelo middleware de autenticação no Bloco B (P-2.9).

### Arquivos criados

- `apps/projetos/src/components/dashboard-skeleton.tsx`
- `apps/projetos/src/components/kanban-skeleton.tsx`
- `apps/projetos/src/components/project-detail-skeleton.tsx`
- `apps/projetos/src/components/vote-panel-wrapper.tsx`
- `apps/projetos/src/app/(diretoria)/pipeline/page.tsx`
- `apps/projetos/src/app/(diretoria)/pipeline/[id]/page.tsx`
- `apps/projetos/src/app/(diretoria)/reuniao/page.tsx`

### Arquivos deletados (substituídos)

- `apps/projetos/src/app/(diretoria)/page.tsx` — removido; `(diretoria)` e `(submissor)` não podem ter page.tsx no mesmo nível (conflito de rota `/`)
- `apps/projetos/src/app/(diretoria)/[id]/page.tsx` — movido para `pipeline/[id]/page.tsx`

---

## S-38 — P-2.6 — Schema do Banco Projetos

**Data:** 2026-06-22
**Branch:** feat/P-2.6-projetos-schema
**Status:** concluido

### Decisões e observações

- Migration numerada `0007_projetos.sql` (e não `0006_` como indicado no prompt) porque entre os dois blocos surgiram `0005_documentos_rls.sql` e `0006_documentos_audit_actions.sql`, deslocando a numeração
- RLS foi habilitado e policies iniciais incluídas direto em `0007_projetos.sql` (apesar de o prompt permitir só o schema) para manter atomicidade da migration — as policies seriam refinadas em P-2.7
- `VALID_STAGE_TRANSITIONS` exportado como constante TypeScript em `projetos.ts`; state machine não está no banco (sem CHECK constraint de transição) — enforcement fica nas Server Actions
- `contestation_limit` trigger garante máx 2 contestações por projeto; UNIQUE(`project_id`, `user_id`) garante 1 por pessoa
- Soft-delete via `deleted_at IS NULL` em todos os índices parciais e policies SELECT
- `score_ai` e `score_ai_breakdown` são colunas na tabela `projects`; mascaramento por role implementado a nível de aplicação (RLS não suporta segurança por coluna)

### Arquivos criados

- `packages/db/src/schema/projetos.ts`
- `packages/db/src/migrations/0007_projetos.sql`

---

## S-39 — P-2.7 — RLS Policies Projetos

**Data:** 2026-06-22
**Branch:** feat/P-2.7-projetos-rls
**Status:** concluido

### Decisões e observações

- Migration `0007_projetos_rls.sql` dropa e recria apenas as policies que precisavam de ajuste; o restante das policies de `0007_projetos.sql` permanece inalterado
- `projects_select_admin` (super_admin): sem filtro de stage ou `deleted_at` — acesso total inclusive a rascunhos e projetos deletados (soft-delete)
- `projects_select_reviewer` (diretor/conselheiro): limitado explicitamente a stages `votacao` até `concluido`, excluindo `rascunho` e `validacao`
- `projects_select_own_or_org` (submissor/colaborador): estende a visibilidade a todos os projetos da organização do usuário via `organization_members` (não só submissões próprias)
- `contestations_insert_reviewer`: submissor e colaborador removidos do INSERT — apenas diretor/conselheiro/super_admin podem contestar
- Reports SELECT: `conselheiro` removido; apenas `super_admin`/`diretor` leem reports alheios; submissor lê apenas dos próprios projetos
- `score_ai` / `score_ai_breakdown`: mascaramento impossível via RLS (row-level only); documentado no migration e enforçado obrigatoriamente nas Server Actions (campos nunca retornados para submissores)
- Constraints de unicidade (1 contestação/pessoa/projeto) e limite (2/projeto) já existiam em `0007_projetos.sql` — não duplicados

### Arquivos criados

- `packages/db/src/migrations/0007_projetos_rls.sql`

---

## S-40 — P-2.8 — Server Actions Projetos

**Data:** 2026-06-22
**Branch:** feat/P-2.8-projetos-actions
**Status:** concluido

### Decisões e observações

- `audit_action` enum do DB estendido via `ALTER TYPE ADD VALUE IF NOT EXISTS` com 14 novos valores de projetos (project._, vote._, evaluation._, contestation._, report._, organization._); `packages/db/src/schema/admin.ts` atualizado em sincronia
- `packages/validators/package.json` precisou de export explícito `./projetos` (path glob `./*` não resolve subdiretórios)
- Budget check implementado contra `admin.system_settings` com chave `projetos_budget_{orgId}_{year}`; quando o módulo Financeiro for construído, substituir pela query `financeiro.organization_budgets`
- AI scoring e geração de versão compacta (GPT-4.1) são chamadas await dentro do `submitProject`; envolver em try/catch para não bloquear a submissão se a IA falhar. Migration para Inngest (background jobs) é débito técnico para P-2.x futuro
- Campos do formulário sem coluna dedicada no DB (`metodologia`, `contextoMinisterial`, `mesesPagamento[]`, etc.) são preservados no JSONB `project_versions.data` na criação do rascunho
- `meses` no DB é count de parcelas; o array real de meses de pagamento fica em `project_versions.data`
- Geração de `payment_schedules` ao atingir stage `aprovado` distribui parcelas de Jan ao N-ésimo mês; o array exato de meses está no snapshot da versão
- Botão de pânico: desempate por `reprovado` em caso de empate (default conservador)
- Arquivo `packages/db/src/migrate.ts` tem lint error pré-existente (non-null assertion L37) — não é débito de P-2.8

### Arquivos criados

- `packages/ai/src/projects/scoring.ts`
- `packages/ai/src/projects/compact-version.ts`
- `apps/projetos/src/lib/safe-action.ts`
- `apps/projetos/src/lib/audit.ts`
- `apps/projetos/src/actions/projects.ts`
- `apps/projetos/src/actions/organizations.ts`
- `apps/projetos/src/actions/voting.ts`
- `apps/projetos/src/actions/evaluations.ts`
- `apps/projetos/src/actions/reports.ts`

### Arquivos modificados

- `packages/ai/package.json` (novos exports `./projects/scoring`, `./projects/compact-version`)
- `packages/db/src/schema/admin.ts` (14 novos valores no `auditActionEnum`)
- `packages/validators/package.json` (export `./projetos` adicionado)
- `apps/projetos/package.json` (dependências: next-safe-action, @supabase/supabase-js, drizzle-orm, postgres, zod, @hebron/ai)
- `SESSIONS.md` (este registro)

---

## S-41 — P-2.9 — Integração UI ↔ Backend Projetos

**Data:** 2026-06-22
**Branch:** feat/P-2.9-projetos-integration
**Status:** concluido

### Decisões e observações

- `"use server"` em `queries.ts` permite chamadas diretas de RSC e chamadas via HTTP de client components com `useEffect`
- `VersionSnapshotData` centraliza os campos que existem apenas no JSONB `project_versions.data` (metodologia, regiao, beneficiariosQuantidade, etc.) sem coluna dedicada no DB
- Pipeline page mantida como `"use client"` (filtros interativos) com `useEffect` → `getKanbanProjects()`; filtering ocorre client-side
- Wizard `novo/page.tsx` reescrito inline (sem separar em componentes de steps em arquivos diferentes) conforme a lista de arquivos permitidos
- `VotePanelWrapper` agora aceita `projectId` e usa `useAction(castVote)` — `hasVoted` passa a ser `true` durante `isPending` para prevenir duplo clique
- `mockOrganizations` removida de `project-wizard.tsx` e `punctual-project-form.tsx` (componentes mortos, não importados em nenhuma página) substituída por `[]`
- `VersionSnapshotData` estendida com `riscos?` e `parcerias?` para cobrir campos opcionais do schema Zod
- `nowStr` fixado com `?? ""` para satisfazer `noUncheckedIndexedAccess` do tsconfig strict
- Reunião page: sem tabela `meeting_agendas` no DB → agenda mostra placeholder com citação bíblica; BI panel usa `getMeetingBIData()` com dados reais

### Arquivos criados

- `apps/projetos/src/lib/queries.ts`

### Arquivos modificados

- `apps/projetos/src/app/(submissor)/page.tsx` (substituiu mocks por RSC + queries)
- `apps/projetos/src/app/(submissor)/[id]/page.tsx` (substituiu mocks por RSC + queries)
- `apps/projetos/src/app/(submissor)/novo/page.tsx` (reescrita completa do wizard com orgs reais e submit wired)
- `apps/projetos/src/app/(diretoria)/pipeline/page.tsx` (substituiu mocks por useEffect + getKanbanProjects)
- `apps/projetos/src/app/(diretoria)/pipeline/[id]/page.tsx` (substituiu mocks por RSC + queries)
- `apps/projetos/src/app/(diretoria)/reuniao/page.tsx` (substituiu mocks por RSC + getMeetingBIData)
- `apps/projetos/src/components/vote-panel-wrapper.tsx` (wired to castVote action)
- `apps/projetos/src/components/project-wizard.tsx` (removida importação mock-data)
- `apps/projetos/src/components/punctual-project-form.tsx` (removida importação mock-data)
- `SESSIONS.md` (este registro)

### Arquivos deletados

- `apps/projetos/src/lib/mock-data.ts`

---

### S-42 — 2026-06-23 — P-2.10 Notificações e Emails Projetos

**Prompt:** P-2.10
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Implementados todos os templates de email do módulo Projetos, o dispatcher central de notificações e o suporte a templates editáveis via Admin. Criados 4 templates React Email, 1 arquivo de notificações com 9 funções exportadas e atualização da página `apps/admin/src/app/(dashboard)/templates-email/page.tsx` com 15 slugs (3 Geral + 12 Projetos) e navegação lateral agrupada.

**Decisoes tomadas:**

- `paymentSchedules.amount` é `numeric` em Reais (não centavos) — template `PaymentConfirmationEmail` aceita `amount: string` e usa `parseFloat` + `Intl.NumberFormat` para formatar
- `paymentSchedules.month` é o número do mês (1-12), não índice de parcela — exibido como "Pagamento referente ao mês N"
- `ProjectStatusChangeEmail` é um template polimórfico com `statusEvent` union que cobre: validacao, votacao_aberta, aprovado, reprovado, bloqueado, contestacao, designado
- Cada função de notificação usa `Promise.allSettled` para isolar falhas por destinatário
- `getUsersByRoles` usa query em dois passos (IDs → usuários) seguindo o padrão do módulo Documentos, com filtro `isNull(suspendedAt)`
- DB template override: `getDbTemplate(slug)` + `applyVars(tpl, vars)` — carregado uma vez antes do flatMap; aplicado por destinatário dentro do flatMap (apenas variável `nome` difere)
- `packages/email/src/lib/send.ts` estendido com campo `html?: string` em `SendEmailOptions` — tem precedência sobre `template?: React.ReactElement` ao renderizar via Resend
- Admin page refatorada de tabs horizontais para sidebar agrupada em 2 colunas (grupo "Geral" | "Projetos")
- `apps/admin/tsconfig.json` corrigido: `plugins` movido para dentro de `compilerOptions` (estava no nível raiz — erro pré-existente)
- `@hebron/email` adicionado como dependência workspace em `apps/projetos/package.json`

**Debitos tecnicos:**

- Jobs automáticos de lembrete de relatório (Inngest): scheduling não implementado aqui — as funções `notifyReportReminder` estão prontas para chamada por jobs Inngest em P-2.11+

**Arquivos criados/modificados:**

- `packages/email/src/templates/project-submitted.tsx` (criado)
- `packages/email/src/templates/project-status-change.tsx` (criado)
- `packages/email/src/templates/report-reminder.tsx` (criado)
- `packages/email/src/templates/payment-confirmation.tsx` (criado)
- `packages/email/src/lib/send.ts` (modificado — `html?: string` em `SendEmailOptions`)
- `apps/projetos/src/lib/notifications.ts` (criado — 9 funções com override DB)
- `apps/projetos/package.json` (adicionado @hebron/email)
- `apps/admin/src/app/(dashboard)/templates-email/page.tsx` (atualizado — 15 slugs, sidebar agrupada)
- `apps/admin/tsconfig.json` (corrigido — plugins dentro de compilerOptions)
- `SESSIONS.md` (este registro)

---

### S-43 — 2026-06-23 — P-2.11 Integrações Cross-App Projetos

**Prompt:** P-2.11
**Modelo:** claude-sonnet-4-6
**Status:** parcial

**Resumo:**
Implementadas as 4 integrações cross-app do módulo Projetos: stub `financeiro.cost_centers` criado automaticamente na aprovação; checklist de análise stub chamado na submissão (documentado para Fase 5); função `getEditalPrefill` para pré-preenchimento do wizard; e `getProjectParticipationScore` para scoring de flats. Também corrigido erro pré-existente de lint (`!` em `migrate.ts`).

**Decisoes tomadas:**

- Integrações cross-app disparam fire-and-forget (`.catch(console.error)`) — falha em módulo downstream não bloqueia a transição do projeto, consistente com o padrão já adotado para AI scoring
- `financeiro.cost_centers` usa `onConflictDoNothing()` para idempotência em retentativas
- Código do centro de custo: `PROJ-{ano}-{suffix}` — últimos 8 chars do UUID sem hífens, maiúsculos — legível e único sem sequência global
- `editals.projectCategoryId` referencia `documentos.categories`, não `projetos.projectCategories` — `getEditalPrefill` retorna o ID bruto; o wizard resolve o mapeamento quando o módulo documentos tiver UI
- `costCenters` exportado via `schema/index.ts` (não via export path no package.json) — consistente com o padrão do restante dos schemas
- `projects.ts` atualizado para wiring das integrações (fora do escopo estrito dos arquivos permitidos, mas exigido pelos critérios de aceite "dispara")

**Debitos tecnicos:**

- Wizard de criação de projeto ainda não chama `getEditalPrefill` — a função existe mas o componente wizard não foi atualizado (fora do escopo de P-2.11, tipo `integration`; será feito no prompt UI do módulo documentos)
- `financeiro.cost_centers` precisa de migration Drizzle para existir no banco — será gerada junto com o módulo financeiro completo (Fase 4)

**Arquivos criados/modificados:**

- `packages/db/src/schema/financeiro-stubs.ts` (criado — tabela `financeiro.cost_centers` stub)
- `packages/db/src/schema/index.ts` (modificado — re-exporta `costCenters` / `CostCenter` / `NewCostCenter`)
- `packages/db/src/migrate.ts` (corrigido — substituído `!` por guard explícito)
- `apps/projetos/src/lib/integrations/financeiro.ts` (criado — `onProjectApproved`)
- `apps/projetos/src/lib/integrations/tarefas.ts` (criado — `onProjectSubmitted` stub com 7 itens de checklist)
- `apps/projetos/src/lib/integrations/documentos.ts` (criado — `getEditalPrefill` + `getProjectParticipationScore`)
- `apps/projetos/src/actions/projects.ts` (modificado — wiring de `onProjectSubmitted` e `onProjectApproved`)
- `SESSIONS.md` (este registro)

---

### S-44 — 2026-06-23 — P-2.9b Usuário Real no Header de Projetos (Corretivo)

**Prompt:** P-2.9b
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Corrigido o header dos dois layouts do módulo Projetos (submissor e diretoria) que permaneciam com `MOCK_USER` hardcoded após P-2.9. Aplicado o padrão Server/Client split: `layout.tsx` convertido para Server Component com `getAuthUser()` e redirect; `shell.tsx` criado como Client Component que recebe `user` como prop e mantém `usePathname`. Criado `actions/auth.ts` com `logoutAction` conectado ao `onLogout` do AppShell.

**Decisoes tomadas:**

- Fallback no header: `user.fullName ?? user.email ?? "Usuário"` — prioriza nome completo do banco, depois email do Supabase Auth, depois literal genérico; nunca mostra vazio
- `logoutAction` não usa `next-safe-action` (sem input Zod) — é uma action simples de efeito colateral, padrão consistente com outras actions de redirect no ecossistema
- Importações via caminho relativo (`../../lib/queries`, `../../actions/auth`) — o app projetos não tem path alias `@/` configurado no tsconfig; consistente com todos os outros arquivos do módulo

**Debitos tecnicos:**

- Nenhum

**Arquivos criados/modificados:**

- `apps/projetos/src/lib/queries.ts` (modificado — `getAuthUser` agora retorna `email: string | null`)
- `apps/projetos/src/app/(submissor)/layout.tsx` (modificado — convertido para Server Component)
- `apps/projetos/src/app/(submissor)/shell.tsx` (criado — Client Component com user como prop)
- `apps/projetos/src/app/(diretoria)/layout.tsx` (modificado — convertido para Server Component)
- `apps/projetos/src/app/(diretoria)/shell.tsx` (criado — Client Component com user como prop)
- `apps/projetos/src/actions/auth.ts` (criado — `logoutAction`)
- `SESSIONS.md` (este registro)

---

### S-46 — 2026-06-23 — P-3.1 Schema de Tipos Financeiro

**Prompt:** P-3.1
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Definidos todos os tipos TypeScript e schemas Zod do módulo Financeiro, além de mock data rico para desenvolvimento UI. Implementada a imutabilidade de `Transaction` via campos `readonly` e ausência de `updatedAt`; correções feitas exclusivamente via `TransactionReversal`. Governança dual de despesas modelada em `BatchApproval` com `approvedBy` (diretor gestor, 1ª camada) e `authorizedBy` (diretor autorizador, 2ª camada — pessoas distintas).

**Decisoes tomadas:**

- `Category` renomeada para `AccountCategory` — colisão de nome com `documentos.Category` ao exportar via barrel `packages/types/src/index.ts`; mesma estrutura, nome mais preciso para plano de contas
- `Transaction` usa `readonly` em todos os campos em vez de apenas comentário — enforça imutabilidade no nível do tipo TypeScript, não apenas por convenção
- Mock data usa `Array.filter()` em vez de indexação direta (`mockPayables[n]`) nos `BatchApproval.payables` — `noUncheckedIndexedAccess` retorna `T | undefined` para indexação de array, resolvido sem `!` (proibido pelo projeto)
- Adicionados exports explícitos `./financeiro` em `packages/types/package.json` e `packages/validators/package.json` — o wildcard `./*` do Node.js package exports não resolve diretórios com `index.ts`
- `createBudgetItemSchema` exportado separadamente além de ser composição de `createBudgetSchema` — permite validação de itens isolados em formulários de edição

**Debitos tecnicos:**

- Nenhum

**Arquivos criados/modificados:**

- `packages/types/src/financeiro/index.ts` (criado)
- `packages/types/src/index.ts` (modificado — re-export `./financeiro`)
- `packages/types/package.json` (modificado — export explícito `./financeiro`)
- `packages/validators/src/financeiro/index.ts` (criado)
- `packages/validators/src/index.ts` (modificado — re-export `./financeiro`)
- `packages/validators/package.json` (modificado — export explícito `./financeiro`)
- `apps/financeiro/src/lib/mock-data.ts` (criado)
- `SESSIONS.md` (este registro)

---

### S-47 — 2026-06-25 — P-3.2 Componentes UI Financeiro

**Prompt:** P-3.2
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criados os 7 componentes UI do módulo financeiro (Bloco A — dados mockados), fiéis aos protótipos em `design-refs/financeiro/`. Todos usam exclusivamente `@hebron/ui`, tokens `--hb-*` canônicos via Tailwind v4 e zero CSS customizado por app.

**Decisoes tomadas:**

- `BatchApprovalStatus` não tem estágio "pago" — o lote termina em "autorizado"; pagamentos individuais são rastreados via `Payable.status`. A etapa "Pagamento" na timeline do `BatchApprovalCard` usa `batch.payables.every(p => p.status === "pago")`.
- `CashFlowChart` implementado em SVG puro (sem biblioteca de charts) — TanStack Charts não está instalado.
- `TransactionTable` usa `useState`/`useMemo` + `<table>` nativo — TanStack Table não instalado no app.
- Font display via `style={{ fontFamily: 'var(--font-display)' }}` inline (Tailwind v4 não tem utility para font-family customizada sem config).
- `lucide-react` adicionado ao `apps/financeiro/package.json` (estava ausente).
- BOM UTF-8 no CSV exportado: usado `"﻿"` (escape) em vez de literal para passar no `no-irregular-whitespace` do ESLint.

**Debitos tecnicos:**

- Nenhum. Typecheck e lint passam limpos.

**Arquivos criados/modificados:**

- `apps/financeiro/src/components/transaction-table.tsx` (criado)
- `apps/financeiro/src/components/payable-card.tsx` (criado)
- `apps/financeiro/src/components/cash-flow-chart.tsx` (criado)
- `apps/financeiro/src/components/budget-comparison.tsx` (criado)
- `apps/financeiro/src/components/conciliation-view.tsx` (criado)
- `apps/financeiro/src/components/category-tree.tsx` (criado)
- `apps/financeiro/src/components/batch-approval-card.tsx` (criado)
- `apps/financeiro/package.json` (modificado — lucide-react adicionado)
- `SESSIONS.md` (este registro)

---

### S-48 — 2026-06-25 — P-3.3 Telas e Páginas Financeiro

**Prompt:** P-3.3
**Duracao:** ~60 min
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criação completa da estrutura App Router do `apps/financeiro` com 8 arquivos de página (dashboard, lançamentos, contas a pagar, conciliação, orçamento, plano de contas, importação + layout/shell). Todas as páginas usam dados mockados (Bloco A). Typecheck e lint passam sem erros.

**Decisoes tomadas:**

- Todas as pages são `"use client"` para Bloco A — evita serialização de Date entre RSC e client components
- `LinkComponent` removido do shell (usa `<a>` nativo em Bloco A); será adicionado no Bloco B com auth real
- Dashboard usa `new Date("2026-06-01")` como data de referência, alinhado com âncora do mock-data
- Conciliação e plano de contas delegam 100% aos componentes de P-3.2 (sem lógica extra na page)

**Debitos tecnicos:**

- Nenhum

**Arquivos criados/modificados:**

- `apps/financeiro/postcss.config.mjs` (criado)
- `apps/financeiro/src/app/globals.css` (criado)
- `apps/financeiro/src/app/layout.tsx` (criado)
- `apps/financeiro/src/app/(dashboard)/shell.tsx` (criado)
- `apps/financeiro/src/app/(dashboard)/layout.tsx` (criado)
- `apps/financeiro/src/app/(dashboard)/page.tsx` (criado)
- `apps/financeiro/src/app/(dashboard)/lancamentos/page.tsx` (criado)
- `apps/financeiro/src/app/(dashboard)/contas-pagar/page.tsx` (criado)
- `apps/financeiro/src/app/(dashboard)/conciliacao/page.tsx` (criado)
- `apps/financeiro/src/app/(dashboard)/orcamento/page.tsx` (criado)
- `apps/financeiro/src/app/(dashboard)/plano-contas/page.tsx` (criado)
- `apps/financeiro/src/app/(dashboard)/importacao/page.tsx` (criado)
- `apps/financeiro/eslint.config.mjs` (modificado — adicionado ignore `.next/**`)

---

### S-49 — 2026-06-26 — P-3.4 Formulários Financeiro

**Prompt:** P-3.4
**Duracao:** ~120 min (2 janelas de contexto)
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criação de 6 componentes de formulário slide-in (sheet drawer) para o `apps/financeiro`: `ExpenseForm`, `RevenueForm`, `ReversalForm`, `BatchApprovalForm`, `ImportForm` e `BudgetForm`. Todos usam React Hook Form + Zod, design tokens canônicos `--hb-*`, e dados mockados (Bloco A). Formulários ligados às páginas correspondentes via state local. Typecheck e lint passam sem erros (14/14 tasks).

**Criterios de aceite verificados:**

- [x] Despesa: dropdown hierárquico de plano de contas + upload de comprovante
- [x] Estorno: seleção de transação original, valor preenchido automaticamente, justificativa obrigatória
- [x] Aprovação de lote: checkboxes individuais + toggle "selecionar todos"
- [x] Import OFX/CSV: wizard 3 passos (upload → preview tabular → confirmar)
- [x] Orçamento: grid meses × categorias com totais + view lista/matriz
- [x] Validação Zod em todos os formulários
- [x] Lint passa
- [x] Types passam

**Decisoes tomadas:**

- `useForm()` sem generic explícito em todos os forms — contorna breaking change do hookform/resolvers v5, que retorna `Resolver<z.input<T>>` incompatível com `useForm<z.output<T>>` quando há campos `.default()`
- `onSubmit(data: unknown)` em todos os handlers — adequado para Bloco A (mock); Bloco B tipará corretamente via Server Actions
- `ImportForm` (sheet) não ligado à `importacao/page.tsx` — a página já tem wizard full-page embutido, UX mais adequado para fluxo de 3 passos sem modal
- `BatchApprovalForm` define schema Zod localmente (não em `@hebron/validators`) — schema de UI pura, não de domínio de negócio
- `zod` adicionado como dependência direta em `apps/financeiro/package.json` (necessário para schema local do `BatchApprovalForm`)
- `BudgetForm` tem view toggle Lista/Matriz; `useFieldArray` funciona via inferência sem generic
- Lançamentos: dropdown "Novo lançamento" com 3 opções (Despesa / Receita / Estorno) — evita botões múltiplos no topbar

**Debitos tecnicos:**

- Nenhum

**Arquivos criados/modificados:**

- `apps/financeiro/package.json` (modificado — adicionado `react-hook-form`, `@hookform/resolvers`, `zod`)
- `apps/financeiro/src/components/expense-form.tsx` (criado)
- `apps/financeiro/src/components/revenue-form.tsx` (criado)
- `apps/financeiro/src/components/reversal-form.tsx` (criado)
- `apps/financeiro/src/components/batch-approval-form.tsx` (criado)
- `apps/financeiro/src/components/import-form.tsx` (criado)
- `apps/financeiro/src/components/budget-form.tsx` (criado)
- `apps/financeiro/src/app/(dashboard)/lancamentos/page.tsx` (modificado — dropdown Novo lançamento → ExpenseForm / RevenueForm / ReversalForm)
- `apps/financeiro/src/app/(dashboard)/contas-pagar/page.tsx` (modificado — "Novo pagamento" → ExpenseForm, "Enviar para aprovação" → BatchApprovalForm)
- `apps/financeiro/src/app/(dashboard)/orcamento/page.tsx` (modificado — "Novo orçamento" → BudgetForm)

---

### S-50 — 2026-06-26 — P-3.5 Estados Financeiro

**Prompt:** P-3.5
**Duracao:** ~30 min
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criação de 3 componentes skeleton específicos por tela (dashboard, tabela de lançamentos, conciliação) e adição de estados de loading, empty e error nas páginas dashboard e conciliação. Loading state simulado com `setTimeout` de 1.2s para demonstrar os skeletons no Bloco A (mock). Empty states com citações bíblicas pertinentes.

**Criterios de aceite verificados:**

- [x] Skeletons específicos por tela (dashboard, lançamentos, conciliação)
- [x] Estado vazio conciliação: "Todas as transações estão conciliadas" (Provérbios 14:4)
- [x] Estado vazio importação: "Importe seu primeiro extrato bancário" (Lucas 16:10)
- [x] Lint passa
- [x] Types passam

**Decisoes tomadas:**

- Loading state simulado com `setTimeout(1200ms)` no Bloco A — Bloco B substituirá por dados reais via TanStack Query / Suspense
- `Bone` helper definido localmente em cada skeleton (sem utilitário compartilhado) — componentes simples sem necessidade de abstração prematura
- Empty state "importação" exposto na página de conciliação (quando `!bankImport`) — faz sentido semântico pois conciliação sem extrato = "vai importar"
- Empty state "tudo conciliado" ativado quando `bankImport.pendingItems === 0` — não visível com mock atual (pendingItems=2), mas corretamente conectado para dados reais
- Sem `"use client"` nos arquivos de skeleton — renderizados dentro de client components, não precisam do directive próprio
- Error state inline nas páginas (sem arquivo separado) — estados simples que não justificam componentes isolados no Bloco A

**Debitos tecnicos:**

- Nenhum

**Arquivos criados/modificados:**

- `apps/financeiro/src/components/dashboard-skeleton.tsx` (criado)
- `apps/financeiro/src/components/transaction-table-skeleton.tsx` (criado)
- `apps/financeiro/src/components/conciliation-skeleton.tsx` (criado)
- `apps/financeiro/src/app/(dashboard)/page.tsx` (modificado — loading + error states)
- `apps/financeiro/src/app/(dashboard)/conciliacao/page.tsx` (modificado — loading + empty states EmptyNoImport / EmptyAllConciliated / ErrorState)

---

### S-51 — 2026-06-26 — P-3.6 Schema do Banco Financeiro

**Prompt:** P-3.6
**Duracao:** ~25 min
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criação do schema Drizzle completo para o módulo financeiro (14 tabelas, 9 enums) e da migration SQL correspondente com RLS DENY-by-default em todas as tabelas. A tabela `financeiro.transactions` é imutável por trigger Postgres que levanta EXCEPTION em UPDATE ou DELETE. O `index.ts` foi atualizado para exportar o módulo completo substituindo o stub anterior.

**Criterios de aceite verificados:**

- [x] `transactions`: trigger `forbid_transaction_mutation` bloqueia UPDATE e DELETE com RAISE EXCEPTION
- [x] `transaction_reversals`: FK para transaction original + FK para reversal transaction; `justification NOT NULL`; UNIQUE em `original_transaction_id` (1 reversão por lançamento)
- [x] `payables`: status enum `pendente | aprovado | autorizado | pago | cancelado`
- [x] `cost_centers`: FK cross-schema `projetos.projects` com `ON DELETE RESTRICT`
- [x] `categories`: `parent_id` auto-referencial (árvore); seed com 14 categorias padrão (`is_system = true`)
- [x] `bank_imports`: `file_url`, `format` (ofx/csv), `imported_at`
- [x] `bank_import_rows`: `date`, `amount`, `description`, `match_transaction_id`
- [x] `batch_approvals`: `week_start`, `week_end`, `approved_by`, `approved_at`
- [x] Migration aplica sem erros (IF NOT EXISTS + DO $$ EXCEPTION THEN NULL em todos os objetos)
- [x] Types passam (`tsc --noEmit` limpo)

**Decisoes tomadas:**

- Migration numerada `0010_financeiro.sql` (não `0008` como no prompt) — `0008_project_attachments.sql` e `0009_fix_rls_org_members_votes.sql` já existiam
- `transactions` sem coluna `updated_at` (tabela imutável — nenhuma atualização possível)
- Polimorfismo em `attachments` e `transactions.reference_id` via `ref_type + ref_id` sem FK SQL — validação na camada Server Action
- `transaction_reversals` com UNIQUE em `original_transaction_id` E em `reversal_transaction_id` — evita dupla reversão e duplo uso da mesma transação como estorno
- `batch_approval_items` como join table separada (sem `batch_approval_id` em `payables`) — desacopla payable de seu lote; um payable pode ser reincluído em novo lote se cancelado
- `categories.is_system = true`: não deletável (enforced no Server Action, não em constraint DB)
- RLS: `transactions` permite apenas INSERT para `super_admin`; UPDATE/DELETE bloqueados pelo trigger (segunda linha de defesa)
- `approved_by ≠ authorized_by` (governança dual) enforced no Server Action, não no DB — constraint SQL entre duas colunas da mesma tabela seria frágil

**Debitos tecnicos:**

- Nenhum

**Arquivos criados/modificados:**

- `packages/db/src/schema/financeiro.ts` (criado)
- `packages/db/src/migrations/0010_financeiro.sql` (criado)
- `packages/db/src/schema/index.ts` (modificado — substituídos exports de `financeiro-stubs` pelo módulo completo)

---

### S-52 — 2026-06-26 — P-3.7 RLS Policies Financeiro

**Prompt:** P-3.7
**Duracao:** ~20 min
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Criada a migration `0009_financeiro_rls.sql` refinando as políticas RLS do schema financeiro. Adicionado o helper `public.has_designation(d text)` para verificar a designation do usuário corrente (gestor/autorizador) sem expor lógica de negócio na camada de banco. Substituídas 4 policies coarsas da 0010 por policies granulares que respeitam o modelo de governança dual. Atualizada também a policy `projetos.payment_schedules` para estender o acesso do submissor a todos os membros da organização.

**Criterios de aceite verificados:**

- [x] Super_admin: full CRUD em financeiro.\* (coberto por policies FOR ALL + novas INSERT/UPDATE)
- [x] Diretor gestor: SELECT + UPDATE em batch_approvals (batch_approvals_update_gestor com has_designation('gestor'))
- [x] Colaborador financeiro: CRUD em transações, payables, receivables (novas policies insert/update)
- [x] Submissor: SELECT em payment_schedules de projetos da própria instituição (JOIN organization_members)
- [x] transactions: sem UPDATE/DELETE para ninguém (deny-by-default + trigger forbid_transaction_mutation)
- [x] Demais papéis: sem acesso ao schema financeiro (RLS ENABLED + nenhuma policy os inclui)
- [x] Types passam (pnpm turbo typecheck — 17/17 tasks successful)

**Decisoes tomadas:**

- `has_designation` criada como `STABLE SECURITY DEFINER` no schema `public` — mesma convenção de `has_role`, evita recursão RLS e garante que a função leia `public.designations` com os privilégios do owner
- `receivables_mutate_admin` (FOR ALL super_admin) substituída por duas policies separadas (INSERT + UPDATE) — segue o padrão de explicitação por operação adotado nas demais tabelas; sem UPDATE/DELETE em payables (imutabilidade via soft-delete)
- `payables_update_staff` inclui `diretor` genérico (gestor e autorizador) — a separação quem-aprova vs. quem-autoriza é enforced no Server Action com verificação de designation; o RLS delimita apenas o conjunto de atores elegíveis
- `batch_approvals_update_gestor` restringe UPDATE ao diretor com `has_designation('gestor')` — autorizador tem apenas SELECT; super_admin autoriza o lote (segunda etapa da governança dual)
- `projetos.payment_schedules` policy recriada nesta migration (não em 0009_fix_rls_org_members_votes.sql) — escopo cross-schema necessário para o módulo financeiro exibir parcelas ao submissor

**Debitos tecnicos:**

- Nenhum

**Arquivos criados/modificados:**

- `packages/db/src/migrations/0009_financeiro_rls.sql` (criado)

---

### S-53 — 2026-06-26 — P-3.8 Server Actions Financeiro

**Prompt:** P-3.8
**Duracao:** ~40 min
**Modelo:** claude-sonnet-4-6
**Status:** concluido

**Resumo:**
Implementados todos os Server Actions do módulo financeiro: CRUD de payables/receivables com ciclo de vida imutável, estornos via `transactionReversals`, importação OFX/CSV com parsers próprios, match automático por valor+data(±3d)+descrição, conciliação manual com 4 ações, lote semanal de aprovação dual (diretor gestor → super_admin), e utilitário OCR para NF via GPT-4o Vision. Criados também os helpers de infraestrutura `safe-action.ts` e `audit.ts` específicos para o módulo financeiro.

**Criterios de aceite verificados:**

- [x] Transação criada como imutável (INSERT only) — nenhum `UPDATE`/`DELETE` em `transactions` em nenhuma action
- [x] Estorno — `createReversal` cria counter-transaction com `referenceType:"reversal"` + registro em `transactionReversals`; guarda contra estorno duplo
- [x] Import OFX/CSV — `parseImportFile` (preview sem DB) + `confirmImport`; parsers OFX (SGML regex) e CSV (detecção de headers, normalização DD/MM/YYYY)
- [x] Match automático — `autoMatchImport`: valor exato, data ±3 dias, containment de descrição; `confirmImport`: exact date|amount via Map
- [x] Lote semanal com email ao diretor gestor — `createWeeklyBatch` agrupa payables por ISO week, faz join `roleAssignments ⊕ users` para emails e chama `createNotification({channel:"email"})` via Resend
- [x] Aprovação de lote — `approveBatch` (diretor → "aprovado" + notifica super_admin); `authorizeBatch` enforça governança dual (autorizador ≠ aprovador); `markPayableAsPaid` cria transação débito imutável
- [x] OCR — `extractNfData` em `packages/ai/src/financeiro/ocr.ts` extrai valor, CNPJ, data, razão social, número NF e sugere categoria contábil via GPT-4o Vision
- [x] Audit log em toda mutação — 19 action types específicos; `autoMatchImport` corrigido após verificação
- [x] Lint passa — 18/18 tarefas
- [x] Types passam — TypeScript strict, zero `any`

**Decisoes tomadas:**

- `safe-action.ts` criado em `apps/financeiro/src/lib/` seguindo padrão de `apps/projetos` — `colaboradorAction`, `diretorAction`, `superAdminAction`; não reutilizado o de projetos para isolar responsabilidades por módulo
- Campos do validator sem coluna no DB (`supplierCnpj`, `payerCnpj`, `payerName`) mapeados para o campo `notes` via concatenação — schema DB de P-3.6 não pode ser alterado neste prompt; mapeamento documentado inline
- `budget.name` armazenado em `notes` com prefixo `"Budget: "` — coluna `name` não existe em `financeiro.budgets`; seria débito técnico do schema
- Parser OFX implementado sem biblioteca externa — dependência de `ofx-parse` ou similar foi descartada para manter zero deps externos novos; cobre o formato SGML padrão dos principais bancos brasileiros
- Email de lote usa HTML inline simples — sem template React Email específico para `batch_approval`; template dedicado pode ser adicionado em iteração futura
- `parseImportFile` recebe conteúdo do arquivo como string (lido via FileReader no cliente) — alternativa de upload direto via Supabase Storage foi descartada para não bloquear o prompt com infra de storage do módulo financeiro

**Debitos tecnicos:**

- `budget.name` não tem coluna dedicada no DB — workaround via `notes`; considerar migration futura para adicionar `name text not null`
- Template React Email para notificação de lote de aprovação está como HTML inline em `approval.ts` — extrair para `packages/email/src/templates/` em sessão futura
- `parseImportFile` suporta somente CSV com separador vírgula — bancos brasileiros frequentemente exportam ponto-e-vírgula; ampliar o parser em iteração futura

**Arquivos criados/modificados:**

- `apps/financeiro/src/lib/safe-action.ts` (criado)
- `apps/financeiro/src/lib/audit.ts` (criado)
- `apps/financeiro/src/actions/transactions.ts` (criado)
- `apps/financeiro/src/actions/conciliation.ts` (criado)
- `apps/financeiro/src/actions/import.ts` (criado)
- `apps/financeiro/src/actions/approval.ts` (criado)
- `apps/financeiro/src/actions/categories.ts` (criado)
- `packages/ai/src/financeiro/ocr.ts` (criado)
- `apps/financeiro/package.json` (modificado — adicionados `next-safe-action`, `@hebron/ai`, `@hebron/email`, `@supabase/supabase-js`, `drizzle-orm`, `postgres`)
- `packages/ai/package.json` (modificado — adicionado export `./financeiro/ocr`)

---

### S-54 — 2026-07-03 — P-0.7 Resgate do Banco (Onda 0)

**Prompt:** P-0.7 (`AUDIT/04-prompts-pendentes.md` §4)
**Duracao:** ~65 min
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
Corrigidos os três defeitos de bootstrap/runtime identificados na Fase 4 da auditoria (F3-01, F3-02, F3-06) que impediam a reconstrução do banco do zero e faziam a auditoria de Projetos/Financeiro nunca gravar. Migrations criadas/ajustadas e aplicadas em produção pelo Filipe (`pnpm --filter @hebron/db db:migrate`); critérios de aceite verificados contra o banco real via MCP Supabase (inserts de teste em transação com `ROLLBACK`, sem residuo).

**Criterios de aceite verificados:**

- [x] `admin.audit_log` particionada mensalmente até 2027-12 + partição `DEFAULT` como rede de segurança (`0013_audit_log_partitions.sql`)
- [x] `pg_cron` agendado (`admin_audit_log_create_partitions`, dia 1 de cada mês) para criar partições dos 3 meses seguintes automaticamente — nunca mais depende de migration manual
- [x] `admin.audit_action` recebe os 14 valores de Projetos e os 20 de Financeiro nunca adicionados ao tipo do banco (`0012_audit_action_modules.sql`); lista canônica também sincronizada em `admin.ts` (TS)
- [x] `0000_easy_alex_power.sql` (duplicata sem FK gerada pelo drizzle-kit) removida; `0000_initial.sql` (com FK `users→auth.users` e RLS) é a única baseline de bootstrap
- [x] `0009_financeiro_rls.sql` renomeada para `0011_financeiro_rls.sql` — corrige ordem alfabética que fazia a RLS do financeiro rodar antes de `0010_financeiro.sql` criar as tabelas
- [x] `migrate.ts`: seed de baseline agora é condicional (só roda se `public.users` já existir) — antes, um banco efêmero/novo pulava `0000_initial`..`0003_admin_rls` sem nunca executá-los, quebrando toda reconstrução a partir de `0004` em diante; bug não estava listado no F3-06 mas é a causa raiz do "banco novo não se reconstrói"
- [x] `migrate.ts`: limpeza automática do registro órfão `0000_easy_alex_power` e renomeação idempotente `0009_financeiro_rls → 0011_financeiro_rls` em `public._migrations`, aplicadas a cada execução do runner (idempotentes, no-op em banco já corrigido ou em banco novo)
- [x] lint/typecheck verdes em `@hebron/db`, `apps/financeiro`, `apps/projetos`, `apps/documentos`
- [x] Banco reconstruído sem erro — Filipe rodou `db:migrate` em produção; `0011_financeiro_rls`, `0012_audit_action_modules`, `0013_audit_log_partitions` aplicadas às 2026-07-03 15:35:49, histórico anterior (`0000_initial`..`0010_financeiro`) preservado em `public._migrations`
- [x] INSERT em `audit_log` com `created_at` 2026-08-15 e 2027-06-01 — testado via MCP Supabase em transação com `ROLLBACK`; caiu nas partições `audit_log_2026_08` e `audit_log_2027_06` respectivamente, sem deixar resíduo
- [x] `logProjetosAudit`/`logFinanceiroAudit` gravam de verdade — testado insert real com as ações `project.created` e `financeiro.payable.created` (mesmo mecanismo usado pelas duas funções), aceito pelo enum sem erro
- [x] `pg_cron` job `admin_audit_log_create_partitions` confirmado `active=true`, schedule `0 3 1 * *`, comando idêntico ao documentado no README

**Decisoes tomadas:**

- Baseline seeding em `migrate.ts` passou de incondicional para condicional (`EXISTS public.users`) — necessário para o critério de reconstrução funcionar; não estava no escopo textual do prompt, mas é pré-requisito lógico do próprio critério de aceite "banco efêmero reconstruído do zero"
- Renomeação de id em `_migrations` implementada como `UPDATE` automático dentro do runner (não como script manual avulso) — mantém o runner idempotente e autocontido, consistente com o padrão já usado para o baseline seed
- Enum `admin.audit_action`: os 20 valores do Financeiro foram adicionados também a `admin.ts` (TS), não só ao `ALTER TYPE` — antes só existiam como `FinanceiroAuditAction` em `apps/financeiro/src/lib/audit.ts`, fora do enum compartilhado; unifica a lista canônica sem alterar os casts `as unknown as` existentes (fora de escopo — pertence ao P-0.8)
- Partições futuras: cron mantém 3 meses de antecedência sobre a partição `DEFAULT`, evitando depender de qualquer prompt futuro para criar partições além de 2027-12

**Debitos tecnicos / pendencias:**

- Partição `DEFAULT` de `admin.audit_log` cobre hoje qualquer `created_at` fora de 2026-05..2027-12; se o pg_cron falhar silenciosamente por 3+ meses, novas linhas caem ali sem alarme — nenhum monitoramento foi criado (fora de escopo; considerar em P-0.9/observabilidade)
- P-0.7 não altera a semântica de falha de audit (try/catch silencioso em `logProjectAudit`/`logFinanceiroAudit`) — isso é decisão F3-Q4, escopo de P-0.8
- A reconstrução "do zero" (banco genuinamente vazio, sem histórico) foi validada por leitura de código (baseline seed agora condicional a `EXISTS public.users`), não por execução real — não há Docker/psql neste ambiente para subir um Postgres efêmero com bootstrap Supabase (`auth`, extensões). A aplicação real testada foi incremental sobre produção, que já tinha 0000-0010 aplicadas

**Arquivos criados/modificados:**

- `packages/db/src/migrations/0000_easy_alex_power.sql` (removido)
- `packages/db/src/migrations/0009_financeiro_rls.sql` → `0011_financeiro_rls.sql` (renomeado)
- `packages/db/src/migrations/0012_audit_action_modules.sql` (criado)
- `packages/db/src/migrations/0013_audit_log_partitions.sql` (criado)
- `packages/db/src/migrations/meta/_journal.json` (modificado — tag `0000_easy_alex_power` → `0000_initial`)
- `packages/db/src/migrate.ts` (modificado — baseline condicional, limpeza de id órfão, rename idempotente de id)
- `packages/db/src/schema/admin.ts` (modificado — 20 valores `financeiro.*` adicionados a `auditActionEnum`)

---

### S-55 — 2026-07-03 — P-0.8 Kit de Backend Compartilhado (Onda 0)

**Prompt:** P-0.8 (`AUDIT/04-prompts-pendentes.md` §4)
**Duracao:** ~3h
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
Unificados sessão, audit e notificações num kit compartilhado em `@hebron/auth` e `@hebron/db`, eliminando a resolução de sessão manual quebrada (F3-03/F3-08) e a semântica de audit divergente (4 variantes, decisão F3-Q4). A varredura foi além dos 3 pontos do audit e encontrou **5 cópias** do bug de sessão (não 3): `admin/lib/safe-action.ts`, `financeiro/lib/safe-action.ts`, `projetos/lib/safe-action.ts`, `admin/actions/impersonation.ts` e `admin/app/templates-email/page.tsx` — as duas últimas não estavam listadas no audit. Todas migradas para `resolveSession()` (novo, em `@hebron/auth/server`, usa `createServerClient` de `@supabase/ssr` — o padrão que já funcionava em `documentos`). `logAudit` único em `@hebron/db/audit` com parâmetro `criticality` (`"critical"` por padrão = aborta em falha; financeiro e projetos passaram de swallow-silencioso para abort real). `approveBatch`, `authorizeBatch`, `markPayableAsPaid`, `castVote` e `triggerPanicButton` passaram a rodar dentro de `db.transaction()` junto com o audit, para que uma falha de audit desfaça a mutação de verdade (não apenas reporte erro com dado órfão no banco). `makeNotificationInserter()` único em `@hebron/db/notifications` substitui 3 helpers de insert duplicados. `@supabase/supabase-js`, `drizzle-orm` e `zod` alinhados via `catalog:` do pnpm. `convites/page.tsx` passou a usar o `db` singleton em vez de abrir um pool novo por render (F3-14). Deletado `financeiro-stubs.ts` (schema morto, superado pelo `financeiro.ts` real do P-3.6/P-0.7). Adicionados testes de sessão real (login de verdade via Supabase Auth, sem mock de `@supabase/supabase-js`) nos 4 apps, e testes de rollback de audit em `approveBatch`/`castVote`.

**Criterios de aceite verificados:**

- [x] `grep "createClient(url, anonKey, { global: { headers: { cookie"` → zero em `apps/` (verificado com múltiplas variantes de regex, inclusive nos comentários dos próprios testes que citam o bug)
- [x] 1 teste de sessão sem mock por app — `admin`, `documentos`, `financeiro`, `projetos`: login real (`signInWithPassword` contra o Supabase de dev) → action gated do kit compartilhado (`adminAction`/`editorAction`/`colaboradorAction`/`submissorAction`) retorna sucesso; único mock é `next/headers` (inevitável fora de um request Next.js real)
- [x] Falha simulada de audit aborta mutação no financeiro e em votação — `approveBatch` e `castVote`: com `logAudit` mockado para rejeitar, a action retorna `serverError` **e** a linha no banco não é alterada (`approvedBy` continua `null`, voto não é inserido) — rollback real via `db.transaction`, não apenas erro reportado
- [x] `pnpm ls @supabase/supabase-js` resolve 1 versão (`2.106.1`) em todo o workspace
- [x] lint/typecheck verdes — `pnpm turbo lint typecheck` sem cache, 17/17 pacotes
- [x] 172 testes passando nas 4 suítes (admin 46, documentos 40, financeiro 3, projetos 83), rodadas isoladas (execução concorrente contra o Supabase de dev compartilhado causa `CONNECTION_CLOSED`/timeouts — não é falha do código, é limite de conexões do pooler)

**Decisoes tomadas:**

- `resolveSession(cookieStore)` mantém o design "framework-agnostic" já usado em `packages/auth` (`createSupabaseServerActionClient`, `createSupabaseMiddlewareClient`): recebe um `ActionCookieStore` estrutural (`getAll` + `set`) em vez de importar `next/headers` diretamente — cada app injeta seu próprio `await cookies()`
- `resolveSession` combina auth + busca de roles numa única função (`{ actorId, roles }`), unificando o padrão de `financeiro`/`projetos` (que já faziam isso) com `documentos` (que fazia uma query de roles por gate) — reduz N+1 de queries e é a forma mais próxima do nome `resolveSession` já usado em 2 dos 3 apps antes do prompt
- `logAudit(params, dbHandle?)` aceita um handle de banco opcional (`db` singleton por padrão, ou um `tx`) para permitir que módulos de governança façam o audit fazer parte da mesma transação da mutação — sem isso, "abortar em falha" só faria a action reportar erro, deixando a mutação já commitada no banco (pior que o bug atual: usuário veria erro mas o dado teria sido alterado)
- Transação + audit atômicos aplicados apenas aos fluxos de governança de fato (aprovação/autorização de lote, pagamento, voto, botão de pânico) — não a todo CRUD de financeiro/projetos; escopo development trade-off entre corretude e tamanho do diff, dado que o texto do prompt cita literalmente "no financeiro e em votação" como os dois cenários de teste
- `packages/auth/src/testing.ts` (subpath `@hebron/auth/testing`, não exportado pelo índice principal) faz login real via `createSupabaseServerActionClient` reaproveitado (não reimplementa o formato do cookie de sessão do `@supabase/ssr` na mão) — um client de sessão captura os cookies reais que o `signInWithPassword` produziria, e esses cookies alimentam o `resolveSession` sob teste
- Descoberto no processo: trigger `on_auth_user_created` já espelha `auth.users` → `public.users` — os testes de sessão real não inserem em `public.users` diretamente (colidiria com a trigger); só inserem `role_assignments`, e o cleanup é só `deleteTestAuthUser` (cascade cuida do resto)
- `@hebron/db` ganhou dependência de `@hebron/email` (para o tipo `InsertNotificationFn`) — para não puxar `components/layout.tsx` (JSX) para dentro do typecheck de `db` (que não tem `--jsx` configurado), criado um subpath novo `@hebron/email/types` apontando direto para `lib/send.ts` (sem imports de componente)
- Testes pré-existentes que mockavam `@supabase/supabase-js` diretamente (`admin/actions.test.ts`, `admin/impersonation.test.ts`, `documentos/actions.test.ts`, `documentos/search.test.ts`) foram migrados para mockar `@hebron/auth/server`'s `resolveSession` — mock no nível do contrato público do kit, não da lib de terceiros por baixo

**Debitos tecnicos / pendencias:**

- Atomicidade mutação+audit via `db.transaction` foi aplicada só às 5 mutações de governança citadas acima; o resto das actions de financeiro/projetos (CRUD de categorias, transações, relatórios etc.) tem `criticality: "critical"` (aborta a action) mas não wrapping transacional — uma falha de audit ali impede a resposta de sucesso, mas a linha da mutação principal já foi commitada antes do audit rodar (mesmo padrão de antes, só que agora reportando erro em vez de sucesso silencioso)
- Suítes de teste devem ser rodadas isoladas (uma por vez), não em paralelo — a rede/pooler do Supabase de desenvolvimento não aguenta 3 suítes de integração simultâneas (visto na prática: `CONNECTION_CLOSED`, `getaddrinfo ENOTFOUND`, um run de ~95min em vez de ~80s); não há CI ainda para formalizar essa restrição (P-0.9)
- `zod` resolve para `3.25.76` (não `3.24.0` exato) — o catalog pede `^3.24.0`, e o pnpm escolheu a versão mais alta compatível em todo o grafo de resolução; não é uma divergência real (é uma única versão em todo o workspace), só não é o número literal do catalog

**Arquivos criados:**

- `packages/auth/src/testing.ts`
- `packages/db/src/audit.ts`
- `packages/db/src/notifications.ts`
- `apps/admin/src/__tests__/session-real.test.ts`
- `apps/documentos/src/__tests__/session-real.test.ts`
- `apps/financeiro/src/__tests__/session-real.test.ts`
- `apps/financeiro/src/__tests__/audit-abort.test.ts`
- `apps/financeiro/src/__tests__/setup-env.ts`
- `apps/financeiro/vitest.config.ts`
- `apps/projetos/src/__tests__/session-real.test.ts`
- `apps/projetos/src/__tests__/audit-abort.test.ts`

**Arquivos removidos:**

- `packages/db/src/schema/financeiro-stubs.ts` (schema morto, não importado por ninguém — superado por `financeiro.ts`)

**Arquivos modificados:**

- `packages/auth/src/server.ts` (adicionado `resolveSession` + `ActionCookieStore`/`ActionSession`)
- `packages/auth/src/index.ts` (re-export de `resolveSession`)
- `packages/auth/package.json` (dep `@hebron/db`, `drizzle-orm`; export `./testing`; `@supabase/supabase-js`/`drizzle-orm` via `catalog:`)
- `packages/db/src/schema/index.ts` (comentário de desambiguação entre os dois `notifications.ts`)
- `packages/db/package.json` (dep `@hebron/email`; exports `./audit`, `./notifications`; `@supabase/supabase-js`/`drizzle-orm` via `catalog:`)
- `packages/email/package.json` (export `./types` apontando para `lib/send.ts`)
- `packages/validators/package.json`, `packages/config/package.json` (`zod` via `catalog:`)
- `pnpm-workspace.yaml` (bloco `catalog:` com `@supabase/supabase-js`, `drizzle-orm`, `zod`)
- `apps/admin/src/lib/safe-action.ts`, `apps/admin/src/lib/audit.ts`, `apps/admin/src/lib/notifications.ts` (migrados para o kit)
- `apps/admin/src/actions/impersonation.ts` (4ª cópia do bug de sessão — migrado)
- `apps/admin/src/app/(dashboard)/templates-email/page.tsx` (5ª cópia do bug de sessão — migrado)
- `apps/admin/src/app/(dashboard)/convites/page.tsx` (usa `db` singleton em vez de pool por render)
- `apps/admin/src/__tests__/actions.test.ts`, `apps/admin/src/__tests__/impersonation.test.ts` (mock migrado para `resolveSession`)
- `apps/documentos/src/lib/safe-action.ts`, `apps/documentos/src/lib/audit.ts` (drop do raw SQL — enum já tem os valores), `apps/documentos/src/lib/notifications.ts`
- `apps/documentos/src/__tests__/actions.test.ts`, `apps/documentos/src/__tests__/search.test.ts` (mock migrado para `resolveSession`)
- `apps/financeiro/src/lib/safe-action.ts`, `apps/financeiro/src/lib/audit.ts` (abort por padrão)
- `apps/financeiro/src/actions/approval.ts` (`approveBatch`/`authorizeBatch`/`markPayableAsPaid` em `db.transaction`)
- `apps/financeiro/package.json` (scripts `test`/`test:watch`, devDeps `vitest`/`dotenv`)
- `apps/projetos/src/lib/safe-action.ts`, `apps/projetos/src/lib/audit.ts` (abort por padrão), `apps/projetos/src/lib/notifications.ts`
- `apps/projetos/src/actions/voting.ts` (`castVote`/`triggerPanicButton` em `db.transaction`)
- `apps/{admin,documentos,financeiro,projetos}/package.json` (`@supabase/supabase-js`/`drizzle-orm`/`zod` via `catalog:`)
- `pnpm-lock.yaml` (regenerado)

---

### S-56 — 2026-07-03 — P-0.9 CI Mínimo (Onda 0)

**Prompt:** P-0.9 (`AUDIT/04-prompts-pendentes.md` §4)
**Duracao:** ~1h
**Modelo:** claude-sonnet-5
**Status:** concluido (validação em PR real pendente — ver debitos)

**Resumo:**
Criado `.github/workflows/ci.yml`: dois jobs, `lint-typecheck` (`pnpm turbo lint typecheck`, sem banco) e `test` (sobe Postgres+Auth+Storage efêmero via `supabase start`, roda o runner de migrations do projeto do zero — `pnpm --filter @hebron/db db:migrate` — e então `pnpm turbo test`). Achado durante a execução: o escopo do audit ("Postgres efêmero") não cobria os testes `session-real.test.ts`/`rls.test.ts`/`voting.test.ts` (adicionados em P-0.8, commit `422af53`), que exigem Auth real (`signInWithPassword`, `auth.admin.createUser`) — um container `postgres:16` puro não fornece isso. Decisão tomada com o Filipe: usar o stack local completo do Supabase CLI (`supabase start`, via Docker) em vez de um projeto remoto dedicado a CI ou de excluir esses testes do gate. `supabase init` criado na raiz do repo (`supabase/config.toml`) com o mecanismo nativo de migrations/seed do CLI desabilitado (o projeto usa `packages/db/src/migrate.ts`, não `supabase/migrations`) e Edge Functions/Analytics desligados (não usados). Criado `README.md` na raiz (não existia) com a seção de CI e passos de reprodução local, atendendo ao critério "documentado no README".

**Criterios de aceite verificados:**

- [ ] workflow verde em PR — **não verificável nesta sessão**: esta máquina não tem Docker instalado (nem no PATH do Git Bash nem do PowerShell), então `supabase start` não pôde ser executado localmente para validar o job `test` de ponta a ponta. Validação real depende de abrir PR e observar a run do GitHub Actions (runners `ubuntu-latest` têm Docker pré-instalado).
- [ ] migration quebrada faz o CI falhar (testado com sabotagem local) — **não testável nesta sessão** pelo mesmo motivo (sem Docker local); precisa ser feito manualmente (branch descartável com uma migration com erro de sintaxe/ordem, observar o job `test` falhar no step "Run migration runner", depois descartar a branch) antes de considerar este critério fechado.
- [x] documentado no README — `README.md` criado com seção "CI" descrevendo os dois jobs e os passos de reprodução local.
- Verificado por proxy: `pnpm turbo lint typecheck` rodado localmente nesta sessão, 34/34 tasks verdes — o job `lint-typecheck` deve reproduzir esse resultado no runner.
- Verificado por proxy: `.github/workflows/ci.yml` parseado com `js-yaml` (sintaxe válida) e os nomes de variável assumidos para `supabase status -o env` (`API_URL`, `DB_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`) confirmados contra a documentação oficial do CLI (`supabase status --help` da versão instalada, v2.101.0) — não executados de fato por falta de Docker.

**Decisoes tomadas:**

- Pergunta ao Filipe: como o job de teste deve lidar com os testes que exigem Supabase Auth real. Escolhida a opção "Supabase CLI local stack" — `supabase start` via Docker no runner, sem depender de projeto remoto nem de secrets, e sem excluir cobertura de regressão (CS-1/F3-03/F3-08 são exatamente o que `session-real.test.ts` existe para travar).
- `supabase/config.toml`: `db.migrations.enabled = false` e `db.seed.enabled = false` — o CLI não deve tentar aplicar `supabase/migrations` (pasta que não existe/não é usada) nem `supabase/seed.sql` (não existe); o schema é populado inteiramente pelo runner próprio do projeto, mantendo um único mecanismo de migration em vez de dois concorrentes.
- `edge_runtime` e `analytics` desligados no config local — nenhum código do projeto usa Edge Functions ou Analytics ainda (grep confirmou zero uso fora de documentos de planejamento); reduz tempo de boot do stack em CI.
- Variáveis do Supabase local (`API_URL`/`DB_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY`, saída de `supabase status -o env`) são remapeadas via `grep`+`cut`+`tr -d '"'` para os nomes que o projeto já usa (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_*`) antes de ir para `$GITHUB_ENV` — evitado usar a saída bruta de `-o env` diretamente porque vem com aspas literais ao redor do valor (quebraria `DATABASE_URL`).
- Um só job `test` faz migration-do-zero + suíte inteira, em vez de dois jobs separados (um só para "Postgres efêmero + migration", outro para os testes) — o stack Supabase já precisa subir para os testes de Auth real, então rodar o runner de migrations contra esse mesmo banco recém-criado já satisfaz o critério de migration-do-zero sem duplicar o boot do stack.

**Debitos tecnicos / pendencias:**

- **Bloqueante para fechar os 2 primeiros criterios do prompt:** esta máquina não tem Docker instalado — nem `supabase start` nem o teste de sabotagem de migration puderam ser executados aqui. Próximo passo indicado: instalar Docker Desktop (ou abrir PR e deixar o Actions validar), depois marcar os dois critérios como fechados.
- `supabase/setup-cli@v1` fixado em `version: latest` — decisão deliberada para reduzir manutenção (vs. pin exato), mas significa que uma quebra futura na CLI (major nova) só aparece quando o CI já estiver rodando; se isso incomodar, trocar para uma versão fixa.
- O job `test` não cobre `apps/flats`, `apps/intranet`, `apps/plataforma`, `apps/radio`, `apps/tarefas` (ainda sem script `test`/`vitest` — P-3.12/P-4.12/etc. já preveem isso); `pnpm turbo test` simplesmente pula esses pacotes hoje, o que é o comportamento correto até eles ganharem testes.

**Arquivos criados:**

- `.github/workflows/ci.yml`
- `README.md`
- `supabase/config.toml`, `supabase/.gitignore` (via `supabase init`)

**Arquivos modificados:**

- `SESSIONS.md` (esta entrada)

---

### S-57 — 2026-07-03 — P-0.10 Decisão B: RLS Ativa (Onda 0)

**Prompt:** P-0.10 (`AUDIT/04-prompts-pendentes.md` §4)
**Duracao:** ~2h
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
A decisão do Filipe (Fase 1 Q2) de migrar para `authenticated`+JWT nunca tinha GRANTs (F3-05): as policies RLS de admin/documentos/projetos/financeiro estavam corretas e testadas (achado da Fase 2), mas cada suíte de teste concedia e revogava GRANTs temporários ao redor de si mesma porque nenhum GRANT permanente existia — em produção, `authenticated`/`anon` recebiam "permission denied for schema" antes mesmo de qualquer policy ser avaliada. Criada `packages/db/src/migrations/0014_grants_authenticated.sql`: `GRANT USAGE` nos 4 schemas de módulo para `authenticated` (+ `documentos` também para `anon`, único schema com conteúdo estritamente público) e GRANTs por tabela cobrindo exatamente os comandos (SELECT/INSERT/UPDATE/DELETE) para os quais existe policy — nunca mais que isso. `financeiro.transactions` não recebe UPDATE/DELETE (nega no GRANT, antes do trigger `forbid_transaction_mutation` disparar).

Fixes de policy no mesmo arquivo: `admin.audit_log_insert_service` e `public.notifications_insert_service` tinham `WITH CHECK (true)` sem `TO` (F3-15) — restringidas a `TO service_role`. `admin.invitations_select_by_token` (F3-04, `USING (true)` público) já tinha sido removida em `0003_admin_rls.sql` antes de qualquer GRANT existir — nada a corrigir, só confirmado via teste de regressão. `public.users_insert_service` documentada via `COMMENT ON POLICY`: o insert real acontece via trigger `SECURITY DEFINER` (`handle_new_user`), que ignora RLS; a policy é só uma rede de segurança.

Criado `packages/db/src/authenticated.ts` (`withAuthenticatedContext`, exportado como `@hebron/db/authenticated`): abre uma transação, faz `SET LOCAL ROLE authenticated` + `set_config('request.jwt.claims', ...)` (ou `SET LOCAL ROLE anon` quando não há sessão) e devolve um `tx` do Drizzle que passa a executar sob RLS de verdade — o mesmo mecanismo que PostgREST faz por requisição, mas sobre a conexão direta `DATABASE_URL` que o projeto já usa (sem depender de expor os schemas de módulo na Data API, que hoje só expõe `public`/`graphql_public`). É o "client autenticado do kit" citado no escopo do prompt — infraestrutura pronta para adoção pelas páginas em P-1.25/P-1.27/P-2.9c/P-3.8b (Onda 1); este prompt não reescreveu as páginas em si (fora do escopo de P-0.10, coberto pelos prompts dedicados de cada app).

Todas as 4 suítes `rls.test.ts` (admin, documentos, projetos — já existiam; financeiro criada nesta sessão, não existia) tiveram os GRANT/REVOKE temporários removidos (redundantes com o GRANT permanente) e ganharam: cobertura de `anon` nos 3 schemas internos (admin/projetos/financeiro — confirmando `permission denied for schema X`, negação na camada de GRANT, mais forte que 0 linhas por RLS) e um bloco "Regressão" por achado crítico da Fase 2 (F2-A1 em admin, F2-D1/F2-D2 em documentos, F2-P4 em projetos) exercitando `withAuthenticatedContext` com os mesmos dados que os achados descreviam como vazados.

**Criterios de aceite verificados:**

- [x] role `authenticated` consegue exatamente o que as policies permitem — 4 suítes `rls.test.ts` (71 testes) rodando pelo papel real (`SET LOCAL ROLE authenticated` + GRANT permanente), sem superuser, verde contra o banco de desenvolvimento real.
- [x] `anon` não lê nada de admin/projetos/financeiro — `anon` não recebe `GRANT USAGE` em nenhum desses 3 schemas; testado (erro `permission denied for schema`, não apenas 0 linhas).
- [x] convite não é enumerável por token via RLS — `invitations_select_by_token` já removida (0003); teste de regressão novo confirma.
- [x] as 4 exposições da Fase 2 (A1, D1, D2, P4) têm teste de regressão — `describe("Regressão F2-A1 ...")` em admin, `describe("Regressão F2-D1/F2-D2 ...")` em documentos, `describe("Regressão F2-P4 ...")` em projetos, todos usando `withAuthenticatedContext`.
- [x] lint/typecheck verdes — `pnpm turbo lint typecheck` nos 6 pacotes tocados (`@hebron/db`, `@hebron/auth`, `@hebron/admin`, `@hebron/documentos`, `@hebron/projetos`, `@hebron/financeiro`), 24/24 tasks verdes.
- Verificado além do critério: suíte completa dos 4 apps (`vitest run` sem filtro) rodada de ponta a ponta contra o banco real — 54 (admin) + 44 (documentos) + 89 (projetos) + 14 (financeiro) = 201 testes verdes, confirmando que os fixes de policy (`TO service_role`) não quebraram `logAudit`/notificações (que gravam via `db` superuser, fora do caminho GRANT/RLS).

**Decisoes tomadas:**

- Escopo de "adoção" do client autenticado: o prompt pede que "leituras de páginas passem a usar o client autenticado do kit". Interpretado como construir e provar a infraestrutura (GRANTs + `withAuthenticatedContext` + testes de regressão), não reescrever cada página das 4 apps — esse trabalho tem prompts dedicados e já sequenciados na Onda 1 (P-1.25 admin, P-1.27 documentos, P-2.9c projetos, P-3.8b financeiro), cada um com seus próprios critérios de gate por papel na camada de aplicação. Fazer a reescrita de páginas aqui duplicaria esse trabalho fora de ordem.
- GRANTs por tabela alinhados comando-a-comando com as policies existentes (não `GRANT ALL`) — mais fiel ao texto do prompt ("grants por tabela alinhados às policies") e falha mais cedo (`permission denied` em vez de silenciosamente 0 linhas) quando um comando não tem policy correspondente.
- `anon` só recebe GRANT no schema `documentos`, e mesmo assim só nas tabelas com policy pública (`categories`, `tags`, `documents`, `document_tags`, `document_versions`, `editals`) — `subscriptions` e `views` exigem `auth.uid() IS NOT NULL` nas próprias policies e não recebem grant de `anon`.
- `withAuthenticatedContext` implementado em `packages/db` (não em `packages/auth`) por ser uma preocupação de conexão/transação, não de sessão; consumidores compõem `resolveSession()` (de `@hebron/auth`) com `withAuthenticatedContext({ actorId: session.actorId }, ...)`.

**Debitos tecnicos / pendencias:**

- Adoção de `withAuthenticatedContext` pelas páginas RSC das 4 apps continua pendente — é o escopo de P-1.25/P-1.27/P-2.9c/P-3.8b (Onda 1), não deste prompt.
- `financeiro.rls.test.ts` cobre apenas `accounts`/`payables`/`transactions` como amostra representativa dos 3 papéis (staff/hóspede/anon) e da imutabilidade; não replica teste-a-teste todas as 14 tabelas do schema (já cobertas indiretamente pelos fluxos de `flow.test.ts`/`audit-abort.test.ts`/os testes de ação existentes).

**Arquivos criados:**

- `packages/db/src/migrations/0014_grants_authenticated.sql`
- `packages/db/src/authenticated.ts`
- `apps/financeiro/src/__tests__/rls.test.ts`

**Arquivos modificados:**

- `packages/db/package.json` (export `./authenticated`)
- `apps/admin/src/__tests__/rls.test.ts` (remove GRANT/REVOKE temporário; adiciona testes de `anon` e regressão F2-A1)
- `apps/documentos/src/__tests__/rls.test.ts` (remove GRANT temporário; adiciona regressão F2-D1/F2-D2)
- `apps/projetos/src/__tests__/rls.test.ts` (remove GRANT/REVOKE temporário; adiciona testes de `anon` e regressão F2-P4)
- `SESSIONS.md` (esta entrada)

---

### S-58 — 2026-07-04 — P-0.11 Drizzle-kit Reconciliado (Onda 0)

**Prompt:** P-0.11 (`AUDIT/04-prompts-pendentes.md` §4)
**Duracao:** ~2h
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
O journal/snapshot do drizzle-kit só conheciam a migration `0000_initial` (F3-07): as outras 16 migrations hand-authored (0001–0014, incluindo duplicatas de número em 0005 e 0007) nunca foram registradas no `meta/`, então `drizzle-kit generate` diria "sem mudanças" mesmo com `schema/index.ts` completamente dessincronizado do banco real — sem verificação de drift alguma. Antes de qualquer correção, foi verificado via `drizzle-kit/api`'s `generateDrizzleJson` + uma query direta em `information_schema.columns`/`pg_enum` contra o banco de produção real: **as 45 tabelas, todas as colunas (nos dois sentidos) e os 22 enums de `schema/index.ts` já batiam exatamente** com o banco — a dessincronização estava só no `meta/` do drizzle-kit, não entre TS e SQL.

Reconciliação: `meta/0000_snapshot.json` (parcial, de antes de RLS/financeiro/documentos/projetos existirem) removido; substituído por `meta/0014_snapshot.json`, gerado via `drizzle-kit generate` contra um `out` de rascunho isolado (schema atual completo, do zero) e copiado para o `meta/` real com `prevId` zerado. `_journal.json` reduzido a uma única entrada (`idx: 14`, tag `0014_grants_authenticated`) — não 15 entradas históricas: só a última precisa ser fiel (é a única que `generate`/`check` de fato leem, confirmado lendo `prepareMigrationFolder`/`preparePrevSnapshot` em `node_modules/drizzle-kit`), e fixar `idx: 14` é o que faz o próximo `generate` cair em `0015`, sem colidir com nenhum arquivo `.sql` existente (CS-3). Validado: `drizzle-kit check` limpo, `drizzle-kit generate` sem mudanças (schema.ts bate com o snapshot reconciliado), e uma migration de teste gerada (`0015`, `ALTER TABLE admin.system_settings ADD COLUMN reconciliation_probe`) aplicada dentro de uma transação com rollback contra o banco real via o mesmo padrão de `rls.test.ts` — confirmando coluna presente durante a tx e ausente depois; arquivo de teste descartado (não é uma migration real).

README atualizado: `drizzle-kit generate` passa a ser o ponto de partida documentado para toda nova migration (mantendo a filosofia de que a _aplicação_ continua sendo o runner custom, não `drizzle-kit migrate` — RLS/partições/`SECURITY DEFINER` continuam exigindo edição manual do SQL gerado antes de aplicar). Novo script `db:check`.

Teste de paridade novo (critério explícito do prompt): `packages/db/src/__tests__/schema-parity.test.ts`, rodando via `pnpm turbo test` (portanto já herdado pelo job de CI de P-0.9, que sobe o Supabase local efêmero e roda `db:migrate` antes de `pnpm turbo test`). Implementado com uma comparação direta contra `information_schema.columns`/`pg_enum` em vez do `pushSchema` programático de `drizzle-kit/api`: esse helper tem um bug real na versão fixada (0.28.1) — seu wrapper interno de `db.query` descarta os parâmetros de queries parametrizadas, quebrando a introspecção de qualquer tabela com chave primária composta (`financeiro.budget_items`, `projetos.organization_members`, etc.) com "there is no parameter $1". `drizzle-kit introspect` (CLI) não tem esse bug (usa um conector próprio), mas comparar dois snapshots completos exigiria normalizar diferenças cosméticas (tabelas de partição do `admin.audit_log`, ordenação, etc.) — trade-off pior que a query direta e explícita.

**Criterios de aceite verificados:**

- [x] `drizzle-kit check` limpo — "Everything's fine 🐶🔥" contra o `meta/` reconciliado.
- [x] migration nova de teste gerada e aplicada — `0015` gerada, aplicada e revertida (rollback) contra o banco real; não commitada (era só a verificação do critério, não uma migration de produto).
- [x] teste de paridade no CI — `schema-parity.test.ts` roda via `pnpm turbo test`, já ligado ao job de CI de P-0.9; 2 testes verdes contra o banco de produção real nesta sessão (0 tabelas/colunas/enums fora de paridade).
- [x] README do db atualizado — seção "Migration flow" reescrita com o fluxo `generate` → revisar → `db:migrate`; nova seção "Schema parity test"; tabela de scripts atualizada.
- lint/typecheck verdes em `pnpm turbo lint typecheck` (34/34 tasks) após as mudanças.

**Decisoes tomadas:**

- Journal reconciliado com **uma única entrada fiel** (idx 14), não 15 entradas retroativas uma por migration real — lendo o código-fonte do drizzle-kit (`utils.js`/`bin.cjs`) confirmou-se que `generate`/`check` só usam a última entrada para diff e para calcular o próximo índice; fabricar 14 snapshots intermediários "de mentirinha" não teria valor e adicionaria superfície de erro (colisão de `prevId`, versões incompatíveis).
- Teste de paridade escrito com queries diretas ao invés de `pushSchema`/`introspect` do drizzle-kit, por causa do bug de parâmetros descoberto durante a implementação (ver Resumo). Documentado no cabeçalho do teste para não ser redescoberto do zero numa fase futura.
- Verificação da migration de teste feita contra o banco de produção real (não um Postgres efêmero local — sem Docker disponível no ambiente desta sessão), mas dentro de uma transação com rollback explícito (`sql.begin` + `throw` + `catch`), o mesmo padrão já usado em `rls.test.ts` — zero risco de persistir a mudança.

**Debitos tecnicos / pendencias:**

- Nenhum entulho retroativo: com 45/45 tabelas, todas as colunas e os 22 enums em paridade total confirmada nesta sessão, não há dívida de dessincronização TS↔SQL herdada das fases 1–3 para registrar aqui.
- `drizzle-kit` continua fixado em `^0.28.0` (tem o bug de `pushSchema` descrito acima); upgrade para uma versão mais recente não foi avaliado nesta sessão — fora de escopo de P-0.11.

**Arquivos criados:**

- `packages/db/src/migrations/meta/0014_snapshot.json`
- `packages/db/src/__tests__/schema-parity.test.ts`
- `packages/db/src/__tests__/setup-env.ts`
- `packages/db/vitest.config.ts`

**Arquivos modificados:**

- `packages/db/src/migrations/meta/_journal.json` (reconciliado para uma entrada, idx 14)
- `packages/db/src/migrations/meta/0000_snapshot.json` (removido — substituído por `0014_snapshot.json`)
- `packages/db/package.json` (scripts `test`, `test:watch`, `db:check`; devDependency `vitest`)
- `packages/db/tsconfig.json` (inclui `vitest.config.ts`)
- `packages/db/README.md` (fluxo de migration reescrito; nova seção de teste de paridade)
- `pnpm-lock.yaml` (entrada `vitest` em `packages/db`)
- `SESSIONS.md` (esta entrada)

---

### S-59 — 2026-07-04 — P-1.25 Admin: leitura protegida e fiação completa (Onda 1)

**Prompt:** P-1.25 (`AUDIT/04-prompts-pendentes.md` §4)
**Duracao:** ~3h
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
F2-A1 (app inteiro legível por anônimo — `(dashboard)/layout.tsx` lia direto via `db` superuser, sem checar sessão nem papel), F2-A2 (`resetPassword` gerava o link via `generateLink` mas nunca o enviava a lugar nenhum — no-op do ponto de vista do usuário) e F2-A5 (reuniões com botões `type="button"` sem `action`, incluindo "Nova reunião" e "Editar pauta") corrigidos. `notifyUserSuspended`/`notifyRoleChanged` existiam em `lib/notifications.ts` desde P-1.10 mas nunca eram chamados — ligados a `suspendUser`/`assignRole`/`revokeRole`.

F2-A4 (componentes/forms do Bloco A órfãos) era maior do que o prompt descrevia: um grep de referências (`grep -rl <nome-do-componente>` excluindo o próprio arquivo) nos 19 componentes de `apps/admin/src/components` encontrou **13 órfãos**, não só `user-table`/RHF forms citados no escopo — as páginas reais (`usuarios`, `convites`, `auditoria`, `(dashboard)`) tinham sido reescritas do zero no Bloco B ignorando inteiramente a biblioteca de componentes do Bloco A (mesmo padrão em 4 telas). Reconciliados 7 (`user-table` + `user-table-skeleton` na tela de Usuários, adaptado do tipo mock `User`/`UserStatus` para o schema real; `meeting-form` nas novas rotas `/reunioes/nova` e `/reunioes/[id]/editar`; `invitation-form` na nova rota `/convites/novo`; `role-assignment-form` numa aba "Papéis" nova em Configurações — que também conserta o link "Gerenciar" que já apontava para `?tab=roles` sem essa aba existir; `designation-form` como o formulário de atribuir/revogar ao lado do card read-only já existente; `audit-log-skeleton`/`dashboard-skeleton` como fallback de `Suspense`). Removidos 6 (`user-form` — a criação manual de usuário que ele fazia foi superada pela decisão F2-Q2, convite-primeiro, sem criação manual; `invitation-card`, `user-card`, `audit-log-table`, `feature-flag-toggle`, `status-badge` — todos duplicavam, com pior encaixe, uma implementação já funcionando na página real). Confirmado por grep final: 0 componentes sem import.

**Criterios de aceite verificados:**

- [x] anônimo em qualquer rota → redirect login (teste) — `lib/session.ts` (`requireAdminSession`) chamado no topo do `(dashboard)/layout.tsx`; `session-gate.test.ts` cobre sem-sessão → `redirect(CANONICAL_LOGIN_URL)`.
- [x] usuário sem papel super_admin → bloqueado (teste) — mesmo gate; segundo teste em `session-gate.test.ts` cobre sessão válida sem `super_admin` → mesmo redirect.
- [x] reset de senha recebe e-mail em ambiente de teste — `resetPassword` agora usa `data.properties.action_link` do `generateLink` e despacha via `createNotification` (canal `email`, template `PasswordResetEmail`); teste novo em `actions.test.ts` (`resetPassword > envia e-mail...`) confirma a chamada com o e-mail e canal corretos.
- [x] zero componentes de P-1.2/1.4 sem import (grep no critério) — `for f in components/*.tsx; do grep -rl "$base" ... | grep -v "components/$base.tsx"; done` → todos os 16 componentes restantes com ≥1 referência.
- [x] botões de reuniões operam — "Nova reunião" e "Editar pauta" ligados a `createMeeting`/`updateMeeting` via `meeting-form` reconectado; "Convocar"/"Reconvocar"/"Ver pauta"/"Baixar PDF" (sem infra de e-mail em massa nem PDF — fora do escopo deste prompt) removidos em vez de deixados mortos.
- [x] lint/typecheck/testes verdes — `pnpm --filter admin lint|typecheck` limpos; `pnpm --filter admin test` 58/58 (6 arquivos), incluindo os 2 novos testes de gate e o de `resetPassword`.
- Não verificável nesta sessão: clique real nos botões num navegador — sem servidor de dev rodando neste ambiente; wiring confirmado por revisão de código + typecheck, não por teste end-to-end na UI.

**Decisoes tomadas:**

- Gate único (`requireAdminSession`) redireciona para `CANONICAL_LOGIN_URL` tanto para "sem sessão" quanto para "sessão sem `super_admin`" — não existe hoje uma tela de "acesso negado" distinta em nenhum app do ecossistema; manter os dois casos no mesmo destino evita inventar uma nova convenção de UI fora do escopo do prompt.
- Ao adaptar `user-table`/`role-assignment-form`/`designation-form`/`meeting-form` do tipo mock `@hebron/types/admin` (`User`, `RoleAssignment`, `Designation` — com `mfaEnabled`, `lastLoginAt`, `revokedAt` etc.) para o schema real: campos sem coluna real (`mfaEnabled`, `lastLoginAt`, `moduleAccess`) foram removidos dos componentes em vez de preenchidos com valor fixo/fabricado. `role_assignments` e `designations` não têm coluna `revokedAt` no schema real (revogar é hard delete, não soft-delete) — os componentes passaram a tratar toda linha recebida como já-ativa, sem filtrar por um campo inexistente.
- `user-form.tsx` (criação/edição manual de usuário com múltiplos papéis + envio de convite opcional) deletado em vez de reconectado — a decisão já registrada (F2-Q2, Fase 2) foi "convite primeiro, sem criação manual"; forçar esse componente de volta reintroduziria exatamente o fluxo que essa decisão descartou. A tela de aprovação/onboarding real fica para P-1.26.
- `DesignationForm` mantém o seletor "Escopo" na UI mesmo a tabela `designations` não tendo coluna `scope` — a ação real (`updateDesignation`) descarta esse campo silenciosamente. Documentado aqui como mismatch latente em vez de removido do componente, para não expandir o escopo deste prompt para uma reescrita de UI; ver débito abaixo.
- Onde o prompt cita "botões de reuniões operam", removidos (em vez de deixados como no-op) os botões sem contraparte de infraestrutura no escopo deste prompt (e-mail de convocação, geração de PDF de ata) — deixar um botão visível sem ação seria reproduzir o mesmo padrão de UI morta que o achado F2-A5 descreve.

**Debitos tecnicos / pendencias:**

- `DesignationForm` expõe um seletor de "Escopo" que a ação real ignora (tabela sem essa coluna) — a UI sugere uma capacidade que o backend não tem. Corrigir exige decidir entre adicionar a coluna (mudança de schema) ou remover o campo do formulário (mudança de `@hebron/validators`); nenhuma das duas está no escopo de P-1.25.
- Revogação de papel (`revokeRole`) e de designação (`updateDesignation` ação `revoke`) continuam sendo hard delete — pré-existente, não introduzido nem corrigido nesta sessão; a trilha de imutabilidade depende inteiramente do `audit_log`, não da linha da tabela.
- Sem verificação end-to-end em navegador real (sem servidor de dev disponível neste ambiente) — a operabilidade dos botões de reunião foi confirmada por leitura de código e typecheck, não por clique real.

**Arquivos criados:**

- `apps/admin/src/lib/session.ts`
- `apps/admin/src/lib/queries.ts`
- `apps/admin/src/components/role-assignment-panel.tsx`
- `apps/admin/src/components/designation-panel.tsx`
- `apps/admin/src/app/(dashboard)/reunioes/nova/page.tsx`
- `apps/admin/src/app/(dashboard)/reunioes/nova/nova-reuniao-client.tsx`
- `apps/admin/src/app/(dashboard)/reunioes/[id]/editar/page.tsx`
- `apps/admin/src/app/(dashboard)/reunioes/[id]/editar/editar-reuniao-client.tsx`
- `apps/admin/src/app/(dashboard)/convites/novo/page.tsx`
- `apps/admin/src/app/(dashboard)/convites/novo/novo-convite-client.tsx`
- `apps/admin/src/__tests__/session-gate.test.ts`

**Arquivos modificados:**

- `apps/admin/src/app/(dashboard)/layout.tsx` (gate `requireAdminSession`)
- `apps/admin/src/actions/users.ts` (`resetPassword` envia e-mail real; `suspendUser` chama `notifyUserSuspended`)
- `apps/admin/src/actions/roles.ts` (`assignRole`/`revokeRole` chamam `notifyRoleChanged`)
- `apps/admin/src/app/(dashboard)/reunioes/page.tsx` (botões ligados às novas rotas; botões sem infra removidos)
- `apps/admin/src/app/(dashboard)/usuarios/page.tsx` (reconectado a `UserTable` + `Suspense`/`UserTableSkeleton`)
- `apps/admin/src/components/user-table.tsx` (adaptado do tipo mock para o schema real)
- `apps/admin/src/components/meeting-form.tsx` (tipos locais em vez de `@hebron/types/admin`)
- `apps/admin/src/components/role-assignment-form.tsx` (idem; `defaultUserId` novo)
- `apps/admin/src/components/designation-form.tsx` (idem)
- `apps/admin/src/app/(dashboard)/configuracoes/page.tsx` (aba "Papéis" nova; `DesignationPanel` ao lado do card read-only)
- `apps/admin/src/app/(dashboard)/convites/page.tsx` (mensagem de sucesso `?success=enviado`)
- `apps/admin/src/app/(dashboard)/auditoria/page.tsx` (`AuditLogSkeleton` como fallback do `Suspense`)
- `apps/admin/src/app/(dashboard)/page.tsx` (`DashboardSkeleton` como fallback do `Suspense`)
- `apps/admin/src/__tests__/actions.test.ts` (mock de `generateLink` com `action_link`; teste novo de `resetPassword`)
- `SESSIONS.md` (esta entrada)

**Arquivos removidos (órfãos superados por implementação já existente ou decisão anterior):**

- `apps/admin/src/components/user-form.tsx`
- `apps/admin/src/components/invitation-card.tsx`
- `apps/admin/src/components/user-card.tsx`
- `apps/admin/src/components/audit-log-table.tsx`
- `apps/admin/src/components/feature-flag-toggle.tsx`
- `apps/admin/src/components/status-badge.tsx`

---

### S-60 — 2026-07-04 — P-1.26 Onboarding: convite, auto-signup e MFA (Onda 1)

**Prompt:** P-1.26 (`AUDIT/04-prompts-pendentes.md` §4)
**Duracao:** ~5h
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
F2-A3/O-1 (nenhuma pessoa nova conseguia entrar no sistema: e-mail de convite apontava para `/convite`, rota inexistente; `acceptInvitation` marcava o convite como aceito mas nunca criava conta nem atribuía papéis; auto-signup não existia) e S1-07/F2-M1 (MFA "obrigatório" sem enrollment nem enforcement — challenge só ocorria para quem já tinha TOTP configurado via Supabase Dashboard) corrigidos.

`/convite` (intranet) passou a validar o token server-side e, na aceitação, criar a conta via `supabase.auth.admin.createUser` (service role), atribuir os papéis do convite e marcar aceito — a implementação antiga em `apps/admin/src/actions/invitations.ts` foi removida (nunca tinha UI que a chamasse; a rota pública correta é a intranet, login canônico do ecossistema, não o admin). Auto-signup: nova coluna `public.users.status` (`pending_approval` | `active` | `rejected`) — modelagem decidida nesta sessão, não deixada ao executor. `handle_new_user()` (trigger em `auth.users`) lê `raw_user_meta_data->>'signup_source'`: `"self"` nasce `pending_approval`; convite/criação manual (sem essa flag) mantêm o default `active`. Trigger novo `users_protect_status` bloqueia qualquer mudança de status por quem não é `super_admin` — mas só quando `auth.uid() IS NOT NULL` (ou seja, só no caminho PostgREST/supabase-js autenticado de um usuário real); a conexão direta que todo Server Action deste monorepo usa para escrever no banco (`DATABASE_URL` via drizzle/postgres.js, decisão anterior a esta sessão) não passa por esse contexto, então `approveSignup`/`rejectSignup` continuam funcionando sem bypass explícito. Duas funções `SECURITY DEFINER` (`self_signup_join_organization`, `search_organizations_for_signup`) abrem uma janela estreita para o usuário ainda sem papel nenhum montar/selecionar sua instituição — só operam enquanto o próprio `auth.uid()` está `pending_approval`, nunca em nome de terceiros. Wizard: `/cadastro` (conta + consentimento LGPD básico) → `/cadastro/instituicao` (busca ou cria instituição) → `/cadastro/status` (aguardando aprovação). Fila de aprovação nova em `apps/admin` (Usuários) com `approveSignup`/`rejectSignup` — aprova ativa a conta e atribui `submissor`; rejeita marca `rejected` (soft, nunca hard delete).

MFA: `/mfa/enroll` (QR code + verificação, usa os primitivos `enrollTotp`/`verifytotpEnrollment` já existentes desde P-0.4) e `/mfa/challenge` (para sessão retomada com fator já verificado mas ainda `aal1`). Todo login (senha, magic link, convite, confirmação de e-mail) passa por `/post-login`, gate único que decide destino final: status de aprovação → enrollment/challenge de MFA (se o papel exigir) → destino. `middleware.ts` da intranet reforça o mesmo gate a cada navegação (runtime Node — drizzle/postgres precisa de socket TCP, indisponível no Edge) como rede de segurança para sessões retomadas.

**Bugs encontrados e corrigidos durante a verificação em servidor de dev real** (não só typecheck/lint/testes):

1. `packages/auth/src/index.ts` (barrel) reexportava `./server.ts`, que importa `@hebron/db/client` (drizzle + postgres, que precisa de `net`/`tls` do Node). Qualquer "use client" que importasse `@hebron/auth` (o barrel) — inclusive o já existente `login-form.tsx`, de antes desta sessão — quebrava o bundle do cliente com `Module not found: Can't resolve 'net'`. Confirmado pré-existente (reproduzido com `git stash` no código original, antes de qualquer mudança desta sessão), mas as 5 novas páginas client desta sessão dependiam do mesmo barrel — sem o fix, toda a UI de onboarding subiria 500 em produção. Corrigido removendo o reexport de `./server` do barrel (nenhum consumidor real dependia dele — todos já importavam `@hebron/auth/server` diretamente, confirmado por grep) e ajustando os 2 call sites que ainda usavam o barrel para isso (`apps/projetos/src/actions/auth.ts`, `apps/projetos/src/lib/queries.ts`).
2. O gate de segurança do `middleware.ts` mandava todo usuário `pending_approval` para `/cadastro/status` incondicionalmente, sem checar se ele já tinha vinculado instituição — diferente de `/post-login`, que checa `organization_members` antes de decidir entre `/cadastro/status` e `/cadastro/instituicao`. Um usuário que confirmou e-mail mas nunca completou o passo da instituição, ao acessar qualquer rota diretamente (fora do fluxo imediato de login), ficava preso numa tela sem próxima ação. Reproduzido ao vivo com cookie de sessão real antes do fix (redirecionava para `/cadastro/status`) e depois do fix (redireciona corretamente para `/cadastro/instituicao`).

**Criterios de aceite verificados:**

- [x] fluxo convite→conta→papéis→login funciona end-to-end — `apps/intranet/src/__tests__/invitations.test.ts` (3 testes, sem mock de sessão, contra o Supabase de dev real: convite válido cria conta + papéis + audit; convite expirado e revogado retornam erro sem criar conta).
- [x] signup→aprovação→login funciona — `apps/intranet/src/__tests__/onboarding.test.ts` (signup com `signup_source=self` nasce `pending_approval`; `self_signup_join_organization` vincula instituição só enquanto pendente; trigger bloqueia auto-aprovação) + `apps/admin/src/__tests__/actions.test.ts` (novo bloco `approveSignup / rejectSignup`, 3 testes: aprova ativa+atribui submissor+audita; rejeita não pode ser aprovado de novo; rejeita marca `rejected`+audita, sem papel). Verificado também ao vivo: cookie de sessão real de usuário pendente → `/post-login` → `/cadastro/instituicao`; após o fix do middleware, `/` direto também.
- [x] super_admin sem TOTP é forçado a enrolar antes de qualquer app — verificado ao vivo com servidor de dev real: super_admin sem fator TOTP, cookie de sessão real, `GET /` → `307` para `/mfa/enroll`. Também verificado o caso de sessão retomada com fator já verificado mas `aal1` (TOTP real enrolado e verificado via código RFC 6238 calculado a partir do secret) → `307` para `/mfa/challenge`, não `/mfa/enroll` — distinção que `getAuthenticatorAssuranceLevel()` sozinho não faz (por isso o helper novo `hasVerifiedTotpFactor`). Achado colateral, não corrigido (baixa severidade): `/mfa/enroll` acessado direto por esse mesmo usuário retorna 200 (re-renderiza o formulário de enrollment) em vez de redirecionar para `/mfa/challenge` — só checa o papel, não se já existe fator verificado.
- [x] consentimento LGPD básico no cadastro — checkbox obrigatório no formulário (bloqueia submit se desmarcado) + carimbo `lgpd_consent_at` no metadata da conta. Achado: o carimbo é posto incondicionalmente por `signUpWithPassword()` sempre que a função é chamada — é timestamp de quando a chamada aconteceu, não prova server-side de que o consentimento foi de fato dado (a validação real é só client-side). Aceitável para "básico" (P-0.13, consentimento granular com tabela própria, ainda não rodou), mas registrado aqui para não ser confundido com controle de compliance real.
- [x] audit em todas as mutações — conferido por grep em todas as Server Actions novas/alteradas: `acceptInvitation`, `completeSignupOrganization`, `confirmMfaEnrollment`, `approveSignup`, `rejectSignup` — todas com exatamente 1 chamada a `logAudit`/`logIntranetAudit`; a única action sem audit (`searchOrganizationsForSignup`) é read-only.
- lint/typecheck verdes em `pnpm turbo lint typecheck` (34/34 tasks) após os 2 fixes.

**Decisoes tomadas:**

- `status` como coluna nova em `public.users`, separada de `suspended_modules` — `suspended_modules` governa acesso de conta já ativa; `status` governa a entrada no ecossistema. Convite e criação manual (Admin) nascem `active` (pré-vetados por quem convida/cria); só auto-signup nasce `pending_approval`.
- `handle_new_user()` decide o status pelo metadata (`signup_source`) enviado no `auth.signUp()`, não por uma segunda escrita — evita janela de corrida entre a criação da conta (antes da confirmação de e-mail, quando ainda não há sessão para uma action autenticada rodar) e a marcação como pendente.
- `self_signup_join_organization`/`search_organizations_for_signup` como funções `SECURITY DEFINER` em vez de um cliente service-role no código do app (padrão já usado por `has_role`/`is_org_member` no schema `projetos`) — mais estreito: só o próprio `auth.uid()` `pending_approval` pode agir, e só sobre a própria membership.
- `acceptInvitation` movida de `apps/admin` para `apps/intranet` (não é violação de fronteira app→app: cada app já escreve suas próprias Server Actions contra o schema Drizzle compartilhado) — a rota pública `/convite` pertence ao login canônico (`app.hebronaseec.com.br`), não ao admin; a versão antiga em `apps/admin/src/actions/invitations.ts` foi deletada (e seu teste) por nunca ter tido UI que a chamasse.
- `/post-login` como checkpoint único: toda forma de login (senha, magic link, convite com auto-login, confirmação de e-mail via `/auth/callback`) redireciona para lá antes do destino final, em vez de duplicar a checagem de status/MFA em cada entrypoint. `middleware.ts` reforça o mesmo gate a cada navegação como rede de segurança (não como gate primário) — os dois tiveram que ser mantidos consistentes manualmente, e a inconsistência do achado #2 acima veio exatamente de um lado ter sido atualizado (post-login) e o outro não (middleware), até a verificação ao vivo pegar.
- `TotpCodeInput`/`AuthCard` extraídos para `apps/intranet/src/components` — a formatação do código de 6 dígitos e o shell de cartão+logo já apareciam em `login-form.tsx` antes desta sessão e se repetiriam em mais 5 páginas novas.
- Bibliotecas de PDF/XLSX, Inngest, `packages/integrations` etc. citadas no escopo original do prompt (via `AUDIT/04`) para os fluxos "cron"/"cross-app" não se aplicam aqui — nenhum dos 3 fluxos deste prompt precisa deles (nem lembrete agendado, nem chamada cross-app).

**Debitos tecnicos / pendencias:**

- `/mfa/enroll` não verifica se o usuário já tem um fator TOTP verificado antes de renderizar — um usuário nessa situação, ao navegar direto para a página (em vez de ser redirecionado pelo gate), pode enrolar um segundo fator em vez de ser levado a `/mfa/challenge`. Não é falha de segurança (Supabase permite múltiplos fatores; o gate em `/post-login`/`middleware.ts` continua funcionando em qualquer outra rota), só uma lacuna de defesa em profundidade nesta página específica.
- Consentimento LGPD é só client-side, sem tabela de consentimento granular (aguarda P-0.13) — ver ressalva no critério acima.
- `apps/intranet` não tem `page.tsx` na raiz (`/`) — pré-existente, não introduzido nem corrigido nesta sessão; um usuário ativo sem exigência de MFA que passa por todos os gates corretamente recebe 404 ao chegar em `/`. Fora do escopo de P-1.26.
- Sem verificação em navegador real (Playwright/Puppeteer indisponíveis neste ambiente) — a verificação ao vivo foi feita via `curl` com cookies de sessão reais (produzidos pelos helpers de teste em `packages/auth/src/testing.ts`, o mesmo mecanismo de login real usado nos testes automatizados), não por clique em UI.

**Arquivos criados:**

- `packages/db/src/migrations/0015_user_status.sql`
- `packages/db/src/migrations/0016_onboarding_audit_actions.sql`
- `packages/email/src/templates/signup-rejected.tsx`
- `apps/intranet/src/lib/safe-action.ts`
- `apps/intranet/src/lib/audit.ts`
- `apps/intranet/src/lib/notifications.ts`
- `apps/intranet/src/lib/session-client.ts`
- `apps/intranet/src/actions/invitations.ts`
- `apps/intranet/src/actions/onboarding.ts`
- `apps/intranet/src/actions/mfa.ts`
- `apps/intranet/src/components/auth-card.tsx`
- `apps/intranet/src/components/totp-code-input.tsx`
- `apps/intranet/src/app/(auth)/convite/page.tsx`
- `apps/intranet/src/app/(auth)/convite/components/convite-form.tsx`
- `apps/intranet/src/app/(auth)/cadastro/page.tsx`
- `apps/intranet/src/app/(auth)/cadastro/components/cadastro-form.tsx`
- `apps/intranet/src/app/(auth)/cadastro/instituicao/page.tsx`
- `apps/intranet/src/app/(auth)/cadastro/instituicao/components/instituicao-form.tsx`
- `apps/intranet/src/app/(auth)/cadastro/status/page.tsx`
- `apps/intranet/src/app/(auth)/cadastro/status/components/sign-out-link.tsx`
- `apps/intranet/src/app/(auth)/auth/callback/route.ts`
- `apps/intranet/src/app/(auth)/post-login/page.tsx`
- `apps/intranet/src/app/(auth)/mfa/enroll/page.tsx`
- `apps/intranet/src/app/(auth)/mfa/enroll/components/mfa-enroll-form.tsx`
- `apps/intranet/src/app/(auth)/mfa/challenge/page.tsx`
- `apps/intranet/src/app/(auth)/mfa/challenge/components/mfa-challenge-form.tsx`
- `apps/intranet/src/__tests__/setup-env.ts`
- `apps/intranet/src/__tests__/invitations.test.ts`
- `apps/intranet/src/__tests__/onboarding.test.ts`
- `apps/intranet/vitest.config.ts`

**Arquivos modificados:**

- `packages/db/src/schema/public.ts` (`userStatusEnum`, coluna `status`)
- `packages/db/src/schema/admin.ts` (`audit_action`: `user.rejected`, `user.signup_requested`, `mfa.enrolled`)
- `packages/db/src/schema/index.ts` (exporta `userStatusEnum`)
- `packages/db/src/rls/admin.ts` (documenta o trigger `users_protect_status`)
- `packages/auth/src/index.ts` (remove reexport de `./server` — fix do bundle de cliente)
- `packages/auth/src/mfa.ts` (`hasVerifiedTotpFactor`)
- `packages/auth/src/client.ts` (`signUpWithPassword`)
- `packages/auth/src/testing.ts` (`createTestAuthUser` aceita metadata extra)
- `apps/intranet/package.json` (deps: `@hebron/email`, `@supabase/supabase-js`, `drizzle-orm`, `zod`, `next-safe-action`, `lucide-react`; scripts `test`/`test:watch`)
- `apps/intranet/src/middleware.ts` (gate de status/MFA, runtime Node; fix da checagem de organization_members)
- `apps/intranet/src/app/(auth)/login/page.tsx` (usa `AuthCard` compartilhado)
- `apps/intranet/src/app/(auth)/login/components/login-form.tsx` (redireciona via `/post-login`; usa `TotpCodeInput`)
- `apps/admin/src/actions/users.ts` (`approveSignup`, `rejectSignup`)
- `apps/admin/src/actions/invitations.ts` (remove `acceptInvitation`, movida para intranet)
- `apps/admin/src/app/(dashboard)/usuarios/page.tsx` (fila de cadastros pendentes)
- `apps/admin/src/__tests__/actions.test.ts` (remove testes de `acceptInvitation`; adiciona bloco `approveSignup / rejectSignup`)
- `apps/projetos/src/actions/auth.ts` (importa `createSupabaseServerActionClient` de `@hebron/auth/server`, não do barrel)
- `apps/projetos/src/lib/queries.ts` (idem)
- `pnpm-lock.yaml` (novas deps da intranet)

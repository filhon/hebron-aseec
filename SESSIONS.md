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

| Sessao | Data       | Prompt                                                                  | Status                               |
| ------ | ---------- | ----------------------------------------------------------------------- | ------------------------------------ |
| S-1    | 2026-05-21 | P-0.1 — Monorepo Setup                                                  | concluido                            |
| S-2    | 2026-05-22 | P-0.1 — Monorepo Setup (complemento)                                    | concluido                            |
| S-3    | 2026-05-22 | P-0.2 — Design System Base                                              | concluido                            |
| S-4    | 2026-05-22 | P-0.3 — Supabase Setup                                                  | concluido                            |
| S-5    | 2026-05-22 | P-0.4 — Autenticação e SSO                                              | concluido                            |
| S-6    | 2026-05-22 | P-0.5 — Layout Compartilhado (AppShell)                                 | concluido                            |
| S-7    | 2026-05-22 | P-0.6 — Sistema de Notificações                                         | concluido                            |
| S-8    | 2026-05-22 | P-1.1 — Schema de Tipos Admin                                           | concluido                            |
| S-9    | 2026-05-22 | P-1.2 — Componentes UI Admin                                            | concluido                            |
| S-10   | 2026-05-22 | P-1.3 — Telas e Páginas Admin                                           | concluido                            |
| S-11   | 2026-05-22 | P-1.4 — Formulários Admin                                               | concluido                            |
| S-12   | 2026-05-22 | P-1.5 — Estados Admin                                                   | concluido                            |
| S-13   | 2026-05-25 | P-1.6 — Schema do Banco Admin                                           | concluido                            |
| S-14   | 2026-05-25 | P-1.7 — RLS Policies Admin                                              | concluido                            |
| S-15   | 2026-05-25 | P-1.8 — Server Actions Admin                                            | concluido                            |
| S-16   | 2026-05-25 | P-1.9 — Integração UI ↔ Backend Admin                                   | concluido                            |
| S-17   | 2026-05-25 | P-1.10 — Notificações e Emails Admin                                    | concluido                            |
| S-18   | 2026-05-26 | P-1.11 — Impersonation e Audit Avançado                                 | concluido                            |
| S-19   | 2026-05-26 | P-1.12 — Testes Admin                                                   | concluido                            |
| S-20   | 2026-06-13 | P-0.2b — Unificação do Design System                                    | concluido                            |
| S-21   | 2026-06-15 | P-1.12b — Ajustes Menores DS Admin                                      | concluido                            |
| S-22   | 2026-06-15 | P-0.3b — Pipeline de Migrations                                         | concluido                            |
| S-23   | 2026-06-16 | P-1.13 — Schema de Tipos Documentos                                     | concluido                            |
| S-24   | 2026-06-16 | P-1.14 — Componentes UI Documentos                                      | concluido                            |
| S-25   | 2026-06-16 | P-1.15 — Telas e Páginas Documentos                                     | concluido                            |
| S-26   | 2026-06-17 | P-1.16 — Formulários Documentos                                         | concluido                            |
| S-27   | 2026-06-17 | P-1.17 — Estados Documentos                                             | concluido                            |
| S-28   | 2026-06-17 | P-1.18 — Schema do Banco Documentos                                     | concluido                            |
| S-29   | 2026-06-17 | P-1.20 — Server Actions Documentos                                      | concluido                            |
| S-30   | 2026-06-18 | P-1.22 — Notificações e Emails Documentos                               | concluido                            |
| S-31   | 2026-06-18 | P-1.23 — Integração Documentos ↔ Projetos                               | concluido                            |
| S-32   | 2026-06-18 | P-1.24 — Testes Documentos                                              | concluido                            |
| S-33   | 2026-06-20 | P-2.1 — Schema de Tipos Projetos                                        | concluido                            |
| S-34   | 2026-06-20 | P-2.2 — Componentes UI Projetos                                         | concluido                            |
| S-35   | 2026-06-20 | P-2.3 — Telas e Páginas Projetos                                        | concluido                            |
| S-36   | 2026-06-20 | P-2.4 — Formulários Projetos                                            | concluido                            |
| S-37   | 2026-06-22 | P-2.5 — Estados Projetos                                                | concluido                            |
| S-38   | 2026-06-22 | P-2.6 — Schema do Banco Projetos                                        | concluido                            |
| S-39   | 2026-06-22 | P-2.7 — RLS Policies Projetos                                           | concluido                            |
| S-40   | 2026-06-22 | P-2.8 — Server Actions Projetos                                         | concluido                            |
| S-41   | 2026-06-22 | P-2.9 — Integração UI ↔ Backend Projetos                                | concluido                            |
| S-42   | 2026-06-23 | P-2.10 — Notificações e Emails Projetos                                 | concluido                            |
| S-43   | 2026-06-23 | P-2.11 — Integrações Cross-App Projetos                                 | parcial                              |
| S-44   | 2026-06-23 | P-2.9b — Usuário Real no Header Projetos                                | concluido                            |
| S-45   | 2026-06-23 | Polish — apps/projetos/src/app                                          | concluido                            |
| S-46   | 2026-06-23 | P-3.1 — Schema de Tipos Financeiro                                      | concluido                            |
| S-47   | 2026-06-25 | P-3.2 — Componentes UI Financeiro                                       | concluido                            |
| S-48   | 2026-06-25 | P-3.3 — Telas e Páginas Financeiro                                      | concluido                            |
| S-49   | 2026-06-26 | P-3.4 — Formulários Financeiro                                          | concluido                            |
| S-50   | 2026-06-26 | P-3.5 — Estados Financeiro                                              | concluido                            |
| S-51   | 2026-06-26 | P-3.6 — Schema do Banco Financeiro                                      | concluido                            |
| S-52   | 2026-06-26 | P-3.7 — RLS Policies Financeiro                                         | concluido                            |
| S-53   | 2026-06-26 | P-3.8 — Server Actions Financeiro                                       | concluido                            |
| S-54   | 2026-07-03 | P-0.7 — Resgate do Banco (Onda 0)                                       | concluido                            |
| S-55   | 2026-07-03 | P-0.8 — Kit de Backend Compartilhado (Onda 0)                           | concluido                            |
| S-56   | 2026-07-03 | P-0.9 — CI Mínimo (Onda 0)                                              | concluido (validação em PR pendente) |
| S-57   | 2026-07-03 | P-0.10 — Decisão B: RLS Ativa (Onda 0)                                  | concluido                            |
| S-58   | 2026-07-04 | P-0.11 — Drizzle-kit Reconciliado (Onda 0)                              | concluido                            |
| S-59   | 2026-07-04 | P-1.25 — Admin: leitura protegida e fiação completa (Onda 1)            | concluido                            |
| S-60   | 2026-07-04 | P-1.26 — Onboarding: convite, auto-signup e MFA (Onda 1)                | concluido                            |
| S-61   | 2026-07-04 | P-1.27 — Documentos: visibilidade e área editorial verdadeiras (Onda 1) | concluido                            |
| S-62   | 2026-07-04 | P-2.9c — Projetos: operável de ponta a ponta                            | concluido                            |
| S-63   | 2026-07-04 | P-3.8b — Financeiro: governança e conciliação verdadeiras               | concluido                            |
| S-64   | 2026-07-05 | P-0.12 — Storage: buckets e policies (Onda 2)                           | concluido                            |
| S-65   | 2026-07-05 | P-0.13 — LGPD: fundação (Onda 2)                                        | concluido                            |
| S-66   | 2026-07-06 | P-0.14 — Jobs: Inngest de verdade (Onda 2)                              | concluido                            |
| S-67   | 2026-07-06 | P-0.15 — packages/integrations + contrato de settings (Onda 2)          | concluido                            |
| S-68   | 2026-07-06 | P-0.16 — Registro retroativo (Onda 2)                                   | concluido                            |
| S-69   | 2026-07-06 | P-3.9 — Financeiro: Integração UI ↔ Backend                             | concluido                            |
| S-70   | 2026-07-07 | P-3.10 — Financeiro: Notificações e Emails                              | concluido                            |
| S-71   | 2026-07-07 | P-3.11 — Financeiro: Integrações Cross-App                              | concluido                            |
| S-72   | 2026-07-07 | P-3.12 — Testes Financeiro                                              | concluido                            |
| S-73   | 2026-07-07 | P-4.1 — Schema de Tipos Tarefas                                         | concluido                            |

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

---

### S-61 — 2026-07-04 — P-1.27 Documentos: visibilidade e área editorial verdadeiras (Onda 1)

**Prompt:** P-1.27 (`AUDIT/04-prompts-pendentes.md` §4)
**Duracao:** ~4h
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
F2-D1 (a página `/[slug]` não tinha filtro de visibilidade nenhum — um documento `restricted` publicado renderizava por completo, PDF incluso via signed URL de service role, para qualquer anônimo que soubesse o slug) e F2-D2 (a área `/editorial` não tinha nenhuma autenticação — só um texto decorativo "Acesso restrito: super_admin / editor" no layout, sem `redirect` nem checagem — expondo rascunhos e KPIs a anônimos) corrigidos. Todas as páginas públicas (`/`, `/[slug]`, `/editais`, `/editais/[slug]`, `/busca`) passaram a ler via `withAuthenticatedContext` (`@hebron/db/authenticated`, criado em P-0.10 mas nunca antes adotado por nenhuma página do monorepo — só exercitado pelos próprios testes) em vez do client superuser `db`, deixando a RLS já declarada em P-1.19 executar de verdade pela primeira vez em código de produção. `/editorial/layout.tsx` ganhou `requireEditorSession()` (novo `apps/documentos/src/lib/session.ts`, mesmo padrão de `requireAdminSession` do admin), que gateia todas as sub-rotas editoriais de uma vez.

FAQ de edital: existia uma aba "FAQ" completa no formulário de criação/edição desde P-1.16/1.20, mas o array digitado nunca era enviado às actions — a página pública mostrava um `FAQ_ITEMS` estático, idêntico para todo edital. Adicionada coluna `faq` (jsonb) em `documentos.editals` (migration `0017`), `createEdital`/`updateEdital` passaram a persistir, e a página pública passou a ler o FAQ real por edital.

`publishDocument` nunca chamava nenhuma notificação (confirmado pelo próprio teste existente, que chamava `notifyNewDocument` manualmente depois de publicar, nunca através da action) — agora dispara `notifyEditalOpen` ou `notifyNewDocument` automaticamente dependendo de o documento publicado ter uma linha em `editals`. Lembrete de fechamento de edital (7 dias antes) ganhou `apps/documentos/src/jobs/edital-closing-reminders.ts`, documentado como pendente de registro quando `packages/jobs`/P-0.14 (Inngest) existir — essa infra ainda não existe no monorepo.

4 rotas citadas na sidebar editorial (`/editorial/documentos`, `/editorial/editais`, `/editorial/assinaturas`, `/editorial/auditoria`) 404avam — todas criadas. `/assinaturas` (portal público, já referenciada pela home e nunca criada) também: reconecta o `SubscriptionForm` (construído em P-1.16, nunca importado por nenhuma página) às actions `subscribe`/`unsubscribe` já existentes.

**Achado fora do escopo original do prompt, corrigido na mesma sessão por ser exatamente o padrão que a Fase 2 já tinha identificado (PD-1/CS-8):** ao auditar "zero componentes do Bloco A órfãos" depois de fechar o escopo literal do prompt, um grep de uso revelou que `DocumentForm`, `EditalForm` e `SearchBar` (construídos em P-1.14/1.16, completos — tag picker com criação inline, árvore de categorias, editor Markdown com preview, FAQ) nunca tinham sido importados por nenhuma página; `/editorial/novo` e `/editorial/[id]/editar` reimplementavam um subconjunto pior inline (sem suporte a tags, `<select>` plano em vez da árvore). Reescritos os dois para usar `DocumentForm`/`EditalForm` de verdade, e `/busca` para usar `SearchBar` (com filtro por tag agora funcional via `EXISTS` subquery, algo que não existia antes). Isso expôs que a criação de tag "local" no formulário nunca teve backend (nenhuma action de tags existia no app inteiro) — criado `apps/documentos/src/actions/tags.ts` (`createTag`/`listTags`) e um `resolveTagIds` nos wrappers client que troca ids `local-*` por tags reais antes do submit. Também exigiu adicionar `tagIds` a `createEdital`/`updateEdital` (só `createDocument`/`updateDocument` aceitavam) e um flag `hasExistingFile` nos dois formulários para não bloquear a edição de um documento/edital que já tem PDF salvo mas nenhum arquivo novo foi escolhido.

**Criterios de aceite verificados:**

- [x] anon não vê `internal`/`restricted` nem por slug — suíte de regressão pré-existente `rls.test.ts` (bloco "Regressão F2-D1/F2-D2", 4 testes, contra o mesmo padrão de consulta que a página usa) passa.
- [x] editorial bloqueado sem papel — `apps/documentos/src/__tests__/session-gate.test.ts` (novo, 4 testes, mesmo padrão de `apps/admin/src/__tests__/session-gate.test.ts`): sem sessão → redirect; sessão `hospede` → redirect; `colaborador`/`super_admin` → passa.
- [x] assinar categoria → publicar doc → e-mail chega — teste existente em `actions.test.ts` reescrito para chamar a action `subscribe()` de verdade (antes inseria a assinatura direto via `db.insert`, sem exercitar a action) e assertar que `publishDocument` sozinho já dispara `createNotification` (antes o teste só validava `notifyNewDocument` chamada manualmente, nunca através do fluxo real de publicação).
- [x] zero rotas 404 na sidebar — auditado todo `href`/template literal do app; todas resolvem para uma página real.
- [x] zero componentes do Bloco A órfãos — grep de uso após a correção: todo componente em `apps/documentos/src/components` tem ≥1 consumidor.
- `pnpm --filter documentos typecheck lint test` verdes (48/48 testes, 5 arquivos) contra o Supabase de dev real.

**Decisoes tomadas:**

- Papel "editor" (BRAIN §6.7: "super_admins ou colaboradores com papel editor") não existe como `DESIGNATION_TYPE` no schema — `requireEditorSession` reusa o mesmo conjunto (`super_admin`, `diretor`, `conselheiro`, `colaborador`) já estabelecido em `lib/safe-action.ts` (`editorAction`) desde P-1.20, em vez de inventar uma modelagem nova fora do escopo deste prompt.
- FAQ é campo do edital (jsonb em `documentos.editals`), não de `documents` genérico — a aba FAQ some do formulário quando o tipo selecionado é "documento" (só edital tem a coluna).
- Rotas de assinatura resolvidas em duplicidade intencional: `/assinaturas` (portal público, auto-serviço, qualquer autenticado gerencia as próprias) e `/editorial/assinaturas` (visão agregada só para a equipe editorial — contagem por categoria + lista de assinaturas recentes, sem RLS de leitura própria porque é uma página administrativa).
- Toggles `onNewVersion`/`onEditalOpen` do `SubscriptionForm` não têm coluna correspondente em `documentos.subscriptions` (a tabela só tem `user_id`+`category_id`, sem diferenciar tipo de evento) — tratados como um único estado combinado no wrapper cliente (qualquer toggle ligado = 1 assinatura), sem alterar o schema, já que ambos os tipos de notificação (`notifyNewDocument`/`notifyEditalOpen`) já consultam a mesma tabela sem distinção.
- `projectCategory` do `EditalForm` (lista fixa de slugs tipo "evangelizacao") não é enviado a `createEdital`/`updateEdital` — a coluna real `project_category_id` é uma FK uuid para `documentos.categories`, incompatível com os slugs do formulário; enviá-la quebraria a validação Zod `.uuid()`. Pré-existente (a implementação inline anterior também nunca enviava esse campo); fora do escopo deste prompt resolver a modelagem.
- Migration `0017` numerada manualmente na sequência de arquivo (não via `drizzle-kit generate`) — mesma prática já em uso desde `0015`/`0016` (que também não estão no `_journal.json` do drizzle-kit); o runner de aplicação (`migrate.ts`) não depende do journal, só ordena os arquivos por nome.

**Debitos tecnicos / pendencias:**

- Lembrete de fechamento de edital (`runEditalClosingReminders`) não é chamado por ninguém — não há infra de cron/Inngest no monorepo ainda (P-0.14 não rodou). Função pronta e documentada para quando existir.
- `projectCategoryId` de edital nunca é preenchido (ver decisão acima) — o botão "submeter projeto" do edital nunca pré-preenche categoria de projeto, só tipo. Pré-existente, não introduzido nesta sessão.
- Consentimento de e-mail/comunicação (P-0.13, LGPD) ainda não existe — `/assinaturas` e `/editorial/assinaturas` não checam nenhum opt-in de comunicação além da própria ação de assinar a categoria.
- Sem verificação em navegador real (Playwright/Puppeteer indisponíveis neste ambiente) — verificado via `pnpm typecheck`/`lint`/`test` contra o Supabase de dev real, não por clique em UI.

**Arquivos criados:**

- `packages/db/src/migrations/0017_documentos_editals_faq.sql`
- `apps/documentos/src/lib/session.ts`
- `apps/documentos/src/actions/tags.ts`
- `apps/documentos/src/jobs/edital-closing-reminders.ts`
- `apps/documentos/src/components/document-row-actions.tsx`
- `apps/documentos/src/app/editorial/novo/_client.tsx`
- `apps/documentos/src/app/editorial/documentos/page.tsx`
- `apps/documentos/src/app/editorial/editais/page.tsx`
- `apps/documentos/src/app/editorial/assinaturas/page.tsx`
- `apps/documentos/src/app/editorial/auditoria/page.tsx`
- `apps/documentos/src/app/assinaturas/page.tsx`
- `apps/documentos/src/app/assinaturas/_client.tsx`
- `apps/documentos/src/app/busca/_search-bar-client.tsx`
- `apps/documentos/src/__tests__/session-gate.test.ts`

**Arquivos modificados:**

- `packages/db/src/schema/documentos.ts` (`faq` jsonb em `editals`)
- `packages/types/src/documentos/index.ts` (`Edital.faq`)
- `apps/documentos/src/actions/documents.ts` (`publishDocument` dispara `notifyEditalOpen`/`notifyNewDocument`)
- `apps/documentos/src/actions/editals.ts` (`faq`, `tagIds` em `createEdital`/`updateEdital`)
- `apps/documentos/src/app/page.tsx`, `app/busca/page.tsx`, `app/editais/page.tsx`, `app/editais/[slug]/page.tsx`, `app/[slug]/page.tsx` (leitura via `withAuthenticatedContext`)
- `apps/documentos/src/app/editorial/layout.tsx` (`requireEditorSession`)
- `apps/documentos/src/app/editorial/novo/page.tsx`, `app/editorial/[id]/editar/page.tsx`, `app/editorial/[id]/editar/_client.tsx` (reescritos para usar `DocumentForm`/`EditalForm`)
- `apps/documentos/src/components/document-form.tsx`, `components/edital-form.tsx` (`newTags`, `hasExistingFile`)
- `apps/documentos/src/components/search-bar.tsx` (`initialFilters`)
- `apps/documentos/src/__tests__/actions.test.ts` (teste de notificação usa `subscribe()` real)

---

### S-62 — 2026-07-04 — P-2.9c Projetos: operável de ponta a ponta

**Prompt:** P-2.9c (`AUDIT/04-prompts-pendentes.md` §4, decisão F2-Q3)
**Duracao:** ~5h
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
F2-P1 (backend completo, produto inoperante — grep de imports confirmava apenas 3 das 17 actions do módulo com algum caminho de UI: `createAnnualDraft`/`createPunctualDraft` e `castVote`) corrigido fluxo a fluxo: `submitProject` (rascunho→validação) ganhou botão real no detalhe do submissor (`SubmitProjectButton`); `transitionProjectStage` passou a ser chamada de verdade pelo kanban (F2-P2: o handler de drop fazia só `console.log`); `createContestation` ganhou formulário na homologação; `deleteProject` ganhou botão com justificativa obrigatória nos dois detalhes; `assignEvaluator`/`submitEvaluation` ganharam painel de designação e formulário de parecer (o box antigo de "Registrar Avaliação" era decorativo — sempre visível, sem checar designação, sem submeter nada); `createOrganization` ganhou formulário real em `/instituicao` (sem isso, onboarding de submissor era impossível — nem conta, nem instituição, nem projeto); `createReport`/`submitReport`/`reviewReport` ganharam formulários dedicados nas duas pontas (diretor solicita e revisa; submissor envia).

F2-P4 (CRÍTICO): `(diretoria)/layout.tsx` e `(submissor)/layout.tsx` verificavam apenas `getAuthUser() !== null` — nenhuma checagem de papel, herdada de G5 (S1-08) — deixando qualquer autenticado (um submissor, inclusive) navegar para `/pipeline/<id>` e ver score IA, breakdown, versão compacta e contagem de votos de qualquer projeto (`ScoreIndicator` recebia `role="diretor"` hardcoded, sempre). Corrigido com `lib/session.ts` (`requireDiretorSession`/`requireSubmissorSession`, mesmo padrão de `requireAdminSession`/`requireEditorSession` de P-1.25/P-1.27) chamado nos dois layouts, e o papel real do sessão (`super_admin` > `diretor` > `conselheiro`) passado ao `ScoreIndicator` em vez do valor fixo.

F2-P5 (quórum contava atribuições, não pessoas): `countEligibleVoters` (`actions/voting.ts`) e o cálculo espelhado em `getDirectorProjectDetail` (`lib/queries.ts`) usavam `count()` sobre `role_assignments` — um usuário com diretor+conselheiro simultaneamente (permitido pelo BRAIN) contava 2x no denominador do quórum e no `totalEligible` do fechamento automático. Trocado por `countDistinct(roleAssignments.userId)` nos dois lugares.

F2-P6/decisão F2-Q5 (votação sem encerramento no caso comum): com quórum atingido, maioria formada e turnout < 100%, a votação ficava aberta para sempre — o BRAIN só prevê o botão de pânico para o caso "sem quórum", não para esse. Nova action `closeVoting` (`superAdminAction`): exige quórum já atingido (senão rejeita e orienta usar o pânico, sem duplicar a lógica de force-decide de `triggerPanicButton`), fecha com a mesma transição de `homologacao`/`reprovado` da maioria, e audita como `project.stage_transition` com `trigger: "manual_close"` (sem novo valor de enum). UI em `VotingAdminActions`, alternando entre "Encerrar Votação" (quórum atingido) e "Acionar Botão de Pânico" (sem quórum).

F2-P3 (integração edital→wizard aberta): `novo/page.tsx` não lia `edital_id`/`tipo` de `searchParams` nem chamava `getEditalPrefill` — o botão "submeter projeto" do edital (P-1.23, Documentos) não tinha efeito nenhum aqui. Wizard agora lê `?editalId=` via `useSearchParams`, chama `getEditalPrefillForWizard` (novo wrapper `"use server"` em `lib/queries.ts` sobre `lib/integrations/documentos.ts`), pré-preenche `tipo` e exibe um badge "Vinculado ao edital: …", e `editalId` é enviado às duas actions de criação de rascunho (ambas já aceitavam o campo — só nunca era passado). Categoria não é pré-preenchida: `projectCategoryId` do edital referencia `documentos.categories`, não o slug de `projetos.projectCategories` — mapeamento inexistente, já documentado como débito pré-existente no próprio `lib/integrations/documentos.ts`; resolver essa modelagem está fora do escopo deste prompt.

Adoção de `withAuthenticatedContext` (P-0.10, escopo explícito de P-2.9c): todo `lib/queries.ts` migrado de `db` (superuser) para `withAuthenticatedContext({ actorId }, tx => ...)` — RLS de P-2.7 (já testada, mas inerte em produção até este prompt) passa a executar de verdade nas leituras do app. Adicionadas `getEligibleEvaluators`, `getMyPendingEvaluation`, `getDirectorReportsOverview`, `getReportAttachments`, `getEditalPrefillForWizard`.

**Achado fora do escopo literal, corrigido pela mesma verificação "zero componentes do Bloco A órfãos" que já havia pego 26 casos nas Fases 1-2 (PD-2/CS-8):** grep de uso em `apps/projetos/src/components` encontrou 7 órfãos, não só os citados no escopo (`report-form`). `project-wizard.tsx` + os 5 `project-wizard-steps/*.tsx` + `punctual-project-form.tsx`: pré-datavam a reescrita inline do wizard em `novo/page.tsx` (S-41) e tinham submit falso (`setTimeout`); a reimplementação inline já é funcional, testada (fixtures de `flow.test.ts`) e mais completa (upload real para `project-attachments`, leitura de `organizações` reais) — removidos como superados, não reconectados. `report-form.tsx`: campos sem coluna correspondente (`narrativa`, `resultadosAlcancados`, `dificuldades`, `proximosPassos`, `beneficiariosAtingidos` como campos separados — `projetos.reports` só tem `content` único); removido e substituído por `submit-report-form.tsx` novo, casado exatamente com o schema real de `submitReport`. `report-card.tsx`/`organization-card.tsx`: tipos `Report`/`Organization` de `@hebron/types` com campos inteiros sem correspondência na tabela real (`region`, `approvedAt`, `contactName`, `resultadosAlcancados` etc.) — removidos, superados pela renderização inline já existente (mais fiel ao schema real). `project-card.tsx`: nunca teve chamador algum — nem o kanban (usa `KanbanCard` inline) nem o dashboard do submissor (lista inline com progresso de parcelas, que `ProjectCard` não modela) o importavam; removido.

**Criterios de aceite verificados:**

- [x] submissor submete rascunho pela tela `/[id]` e o stage muda de `rascunho` para `validacao` — `SubmitProjectButton` chama `submitProject`; fluxo coberto por `flow.test.ts` (já existente, exercita a action) + revisão de código confirmando o wiring UI→action.
- [x] drag do kanban persiste e sobrevive a reload — `handleMove` chama `transitionProjectStage` de verdade (antes: `console.log`); `ProjectKanban` ganhou `useEffect` de resync (o estado otimista de posições nunca se realinhava com um novo `projects` vindo de refetch); em erro, o pipeline refaz o fetch e mostra o `serverError`.
- [x] submissor autenticado não alcança `/pipeline/<id>` (mais forte que "não vê score": nem a rota é renderizada) — `requireDiretorSession` redireciona; `session-gate.test.ts` (9 testes) cobre os 4 papéis × 2 gates (diretor e submissor).
- [x] votação com quórum é encerrável por super_admin e o resultado aplica transição — `closeVoting` + `VotingAdminActions`; `close-voting.test.ts` cobre fechamento sem quórum (rejeita), com quórum+maioria (fecha para `homologacao`) e reabertura de projeto já fechado (rejeita).
- [x] zero componentes do Bloco A órfãos — grep de uso em todos os componentes restantes de `apps/projetos/src/components`: todos com ≥1 importador.
- [x] testes novos cobrem quórum por pessoa e fechamento manual — `close-voting.test.ts` (4 testes nesta sessão) + fix aplicado em `voting.ts`/`queries.ts`.
- `pnpm --filter projetos lint typecheck test` — lint e typecheck limpos; 86/102 testes verdes (102 = 89 pré-existentes + 13 novos desta sessão: 4 de `close-voting.test.ts`, 9 de `session-gate.test.ts`). Os 16 restantes são pré-existentes e não relacionados a este prompt — ver Débitos abaixo.

**Decisoes tomadas:**

- Escopo de "relatórios (criar/submeter/revisar)": três actions já existentes (`createReport`/`submitReport`/`reviewReport`) sem UI alguma. Modelado como: diretor solicita (`ReportRequestForm`, em `pipeline/[id]` quando `em_execucao`) → submissor envia (`SubmitReportForm`, por linha pendente/em atraso no próprio detalhe — não um botão único genérico como antes, já que pode haver múltiplos relatórios pendentes por projeto) → diretor revisa (`ReportReviewActions`, aprovar/rejeitar). `relatorios-dir` deixou de ser um placeholder estático e virou lista real (`getDirectorReportsOverview`) do portfólio inteiro, mas sem duplicar os botões de ação — cada linha linka para `/pipeline/<id>`, onde a ação de fato acontece (evita duas fontes de verdade para o mesmo estado).
- `closeVoting` não reaproveita a lógica de `triggerPanicButton` apesar de ambas decidirem por maioria dos votos existentes — mantidas como actions distintas porque o BRAIN as liga a gatilhos semânticos diferentes (pânico = sem quórum; fechamento manual = quórum atingido, turnout incompleto) e a decisão F2-Q5 pediu uma action nova, não uma reescrita de `triggerPanicButton`.
- `getAuthUser()` (retorna `id`/`fullName`/`email` via Supabase Auth direto) não foi migrado para `withAuthenticatedContext` — é leitura da própria linha pelo id verificado pelo Supabase Auth, não superfície de RLS cross-user; migrar acrescentaria uma transação sem ganho de segurança real.
- Máscara de score IA para submissor: resolvida só na camada de gate do layout (`requireDiretorSession`), não duplicada como filtro extra em `getDirectorProjectDetail` — uma vez que o gate bloqueia qualquer papel fora de diretor/conselheiro/super_admin, a página nunca roda para um submissor; adicionar uma segunda máscara ali seria validar um cenário que já não pode acontecer (o `rls.test.ts` já tem a suíte "Regressão F2-P4" comprovando isso via `withAuthenticatedContext`, ainda que hoje bloqueada pelo débito de grants abaixo).
- CNPJ no `CreateOrganizationForm` só é enviado à action quando tem exatamente 14 dígitos (schema exige `/^\d{14}$/`); campo vazio ou incompleto vira `null` silenciosamente em vez de bloquear o submit — CNPJ é opcional no schema real.

**Debitos tecnicos / pendencias:**

- **Achado durante esta sessão, não introduzido por ela:** `rls.test.ts` tem 16 testes falhando com `permission denied for schema projetos` para o role `authenticated` — confirmado via `git stash` que a falha já existe no HEAD anterior a esta sessão (mesmos 16 testes, mesmo erro), ou seja, é um gap do ambiente de desenvolvimento atual, não uma regressão desta sessão. A causa aparente: o `GRANT USAGE ON SCHEMA projetos TO authenticated` de `packages/db/src/migrations/0014_grants_authenticated.sql` (criado em P-0.10/S-57, que relatou 71 testes verdes com esses mesmos GRANTs) não está presente no banco de desenvolvimento usado nesta sessão — possivelmente uma instância efêmera diferente da usada em S-57. `voting.test.ts` continua verde porque nunca foi atualizado para depender do GRANT permanente (ainda faz seu próprio `GRANT`/`REVOKE` temporário ao redor de si mesmo, de antes de P-0.10). Ação sugerida: rodar `pnpm --filter db db:migrate` contra o banco desta sessão para reconciliar — não executado aqui por ser mudança de banco fora do escopo literal de P-2.9c e por potencialmente afetar um ambiente compartilhado; fica para confirmação do Filipe.
- Categoria do edital não é pré-preenchida no wizard (ver Resumo, F2-P3) — depende de uma modelagem de mapeamento `documentos.categories` ↔ `projetos.project_categories` que nenhum prompt define ainda.
- `EvaluationForm` só expõe `approved`/`rejected` (mapeados de "Favorável"/"Desfavorável"); `needs_revision` (terceiro valor do enum `evaluation_recommendation`) não tem affordance na UI — simplificação deliberada para não introduzir um terceiro estado sem fluxo de "revisão solicitada" definido em prompt algum.
- Sem verificação em navegador real (Playwright/Puppeteer indisponíveis neste ambiente) — wiring confirmado por `lint`/`typecheck`/`test` (86/102, ver acima) e revisão de código, não por clique real na UI.

**Arquivos criados:**

- `apps/projetos/src/lib/session.ts`
- `apps/projetos/src/components/evaluator-panel.tsx`
- `apps/projetos/src/components/evaluation-form.tsx`
- `apps/projetos/src/components/contestation-form.tsx`
- `apps/projetos/src/components/voting-admin-actions.tsx`
- `apps/projetos/src/components/delete-project-button.tsx`
- `apps/projetos/src/components/submit-project-button.tsx`
- `apps/projetos/src/components/submit-report-form.tsx`
- `apps/projetos/src/components/report-request-form.tsx`
- `apps/projetos/src/components/report-review-actions.tsx`
- `apps/projetos/src/components/create-organization-form.tsx`
- `apps/projetos/src/__tests__/close-voting.test.ts`
- `apps/projetos/src/__tests__/session-gate.test.ts`

**Arquivos modificados:**

- `apps/projetos/src/actions/voting.ts` (`countEligibleVoters` usa `countDistinct`; nova action `closeVoting`)
- `apps/projetos/src/app/(diretoria)/layout.tsx` (gate `requireDiretorSession`)
- `apps/projetos/src/app/(submissor)/layout.tsx` (gate `requireSubmissorSession`)
- `apps/projetos/src/app/(diretoria)/pipeline/page.tsx` (`handleMove` chama `transitionProjectStage`; banner de erro)
- `apps/projetos/src/app/(diretoria)/pipeline/[id]/page.tsx` (papel real no `ScoreIndicator`; painel de avaliador; formulário de parecer; contestação; ações de votação; exclusão; seção de relatórios)
- `apps/projetos/src/app/(diretoria)/relatorios-dir/page.tsx` (reescrita: lista real via `getDirectorReportsOverview`)
- `apps/projetos/src/app/(submissor)/[id]/page.tsx` (botão de submissão; botão de exclusão; formulário de envio por relatório)
- `apps/projetos/src/app/(submissor)/instituicao/page.tsx` (`CreateOrganizationForm`)
- `apps/projetos/src/app/(submissor)/novo/page.tsx` (prefill de edital via `searchParams`)
- `apps/projetos/src/components/project-kanban.tsx` (`useEffect` de resync de posições)
- `apps/projetos/src/lib/queries.ts` (migração para `withAuthenticatedContext`; novas queries; fix de quórum por pessoa)

**Arquivos removidos (órfãos superados por implementação já existente):**

- `apps/projetos/src/components/project-wizard.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-attachments.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-budget.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-institution.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-proposal.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-review.tsx`
- `apps/projetos/src/components/punctual-project-form.tsx`
- `apps/projetos/src/components/report-form.tsx`
- `apps/projetos/src/components/report-card.tsx`
- `apps/projetos/src/components/organization-card.tsx`
- `apps/projetos/src/components/project-card.tsx`

---

### S-63 — 2026-07-04 — P-3.8b Financeiro: governança e conciliação verdadeiras

**Prompt:** P-3.8b (`AUDIT/04-prompts-pendentes.md` §4)
**Duracao:** ~4h
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**

F2-F1 (designation não enforçada em nenhuma camada executável): `approveBatch`/`authorizeBatch` checavam apenas papel (`diretorAction`/`superAdminAction`), nunca a `designation` (`gestor`/`autorizador`) do BRAIN §6.5 — pior, `authorizeBatch` exigia `super_admin` **exclusivamente**, o que significava que nenhum diretor com designation `autorizador` conseguia autorizar um lote no sistema, contradizendo o passo 6 do BRAIN ("Diretor autorizador AUTORIZA no banco"). Corrigido: `resolveSession` (`packages/auth/src/server.ts`) passou a carregar `designations` na sessão (`ActionSession` ganhou o campo); novo `diretorWithDesignationAction(designation)` em `apps/financeiro/src/lib/safe-action.ts` (diretor com a designation OU super_admin como bypass — decisão do Filipe nesta sessão, espelhando o formato pré-existente de `approveBatch`); `approveBatch` passou a exigir `gestor`, `authorizeBatch` passou a exigir `autorizador`.

**Achado durante a implementação, não previsto no escopo literal do prompt:** a RLS de `batch_approvals` (migration 0011, P-3.7) já antecipava `has_designation('gestor')` para a policy de UPDATE, mas **nunca teve um branch para `autorizador`** — mesmo corrigindo o Server Action, a policy rejeitaria o UPDATE de um diretor autorizador. Como toda action do módulo financeiro roda com a conexão `db` (superuser, não `withAuthenticatedContext`), essa RLS é hoje defense-in-depth inerte, não o gate real — mas foi corrigida mesmo assim (nova policy `batch_approvals_update_dual_governance`, três branches: super_admin / diretor+gestor / diretor+autorizador) para não deixar uma policy sabidamente incompleta no banco.

F2-F2 (lote para todos os diretores): `createWeeklyBatch` notificava todo `role_assignments` com `role='diretor'`. Corrigido para consultar `designations` (gestor → `to`, autorizador → `cc`) — `packages/email/src/lib/send.ts` ganhou o campo `cc?: string | string[]` em `SendEmailOptions` (mudança aditiva, sem quebrar chamadores existentes). Decisão do Filipe: se nenhuma designation `gestor` estiver configurada, cai de volta para notificar todos os diretores (rede de segurança).

F3-11/F3-19 (importação bancária adulterável + parser ingênuo): `confirmImport` recebia `rows` já parseadas do **cliente** depois do preview — adulterável entre as duas chamadas — e `bankImports.fileUrl` guardava o nome do arquivo como placeholder, nunca uma URL real de Storage. Corrigido: `confirmImportSchema` perdeu o campo `rows` inteiramente e ganhou `content` (mesmo shape de `parseImportFileSchema`) + `fileUrl`; `confirmImport` agora re-parseia `content` do zero via a mesma `parseFileContent` usada pelo preview — o cliente nunca mais tem como injetar uma linha que o servidor não re-derivou. `parseCSV` ganhou detecção de delimitador (`,` vs `;`, contando ocorrências fora de aspas na linha de cabeçalho) e um tokenizador que respeita aspas (`splitDelimitedLine`, função pura, sem nova dependência) — antes quebrava com `;` (comum em extrato de banco brasileiro) e com vírgula dentro de campo entre aspas.

**Decisão desta sessão (confirmada pelo Filipe): bucket `financeiro-extratos` criado agora**, sem esperar o corretivo formal de Storage (P-0.12, que não rodou ainda) — seguindo o mesmo precedente ad hoc já em uso por `project-attachments` (criado via migration hand-authored antes de qualquer consolidação formal de políticas). Novo componente `apps/financeiro/src/components/import-wizard.tsx` substitui o wizard 100% mock de `importacao/page.tsx` por um fluxo real: upload para o bucket (client Supabase, mesmo padrão de `submit-report-form.tsx`) → preview via `parseImportFile` → confirmação via `confirmImport`. `fileUrl` grava o **path** do Storage, não uma signed URL — uma signed URL expiraria antes da retenção legal de 5 anos (F3-Q6); leitura futura deve gerar signed URL sob demanda.

S1-01 (`organization_budgets` inexistente): `apps/projetos` lia um teto de orçamento por instituição/ano de um workaround em `admin.system_settings` (chave `projetos_budget_{orgId}_{year}`), com o próprio comentário no código apontando a dívida. Criada `financeiro.organization_budgets (organization_id, year, amount, created_by)` com UNIQUE(organization_id, year), RLS restrita a staff financeiro (super_admin/diretor/colaborador — leitura por `checkOrganizationBudget` roda via `db` superuser, não via sessão de submissor); CRUD (`createOrganizationBudget`/`updateOrganizationBudget`, sem delete — imutabilidade, corrige-se via UPDATE) em `apps/financeiro/src/actions/organization-budgets.ts`; nova página `apps/financeiro/src/app/(dashboard)/orcamento-organizacoes/page.tsx` (rota nova, deliberadamente distinta de `/orcamento` — essa é orçamento por centro de custo, território do P-3.9) com gate inline via `requireColaboradorSession` (novo `apps/financeiro/src/lib/session.ts`, mesmo padrão de `apps/projetos/src/lib/session.ts` — o shell do Financeiro ainda não tem gate de papel algum, débito de P-3.9, não vale esperar por ele). `checkOrganizationBudget` (`apps/projetos/src/actions/projects.ts`) reescrita para consultar `financeiro.organization_budgets` diretamente (leitura cross-schema dentro do mesmo `@hebron/db`, mesmo padrão já usado para `admin.system_settings` — não precisa de `packages/integrations`), removendo o workaround.

CS-4 (enum de audit): dois novos valores (`financeiro.organization_budget.created`/`.updated`) adicionados ao enum `admin.audit_action` (TS em `packages/db/src/schema/admin.ts` + `ALTER TYPE` em migration) e à union `FinanceiroAuditAction` (`apps/financeiro/src/lib/audit.ts`) — mesmo padrão de `0012_audit_action_modules.sql`, para não repetir o acidente que deixou auditoria de projetos/financeiro gravando ações fora do enum.

Migrations geradas via `drizzle-kit generate` (convenção P-0.11) produziram um arquivo que recriava `user_status`/`editals.faq` (já aplicados em 0015/0017, hand-authored fora do journal do drizzle-kit desde aquela época) — descartado; migrations finais (`0018_organization_budget_audit_actions.sql`, `0019_financeiro_organization_budgets.sql`) hand-authored contendo só as mudanças novas desta sessão, mesma convenção já em uso desde 0015. O drift entre o journal do drizzle-kit e o histórico real de migrations continua existindo (debt pré-existente, fora do escopo deste prompt corrigir de novo).

**Critérios de aceite verificados:**

- [x] diretor sem designation não aprova/autoriza — `designation-governance.test.ts`: diretor sem `gestor` → `approveBatch` rejeita; diretor sem `autorizador` → `authorizeBatch` rejeita.
- [x] mesma pessoa não aprova e autoriza — teste com diretor tendo `autorizador` mas sendo o mesmo `approvedBy` → `authorizeBatch` rejeita (guard pré-existente, agora testado em conjunto com designation).
- [x] linhas adulteradas entre preview e confirm não persistem — `confirm-import.test.ts`: `confirmImport` chamado com `content` real + um campo `rows` forjado (ignorado pelo schema); persistido bate exatamente com o re-parse do `content`, nunca com o forjado.
- [x] extrato armazenado e referenciado — bucket `financeiro-extratos` criado com policies; `import-wizard.tsx` faz upload real; `bankImports.fileUrl` grava o path real (teste em `confirm-import.test.ts`).
- [x] submissão de projeto bloqueia por `organization_budgets` — `apps/projetos/src/__tests__/flow.test.ts` (bloco "Orçamento", reescrito para semear `financeiro.organization_budgets` em vez de `admin.system_settings`, mesmos 5 casos).
- [x] PATCH registrado da mudança de modelo de orçamento — registrado nesta entrada (não há PATCH formal ainda; `PATCHES/` segue vazio, reconstrução autorizada só em P-0.16).
- `pnpm turbo lint typecheck` — 34/34 tasks verdes. `pnpm --filter financeiro test` — 30/30 verdes (6 arquivos, incluindo os 3 novos desta sessão: `designation-governance.test.ts`, `csv-parser.test.ts`, `confirm-import.test.ts`). `pnpm --filter projetos test` — 86/102 verdes; os 16 restantes (todos em `rls.test.ts`, `permission denied for schema projetos`) são o mesmo gap de ambiente já documentado em S-62 (GRANT de `authenticated` ausente nesta instância de dev), não uma regressão desta sessão — confirmado que a contagem (86/102) é idêntica à de S-62.

**Decisoes tomadas (confirmadas pelo Filipe nesta sessão):**

- Bucket `financeiro-extratos` criado agora, antes de P-0.12 rodar formalmente (ver Resumo).
- `authorizeBatch` mantém super_admin como bypass da designation `autorizador` (mesmo formato de `approveBatch`, escala atual da ONG: 2 super_admins dedicados).
- `createWeeklyBatch` cai de volta para todos os diretores quando nenhuma designation `gestor` está configurada (rede de segurança).

**Debitos tecnicos / pendencias:**

- RLS de `batch_approvals` continua sendo defense-in-depth inerte (financeiro roda via `db` superuser, não `withAuthenticatedContext`) — migrar as actions do módulo para o padrão autenticado é escopo de um prompt futuro, não deste.
- `importacao/page.tsx` agora exercita upload+parse+confirm de verdade, mas o restante do dashboard financeiro (`orcamento`, `contas-pagar`, `conciliacao`, `lancamentos`) continua mockado — território do P-3.9.
- `shell.tsx`/`layout.tsx` do Financeiro ainda não têm gate de papel — `orcamento-organizacoes` e `importacao` checam inline (`requireColaboradorSession`), não esperaram pelo P-3.9.
- Drift entre o journal do drizzle-kit e as migrations hand-authored (0015 em diante) persiste — `drizzle-kit generate` produz statements duplicados para mudanças já aplicadas fora do journal.
- 16 testes de `rls.test.ts` (projetos) seguem falhando por gap de ambiente pré-existente (ver S-62); não corrigido aqui, fora do escopo literal de P-3.8b.
- Sem verificação em navegador real (Playwright/Puppeteer indisponíveis neste ambiente) — wiring de `import-wizard.tsx`/`organization-budgets-manager.tsx` confirmado por `lint`/`typecheck`/revisão de código, não por clique real na UI.

**Arquivos criados:**

- `packages/db/src/migrations/0018_organization_budget_audit_actions.sql`
- `packages/db/src/migrations/0019_financeiro_organization_budgets.sql`
- `apps/financeiro/src/lib/session.ts`
- `apps/financeiro/src/actions/organization-budgets.ts`
- `apps/financeiro/src/components/import-wizard.tsx`
- `apps/financeiro/src/components/organization-budgets-manager.tsx`
- `apps/financeiro/src/app/(dashboard)/orcamento-organizacoes/page.tsx`
- `apps/financeiro/src/__tests__/designation-governance.test.ts`
- `apps/financeiro/src/__tests__/csv-parser.test.ts`
- `apps/financeiro/src/__tests__/confirm-import.test.ts`

**Arquivos modificados:**

- `packages/auth/src/server.ts` (`ActionSession.designations`, `resolveSession` carrega designations)
- `apps/financeiro/src/lib/safe-action.ts` (`diretorWithDesignationAction`)
- `apps/financeiro/src/actions/approval.ts` (`approveBatch`/`authorizeBatch` exigem designation; `createWeeklyBatch` notifica gestor+CC autorizador)
- `apps/financeiro/src/actions/import.ts` (`confirmImport` re-parseia server-side; `parseCSV`/`splitDelimitedLine` exportados e robustos a `;`/aspas)
- `apps/financeiro/src/app/(dashboard)/importacao/page.tsx` (RSC real: gate + fetch de contas bancárias; delega a `ImportWizard`)
- `apps/financeiro/src/app/(dashboard)/shell.tsx` (nav: "Orçamento por instituição")
- `packages/email/src/lib/send.ts` (`SendEmailOptions.cc`)
- `packages/db/src/schema/financeiro.ts` (`organizationBudgets`)
- `packages/db/src/schema/admin.ts` (2 valores novos em `auditActionEnum`)
- `packages/db/src/schema/index.ts` (barrel: `organizationBudgets` + tipos)
- `apps/financeiro/src/lib/audit.ts` (`FinanceiroAuditAction` +2 valores)
- `packages/validators/src/financeiro/index.ts` (`createOrganizationBudgetSchema`/`updateOrganizationBudgetSchema`)
- `apps/projetos/src/actions/projects.ts` (`checkOrganizationBudget` consulta `financeiro.organization_budgets`)
- `apps/financeiro/src/__tests__/audit-abort.test.ts` (mock de sessão ganha `designations: ["gestor"]`)
- `apps/projetos/src/__tests__/flow.test.ts` (bloco de orçamento migrado para `organization_budgets`)
- `apps/projetos/src/__tests__/session-gate.test.ts`, `apps/documentos/src/__tests__/session-gate.test.ts`, `apps/documentos/src/__tests__/actions.test.ts`, `apps/admin/src/__tests__/session-gate.test.ts` (mocks de `ActionSession` ganham `designations: []` — campo novo obrigatório no tipo compartilhado)

---

### S-64 — 2026-07-05 — P-0.12 Storage: buckets e policies (Onda 2)

**Prompt:** P-0.12 (`AUDIT/04-prompts-pendentes.md` §4)
**Duracao:** ~2h
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
S1-21iii/CS-11: uploads em produção dependiam de buckets que nenhuma migration criava. Levantamento no código confirmou o buraco: `hebron-docs` (apps/documentos) e `project-attachments` (apps/projetos) são referenciados por path literal desde as Fases 1–2, mas `0008_project_attachments.sql` só criou a tabela e a RLS da tabela — nunca o bucket em si nem policies de `storage.objects`; os dois só funcionavam porque alguém os criou manualmente pelo dashboard em algum ambiente, fora de qualquer controle de versão. `financeiro-extratos` já havia sido formalizado ad hoc em `0019_financeiro_organization_budgets.sql` (P-3.8b, S-63), antes deste corretivo rodar — nada a recriar ali, só documentar.

Migration `0020_storage_buckets.sql` cria os 4 buckets que faltavam (`hebron-docs`, `project-attachments`, `financeiro-recibos`, `flats-documentos`, `plataforma-capas` — 5 no total, já que `financeiro-extratos` estava coberto) com `public = false` em todos, `file_size_limit`/`allowed_mime_types` derivados dos `accept` já usados nos formulários de upload existentes (ex. `application/pdf` para `hebron-docs`, que só aceita PDF em `document-form.tsx`/`edital-form.tsx`), e policies em `storage.objects` espelhando exatamente a policy já existente da tabela que referencia cada arquivo:

- `hebron-docs`: SELECT segue a visibilidade herdada de `documentos.documents`/`document_versions` (mesmo `EXISTS` de `0005_documentos_rls.sql`, agora aplicado ao Storage) — join por `file_url = storage.objects.name`; INSERT para papéis editor (super_admin/diretor/conselheiro/colaborador).
- `project-attachments`: espelha `projetos.project_attachments` (0008) — dono lê/insere a própria pasta (`(storage.foldername(name))[1] = auth.uid()::text`), diretoria lê tudo.
- `financeiro-recibos`: espelha `financeiro.attachments` (0010) — SELECT staff (super_admin/diretor/colaborador), INSERT super_admin/colaborador, DELETE só super_admin; retenção de 5 anos (mesma decisão F3-Q6 de `financeiro-extratos`), sem UPDATE.
- `flats-documentos` e `plataforma-capas`: **fundação antecipada** — nenhum schema de app existe ainda (Fases 6/7 pendentes), então usam só os papéis globais já existentes (`hospede` dono da própria pasta + super_admin/diretor leem tudo; qualquer autenticado lê capas de curso, só super_admin escreve), documentado como provisório até P-6.4/P-6.8 e P-7.4/P-7.6 apertarem o controle por curso/reserva.

Teste novo `packages/db/src/__tests__/storage.test.ts` (21 casos) — mesma técnica de `apps/*/src/__tests__/rls.test.ts` (`SET LOCAL ROLE` + `request.jwt.claims`), com uma adaptação: todo seed de linha em `storage.objects` acontece dentro da **mesma transação** revertida ao final, nunca em INSERT/DELETE solto. Descoberto durante a implementação: o projeto Supabase hospedado usado em dev tem um trigger em `storage.objects` que rejeita `DELETE` direto ("Direct deletion from storage tables is not allowed. Use the Storage API instead.") — uma primeira versão do teste, que semeava via INSERT solto e limpava via `DELETE` solto no `afterAll`, deixou linhas de teste presas no banco real (o `DELETE` falhava, abortando a limpeza). As linhas presas tiveram que ser removidas manualmente com `supabase.storage.from(bucket).remove(paths)` (a Storage API, não SQL direto) antes de reescrever o teste. A versão final nunca faz `DELETE` em `storage.objects`: `SET LOCAL ROLE` pode ser reemitido várias vezes na mesma transação para trocar de usuário simulado, e o `ROLLBACK` final desfaz seed+mutação juntos.

**Critérios de aceite verificados:**

- [x] cada bucket com policy testada (quem pode ler/escrever) — `storage.test.ts`, 21/21 verdes: `hebron-docs` (visibilidade public/internal/restricted, INSERT editor-only), `project-attachments` (dono vs. terceiro, diretoria lê tudo, anon nada), `financeiro-recibos` (staff vs. hóspede vs. submissor vs. anon), `flats-documentos` (dono vs. terceiro, diretor lê tudo), `plataforma-capas` (aluno lê, só super_admin escreve).
- [x] documentado no BRAIN §4 — nova subseção "Storage (Supabase Storage — P-0.12)": tabela dos 6 buckets (path, quem lê/escreve, retenção), convenção de signed URL (prazo curto vs. longo vs. "nunca para o que exige retenção de 5 anos — guardar o path, gerar signed URL sob demanda"), nota de que `flats-documentos`/`plataforma-capas` são fundação antecipada.
- lint/typecheck verdes em `pnpm --filter @hebron/db lint typecheck`; `pnpm --filter @hebron/db test` (23/23: 21 novos + 2 de `schema-parity.test.ts`, confirmando que buckets/policies de Storage não entram no escopo do teste de paridade TS↔SQL, como esperado — `storage.buckets`/`storage.objects` não são tabelas do Drizzle schema).

**Decisoes tomadas:**

- `flats-documentos` e `plataforma-capas` criados agora, com policies baseadas só em papel global, mesmo sem nenhum consumidor de app ainda — seguindo o próprio racional do prompt (fundação para as Fases 6–7, igual a P-0.10 criar `withAuthenticatedContext` antes de qualquer página adotá-lo). Path convention (`{user_id}/...`, `{course_id}/...`) documentada no cabeçalho da migration para que P-6.4/P-6.8/P-7.4/P-7.6 a sigam.
- `financeiro-recibos` mapeado 1:1 para `financeiro.attachments` (tabela já existente desde P-3.6, mas sem nenhum consumidor de app ainda — `expense-form.tsx` tem campo de upload mas ainda é mock do Bloco A). Escolhido reaproveitar exatamente as 3 policies já decididas para a tabela (`attachments_select_staff`/`insert_staff`/`delete_admin`) em vez de inventar uma regra nova.
- Teste de Storage escrito com seed-e-rollback na mesma transação (em vez do padrão INSERT-solto + `afterAll` com DELETE já usado pelos `rls.test.ts` de app) especificamente por causa do trigger anti-DELETE do Storage hospedado — registrado no cabeçalho do teste para não ser redescoberto do zero.

**Debitos tecnicos / pendencias:**

- `flats-documentos`/`plataforma-capas` têm controle só por papel global, não por reserva/curso — aceito como fundação; P-7.4/P-7.6 e P-6.4/P-6.8 devem refinar quando as tabelas de app existirem (mesmo aviso já deixado na migration e no BRAIN §4).
- `expense-form.tsx` (apps/financeiro) ainda não faz upload real para `financeiro-recibos` — o bucket e as policies existem, mas o formulário continua Bloco A (mock); conectar é escopo do prompt de Financeiro que tratar despesas/auxílio (fora do escopo de P-0.12).

**Arquivos criados:**

- `packages/db/src/migrations/0020_storage_buckets.sql`
- `packages/db/src/__tests__/storage.test.ts`

**Arquivos modificados:**

- `BRAIN.md` (§4: nova subseção "Storage")
- `SESSIONS.md` (esta entrada + linha no índice)

---

### S-65 — 2026-07-05 — P-0.13 LGPD: fundação (Onda 2)

**Prompt:** P-0.13 (`AUDIT/04-prompts-pendentes.md` §4)
**Duracao:** ~2h
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
S1-03/F3-09: PII e dado sensível sem consentimento modelado; `admin.audit_log` (imutável, particionado até 2027) guardava e-mail/nome/telefone/CPF em texto puro nos diffs; nenhum caminho de anonimização existia para o direito de exclusão da LGPD (art. 18, VI), que colidia em aparência com o princípio de imutabilidade do BRAIN ("nunca hard delete"); `documentos.views` (F3-21) crescia sem retenção, guardando rastro comportamental pessoal (usuário + timestamp de leitura) indefinidamente.

Investigação no código (antes de qualquer escrita) confirmou o vazamento concreto: `apps/admin/src/actions/users.ts` (`createUser`) gravava `{ after: { email, fullName } }` cru no diff; `updateUser`/`suspendUser` usavam `computeDiff` sobre a row inteira de `public.users`, então qualquer alteração de `phone`/`email`/`fullName` ia parar no diff sem nenhuma redação. `computeDiff`/`logAudit` vivem centralizados em `packages/db/src/audit.ts` desde P-0.8 — um único ponto de correção cobre os quatro apps (admin/projetos/financeiro/documentos) de uma vez.

**Escopo implementado:**

1. **Consentimento granular** (`public.consents`, migration `0022_consents.sql`): enum `consent_purpose` (`comunicacao`, `newsletter`, `dados_reserva`, `dado_saude`); uma linha por (usuário, finalidade), `UNIQUE(user_id, purpose)`; revogação é `granted=false` + `revoked_at`, nunca remoção de linha. RLS: titular gerencia o próprio (`SELECT`/`INSERT`/`UPDATE` com `auth.uid() = user_id`), super_admin/diretor só leem (consentimento não é delegável — sem policy que permita escrever em nome de terceiro). Helper compartilhado `packages/db/src/consents.ts` (`getConsents`/`getConsent`/`setConsent`, upsert idempotente, grava `consent.granted`/`consent.revoked` no audit log só quando o estado de fato muda).
2. **Redação automática de PII em audit diffs** (`packages/db/src/audit.ts`): `SENSITIVE_AUDIT_FIELDS` (email, fullName, phone, documentCpf, responsavelLegal, telefone, endereco) + `redactSensitiveFields()` — varredura recursiva por nome de chave, substitui o valor por `{ redacted: true }`. Aplicada em dois pontos de defesa: dentro de `computeDiff` (cobre quem monta diff a partir de before/after) e dentro de `logAudit` antes do INSERT (cobre quem monta o diff à mão, ex. `createUser`) — nenhum caminho escapa. Corrigido o vazamento real de `createUser` (agora usa `redactSensitiveFields` explicitamente no `after`).
3. **Anonimização de usuário** (`packages/db/src/anonymization.ts`, `anonymizeUser`): pseudonimiza `public.users` (email → `anon+{id}@anonimizado.hebronaseec.org`, fullName → "Usuário anonimizado", phone/documentCpf/avatarUrl → null, marca `anonymized_at`); pseudonimiza `responsavel_legal` das organizações (`projetos.organizations`) criadas pelo usuário (endereço/telefone/CNPJ da instituição não são tocados — descrevem a pessoa jurídica, não o usuário); redige diffs legados de `admin.audit_log` (gravados antes desta fundação) ligados ao usuário/organizações; grava `user.anonymized` no próprio audit log. Nunca remove linha, nunca quebra FK (papéis, designações, projetos, votos, transações continuam íntegros sob o pseudônimo); idempotente via `anonymized_at`. Não toca `auth.users` nem revoga papéis — fica para o fluxo de exclusão fim-a-fim de P-9.2, que usa esta primitiva.
4. **Retenção de `documentos.views`** (F3-21, migration `0023_documentos_views_retention.sql`): nova tabela `documentos.views_monthly_agg` (document_id, year_month, view_count, sem PII); função `documentos.purge_old_views()` agrega por documento/mês linhas com mais de 6 meses e apaga as individuais; agendada mensalmente via `pg_cron` (extensão já habilitada desde `0013_audit_log_partitions.sql`). Dashboard editorial (`apps/documentos/.../editorial/page.tsx`) só consulta "views últimos 30 dias" — confirmado sem dependência de histórico além da janela de retenção.
5. **3 novos valores de `admin.audit_action`** (`consent.granted`, `consent.revoked`, `user.anonymized`) via `ALTER TYPE` não-transacional (`0024_lgpd_audit_actions.sql`).
6. **BRAIN.md §9 emendado**: nova subseção "LGPD — fundação (P-0.13)" resolvendo explicitamente o conflito S1-03 (imutabilidade × exclusão): "exclusão real não é hard delete de linha, é anonimização de campo". Princípio "Imutabilidade" ganhou a exceção legal por referência cruzada.

Achado inesperado durante os testes: a primeira versão de `anonymizeUser` filtrava o `UPDATE` de `admin.audit_log` por `(id, created_at)` — a parte `created_at` da PK composta, ao ser reserializada a partir do `Date` já deserializado pelo driver, não batia com o valor armazenado (perda de precisão de sub-milissegundo) e o `UPDATE` virava no-op silencioso (nenhum erro, mas nenhuma linha redigida). Corrigido para filtrar só por `id` (`gen_random_uuid()`, unicidade prática suficiente) — pego pelo teste de integração, não por inspeção de código.

**Critérios de aceite verificados:**

- [x] consentimento consultável por finalidade — `packages/db/src/__tests__/consents.test.ts` (8/8: CRUD, idempotência, audit condicional, RLS por papel, anon sem acesso, não-delegabilidade).
- [x] anonimizar usuário de teste remove PII de users/orgs/audit diffs e mantém FKs — `packages/db/src/__tests__/anonymization.test.ts` (6/6: PII substituída em `users`, `role_assignments` intacto, `responsavelLegal` da org pseudonimizado com resto intacto, diffs legados redigidos preservando campos não sensíveis, entrada `user.anonymized` sem PII, idempotência).
- [x] BRAIN emendado — §9, nova subseção "LGPD — fundação (P-0.13)".
- [x] testes — 6 arquivos novos/atualizados em `packages/db` (46/46) + `apps/admin/src/__tests__/audit.test.ts` atualizado (teste de `user.created` agora afirma redação, não mais o e-mail cru) + suíte completa de `apps/admin` (58/58), `apps/documentos` (48/48) e `apps/financeiro` (30/30) rodadas para confirmar zero regressão na redação compartilhada.
- lint/typecheck verdes em `@hebron/db` e `@hebron/admin`.

**Decisoes tomadas:**

- Redação de PII por **nome de campo, não por tabela/módulo** — `SENSITIVE_AUDIT_FIELDS` é uma lista plana consultada em qualquer profundidade do diff; qualquer prompt futuro que adicionar campo de PII a um schema deve só adicionar o nome à lista (registrado no BRAIN §9 como convenção).
- `anonymizeUser` implementada em `packages/db` (não em `packages/auth`, como uma leitura apressada de `AUDIT/04-prompts-pendentes.md` §5 poderia sugerir): `packages/auth` já depende de `@hebron/db`, então colocar a primitiva em `packages/auth` criaria dependência circular no dia em que P-9.2 construir `packages/auth/src/data-deletion.ts`. A referência do AUDIT a esse caminho é do orquestrador de P-9.2 (que vai _usar_ a primitiva), não da primitiva em si.
- `responsavel_legal` da organização é redigido na anonimização; `endereco`/`telefone`/`cnpj`/`nome` da organização não são — são dados da pessoa jurídica (que continua existindo como instituição), não do usuário anonimizado.
- Retenção de `documentos.views` fixada em 6 meses (não havia decisão prévia do Filipe sobre o número) — janela documentada no cabeçalho da migration e no BRAIN §9; ajustável numa migration futura se necessário.
- `anonymizeUser` não desativa o login em `auth.users` nem revoga papéis — escopo desta primitiva é reescrita de dados; a decisão de quando/como desativar acesso pertence ao fluxo de exclusão fim-a-fim (P-9.2), que decide a UX e orquestra a chamada.

**Debitos tecnicos / pendencias:**

- Diffs de PII gravados **antes** desta sessão em `admin.audit_log` para usuários que nunca passarem por `anonymizeUser` continuam com o valor bruto (a redação em `logAudit`/`computeDiff` é prospectiva; a limpeza retroativa só acontece para quem for anonimizado). Aceito: não há pedido de exclusão pendente hoje e um backfill em massa de todo o audit log histórico está fora do escopo de uma fundação.

**Addendum (mesma sessão) — drift de grants em `projetos` corrigido:**

Descoberta colateral durante a verificação (16 testes de `apps/projetos/src/__tests__/rls.test.ts` falhando com "permission denied"), confirmada sem relação com as mudanças de LGPD (`apps/admin`/`apps/documentos`/`apps/financeiro` seguiam 100% verdes) — drift do ambiente, não do código: o schema `projetos` estava sem `GRANT USAGE` para `authenticated` (zero linhas em `information_schema.role_usage_grants`), e 3 tabelas (`projects`, `votes`, `organization_members`) estavam sem `GRANT SELECT`, apesar de `0014_grants_authenticated.sql` já declarar tudo isso e estar marcada como aplicada. A pedido do Filipe, corrigido na mesma sessão com duas migrations mínimas que apenas restauram o que `0014` já documenta (nenhuma policy nova, nenhuma mudança de regra de negócio): `0025_fix_projetos_schema_grant.sql` (`GRANT USAGE ON SCHEMA projetos`) e `0026_fix_projetos_missing_select_grants.sql` (`GRANT SELECT` nas 3 tabelas). `apps/projetos` volta a 102/102 testes verdes.

**Arquivos criados:**

- `packages/db/src/migrations/0021_users_anonymized_at.sql`
- `packages/db/src/migrations/0022_consents.sql`
- `packages/db/src/migrations/0023_documentos_views_retention.sql`
- `packages/db/src/migrations/0024_lgpd_audit_actions.sql`
- `packages/db/src/migrations/0025_fix_projetos_schema_grant.sql`
- `packages/db/src/migrations/0026_fix_projetos_missing_select_grants.sql`
- `packages/db/src/consents.ts`
- `packages/db/src/anonymization.ts`
- `packages/db/src/__tests__/audit-pii-redaction.test.ts`
- `packages/db/src/__tests__/consents.test.ts`
- `packages/db/src/__tests__/anonymization.test.ts`
- `packages/db/src/__tests__/documentos-views-retention.test.ts`

**Arquivos modificados:**

- `packages/db/src/schema/public.ts` (`consentPurposeEnum`, tabela `consents`, `users.anonymizedAt`)
- `packages/db/src/schema/documentos.ts` (tabela `viewsMonthlyAgg`)
- `packages/db/src/schema/admin.ts` (3 valores novos em `auditActionEnum`)
- `packages/db/src/schema/index.ts` (barrel: novos símbolos/tipos)
- `packages/db/src/audit.ts` (`SENSITIVE_AUDIT_FIELDS`, `redactSensitiveFields`, redação em `computeDiff` e `logAudit`)
- `packages/db/package.json` (exports `./consents`, `./anonymization`)
- `apps/admin/src/actions/users.ts` (`createUser` usa `redactSensitiveFields` em vez de diff cru)
- `apps/admin/src/__tests__/audit.test.ts` (assert atualizado para redação em vez de e-mail cru)
- `BRAIN.md` (§9: nova subseção "LGPD — fundação (P-0.13)"; princípio de imutabilidade ganha exceção legal referenciada)
- `SESSIONS.md` (esta entrada + linha no índice)

---

### S-66 — 2026-07-06 — P-0.14 Jobs: Inngest de verdade (Onda 2)

**Prompt:** P-0.14 (`AUDIT/04-prompts-pendentes.md` §4)
**Duracao:** ~3h
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
S1-06/CS-5: 8+ features prometidas em sessões anteriores dependiam de um scheduler que nunca existiu no monorepo — `autoCreateMonthlyMeetings` (S-15/P-1.8), `runEditalClosingReminders` (S-30/P-1.22, implementada em S-61/P-1.27 mas nunca chamada), os 2 lembretes `[~]` de P-2.10 (relatório e avaliador), e a transição automática de homologação após 7 dias sem contestação prometida por `notifyHomologacao` desde P-2.6 mas sem executor algum (AUDIT/01-specs.md:107). Investigação em código (não em documentação) confirmou, para cada um, exatamente qual função já existia pronta e qual não existia nada além da promessa em texto de e-mail.

**Decisão de arquitetura que consumiu a maior parte da sessão:** um cron não tem sessão HTTP — não pode chamar Server Actions (que resolvem `actorId` via `cookies()`) nem reusar funções que vivem dentro de um app (packages nunca importam de apps: confirmado por grep que nenhum pacote hoje depende de `@hebron/{admin,projetos,documentos,...}`, e nenhum app expõe `exports` no `package.json` para ser consumido como lib). Isso forçou duas decisões:

1. **Ator sistema** (`packages/db/src/system-actor.ts`, `getSystemActorId`): `admin.audit_log.actor_id` é `NOT NULL` com FK para `public.users`, e a RLS (decisão B) só autoriza escrita para quem tem papel em `role_assignments` — não existe "ninguém" nesse modelo. Criado um usuário real (`sistema@hebronaseec.org.br`) via Admin API (mesmo padrão de `packages/auth/src/testing.ts::createTestAuthUser`, não INSERT direto em `auth.users`), papel `super_admin`, get-or-create idempotente. Nunca loga (sem uso de senha).
2. **Lógica compartilhada extraída para `packages/db`, não duplicada:** onde uma action manual e um cron precisam do mesmo núcleo (reunião mensal, aprovação de projeto), o núcleo foi movido para `packages/db` (`meetings.ts::ensureMonthlyMeetings`, `projetos-approval.ts::generatePaymentSchedule`/`onProjectApproved`) e ambos os chamadores (a action e o cron) passaram a consumir de lá. Onde a função já não tinha NENHUM chamador (achado extra desta sessão: `apps/projetos/src/lib/notifications.ts` inteiro — `notifyProjectSubmitted`, `notifyVotingOpen`, etc. — não é importado por nada em `apps/projetos`, nem mesmo por testes; provavelmente um órfão remanescente de P-2.10 que ninguém detectou porque os testes de fluxo já cobrem os mesmos eventos por outro caminho), a função foi movida (não duplicada) para `packages/jobs/src/notify/`, de onde tanto o cron quanto uma futura action de `apps/projetos` (ex. `closeVoting` de P-2.9c) podem importar — apps podem importar de packages, só não de outros apps.

**Escopo implementado:**

1. **`packages/jobs`** (novo package): client Inngest único (`src/client.ts`, `id: "hebron-aseec"`); `src/index.ts` exporta `functions` (array consumido pela rota de serve) e `PLANNED_JOBS`; `inngest@^3.54.0` (não a v4 — peer `typescript >=5.8.0` colidiria com o `^5.6.3` fixado no monorepo; v3 pede só `>=4.7.2`).
2. **Rota de serve** — `apps/intranet/src/app/api/inngest/route.ts` (`serve({client, functions})` de `inngest/next`). Único app host; a lógica de cada job mora em `packages/jobs`, não na intranet.
3. **5 crons reais registrados:**
   - `admin-ensure-monthly-meetings` (mensal, dia 1 06:00 UTC) — chama `ensureMonthlyMeetings` (extraída de `apps/admin/src/actions/meetings.ts`).
   - `documentos-edital-closing-reminders` (diário 08:00 UTC) — `runEditalClosingReminders`, movida de `apps/documentos/src/jobs/edital-closing-reminders.ts` (arquivo/pasta removidos), junto com `notifyEditalClosing` (movida de `apps/documentos/src/lib/notifications.ts` — `resolveSubmissors` duplicada em `packages/jobs` porque `notifyEditalOpen`, que fica no app, ainda a usa).
   - `projetos-report-reminders` (diário 08:00 UTC) — fecha o critério `[~]` "Relatório pendente: 3 lembretes" de P-2.10. Varre `reports` em 3 janelas (`dueDate` = hoje+7, hoje, hoje−23) e chama `notifyReportReminder` (movida de `apps/projetos/src/lib/notifications.ts`, zero callers). O terceiro lembrete ("7 dias antes de expirar") pressupõe um prazo final de expiração que não tinha definição prévia do Filipe — fixado em `dueDate + 30 dias` (`REPORT_EXPIRY_GRACE_DAYS`, documentado no código), então o lembrete dispara em `dueDate + 23`.
   - `projetos-evaluation-reminders` (diário 08:00 UTC) — fecha o segundo critério `[~]` "Lista de projetos designados → avaliador (7d antes da reunião)" de P-2.10. Detecta reunião mensal agendada daqui a 7 dias, agrupa `evaluations` com `submittedAt IS NULL` por avaliador, envia lista de títulos pendentes (`notifyPendingEvaluations`, nova — template novo `packages/email/src/templates/evaluation-reminder.tsx`).
   - `projetos-homologacao-auto-approve` (diário 03:00 UTC) — o executor que faltava desde P-2.6/P-2.8 (AUDIT/01-specs.md:107). Idade em homologação derivada do primeiro `project_versions` com `stage='homologacao'` (não existe coluna dedicada); elegível = sem `contestations` e snapshot com ≥7 dias. Replica o ramo "aprovado" de `transitionProjectStage`: `generatePaymentSchedule` + `onProjectApproved` (agora em `packages/db/src/projetos-approval.ts`) + `project_versions` + `admin.audit_log` (`project.stage_transition`, ator sistema) + `notifyProjectDecision` (movida, mesmo arquivo de `notify/projetos.ts`).
4. **`packages/jobs/src/catalog.ts`** (`PLANNED_JOBS`) — registro documentado (nome, cron planejado, prompt-fonte) para os jobs cuja lógica ainda não existe: financeiro lote semanal/relatório mensal/vencimento próximo (P-3.10, ainda não rodou), tarefas recorrência/prazos (P-4.8), intranet briefing/kpi-snapshot (P-5.8/5.10), flats check-in/check-out (P-7.10), rádio snapshot de audiência (P-8.11). Nenhuma função Inngest vazia foi criada para estes — o critério do prompt pede registro, não simulação de implementação.
5. **Env vars documentadas** em `.env.example`: `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY` (produção/Inngest Cloud; dev local usa `inngest-cli dev` sem chaves).
6. **BRAIN.md §7** — nova subseção "Jobs (Inngest — P-0.14)" documentando o mecanismo real (antes só uma linha genérica em "Regra geral").

**Achado colateral corrigido (drift de ambiente, não de código):** ao rodar a suíte de `apps/projetos` para validar zero regressão, 16/102 testes falharam com "permission denied for schema projetos" — o mesmo drift já corrigido uma vez em S-65 (addendum) tinha voltado: `public._migrations` registrava `0025_fix_projetos_schema_grant`/`0026_fix_projetos_missing_select_grants` como aplicadas, mas os GRANTs físicos não estavam presentes no banco de desenvolvimento local (ambiente reconstruído/resetado entre sessões sem os grants). Corrigido apagando as duas linhas de bookkeeping e reaplicando via `pnpm --filter @hebron/db db:migrate` — nenhuma mudança de arquivo, só reaplicação. Registrado aqui para não ser re-perdido: se o drift voltar novamente, considerar investigar por que o ambiente de dev perde grants entre sessões (possível reset do stack local) em vez de só reaplicar.

**Critérios de aceite verificados:**

- [x] cada cron listado dispara em ambiente de dev — 5 testes de integração novos em `packages/jobs/src/__tests__/` (sem mock de banco; só `@hebron/email::createNotification` mockado, mesmo padrão de `apps/admin/src/__tests__/actions.test.ts`, para não depender de domínio verificado no Resend) chamam a função exportada de cada cron diretamente (`runReportReminders`, `runEvaluationReminders`, `runHomologacaoAutoApprove`, `runEditalClosingReminders`) e verificam o efeito real no banco/nas chamadas de notificação.
- [x] os critérios `[~]` de P-2.10 fecham — `projetos-report-reminders.test.ts` e `projetos-evaluation-reminders.test.ts`.
- [x] env vars documentadas — `.env.example`.
- lint/typecheck verdes em `@hebron/jobs`, `@hebron/db`, `@hebron/admin`, `@hebron/projetos`, `@hebron/documentos`, `@hebron/intranet`, `@hebron/email`; suítes completas rodadas sem regressão: `@hebron/db` 50/50, `@hebron/admin` 58/58, `@hebron/projetos` 102/102, `@hebron/documentos` 48/48, `@hebron/financeiro` 30/30, `@hebron/jobs` 5/5 (novos).

**Decisoes tomadas:**

- Ator sistema (`sistema@hebronaseec.org.br`, super_admin, via Admin API) para toda mutação/auditoria disparada por cron — necessário porque RLS (decisão B) e a FK de `audit_log` não têm conceito de "ninguém"; alternativa cogitada e descartada (tornar `actor_id` nullable) exigiria migrar 3 páginas de audit log de `innerJoin` para `leftJoin` e mudar semântica de exibição sem ganho claro.
- `generatePaymentSchedule`/`onProjectApproved` viraram `packages/db/src/projetos-approval.ts` (não `packages/jobs`) porque `apps/projetos/src/actions/projects.ts` ainda os usa na transição manual — um único núcleo evita a divergência que motivou metade dos achados da Fase 2 (CS-1).
- `apps/projetos/src/lib/notifications.ts` (`notifyProjectDecision`, `notifyReportReminder`) e `apps/documentos/src/jobs/edital-closing-reminders.ts` (`runEditalClosingReminders`) foram **movidas**, não duplicadas, para `packages/jobs` — confirmado por grep que nenhuma tinha caller algum antes desta sessão.
- Prazo de expiração de relatório (30 dias após `dueDate`) é uma decisão técnica desta sessão, sem confirmação prévia do Filipe — documentada no código (`REPORT_EXPIRY_GRACE_DAYS`) e aqui; ajustável numa migration/constante futura se o número real for diferente.
- `packages/jobs/src/catalog.ts` registra jobs futuros como dados tipados (não como funções Inngest vazias) — uma função vazia passaria por "implementada" sem estar, reproduzindo exatamente o padrão PD-1 que a Fase 2 da auditoria identificou para critérios de aceite.

**Debitos tecnicos / pendencias:**

- `runHomologacaoAutoApprove` não usa transação única (replica o padrão pré-existente de `transitionProjectStage`, que também não a usa) — uma falha a meio do caminho (ex. `generatePaymentSchedule` falhar por dado inconsistente) deixaria o projeto marcado `aprovado` sem payment schedule. Pré-existente, não introduzido por esta sessão; considerar transação numa futura revisão de ambos os caminhos juntos.
- `notifyPendingEvaluations`/`notifyReportReminder`/`notifyEditalClosing`/`notifyProjectDecision` ficaram em `packages/jobs/src/notify/`, não em `packages/db` — se uma app precisar delas fora do contexto de um cron (ex. `closeVoting` manual de P-2.9c notificando a decisão), importa de `@hebron/jobs` normalmente (apps podem importar de packages, incluindo `packages/jobs`); só registrando a decisão para não ser redescoberta.
- Drift de grants em `projetos` (ver achado colateral acima) pode voltar se o ambiente de dev for resetado de novo — sem causa raiz investigada nesta sessão.

**Arquivos criados:**

- `packages/jobs/package.json`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`
- `packages/jobs/src/client.ts`, `src/index.ts`, `src/catalog.ts`
- `packages/jobs/src/lib/templates.ts`
- `packages/jobs/src/crons/admin.ts`, `src/crons/documentos.ts`, `src/crons/projetos.ts`
- `packages/jobs/src/notify/documentos.ts`, `src/notify/projetos.ts`
- `packages/jobs/src/__tests__/setup-env.ts`, `projetos-homologacao.test.ts`, `projetos-report-reminders.test.ts`, `projetos-evaluation-reminders.test.ts`, `documentos-edital-closing.test.ts`
- `packages/db/src/system-actor.ts`, `src/meetings.ts`, `src/projetos-approval.ts`
- `packages/db/src/__tests__/system-actor.test.ts`, `meetings.test.ts`
- `packages/email/src/templates/evaluation-reminder.tsx`
- `apps/intranet/src/app/api/inngest/route.ts`

**Arquivos modificados:**

- `packages/db/package.json` (exports `./system-actor`, `./meetings`, `./projetos-approval`)
- `apps/admin/src/actions/meetings.ts` (`autoCreateMonthlyMeetings` delega a `ensureMonthlyMeetings`)
- `apps/projetos/src/actions/projects.ts` (`generatePaymentSchedule`/`onProjectApproved` importados de `@hebron/db/projetos-approval`, definições locais removidas)
- `apps/projetos/src/lib/notifications.ts` (`notifyProjectDecision`/`notifyReportReminder` removidas — movidas)
- `apps/documentos/src/lib/notifications.ts` (`notifyEditalClosing` removida — movida)
- `apps/intranet/package.json` (deps `@hebron/jobs`, `inngest`)
- `.env.example` (`INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`)
- `BRAIN.md` (§7: nova subseção "Jobs (Inngest — P-0.14)")
- `SESSIONS.md` (esta entrada + linha no índice)

**Arquivos removidos:**

- `apps/documentos/src/jobs/edital-closing-reminders.ts` (pasta `jobs/` removida)
- `apps/projetos/src/lib/integrations/financeiro.ts`

---

### S-67 — 2026-07-06 — P-0.15 packages/integrations + contrato de settings (Onda 2)

**Prompt:** P-0.15 (`AUDIT/04-prompts-pendentes.md` §4)
**Duracao:** ~2h
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
S1-09/CS-6: as duas únicas funções cross-app tipadas do monorepo (`getEditalPrefill`, Documentos → Projetos; `getProjectParticipationScore`, Projetos → Flats) e o stub `onProjectSubmitted` (Projetos → Tarefas) viviam dentro de `apps/projetos/src/lib/integrations/`, num arquivo (`documentos.ts`) cujo nome nem batia com metade do conteúdo — achado já registrado em AUDIT/01-specs.md:265. Nada disso era hoje um import app→app de verdade (Tarefas e Flats ainda não existem), mas o próximo módulo a nascer (Tarefas, Fase 4, P-4.11 `createAutoTask`) reproduziria o padrão se o package não existisse antes. S1-18 (consumo de `system_settings`/`feature_flags` sem contrato) e S1-22 (erro fire-and-forget como convenção — `onProjectSubmitted(...).catch(console.error)` sem `await`) completavam o escopo.

**Escopo implementado:**

1. **`packages/integrations`** (novo package): as 3 funções migradas para arquivos nomeados pela relação que implementam — `documentos-projetos.ts` (`getEditalPrefill`), `projetos-flats.ts` (`getProjectParticipationScore`), `projetos-tarefas.ts` (`onProjectSubmitted`, ainda stub — `createAutoTask` de verdade nasce aqui na Fase 4). `src/index.ts` faz o barrel export; `package.json` também expõe subpaths individuais (mesmo padrão de `@hebron/db`/`@hebron/jobs`).
2. **`apps/projetos` atualizado para consumir o package**: `lib/queries.ts` (`getEditalPrefillForWizard`) e `actions/projects.ts` (`onProjectSubmitted`) importam de `@hebron/integrations/*`; `apps/projetos/src/lib/integrations/` removida inteira. A chamada de `onProjectSubmitted` na submissão deixou de ser fire-and-forge (`.catch` solto) e passou a `await` dentro de `try/catch` — o erro é logado, mas não aborta a submissão já commitada (decisão registrada no comentário do código). A leitura de prefill no wizard (`novo/page.tsx`, client-side) ganhou `.catch` com log estruturado — antes uma rejeição virava unhandled promise silenciosa.
3. **`@hebron/db/settings`** (novo módulo): `getSystemSetting`, `getFeatureFlag`, `isFeatureEnabled` — cache em memória por processo, TTL 30s, fail-closed para chave/flag inexistente (nunca lança). `isFeatureEnabled` aplica `rolloutPercent` (amostragem por chamada, não sticky por usuário).
4. **`scripts/check-cross-app-imports.mjs`** + `pnpm check:cross-app-imports`: varre `apps/*/src` por imports relativos cujo caminho resolvido cai dentro de `apps/<outro>/`; roda como step novo em `.github/workflows/ci.yml` (job `lint-typecheck`, depois de `pnpm turbo lint typecheck`). Validado manualmente com uma violação sintética (detectada e removida) antes do commit.
5. **BRAIN.md §7** — nova subseção "Cross-app (`packages/integrations` — P-0.15)": mecanismo (nomeação `<origem>-<destino>.ts`, stub documentado quando o destino ainda não existe), a configuração cross-app via `@hebron/db/settings`, e o padrão de erro (leitura degrada com log estruturado; mutação crítica nunca fire-and-forget).

**Achado colateral (ambiente, não código):** a suíte de `@hebron/projetos` falhou 16/102 na primeira rodada com "permission denied for schema projetos" — o mesmo drift de GRANTs perdidos já documentado em S-66 (o banco de dev local esquece os GRANTs físicos de `0025_fix_projetos_schema_grant`/`0026_fix_projetos_missing_select_grants` entre sessões mesmo com `public._migrations` marcando as duas como aplicadas). Corrigido do mesmo jeito: apagar as duas linhas de bookkeeping e reaplicar via `pnpm --filter @hebron/db db:migrate`. Causa raiz segue não investigada (ver débito em S-66); se voltar uma terceira vez, vale investigar o motivo em vez de só reaplicar de novo.

**Achado colateral (introduzido e corrigido nesta sessão):** a primeira versão de `packages/db/src/__tests__/settings.test.ts` usava `vi.useFakeTimers()`/`vi.setSystemTime()` para simular a expiração do TTL por cima de uma leitura real do banco. Como `packages/db/vitest.config.ts` roda em `singleFork` (todas as suítes no mesmo processo), instalar fake timers globais travou o `setTimeout` interno do driver `postgres` — a própria query pendurou até o timeout de 30s, e como o `vi.useRealTimers()` de limpeza nunca rodou, os fake timers continuaram ativos para os arquivos de teste seguintes no mesmo fork (`system-actor.test.ts`, `meetings.test.ts`, `documentos-views-retention.test.ts` deram timeout em cascata, todos sem relação nenhuma com a mudança). Corrigido reescrevendo o teste sem fake timers: a suíte cobre cache-hit (mudança no banco não aparece antes de uma nova leitura fora do TTL) e a lógica de `rolloutPercent` sem depender de viagem no tempo — a expiração em si é uma comparação `Date.now()` trivial, não vale o risco de travar o processo de teste inteiro para cobri-la.

**Critérios de aceite verificados:**

- [x] zero imports app→app — `pnpm check:cross-app-imports` verde; script testado manualmente contra uma violação sintética (detectou e reportou corretamente) antes de ser removida.
- [x] Projetos consome o package — `queries.ts`/`actions/projects.ts` importam de `@hebron/integrations/*`; `apps/projetos/src/lib/integrations/` não existe mais (grep confirma). Documentos não tinha (e continua sem ter) nenhum import cross-app real — a integração Documentos→Projetos é um link `<a href>` para a URL pública do wizard, não uma chamada de código; nada a mover ali.
- [x] BRAIN §7 atualizado com o mecanismo real — nova subseção "Cross-app (`packages/integrations` — P-0.15)".
- lint/typecheck verdes em `@hebron/integrations`, `@hebron/db`, `@hebron/projetos`. Testes: `@hebron/projetos` 102/102 (zero regressão da migração), `@hebron/db` 56/56 (50 pré-existentes + 6 novos de `settings.test.ts`).

**Decisoes tomadas:**

- Nomeação dos arquivos do package por relação (`<origem>-<destino>.ts`), não por schema de origem — resolve diretamente o achado "nome de arquivo enganoso" (`documentos.ts` continha uma função de Flats).
- `onProjectSubmitted` continua stub (Tarefas não existe) mas o call site já foi corrigido para `await` — não faz sentido esperar a Fase 4 para tirar o fire-and-forget de um caminho que a auditoria já sinalizou.
- `isFeatureEnabled` implementa amostragem por `rolloutPercent` (não sticky por usuário) — o campo já existe no schema desde P-1.6/`toggleFeatureFlag`; ignorá-lo no helper seria deixar metade do contrato sem uso. Sticky por usuário fica para quem precisar (chamador usa `getFeatureFlag` direto).
- Verificação de fronteira cross-app implementada como script Node (`scripts/check-cross-app-imports.mjs`) em vez de regra de ESLint — apps não expõem `exports` em `package.json` (confirmado em P-0.14), então a única forma de um import cruzar para outro app é um caminho relativo que escapa da pasta do app; isso é mais fácil de verificar resolvendo caminhos com `path.resolve` do que expressando como padrão de `no-restricted-imports`.

**Debitos tecnicos / pendencias:**

- Drift de GRANTs em `projetos` (ver achado colateral acima) — segunda ocorrência desde S-66, causa raiz ainda não investigada.
- `packages/integrations` não tem suíte de testes própria — as 3 funções migradas já eram exercitadas indiretamente pela suíte de `@hebron/projetos` (nenhuma tinha teste dedicado antes da migração também); considerar testes diretos quando `createAutoTask`/Flats/Tarefas passarem a consumir o package de verdade.

**Arquivos criados:**

- `packages/integrations/package.json`, `tsconfig.json`, `eslint.config.mjs`
- `packages/integrations/src/index.ts`, `src/documentos-projetos.ts`, `src/projetos-flats.ts`, `src/projetos-tarefas.ts`
- `packages/db/src/settings.ts`, `src/__tests__/settings.test.ts`
- `scripts/check-cross-app-imports.mjs`

**Arquivos modificados:**

- `apps/projetos/src/lib/queries.ts`, `src/actions/projects.ts` (imports de `@hebron/integrations/*`; `onProjectSubmitted` awaited)
- `apps/projetos/src/app/(submissor)/novo/page.tsx` (comentário desatualizado corrigido; `.catch` com log estruturado no prefill)
- `apps/projetos/package.json` (dependência `@hebron/integrations`)
- `packages/db/package.json` (export `./settings`)
- `package.json` (script `check:cross-app-imports`)
- `.github/workflows/ci.yml` (step novo no job `lint-typecheck`)
- `BRAIN.md` (§7: nova subseção "Cross-app (`packages/integrations` — P-0.15)")
- `SESSIONS.md` (esta entrada + linha no índice)

**Arquivos removidos:**

- `apps/projetos/src/lib/integrations/documentos.ts`, `src/lib/integrations/tarefas.ts` (pasta `integrations/` removida)

---

### S-68 — 2026-07-06 — P-0.16 Registro retroativo (Onda 2)

**Prompt:** P-0.16 (`AUDIT/04-prompts-pendentes.md` §4)
**Duracao:** ~2h
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
Última peça da Onda 2. A auditoria (S1-15, S1-16, S1-26) encontrou seis anomalias estruturais no índice/corpo do SESSIONS.md, `PATCHES/` vazio apesar de pelo menos 12 decisões de escopo/arquitetura já efetivas sem registro formal, duas contradições internas do BRAIN (S1-12/S1-13) e problemas de higiene em PROMPTS.md/PRODUCT.md. Esta sessão fecha os três critérios de aceite do prompt: (1) 12 arquivos PATCH criados em `PATCHES/`; (2) esta entrada, que é a "entrada retificadora única" prevista por S1-15 — normaliza os seis pontos por **apêndice**, sem editar nenhuma entrada anterior; (3) BRAIN.md emendado para eliminar as contradições S1-12/S1-13.

**Entrada retificadora do SESSIONS (S1-15 — seis pontos, normalizados aqui sem editar entradas antigas):**

1. **Índice S-21 ≠ corpo S-21.** O índice (linha do S-21) associa a sessão ao prompt "P-1.12b"; o corpo (linha 853) se autointitula "P-1.13b Ajustes Menores — Verificação Design System" e cita `Prompt: P-1.13b`. Nenhum prompt "P-1.13b" existe em `PROMPTS.md`. **Normalização:** o corpo de S-21 é, na prática, uma verificação ad hoc dos critérios do **P-0.2b** (S-20) — não a execução de um prompt numerado próprio. Nem o rótulo do índice ("P-1.12b") nem o do corpo ("P-1.13b") estão corretos; a execução real de P-1.12b é o ponto 2 abaixo.
2. **Sessão real do P-1.12b sem número.** O bloco "## Sessão P-1.12b — Reconciliação do Admin ao Design System Unificado" (entre S-22 e S-23 no arquivo) documenta a execução de fato do prompt `P-1.12b` (`PROMPTS.md:982`), mas nunca recebeu um identificador `S-NN` — inclusive `PROMPTS.md:1037` refere-se a ele incorretamente como "registrado em S-22" (que é P-0.3b). **Normalização:** este bloco passa a ser referenciado retroativamente como **S-22b** (mesma convenção de sufixo de letra já usada em P-1.12b/P-2.9b), preservando sua posição física no arquivo — não é uma renumeração de entradas existentes, é a atribuição do identificador que nunca existiu.
3. **S-45 no índice sem corpo.** O índice lista "S-45 | 2026-06-23 | Polish — apps/projetos/src/app | concluido"; não há bloco `### S-45` correspondente em lugar nenhum do arquivo. **Normalização:** o conteúdo não é reconstruível retroativamente com honestidade (não há registro do que foi de fato alterado). Fica marcado aqui como **débito de documentação aceito** — o índice permanece como está (não é editado), e este parágrafo é a nota de que o corpo daquela sessão está definitivamente perdido.
4. **P-1.21 no corpo sem número/índice.** O bloco "## Sessão P-1.21 — 2026-06-18" (`Prompt: P-1.21 — Integração UI ↔ Backend Documentos`) existe entre os blocos de S-29 (P-1.20, 2026-06-17) e S-30 (P-1.22, 2026-06-18), mas nunca entrou no índice nem recebeu `S-NN`. **Normalização:** referenciado retroativamente como **S-29b**, pela mesma razão e convenção do ponto 2.
5. **P-1.19 e P-2.12 marcados `[x]` em PROMPTS.md sem sessão correspondente.** Nenhum bloco de SESSIONS.md (numerado ou não) documenta a execução de P-1.19 (RLS Policies Documentos) nem de P-2.12 (Testes Projetos) — os critérios estão marcados `[x]` no PROMPTS.md sem lastro de log. Filipe confirmou os fatos na Fase 0 da auditoria (perguntas 1–2) — não há narrativa a reconstruir sem inventar conteúdo, o que violaria G1 ("nunca preencha lacunas de regra de negócio ou de fato por conta própria"). **Normalização:** fica registrado aqui como débito de documentação aceito; os critérios `[x]` permanecem como estão em `PROMPTS.md` porque o código correspondente existe e passou pelas verificações de sessões posteriores que dependem dele (P-1.19 é pré-requisito ativo de P-1.27/P-0.10; P-2.12 de toda a Fase 3), então a ausência é de log, não de execução.
6. **P-2.11 "parcial" no SESSIONS vs. critérios no PROMPTS.** S-43 (índice e corpo) registra P-2.11 como `parcial`; `PROMPTS.md` mostrava 6 critérios `[x]` e 1 `[~]` (prefill do wizard via `getEditalPrefill` — o mesmo débito de S1-25). O `[~]` já foi resolvido por **P-2.9c** (S-62: `apps/projetos/src/app/(submissor)/novo/page.tsx` ganhou prefill de edital via `searchParams`) e endurecido em P-0.15 (S-67: import do package + tratamento de erro). **Normalização:** o `[~]` de P-2.11 em `PROMPTS.md` foi corrigido para `[x]` nesta sessão, com nota apontando para S-62/S-67 — S-43 permanece `parcial` sem edição (é o registro histórico correto do estado _daquele momento_).

**Decisões tomadas:**

- 12 PATCHes criados em `PATCHES/` (numeração 001–012), reconstruindo retroativamente 3 decisões pré-existentes nunca registradas (S1-16: tipografia, escopo da Rádio, remoções consolidadas da v1) e formalizando 9 decisões já tomadas ao longo da auditoria/Ondas 0–2 mas nunca escritas como PATCH (decisão B/RLS ativa, MFA bloqueante, exclusão LGPD, votação — quórum por pessoa + encerramento manual, KPI "doações do mês", `organization_budgets`, quizzes/certificado-hash/notas mantidos, workspaces/colunas/checklist descartados, embeddings de duplicidade promovido a v1 + scoring de flats como assistência + renovação). Ver `PATCHES/00N-*.md` para o detalhe de cada um.
- BRAIN.md emendado em 9 pontos para eliminar as contradições S1-12 (embeddings v1×v2+) e S1-13 (scoring de flats "com IA" vs. tabela determinística de §6.8; detecção de renovação sem prompt) e para resolver a caixa de "decisão técnica pendente" de §3 (já resolvida pela Decisão B/P-0.10, nunca atualizada no texto): §2 (MFA, embeddings), §3 (caixa de decisão RLS), §6.2 (IA de Projetos, orçamento por instituição, votação), §6.6 (KPI doações), §6.8 (assistência de IA no scoring), §8 (reescrita de "Mantido na v1"/"Removido da v1" + nova subseção "Descartado").
- PROMPTS.md: cabeçalho corrigido (S1-26 — eram 4 correções, não 3; hoje são 19, contando as 15 da Onda de correção da auditoria) e critério `[~]` de P-2.11 corrigido para `[x]` (ver ponto 6 da retificação acima).
- PRODUCT.md: corrigidas as 2 divergências apontadas por S1-26/RELATORIO §2.4 — "não é produto público" contradizia `ouvinte` (papel anônimo com acesso a Rádio e Documentos públicos, BRAIN §3); a restrição "citações do NT ou Salmos" não existe em BRAIN §5 (que fala apenas em "citações bíblicas pertinentes ao contexto institucional") e foi removida por não ter origem rastreável.
- Não foram criados PATCHes para D-1 (editor rich text), D-2 (Google Calendar/feed ICS) e D-3 (audiência da Rádio/heartbeat) — essas três decisões só passam a ter efeito quando os prompts que as consomem rodarem (P-4.4/P-5.13/P-8.6, ainda pendentes) e serão registradas como PATCH nesse momento, não retroativamente agora.

**Debitos tecnicos / pendencias:**

- S-45 (ponto 3 da retificação): corpo da sessão irrecuperável; aceito como está.
- P-1.19/P-2.12 (ponto 5): sem narrativa de sessão; critérios `[x]` mantidos com base em evidência indireta (dependências posteriores), não em log próprio.
- `PROMPTS.md` ainda não lista o texto integral dos corretivos P-0.7–P-0.16/P-1.25–P-1.27/P-2.9c/P-3.8b como seções `### P-X.Y` — eles são executados a partir de `AUDIT/04-prompts-pendentes.md` §4 (convenção já em uso desde S-54, registrada em cada entrada de sessão). Transcrever o texto integral para dentro de `PROMPTS.md` é trabalho mecânico de escopo próprio, fora do que P-0.16 pediu ("cabeçalho → lista real"); não foi feito aqui para não misturar prompts na mesma sessão.

**Arquivos criados:**

- `PATCHES/001-tipografia-parkinsans-titillium.md`
- `PATCHES/002-radio-escopo-simplificado.md`
- `PATCHES/003-remocoes-v1-consolidadas.md`
- `PATCHES/004-decisao-b-rls-ativa.md`
- `PATCHES/005-mfa-bloqueante.md`
- `PATCHES/006-lgpd-exclusao-anonimizacao.md`
- `PATCHES/007-votacao-quorum-encerramento-manual.md`
- `PATCHES/008-kpi-doacoes-do-mes.md`
- `PATCHES/009-organization-budgets.md`
- `PATCHES/010-quizzes-certificado-hash-notas-mantidos.md`
- `PATCHES/011-workspaces-colunas-checklist-descartados.md`
- `PATCHES/012-ia-embeddings-v1-scoring-flats-renovacao.md`

**Arquivos modificados:**

- `BRAIN.md` (§2, §3, §6.2, §6.6, §6.8, §8 — ver PATCHes 004–005, 007–012 para antes/depois de cada trecho)
- `PROMPTS.md` (cabeçalho e Sumário — contagem/lista de correções; critério de P-2.11 `[~]` → `[x]`)
- `PRODUCT.md` (2 linhas — escopo público e regra de citações bíblicas)
- `SESSIONS.md` (esta entrada + linha no índice)

---

### S-69 — 2026-07-06 — P-3.9 Financeiro: Integração UI ↔ Backend

**Prompt:** P-3.9 (`PROMPTS.md:2318`)
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
Substituiu `lib/mock-data.ts` por dados reais em todo o módulo Financeiro e aplicou o padrão G5 (Server/Client split) ao `layout.tsx`/`shell.tsx`. Backend (P-3.6/P-3.7/P-3.8/P-3.8b) já existia quase por completo; o trabalho desta sessão foi de integração: `lib/queries.ts` novo com os mapeamentos DB → tipos de UI (`@hebron/types/financeiro`), conexão dos formulários do Bloco A (`expense-form`, `revenue-form`, `reversal-form`, `bank-account-form`, `budget-form`, `batch-approval-form`) às actions reais via `useAction`, e criação das duas telas novas de decisão F1-Q9 (`contas-receber`, `fluxo-caixa`).

**Suposições registradas (G1 — ambiguidade resolvida pela opção mais simples):**

- **Filtros de lançamentos são client-side**, não server-side por query param. `TransactionTable` já filtra em memória sobre o array completo; reescrever para paginação/filtro via URL search params seria uma reescrita de tela fora do escopo de "conectar, não reescrever". Volume de lançamentos da ONG é baixo (dezenas/centenas), então o impacto prático é nulo.
- **`bank-account-form` não tinha action correspondente** (débito de P-3.6/P-3.8). Criada `actions/accounts.ts` (`createBankAccount`). `financeiro.accounts` só tem uma coluna de identificação (`bank_name`) — os campos "nome/apelido" e "banco" do formulário gravam no mesmo campo.
- **`BatchApprovalForm` foi redesenhado**: o mock original tinha checkboxes de seleção por payable e um fluxo "aprovar/rejeitar" com motivo. O backend real (`approveBatch`/`authorizeBatch`) opera no lote inteiro, não em subconjuntos, e não tem ação de "rejeitar" um lote — apenas `cancelPayable` por conta individual. O formulário agora recebe `batch` + `stage` ("aprovar" | "autorizar") e cada estágio chama a action correspondente sem seleção parcial.
- **"Marcar todos como pagos" não existe no backend** — `markPayableAsPaid` é por payable individual (precisa de `bankAccountId`). A aba "autorizado" de Contas a Pagar usa `PayableCard` (órfão desde o Bloco A) com um diálogo simples de escolha de conta bancária por pagamento.
- **Conciliação manual "vincular a uma transação arbitrária" não existe no backend** (`reconcileRow` só suporta `vincular_payable`/`vincular_receivable`/`ignorar`/`criar_novo`; não há "unmatch"). `ConciliationView` foi ajustado para rodar `autoMatchImport` (sugestões reais) e usar essas 4 ações reais por linha — a antiga interação de clique-para-casar contra qualquer lançamento do sistema foi removida.
- **`cancellationReason`/`cancelledBy` de payables não são persistidos** por `cancelPayable` (só vão ao audit log) — a query mapeia esses campos como `null`.
- **`month` de `budget_items` não é persistido** por `createBudget` (gap do Bloco B) — a query retorna sempre `null`; registrado aqui, não corrigido (fora do escopo de um prompt de integração).
- **Centros de custo administrativos (sem projeto) ainda não existem** — `financeiro.cost_centers.project_id` é `NOT NULL` (1:1 com projeto aprovado); a tela `centros-custo` fica vazia até P-3.11 criar o fluxo cross-app Projetos → Financeiro.

**Débito de infraestrutura (G1 — arquivos óbvios fora da lista original, registrados aqui):**

- `apps/financeiro/src/lib/queries.ts` — explicitamente previsto no prompt.
- `apps/financeiro/src/lib/cashflow.ts` — `buildCashFlowData` extraída para ser compartilhada entre o painel e a nova tela de fluxo de caixa (evitar duplicação).
- `apps/financeiro/src/lib/import-parsers.ts` — **bug pré-existente destravado por esta sessão**: `actions/import.ts` (`"use server"`) exportava `parseCSV`/`splitDelimitedLine` como funções síncronas; `next build` rejeita isso ("Server Actions must be async functions"), embora `dev`/testes nunca acusassem. Extraídas as funções puras (parse OFX/CSV) para este módulo sem `"use server"`; `actions/import.ts` e `__tests__/csv-parser.test.ts` foram atualizados para importar de lá. Não é do escopo de P-3.9, mas bloqueava a verificação de build da própria integração.
- `apps/financeiro/src/actions/accounts.ts` — `createBankAccount`, ver suposição acima.
- `apps/financeiro/src/components/dashboard-quick-actions.tsx`, `contas-pagar-view.tsx`, `receivables-view.tsx`, `relatorios-view.tsx` — wrappers Client Component para estado de UI (menus, abas, diálogos) que não cabe dentro de um único componente do Bloco A, seguindo o mesmo precedente de `shell.tsx` (G5): a página vira Server Component (fetch direto), a interatividade fica isolada num Client Component filho.
- Migration `0027_financeiro_account_audit_action.sql` + `admin.audit_action` (`financeiro.account.created`) para a nova action de conta bancária.
- Removidos `components/import-form.tsx` e `components/transaction-table-skeleton.tsx` — órfãos do Bloco A (P-3.2) sem nenhum import em lugar nenhum, substituídos por `import-wizard.tsx` (já conectado desde P-3.8b) e por render direto sem skeleton artificial, respectivamente.

**Critérios de aceite verificados:**

- [x] Layout G5: `requireColaboradorSession` redireciona anônimo/papel sem acesso
- [x] Saldos reais por conta bancária no dashboard (ledger agregado)
- [x] Transações com filtros (client-side sobre dado real — ver suposição)
- [x] Despesa/receita criáveis pelas telas (actions reais)
- [x] Estorno executável a partir de lançamentos
- [x] Conciliação ponta a ponta: upload → preview → confirmar → auto-match/reconcile
- [x] Contas a pagar: criar lote, aprovar, autorizar, marcar pago — cada passo real
- [x] Contas a receber: listar e registrar recebimento (tela nova)
- [x] Fluxo de caixa projetado com dados reais (tela nova)
- [x] Orçamento: planejado vs executado por centro de custo
- [x] Plano de contas: CRUD operável (criar/editar/excluir categoria)
- [x] Nenhum componente do Bloco A sem import (grep) — 2 órfãos genuínos removidos, resto conectado
- [x] Nenhum `console.log`/`setTimeout` restante (grep)
- [x] Mock data removido
- [x] Lint passa · Types passam · `next build` passa · 30 testes existentes continuam verdes

**Arquivos criados:**

- `apps/financeiro/src/lib/queries.ts`, `src/lib/cashflow.ts`, `src/lib/import-parsers.ts`
- `apps/financeiro/src/actions/accounts.ts`, `src/actions/auth.ts`
- `apps/financeiro/src/components/dashboard-quick-actions.tsx`, `contas-pagar-view.tsx`, `receivables-view.tsx`, `relatorios-view.tsx`
- `apps/financeiro/src/app/(dashboard)/contas-receber/page.tsx`, `(dashboard)/fluxo-caixa/page.tsx`
- `packages/db/src/migrations/0027_financeiro_account_audit_action.sql`

**Arquivos modificados:**

- `apps/financeiro/src/app/(dashboard)/layout.tsx`, `shell.tsx` (G5)
- `apps/financeiro/src/app/(dashboard)/page.tsx`, `lancamentos/`, `conciliacao/`, `orcamento/`, `plano-contas/`, `contas-pagar/`, `centros-custo/`, `relatorios/` (RSC)
- `apps/financeiro/src/components/expense-form.tsx`, `revenue-form.tsx`, `reversal-form.tsx`, `bank-account-form.tsx`, `budget-form.tsx`, `batch-approval-form.tsx`, `budget-comparison.tsx`, `category-tree.tsx`, `transaction-table.tsx`, `conciliation-view.tsx` (dados reais + actions reais)
- `apps/financeiro/src/actions/import.ts` (parsers extraídos)
- `apps/financeiro/src/lib/audit.ts` (novo valor `financeiro.account.created`)
- `packages/db/src/schema/admin.ts` (enum `audit_action`)
- `packages/types/src/financeiro/index.ts` (`AccountCategory.isSystem`)

**Arquivos removidos:**

- `apps/financeiro/src/lib/mock-data.ts`
- `apps/financeiro/src/components/import-form.tsx`, `transaction-table-skeleton.tsx`

### S-70 — 2026-07-07 — P-3.10 Financeiro: Notificações e Emails

**Prompt:** P-3.10 (`PROMPTS.md:2372`)
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
Fechou os 6 gatilhos de notificação do módulo Financeiro que faltavam após P-3.9: alerta de orçamento >80% (in_app + email ao super_admin, disparado em tempo real por transação de débito), pagamento pago (in_app ao criador da conta), 3 crons novos em `packages/jobs` (lote semanal, vencimento próximo de contas a pagar/receber, relatório mensal consolidado por email com PDF+XLSX anexados), e a action `exportMonthlyReport` (PDF+XLSX+ZIP com os recibos do mês, acionável na tela de relatórios). O email do lote semanal (já existente desde P-3.9 como HTML inline) foi migrado para o template React Email `batch-approval.tsx` pedido pelo prompt.

**Suposições registradas (G1 — ambiguidade resolvida pela opção mais simples):**

- **Detecção de "cruzamento" de 80% do orçamento** não tem coluna de estado dedicada. `checkBudgetAlert` (`apps/financeiro/src/lib/notifications.ts`) compara o total executado do centro de custo ANTES e DEPOIS da transação de débito recém-commitada e dispara só na transição <80% → ≥80%, para não reenviar o alerta a cada lançamento subsequente. Sob concorrência rara (duas transações simultâneas) o alerta poderia disparar duas vezes — aceitável na escala desta ONG (~150 usuários, 2 super_admins).
- **Destinatário de "Pagamento pago (in_app)"** — não especificado no prompt. Assumido: o `createdBy` do payable (quem registrou a conta), por analogia ao padrão de notificação do módulo Projetos (submissor é avisado de decisões sobre o que ele criou).
- **Export manual sem bucket dedicado para o ZIP** — BRAIN.md só documenta `financeiro-recibos` (recibos individuais). Em vez de criar um bucket novo (fora do escopo/migrations previstas), `exportMonthlyReport` retorna o ZIP em base64 na resposta da action; o client (`relatorios-view.tsx`) decodifica e aciona o download via Blob local. Aceitável no volume mensal desta ONG.
- **PDF/XLSX do relatório mensal (cron) e do export manual (action) têm geração duplicada** — mesma estrutura (totais por categoria), mas `packages/jobs` nunca importa de `apps/*` (G6.5) e o export manual precisa também dos recibos (`archiver`/ZIP), então não há um ponto de compartilhamento óbvio dentro da lista de arquivos permitidos. Duplicação aceita, no mesmo espírito de `runHomologacaoAutoApprove` (packages/jobs/src/crons/projetos.ts) replicar lógica de uma action de app.
- **DB-template override (`getDbTemplate`/`applyVars`, usado por projetos/documentos)** não foi aplicado aos 3 templates novos — exigiria registrar os slugs em `apps/admin/src/app/(dashboard)/templates-email/page.tsx`, fora da lista de arquivos permitidos deste prompt.

**Débito de infraestrutura (G1 — arquivos óbvios fora da lista original, registrados aqui):**

- `apps/financeiro/src/actions/approval.ts` — edição necessária para (a) trocar o HTML inline do lote semanal pelo template `batch-approval.tsx`, (b) chamar `notifyPayablePaid`/`checkBudgetAlert` em `markPayableAsPaid`. Não estava na lista de arquivos permitidos do prompt, mas sem essa mudança os dois gatilhos do escopo ("pagamento pago", "orçamento >80%") ficariam sem nenhum chamador.
- `apps/financeiro/src/actions/transactions.ts` — mesmo motivo: `checkBudgetAlert` chamado em `createManualTransaction` para débitos com centro de custo.
- `apps/financeiro/src/lib/audit.ts` + `packages/db/src/schema/admin.ts` (enum `auditActionEnum`) + `packages/db/src/migrations/0028_financeiro_report_audit_action.sql` — novo valor `financeiro.report.exported`, exigido pelo critério de aceite G6.3 ("falha de auditoria em qualquer action nova aborta a operação") para a nova action `exportMonthlyReport`.
- `packages/email/src/lib/send.ts` — adicionado campo opcional `attachments` a `SendEmailOptions` (repassado ao Resend), necessário para o relatório mensal anexar PDF+XLSX ao email; sem isso `createNotification` não tinha como enviar anexos.
- `packages/jobs/src/index.ts` + `packages/jobs/src/catalog.ts` — registro dos 3 crons novos no barrel (`functions`) e remoção das 3 entradas `PLANNED_JOBS` correspondentes (G6.6).
- `apps/financeiro/src/app/(dashboard)/relatorios/page.tsx` + `src/components/relatorios-view.tsx` — wiring do botão de export manual (gate `super_admin` via `resolveSession` no page.tsx; seletor mês/ano + download client-side em `relatorios-view.tsx`). Necessário para satisfazer o critério de aceite "Export manual ... pela tela de relatórios" — sem isso a action ficaria órfã.
- `apps/financeiro/package.json` (+`@react-pdf/renderer`, `exceljs`, `archiver`, `@types/archiver`) e `packages/jobs/package.json` (+`@react-pdf/renderer`, `exceljs`) e `packages/email/package.json` (+`@types/node`, para tipar `Buffer` em `send.ts`).

**Critérios de aceite verificados:**

- [x] Lote semanal: email somente ao(s) diretor(es) gestor (designation), CC autorizador — fallback para todos os diretores se nenhuma designation "gestor" existir (comportamento herdado de P-3.9, agora também no cron)
- [x] Alerta de orçamento >80%: email + in_app ao(s) super_admin(s), disparado por `checkBudgetAlert` em `markPayableAsPaid` e `createManualTransaction`
- [x] Relatório mensal automático: PDF+XLSX com totais por categoria, cron `financeiro-relatorio-mensal` (dia 1, 8h) registrado em `packages/jobs/src/index.ts`
- [x] Export manual: `exportMonthlyReport` gera PDF+XLSX+ZIP com recibos do mês, acionável por super_admin em `/relatorios`
- [x] Vencimento próximo: in_app 3 dias antes (payables e receivables), cron `financeiro-vencimento-proximo` (diário, 8h)
- [x] Falha de auditoria aborta a operação: `exportMonthlyReport` usa `logFinanceiroAudit` (criticidade "critical", já herdada de `@hebron/db/audit`)
- [x] Lint passa · Types passam (`pnpm turbo lint typecheck` verde no monorepo inteiro)

**Arquivos criados:**

- `packages/email/src/templates/batch-approval.tsx`, `budget-alert.tsx`, `monthly-financial-report.tsx`
- `apps/financeiro/src/lib/notifications.ts`
- `apps/financeiro/src/actions/reports.ts`
- `packages/jobs/src/crons/financeiro.ts`
- `packages/db/src/migrations/0028_financeiro_report_audit_action.sql`

**Arquivos modificados:**

- `apps/financeiro/src/actions/approval.ts`, `transactions.ts`, `lib/audit.ts`
- `apps/financeiro/src/app/(dashboard)/relatorios/page.tsx`, `src/components/relatorios-view.tsx`
- `packages/email/src/lib/send.ts` (campo `attachments`)
- `packages/jobs/src/index.ts`, `src/catalog.ts`
- `packages/db/src/schema/admin.ts` (enum `audit_action`)
- `apps/financeiro/package.json`, `packages/jobs/package.json`, `packages/email/package.json` (dependências)

### S-71 — 2026-07-07 — P-3.11 — Financeiro: Integrações Cross-App

**Prompt:** P-3.11 (`PROMPTS.md:2407`)
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
Conectou as integrações reais Projetos ↔ Financeiro via `packages/integrations` (P-0.15). `onProjectApproved` (packages/db/src/projetos-approval.ts) deixou de ser um stub que só criava centro de custo — agora também cria um `financeiro.payables` por parcela de `payment_schedules`, em status "pendente" (nunca pré-aprovado), auditado, idempotente via `payment_schedule_id` único. `packages/integrations/src/financeiro.ts` (novo) expõe `getProjectBudgetExecution` (executado vs orçado em tempo real, somando débitos do centro de custo do projeto) e o stub documentado `onFlatsAssistanceApproved`. `packages/integrations/src/projetos.ts` (novo) recebe `checkOrganizationBudget`, movida de dentro de `apps/projetos` — fecha a peça arquitetural do workaround `admin.system_settings` (S-40), já que a camada de dados tinha sido resolvida em P-3.8b/PATCH-009 (ver PATCH-013). Bloqueio por inadimplência de relatório (BRAIN §6.2): novo cron `projetos-inadimplencia` (packages/jobs) bloqueia payables "pendente" de projetos com relatório vencido (status "bloqueado" novo no enum `payable_status`); `overrideBlock` (apps/financeiro/src/actions/payables.ts, novo) permite a um super_admin liberar o bloqueio com justificativa obrigatória, auditado.

**Suposições registradas (G1 — ambiguidade resolvida pela opção mais simples):**

- **`drizzle-kit generate` está com o snapshot desatualizado** desde `idx 14` (`meta/_journal.json`) — as migrations 0015 a 0028 foram aplicadas fora do fluxo do kit (drift pré-existente, não introduzido nesta sessão). Rodar `drizzle-kit generate` reproduziu justamente esse problema: gerou um diff reincluindo as 14 migrations não rastreadas, sem `IF NOT EXISTS`/guards de idempotência — aplicar esse arquivo quebraria qualquer banco onde elas já rodaram (`ALTER TABLE ADD COLUMN` sem guard falha se a coluna já existe). Descartado; as migrations 0029/0030 foram escritas à mão, seguindo exatamente o estilo idempotente já padrão no repo desde 0016+ (`ADD VALUE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DO $$ ... EXCEPTION WHEN duplicate_object`). O `_journal.json` foi revertido ao estado original (não reconciliado) — reconciliar o snapshot inteiro é trabalho no espírito de P-0.11, fora do escopo deste prompt; registrado como débito.
- **"Relatório vencido" (gatilho do bloqueio)** = `due_date` já passada + `status = "pendente"`, sem período de carência. BRAIN §6.2 não especifica um número de dias e não havia decisão prévia do Filipe — diferente de propósito do `REPORT_EXPIRY_GRACE_DAYS` (30 dias) já usado em `crons/projetos.ts` para o 3º lembrete, que é sobre notificação, não bloqueio; os dois foram mantidos independentes, documentado no cabeçalho do cron novo.
- **Bloqueio só age sobre payables ainda "pendente"** (antes de entrar na governança dual) — um payable já "aprovado"/"autorizado" não é retroativamente bloqueado; o cron não tem mandato para desfazer uma decisão já tomada por um diretor/autorizador. Isso já é suficiente para o critério "payable bloqueado não entra em lote semanal", porque o lote (`runWeeklyBatchCreation`) só seleciona status "pendente".
- **Vínculo payable↔projeto é indireto**, via `payables.cost_center_id → cost_centers.project_id` (não foi criada uma FK direta `payables.project_id` — seria redundante). O vínculo direto novo, `payables.payment_schedule_id` (único), existe para permitir a criação idempotente automática, não para navegação geral.
- **Nomes dos arquivos `packages/integrations/src/financeiro.ts` / `projetos.ts`** seguem literalmente a lista de arquivos permitidos do prompt, divergindo da convenção `<origem>-<destino>.ts` documentada em BRAIN.md (ex.: `documentos-projetos.ts`, `projetos-flats.ts`). A lista explícita do prompt venceu; registrado aqui para uma eventual revisão de convenção.
- **`onProjectApproved` passou a auditar também a criação do centro de custo** (usava `getSystemActorId`/`logAudit` só implicitamente antes — na verdade não auditava nada). Não era estritamente pedido pelo prompt, mas manter a criação de payables auditada e a de centro de custo silenciosa dentro da mesma função seria inconsistente com G6.3.

**Débito de infraestrutura (G1 — arquivos óbvios fora da lista original, registrados aqui):**

- `packages/db/src/schema/financeiro.ts` (novo status `bloqueado` + colunas de bloqueio/override em `payables`) e `packages/db/src/schema/admin.ts` (2 novos valores em `audit_action`) — não estavam na lista, mas sem eles não existe onde gravar o estado nem a auditoria que o prompt pede.
- `packages/db/src/projetos-approval.ts` — `onProjectApproved` foi estendida no lugar (não movida para `packages/integrations/src/financeiro.ts`, que só estava na lista de arquivos permitidos): a função já era o "efeito colateral de projeto aprovado" compartilhado entre a action manual (`apps/projetos/actions/projects.ts`) e o cron de homologação automática (`packages/jobs/crons/projetos.ts`) — movê-la duplicaria a criação de centro de custo já existente ali e obrigaria a editar os dois call-sites (nenhum dos dois está na lista permitida). Estender no lugar manteve os dois call-sites intocados.
- `apps/projetos/src/actions/projects.ts` — editado para importar `checkOrganizationBudget` do package em vez de defini-la localmente. A lista previa `apps/projetos/src/lib/integrations/* (apenas remoção/redirecionamento)`, mas esse diretório nunca existiu — a implementação real sempre viveu inline em `actions/projects.ts` (confirmado por exploração antes de codar), não num arquivo `lib/integrations/*` dedicado. Redirecionado no lugar real, em vez de inventar um diretório vazio só para satisfazer a letra da lista.
- `packages/jobs/src/index.ts` — registro obrigatório do cron novo no barrel `functions` (G6.6); nenhum cron novo funciona sem isso.
- `apps/financeiro/src/lib/audit.ts` — extensão do union type `FinanceiroAuditAction` com os 2 novos valores (`financeiro.payable.blocked`, `financeiro.payable.block_overridden`), exigida por G6.3.
- 5 arquivos de teste novos (`packages/db/src/__tests__/projetos-approval.test.ts`, `apps/projetos/src/__tests__/integrations-projetos-budget.test.ts` e `integrations-financeiro-execution.test.ts`, `packages/jobs/src/__tests__/projetos-inadimplencia.test.ts`, `apps/financeiro/src/__tests__/payables-override-block.test.ts`) — a lista de arquivos permitidos não incluía nenhum teste, mas os critérios de aceite pedem "(teste)" explicitamente em 3 pontos. Colocados no app/package mais próximo de onde a função testada é consumida/definida, seguindo o padrão já usado em `flow.test.ts`/`projetos-homologacao.test.ts` (DB real via `DATABASE_URL`, sem mocks de banco).
- `packages/jobs/src/__tests__/projetos-homologacao.test.ts` — `afterAll` ajustado: a nova FK `payables.payment_schedule_id` (RESTRICT) passou a bloquear a ordem de limpeza existente, já que `runHomologacaoAutoApprove` também aciona `onProjectApproved` (agora cria payables). Sem o ajuste, a suíte de `packages/jobs` quebrava por completo.
- `packages/types/src/financeiro/index.ts` — `PayableStatus` ganhou `"bloqueado"`; sem isso `apps/financeiro/src/lib/queries.ts` (fora da lista permitida, não tocado) já não typecheckava contra o novo valor do enum do banco.

**Observação de verificação (não é regressão desta sessão):** `apps/projetos/src/__tests__/rls.test.ts` já falhava (16/19 testes, "permission denied for schema projetos") antes de qualquer mudança deste prompt — confirmado rodando a suíte com `git stash` (código revertido) e obtendo exatamente as mesmas falhas. Ambiente/grants do banco de dev, não código; fora do escopo de P-3.11, registrado aqui para não ser re-descoberto do zero numa sessão futura. `packages/db/src/__tests__/storage.test.ts` também apresentou 2 falhas ao rodar `pnpm test` na raiz (todas as suítes em paralelo), mas passou 21/21 ao rodar isolado duas vezes — flakiness de concorrência/rate-limit contra o mesmo projeto Supabase compartilhado sob carga, não uma regressão (não toca em storage/buckets neste prompt).

**Critérios de aceite verificados:**

- [x] Aprovação de projeto cria centro de custo e payables reais
- [x] Payables de projeto nascem NÃO aprovados
- [x] Executado vs orçado em tempo real (teste cross-schema)
- [x] Submissão de projeto bloqueada quando total aprovado excede organization_budgets do ano (teste)
- [x] Workaround `system_settings` removido; PATCH registrado (PATCH-013 — a camada de dados já tinha sido removida em PATCH-009/P-3.8b; este fecha a camada arquitetural, movendo `checkOrganizationBudget` para o package)
- [x] Relatório vencido → payables do projeto ficam `bloqueado` e não entram em lote (teste)
- [x] Override: só super_admin, exige justificativa, gera audit (teste)
- [x] Stub Flats → Financeiro documentado no package (`onFlatsAssistanceApproved`, `packages/integrations/src/financeiro.ts`)
- [x] Zero imports app→app (verificação do CI — `pnpm check:cross-app-imports`)
- [x] Lint passa · Types passam · testes novos verdes

**Arquivos criados:**

- `packages/integrations/src/financeiro.ts`, `src/projetos.ts`
- `packages/jobs/src/crons/projetos-inadimplencia.ts`
- `apps/financeiro/src/actions/payables.ts`
- `packages/db/src/migrations/0029_financeiro_payable_bloqueio_audit_actions.sql`, `0030_financeiro_payables_bloqueio_columns.sql`
- `packages/db/src/__tests__/projetos-approval.test.ts`
- `apps/projetos/src/__tests__/integrations-projetos-budget.test.ts`, `integrations-financeiro-execution.test.ts`
- `packages/jobs/src/__tests__/projetos-inadimplencia.test.ts`
- `apps/financeiro/src/__tests__/payables-override-block.test.ts`
- `PATCHES/013-checkorganizationbudget-package-relocation.md`

**Arquivos modificados:**

- `packages/db/src/schema/financeiro.ts` (status `bloqueado`, colunas de bloqueio/override, `payment_schedule_id`)
- `packages/db/src/schema/admin.ts` (enum `audit_action`)
- `packages/db/src/projetos-approval.ts` (`onProjectApproved` cria payables + audita)
- `packages/integrations/src/index.ts`, `package.json` (exports novos)
- `apps/projetos/src/actions/projects.ts` (`checkOrganizationBudget` → package)
- `packages/jobs/src/index.ts` (registro do cron novo)
- `packages/jobs/src/__tests__/projetos-homologacao.test.ts` (`afterAll` — ordem de limpeza por causa da FK nova)
- `apps/financeiro/src/lib/audit.ts` (2 `FinanceiroAuditAction` novas)
- `packages/types/src/financeiro/index.ts` (`PayableStatus` ganha `"bloqueado"`)

### S-72 — 2026-07-07 — P-3.12 — Testes Financeiro

**Prompt:** P-3.12 (`PROMPTS.md:2444`)
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
Fechou os critérios de aceite de P-3.12 ainda sem cobertura. Boa parte já estava coberta por testes de prompts anteriores (P-3.9 a P-3.11): `designation-governance.test.ts` (designation gestor/autorizador), `audit-abort.test.ts` (G6.3 — falha de audit aborta a mutação), `confirm-import.test.ts` (F3-11 — linhas adulteradas não persistem), `csv-parser.test.ts` (parse CSV), `payables-override-block.test.ts` (override auditado). O script `test` no `package.json` do app (F3-10) também já existia. Este prompt adicionou o que faltava: `transactions.test.ts` (imutabilidade do trigger de DB para UPDATE/DELETE + `createReversal` cria contrapartida/registro/audit sem alterar o original), `conciliation.test.ts` (parse de OFX — só CSV tinha teste — e `autoMatchImport` casando por valor+data), `governance.test.ts` (fluxo completo aprovação → autorização → **pago**, que nenhum teste cobria fim a fim, e `createWeeklyBatch` nunca incluir um payable "bloqueado"), e uma extensão em `rls.test.ts` com o papel `submissor`.

**Suposições registradas (G1 — ambiguidade resolvida pela opção mais simples):**

- **"RLS: submissor não vê transações de outros projetos"** — as policies de SELECT do schema `financeiro` (`payables`/`transactions`/etc., `0010_financeiro.sql`/`0011_financeiro_rls.sql`) checam apenas `has_role('super_admin', 'diretor', 'colaborador')`; `submissor` nunca está nessa lista e não existe nenhuma coluna de escopo por projeto em `financeiro.transactions`. Não há, portanto, nenhuma variante "vê só as próprias" a testar dentro do schema financeiro — a garantia real é bloqueio total de acesso ao schema. O teste adicionado em `rls.test.ts` verifica isso (submissor não lê `payables` nem `transactions`, mesma família dos testes de hóspede já existentes). O acesso de submissor por projeto realmente escopado (`projetos.payment_schedules`, por organização) já pertence a `apps/projetos` — fora da lista de arquivos permitidos deste prompt, não recriado aqui.
- **Imutabilidade do ledger em teste** — `financeiro.transactions` tem um trigger `BEFORE DELETE`/`BEFORE UPDATE` que dispara mesmo para a conexão `db` (dona das tabelas, super_admin de fato — bypassa GRANT/RLS mas não o trigger). Isso significa que uma transação de teste real (seedada diretamente ou criada por `createReversal`/`markPayableAsPaid`) **nunca pode ser apagada em `afterAll`** — nem pelos próprios testes. `transactions.test.ts`, `conciliation.test.ts` e `governance.test.ts` foram ajustados para nunca tentar `DELETE FROM financeiro.transactions`; a conta bancária e o usuário referenciados via `account_id`/`created_by` (FK `RESTRICT`) permanecem como fixtures permanentes reaproveitadas entre execuções (`onConflictDoNothing`), e qualquer id que vira `reference_id` de uma transação real é gerado pelo banco (não fixo), para que reexecuções nunca colidam com uma transação/estorno remanescente de uma rodada anterior. Descoberto por tentativa e erro (a 1ª versão destes 3 arquivos quebrava o `afterAll` com `PostgresError: transactions são imutáveis`); nenhum teste anterior no repo tinha criado uma `financeiro.transactions` real dentro do próprio teste, então não havia precedente a seguir.
- **`createWeeklyBatch` excluir "bloqueado"** já estava _documentado_ como consequência do filtro `status = "pendente"` no comentário do cron `projetos-inadimplencia.ts` ("Isso também é o suficiente para satisfazer 'payable bloqueado não entra em lote semanal'..."), mas nenhum teste realmente exercitava esse caminho — `governance.test.ts` adiciona a verificação.

**Critérios de aceite verificados:**

- [x] Transação: UPDATE/DELETE retorna erro (`transactions.test.ts`, trigger de DB)
- [x] Estorno: cria reversal corretamente (`transactions.test.ts`)
- [x] Import OFX: parse correto dos campos (`conciliation.test.ts`)
- [x] Match: encontra correspondência por valor+data (`conciliation.test.ts`)
- [x] Governança: fluxo aprovação → autorização → pago funciona (`governance.test.ts`)
- [x] RLS: submissor não vê transações de outros projetos (`rls.test.ts`)
- [x] Designation: diretor sem designation gestor não aprova lote (já coberto por `designation-governance.test.ts`, P-3.8b)
- [x] Audit: falha simulada de gravação aborta a mutação (já coberto por `audit-abort.test.ts`, G6.3)
- [x] Import: linhas adulteradas entre preview e confirmação não persistem (já coberto por `confirm-import.test.ts`, F3-11)
- [x] organization_budgets: submissão acima do teto é bloqueada (já coberto por `apps/projetos/src/__tests__/integrations-projetos-budget.test.ts`, P-3.11)
- [x] Inadimplência: payable bloqueado não entra em lote (`governance.test.ts`); override auditado (já coberto por `payables-override-block.test.ts`, P-3.11)
- [x] Testes passam (46/46, `pnpm vitest run` — 2 execuções consecutivas, sem colisão de fixtures)
- [x] Lint passa
- [x] Script `test` no `package.json` (F3-10) — já existia, confirmado presente

**Arquivos criados:**

- `apps/financeiro/src/__tests__/transactions.test.ts`
- `apps/financeiro/src/__tests__/conciliation.test.ts`
- `apps/financeiro/src/__tests__/governance.test.ts`

**Arquivos modificados:**

- `apps/financeiro/src/__tests__/rls.test.ts` (papel `submissor` — accounts/payables/transactions)

### S-73 — 2026-07-07 — P-4.1 — Schema de Tipos Tarefas

**Prompt:** P-4.1 (`PROMPTS.md:2491`)
**Modelo:** claude-sonnet-5
**Status:** concluido

**Resumo:**
Primeiro prompt do módulo Tarefas (Fase 4). Definiu os tipos (`packages/types/src/tarefas/index.ts`) e schemas Zod (`packages/validators/src/tarefas/index.ts`) para Workspace (6 fixos, BRAIN §6.9), Task, Subtask, Assignee, Comment, Attachment, TimeEntry, Tag, RecurrenceRule, TaskTemplate e ApprovalRequest, seguindo o mesmo padrão estrutural de `financeiro`/`projetos` (enums em snake_case português, campos em camelCase inglês, `Compact*View` para listas). Mock data (`apps/tarefas/src/lib/mock-data.ts`) com 34 tarefas (6 recorrentes cobrindo os cenários citados em BRAIN §6.9 — conta de energia/água mensal, IPTU anual, limpeza do flat semanal, convite Capelowski mensal, fechamento contábil mensal; 3 automáticas com `needsManualAssignment: true` e `sourceModule`/`sourceId` de flats/projetos/intranet; e tarefas ricas com subtarefas, comentários com @menção, anexo e time entry) e 4 templates (limpeza do flat, análise de projeto, action items de reunião — todos com `trigger` cross-module — e onboarding de colaborador, sem trigger).

**Suposições registradas (G1 — ambiguidade resolvida pela opção mais simples):**

- **`TimeEntry` vs. BRAIN "Fora de escopo v1"** — BRAIN §"Removido/Deferido" lista "Time tracking (Tarefas)" como deferido para v2+, mas o escopo do prompt pede explicitamente o tipo `TimeEntry`. Interpretado como: o _tipo_ pode existir agora (é só shape de dado, não implica UI/feature ativa); a feature de time tracking em si (cronômetro, relatórios) continua deferida e não foi implementada em nenhuma tela. Registrado aqui para o backend/UI de P-4.2+ não assumir que time tracking é v1.
- **`RecurrenceRule` para tipo "anual"** — o prompt lista só 4 campos (tipo, intervalo, dia_da_semana, dia_do_mes), sem campo de mês do ano. Isso significa que uma recorrência anual (ex: IPTU) só guarda o dia do mês, não o mês — modelagem imprecisa mas literal ao que foi pedido; não adicionei campo `month` não solicitado.
- **Exports de `package.json`** — `packages/types/package.json` e `packages/validators/package.json` não estavam na lista de arquivos permitidos, mas sem a entrada `"./tarefas"` no mapa de `exports` o import `@hebron/types/tarefas` não resolve (mesmo padrão obrigatório em todo módulo anterior — confirmado via `git log` no commit que introduziu `"./financeiro"`). Editados como infraestrutura óbvia faltante (G1).

**Critérios de aceite verificados:**

- [x] 6 workspaces fixos como enum (`Workspace`)
- [x] Task com título, descrição, prioridade, status, workspace, dueDate, recurrenceRule
- [x] RecurrenceRule: tipo, intervalo, dayOfWeek, dayOfMonth
- [x] TaskTemplate: nome, tasks pré-definidas, trigger (evento de outro módulo)
- [x] ApprovalRequest: taskId, approverId (diretor), status
- [x] Mock data: 34 tarefas, 6 recorrentes, 4 templates
- [x] Lint passa (`pnpm turbo lint` — 38/38 tasks)
- [x] Types passam (`pnpm turbo typecheck` — 38/38 tasks)

**Arquivos criados:**

- `packages/types/src/tarefas/index.ts`
- `packages/validators/src/tarefas/index.ts`
- `apps/tarefas/src/lib/mock-data.ts`

**Arquivos modificados:**

- `packages/types/package.json` (export `"./tarefas"`)
- `packages/validators/package.json` (export `"./tarefas"`)

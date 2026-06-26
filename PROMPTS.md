# PROMPTS.md — Sequência de Desenvolvimento SDD

> **Referência:** BRAIN.md (fonte da verdade) | SDD-STRUCTURE.md (formato)
> **Total:** 119 prompts + 3 correções (P-0.2b, P-0.3b, P-1.12b) | Fases 0-9
> **Metodologia:** Bloco A (UI com mocks) → Pausa (validar com diretoria) → Bloco B (Backend + integração)
> **⚠️ Antes de tudo:** ler a seção **Instruções Globais** (logo abaixo do Sumário). Prompts corretivos `P-0.2b` (design system), `P-0.3b` (migrations) e `P-1.12b` (Admin) devem ser executados na ordem indicada.

---

## Sumário

| Fase | Módulo     | Prompts         | Bloco A     | Bloco B     |
| ---- | ---------- | --------------- | ----------- | ----------- |
| 0    | Fundação   | P-0.1 a P-0.6   | —           | —           |
| 1    | Admin      | P-1.1 a P-1.12  | P-1.1–1.5   | P-1.6–1.12  |
| 1    | Documentos | P-1.13 a P-1.24 | P-1.13–1.17 | P-1.18–1.24 |
| 2    | Projetos   | P-2.1 a P-2.12  | P-2.1–2.5   | P-2.6–2.12  |
| 3    | Financeiro | P-3.1 a P-3.12  | P-3.1–3.5   | P-3.6–3.12  |
| 4    | Tarefas    | P-4.1 a P-4.12  | P-4.1–4.5   | P-4.6–4.12  |
| 5    | Intranet   | P-5.1 a P-5.12  | P-5.1–5.5   | P-5.6–5.12  |
| 6    | Plataforma | P-6.1 a P-6.12  | P-6.1–6.5   | P-6.6–6.12  |
| 7    | Flats      | P-7.1 a P-7.12  | P-7.1–7.5   | P-7.6–7.12  |
| 8    | Rádio      | P-8.1 a P-8.12  | P-8.1–8.5   | P-8.6–8.12  |
| 9    | Polimento  | P-9.1 a P-9.5   | —           | —           |

---

# Instruções Globais (LER ANTES DE QUALQUER PROMPT)

> Estas regras valem para **todos** os prompts abaixo. Elas existem para evitar o erro "o que foi pedido vs. o que foi implementado". Siga-as ao pé da letra. Em dúvida, **não invente**: pare e pergunte ao Filipe.

## G1. Modelo executor: seja literal, não abstraia

O código destes prompts é gerado por um modelo de capacidade média (Sonnet 4.7). Portanto:

- Implemente **exatamente** o que o prompt lista. Não adicione telas, campos, libs ou "melhorias" não pedidas.
- Não crie arquivos fora da lista **Arquivos permitidos**. Se faltar um arquivo de infraestrutura óbvio (ex.: `layout.tsx`, `globals.css`), crie-o e **registre em SESSIONS.md** como débito/decisão.
- Se uma instrução parecer ambígua, escolha a opção mais simples e **registre a suposição** em SESSIONS.md. Nunca "preencha lacunas" de regra de negócio por conta própria.
- Ao terminar, rode `pnpm turbo lint typecheck` e só feche o prompt com ambos verdes.

## G2. Skill `/frontend-design` — OBRIGATÓRIA em todo prompt de UI

Para **todo** prompt de tipo `ui` (todos os Bloco A: P-X.1 a P-X.5) e qualquer prompt que crie/edite telas, componentes, layouts ou estados:

1. **Invoque a skill `/frontend-design` ANTES de escrever qualquer JSX/CSS.**
2. Use também `impeccable` para refinar/auditar uma tela já existente.
3. Só comece a implementar depois de a skill ter sido carregada.

## G3. Procedimento de consumo das referências de design (passo a passo)

As referências visuais ficam em **`design-refs/<app>/`** (versionadas no repo). Hoje existem para: `admin`, `documentos`, `financeiro`. Antes de implementar UI de um módulo:

1. **Verifique** se `design-refs/<nome-do-app>/` existe.
   - **Se existir:** abra os arquivos `screen-*.jsx` / `screens-*.jsx`, `components.jsx`, `styles.css`/`app.css` e o `.html` daquele app. Essa é a **fonte da verdade visual** daquele módulo.
   - **Se NÃO existir:** implemente seguindo BRAIN.md §5 (tokens, princípios) e os componentes de `@hebron/ui`, mantendo a mesma linguagem visual dos apps que já têm referência. Registre em SESSIONS.md que não havia referência.
2. **Replique com fidelidade** do protótipo: estrutura de layout, grid, espaçamento, hierarquia tipográfica, ordem dos elementos, cores por contexto, estados (vazio/erro/loading) e elementos de marca (balão, círculos, eyebrow).
3. **TRADUZA — não copie cru.** Os protótipos são JSX + CSS puro com classes próprias. A implementação real usa **Next.js (App Router) + Tailwind v4 + componentes de `@hebron/ui`**:
   - Substitua elementos do protótipo pelos componentes de `@hebron/ui` (`Button`, `Input`, `Select`, `Dialog`, `PageHeader`, `EmptyState`, `Card`, etc.).
   - Use **somente** os tokens canônicos (tabela G4). Onde o protótipo usa `var(--hb-cyan)`, use o mesmo token; onde usa uma classe (`.hb-card`), use o componente/classe equivalente de `@hebron/ui`.
4. **PROIBIÇÕES (causam retrabalho — NÃO faça):**
   - ❌ Criar um arquivo CSS do app (ex.: `apps/<app>/src/app/<app>.css`) que **redefina** tokens da marca ou recrie componentes do design system. Esse conteúdo vive em `packages/ui`.
   - ❌ Escrever cor em hex no código (`#202c85`, `style={{background:'#07b4e7'}}`). Use o token.
   - ❌ Usar Inter / Source Serif 4. As fontes são Parkinsans + Titillium Web.
   - ❌ Inventar telas/campos que não estão no protótipo nem no prompt.
5. Se faltar no protótipo algo que o prompt pede (ou vice-versa), **BRAIN.md/PROMPTS.md vencem** sobre o protótipo para regra de negócio; o protótipo vence para aparência. Registre a divergência em SESSIONS.md.

## G4. Tokens canônicos (use SEMPRE estes nomes)

Definidos em `packages/ui/src/tokens.css`. Nunca hardcode o hex; use o token.

| Cor / papel            | Token                               | Hex (só referência) |
| ---------------------- | ----------------------------------- | ------------------- |
| Primário (azul Hebron) | `--hb-blue`                         | #202C85             |
| Azul press / hover     | `--hb-blue-deep` / `--hb-blue-soft` | #19236A / #2A38A0   |
| Accent (laranja, CTA)  | `--hb-orange`                       | #EA5A06             |
| Suporte verde          | `--hb-green`                        | #A1C520             |
| Suporte ciano          | `--hb-cyan`                         | #07B4E7             |
| Fundo de página        | `--hb-cream` / `--bg-alt`           | #F7F8FC             |
| Superfície (card)      | `--surface`                         | #FFFFFF             |
| Texto                  | `--fg`                              | #131737             |
| Texto secundário       | `--fg-muted`                        | ~#6C7390            |
| Borda                  | `--border`                          | #DCDFEA             |
| Divisória              | `--divider`                         | rgba(19,23,55,.08)  |
| Título/display (fonte) | `--font-display` (Parkinsans)       | —                   |
| UI/corpo (fonte)       | `--font-body` (Titillium Web)       | —                   |

Semânticos preferenciais em componentes: `--brand`, `--brand-fg`, `--accent`, `--highlight-warm/cool/life`, `--surface-alt`, `--fg-invert`, `--border-strong`. Forma de marca: classe `.hb-balao` (+ variantes `--orange/--green/--cyan/--white`).

> **Pré-requisito:** os tokens canônicos só existem após **P-0.2b** (unificação do design system). Nenhum prompt de UI de fase ≥ 1 deve ser executado antes de P-0.2b concluído.

---

## G5. Layouts nos prompts de integração (P-X.9)

Todo prompt de integração **P-X.9** de qualquer módulo **deve incluir os arquivos de layout do módulo** (`(grupo)/layout.tsx`) na lista de arquivos permitidos, para:

1. Converter o layout de `"use client"` para Server Component.
2. Substituir `MOCK_USER` hardcoded por dados reais via `getAuthUser()`.
3. Criar o componente `(grupo)/shell.tsx` Client Component correspondente (mantém `usePathname` e recebe `user` como prop).
4. Conectar `logoutAction` ao `onLogout` do `AppShell`.

**Padrão obrigatório (Server/Client split):**

```
(grupo)/layout.tsx   → Server Component: chama getAuthUser(), redireciona se null, renderiza <Shell user={user}>
(grupo)/shell.tsx    → "use client": recebe user como prop, usa usePathname, renderiza AppShell
actions/auth.ts      → logoutAction: signOut + redirect(CANONICAL_LOGIN_URL)
```

> **Origem:** lacuna identificada em P-2.9b (registrada em SESSIONS.md). Aplica-se a partir de P-3.9 (Financeiro) em diante.

---

# Fase 0 — Fundação

---

### P-0.1 — Monorepo Setup

**Fase:** 0
**Módulo:** fundacao
**Tipo:** config
**Pré-condições:**

- Branch: `main`
- Dependências: nenhuma
- Env vars: nenhuma

**Escopo:**
Inicializar o monorepo com pnpm 9 + Turborepo 2. Criar a estrutura de diretórios para os 9 apps e 8 packages. Configurar tsconfig base com strict mode (zero `any`), ESLint compartilhado e Tailwind CSS v4 com CSS variables. Configurar `turbo.json` com pipelines de build, dev, lint e typecheck.

**Arquivos permitidos para criação/edição:**

- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `tooling/typescript-config/base.json`
- `tooling/typescript-config/nextjs.json`
- `tooling/eslint-config/base.js`
- `apps/admin/package.json` (template replicado para os 9 apps)
- `packages/ui/package.json` (template replicado para os 8 packages)

**Critérios de aceite:**

- [x] `pnpm install` executa sem erros
- [x] `pnpm turbo build` resolve dependências entre packages
- [x] TypeScript strict mode habilitado em toda a workspace
- [x] Estrutura de diretórios completa: 9 apps + 8 packages + 2 tooling
- [x] Lint passa
- [x] Types passam

**Notas:**
Apps: admin, projetos, plataforma, radio, financeiro, intranet, documentos, flats, tarefas. Packages: ui, db, auth, email, validators, ai, config, types. Ref: BRAIN.md seção 3 (Arquitetura).

---

### P-0.2 — Design System Base

**Fase:** 0
**Módulo:** fundacao
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-0.2-design-system`
- Dependências: P-0.1 concluído
- Env vars: nenhuma

> ⚠️ **CORRIGIDO (revisão de design system):** Este prompt foi executado com tipografia errada (Inter/Source Serif 4) e tokens `--color-*`. A identidade real é **Parkinsans + Titillium Web** com tokens **`--hb-*`**. O texto abaixo já está corrigido, mas a **migração efetiva do que já foi gerado** é feita em **P-0.2b** (obrigatório antes de qualquer UI de fase ≥ 1).

**Escopo:**
Criar o design system em `packages/ui` como fork customizado do shadcn/ui. Definir tokens de cor (Azul `#202C85`, Laranja `#EA5A06`, Verde `#A1C520`, Azul Claro `#07B4E7`) em `tokens.css` como CSS variables, usando o **vocabulário canônico `--hb-*` + semânticos** (ver BRAIN.md §5 e `design-refs/admin/hebron-tokens.css`). Configurar tipografia: **Parkinsans** (títulos/display, `--font-display`) + **Titillium Web** (UI/corpo, `--font-body`) via `next/font`. Implementar componentes primitivos: Button, Input, Select, Dialog, Drawer, Tooltip, Toast, FormField. Aplicar princípios visuais anti-IA (ver BRAIN.md seção 5).

**Arquivos permitidos para criação/edição:**

- `packages/ui/src/tokens.css`
- `packages/ui/src/components/button.tsx`
- `packages/ui/src/components/input.tsx`
- `packages/ui/src/components/select.tsx`
- `packages/ui/src/components/dialog.tsx`
- `packages/ui/src/components/toast.tsx`
- `packages/ui/src/components/form-field.tsx`
- `packages/ui/src/index.ts`

**Critérios de aceite:**

- [x] Tokens de cor disponíveis como CSS variables (`--color-primary`, `--color-accent`, etc.)
- [~] Tipografia **Parkinsans + Titillium Web** configuradas via `next/font` (correção e unificação final em P-0.2b)
- [x] Componentes primitivos exportados e importáveis por qualquer app
- [x] Visual consistente com identidade Hebron (não parece template shadcn vanilla)
- [x] Responsivo (mobile-first)
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 5. Ref visual: `.docs/Identidade Visual da Hebron Aseec.md`. Ícones via Lucide React. Princípio: espaçamento generoso, animações sutis, estados vazios com citações bíblicas.

---

### P-0.2b — Unificação do Design System (CORRETIVO — fazer antes de qualquer UI de fase ≥ 1)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-0.2b-design-system-unificacao`
- Dependências: P-0.2 concluído; referências em `design-refs/` presentes
- Env vars: nenhuma
- Skill: **invocar `/frontend-design` antes de começar**

**Problema que este prompt resolve (contexto):**
Hoje existem **3 vocabulários de token desconectados** para as mesmas cores: `--color-*` (em `packages/ui/src/tokens.css`), `--hb-*` (nas referências de design) e `--hb-primary` + hex hardcoded (em `apps/admin/src/app/admin.css`). O Admin contornou o design system com CSS próprio. Isto unifica tudo em **um** vocabulário canônico (`--hb-*` + semânticos), que é o das referências de design.

**Escopo (siga na ordem):**

1. **Reescrever `packages/ui/src/tokens.css`** adotando o conteúdo de **`design-refs/admin/hebron-tokens.css`** como base canônica:
   - Copie os blocos `:root` de cores `--hb-*`, neutros, **semânticos** (`--bg`, `--surface`, `--fg`, `--fg-muted`, `--brand`, `--accent`, `--border`, `--divider`, etc.), escala tipográfica, radii, sombras e motion.
   - Copie também as classes de tipo (`.hb-display-xl`, `.hb-h1`…`.hb-h4`, `.hb-eyebrow`, `.hb-body*`, `.hb-caption`) e a forma de marca **`.hb-balao`** (+ variantes).
   - **NÃO copie os blocos `@font-face`** do arquivo de referência. As fontes vêm via `next/font` em cada app. Mantenha:
     `--font-display: var(--font-parkinsans, 'Parkinsans', system-ui, sans-serif);`
     `--font-body: var(--font-titillium, 'Titillium Web', system-ui, sans-serif);`
   - Mantenha os tokens semânticos de estado já existentes que não há na referência: `--color-destructive*`, `--color-success*`, `--color-warning*`, `--color-info*` (renomeie depois se quiser, mas não os perca).
2. **Adicionar bloco de ALIASES de compatibilidade** no fim do `:root` (comentado como `/* DEPRECATED — remover após migração dos apps */`), mapeando os nomes antigos para os novos, para nada quebrar entre este prompt e P-1.12b:

   | Antigo (deprecated)          | Novo (canônico)         |
   | ---------------------------- | ----------------------- |
   | `--color-primary`            | `var(--hb-blue)`        |
   | `--color-primary-hover`      | `var(--hb-blue-soft)`   |
   | `--color-primary-active`     | `var(--hb-blue-deep)`   |
   | `--color-primary-foreground` | `var(--brand-fg)`       |
   | `--color-accent`             | `var(--hb-orange)`      |
   | `--color-accent-hover`       | `var(--hb-orange-deep)` |
   | `--color-support-green`      | `var(--hb-green)`       |
   | `--color-support-sky`        | `var(--hb-cyan)`        |
   | `--color-background`         | `var(--bg)`             |
   | `--color-foreground`         | `var(--fg)`             |
   | `--color-muted`              | `var(--surface-alt)`    |
   | `--color-muted-foreground`   | `var(--fg-muted)`       |
   | `--color-subtle`             | `var(--hb-gray-100)`    |
   | `--color-border`             | `var(--border)`         |
   | `--color-ring`               | `var(--hb-blue)`        |
   | `--font-ui`                  | `var(--font-body)`      |

3. **Criar `packages/ui/src/styles/patterns.css`** com as classes de layout/estrutura recorrentes que hoje vivem em `apps/admin/src/app/admin.css` e nas `styles.css` das referências (ex.: `.hb-page`, `.hb-card`, `.hb-card-header`, `.hb-stat`, `.hb-stat-dot`, `.hb-timeline`, `.hb-role-count-*`, `.hb-grid`, `.hb-grid-4`). Use **somente tokens canônicos** (sem hex). Exportar para os apps importarem (`@hebron/ui/styles/patterns.css`).
4. **Refatorar os componentes de `packages/ui`** para usar os tokens canônicos no lugar dos antigos (find/replace pela tabela do item 2). Arquivos: button, input, select, dialog, toast, form-field, app-shell, navigation-sidebar, page-header, empty-state, error-state, loading-state, user-menu, notification-bell, notification-center, impersonation-banner, brand-mark.
5. Atualizar `packages/ui/src/index.ts` se precisar exportar o novo `patterns.css`.

**Arquivos permitidos para criação/edição:**

- `packages/ui/src/tokens.css`
- `packages/ui/src/styles/patterns.css` (criar)
- `packages/ui/src/components/*.tsx` (apenas troca de tokens)
- `packages/ui/src/index.ts`
- `packages/ui/package.json` (se precisar adicionar export `./styles/patterns.css`)

**Critérios de aceite:**

- [x] `packages/ui/src/tokens.css` usa o vocabulário `--hb-*` + semânticos (igual a `design-refs/admin/hebron-tokens.css`, sem os `@font-face`)
- [x] `--font-display` = Parkinsans e `--font-body` = Titillium Web (via variáveis next/font)
- [x] Bloco de aliases deprecated presente (nada quebra nos apps existentes)
- [x] `patterns.css` criado com as classes recorrentes, sem nenhum hex hardcoded
- [x] Componentes de `@hebron/ui` referenciam tokens canônicos (zero `--color-primary` etc. fora do bloco de alias)
- [x] `grep -r "#202c85\|#ea5a06\|#07b4e7" packages/ui/src` não retorna nada (cores só via token)
- [x] `pnpm turbo build lint typecheck` verde
- [x] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §5 (fonte única da verdade). Este prompt **não** mexe nos apps; a remoção do `admin.css` e dos hex inline do Admin é feita em **P-1.12b**. Não invente componentes novos — apenas migre tokens e mova estilos recorrentes para `packages/ui`.

---

### P-0.3 — Supabase Setup

**Fase:** 0
**Módulo:** fundacao
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-0.3-supabase-setup`
- Dependências: P-0.1 concluído
- Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Escopo:**
Configurar o package `packages/db` com Drizzle ORM. Criar os schemas PostgreSQL separados por módulo (admin, projetos, plataforma, radio, financeiro, intranet, documentos, flats, tarefas). Criar tabelas base compartilhadas em `public`: `users` (espelho de auth.users), `role_assignments`, `notifications`, `designations`. Configurar Drizzle Kit para migrations versionadas.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/client.ts`
- `packages/db/src/schema/public.ts`
- `packages/db/drizzle.config.ts`
- `packages/db/src/migrations/0000_initial.sql`
- `packages/db/package.json`
- `packages/types/src/roles.ts`

**Critérios de aceite:**

- [x] Conexão com Supabase funcional via Drizzle
- [x] Schemas criados: public, admin, projetos, plataforma, radio, financeiro, intranet, documentos, flats, tarefas
- [x] Tabela `public.users` com campos: id, email, full_name, avatar_url, created_at, updated_at, suspended_at
- [x] Tabela `public.role_assignments` com campos: user_id, role, scope, scope_id, granted_by, granted_at
- [x] Tabela `public.designations` com campos: type (gestor/autorizador), user_id, assigned_by, assigned_at
- [x] Papéis definidos como enum: super_admin, diretor, conselheiro, colaborador, submissor, aluno, hospede, ouvinte
- [x] Migration gerada e aplicável via Drizzle Kit
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 3 (RBAC + RLS) e seção 6.1 (Admin). Designações (diretor gestor, diretor autorizador) modeladas como configuração, não como papel. RLS será adicionado no P-0.3 apenas para tabelas public (policies por módulo vêm nos blocos B respectivos).

---

### P-0.3b — Consolidação do Pipeline de Migrations (CORRETIVO — antes do próximo schema)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-0.3b-migration-pipeline`
- Dependências: P-0.3 a P-1.7 concluídos (migrations 0000–0003 já aplicadas manualmente)
- Env vars: `DATABASE_URL`

**Problema que este prompt resolve (contexto — débito registrado na S-13):**
As migrations 0000–0003 são SQL manuais (com RLS, partições, funções `SECURITY DEFINER`) **não** registradas no `_journal.json` do Drizzle Kit, e `drizzle.config.ts` aponta `schema` só para `./src/schema/public.ts`. Resultado: `drizzle-kit` não enxerga os schemas novos nem as migrations manuais. Isso **vai travar** a partir de P-1.18 (migration `0004_documentos.sql`) e em todos os schemas seguintes. É preciso UM fluxo único de migrations antes de continuar.

**Decisão de abordagem (confirmar com Filipe se houver dúvida — regra G1):**
Manter os **arquivos SQL numerados manuais como fonte da verdade** (eles expressam RLS/partições/policies que o `drizzle-kit generate` não gera bem), e:

1. Apontar `drizzle.config.ts` → `./src/schema/index.ts` (barrel completo) apenas para **tipagem** das queries (não para gerar migrations).
2. Criar um **runner idempotente** `packages/db/src/migrate.ts` que: cria a tabela `public._migrations(id text primary key, applied_at timestamptz default now())` se não existir; lê os `.sql` de `src/migrations/` em ordem alfabética; aplica os ainda não registrados; grava o id aplicado. Roda dentro de transação por arquivo.
3. Adicionar script `"db:migrate": "tsx src/migrate.ts"` em `packages/db/package.json`.
4. Documentar o fluxo no topo de `packages/db/src/migrations/` (ou `packages/db/README.md`): "migrations são SQL manuais numeradas; aplicar com `pnpm --filter @hebron/db db:migrate`; nunca editar uma migration já aplicada — criar uma nova".

**Arquivos permitidos para criação/edição:**

- `packages/db/drizzle.config.ts`
- `packages/db/src/schema/index.ts` (garantir barrel completo)
- `packages/db/src/migrate.ts` (criar)
- `packages/db/package.json` (script `db:migrate` + dep `tsx` se necessário)
- `packages/db/README.md` (criar/atualizar — documentar fluxo)

**Critérios de aceite:**

- [x] `drizzle.config.ts` aponta para o barrel completo de schemas
- [x] `pnpm --filter @hebron/db db:migrate` aplica migrations pendentes e é idempotente (rodar 2x não duplica)
- [x] Tabela `public._migrations` registra os arquivos aplicados (incluindo 0000–0003 marcados como aplicados)
- [x] Fluxo de migrations documentado
- [x] `pnpm turbo typecheck` verde
- [x] Registrar em SESSIONS.md

**Notas:**
Cuidado: 0000–0003 **já foram aplicadas** no banco — o runner deve marcá-las como aplicadas sem reexecutar (senão dará erro de objeto já existente). Considerar um "baseline": inserir os ids 0000–0003 em `_migrations` na primeira execução, ou usar `IF NOT EXISTS` consistente.

---

### P-0.4 — Autenticação e SSO

**Fase:** 0
**Módulo:** fundacao
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-0.4-auth`
- Dependências: P-0.3 concluído
- Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`

**Escopo:**
Implementar autenticação via Supabase Auth no package `packages/auth`. Métodos v1: email + senha e magic link (sem Google OAuth). Configurar SSO cross-platform via cookies no domínio `.hebronaseec.com.br`. Implementar middleware Next.js para detecção de sessão e redirect para `app.hebronaseec.com.br/login?return_to=...`. Configurar MFA TOTP obrigatório para super_admin e diretor. Criar página de login canônica na Intranet.

**Arquivos permitidos para criação/edição:**

- `packages/auth/src/client.ts`
- `packages/auth/src/middleware.ts`
- `packages/auth/src/mfa.ts`
- `packages/auth/src/types.ts`
- `apps/intranet/src/app/(auth)/login/page.tsx`
- `apps/intranet/src/app/(auth)/login/components/login-form.tsx`
- `apps/intranet/src/middleware.ts`

**Critérios de aceite:**

- [x] Login por email + senha funcional
- [x] Login por magic link funcional
- [x] Cookies configurados com `Domain=.hebronaseec.com.br` (em produção)
- [x] Middleware redireciona usuários não autenticados para login canônico com `return_to`
- [x] MFA TOTP configurável (obrigatório para super_admin/diretor, opcional para demais)
- [x] Refresh de sessão automático
- [x] Página de login responsiva e alinhada ao design system
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 3 (SSO cross-platform). Login canônico em `app.hebronaseec.com.br/login`. Em dev, cookies no localhost. Fluxo: detecta ausência de cookie → redirect login → Supabase grava cookies → redirect back.

---

### P-0.5 — Layout Compartilhado (AppShell)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-0.5-app-shell`
- Dependências: P-0.2, P-0.4 concluídos
- Env vars: nenhuma

**Escopo:**
Criar componentes de layout compartilhados em `packages/ui`: AppShell (sidebar + topbar + conteúdo), NavigationSidebar (colapsável, com ícones Lucide), PageHeader, EmptyState (com citações bíblicas), ErrorState, LoadingState. O AppShell deve suportar navegação entre módulos com destaque do app ativo. Sidebar recebe config de navegação por props (cada app define suas rotas).

**Arquivos permitidos para criação/edição:**

- `packages/ui/src/components/app-shell.tsx`
- `packages/ui/src/components/navigation-sidebar.tsx`
- `packages/ui/src/components/page-header.tsx`
- `packages/ui/src/components/empty-state.tsx`
- `packages/ui/src/components/error-state.tsx`
- `packages/ui/src/components/loading-state.tsx`
- `packages/ui/src/components/user-menu.tsx`

**Critérios de aceite:**

- [x] AppShell renderiza sidebar + topbar + área de conteúdo
- [x] Sidebar colapsável com ícones e labels
- [x] Sidebar suporta seções e separadores
- [x] User menu com nome, avatar, link para perfil e logout
- [x] EmptyState aceita prop de citação bíblica ou mensagem custom
- [x] Todos os componentes responsivos (sidebar vira drawer no mobile)
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 4 (Convenções — componentes compostos) e seção 5 (princípios visuais). Sidebar deve mostrar atalhos para outros apps do ecossistema (app launcher).

---

### P-0.6 — Sistema de Notificações

**Fase:** 0
**Módulo:** fundacao
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-0.6-notifications`
- Dependências: P-0.3, P-0.5 concluídos
- Env vars: `RESEND_API_KEY`

**Escopo:**
Implementar sistema de notificações base. Tabela `public.notifications` com campos: user_id, channel (in_app, email), type, title, body, payload (jsonb), read_at, sent_at. Componente compartilhado: sino com dropdown (últimas notificações) + central de notificações completa. Helper para criar notificações (in_app + email via Resend). Configurar `packages/email` com React Email e header/footer institucional.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/notifications.ts`
- `packages/ui/src/components/notification-bell.tsx`
- `packages/ui/src/components/notification-center.tsx`
- `packages/email/src/components/layout.tsx`
- `packages/email/src/lib/send.ts`
- `packages/db/src/migrations/0001_notifications.sql`

**Critérios de aceite:**

- [x] Tabela `public.notifications` criada com migration
- [x] Componente de sino com badge de contagem de não lidas
- [x] Dropdown com últimas 10 notificações
- [x] Central de notificações com filtros (todas, não lidas) e paginação
- [x] Clique na notificação marca como lida e navega para URL de destino
- [x] Helper `createNotification` que insere no banco e dispara email se canal = email
- [x] Template base de email com header (logo Hebron) e footer institucional
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 9 (checklists). v1 usa apenas in_app + email. Push e SMS removidos. Preferências de notificação por usuário serão implementadas no Admin (fase 1).

---

# Fase 1 — Admin + Documentos

---

## Admin — Bloco A (UI)

---

### P-1.1 — Schema de Tipos Admin

**Fase:** 1
**Módulo:** admin
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-1.1-admin-types`
- Dependências: P-0.6 concluído
- Env vars: nenhuma

**Escopo:**
Definir todos os tipos TypeScript e schemas Zod do módulo Admin. Inclui: User, RoleAssignment, Invitation, AuditLogEntry, SystemSetting, FeatureFlag, EmailTemplate, MeetingSession, Designation. Dados mockados para telas de UI. Schemas Zod em `packages/validators` para formulários de criação/edição de usuários, convites e configurações.

**Arquivos permitidos para criação/edição:**

- `packages/types/src/admin/index.ts`
- `packages/validators/src/admin/index.ts`
- `apps/admin/src/lib/mock-data.ts`

**Critérios de aceite:**

- [x] Tipos exportados: User, RoleAssignment, Invitation, AuditLogEntry, SystemSetting, FeatureFlag, EmailTemplate, MeetingSession, Designation
- [x] Schemas Zod: createUserSchema, updateUserSchema, createInvitationSchema, updateSettingSchema
- [x] Mock data: 10+ usuários, 5+ convites, 20+ entradas de audit log, 3+ feature flags
- [x] Zero `any` em todo o código
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.1 (Admin). MeetingSession: data, tipo (mensal/ordinária), chair_user_id (presidente), status. Designation: gestor ou autorizador.

---

### P-1.2 — Componentes UI Admin

**Fase:** 1
**Módulo:** admin
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-1.2-admin-components`
- Dependências: P-1.1 concluído
- Env vars: nenhuma

**Escopo:**
Criar componentes de UI específicos do Admin: UserTable (TanStack Table com filtros, ordenação, busca), UserCard (avatar, nome, papéis, status), RoleBadge (cor por papel), InvitationCard, AuditLogTable (com filtros avançados: ator, ação, entidade, período), FeatureFlagToggle, StatusBadge (ativo/suspenso/pendente). Todos usam dados mockados.

**Arquivos permitidos para criação/edição:**

- `apps/admin/src/components/user-table.tsx`
- `apps/admin/src/components/user-card.tsx`
- `apps/admin/src/components/role-badge.tsx`
- `apps/admin/src/components/invitation-card.tsx`
- `apps/admin/src/components/audit-log-table.tsx`
- `apps/admin/src/components/feature-flag-toggle.tsx`
- `apps/admin/src/components/status-badge.tsx`

**Critérios de aceite:**

- [x] UserTable com busca por nome/email, filtro por papel e status, ordenação por colunas
- [x] RoleBadge com cor distinta por papel (8 papéis)
- [x] AuditLogTable com filtros: ator, ação, entidade, data (range)
- [x] Todos os componentes usam design system `packages/ui`
- [x] Responsivo (tabelas scrolláveis no mobile)
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 5 (design system). TanStack Table v8 para tabelas. Lucide React para ícones.

---

### P-1.3 — Telas e Páginas Admin

**Fase:** 1
**Módulo:** admin
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-1.3-admin-pages`
- Dependências: P-1.2 concluído
- Env vars: nenhuma

**Escopo:**
Criar todas as páginas do Admin usando App Router. Dashboard (visão geral com cards de resumo: total usuários, convites pendentes, alertas). Lista de usuários. Detalhe do usuário. Convites pendentes. Auditoria. Feature flags. Configurações gerais (logos, branding, textos). Templates de email. Designações (gestor/autorizador). Reuniões. Todas com dados mockados.

**Arquivos permitidos para criação/edição:**

- `apps/admin/src/app/(dashboard)/layout.tsx`
- `apps/admin/src/app/(dashboard)/page.tsx`
- `apps/admin/src/app/(dashboard)/usuarios/page.tsx`
- `apps/admin/src/app/(dashboard)/usuarios/[id]/page.tsx`
- `apps/admin/src/app/(dashboard)/convites/page.tsx`
- `apps/admin/src/app/(dashboard)/auditoria/page.tsx`
- `apps/admin/src/app/(dashboard)/configuracoes/page.tsx`
- `apps/admin/src/app/(dashboard)/reunioes/page.tsx`

**Critérios de aceite:**

- [x] Dashboard com cards: total de usuários por papel, convites pendentes, últimas ações
- [x] Lista de usuários com UserTable (busca, filtros, paginação)
- [x] Detalhe do usuário: perfil, papéis, histórico de atividade, botão suspender
- [x] Tela de convites com status (pendente/aceito/expirado)
- [x] Auditoria com filtros avançados e exportação
- [x] Configurações: designações (gestor/autorizador), feature flags, branding
- [x] Reuniões: lista com tipo (mensal/ordinária), data, presidente
- [x] Navegação via sidebar com todas as seções
- [x] Responsivo (mobile-first)
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.1. Layout usa AppShell do P-0.5. Reuniões: sistema cria automaticamente mensal na 1a quarta-feira — mostrar como lista editável.

---

### P-1.4 — Formulários Admin

**Fase:** 1
**Módulo:** admin
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-1.4-admin-forms`
- Dependências: P-1.3 concluído
- Env vars: nenhuma

**Escopo:**
Implementar formulários do Admin com React Hook Form + Zod (schemas do P-1.1). Criar/editar usuário (nome, email, papéis, módulos). Convidar usuário (email, papéis, mensagem). Atribuir/revogar papéis. Configurar designações (gestor/autorizador). Editar templates de email (textarea com preview). Criar/editar reunião (data, tipo, presidente). Validação client-side com feedback visual.

**Arquivos permitidos para criação/edição:**

- `apps/admin/src/components/user-form.tsx`
- `apps/admin/src/components/invitation-form.tsx`
- `apps/admin/src/components/role-assignment-form.tsx`
- `apps/admin/src/components/designation-form.tsx`
- `apps/admin/src/components/email-template-editor.tsx`
- `apps/admin/src/components/meeting-form.tsx`

**Critérios de aceite:**

- [x] Formulário de usuário valida email, nome obrigatório, pelo menos 1 papel
- [x] Formulário de convite valida email e permite selecionar papéis
- [x] Formulário de designação mostra dropdown apenas com diretores
- [x] Editor de template com preview em tempo real (split view)
- [x] Formulário de reunião com datepicker e seleção de presidente
- [x] Todos os formulários usam schemas Zod de `packages/validators`
- [x] Feedback visual de erros de validação
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 4 (Server Actions com next-safe-action + Zod). Suspensão granular por módulo: checkbox para cada módulo no form de usuário. Conflito de interesse: avisar se diretor/conselheiro tentar receber papel de submissor ou hospede.

---

### P-1.5 — Estados Admin

**Fase:** 1
**Módulo:** admin
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-1.5-admin-states`
- Dependências: P-1.4 concluído
- Env vars: nenhuma

**Escopo:**
Implementar estados de loading, empty e error em todas as telas do Admin. Loading: skeletons alinhados ao layout de cada tela (não spinners genéricos). Empty: mensagens contextuais com citações bíblicas pertinentes. Error: mensagens claras com ação de retry. Skeleton para tabelas, cards e formulários.

**Arquivos permitidos para criação/edição:**

- `apps/admin/src/components/user-table-skeleton.tsx`
- `apps/admin/src/components/dashboard-skeleton.tsx`
- `apps/admin/src/components/audit-log-skeleton.tsx`
- `apps/admin/src/app/(dashboard)/page.tsx` (adicionar loading/error)
- `apps/admin/src/app/(dashboard)/usuarios/page.tsx` (adicionar loading/error)
- `apps/admin/src/app/(dashboard)/auditoria/page.tsx` (adicionar loading/error)

**Critérios de aceite:**

- [x] Cada tela principal tem skeleton específico (não genérico)
- [x] Estado vazio em cada lista com mensagem contextual
- [x] Estado de erro com mensagem e botão de retry
- [x] Transições suaves entre estados (sem flash)
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 5 (estados vazios com citações bíblicas). Ex: lista de convites vazia → "Ide por todo o mundo e pregai o evangelho — Marcos 16:15".

---

> **PAUSA — Bloco A Admin concluído. Validar telas com diretoria antes de prosseguir para Bloco B.**

---

## Admin — Bloco B (Backend)

---

### P-1.6 — Schema do Banco Admin

**Fase:** 1
**Módulo:** admin
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-1.6-admin-schema`
- Dependências: P-1.5 concluído, validação da diretoria OK
- Env vars: `DATABASE_URL`

**Escopo:**
Criar tabelas Drizzle no schema `admin`: audit_log (particionado por mês), system_settings, feature_flags, invitations (com token, expires_at, accepted_at), email_templates, meeting_sessions. Adicionar campos faltantes em `public.users`: phone, document_cpf, suspended_modules (jsonb). Migration incremental.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/admin.ts`
- `packages/db/src/schema/public.ts` (atualizar users)
- `packages/db/src/migrations/0002_admin.sql`

**Critérios de aceite:**

- [x] Tabela `admin.audit_log`: actor_id, action, entity, entity_id, diff (jsonb), ip, user_agent, created_at
- [x] Tabela `admin.invitations`: email, roles (jsonb), token, invited_by, expires_at, accepted_at
- [x] Tabela `admin.email_templates`: slug, subject, body_html, body_text, variables (jsonb)
- [x] Tabela `admin.meeting_sessions`: date, type (mensal/ordinaria), chair_user_id, status
- [x] Tabela `admin.feature_flags`: key, enabled, description
- [x] Tabela `admin.system_settings`: key, value (jsonb), updated_by
- [x] Migration aplica sem erros
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.1. audit_log é particionado por mês para performance. meeting_sessions: auto-criadas na 1a quarta de cada mês (lógica no P-1.8).

---

### P-1.7 — RLS Policies Admin

**Fase:** 1
**Módulo:** admin
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-1.7-admin-rls`
- Dependências: P-1.6 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Criar RLS policies DENY-by-default para todas as tabelas do schema admin e tabelas public (users, role_assignments, designations, notifications). Super_admin: full access. Diretores: leitura em users e role_assignments. Demais: leitura do próprio perfil. Audit_log: apenas super_admin. Feature_flags e system_settings: apenas super_admin. Invitations: super_admin cria; convidado aceita.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/0003_admin_rls.sql`
- `packages/db/src/rls/admin.ts` (declaração para referência)

**Critérios de aceite:**

- [x] RLS habilitado em TODAS as tabelas (admin._ e public._)
- [x] Default DENY em todas as tabelas
- [x] super_admin: CRUD em todas as tabelas admin
- [x] Diretores: SELECT em public.users e public.role_assignments
- [x] Usuário comum: SELECT apenas no próprio registro de public.users
- [x] admin.audit_log: apenas super_admin lê
- [x] admin.invitations: super_admin cria; usuário com email matching aceita
- [x] Testes de RLS passam (queries como diferentes roles)
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 3 (RBAC + RLS — DENY by default, USING e WITH CHECK separados). Roles propagadas no JWT para RLS performático.

---

### P-1.8 — Server Actions Admin

**Fase:** 1
**Módulo:** admin
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.8-admin-actions`
- Dependências: P-1.7 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Escopo:**
Implementar Server Actions com `next-safe-action` + Zod para o Admin. CRUD de usuários (criar, editar, suspender por módulo, reset de senha). Envio de convites por email. Atribuição/revogação de papéis (com verificação de conflito de interesse). Gerenciar designações. CRUD de feature flags e system_settings. Criar/editar reuniões. Auto-criação de reuniões mensais (1a quarta de cada mês). Registrar audit log em toda mutação.

**Arquivos permitidos para criação/edição:**

- `apps/admin/src/actions/users.ts`
- `apps/admin/src/actions/invitations.ts`
- `apps/admin/src/actions/roles.ts`
- `apps/admin/src/actions/settings.ts`
- `apps/admin/src/actions/meetings.ts`
- `apps/admin/src/lib/audit.ts`

**Critérios de aceite:**

- [x] createUser, updateUser, suspendUser (granular por módulo)
- [x] sendInvitation (cria convite + dispara email via Resend)
- [x] assignRole com verificação de conflito (diretor/conselheiro ≠ submissor/hospede)
- [x] revokeRole
- [x] updateDesignation (gestor/autorizador)
- [x] toggleFeatureFlag, updateSystemSetting
- [x] createMeeting, updateMeeting, autoCreateMonthlyMeetings
- [x] Audit log registrado em TODA mutação (actor, action, entity, diff)
- [x] Todos os actions protegidos: apenas super_admin
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.1. Conflito de interesse: diretores/conselheiros NÃO podem ser submissores NEM hospedes. Super_admins podem tudo.

---

### P-1.9 — Integração UI ↔ Backend Admin

**Fase:** 1
**Módulo:** admin
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.9-admin-integration`
- Dependências: P-1.8 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Escopo:**
Substituir dados mockados por dados reais em todas as telas do Admin. Conectar formulários às Server Actions. Implementar revalidação de cache após mutações. Conectar tabelas a queries reais com filtros server-side. Dashboard com contadores reais. Lista de usuários com busca server-side.

**Arquivos permitidos para criação/edição:**

- `apps/admin/src/app/(dashboard)/page.tsx`
- `apps/admin/src/app/(dashboard)/usuarios/page.tsx`
- `apps/admin/src/app/(dashboard)/usuarios/[id]/page.tsx`
- `apps/admin/src/app/(dashboard)/convites/page.tsx`
- `apps/admin/src/app/(dashboard)/auditoria/page.tsx`
- `apps/admin/src/app/(dashboard)/configuracoes/page.tsx`
- `apps/admin/src/app/(dashboard)/reunioes/page.tsx`
- `apps/admin/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [x] Todas as telas carregam dados reais do banco (RSC)
- [x] Formulários chamam Server Actions e exibem feedback (sucesso/erro)
- [x] Revalidação de cache após cada mutação (revalidatePath)
- [x] Filtros e busca executam server-side
- [x] Mock data removido
- [x] Lint passa
- [x] Types passam

**Notas:**
Preferir RSC + Server Actions sobre TanStack Query quando possível. Ref: BRAIN.md seção 2 (stack).

---

### P-1.10 — Notificações e Emails Admin

**Fase:** 1
**Módulo:** admin
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.10-admin-notifications`
- Dependências: P-1.9 concluído
- Env vars: `RESEND_API_KEY`

**Escopo:**
Implementar notificações específicas do Admin: convite enviado (email ao convidado), convite aceito (in_app ao admin), usuário suspenso (in_app), papel alterado (in_app ao usuário). Criar templates de email: convite, boas-vindas, reset de senha. Tela de configuração de templates de email com preview e variáveis dinâmicas.

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/invitation.tsx`
- `packages/email/src/templates/welcome.tsx`
- `packages/email/src/templates/password-reset.tsx`
- `apps/admin/src/lib/notifications.ts`
- `apps/admin/src/app/(dashboard)/templates-email/page.tsx`
- `apps/admin/src/components/email-template-preview.tsx`

**Critérios de aceite:**

- [x] Email de convite enviado ao criar convite (com link de aceitação)
- [x] Notificação in_app quando convite aceito
- [x] Template de boas-vindas enviado ao aceitar convite
- [x] Templates editáveis no Admin com preview ao vivo
- [x] Variáveis dinâmicas: {{nome}}, {{link}}, {{papel}}, {{modulo}}
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.1 (templates editáveis, nunca hardcoded). Templates em React Email. Textos padrão definidos, editáveis pelo super_admin.

---

### P-1.11 — Impersonation e Audit Avançado

**Fase:** 1
**Módulo:** admin
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.11-admin-impersonation`
- Dependências: P-1.9 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Escopo:**
Implementar impersonation auditada: super_admin pode "assumir" identidade de qualquer usuário. Banner persistente vermelho no topo de todas as telas durante impersonation ("Você está operando como [Nome] — Sair da impersonação"). Log obrigatório: quem, quando, duração, ações realizadas. Botão de encerrar impersonation sempre visível. Audit log avançado: filtros por ator, ação, entidade, período; exportação CSV.

**Arquivos permitidos para criação/edição:**

- `packages/auth/src/impersonation.ts`
- `packages/ui/src/components/impersonation-banner.tsx`
- `apps/admin/src/actions/impersonation.ts`
- `apps/admin/src/components/audit-log-filters.tsx`
- `apps/admin/src/components/audit-log-export.tsx`

**Critérios de aceite:**

- [x] Super_admin pode iniciar impersonation a partir do detalhe do usuário
- [x] Banner vermelho persistente em TODOS os apps durante impersonation
- [x] Toda ação durante impersonation logada com actor_id original + impersonated_id
- [x] Botão "Sair da impersonação" sempre visível no banner
- [x] Impersonation registrada no audit_log com início, fim e duração
- [x] Audit log: filtros avançados + exportação CSV
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.1 (Impersonação — ESSENCIAL). Cenário real: submissores ligam pedindo ajuda; antes usavam AnyDesk. Banner deve ser visível em todos os apps via componente compartilhado no AppShell.

---

### P-1.12 — Testes Admin

**Fase:** 1
**Módulo:** admin
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.12-admin-tests`
- Dependências: P-1.11 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_URL`

**Escopo:**
Testes de integração para o Admin. Testar: RLS policies (queries como cada papel), Server Actions (CRUD de usuários, convites, papéis), conflito de interesse (rejeitar papel proibido), impersonation (log gerado), audit log (registrado em mutações). Testar fluxo completo: criar convite → aceitar → usuário ativo.

**Arquivos permitidos para criação/edição:**

- `apps/admin/src/__tests__/rls.test.ts`
- `apps/admin/src/__tests__/actions.test.ts`
- `apps/admin/src/__tests__/impersonation.test.ts`
- `apps/admin/src/__tests__/audit.test.ts`

**Critérios de aceite:**

- [x] RLS: super_admin acessa tudo; diretor lê users; colaborador lê apenas próprio perfil
- [x] RLS: usuário comum NÃO acessa audit_log
- [x] Conflito de interesse: atribuir submissor a diretor retorna erro
- [x] Impersonation gera log com duração
- [x] Audit log registrado em toda mutação (criar/editar/deletar)
- [x] Fluxo convite → aceitação → usuário ativo funciona end-to-end
- [x] Testes passam
- [x] Lint passa
- [x] Types passam

---

### P-1.12b — Reconciliação do Admin ao Design System Unificado (CORRETIVO)

**Fase:** 1
**Módulo:** admin
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-1.12b-admin-ds-reconcile`
- Dependências: **P-0.2b concluído** (tokens canônicos existem) e P-1.12 concluído
- Env vars: nenhuma
- Skill: **invocar `/frontend-design` antes de começar**

**Problema que este prompt resolve (contexto):**
O Admin foi construído antes das referências de design e usa `apps/admin/src/app/admin.css` (CSS próprio que redefine tokens `--hb-primary` e cores em hex) + hex hardcoded inline nas páginas (ex.: `style={{color:'#07b4e7'}}`). Isso duplica o design system. Este prompt faz o Admin passar a consumir o `packages/ui` unificado, **sem mudar a aparência** (a aparência atual já segue `design-refs/admin/`).

**Escopo (siga na ordem):**

1. Em `apps/admin/src/app/globals.css`, manter `@import "tailwindcss";` + `@import` do `tokens.css` de `@hebron/ui` e **adicionar** o import de `@hebron/ui/styles/patterns.css`.
2. **Esvaziar `apps/admin/src/app/admin.css`** de tudo que duplica o design system: remover o bloco `:root` com `--hb-page-bg/--hb-primary/...` (agora vêm dos tokens canônicos) e remover as classes que foram movidas para `patterns.css` em P-0.2b. Manter apenas o que for **exclusivo do Admin** e não couber em `patterns.css` (se sobrar algo, comentar explicando).
3. **Substituir todos os hex de marca hardcoded** nas páginas e componentes do Admin por tokens canônicos. Rode e zere:
   - `grep -rn "#202c85\|#19236a\|#2a38a0\|#ea5a06\|#07b4e7\|#a1c520\|#131737\|#f7f8fc\|#6b7280\|#dde0ef" apps/admin/src`
   - Troque cada um pelo token correspondente (ex.: `#07b4e7` → `var(--hb-cyan)`, `#202c85` → `var(--hb-blue)`, `#6b7280` → `var(--fg-muted)`).
4. Onde o Admin usa classes `.hb-btn*` próprias, **trocar pelo componente `<Button>` de `@hebron/ui`** com a variante equivalente.
5. Conferir cada tela contra `design-refs/admin/` (overview, users, invites, audit-meetings, settings) — o resultado visual deve continuar fiel ao protótipo.

**Arquivos permitidos para criação/edição:**

- `apps/admin/src/app/globals.css`
- `apps/admin/src/app/admin.css`
- `apps/admin/src/app/(dashboard)/**/*.tsx` (apenas troca de hex→token e classes→componentes)
- `apps/admin/src/components/**/*.tsx` (idem)

**Critérios de aceite:**

- [x] `grep -rn "#202c85\|#07b4e7\|#ea5a06\|#a1c520\|#131737\|#6b7280" apps/admin/src` não retorna nada (zero hex de marca)
- [x] `admin.css` não redefine tokens da marca nem duplica classes do design system
- [x] Botões usam `<Button>` de `@hebron/ui` (sem `.hb-btn` local)
- [x] Visual de cada tela permanece fiel a `design-refs/admin/`
- [x] Testes do Admin (P-1.12) continuam passando
- [x] `pnpm turbo build lint typecheck` verde
- [x] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §5. **Não** altere regra de negócio, queries ou Server Actions — somente a camada de estilo. Se uma classe do protótipo ainda não existir em `patterns.css`, adicione-a lá (em `packages/ui`), nunca em um CSS do app.

---

## Documentos — Bloco A (UI)

> 🎨 **Design + Skill (vale para P-1.14 a P-1.17):** há referência visual em **`design-refs/documentos/`** (telas públicas + editoriais, `tokens.css`, `components.jsx`). Antes de cada prompt de UI: **invoque `/frontend-design`** e siga o procedimento **G3** das Instruções Globais — replicar o protótipo traduzindo para `@hebron/ui` + tokens canônicos `--hb-*`, **sem** criar CSS de app nem hex hardcoded. Pré-requisito: **P-0.2b concluído**.

---

### P-1.13 — Schema de Tipos Documentos

> ✅ **Status (revisão 2026-06-16):** arquivos commitados em `f3f76f6` (branch `feat/P-1.12b-admin-ds-reconcile`). Critérios validados e registrados em S-22.

**Fase:** 1
**Módulo:** documentos
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-1.13-docs-types`
- Dependências: P-0.6 concluído
- Env vars: nenhuma

**Escopo:**
Definir tipos TypeScript e schemas Zod para o módulo Documentos. Tipos: Document (com visibility: public | internal | restricted), Category (árvore hierárquica), Tag, DocumentVersion, Edital (subtipo com datas de abertura/fechamento), Subscription. Dados mockados para UI. Schemas Zod para criação/edição de documentos e editais.

**Arquivos permitidos para criação/edição:**

- `packages/types/src/documentos/index.ts`
- `packages/validators/src/documentos/index.ts`
- `apps/documentos/src/lib/mock-data.ts`

**Critérios de aceite:**

- [x] Tipos exportados: Document, Category, Tag, DocumentVersion, Edital, Subscription
- [x] Visibility enum: public, internal, restricted
- [x] Edital herda de Document com campos: opens_at, closes_at, project_type, project_category
- [x] Mock data: 15+ documentos, 5+ categorias, 3+ editais (1 aberto, 1 fechado, 1 permanente)
- [x] Schemas Zod: createDocumentSchema, createEditalSchema, updateDocumentSchema
- [x] Zero `any`
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.7. Editais pontuais = permanentemente disponíveis; anuais = abrem e fecham por datas.

---

### P-1.14 — Componentes UI Documentos

**Fase:** 1
**Módulo:** documentos
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-1.14-docs-components`
- Dependências: P-1.13 concluído
- Env vars: nenhuma

**Escopo:**
Criar componentes específicos: DocumentCard (título, resumo, categoria, tags, data, badge de visibilidade), EditalCard (com status aberto/fechado e botão "submeter projeto"), CategoryTree (navegação em árvore), DocumentViewer (renderização inline de PDF/Markdown), SearchBar (busca por título, categoria, tag), VersionHistory (lista de versões com diff visual).

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/components/document-card.tsx`
- `apps/documentos/src/components/edital-card.tsx`
- `apps/documentos/src/components/category-tree.tsx`
- `apps/documentos/src/components/document-viewer.tsx`
- `apps/documentos/src/components/search-bar.tsx`
- `apps/documentos/src/components/version-history.tsx`

**Critérios de aceite:**

- [x] DocumentCard com badge de visibilidade (público=verde, interno=azul, restrito=vermelho)
- [x] EditalCard mostra status (aberto/fechado), cronograma e CTA
- [x] CategoryTree com navegação hierárquica colapsável
- [x] DocumentViewer renderiza PDF inline e Markdown com formatação
- [x] SearchBar com busca por título + filtro por categoria e tag
- [x] VersionHistory com lista de versões e indicador de versão atual
- [x] Responsivo
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.7. Botão "submeter projeto" no edital leva ao módulo Projetos com pré-preenchimento (tipo + categoria).

---

### P-1.15 — Telas e Páginas Documentos

**Fase:** 1
**Módulo:** documentos
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-1.15-docs-pages`
- Dependências: P-1.14 concluído
- Env vars: nenhuma

**Escopo:**
Criar páginas do portal público de Documentos. Home com destaques e editais abertos. Listagem por categoria com filtros (visibilidade, tags, data). Página de documento (viewer + download + versões). Página de edital (cronograma, FAQ, botão submeter projeto). Busca global. Área editorial (dashboard, editor Markdown + upload PDF, gestão de categorias). SEO: metadata dinâmica, OG tags.

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/app/page.tsx`
- `apps/documentos/src/app/[slug]/page.tsx`
- `apps/documentos/src/app/editais/page.tsx`
- `apps/documentos/src/app/editais/[slug]/page.tsx`
- `apps/documentos/src/app/busca/page.tsx`
- `apps/documentos/src/app/(editorial)/layout.tsx`
- `apps/documentos/src/app/(editorial)/page.tsx`
- `apps/documentos/src/app/(editorial)/novo/page.tsx`

**Critérios de aceite:**

- [x] Home com seção de destaques e editais abertos em destaque
- [x] Listagem com filtros por categoria, visibilidade e tags
- [x] Página de documento com viewer inline, download e versões
- [x] Página de edital com cronograma visual, FAQ e botão "submeter projeto"
- [x] Busca full-text com resultados categorizados
- [~] Área editorial protegida (super_admin/editor)
- [x] Metadata e OG tags dinâmicos por documento
- [x] Responsivo
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.7. Parte pública acessível sem login. Parte editorial requer autenticação.

---

### P-1.16 — Formulários Documentos

**Fase:** 1
**Módulo:** documentos
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-1.16-docs-forms`
- Dependências: P-1.15 concluído
- Env vars: nenhuma

**Escopo:**
Formulários editoriais: criar/editar documento (título, slug, conteúdo Markdown ou upload PDF, categoria, tags, visibilidade). Criar/editar edital (herda documento + datas abertura/fechamento, tipo de projeto, categoria de projeto, FAQ). Gestão de categorias (criar, editar, reordenar na árvore). Subscriptions (email para alertas por categoria).

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/components/document-form.tsx`
- `apps/documentos/src/components/edital-form.tsx`
- `apps/documentos/src/components/category-form.tsx`
- `apps/documentos/src/components/subscription-form.tsx`
- `apps/documentos/src/components/markdown-editor.tsx`

**Critérios de aceite:**

- [x] Editor Markdown com preview em tempo real (split view)
- [x] Upload de PDF com preview inline
- [x] Seleção de categoria via árvore hierárquica
- [x] Tags com autocomplete + criação inline
- [x] Edital: campos de data (abertura/fechamento), vinculação a tipo+categoria de projeto
- [x] Subscription: seleção de categorias para receber alertas por email
- [x] Validação Zod com feedback visual
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.7. Apenas super_admin e colaboradores com papel "editor" podem publicar.

---

### P-1.17 — Estados Documentos

**Fase:** 1
**Módulo:** documentos
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-1.17-docs-states`
- Dependências: P-1.16 concluído
- Env vars: nenhuma

**Escopo:**
Implementar estados de loading, empty e error em todas as telas de Documentos. Skeletons para cards de documento, lista, edital e busca. Estados vazios contextuais para portal público e área editorial. Skeleton para o viewer de documento.

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/components/document-card-skeleton.tsx`
- `apps/documentos/src/components/document-viewer-skeleton.tsx`
- `apps/documentos/src/components/search-results-skeleton.tsx`
- `apps/documentos/src/app/page.tsx` (adicionar estados)
- `apps/documentos/src/app/busca/page.tsx` (adicionar estados)

**Critérios de aceite:**

- [x] Skeleton específico para cards, viewer e busca
- [x] Estado vazio no portal: "Nenhum documento encontrado" com busca alternativa
- [x] Estado vazio nos editais: "Nenhum edital aberto no momento"
- [x] Estado de erro com retry
- [x] Lint passa
- [x] Types passam

---

> **PAUSA — Bloco A Documentos concluído. Validar telas com diretoria antes de prosseguir para Bloco B.**

---

## Documentos — Bloco B (Backend)

---

### P-1.18 — Schema do Banco Documentos

**Fase:** 1
**Módulo:** documentos
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-1.18-docs-schema`
- Dependências: P-1.17 concluído, validação da diretoria OK
- Env vars: `DATABASE_URL`

**Escopo:**
Criar tabelas Drizzle no schema `documentos`: documents (title, slug, content_md, file_url, visibility, published_at, author_id), categories (name, parent_id — árvore), tags, document_tags, document_versions (content, file_url, version_number, created_by), editals (extends documents: opens_at, closes_at, project_type, project_category_id), subscriptions (user_id, category_id), views (document_id, user_id, viewed_at).

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/documentos.ts`
- `packages/db/src/migrations/0004_documentos.sql`

**Critérios de aceite:**

- [x] Tabela `documentos.documents` com visibility enum (public, internal, restricted)
- [x] Tabela `documentos.categories` com parent_id (auto-referência para árvore)
- [x] Tabela `documentos.document_versions` com FK para documents
- [x] Tabela `documentos.editals` herdando de documents com datas
- [x] Tabela `documentos.subscriptions` para alertas por categoria
- [x] Tabela `documentos.views` para analytics
- [x] Indexes em slug, visibility, published_at
- [x] Migration aplica sem erros
- [x] Types passam

---

### P-1.19 — RLS Policies Documentos

**Fase:** 1
**Módulo:** documentos
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-1.19-docs-rls`
- Dependências: P-1.18 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
RLS DENY-by-default para todas as tabelas documentos.\*. Público (anon): SELECT em documents com visibility = 'public'. Usuários autenticados: SELECT em documents com visibility = 'public' ou 'internal'. Super_admin e editor: CRUD completo. Restricted: visível apenas para papéis definidos (verificar via role_assignments). Versions: mesma regra do documento pai.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/0005_documentos_rls.sql`

**Critérios de aceite:**

- [x] Anon: vê apenas documentos public
- [x] Autenticado: vê public + internal
- [x] Restricted: vê apenas se tem papel permitido
- [x] Super_admin/editor: CRUD completo
- [x] Versions herdam visibilidade do documento pai
- [x] Subscriptions: apenas próprias (user_id = auth.uid())
- [x] Types passam

---

### P-1.20 — Server Actions Documentos

**Fase:** 1
**Módulo:** documentos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.20-docs-actions`
- Dependências: P-1.19 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Escopo:**
Server Actions para Documentos: CRUD de documentos (criar, editar, publicar/despublicar, soft-delete). Upload de PDF para Supabase Storage. Versionamento (cada edição cria nova versão). CRUD de categorias. CRUD de editais. Gerenciar subscriptions. Busca full-text (título, conteúdo, tags). Registrar views. Audit log em mutações.

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/actions/documents.ts`
- `apps/documentos/src/actions/categories.ts`
- `apps/documentos/src/actions/editals.ts`
- `apps/documentos/src/actions/subscriptions.ts`
- `apps/documentos/src/actions/search.ts`

**Critérios de aceite:**

- [x] createDocument com upload de PDF para Supabase Storage (signed URL)
- [x] updateDocument cria nova versão automaticamente
- [x] Busca full-text por título, conteúdo Markdown e tags
- [x] publishDocument / unpublishDocument com audit log
- [x] CRUD de categorias com reordenação na árvore
- [x] createEdital com datas e vinculação a tipo+categoria de projeto
- [x] subscribe/unsubscribe por categoria
- [x] Todos os actions protegidos: super_admin ou editor
- [x] Lint passa
- [x] Types passam

---

### P-1.21 — Integração UI ↔ Backend Documentos

**Fase:** 1
**Módulo:** documentos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.21-docs-integration`
- Dependências: P-1.20 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Escopo:**
Substituir mocks por dados reais em todas as telas. Conectar formulários editoriais às actions. Portal público com SSR (SEO). Busca server-side. Viewer carregando PDF do Supabase Storage. Versionamento funcional com navegação entre versões.

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/app/page.tsx`
- `apps/documentos/src/app/[slug]/page.tsx`
- `apps/documentos/src/app/editais/page.tsx`
- `apps/documentos/src/app/editais/[slug]/page.tsx`
- `apps/documentos/src/app/busca/page.tsx`
- `apps/documentos/src/app/(editorial)/page.tsx`
- `apps/documentos/src/app/(editorial)/novo/page.tsx`
- `apps/documentos/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [x] Portal público renderiza documentos do banco com SSR
- [x] Busca funcional com resultados do banco
- [x] Viewer carrega PDFs do Supabase Storage
- [x] Formulários editoriais conectados às actions
- [x] Versionamento: navegar entre versões de um documento
- [x] Mock data removido
- [x] Lint passa
- [x] Types passam

---

### P-1.22 — Notificações e Emails Documentos

**Fase:** 1
**Módulo:** documentos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.22-docs-notifications`
- Dependências: P-1.21 concluído
- Env vars: `RESEND_API_KEY`

**Escopo:**
Notificações: novo documento publicado em categoria assinada (email para subscribers). Edital aberto (email para todos os submissores ativos). Edital prestes a fechar (7 dias antes, email para submissores).

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/new-document.tsx`
- `packages/email/src/templates/edital-open.tsx`
- `packages/email/src/templates/edital-closing.tsx`
- `apps/documentos/src/lib/notifications.ts`

**Critérios de aceite:**

- [x] Email enviado a subscribers quando documento publicado em categoria assinada
- [x] Email de edital aberto enviado a todos os submissores
- [x] Email de lembrete 7 dias antes do fechamento do edital
- [x] Templates com layout institucional (header/footer)
- [x] Lint passa
- [x] Types passam

---

### P-1.23 — Integração Documentos ↔ Projetos

**Fase:** 1
**Módulo:** documentos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.23-docs-projetos`
- Dependências: P-1.21 concluído
- Env vars: nenhuma

**Escopo:**
Implementar integração entre edital e módulo Projetos. Botão "submeter projeto" no edital gera URL com query params: `projetos.hebronaseec.com.br/novo?edital_id=X&tipo=anual&categoria=Y`. Preparar a recepção desses params no módulo Projetos (placeholder). Vincular projeto ao edital de origem (campo edital_id no schema de Projetos).

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/components/edital-submit-button.tsx`
- `packages/types/src/projetos/index.ts` (adicionar edital_id)
- `apps/documentos/src/app/editais/[slug]/page.tsx` (adicionar botão)

**Critérios de aceite:**

- [x] Botão "submeter projeto" visível em editais abertos
- [x] URL gerada com edital_id, tipo e categoria como query params
- [x] Tipo projetos/index.ts inclui campo edital_id opcional
- [x] Botão oculto em editais fechados
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 7 (Documentos → Projetos). A recepção completa dos params será implementada na fase 2 (Projetos).

---

### P-1.24 — Testes Documentos

**Fase:** 1
**Módulo:** documentos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.24-docs-tests`
- Dependências: P-1.23 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Testes de integração para Documentos. RLS: anon vê public, autenticado vê public+internal, restricted apenas com papel. Actions: CRUD de documentos, versionamento (edição cria versão), busca full-text, categorias hierárquicas. Fluxo: criar documento → publicar → subscriber recebe notificação.

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/__tests__/rls.test.ts`
- `apps/documentos/src/__tests__/actions.test.ts`
- `apps/documentos/src/__tests__/search.test.ts`

**Critérios de aceite:**

- [x] RLS: anon vê apenas public; autenticado vê public+internal; restricted respeita papel
- [x] Versionamento: edição incrementa versão e preserva histórico
- [x] Busca retorna resultados por título, conteúdo e tags
- [x] Categorias: árvore hierárquica funciona (pai→filho→neto)
- [x] Testes passam
- [x] Lint passa
- [x] Types passam

---

# Fase 2 — Projetos

---

## Projetos — Bloco A (UI)

---

### P-2.1 — Schema de Tipos Projetos

**Fase:** 2
**Módulo:** projetos
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-2.1-projetos-types`
- Dependências: P-1.24 concluído
- Env vars: nenhuma

**Escopo:**
Definir tipos e schemas Zod do módulo Projetos — o mais complexo do ecossistema. Tipos: Project (com stages, dois tipos: pontual/anual), Organization, ProjectVersion, Evaluation, Vote, Contestation, Report, ReportAttachment, CompactVersion, MeetingAgenda. Stages como enum: rascunho, validacao, votacao, homologacao, aprovado, reprovado, em_execucao, concluido, cancelado. Mock data extenso para todas as telas.

**Arquivos permitidos para criação/edição:**

- `packages/types/src/projetos/index.ts`
- `packages/validators/src/projetos/index.ts`
- `apps/projetos/src/lib/mock-data.ts`

**Critérios de aceite:**

- [x] Tipos: Project, Organization, ProjectVersion, Evaluation, Vote, Contestation, Report, CompactVersion
- [x] Stages enum completo (9 estados)
- [x] Formulário anual: 10+ campos obrigatórios (ver BRAIN.md 6.2)
- [x] Formulário pontual: 6 campos obrigatórios (ver BRAIN.md 6.2)
- [x] Schemas Zod: createAnnualProjectSchema, createPunctualProjectSchema, createReportSchema, createEvaluationSchema
- [x] Mock data: 20+ projetos em vários stages, 5+ instituições, 10+ relatórios
- [x] Zero `any`
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.2 (Projetos). parent_project_id para renovações. edital_id para integração com Documentos.

---

### P-2.2 — Componentes UI Projetos

**Fase:** 2
**Módulo:** projetos
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-2.2-projetos-components`
- Dependências: P-2.1 concluído
- Env vars: nenhuma

**Escopo:**
Componentes para ambas as áreas (submissor e diretoria). ProjectCard (título, instituição, valor, stage, badge). ProjectKanban (pipeline por stage com drag-drop). ProjectTimeline (histórico de transições). VotePanel (pergunta "Você sente paz...", botões sim/não, quórum). EvaluationCard (parecer do avaliador). ReportCard (relatório com status e anexos). ScoreIndicator (barra visual de score IA, visível apenas para diretoria). OrganizationCard.

**Arquivos permitidos para criação/edição:**

- `apps/projetos/src/components/project-card.tsx`
- `apps/projetos/src/components/project-kanban.tsx`
- `apps/projetos/src/components/project-timeline.tsx`
- `apps/projetos/src/components/vote-panel.tsx`
- `apps/projetos/src/components/evaluation-card.tsx`
- `apps/projetos/src/components/report-card.tsx`
- `apps/projetos/src/components/score-indicator.tsx`
- `apps/projetos/src/components/organization-card.tsx`

**Critérios de aceite:**

- [x] ProjectCard com badge de stage colorido e formatação de valor em BRL
- [x] ProjectKanban com colunas por stage e drag-drop (somente para diretoria)
- [x] VotePanel: pergunta "Você sente paz em investir neste projeto?", sim/não, contador de quórum
- [x] ScoreIndicator: barra de progresso com score IA (0-100), visível apenas para super_admin/diretor/conselheiro
- [x] EvaluationCard: parecer (aprovação/reprovação) + observações (texto)
- [x] Responsivo
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.2 (votação secreta — ninguém vê quem votou). VotePanel não mostra quem votou, apenas contagem total.

---

### P-2.3 — Telas e Páginas Projetos

**Fase:** 2
**Módulo:** projetos
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-2.3-projetos-pages`
- Dependências: P-2.2 concluído
- Env vars: nenhuma

**Escopo:**
Criar todas as páginas. Área do submissor: dashboard (meus projetos + status + pagamentos + relatórios pendentes + orçamento), wizard de novo projeto (multi-step), detalhe do projeto, envio de relatório, prestação de contas, perfil da instituição. Área da diretoria: pipeline kanban, detalhe analítico (painel IA), tela de avaliação, pauta da reunião (com BI: saldo, meses restantes), relatórios consolidados.

**Arquivos permitidos para criação/edição:**

- `apps/projetos/src/app/(submissor)/layout.tsx`
- `apps/projetos/src/app/(submissor)/page.tsx`
- `apps/projetos/src/app/(submissor)/novo/page.tsx`
- `apps/projetos/src/app/(submissor)/[id]/page.tsx`
- `apps/projetos/src/app/(diretoria)/layout.tsx`
- `apps/projetos/src/app/(diretoria)/page.tsx`
- `apps/projetos/src/app/(diretoria)/[id]/page.tsx`
- `apps/projetos/src/app/(diretoria)/reuniao/page.tsx`

**Critérios de aceite:**

- [x] Dashboard submissor: meus projetos, projeção de pagamentos, relatórios pendentes, orçamento disponível
- [x] Wizard multi-step: instituição → proposta → orçamento → cronograma → anexos → revisão
- [x] Detalhe do projeto com timeline de stages
- [x] Pipeline kanban (diretoria) com todos os stages
- [x] Detalhe analítico (diretoria): painel IA com score + resumo + riscos
- [x] Pauta da reunião: projetos pontuais + saldo + meses restantes (data-driven)
- [x] Navegação sidebar separada por área (submissor vs diretoria)
- [x] Responsivo
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.2. Dashboard do submissor: simplicidade e clareza (público em transição tecnológica).

---

### P-2.4 — Formulários Projetos

**Fase:** 2
**Módulo:** projetos
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-2.4-projetos-forms`
- Dependências: P-2.3 concluído
- Env vars: nenhuma

**Escopo:**
Implementar formulários do módulo. Wizard de projeto anual (multi-step com validação por etapa): instituição (autocomplete), proposta (nome, responsável, descrição, local com Google Places + fallback texto, categoria), orçamento (valor total, parcelas, meses), anexos (vídeo até 3min, planilha orçamento, carta recomendação), revisão final. Formulário pontual (6 campos simplificados, anexos opcionais). Formulário de relatório. Formulário de avaliação/parecer. Formulário de voto. Formulário de contestação.

**Arquivos permitidos para criação/edição:**

- `apps/projetos/src/components/project-wizard.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-institution.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-proposal.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-budget.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-attachments.tsx`
- `apps/projetos/src/components/project-wizard-steps/step-review.tsx`
- `apps/projetos/src/components/punctual-project-form.tsx`
- `apps/projetos/src/components/report-form.tsx`

**Critérios de aceite:**

- [x] Wizard anual: 5 steps com validação Zod por step, navegação prev/next
- [x] Local com autocomplete (Google Places) + fallback texto livre
- [x] Meses de pagamento: seleção múltipla (checkboxes dos 12 meses)
- [x] Upload de vídeo (max 3min), planilha e carta (com preview)
- [x] Formulário pontual: 6 campos obrigatórios, anexos opcionais
- [x] Formulário de relatório: texto estruturado + upload de anexos
- [x] Recepção de query params (edital_id, tipo, categoria) para pré-preenchimento
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.2 (formulários anual e pontual confirmados). Duração inferida dos meses de pagamento. Máximo 12 meses.

---

### P-2.5 — Estados Projetos

**Fase:** 2
**Módulo:** projetos
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-2.5-projetos-states`
- Dependências: P-2.4 concluído
- Env vars: nenhuma

**Escopo:**
Loading, empty e error states para todas as telas de Projetos. Skeletons para dashboard submissor, kanban diretoria, wizard, detalhe do projeto. Estado vazio para submissor sem projetos. Estado vazio para diretoria sem projetos no stage. Indicadores de progresso no wizard.

**Arquivos permitidos para criação/edição:**

- `apps/projetos/src/components/dashboard-skeleton.tsx`
- `apps/projetos/src/components/kanban-skeleton.tsx`
- `apps/projetos/src/components/project-detail-skeleton.tsx`
- `apps/projetos/src/app/(submissor)/page.tsx` (adicionar estados)
- `apps/projetos/src/app/(diretoria)/page.tsx` (adicionar estados)

**Critérios de aceite:**

- [x] Skeleton por tela (dashboard, kanban, detalhe)
- [x] Estado vazio submissor: "Você ainda não submeteu nenhum projeto" + CTA
- [x] Estado vazio diretoria: mensagem por coluna do kanban
- [x] Wizard: indicador de progresso (step atual / total)
- [x] Lint passa
- [x] Types passam

---

> **PAUSA — Bloco A Projetos concluído. Validar telas com diretoria antes de prosseguir para Bloco B.**

---

## Projetos — Bloco B (Backend)

---

### P-2.6 — Schema do Banco Projetos

**Fase:** 2
**Módulo:** projetos
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-2.6-projetos-schema`
- Dependências: P-2.5 concluído, validação da diretoria OK
- Env vars: `DATABASE_URL`

**Escopo:**
Criar tabelas Drizzle no schema `projetos`: organizations, organization_members (N:N), projects (com stages, tipo, parent_project_id, edital_id), project_versions, evaluations, votes (secreto), contestations, reports, report_attachments, categories, compact_versions, payment_schedules. State machine de stages com transições válidas.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/projetos.ts`
- `packages/db/src/migrations/0006_projetos.sql`

**Critérios de aceite:**

- [x] organizations: nome, cnpj, endereco, telefone, responsavel_legal, denominacao, estatuto_url
- [x] organization_members: organization_id, user_id (many-to-many)
- [x] projects: 20+ campos incluindo stage, tipo, budget_total, parcelas, meses, parent_project_id, edital_id, score_ai, deleted_at (soft-delete)
- [x] votes: project_id, user_id, value (boolean), criado secreto (sem JOIN visível a não-admin)
- [x] contestations: project_id, user_id, justification, max 2 por projeto, 1 por pessoa
- [x] reports: project_id, content, status, due_date, submitted_at
- [x] payment_schedules: project_id, amount, month, due_date, status
- [x] Transições de stage definidas (sem permitir pular stages)
- [x] Migration aplica sem erros
- [x] Types passam

---

### P-2.7 — RLS Policies Projetos

**Fase:** 2
**Módulo:** projetos
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-2.7-projetos-rls`
- Dependências: P-2.6 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
RLS para schema projetos. Submissor: vê apenas projetos da própria instituição. Diretor/conselheiro: vê todos os projetos em votação+. Super_admin: full access. Votes: INSERT para diretores/conselheiros; SELECT apenas por super_admin (segredo). Evaluations: INSERT pelo avaliador designado; SELECT por diretores. Contestations: INSERT por diretores/conselheiros (max 1/pessoa/projeto). Reports: INSERT pelo submissor; SELECT por super_admin e diretores.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/0007_projetos_rls.sql`

**Critérios de aceite:**

- [x] Submissor: CRUD apenas em projetos de suas instituições
- [x] Diretor/conselheiro: SELECT em projetos stage >= votacao
- [x] Super_admin: full access
- [x] Votes: INSERT por diretores/conselheiros; SELECT apenas super_admin
- [x] Score IA: visível apenas para super_admin, diretores, conselheiros (nunca submissor)
- [x] Contestations: max 1 por pessoa por projeto (constraint + RLS)
- [x] Reports: submissor insere; super_admin/diretores leem
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.2 (voto secreto, score invisível para submissor).

---

### P-2.8 — Server Actions Projetos

**Fase:** 2
**Módulo:** projetos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-2.8-projetos-actions`
- Dependências: P-2.7 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`

**Escopo:**
Server Actions para Projetos. CRUD de projetos (criar rascunho, submeter, editar em rascunho). Transições de stage (state machine com validações). CRUD de organizações e membros. Votação (registrar voto secreto, verificar quórum). Contestação (verificar limites). Avaliação (designar avaliador, registrar parecer). Relatórios (criar, submeter). Soft-delete com justificativa. Bloqueio de submissão se orçamento excedido. Geração de versão compacta via IA (GPT-4.1). Triagem e score IA.

**Arquivos permitidos para criação/edição:**

- `apps/projetos/src/actions/projects.ts`
- `apps/projetos/src/actions/organizations.ts`
- `apps/projetos/src/actions/voting.ts`
- `apps/projetos/src/actions/evaluations.ts`
- `apps/projetos/src/actions/reports.ts`
- `packages/ai/src/projects/scoring.ts`
- `packages/ai/src/projects/compact-version.ts`

**Critérios de aceite:**

- [x] State machine: transições válidas (rascunho→validacao→votacao→homologacao→aprovado/reprovado→em_execucao→concluido)
- [x] Bloqueio de submissão se orçamento da instituição excedido
- [x] Votação: registra voto secreto; calcula quórum (>=50% diretores+conselheiros); maioria simples
- [x] Botão de pânico: super_admin encerra votação com maioria+1 dos existentes
- [x] Contestação: max 2 por projeto, 1 por pessoa, retorna para votação
- [x] Homologação: 7 dias sem contestação → notificar submissor
- [x] Score IA: GPT-4.1 com critérios do Admin
- [x] Versão compacta: GPT-4.1 com template do Admin
- [x] Soft-delete com justificativa obrigatória
- [x] Audit log em toda mutação
- [x] Lint passa
- [x] Types passam

---

### P-2.9 — Integração UI ↔ Backend Projetos

**Fase:** 2
**Módulo:** projetos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-2.9-projetos-integration`
- Dependências: P-2.8 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Escopo:**
Substituir mocks por dados reais em todas as telas de Projetos. Dashboard submissor com dados reais (projetos, pagamentos, relatórios, orçamento). Pipeline kanban com projetos do banco. Wizard conectado às actions. Votação funcional. Pauta da reunião com dados de BI reais (saldo, meses).

**Arquivos permitidos para criação/edição:**

- `apps/projetos/src/app/(submissor)/page.tsx`
- `apps/projetos/src/app/(submissor)/novo/page.tsx`
- `apps/projetos/src/app/(submissor)/[id]/page.tsx`
- `apps/projetos/src/app/(diretoria)/page.tsx`
- `apps/projetos/src/app/(diretoria)/[id]/page.tsx`
- `apps/projetos/src/app/(diretoria)/reuniao/page.tsx`
- `apps/projetos/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [x] Dashboard submissor com dados reais
- [x] Wizard salva projeto no banco, faz upload de anexos
- [x] Pipeline kanban reflete stages do banco
- [x] Votação funcional (registra, calcula quórum, exibe resultado)
- [x] Pauta da reunião: saldo real do Financeiro (placeholder se módulo não existe ainda)
- [x] Score IA exibido apenas para diretoria
- [x] Mock data removido
- [x] Lint passa
- [x] Types passam

---

### P-2.9b — Usuário Real no Header de Projetos (CORRETIVO)

**Fase:** 2
**Módulo:** projetos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-2.9b-projetos-real-user`
- Dependências: P-2.9 concluído
- Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Problema que este prompt resolve (contexto):**
Os layouts `(submissor)/layout.tsx` e `(diretoria)/layout.tsx` foram criados em P-2.3 com `MOCK_USER` hardcoded. O prompt P-2.9 não incluiu layouts nos arquivos permitidos, deixando nome e email do usuário no header sempre com dados fictícios. Este prompt corrige a lacuna aplicando o padrão Server/Client split aos layouts.

**Escopo:**

1. Estender `getAuthUser()` em `apps/projetos/src/lib/queries.ts` para também retornar `email` (disponível no objeto `user` do Supabase Auth — não requer query adicional ao banco).
2. Criar `apps/projetos/src/app/(submissor)/shell.tsx` — componente `"use client"` que recebe `user` como prop e renderiza `AppShell` com `usePathname`. Migrar toda a lógica atual do layout para cá (seções de navegação, `profileHref`, etc.).
3. Converter `apps/projetos/src/app/(submissor)/layout.tsx` em Server Component (remover `"use client"`): chamar `getAuthUser()`, redirecionar para `CANONICAL_LOGIN_URL` se `null`, renderizar `<SubmissorShell user={user}>`.
4. Repetir os passos 2–3 para `(diretoria)`: criar `diretoria/shell.tsx`, converter `diretoria/layout.tsx`.
5. Criar `apps/projetos/src/actions/auth.ts` com uma Server Action `logoutAction` que chama `supabase.auth.signOut()` e redireciona para `CANONICAL_LOGIN_URL`. Passar ao `onLogout` do shell em vez de `() => undefined`.

**Arquivos permitidos para criação/edição:**

- `apps/projetos/src/lib/queries.ts` (adicionar `email` ao retorno de `getAuthUser`)
- `apps/projetos/src/app/(submissor)/layout.tsx` (converter para Server Component)
- `apps/projetos/src/app/(submissor)/shell.tsx` (criar — Client Component)
- `apps/projetos/src/app/(diretoria)/layout.tsx` (converter para Server Component)
- `apps/projetos/src/app/(diretoria)/shell.tsx` (criar — Client Component)
- `apps/projetos/src/actions/auth.ts` (criar — `logoutAction`)

**Critérios de aceite:**

- [x] Header exibe nome e email reais do usuário autenticado
- [x] `MOCK_USER` removido de ambos os layouts
- [x] `layout.tsx` de ambos os grupos é Server Component (sem `"use client"`)
- [x] `shell.tsx` de ambos os grupos é Client Component (mantém `usePathname`)
- [x] Logout funcional: chama `signOut` e redireciona para login canônico
- [x] Layout não autentica usuários não logados (redireciona para `CANONICAL_LOGIN_URL`)
- [x] Lint passa
- [x] Types passam

**Notas:**
Lacuna identificada: P-2.9 não incluiu layouts nos arquivos permitidos. Registrar em SESSIONS.md. Adicionar às **Instruções Globais** uma regra G5: "todo prompt P-X.9 (integração) deve incluir os arquivos de layout do módulo na lista de arquivos permitidos, para substituição de `MOCK_USER` por dados reais do usuário autenticado".

---

### P-2.10 — Notificações e Emails Projetos

**Fase:** 2
**Módulo:** projetos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-2.10-projetos-notifications`
- Dependências: P-2.9 concluído
- Env vars: `RESEND_API_KEY`

**Escopo:**
Implementar todas as notificações do módulo Projetos (ver lista no BRAIN.md seção 6.2). Templates de email: submissão recebida, projeto em validação, aprovado/reprovado, relatório pendente (lembretes: 7 dias antes, no dia, 7 dias antes de expirar), pagamento realizado, bloqueio por falta de relatório. Emails editáveis via Admin.

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/project-submitted.tsx`
- `packages/email/src/templates/project-status-change.tsx`
- `packages/email/src/templates/report-reminder.tsx`
- `packages/email/src/templates/payment-confirmation.tsx`
- `apps/projetos/src/lib/notifications.ts`

**Critérios de aceite:**

- [x] Submissão → super_admins (in_app + email)
- [x] Validação → submissor (in_app + email)
- [x] Votação aberta → diretores/conselheiros (in_app + email)
- [x] Aprovado/reprovado (após homologação) → submissor (email)
- [~] Relatório pendente: 3 lembretes (7d antes, no dia, 7d antes de expirar)
- [x] Pagamento realizado → submissor (email com comprovante)
- [x] Bloqueio por falta de relatório → submissor + super_admins
- [x] Contestação de diretor → todos diretores/conselheiros
- [~] Lista de projetos designados → avaliador (7d antes da reunião)
- [x] Templates editáveis no Admin
- [x] Lint passa
- [x] Types passam

---

### P-2.11 — Integrações Cross-App Projetos

**Fase:** 2
**Módulo:** projetos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-2.11-projetos-cross`
- Dependências: P-2.10 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Integração Projetos → Financeiro: aprovação cria centro de custo + payment_schedules no schema financeiro (placeholder se tabelas não existem ainda — criar stubs). Integração Projetos → Tarefas: submissão cria checklist padrão (stub). Integração Documentos → Projetos: recepção de edital_id com pré-preenchimento no wizard. Flats → Projetos: campo "participação em projetos" auto-calculado para scoring de flats.

**Arquivos permitidos para criação/edição:**

- `apps/projetos/src/lib/integrations/financeiro.ts`
- `apps/projetos/src/lib/integrations/tarefas.ts`
- `apps/projetos/src/lib/integrations/documentos.ts`
- `packages/db/src/schema/financeiro-stubs.ts`

**Critérios de aceite:**

- [x] Aprovação de projeto dispara criação de centro de custo (stub ou real)
- [x] Aprovação cria payment_schedules baseado nas parcelas definidas
- [x] Submissão dispara criação de checklist de análise (stub)
- [~] Wizard recebe edital_id e pré-preenche tipo + categoria
- [x] Stubs documentados para integração futura
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 7 (Integrações cross-app). Pagamentos nascem NÃO aprovados.

---

### P-2.12 — Testes Projetos

**Fase:** 2
**Módulo:** projetos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-2.12-projetos-tests`
- Dependências: P-2.11 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Testes de integração para Projetos. RLS (submissor vê apenas próprios, votes secretos). State machine (transições válidas/inválidas). Votação (quórum, maioria, botão de pânico). Contestação (limites). Bloqueio de orçamento. Fluxo completo: rascunho → submissão → validação → votação → homologação → aprovado → em execução.

**Arquivos permitidos para criação/edição:**

- `apps/projetos/src/__tests__/rls.test.ts`
- `apps/projetos/src/__tests__/state-machine.test.ts`
- `apps/projetos/src/__tests__/voting.test.ts`
- `apps/projetos/src/__tests__/flow.test.ts`

**Critérios de aceite:**

- [x] RLS: submissor não vê projetos de outras instituições
- [x] RLS: votes não visíveis para não-admin
- [x] State machine: transição inválida retorna erro
- [x] Votação: sem quórum → não aprova; com quórum + maioria → aprova
- [x] Contestação: 3a tentativa por projeto retorna erro; 2a por pessoa retorna erro
- [x] Orçamento: submissão que excede orçamento é bloqueada
- [x] Fluxo end-to-end funciona
- [x] Testes passam
- [x] Lint passa

---

# Fase 3 — Financeiro

---

## Financeiro — Bloco A (UI)

> 🎨 **Design + Skill (vale para P-3.2 a P-3.5):** há referência visual em **`design-refs/financeiro/`** (dashboard, lançamentos, contas a pagar, conciliação, importação, orçamento, plano de contas + `styles.css`). Antes de cada prompt de UI: **invoque `/frontend-design`** e siga o procedimento **G3** das Instruções Globais — replicar o protótipo traduzindo para `@hebron/ui` + tokens canônicos `--hb-*`, **sem** criar CSS de app nem hex hardcoded. Pré-requisito: **P-0.2b concluído**.

---

### P-3.1 — Schema de Tipos Financeiro

**Fase:** 3
**Módulo:** financeiro
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-3.1-financeiro-types`
- Dependências: P-2.12 concluído
- Env vars: nenhuma

**Escopo:**
Definir tipos e schemas Zod do Financeiro. Tipos: BankAccount, CostCenter, Category (plano de contas hierárquico), Payable, Receivable, Transaction (imutável), TransactionReversal, Budget, BudgetItem, Attachment, BankImport, BatchApproval. Governança: approval (1a camada) e authorization (2a camada). Mock data com cenários de conciliação.

**Arquivos permitidos para criação/edição:**

- `packages/types/src/financeiro/index.ts`
- `packages/validators/src/financeiro/index.ts`
- `apps/financeiro/src/lib/mock-data.ts`

**Critérios de aceite:**

- [x] Transaction imutável (sem update, correções via TransactionReversal)
- [x] Payable com status: pendente, aprovado, autorizado, pago, cancelado
- [x] BatchApproval: lote semanal de pagamentos para aprovação do diretor gestor
- [x] Category com parent_id (árvore hierárquica)
- [x] CostCenter vinculado a projetos.projects
- [x] Mock data: 50+ transações, 10+ payables, 3+ contas bancárias, plano de contas
- [x] Schemas Zod: createPayableSchema, createReceivableSchema, createTransactionSchema
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.5. Imutabilidade: correções via estorno + novo lançamento, nunca edit/delete.

---

### P-3.2 — Componentes UI Financeiro

**Fase:** 3
**Módulo:** financeiro
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-3.2-financeiro-components`
- Dependências: P-3.1 concluído
- Env vars: nenhuma

**Escopo:**
Componentes: TransactionTable (TanStack Table com filtros avançados e exportação), PayableCard (com indicador de vencimento e status de governança), CashFlowChart (gráfico de fluxo de caixa projetado 30/60/90 dias), BudgetComparison (planejado vs executado em barras), ConciliationView (split view: extrato bancário vs lançamentos), CategoryTree (plano de contas navegável), BatchApprovalCard (lote semanal para aprovação).

**Arquivos permitidos para criação/edição:**

- `apps/financeiro/src/components/transaction-table.tsx`
- `apps/financeiro/src/components/payable-card.tsx`
- `apps/financeiro/src/components/cash-flow-chart.tsx`
- `apps/financeiro/src/components/budget-comparison.tsx`
- `apps/financeiro/src/components/conciliation-view.tsx`
- `apps/financeiro/src/components/category-tree.tsx`
- `apps/financeiro/src/components/batch-approval-card.tsx`

**Critérios de aceite:**

- [x] TransactionTable com filtros: data, categoria, conta, tipo, valor; exportação CSV/Excel
- [x] PayableCard com cores: verde (em dia), amarelo (próximo), vermelho (vencido)
- [x] ConciliationView: split view com match automático destacado
- [x] CategoryTree: plano de contas hierárquico editável
- [x] BudgetComparison: barras planejado vs executado com % de execução
- [x] BatchApprovalCard: lista de pagamentos do lote com total e botão aprovar
- [x] Responsivo
- [x] Lint passa
- [x] Types passam

---

### P-3.3 — Telas e Páginas Financeiro

**Fase:** 3
**Módulo:** financeiro
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-3.3-financeiro-pages`
- Dependências: P-3.2 concluído
- Env vars: nenhuma

**Escopo:**
Páginas: Dashboard (saldo por conta, fluxo do mês, contas a pagar próximas). Lançamentos (lista com filtros). Nova despesa / receita. Contas a pagar (com vencimento). Contas a receber. Conciliação bancária (split view). Fluxo de caixa projetado. Centros de custo (por projeto). Orçamento anual. Plano de contas. Importação de extrato (OFX/CSV). Relatórios.

**Arquivos permitidos para criação/edição:**

- `apps/financeiro/src/app/(dashboard)/layout.tsx`
- `apps/financeiro/src/app/(dashboard)/page.tsx`
- `apps/financeiro/src/app/(dashboard)/lancamentos/page.tsx`
- `apps/financeiro/src/app/(dashboard)/contas-pagar/page.tsx`
- `apps/financeiro/src/app/(dashboard)/conciliacao/page.tsx`
- `apps/financeiro/src/app/(dashboard)/orcamento/page.tsx`
- `apps/financeiro/src/app/(dashboard)/plano-contas/page.tsx`
- `apps/financeiro/src/app/(dashboard)/importacao/page.tsx`

**Critérios de aceite:**

- [x] Dashboard com saldo real por conta bancária e visão consolidada
- [x] Lista de lançamentos com filtros avançados e exportação
- [x] Conciliação: split view extrato × lançamentos com match visual
- [x] Orçamento: planejado vs executado por centro de custo
- [x] Plano de contas: árvore hierárquica editável (drag-drop para reordenar)
- [x] Importação de extrato: upload OFX/CSV com preview antes de confirmar
- [x] Responsivo
- [x] Lint passa
- [x] Types passam

---

### P-3.4 — Formulários Financeiro

**Fase:** 3
**Módulo:** financeiro
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-3.4-financeiro-forms`
- Dependências: P-3.3 concluído
- Env vars: nenhuma

**Escopo:**
Formulários: nova despesa (valor, data, categoria, centro de custo, descrição, anexo de comprovante). Nova receita (mesma estrutura). Estorno (justificativa obrigatória, valor, referência à transação original). Aprovação de lote (aprovar/rejeitar com observações). Importação OFX/CSV (upload, mapeamento de colunas, confirmação). Plano de contas (criar/editar categoria na árvore). Orçamento (definir por centro de custo e mês).

**Arquivos permitidos para criação/edição:**

- `apps/financeiro/src/components/expense-form.tsx`
- `apps/financeiro/src/components/revenue-form.tsx`
- `apps/financeiro/src/components/reversal-form.tsx`
- `apps/financeiro/src/components/batch-approval-form.tsx`
- `apps/financeiro/src/components/import-form.tsx`
- `apps/financeiro/src/components/budget-form.tsx`

**Critérios de aceite:**

- [x] Despesa: categorização via plano de contas (dropdown hierárquico), upload de comprovante
- [x] Estorno: seleciona transação original, justificativa obrigatória, valor preenchido automaticamente
- [x] Aprovação de lote: lista de payables com checkbox individual + aprovar todos
- [x] Import OFX/CSV: upload → preview tabular → mapear colunas → confirmar
- [x] Orçamento: grid de meses × categorias com totais
- [x] Validação Zod em todos os formulários
- [x] Lint passa
- [x] Types passam

---

### P-3.5 — Estados Financeiro

**Fase:** 3
**Módulo:** financeiro
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-3.5-financeiro-states`
- Dependências: P-3.4 concluído
- Env vars: nenhuma

**Escopo:**
Loading, empty e error states para todas as telas do Financeiro. Skeletons para dashboard, tabela de lançamentos, conciliação, gráficos. Estado vazio para importação (nenhum extrato importado). Estado vazio para conciliação (tudo conciliado).

**Arquivos permitidos para criação/edição:**

- `apps/financeiro/src/components/dashboard-skeleton.tsx`
- `apps/financeiro/src/components/transaction-table-skeleton.tsx`
- `apps/financeiro/src/components/conciliation-skeleton.tsx`
- `apps/financeiro/src/app/(dashboard)/page.tsx` (adicionar estados)
- `apps/financeiro/src/app/(dashboard)/conciliacao/page.tsx` (adicionar estados)

**Critérios de aceite:**

- [ ] Skeletons específicos por tela
- [ ] Estado vazio conciliação: "Todas as transações estão conciliadas"
- [ ] Estado vazio importação: "Importe seu primeiro extrato bancário"
- [ ] Lint passa
- [ ] Types passam

---

> **PAUSA — Bloco A Financeiro concluído. Validar telas com diretoria antes de prosseguir para Bloco B.**

---

## Financeiro — Bloco B (Backend)

---

### P-3.6 — Schema do Banco Financeiro

**Fase:** 3
**Módulo:** financeiro
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-3.6-financeiro-schema`
- Dependências: P-3.5 concluído, validação da diretoria OK
- Env vars: `DATABASE_URL`

**Escopo:**
Criar tabelas Drizzle no schema `financeiro`: accounts (contas bancárias), cost_centers (FK para projetos.projects), categories (plano de contas hierárquico), payables, receivables, transactions (imutável, sem UPDATE/DELETE), transaction_reversals, budgets, budget_items, attachments, bank_imports, bank_import_rows, batch_approvals, batch_approval_items.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/financeiro.ts`
- `packages/db/src/migrations/0008_financeiro.sql`

**Critérios de aceite:**

- [ ] transactions: sem UPDATE ou DELETE via constraint (imutável)
- [ ] transaction_reversals: FK para transaction original, justificativa obrigatória
- [ ] payables: status enum (pendente, aprovado, autorizado, pago, cancelado)
- [ ] cost_centers: FK para projetos.projects (cross-schema)
- [ ] categories: parent_id (árvore), com defaults sugeridos
- [ ] bank_imports: file_url, format (ofx/csv), imported_at
- [ ] bank_import_rows: data parseada (data, valor, descrição, match_transaction_id)
- [ ] batch_approvals: week_start, week_end, approved_by, approved_at
- [ ] Migration aplica sem erros
- [ ] Types passam

---

### P-3.7 — RLS Policies Financeiro

**Fase:** 3
**Módulo:** financeiro
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-3.7-financeiro-rls`
- Dependências: P-3.6 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
RLS para schema financeiro. Super_admin: full access. Diretor gestor (designation): SELECT + aprovar lotes. Diretor autorizador (designation): SELECT. Colaborador financeiro: CRUD em transações, payables, receivables. Submissor: vê apenas payment_schedules dos próprios projetos (via cross-schema). Demais: sem acesso.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/0009_financeiro_rls.sql`

**Critérios de aceite:**

- [ ] Super_admin: full CRUD em financeiro.\*
- [ ] Diretor gestor: SELECT + UPDATE em batch_approvals (aprovar)
- [ ] Colaborador financeiro: CRUD em transações, payables, receivables
- [ ] Submissor: SELECT em payment_schedules de projetos da própria instituição
- [ ] transactions: sem UPDATE/DELETE para ninguém (constraint + RLS)
- [ ] Demais papéis: sem acesso ao schema financeiro
- [ ] Types passam

---

### P-3.8 — Server Actions Financeiro

**Fase:** 3
**Módulo:** financeiro
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-3.8-financeiro-actions`
- Dependências: P-3.7 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`

**Escopo:**
Server Actions: CRUD de despesas/receitas (criar transação imutável). Estornos (criar reversal + nova transação). Importação OFX/CSV (parse, preview, confirmar). Match automático (valor + data + descrição). Conciliação manual (vincular import_row a transação). CRUD de plano de contas. CRUD de orçamento. Agrupamento semanal de payables em lote. Aprovação de lote (diretor gestor). Marcar como pago (super_admin). OCR de notas fiscais (GPT-4 Vision). Audit log em toda mutação.

**Arquivos permitidos para criação/edição:**

- `apps/financeiro/src/actions/transactions.ts`
- `apps/financeiro/src/actions/conciliation.ts`
- `apps/financeiro/src/actions/import.ts`
- `apps/financeiro/src/actions/approval.ts`
- `apps/financeiro/src/actions/categories.ts`
- `packages/ai/src/financeiro/ocr.ts`

**Critérios de aceite:**

- [ ] Transação criada como imutável (INSERT only)
- [ ] Estorno: cria reversal referenciando original + nova transação corretiva
- [ ] Import OFX/CSV: parse, normaliza, apresenta para confirmação
- [ ] Match automático: sugere correspondência por valor+data+descrição
- [ ] Lote semanal: agrupa payables da semana, envia email ao diretor gestor
- [ ] Aprovação de lote: diretor gestor aprova; gera notificação para super_admin incluir no banco
- [ ] OCR: extrai valor, CNPJ, data de imagem de NF e sugere categorização
- [ ] Audit log em toda mutação
- [ ] Lint passa
- [ ] Types passam

---

### P-3.9 — Integração UI ↔ Backend Financeiro

**Fase:** 3
**Módulo:** financeiro
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-3.9-financeiro-integration`
- Dependências: P-3.8 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_URL`

**Escopo:**
Substituir mocks por dados reais. Dashboard com saldos reais. Tabela de lançamentos com dados do banco. Conciliação com dados de importação. Formulários conectados às actions. Gráficos com dados reais.

**Arquivos permitidos para criação/edição:**

- `apps/financeiro/src/app/(dashboard)/page.tsx`
- `apps/financeiro/src/app/(dashboard)/lancamentos/page.tsx`
- `apps/financeiro/src/app/(dashboard)/conciliacao/page.tsx`
- `apps/financeiro/src/app/(dashboard)/orcamento/page.tsx`
- `apps/financeiro/src/app/(dashboard)/importacao/page.tsx`
- `apps/financeiro/src/app/(dashboard)/plano-contas/page.tsx`
- `apps/financeiro/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [ ] Saldos reais por conta bancária no dashboard
- [ ] Transações do banco com filtros server-side
- [ ] Conciliação funcional: import → match → confirmar
- [ ] Orçamento: planejado vs executado com dados reais dos centros de custo
- [ ] Mock data removido
- [ ] Lint passa
- [ ] Types passam

---

### P-3.10 — Notificações e Emails Financeiro

**Fase:** 3
**Módulo:** financeiro
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-3.10-financeiro-notifications`
- Dependências: P-3.9 concluído
- Env vars: `RESEND_API_KEY`

**Escopo:**
Notificações: lote semanal para aprovação (email ao diretor gestor com CC autorizador). Lote aprovado (in_app ao super_admin). Pagamento marcado como pago (in_app). Vencimento próximo (3 dias antes). Orçamento >80% executado (in_app + email ao super_admin). Relatório mensal automático por email aos diretores/conselheiros.

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/batch-approval.tsx`
- `packages/email/src/templates/monthly-financial-report.tsx`
- `packages/email/src/templates/budget-alert.tsx`
- `apps/financeiro/src/lib/notifications.ts`

**Critérios de aceite:**

- [ ] Lote semanal: email ao diretor gestor com lista de pagamentos e total
- [ ] Alerta de orçamento >80%: email ao super_admin
- [ ] Relatório mensal: PDF+XLSX com totais por categoria, enviado por email
- [ ] Vencimento próximo: notificação in_app 3 dias antes
- [ ] Lint passa
- [ ] Types passam

---

### P-3.11 — Integrações Cross-App Financeiro

**Fase:** 3
**Módulo:** financeiro
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-3.11-financeiro-cross`
- Dependências: P-3.10 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Conectar integrações reais. Projetos → Financeiro: substituir stubs por lógica real (aprovação cria centro de custo + payables). Financeiro → Projetos: query cross-schema executado vs orçado em tempo real. Preparar stubs para: Flats → Financeiro (ajuda de custo cria despesas).

**Arquivos permitidos para criação/edição:**

- `apps/financeiro/src/lib/integrations/projetos.ts`
- `apps/financeiro/src/lib/integrations/flats-stub.ts`
- `apps/projetos/src/lib/integrations/financeiro.ts` (atualizar stubs)

**Critérios de aceite:**

- [ ] Aprovação de projeto cria centro de custo e payables reais no financeiro
- [ ] Payables de projeto nascem NÃO aprovados
- [ ] Query cross-schema: executado vs orçado em tempo real
- [ ] Stub para Flats → Financeiro documentado
- [ ] Lint passa
- [ ] Types passam

---

### P-3.12 — Testes Financeiro

**Fase:** 3
**Módulo:** financeiro
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-3.12-financeiro-tests`
- Dependências: P-3.11 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Testes de integração. RLS (super_admin full, diretor gestor aprova, submissor vê só pagamentos próprios). Imutabilidade de transações (UPDATE/DELETE proibido). Estorno (cria reversal + nova transação). Import OFX/CSV (parse correto). Match automático (encontra correspondência). Governança (aprovação → autorização → pago). Integração Projetos → Financeiro (aprovação cria payables).

**Arquivos permitidos para criação/edição:**

- `apps/financeiro/src/__tests__/rls.test.ts`
- `apps/financeiro/src/__tests__/transactions.test.ts`
- `apps/financeiro/src/__tests__/conciliation.test.ts`
- `apps/financeiro/src/__tests__/governance.test.ts`

**Critérios de aceite:**

- [ ] Transação: UPDATE/DELETE retorna erro
- [ ] Estorno: cria reversal corretamente
- [ ] Import OFX: parse correto dos campos
- [ ] Match: encontra correspondência por valor+data
- [ ] Governança: fluxo aprovação → autorização → pago funciona
- [ ] RLS: submissor não vê transações de outros projetos
- [ ] Testes passam
- [ ] Lint passa

---

# Fase 4 — Tarefas

---

## Tarefas — Bloco A (UI)

---

### P-4.1 — Schema de Tipos Tarefas

**Fase:** 4
**Módulo:** tarefas
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-4.1-tarefas-types`
- Dependências: P-3.12 concluído
- Env vars: nenhuma

**Escopo:**
Definir tipos e schemas Zod. Tipos: Workspace (6 fixos: Administrativo, Financeiro, Contábil e Fiscal, Eclesiástico, Comunicação, Tecnologia e Inovação), Task, Subtask, Assignee, Comment, Attachment, TimeEntry, Tag, RecurrenceRule, TaskTemplate, ApprovalRequest. Mock data com cenários de recorrência e tarefas automáticas.

**Arquivos permitidos para criação/edição:**

- `packages/types/src/tarefas/index.ts`
- `packages/validators/src/tarefas/index.ts`
- `apps/tarefas/src/lib/mock-data.ts`

**Critérios de aceite:**

- [ ] 6 workspaces fixos como enum
- [ ] Task com: título, descrição, prioridade (baixa/média/alta/urgente), status (a fazer/em progresso/em revisão/concluído), workspace, due_date, recurrence_rule
- [ ] RecurrenceRule: tipo (diária/semanal/mensal/anual), intervalo, dia_da_semana, dia_do_mes
- [ ] TaskTemplate: nome, tasks pré-definidas, trigger (evento de outro módulo)
- [ ] ApprovalRequest: task_id, approver_id (diretor), status
- [ ] Mock data: 30+ tarefas, 5+ recorrentes, 3+ templates
- [ ] Lint passa
- [ ] Types passam

---

### P-4.2 — Componentes UI Tarefas

**Fase:** 4
**Módulo:** tarefas
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-4.2-tarefas-components`
- Dependências: P-4.1 concluído
- Env vars: nenhuma

**Escopo:**
Componentes: TaskCard (título, assignee, prioridade, due_date, subtask progress). KanbanBoard (colunas por status, drag-drop). TaskList (filtrável, ordenável). TreeView (estilo Xmind: cada pessoa = branch, sub-branches = tarefas). CommentThread (com @menções). FocusMode (agenda do dia + timer pomodoro). TimeTracker (start/stop/total). CommandMenu (Cmd+K para criar/buscar tarefas).

**Arquivos permitidos para criação/edição:**

- `apps/tarefas/src/components/task-card.tsx`
- `apps/tarefas/src/components/kanban-board.tsx`
- `apps/tarefas/src/components/task-list.tsx`
- `apps/tarefas/src/components/tree-view.tsx`
- `apps/tarefas/src/components/comment-thread.tsx`
- `apps/tarefas/src/components/focus-mode.tsx`
- `apps/tarefas/src/components/time-tracker.tsx`
- `apps/tarefas/src/components/command-menu.tsx`

**Critérios de aceite:**

- [ ] KanbanBoard com drag-drop entre colunas (a fazer → em progresso → concluído)
- [ ] TreeView estilo Xmind: pessoa → tarefas (para despacho do diretor gestor)
- [ ] TaskCard com badge de prioridade, avatar do assignee, barra de subtarefas
- [ ] FocusMode: lista de tarefas do dia + pomodoro (25min trabalho, 5min pausa)
- [ ] CommandMenu (Cmd+K) com busca e criação rápida
- [ ] TimeTracker com start/stop e total acumulado
- [ ] 3 views coexistentes: Kanban, Lista, Árvore (toggle no header)
- [ ] Responsivo
- [ ] Lint passa
- [ ] Types passam

**Notas:**
Ref: BRAIN.md seção 6.9. Referência visual: Xmind para TreeView (diretor gestor usa no dia a dia).

---

### P-4.3 — Telas e Páginas Tarefas

**Fase:** 4
**Módulo:** tarefas
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-4.3-tarefas-pages`
- Dependências: P-4.2 concluído
- Env vars: nenhuma

**Escopo:**
Páginas: "Minhas tarefas" (lista priorizada). Board por workspace (kanban + lista + árvore como toggle). Detalhe da tarefa (descrição rich, anexos, subtarefas, comentários, time entries, log). Calendário de prazos. Tarefas recorrentes (configuração). Templates. Modo foco. Configuração do workspace (colunas customizáveis).

**Arquivos permitidos para criação/edição:**

- `apps/tarefas/src/app/(dashboard)/layout.tsx`
- `apps/tarefas/src/app/(dashboard)/page.tsx`
- `apps/tarefas/src/app/(dashboard)/workspace/[slug]/page.tsx`
- `apps/tarefas/src/app/(dashboard)/tarefa/[id]/page.tsx`
- `apps/tarefas/src/app/(dashboard)/calendario/page.tsx`
- `apps/tarefas/src/app/(dashboard)/recorrentes/page.tsx`
- `apps/tarefas/src/app/(dashboard)/foco/page.tsx`
- `apps/tarefas/src/app/(dashboard)/templates/page.tsx`

**Critérios de aceite:**

- [ ] "Minhas tarefas" com filtros: workspace, prioridade, status, assignee
- [ ] Board com toggle Kanban/Lista/Árvore
- [ ] Detalhe: sidebar com metadados, corpo com descrição + comentários
- [ ] Calendário: visualização mensal/semanal com tarefas por data
- [ ] Recorrentes: lista de regras com preview da próxima execução
- [ ] Modo foco: página limpa com tarefas do dia + pomodoro
- [ ] Templates: lista editável com preview
- [ ] Responsivo
- [ ] Lint passa
- [ ] Types passam

---

### P-4.4 — Formulários Tarefas

**Fase:** 4
**Módulo:** tarefas
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-4.4-tarefas-forms`
- Dependências: P-4.3 concluído
- Env vars: nenhuma

**Escopo:**
Formulários: criar/editar tarefa (título, descrição rich text, workspace, assignee, prioridade, due_date, tags, anexos). Criar subtarefa. Comentário com @menções (autocomplete de usuários). Configurar recorrência (tipo, intervalo, dia). Criar template (nome, lista de tarefas pré-definidas). Pedido de aprovação (selecionar diretor). Time entry manual.

**Arquivos permitidos para criação/edição:**

- `apps/tarefas/src/components/task-form.tsx`
- `apps/tarefas/src/components/subtask-form.tsx`
- `apps/tarefas/src/components/comment-form.tsx`
- `apps/tarefas/src/components/recurrence-form.tsx`
- `apps/tarefas/src/components/template-form.tsx`
- `apps/tarefas/src/components/approval-request-form.tsx`

**Critérios de aceite:**

- [ ] Task form com editor rich text para descrição
- [ ] @menções com autocomplete de usuários do workspace
- [ ] Recurrence form com preview visual (ex: "Toda segunda-feira às 9h")
- [ ] Template form com lista de tarefas editável (drag-drop para reordenar)
- [ ] Validação Zod em todos os formulários
- [ ] Lint passa
- [ ] Types passam

---

### P-4.5 — Estados Tarefas

**Fase:** 4
**Módulo:** tarefas
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-4.5-tarefas-states`
- Dependências: P-4.4 concluído
- Env vars: nenhuma

**Escopo:**
Loading, empty e error states para todas as telas. Skeletons para kanban, lista, árvore, calendário. Estado vazio por workspace (sem tarefas). Estado vazio no modo foco (sem tarefas para hoje).

**Arquivos permitidos para criação/edição:**

- `apps/tarefas/src/components/kanban-skeleton.tsx`
- `apps/tarefas/src/components/task-list-skeleton.tsx`
- `apps/tarefas/src/components/calendar-skeleton.tsx`
- `apps/tarefas/src/app/(dashboard)/page.tsx` (adicionar estados)
- `apps/tarefas/src/app/(dashboard)/foco/page.tsx` (adicionar estados)

**Critérios de aceite:**

- [ ] Skeletons por view (kanban, lista, árvore, calendário)
- [ ] Modo foco vazio: "Nenhuma tarefa para hoje. Bom descanso!"
- [ ] Workspace vazio: mensagem contextual + CTA criar tarefa
- [ ] Lint passa
- [ ] Types passam

---

> **PAUSA — Bloco A Tarefas concluído. Validar telas com diretoria antes de prosseguir para Bloco B.**

---

## Tarefas — Bloco B (Backend)

---

### P-4.6 — Schema do Banco Tarefas

**Fase:** 4
**Módulo:** tarefas
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-4.6-tarefas-schema`
- Dependências: P-4.5 concluído, validação da diretoria OK
- Env vars: `DATABASE_URL`

**Escopo:**
Criar tabelas Drizzle no schema `tarefas`: workspaces (6 fixos + custom), tasks, subtasks, assignees, comments, attachments, time_entries, tags, task_tags, recurrence_rules, task_templates, template_items, approval_requests, task_events (log de mudanças).

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/tarefas.ts`
- `packages/db/src/migrations/0010_tarefas.sql`

**Critérios de aceite:**

- [ ] 6 workspaces padrão seed na migration
- [ ] tasks: title, description, workspace_id, status, priority, due_date, created_by, source (manual/auto), source_ref
- [ ] subtasks: task_id, title, completed
- [ ] recurrence_rules: task_template_id, type, interval, day_of_week, day_of_month, next_run_at
- [ ] approval_requests: task_id, approver_id, status (pendente/aprovado/rejeitado)
- [ ] time_entries: task_id, user_id, started_at, ended_at, duration_minutes
- [ ] task_events: task_id, actor_id, event_type, diff (jsonb)
- [ ] Migration aplica sem erros
- [ ] Types passam

---

### P-4.7 — RLS Policies Tarefas

**Fase:** 4
**Módulo:** tarefas
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-4.7-tarefas-rls`
- Dependências: P-4.6 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
RLS para schema tarefas. Super_admin: full access. Colaborador: CRUD em tarefas dos workspaces que tem acesso; vê apenas tarefas atribuídas a si ou criadas por si. Diretor: SELECT em todos os workspaces (para TreeView de despacho); recebe approval_requests. Demais: sem acesso.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/0011_tarefas_rls.sql`

**Critérios de aceite:**

- [ ] Super_admin: full CRUD
- [ ] Colaborador: CRUD em tarefas que é assignee ou creator
- [ ] Diretor: SELECT em todas as tarefas (para visualização árvore)
- [ ] Diretor: UPDATE em approval_requests (aprovar/rejeitar)
- [ ] Comentários: visíveis para todos no workspace
- [ ] Types passam

---

### P-4.8 — Server Actions Tarefas

**Fase:** 4
**Módulo:** tarefas
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-4.8-tarefas-actions`
- Dependências: P-4.7 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Escopo:**
Server Actions: CRUD de tarefas. Mover entre colunas (drag-drop). Criar/completar subtarefas (progresso agregado). Comentários com @menções. Upload de anexos. Time tracking (start/stop/manual). Recorrência (criar regra, gerar próxima tarefa via Inngest job). Templates (instanciar template). Approval requests (enviar/aprovar/rejeitar). Tarefas automáticas de outros módulos (receber via function).

**Arquivos permitidos para criação/edição:**

- `apps/tarefas/src/actions/tasks.ts`
- `apps/tarefas/src/actions/comments.ts`
- `apps/tarefas/src/actions/time-tracking.ts`
- `apps/tarefas/src/actions/recurrence.ts`
- `apps/tarefas/src/actions/templates.ts`
- `apps/tarefas/src/actions/approvals.ts`

**Critérios de aceite:**

- [ ] CRUD de tarefas com audit log (task_events)
- [ ] Mover tarefa entre colunas atualiza status
- [ ] Subtarefas: progresso agregado (3/5 = 60%)
- [ ] Comentários com @menções geram notificação ao mencionado
- [ ] Time tracking: start/stop com cálculo de duração
- [ ] Recorrência: job Inngest que cria tarefa na next_run_at
- [ ] Template: instanciar cria todas as tarefas filhas
- [ ] Approval: enviar notificação ao diretor; aprovar/rejeitar atualiza status
- [ ] Lint passa
- [ ] Types passam

---

### P-4.9 — Integração UI ↔ Backend Tarefas

**Fase:** 4
**Módulo:** tarefas
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-4.9-tarefas-integration`
- Dependências: P-4.8 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_URL`

**Escopo:**
Substituir mocks por dados reais. Kanban, lista e árvore com dados do banco. Formulários conectados. Drag-drop funcional com persistência. Modo foco com tarefas reais do dia. Command menu (Cmd+K) funcional.

**Arquivos permitidos para criação/edição:**

- `apps/tarefas/src/app/(dashboard)/page.tsx`
- `apps/tarefas/src/app/(dashboard)/workspace/[slug]/page.tsx`
- `apps/tarefas/src/app/(dashboard)/tarefa/[id]/page.tsx`
- `apps/tarefas/src/app/(dashboard)/foco/page.tsx`
- `apps/tarefas/src/app/(dashboard)/calendario/page.tsx`
- `apps/tarefas/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [ ] Kanban com dados reais e drag-drop persistido
- [ ] TreeView com dados reais (pessoa → tarefas)
- [ ] Modo foco com tarefas do dia do banco
- [ ] Cmd+K busca tarefas reais
- [ ] Mock data removido
- [ ] Lint passa
- [ ] Types passam

---

### P-4.10 — Notificações e Emails Tarefas

**Fase:** 4
**Módulo:** tarefas
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-4.10-tarefas-notifications`
- Dependências: P-4.9 concluído
- Env vars: `RESEND_API_KEY`

**Escopo:**
Notificações: tarefa atribuída (in_app + email). @menção em comentário (in_app). Prazo próximo (1 dia antes, in_app). Prazo vencido (in_app + email). Pedido de aprovação (in_app + email ao diretor). Aprovação/rejeição (in_app ao solicitante).

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/task-assigned.tsx`
- `packages/email/src/templates/task-overdue.tsx`
- `packages/email/src/templates/approval-request.tsx`
- `apps/tarefas/src/lib/notifications.ts`

**Critérios de aceite:**

- [ ] Atribuição: in_app + email ao assignee
- [ ] @menção: in_app ao mencionado
- [ ] Prazo: 1 dia antes (in_app); vencido (in_app + email)
- [ ] Aprovação: in_app + email ao diretor
- [ ] Lint passa
- [ ] Types passam

---

### P-4.11 — Integrações Cross-App Tarefas

**Fase:** 4
**Módulo:** tarefas
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-4.11-tarefas-cross`
- Dependências: P-4.10 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Conectar integrações. Projetos → Tarefas: submissão cria checklist de análise (substituir stub). Flats → Tarefas: reserva confirmada cria tarefas de limpeza (stub — será conectado na fase 7). Intranet → Tarefas: action items de reunião viram tarefas (stub — fase 5). Function pública `createAutoTask` que outros módulos chamam.

**Arquivos permitidos para criação/edição:**

- `apps/tarefas/src/lib/integrations/auto-tasks.ts`
- `apps/tarefas/src/lib/integrations/projetos.ts`
- `apps/tarefas/src/lib/integrations/flats-stub.ts`
- `apps/tarefas/src/lib/integrations/intranet-stub.ts`

**Critérios de aceite:**

- [ ] `createAutoTask(source, sourceRef, templateId)` function exportada
- [ ] Submissão de projeto cria tarefas de análise (real)
- [ ] Tarefas automáticas nascem SEM assignee (super_admin atribui depois)
- [ ] Stubs documentados para Flats e Intranet
- [ ] Lint passa
- [ ] Types passam

---

### P-4.12 — Testes Tarefas

**Fase:** 4
**Módulo:** tarefas
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-4.12-tarefas-tests`
- Dependências: P-4.11 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Testes: RLS (colaborador vê apenas próprias, diretor vê todas). Recorrência (gera próxima tarefa). Templates (instancia corretamente). Subtarefas (progresso agregado). Approval (fluxo completo). Integração Projetos → Tarefas.

**Arquivos permitidos para criação/edição:**

- `apps/tarefas/src/__tests__/rls.test.ts`
- `apps/tarefas/src/__tests__/recurrence.test.ts`
- `apps/tarefas/src/__tests__/templates.test.ts`
- `apps/tarefas/src/__tests__/integrations.test.ts`

**Critérios de aceite:**

- [ ] RLS: colaborador não vê tarefas de outro colaborador (a menos que esteja no mesmo workspace)
- [ ] Recorrência: gera tarefa no próximo período
- [ ] Template: instancia todas as sub-tarefas
- [ ] Subtarefas: completar atualiza progresso do pai
- [ ] Integração: submissão de projeto cria tarefas
- [ ] Testes passam
- [ ] Lint passa

---

# Fase 5 — Intranet

---

## Intranet — Bloco A (UI)

---

### P-5.1 — Schema de Tipos Intranet

**Fase:** 5
**Módulo:** intranet
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-5.1-intranet-types`
- Dependências: P-4.12 concluído
- Env vars: nenhuma

**Escopo:**
Tipos e schemas Zod: Announcement (título, corpo, prioridade: normal/importante/urgente, author_id), DashboardWidget (configurável por usuário), KPI (métrica, valor, trend), DirectoryMember, CalendarEvent, MeetingDecision (vinculada a meeting_session). Mock data com KPIs agregados de outros módulos.

**Arquivos permitidos para criação/edição:**

- `packages/types/src/intranet/index.ts`
- `packages/validators/src/intranet/index.ts`
- `apps/intranet/src/lib/mock-data.ts`

**Critérios de aceite:**

- [ ] Announcement com prioridade e corpo rich text
- [ ] DashboardWidget: tipo (kpi/chart/feed/calendar), posição, config (jsonb)
- [ ] KPI: nome, valor, unidade, trend (up/down/stable), período
- [ ] DirectoryMember: nome, foto, papel, email, telefone, bio
- [ ] Mock KPIs: projetos ativos, alunos na Plataforma, doações do mês, audiência da Rádio
- [ ] Lint passa
- [ ] Types passam

---

### P-5.2 — Componentes UI Intranet

**Fase:** 5
**Módulo:** intranet
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-5.2-intranet-components`
- Dependências: P-5.1 concluído
- Env vars: nenhuma

**Escopo:**
Componentes: KPICard (valor, trend, sparkline). AnnouncementCard (com badge de prioridade). WidgetGrid (grid configurável drag-drop). DirectoryCard (foto, nome, papel, contato). CalendarWidget (mini calendário com eventos). FeedWidget (últimas atualizações cross-app). AppLauncher (atalhos para os 8 outros módulos). SearchGlobal (busca unificada cross-app).

**Arquivos permitidos para criação/edição:**

- `apps/intranet/src/components/kpi-card.tsx`
- `apps/intranet/src/components/announcement-card.tsx`
- `apps/intranet/src/components/widget-grid.tsx`
- `apps/intranet/src/components/directory-card.tsx`
- `apps/intranet/src/components/calendar-widget.tsx`
- `apps/intranet/src/components/feed-widget.tsx`
- `apps/intranet/src/components/app-launcher.tsx`
- `apps/intranet/src/components/search-global.tsx`

**Critérios de aceite:**

- [ ] KPICard com valor formatado, seta de trend e sparkline
- [ ] WidgetGrid com drag-drop para reorganizar widgets
- [ ] AppLauncher com ícones e links para os 8 módulos
- [ ] SearchGlobal com resultados agrupados por módulo
- [ ] FeedWidget com últimas ações (novo projeto, pagamento, tarefa concluída)
- [ ] Responsivo (widgets empilham no mobile)
- [ ] Lint passa
- [ ] Types passam

---

### P-5.3 — Telas e Páginas Intranet

**Fase:** 5
**Módulo:** intranet
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-5.3-intranet-pages`
- Dependências: P-5.2 concluído
- Env vars: nenhuma

**Escopo:**
Páginas: Dashboard personalizado (widgets configuráveis por usuário). Feed de anúncios. KPIs (projetos ativos, alunos, doações, audiência). Diretório de membros (todos: diretores, conselheiros, colaboradores, submissores, parceiros). Agenda/calendário. Reuniões (atas e decisões). Busca global cross-app. Notificações centralizadas.

**Arquivos permitidos para criação/edição:**

- `apps/intranet/src/app/(dashboard)/layout.tsx`
- `apps/intranet/src/app/(dashboard)/page.tsx`
- `apps/intranet/src/app/(dashboard)/anuncios/page.tsx`
- `apps/intranet/src/app/(dashboard)/diretorio/page.tsx`
- `apps/intranet/src/app/(dashboard)/calendario/page.tsx`
- `apps/intranet/src/app/(dashboard)/reunioes/page.tsx`
- `apps/intranet/src/app/(dashboard)/busca/page.tsx`

**Critérios de aceite:**

- [ ] Dashboard com widgets configuráveis (cada usuário monta o seu)
- [ ] Feed de anúncios com filtro de prioridade
- [ ] Diretório completo com busca e filtro por papel
- [ ] Calendário com eventos de reuniões e prazos
- [ ] Reuniões: lista com atas e decisões vinculadas
- [ ] Busca cross-app com resultados agrupados
- [ ] Responsivo
- [ ] Lint passa
- [ ] Types passam

---

### P-5.4 — Formulários Intranet

**Fase:** 5
**Módulo:** intranet
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-5.4-intranet-forms`
- Dependências: P-5.3 concluído
- Env vars: nenhuma

**Escopo:**
Formulários: criar anúncio (título, corpo, prioridade). Configurar dashboard (adicionar/remover/reordenar widgets). Registrar decisão de reunião (vinculada a meeting_session, com opção de gerar tarefa). Configurar briefing (opt-in, frequência). Perfil no diretório.

**Arquivos permitidos para criação/edição:**

- `apps/intranet/src/components/announcement-form.tsx`
- `apps/intranet/src/components/widget-config-form.tsx`
- `apps/intranet/src/components/meeting-decision-form.tsx`
- `apps/intranet/src/components/briefing-config-form.tsx`

**Critérios de aceite:**

- [ ] Anúncio: título, corpo rich text, prioridade (normal/importante/urgente)
- [ ] Widget config: drag-drop para adicionar/remover/reordenar
- [ ] Decisão: texto, reunião vinculada, checkbox "criar tarefa"
- [ ] Briefing: toggle opt-in + frequência (diário/semanal)
- [ ] Lint passa
- [ ] Types passam

---

### P-5.5 — Estados Intranet

**Fase:** 5
**Módulo:** intranet
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-5.5-intranet-states`
- Dependências: P-5.4 concluído
- Env vars: nenhuma

**Escopo:**
Loading, empty e error states. Skeletons para dashboard (grid de widgets), feed, diretório, calendário. Estados vazios contextuais.

**Arquivos permitidos para criação/edição:**

- `apps/intranet/src/components/dashboard-skeleton.tsx`
- `apps/intranet/src/components/feed-skeleton.tsx`
- `apps/intranet/src/components/directory-skeleton.tsx`
- `apps/intranet/src/app/(dashboard)/page.tsx` (adicionar estados)

**Critérios de aceite:**

- [ ] Skeletons para cada widget no dashboard
- [ ] Feed vazio: "Nenhum anúncio recente"
- [ ] Diretório vazio: "Nenhum membro encontrado"
- [ ] Lint passa
- [ ] Types passam

---

> **PAUSA — Bloco A Intranet concluído. Validar telas com diretoria antes de prosseguir para Bloco B.**

---

## Intranet — Bloco B (Backend)

---

### P-5.6 — Schema do Banco Intranet

**Fase:** 5
**Módulo:** intranet
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-5.6-intranet-schema`
- Dependências: P-5.5 concluído, validação da diretoria OK
- Env vars: `DATABASE_URL`

**Escopo:**
Criar tabelas Drizzle no schema `intranet`: announcements, dashboard_configs (user_id, widgets jsonb), meeting_decisions (meeting_session_id, content, task_id), briefing_preferences (user_id, enabled, frequency), kpi_snapshots (para cache de KPIs agregados).

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/intranet.ts`
- `packages/db/src/migrations/0012_intranet.sql`

**Critérios de aceite:**

- [ ] announcements: title, body, priority, author_id, published_at
- [ ] dashboard_configs: user_id (unique), widgets (jsonb com posições)
- [ ] meeting_decisions: meeting_session_id (FK admin.meeting_sessions), content, task_id (FK tarefas.tasks, nullable)
- [ ] briefing_preferences: user_id, enabled, frequency (daily/weekly)
- [ ] kpi_snapshots: metric_name, value, period, captured_at
- [ ] Migration aplica sem erros
- [ ] Types passam

---

### P-5.7 — RLS Policies Intranet

**Fase:** 5
**Módulo:** intranet
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-5.7-intranet-rls`
- Dependências: P-5.6 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
RLS para schema intranet. Super_admin: full access. Diretores/conselheiros: SELECT + INSERT em announcements; SELECT em meeting_decisions; CRUD na própria dashboard_config. Colaboradores: SELECT em announcements e diretório; CRUD na própria dashboard_config. Submissores/externos: sem acesso.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/0013_intranet_rls.sql`

**Critérios de aceite:**

- [ ] Super_admin: full CRUD
- [ ] Diretores/conselheiros: criar anúncios, ver decisões
- [ ] Colaboradores: ver anúncios (não criar), ver diretório
- [ ] dashboard_config: cada um gerencia apenas a própria
- [ ] Submissores: sem acesso ao schema intranet
- [ ] Types passam

---

### P-5.8 — Server Actions Intranet

**Fase:** 5
**Módulo:** intranet
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-5.8-intranet-actions`
- Dependências: P-5.7 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Escopo:**
Server Actions: CRUD de anúncios. Salvar/carregar config de dashboard. Registrar decisão de reunião (com opção de criar tarefa no módulo Tarefas). KPIs agregados: queries cross-schema (projetos ativos, alunos, transações do mês). Busca global cross-app (consulta todos os schemas). Briefing: job Inngest que gera resumo e envia por email.

**Arquivos permitidos para criação/edição:**

- `apps/intranet/src/actions/announcements.ts`
- `apps/intranet/src/actions/dashboard.ts`
- `apps/intranet/src/actions/decisions.ts`
- `apps/intranet/src/actions/kpis.ts`
- `apps/intranet/src/actions/search.ts`

**Critérios de aceite:**

- [ ] CRUD de anúncios com audit log
- [ ] Dashboard config persiste por usuário
- [ ] Decisão de reunião com criação automática de tarefa (via createAutoTask)
- [ ] KPIs: projetos ativos (count), alunos (count), doações mês (sum), tarefas abertas (count)
- [ ] Busca cross-app: retorna resultados de Projetos, Documentos, Tarefas, Financeiro
- [ ] Lint passa
- [ ] Types passam

---

### P-5.9 — Integração UI ↔ Backend Intranet

**Fase:** 5
**Módulo:** intranet
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-5.9-intranet-integration`
- Dependências: P-5.8 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_URL`

**Escopo:**
Substituir mocks. Dashboard com KPIs reais. Feed de anúncios do banco. Diretório com dados de public.users. Calendário com meeting_sessions. Busca cross-app funcional.

**Arquivos permitidos para criação/edição:**

- `apps/intranet/src/app/(dashboard)/page.tsx`
- `apps/intranet/src/app/(dashboard)/anuncios/page.tsx`
- `apps/intranet/src/app/(dashboard)/diretorio/page.tsx`
- `apps/intranet/src/app/(dashboard)/reunioes/page.tsx`
- `apps/intranet/src/app/(dashboard)/busca/page.tsx`
- `apps/intranet/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [ ] KPIs com dados reais cross-schema
- [ ] Diretório com todos os membros do public.users
- [ ] Calendário com reuniões de admin.meeting_sessions
- [ ] Busca cross-app retorna resultados reais
- [ ] Mock data removido
- [ ] Lint passa
- [ ] Types passam

---

### P-5.10 — Notificações e Emails Intranet

**Fase:** 5
**Módulo:** intranet
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-5.10-intranet-notifications`
- Dependências: P-5.9 concluído
- Env vars: `RESEND_API_KEY`

**Escopo:**
Notificações: anúncio urgente (in_app + email para todos do escopo). Decisão de reunião (in_app para diretores). Briefing (email periódico com resumo agregado: projetos, tarefas, financeiro). Relatório financeiro mensal (email para diretores/conselheiros).

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/urgent-announcement.tsx`
- `packages/email/src/templates/briefing.tsx`
- `apps/intranet/src/lib/notifications.ts`
- `apps/intranet/src/lib/briefing-job.ts`

**Critérios de aceite:**

- [ ] Anúncio urgente: notificação imediata para todos os internos
- [ ] Briefing: job Inngest com frequência configurável (diário/semanal)
- [ ] Briefing: resumo com KPIs + últimos eventos de cada módulo
- [ ] Lint passa
- [ ] Types passam

---

### P-5.11 — Integrações Cross-App Intranet

**Fase:** 5
**Módulo:** intranet
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-5.11-intranet-cross`
- Dependências: P-5.10 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Conectar integrações reais. Intranet → Tarefas: decisão de reunião cria tarefa (substituir stub). Plataforma → Intranet: KPI de alunos (stub até fase 6). Rádio → Intranet: KPI de audiência (stub até fase 8). Feed: agregar últimos eventos de Projetos, Financeiro, Tarefas.

**Arquivos permitidos para criação/edição:**

- `apps/intranet/src/lib/integrations/tarefas.ts`
- `apps/intranet/src/lib/integrations/plataforma-stub.ts`
- `apps/intranet/src/lib/integrations/radio-stub.ts`
- `apps/intranet/src/lib/integrations/feed-aggregator.ts`

**Critérios de aceite:**

- [ ] Decisão de reunião cria tarefa no módulo Tarefas (real)
- [ ] Feed agrega eventos reais de Projetos, Financeiro, Tarefas
- [ ] Stubs para Plataforma e Rádio documentados
- [ ] Lint passa
- [ ] Types passam

---

### P-5.12 — Testes Intranet

**Fase:** 5
**Módulo:** intranet
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-5.12-intranet-tests`
- Dependências: P-5.11 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Testes: RLS (diretor cria anúncio, colaborador não). KPIs cross-schema retornam valores corretos. Busca cross-app funciona. Dashboard config persiste e carrega. Decisão → tarefa funciona.

**Arquivos permitidos para criação/edição:**

- `apps/intranet/src/__tests__/rls.test.ts`
- `apps/intranet/src/__tests__/kpis.test.ts`
- `apps/intranet/src/__tests__/search.test.ts`

**Critérios de aceite:**

- [ ] RLS: colaborador não cria anúncios; diretor sim
- [ ] KPIs: queries cross-schema retornam contagens corretas
- [ ] Busca: resultados de múltiplos módulos
- [ ] Testes passam
- [ ] Lint passa

---

# Fase 6 — Plataforma (LMS)

---

## Plataforma — Bloco A (UI)

---

### P-6.1 — Schema de Tipos Plataforma

**Fase:** 6
**Módulo:** plataforma
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-6.1-plataforma-types`
- Dependências: P-5.12 concluído
- Env vars: nenhuma

**Escopo:**
Tipos e schemas Zod: Course, Module, Lesson (tipo: video/text/quiz/download), Enrollment, Progress, Quiz, QuizAttempt, Certificate, Discussion, DiscussionPost, Instructor. Trilha sequencial (unlock). Mock data com curso piloto como referência.

**Arquivos permitidos para criação/edição:**

- `packages/types/src/plataforma/index.ts`
- `packages/validators/src/plataforma/index.ts`
- `apps/plataforma/src/lib/mock-data.ts`

**Critérios de aceite:**

- [ ] Lesson com tipo enum: video, text, quiz, download
- [ ] Progress granular por aula (lesson_id, user_id, completed_at)
- [ ] Trilha sequencial: next_lesson_id, requires_completion
- [ ] Quiz: questions (jsonb), passing_score
- [ ] Certificate: course_id, user_id, issued_at, hash (verificação)
- [ ] Mock data: 3+ cursos, 10+ aulas, 2+ quizzes
- [ ] Lint passa
- [ ] Types passam

---

### P-6.2 — Componentes UI Plataforma

**Fase:** 6
**Módulo:** plataforma
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-6.2-plataforma-components`
- Dependências: P-6.1 concluído
- Env vars: nenhuma

**Escopo:**
Componentes: CourseCard (capa, título, instrutor, progresso). LessonPlayer (video HLS + controls). LessonContent (rich text). QuizForm (múltipla escolha, dissertativa). ProgressBar (por curso e geral). CertificateCard. DiscussionThread (por aula). CourseSidebar (lista de módulos/aulas com status de progresso). NoteWidget (notas no minuto do vídeo).

**Arquivos permitidos para criação/edição:**

- `apps/plataforma/src/components/course-card.tsx`
- `apps/plataforma/src/components/lesson-player.tsx`
- `apps/plataforma/src/components/quiz-form.tsx`
- `apps/plataforma/src/components/progress-bar.tsx`
- `apps/plataforma/src/components/certificate-card.tsx`
- `apps/plataforma/src/components/discussion-thread.tsx`
- `apps/plataforma/src/components/course-sidebar.tsx`
- `apps/plataforma/src/components/note-widget.tsx`

**Critérios de aceite:**

- [ ] LessonPlayer com video HLS (hls.js), controle de velocidade, marcadores
- [ ] CourseSidebar com módulos/aulas e ícones de progresso (completo/em andamento/locked)
- [ ] QuizForm com tipos: múltipla escolha e dissertativa
- [ ] NoteWidget: criar nota em timestamp do vídeo, clicável para ir ao ponto
- [ ] ProgressBar por curso e global (% de conclusão)
- [ ] Responsivo
- [ ] Lint passa
- [ ] Types passam

---

### P-6.3 — Telas e Páginas Plataforma

**Fase:** 6
**Módulo:** plataforma
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-6.3-plataforma-pages`
- Dependências: P-6.2 concluído
- Env vars: nenhuma

**Escopo:**
Páginas do aluno: Catálogo de cursos (filtros: categoria, dificuldade, instrutor). Página do curso (descrição, ementa, instrutor, CTA matrícula). Player de aula (vídeo + sidebar de navegação). Quiz. "Minha jornada" (cursos em andamento, progresso). Certificados. Discussões. Páginas do instrutor/pedagógico: Dashboard com estatísticas. Editor de curso (drag-drop módulos/aulas). Editor de aula. Editor de quiz.

**Arquivos permitidos para criação/edição:**

- `apps/plataforma/src/app/(aluno)/layout.tsx`
- `apps/plataforma/src/app/(aluno)/page.tsx`
- `apps/plataforma/src/app/(aluno)/curso/[slug]/page.tsx`
- `apps/plataforma/src/app/(aluno)/curso/[slug]/aula/[id]/page.tsx`
- `apps/plataforma/src/app/(aluno)/jornada/page.tsx`
- `apps/plataforma/src/app/(aluno)/certificados/page.tsx`
- `apps/plataforma/src/app/(instrutor)/layout.tsx`
- `apps/plataforma/src/app/(instrutor)/page.tsx`

**Critérios de aceite:**

- [ ] Catálogo com filtros e busca simples (título, série, categoria)
- [ ] Página de curso: descrição, ementa, instrutor, CTA matrícula
- [ ] Player: vídeo + sidebar navegação + notas + discussão
- [ ] "Minha jornada": cursos em andamento com progresso visual
- [ ] Certificados: lista com download PDF
- [ ] Editor de curso: drag-drop para ordenar módulos e aulas
- [ ] Responsivo
- [ ] Lint passa
- [ ] Types passam

---

### P-6.4 — Formulários Plataforma

**Fase:** 6
**Módulo:** plataforma
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-6.4-plataforma-forms`
- Dependências: P-6.3 concluído
- Env vars: nenhuma

**Escopo:**
Formulários: criar/editar curso (título, descrição, categoria, instrutor, capa). Criar/editar módulo (título, ordem). Criar/editar aula (título, tipo, conteúdo/vídeo URL, anexos). Criar quiz (perguntas, opções, pontuação). Matrícula (botão). Post no fórum de discussão. Nota pessoal (com timestamp).

**Arquivos permitidos para criação/edição:**

- `apps/plataforma/src/components/course-form.tsx`
- `apps/plataforma/src/components/lesson-form.tsx`
- `apps/plataforma/src/components/quiz-editor.tsx`
- `apps/plataforma/src/components/discussion-post-form.tsx`
- `apps/plataforma/src/components/note-form.tsx`

**Critérios de aceite:**

- [ ] Curso form: título, descrição rich text, capa (upload), categoria, instrutor
- [ ] Lesson form: upload de vídeo (URL Bunny.net) ou conteúdo rich text
- [ ] Quiz editor: adicionar/remover perguntas, definir respostas corretas
- [ ] Validação Zod
- [ ] Lint passa
- [ ] Types passam

---

### P-6.5 — Estados Plataforma

**Fase:** 6
**Módulo:** plataforma
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-6.5-plataforma-states`
- Dependências: P-6.4 concluído
- Env vars: nenhuma

**Escopo:**
Loading, empty e error states. Skeletons para catálogo, player, jornada. Estado vazio: "Nenhum curso disponível ainda", "Você ainda não se matriculou em nenhum curso".

**Arquivos permitidos para criação/edição:**

- `apps/plataforma/src/components/course-card-skeleton.tsx`
- `apps/plataforma/src/components/player-skeleton.tsx`
- `apps/plataforma/src/app/(aluno)/page.tsx` (adicionar estados)
- `apps/plataforma/src/app/(aluno)/jornada/page.tsx` (adicionar estados)

**Critérios de aceite:**

- [ ] Skeletons por tela
- [ ] Estados vazios contextuais
- [ ] Lint passa
- [ ] Types passam

---

> **PAUSA — Bloco A Plataforma concluído. Validar telas com diretoria antes de prosseguir para Bloco B.**

---

## Plataforma — Bloco B (Backend)

---

### P-6.6 — Schema do Banco Plataforma

**Fase:** 6
**Módulo:** plataforma
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-6.6-plataforma-schema`
- Dependências: P-6.5 concluído, validação da diretoria OK
- Env vars: `DATABASE_URL`

**Escopo:**
Criar tabelas no schema `plataforma`: courses, modules, lessons, enrollments, progress, quizzes, quiz_questions, quiz_attempts, certificates, discussions, discussion_posts, instructors, notes (user_id, lesson_id, timestamp_seconds, content).

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/plataforma.ts`
- `packages/db/src/migrations/0014_plataforma.sql`

**Critérios de aceite:**

- [ ] courses: title, slug, description, category, cover_url, instructor_id, published
- [ ] lessons: module_id, title, type (video/text/quiz/download), content, video_url, order, requires_previous
- [ ] progress: lesson_id, user_id, completed_at (unique constraint)
- [ ] certificates: course_id, user_id, issued_at, verification_hash (unique)
- [ ] notes: lesson_id, user_id, timestamp_seconds, content
- [ ] Migration aplica sem erros
- [ ] Types passam

---

### P-6.7 — RLS Policies Plataforma

**Fase:** 6
**Módulo:** plataforma
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-6.7-plataforma-rls`
- Dependências: P-6.6 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
RLS para schema plataforma. Qualquer usuário autenticado: SELECT em courses publicados, lessons de cursos matriculados. Progresso e notas: apenas próprios. Super_admin e instrutor: CRUD completo. Certificados: SELECT próprio + verificação pública por hash.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/0015_plataforma_rls.sql`

**Critérios de aceite:**

- [ ] Autenticado: vê cursos publicados
- [ ] Matriculado: vê aulas do curso, registra progresso
- [ ] Aula locked: não visível se anterior não concluída (trilha sequencial)
- [ ] Super_admin/instrutor: CRUD completo em cursos, módulos, aulas
- [ ] Notas: apenas próprias
- [ ] Certificados: próprio + verificação pública por hash
- [ ] Types passam

---

### P-6.8 — Server Actions Plataforma

**Fase:** 6
**Módulo:** plataforma
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-6.8-plataforma-actions`
- Dependências: P-6.7 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Escopo:**
Server Actions: CRUD de cursos, módulos, aulas (instrutor/admin). Matrícula. Registrar progresso (marcar aula como concluída). Submeter quiz. Emissão automática de certificado (ao concluir trilha). CRUD de discussões e posts. Notas pessoais. Busca simples (título, série, categoria).

**Arquivos permitidos para criação/edição:**

- `apps/plataforma/src/actions/courses.ts`
- `apps/plataforma/src/actions/enrollment.ts`
- `apps/plataforma/src/actions/progress.ts`
- `apps/plataforma/src/actions/quizzes.ts`
- `apps/plataforma/src/actions/certificates.ts`
- `apps/plataforma/src/actions/discussions.ts`

**Critérios de aceite:**

- [ ] CRUD de cursos/módulos/aulas com reordenação
- [ ] Matrícula: cria enrollment e libera acesso
- [ ] Progresso: marcar aula como concluída, verificar trilha sequencial
- [ ] Quiz: submeter respostas, calcular score, registrar attempt
- [ ] Certificado: emitido automaticamente quando 100% da trilha concluída
- [ ] Certificado com hash de verificação pública
- [ ] Discussões por aula com moderação (super_admin pode deletar)
- [ ] Lint passa
- [ ] Types passam

---

### P-6.9 — Integração UI ↔ Backend Plataforma

**Fase:** 6
**Módulo:** plataforma
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-6.9-plataforma-integration`
- Dependências: P-6.8 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_URL`

**Escopo:**
Substituir mocks. Catálogo com cursos reais. Player com vídeo via Bunny.net HLS. Progresso real. Certificados reais com download PDF. Discussões reais.

**Arquivos permitidos para criação/edição:**

- `apps/plataforma/src/app/(aluno)/page.tsx`
- `apps/plataforma/src/app/(aluno)/curso/[slug]/page.tsx`
- `apps/plataforma/src/app/(aluno)/curso/[slug]/aula/[id]/page.tsx`
- `apps/plataforma/src/app/(aluno)/jornada/page.tsx`
- `apps/plataforma/src/app/(aluno)/certificados/page.tsx`
- `apps/plataforma/src/app/(instrutor)/page.tsx`
- `apps/plataforma/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [ ] Catálogo com cursos do banco
- [ ] Player carrega vídeo via Bunny.net HLS
- [ ] Trilha sequencial funcional (aula locked até anterior concluída)
- [ ] Certificado gerado como PDF com hash verificável
- [ ] Mock data removido
- [ ] Lint passa
- [ ] Types passam

---

### P-6.10 — Notificações e Emails Plataforma

**Fase:** 6
**Módulo:** plataforma
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-6.10-plataforma-notifications`
- Dependências: P-6.9 concluído
- Env vars: `RESEND_API_KEY`

**Escopo:**
Notificações: matrícula confirmada (email). Novo curso publicado (email para todos os matriculados). Certificado emitido (email + in_app). Resposta no fórum (in_app).

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/enrollment-confirmed.tsx`
- `packages/email/src/templates/new-course.tsx`
- `packages/email/src/templates/certificate-issued.tsx`
- `apps/plataforma/src/lib/notifications.ts`

**Critérios de aceite:**

- [ ] Matrícula: email de confirmação com link para o curso
- [ ] Novo curso: email para todos os usuários ativos
- [ ] Certificado: email com link de download + in_app
- [ ] Resposta no fórum: in_app para o autor do post original
- [ ] Lint passa
- [ ] Types passam

---

### P-6.11 — Integração Cross-App Plataforma

**Fase:** 6
**Módulo:** plataforma
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-6.11-plataforma-cross`
- Dependências: P-6.10 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Plataforma → Intranet: KPI de alunos (total matriculados, cursos ativos, taxa de conclusão). Substituir stub na Intranet. Preparar estrutura para papel "professor" futuro (flag no schema, sem funcionalidade adicional na v1).

**Arquivos permitidos para criação/edição:**

- `apps/plataforma/src/lib/integrations/intranet.ts`
- `apps/intranet/src/lib/integrations/plataforma-stub.ts` (substituir por real)

**Critérios de aceite:**

- [ ] KPI de alunos disponível para Intranet (query cross-schema)
- [ ] Stub da Intranet substituído por dados reais
- [ ] Campo instructor_role preparado no schema (sem funcionalidade extra na v1)
- [ ] Lint passa
- [ ] Types passam

---

### P-6.12 — Testes Plataforma

**Fase:** 6
**Módulo:** plataforma
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-6.12-plataforma-tests`
- Dependências: P-6.11 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Testes: RLS (aluno vê apenas cursos publicados e próprio progresso). Trilha sequencial (não acessa aula se anterior não concluída). Quiz (submissão e scoring). Certificado (emissão automática ao 100%). Discussões (moderação).

**Arquivos permitidos para criação/edição:**

- `apps/plataforma/src/__tests__/rls.test.ts`
- `apps/plataforma/src/__tests__/progress.test.ts`
- `apps/plataforma/src/__tests__/certificates.test.ts`

**Critérios de aceite:**

- [ ] Trilha: aula 3 inacessível se aula 2 não concluída
- [ ] Certificado: emitido quando todas as aulas marcadas como concluídas
- [ ] Quiz: score calculado corretamente
- [ ] RLS: aluno não vê progresso de outro aluno
- [ ] Testes passam
- [ ] Lint passa

---

# Fase 7 — Flats

---

## Flats — Bloco A (UI)

---

### P-7.1 — Schema de Tipos Flats

**Fase:** 7
**Módulo:** flats
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-7.1-flats-types`
- Dependências: P-6.12 concluído
- Env vars: nenhuma

**Escopo:**
Tipos e schemas Zod: Unit (2 flats fixos), Reservation (com 3 períodos de preferência), Guest (responsável + acompanhantes), Vehicle, ScoringCriteria (10 critérios com pontuação automática, max 80 pts), AidRequest (diária + transporte). Mock data com cenários de scoring e desempate.

**Arquivos permitidos para criação/edição:**

- `packages/types/src/flats/index.ts`
- `packages/validators/src/flats/index.ts`
- `apps/flats/src/lib/mock-data.ts`

**Critérios de aceite:**

- [ ] Unit: nome, capacidade (6), quartos (2), fotos, amenidades
- [ ] Reservation com 3 preferred_periods: [{start, end}, {start, end}, {start, end}]
- [ ] Guest: responsável + até 6 acompanhantes + 2 menores de 3 anos
- [ ] Vehicle: placa, cor, modelo, marca (obrigatório se vier de carro)
- [ ] ScoringCriteria: 10 critérios (a-j) com pontuação automática (max 80)
- [ ] Regra: max 7 dias por 12 meses por indivíduo
- [ ] AidRequest: diária, transporte (aéreo R$1.000/pessoa ou combustível)
- [ ] Lint passa
- [ ] Types passam

**Notas:**
Ref: BRAIN.md seção 6.8 e edital de flats em `.docs/EDITAL PARA SOLICITAÇÕES DE RESERVA NO FLAT.md`.

---

### P-7.2 — Componentes UI Flats

**Fase:** 7
**Módulo:** flats
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-7.2-flats-components`
- Dependências: P-7.1 concluído
- Env vars: nenhuma

**Escopo:**
Componentes: UnitCard (fotos, capacidade, status). AvailabilityCalendar (timeline com reservas por flat). ReservationCard (hóspede, período, score, status). ScoringPanel (breakdown dos 10 critérios com pontuação). GuestList (responsável + acompanhantes). ApprovalQueue (fila de reservas pendentes para o diretor gestor). PeriodPicker (seletor de 3 períodos de preferência).

**Arquivos permitidos para criação/edição:**

- `apps/flats/src/components/unit-card.tsx`
- `apps/flats/src/components/availability-calendar.tsx`
- `apps/flats/src/components/reservation-card.tsx`
- `apps/flats/src/components/scoring-panel.tsx`
- `apps/flats/src/components/guest-list.tsx`
- `apps/flats/src/components/approval-queue.tsx`
- `apps/flats/src/components/period-picker.tsx`

**Critérios de aceite:**

- [ ] AvailabilityCalendar: timeline horizontal com reservas coloridas por status
- [ ] ScoringPanel: 10 critérios com barra de pontuação e total
- [ ] PeriodPicker: 3 seletores de range de data com validação (max 7 dias cada)
- [ ] ApprovalQueue: lista ordenada por score com desempate visível
- [ ] Responsivo
- [ ] Lint passa
- [ ] Types passam

---

### P-7.3 — Telas e Páginas Flats

**Fase:** 7
**Módulo:** flats
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-7.3-flats-pages`
- Dependências: P-7.2 concluído
- Env vars: nenhuma

**Escopo:**
Páginas do hóspede: catálogo de flats (fotos, disponibilidade). Formulário de reserva (dados pessoais + acompanhantes + veículo + 3 períodos + critérios de scoring). Status da reserva. Histórico. Páginas admin: calendário consolidado. Fila de aprovação. Detalhe da reserva. Check-in/check-out.

**Arquivos permitidos para criação/edição:**

- `apps/flats/src/app/(hospede)/layout.tsx`
- `apps/flats/src/app/(hospede)/page.tsx`
- `apps/flats/src/app/(hospede)/reservar/page.tsx`
- `apps/flats/src/app/(hospede)/minhas-reservas/page.tsx`
- `apps/flats/src/app/(admin)/layout.tsx`
- `apps/flats/src/app/(admin)/page.tsx`
- `apps/flats/src/app/(admin)/reserva/[id]/page.tsx`
- `apps/flats/src/app/(admin)/aprovacao/page.tsx`

**Critérios de aceite:**

- [ ] Catálogo com fotos e disponibilidade por flat
- [ ] Formulário completo: dados pessoais, acompanhantes, veículo, 3 períodos, critérios
- [ ] Status da reserva com timeline visual
- [ ] Calendário consolidado (admin) com ambos os flats
- [ ] Fila de aprovação ordenada por score
- [ ] Responsivo
- [ ] Lint passa
- [ ] Types passam

---

### P-7.4 — Formulários Flats

**Fase:** 7
**Módulo:** flats
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-7.4-flats-forms`
- Dependências: P-7.3 concluído
- Env vars: nenhuma

**Escopo:**
Formulários: reserva completa multi-step (dados do responsável com upload de documento → acompanhantes com CPF e data nascimento → veículo → 3 períodos de preferência → critérios de scoring → ajuda de custo opcional → revisão). Aprovação (selecionar período final, observações). Check-in (checklist de inventário).

**Arquivos permitidos para criação/edição:**

- `apps/flats/src/components/reservation-wizard.tsx`
- `apps/flats/src/components/reservation-wizard-steps/step-guest.tsx`
- `apps/flats/src/components/reservation-wizard-steps/step-companions.tsx`
- `apps/flats/src/components/reservation-wizard-steps/step-vehicle.tsx`
- `apps/flats/src/components/reservation-wizard-steps/step-periods.tsx`
- `apps/flats/src/components/reservation-wizard-steps/step-scoring.tsx`
- `apps/flats/src/components/approval-form.tsx`
- `apps/flats/src/components/checkin-form.tsx`

**Critérios de aceite:**

- [ ] Wizard com 6+ steps e validação Zod por step
- [ ] Upload de documento de identidade (obrigatório)
- [ ] Acompanhantes: dinâmico (adicionar/remover), max 6+2 menores
- [ ] 3 períodos de preferência com validação de disponibilidade
- [ ] Critérios de scoring: inputs por tipo (anos, seleção, boolean, texto)
- [ ] Ajuda de custo: toggle + tipo (aéreo/combustível) + valor
- [ ] Score calculado automaticamente em tempo real no formulário
- [ ] Lint passa
- [ ] Types passam

---

### P-7.5 — Estados Flats

**Fase:** 7
**Módulo:** flats
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-7.5-flats-states`
- Dependências: P-7.4 concluído
- Env vars: nenhuma

**Escopo:**
Loading, empty e error states. Skeletons para catálogo, calendário, fila de aprovação. Estado vazio: "Nenhuma reserva pendente", "Sem reservas nos próximos 30 dias".

**Arquivos permitidos para criação/edição:**

- `apps/flats/src/components/calendar-skeleton.tsx`
- `apps/flats/src/components/approval-queue-skeleton.tsx`
- `apps/flats/src/app/(hospede)/page.tsx` (adicionar estados)
- `apps/flats/src/app/(admin)/page.tsx` (adicionar estados)

**Critérios de aceite:**

- [ ] Skeletons por tela
- [ ] Estados vazios contextuais
- [ ] Lint passa
- [ ] Types passam

---

> **PAUSA — Bloco A Flats concluído. Validar telas com diretoria antes de prosseguir para Bloco B.**

---

## Flats — Bloco B (Backend)

---

### P-7.6 — Schema do Banco Flats

**Fase:** 7
**Módulo:** flats
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-7.6-flats-schema`
- Dependências: P-7.5 concluído, validação da diretoria OK
- Env vars: `DATABASE_URL`

**Escopo:**
Criar tabelas no schema `flats`: units (2 fixas, seed), reservations (status, selected_period, score_total), preferred_periods (reservation_id, start, end), guests (reservation_id, name, cpf, birth_date, is_responsible), vehicles (reservation_id), scoring_responses (reservation_id, criterion, value, points), aid_requests (reservation_id, type, amount), usage_history (para regra de 7 dias/12 meses).

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/flats.ts`
- `packages/db/src/migrations/0016_flats.sql`

**Critérios de aceite:**

- [ ] units: 2 registros seed (flat 1, flat 2)
- [ ] reservations: status (solicitada, aprovada, rejeitada, confirmada, em_curso, concluida, cancelada)
- [ ] preferred_periods: 3 por reserva (constraint)
- [ ] scoring_responses: 10 critérios com pontuação calculada
- [ ] usage_history: user_id, reservation_id, days_used, period (para regra 7d/12m)
- [ ] Constraint: double-booking prevention por unit+period
- [ ] Migration aplica sem erros
- [ ] Types passam

---

### P-7.7 — RLS Policies Flats

**Fase:** 7
**Módulo:** flats
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-7.7-flats-rls`
- Dependências: P-7.6 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
RLS para schema flats. Hóspede: CRUD apenas nas próprias reservas. Diretor gestor (designation): SELECT + UPDATE para aprovar/rejeitar. Super_admin: full access. Diretores/conselheiros: NÃO podem criar reservas (conflito de interesse).

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/0017_flats_rls.sql`

**Critérios de aceite:**

- [ ] Hóspede: CRUD apenas nas próprias reservas
- [ ] Diretor gestor: SELECT all + UPDATE (aprovar/rejeitar)
- [ ] Super_admin: full access
- [ ] Diretores/conselheiros: sem INSERT em reservations (conflito de interesse)
- [ ] Units: SELECT para todos os autenticados
- [ ] Types passam

---

### P-7.8 — Server Actions Flats

**Fase:** 7
**Módulo:** flats
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-7.8-flats-actions`
- Dependências: P-7.7 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Escopo:**
Server Actions: criar reserva (com validação de elegibilidade, limite 7d/12m, disponibilidade). Calcular score automaticamente (10 critérios, auto-calcular b e j do histórico). Aprovar/rejeitar (diretor gestor, selecionar período final). Solicitar ajuda de custo. Confirmar reserva. Check-in/check-out. Desempate (idade → tempo sem descanso → nunca usou → sorteio). Soft-delete com justificativa.

**Arquivos permitidos para criação/edição:**

- `apps/flats/src/actions/reservations.ts`
- `apps/flats/src/actions/scoring.ts`
- `apps/flats/src/actions/approval.ts`
- `apps/flats/src/actions/checkin.ts`
- `apps/flats/src/actions/aid.ts`

**Critérios de aceite:**

- [ ] Validação de elegibilidade: pastores/missionários (via papel hospede)
- [ ] Validação: max 7 dias nos últimos 12 meses por indivíduo
- [ ] Score: 10 critérios calculados, b (frequência) e j (participação em projetos) do banco
- [ ] Desempate: idade → tempo sem descanso → nunca usou → sorteio (nesta ordem)
- [ ] Aprovação: diretor gestor seleciona 1 dos 3 períodos
- [ ] Ajuda de custo: cria despesas no Financeiro se aprovada
- [ ] Audit log em toda mutação
- [ ] Lint passa
- [ ] Types passam

---

### P-7.9 — Integração UI ↔ Backend Flats

**Fase:** 7
**Módulo:** flats
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-7.9-flats-integration`
- Dependências: P-7.8 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_URL`

**Escopo:**
Substituir mocks. Calendário com reservas reais. Fila de aprovação com score real. Wizard conectado. Check-in funcional.

**Arquivos permitidos para criação/edição:**

- `apps/flats/src/app/(hospede)/page.tsx`
- `apps/flats/src/app/(hospede)/reservar/page.tsx`
- `apps/flats/src/app/(hospede)/minhas-reservas/page.tsx`
- `apps/flats/src/app/(admin)/page.tsx`
- `apps/flats/src/app/(admin)/aprovacao/page.tsx`
- `apps/flats/src/app/(admin)/reserva/[id]/page.tsx`
- `apps/flats/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [ ] Calendário com reservas reais do banco
- [ ] Score calculado automaticamente ao submeter
- [ ] Fila de aprovação ordenada por score com desempate
- [ ] Mock data removido
- [ ] Lint passa
- [ ] Types passam

---

### P-7.10 — Notificações e Emails Flats

**Fase:** 7
**Módulo:** flats
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-7.10-flats-notifications`
- Dependências: P-7.9 concluído
- Env vars: `RESEND_API_KEY`

**Escopo:**
Notificações: reserva submetida (in_app ao diretor gestor). Reserva aprovada/rejeitada (email ao hóspede com período selecionado ou motivo). Instruções de check-in (email 3 dias antes com endereço, contato, regras). Lembrete de check-out (email no dia).

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/reservation-submitted.tsx`
- `packages/email/src/templates/reservation-approved.tsx`
- `packages/email/src/templates/checkin-instructions.tsx`
- `apps/flats/src/lib/notifications.ts`

**Critérios de aceite:**

- [ ] Reserva submetida: in_app ao diretor gestor + email
- [ ] Aprovada: email ao hóspede com período final e instruções
- [ ] Rejeitada: email ao hóspede com motivo
- [ ] Check-in: email 3 dias antes com todas as instruções
- [ ] Check-out: lembrete no dia
- [ ] Lint passa
- [ ] Types passam

---

### P-7.11 — Integrações Cross-App Flats

**Fase:** 7
**Módulo:** flats
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-7.11-flats-cross`
- Dependências: P-7.10 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Conectar integrações. Flats → Tarefas: reserva confirmada gera tarefas de limpeza (pré e pós-estadia) via createAutoTask (substituir stub). Flats → Financeiro: ajuda de custo aprovada cria despesas (data = dia anterior ao início da reserva). Flats ← Projetos: campo "participação em projetos" auto-calculado para scoring.

**Arquivos permitidos para criação/edição:**

- `apps/flats/src/lib/integrations/tarefas.ts`
- `apps/flats/src/lib/integrations/financeiro.ts`
- `apps/flats/src/lib/integrations/projetos.ts`
- `apps/tarefas/src/lib/integrations/flats-stub.ts` (substituir por real)

**Critérios de aceite:**

- [ ] Reserva confirmada cria tarefa de limpeza pré-estadia + pós-estadia (real)
- [ ] Ajuda de custo aprovada cria despesa no Financeiro (data = dia anterior à reserva)
- [ ] Scoring critério j: auto-calculado do histórico de projetos aprovados
- [ ] Stubs substituídos por integrações reais
- [ ] Lint passa
- [ ] Types passam

---

### P-7.12 — Testes Flats

**Fase:** 7
**Módulo:** flats
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-7.12-flats-tests`
- Dependências: P-7.11 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Testes: RLS (hóspede vê apenas próprias, diretor/conselheiro não cria reserva). Scoring (10 critérios calculam corretamente). Desempate. Regra 7d/12m. Double-booking prevention. Fluxo completo: submeter → aprovar → confirmar → check-in → check-out.

**Arquivos permitidos para criação/edição:**

- `apps/flats/src/__tests__/rls.test.ts`
- `apps/flats/src/__tests__/scoring.test.ts`
- `apps/flats/src/__tests__/reservations.test.ts`

**Critérios de aceite:**

- [ ] RLS: diretor/conselheiro não cria reserva (conflito de interesse)
- [ ] Scoring: 10 critérios somam corretamente (max 80)
- [ ] Desempate: ordem correta (idade → tempo → nunca usou → sorteio)
- [ ] 7d/12m: reserva que excede limite é bloqueada
- [ ] Double-booking: duas reservas no mesmo flat/período retorna erro
- [ ] Fluxo completo funciona end-to-end
- [ ] Testes passam
- [ ] Lint passa

---

# Fase 8 — Rádio

---

## Rádio — Bloco A (UI)

---

### P-8.1 — Schema de Tipos Rádio

**Fase:** 8
**Módulo:** radio
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-8.1-radio-types`
- Dependências: P-7.12 concluído
- Env vars: nenhuma

**Escopo:**
Tipos e schemas Zod para o escopo REDUZIDO da Rádio. Tipos: Track (mp3 pré-gravado), Playlist, Author, Series, NowPlaying, ExclusiveMaterial, TermAcceptance. Sem: shows, schedule_slots, song_requests, podcast_subscribers, DJs, grade. Mock data com playlists de sermões organizados por autor e série.

**Arquivos permitidos para criação/edição:**

- `packages/types/src/radio/index.ts`
- `packages/validators/src/radio/index.ts`
- `apps/radio/src/lib/mock-data.ts`

**Critérios de aceite:**

- [ ] Track: title, author_id, series_id, file_url (R2), duration_seconds
- [ ] Playlist: name, tracks (ordered), loop
- [ ] Author: name, bio, photo
- [ ] Series: name, author_id, description
- [ ] NowPlaying: track_id, started_at, position_seconds
- [ ] ExclusiveMaterial: title, file_url, requires_term
- [ ] TermAcceptance: user_id, accepted_at (aceito 1 vez)
- [ ] SEM tipos para DJs, grade, podcast, pedidos musicais
- [ ] Lint passa
- [ ] Types passam

**Notas:**
Ref: BRAIN.md seção 6.4 (escopo REDUZIDO). Auto DJ 24/7 tocando .mp3 do R2. Sem live streaming.

---

### P-8.2 — Componentes UI Rádio

**Fase:** 8
**Módulo:** radio
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-8.2-radio-components`
- Dependências: P-8.1 concluído
- Env vars: nenhuma

**Escopo:**
Componentes: Player (persistente, background play, tocando agora). TrackInfo (autor, série, duração). PlaylistView (lista de faixas). AuthorCard (nome, bio, foto, séries). SeriesList (por autor). MaterialCard (download exclusivo com status do termo). TermsAcceptDialog (aceite de termo de responsabilidade).

**Arquivos permitidos para criação/edição:**

- `apps/radio/src/components/player.tsx`
- `apps/radio/src/components/track-info.tsx`
- `apps/radio/src/components/playlist-view.tsx`
- `apps/radio/src/components/author-card.tsx`
- `apps/radio/src/components/material-card.tsx`
- `apps/radio/src/components/terms-accept-dialog.tsx`

**Critérios de aceite:**

- [ ] Player persistente no footer (continua tocando entre páginas)
- [ ] Player com: play/pause, próxima, anterior, volume, barra de progresso
- [ ] "Tocando agora" com nome da faixa, autor e série
- [ ] PlaylistView com faixas ordenadas e indicador de faixa atual
- [ ] MaterialCard: download disponível apenas com termo aceito
- [ ] TermsAcceptDialog: texto do termo + checkbox + botão aceitar
- [ ] Responsivo (player adapta no mobile)
- [ ] Lint passa
- [ ] Types passam

---

### P-8.3 — Telas e Páginas Rádio

**Fase:** 8
**Módulo:** radio
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-8.3-radio-pages`
- Dependências: P-8.2 concluído
- Env vars: nenhuma

**Escopo:**
Páginas: Home com player principal e "tocando agora". Catálogo por autor. Catálogo por série. Página do autor (bio, séries, faixas). Página da série (faixas). Materiais exclusivos (requer login + termo). Sobre a rádio. Área admin: upload de faixas, gestão de playlists, gestão de materiais exclusivos.

**Arquivos permitidos para criação/edição:**

- `apps/radio/src/app/layout.tsx`
- `apps/radio/src/app/page.tsx`
- `apps/radio/src/app/autores/page.tsx`
- `apps/radio/src/app/autores/[slug]/page.tsx`
- `apps/radio/src/app/series/[slug]/page.tsx`
- `apps/radio/src/app/materiais/page.tsx`
- `apps/radio/src/app/(admin)/layout.tsx`
- `apps/radio/src/app/(admin)/page.tsx`

**Critérios de aceite:**

- [ ] Home com player em destaque e "tocando agora"
- [ ] Catálogos por autor e por série com busca
- [ ] Página de autor: bio, foto, lista de séries
- [ ] Materiais exclusivos: login wall + aceite de termo antes do download
- [ ] Admin: upload de faixas, criar playlists, gerenciar materiais
- [ ] Player persistente em TODAS as páginas (não recarrega)
- [ ] Responsivo
- [ ] Lint passa
- [ ] Types passam

**Notas:**
Home pública (sem login para ouvir). PWA será configurada no Bloco B.

---

### P-8.4 — Formulários Rádio

**Fase:** 8
**Módulo:** radio
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-8.4-radio-forms`
- Dependências: P-8.3 concluído
- Env vars: nenhuma

**Escopo:**
Formulários admin: upload de faixa (título, autor, série, arquivo .mp3). Criar/editar autor (nome, bio, foto). Criar/editar série. Criar/editar playlist (drag-drop para ordenar faixas). Upload de material exclusivo (título, arquivo, descrição).

**Arquivos permitidos para criação/edição:**

- `apps/radio/src/components/track-upload-form.tsx`
- `apps/radio/src/components/author-form.tsx`
- `apps/radio/src/components/series-form.tsx`
- `apps/radio/src/components/playlist-form.tsx`
- `apps/radio/src/components/material-upload-form.tsx`

**Critérios de aceite:**

- [ ] Upload de .mp3 com extração automática de duração
- [ ] Playlist com drag-drop para reordenar faixas
- [ ] Material exclusivo com campo de descrição e upload
- [ ] Validação Zod
- [ ] Lint passa
- [ ] Types passam

---

### P-8.5 — Estados Rádio

**Fase:** 8
**Módulo:** radio
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-8.5-radio-states`
- Dependências: P-8.4 concluído
- Env vars: nenhuma

**Escopo:**
Loading, empty e error states. Skeleton para player, catálogo, materiais. Estado vazio: "Nenhuma faixa disponível". Estado de erro no player (falha ao carregar áudio).

**Arquivos permitidos para criação/edição:**

- `apps/radio/src/components/player-skeleton.tsx`
- `apps/radio/src/components/catalog-skeleton.tsx`
- `apps/radio/src/app/page.tsx` (adicionar estados)

**Critérios de aceite:**

- [ ] Skeletons por tela
- [ ] Player error state: "Não foi possível carregar o áudio. Tentando novamente..."
- [ ] Lint passa
- [ ] Types passam

---

> **PAUSA — Bloco A Rádio concluído. Validar telas com diretoria antes de prosseguir para Bloco B.**

---

## Rádio — Bloco B (Backend)

---

### P-8.6 — Schema do Banco Rádio

**Fase:** 8
**Módulo:** radio
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-8.6-radio-schema`
- Dependências: P-8.5 concluído, validação da diretoria OK
- Env vars: `DATABASE_URL`

**Escopo:**
Criar tabelas no schema `radio`: tracks, authors, series, playlists, playlist_tracks (ordered), exclusive_materials, term_acceptances, now_playing (singleton), listener_stats (snapshot). Sem: shows, schedule_slots, song_requests, podcast_subscribers.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/radio.ts`
- `packages/db/src/migrations/0018_radio.sql`

**Critérios de aceite:**

- [ ] tracks: title, author_id, series_id, file_url, duration_seconds, uploaded_at
- [ ] playlists: name, is_active (apenas 1 ativa por vez)
- [ ] playlist_tracks: playlist_id, track_id, position
- [ ] now_playing: singleton (1 row), track_id, started_at
- [ ] exclusive_materials: title, file_url, description
- [ ] term_acceptances: user_id (unique), accepted_at
- [ ] SEM tabelas de DJs, grade, podcast, pedidos
- [ ] Migration aplica sem erros
- [ ] Types passam

---

### P-8.7 — RLS Policies Rádio

**Fase:** 8
**Módulo:** radio
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-8.7-radio-rls`
- Dependências: P-8.6 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
RLS para schema radio. Anon: SELECT em tracks, authors, series, playlists, now_playing (ouvir sem cadastro). Autenticado com termo aceito: SELECT em exclusive_materials + download via signed URL. Super_admin: full CRUD. Demais: leitura pública.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/0019_radio_rls.sql`

**Critérios de aceite:**

- [ ] Anon: SELECT em tracks, authors, series, now_playing
- [ ] Autenticado: SELECT em exclusive_materials SE term_acceptances existe
- [ ] Super_admin: full CRUD
- [ ] term_acceptances: INSERT próprio, SELECT próprio
- [ ] Types passam

---

### P-8.8 — Server Actions Rádio

**Fase:** 8
**Módulo:** radio
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-8.8-radio-actions`
- Dependências: P-8.7 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`

**Escopo:**
Server Actions: upload de faixa para Cloudflare R2. CRUD de autores, séries, playlists. Auto DJ: API route server-side que serve áudio do R2 (proxy com playlist ativa). Atualizar "tocando agora" via Supabase Realtime. Aceitar termo (1x por usuário). Download de material exclusivo via signed URL. Configurar PWA (manifest + service worker para background play).

**Arquivos permitidos para criação/edição:**

- `apps/radio/src/actions/tracks.ts`
- `apps/radio/src/actions/playlists.ts`
- `apps/radio/src/actions/materials.ts`
- `apps/radio/src/actions/terms.ts`
- `apps/radio/src/app/api/stream/route.ts`
- `apps/radio/src/app/manifest.ts`

**Critérios de aceite:**

- [ ] Upload de .mp3 para R2 com URL retornada
- [ ] Auto DJ: API route que serve faixa atual do playlist ativo (não stream contínuo — cada ouvinte pode estar em ponto diferente)
- [ ] "Tocando agora" atualizado via Supabase Realtime (broadcast)
- [ ] Termo: aceitar 1x, verificar antes de servir material exclusivo
- [ ] Signed URL para download de material exclusivo (expira em 1h)
- [ ] PWA manifest com background play habilitado
- [ ] Lint passa
- [ ] Types passam

**Notas:**
Ref: BRAIN.md seção 6.4. Não é stream contínuo — cada ouvinte em ponto diferente. "Tocando agora" é informativo (baseado na faixa mais recentemente iniciada pelo server).

---

### P-8.9 — Integração UI ↔ Backend Rádio

**Fase:** 8
**Módulo:** radio
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-8.9-radio-integration`
- Dependências: P-8.8 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_URL`, `R2_PUBLIC_URL`

**Escopo:**
Substituir mocks. Player tocando áudio real do R2. "Tocando agora" via Supabase Realtime. Catálogos com dados do banco. Materiais exclusivos com signed URLs. PWA funcional.

**Arquivos permitidos para criação/edição:**

- `apps/radio/src/app/page.tsx`
- `apps/radio/src/app/autores/page.tsx`
- `apps/radio/src/app/autores/[slug]/page.tsx`
- `apps/radio/src/app/materiais/page.tsx`
- `apps/radio/src/app/(admin)/page.tsx`
- `apps/radio/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [ ] Player toca áudio real do R2
- [ ] "Tocando agora" atualiza em tempo real via Supabase Realtime
- [ ] Catálogos com dados do banco
- [ ] Material exclusivo: login + termo → download via signed URL
- [ ] PWA instala e toca em background
- [ ] Mock data removido
- [ ] Lint passa
- [ ] Types passam

---

### P-8.10 — Notificações Rádio

**Fase:** 8
**Módulo:** radio
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-8.10-radio-notifications`
- Dependências: P-8.9 concluído
- Env vars: `RESEND_API_KEY`

**Escopo:**
Notificações mínimas: novo material exclusivo disponível (email para usuários com termo aceito). Novo conteúdo de autor favorito (in_app, se implementar favoritos — nice-to-have).

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/new-material.tsx`
- `apps/radio/src/lib/notifications.ts`

**Critérios de aceite:**

- [ ] Novo material exclusivo: email para todos com termo aceito
- [ ] Template com layout institucional
- [ ] Lint passa
- [ ] Types passam

---

### P-8.11 — Integração Cross-App Rádio

**Fase:** 8
**Módulo:** radio
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-8.11-radio-cross`
- Dependências: P-8.10 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Rádio → Intranet: KPI de audiência (total ouvintes, faixas tocadas). Substituir stub na Intranet. Métricas básicas: listener_stats com snapshots periódicos.

**Arquivos permitidos para criação/edição:**

- `apps/radio/src/lib/integrations/intranet.ts`
- `apps/radio/src/lib/listener-stats.ts`
- `apps/intranet/src/lib/integrations/radio-stub.ts` (substituir por real)

**Critérios de aceite:**

- [ ] KPI de audiência disponível para Intranet
- [ ] Stub substituído por dados reais
- [ ] Snapshot de listener_stats periódico (via Inngest)
- [ ] Lint passa
- [ ] Types passam

---

### P-8.12 — Testes Rádio

**Fase:** 8
**Módulo:** radio
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-8.12-radio-tests`
- Dependências: P-8.11 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Testes: RLS (anon ouve, autenticado+termo acessa materiais). Upload de faixa para R2. Playlist ativa (apenas 1). Termo aceito 1x. Signed URL expira.

**Arquivos permitidos para criação/edição:**

- `apps/radio/src/__tests__/rls.test.ts`
- `apps/radio/src/__tests__/playlist.test.ts`
- `apps/radio/src/__tests__/materials.test.ts`

**Critérios de aceite:**

- [ ] RLS: anon acessa tracks; sem termo não acessa materials
- [ ] Playlist: apenas 1 ativa por vez
- [ ] Termo: duplo aceite retorna erro
- [ ] Testes passam
- [ ] Lint passa

---

# Fase 9 — Polimento

---

### P-9.1 — Revisão de Segurança (RLS Audit)

**Fase:** 9
**Módulo:** fundacao
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-9.1-security-audit`
- Dependências: P-8.12 concluído
- Env vars: `DATABASE_URL`

**Escopo:**
Auditoria completa de RLS em todos os schemas. Verificar: DENY-by-default em toda tabela. Cross-schema leaks (submissor não acessa financeiro). Impersonation não bypassa RLS. Conflitos de interesse enforced (diretor não cria reserva). Middleware gates alinhados com RLS. Revisão de signed URLs (expiração, escopo). Verificação de SQL injection em queries dinâmicas. **Decidir e documentar a postura de conexão das Server Actions** (superuser via `DATABASE_URL` vs. `authenticated` + JWT) — ver BRAIN.md §3 "Decisão técnica pendente"; se ficar com superuser, confirmar que TODA action de mutação passa pelo gate de RBAC (nenhuma exceção).

**Arquivos permitidos para criação/edição:**

- `apps/admin/src/__tests__/security-audit.test.ts`
- `packages/db/src/migrations/0020_rls_fixes.sql` (se necessário)

**Critérios de aceite:**

- [ ] Toda tabela com RLS habilitado e DENY-by-default verificado
- [ ] Nenhum cross-schema leak identificado
- [ ] Conflitos de interesse enforced em RLS (não apenas middleware)
- [ ] Signed URLs com expiração adequada
- [ ] Nenhuma query dinâmica vulnerável a SQL injection
- [ ] Testes de segurança passam
- [ ] Relatório de findings documentado

---

### P-9.2 — LGPD Audit

**Fase:** 9
**Módulo:** fundacao
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-9.2-lgpd-audit`
- Dependências: P-9.1 concluído
- Env vars: nenhuma

**Escopo:**
Implementar compliance LGPD. Tela "Meus Dados" em cada app: visualizar, exportar (JSON + CSV), solicitar exclusão. Consentimento granular no cadastro (newsletter, marketing, compartilhamento). Política de retenção configurável por tipo de dado. Log de acesso a dados pessoais. Revisão de todos os dados pessoais armazenados (CPF, documentos, fotos) para verificar criptografia e acesso adequado.

**Arquivos permitidos para criação/edição:**

- `packages/ui/src/components/my-data-page.tsx`
- `packages/auth/src/data-export.ts`
- `packages/auth/src/data-deletion.ts`
- `packages/db/src/schema/consent.ts`
- `packages/db/src/migrations/0021_lgpd.sql`

**Critérios de aceite:**

- [ ] "Meus Dados" acessível em cada app com visualização, export e solicitação de exclusão
- [ ] Consentimento granular no cadastro (opt-in, nunca opt-out)
- [ ] Export em JSON + CSV funcional
- [ ] Solicitação de exclusão gera ticket para super_admin
- [ ] Dados pessoais sensíveis (CPF, documentos) com acesso restrito verificado
- [ ] Log de acesso a dados pessoais implementado
- [ ] Lint passa
- [ ] Types passam

---

### P-9.3 — Performance e Otimização

**Fase:** 9
**Módulo:** fundacao
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-9.3-performance`
- Dependências: P-9.2 concluído
- Env vars: nenhuma

**Escopo:**
Otimização de performance em todos os apps. Verificar: bundle size (code splitting por rota). Queries N+1 (Drizzle). Indexes faltantes em queries frequentes. Cache headers (stale-while-revalidate). Image optimization (Next.js Image). Font loading (next/font preload). Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1. Lazy loading de componentes pesados (gráficos, editores).

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/0022_indexes.sql` (se necessário)
- Qualquer arquivo de página para lazy loading (limitado a imports)
- `turbo.json` (se ajuste de build necessário)

**Critérios de aceite:**

- [ ] Nenhuma query N+1 identificada
- [ ] Indexes criados para queries frequentes
- [ ] Bundle size por app < 500KB initial load
- [ ] Web Vitals dentro dos targets
- [ ] Imagens otimizadas via Next.js Image
- [ ] Componentes pesados com lazy loading
- [ ] Lint passa
- [ ] Types passam

---

### P-9.4 — Copy Review (Humanizar Textos)

**Fase:** 9
**Módulo:** fundacao
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-9.4-copy-review`
- Dependências: P-9.3 concluído
- Env vars: nenhuma

**Escopo:**
Revisão de toda a microcopy do ecossistema para eliminar "cara de IA". Verificar: botões, labels, mensagens de erro, estados vazios, tooltips, placeholders. Substituir frases genéricas por copy institucional. Verificar citações bíblicas nos estados vazios (pertinentes ao contexto). Revisar português: sem anglicismos desnecessários, tom institucional mas acessível. Evitar exclamações genéricas e frases como "vamos lá!".

**Arquivos permitidos para criação/edição:**

- Qualquer arquivo `.tsx` contendo texto visível ao usuário (componentes e páginas)
- `packages/ui/src/components/empty-state.tsx` (atualizar citações)

**Critérios de aceite:**

- [ ] Nenhuma frase genérica "cara de IA" encontrada
- [ ] Citações bíblicas nos estados vazios pertinentes ao contexto de cada módulo
- [ ] Tom institucional consistente em todos os apps
- [ ] Português correto, sem anglicismos desnecessários
- [ ] Sem exclamações genéricas ("Vamos lá!", "Incrível!", etc.)
- [ ] Lint passa
- [ ] Types passam

**Notas:**
Ref: BRAIN.md seção 5 (princípios visuais — fugir do "cara de IA"). Público em transição tecnológica — clareza > criatividade.

---

### P-9.5 — Deploy Final

**Fase:** 9
**Módulo:** fundacao
**Tipo:** config
**Pré-condições:**

- Branch: `main` (merge de todas as features)
- Dependências: P-9.4 concluído
- Env vars: todas as env vars de produção configuradas na Vercel

**Escopo:**
Configurar deploy de produção. Vercel: 9 projetos separados (1 por app) com domínios customizados. DNS Cloudflare: subdomínios apontando para Vercel. Supabase: migration de produção aplicada. GitHub Actions: pipeline CI/CD (lint, typecheck, test em PR; deploy automático em merge na main). Sentry: DSN configurado em cada app. Monitoring: Better Stack com 9 monitores (1 por subdomínio). Seed de dados iniciais (2 super_admins, papéis, workspaces de tarefas, plano de contas padrão).

**Arquivos permitidos para criação/edição:**

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `apps/*/vercel.json` (se necessário)
- `packages/db/src/seed.ts`

**Critérios de aceite:**

- [ ] 9 apps deployados com subdomínios corretos
- [ ] SSO funcional entre todos os subdomínios
- [ ] CI/CD: lint + typecheck + test em PRs; deploy em merge
- [ ] Sentry capturando erros em todos os apps
- [ ] Better Stack monitorando uptime de todos os subdomínios
- [ ] Seed: 2 super_admins, 8 papéis, 6 workspaces, plano de contas padrão, 2 unidades de flat
- [ ] Migration de produção aplicada sem erros
- [ ] Todos os testes passam
- [ ] Lint passa
- [ ] Types passam

---

## Legenda

| Tipo          | Descrição                                              |
| ------------- | ------------------------------------------------------ |
| `config`      | Setup de infraestrutura, tooling, CI/CD                |
| `schema`      | Definição de tipos, schemas de banco, migrations       |
| `ui`          | Componentes e telas (nunca toca no banco — usa mocks)  |
| `integration` | Conecta UI ao backend, substitui mocks por dados reais |

| Convenção | Regra                                           |
| --------- | ----------------------------------------------- |
| Bloco A   | P-X.1 a P-X.5 — UI com dados mockados           |
| Pausa     | Validar telas com diretoria antes de prosseguir |
| Bloco B   | P-X.6 a P-X.12 — Backend + integração + testes  |
| Branch    | `feat/P-X.Y-nome-curto`                         |
| 1 sessão  | 1 prompt. Nunca misturar prompts.               |
| BRAIN.md  | Carregado em toda sessão como contexto fixo     |

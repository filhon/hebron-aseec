# PROMPTS.md — Sequência de Desenvolvimento SDD

> **Referência:** BRAIN.md (fonte da verdade) | SDD-STRUCTURE.md (formato)
> **Total:** 119 prompts + 19 correções (ver tabela "Correções" abaixo) | Fases 0-9
> **Metodologia:** Bloco A (UI com mocks) → Pausa (validar com diretoria) → Bloco B (Backend + integração)
> **⚠️ Antes de tudo:** ler a seção **Instruções Globais** (logo abaixo do Sumário). Prompts corretivos `P-0.2b` (design system), `P-0.3b` (migrations), `P-1.12b` (Admin) e `P-2.9b` (usuário real no header de Projetos) devem ser executados na ordem indicada; as demais correções (Ondas 0–2, ver tabela) são as executadas na retomada pós-auditoria de 2026-07.

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

### Correções (S1-26 — cabeçalho antigo dizia "3 correções"; eram 4; hoje são 19)

Corpo integral no próprio arquivo (as 4 originais) ou em `AUDIT/04-prompts-pendentes.md` §4 (as 15 da auditoria de 2026-07 — convenção registrada em cada sessão de SESSIONS.md a partir de S-54; transcrever o texto para dentro deste arquivo é trabalho mecânico à parte, não feito em P-0.16 para não misturar prompts na mesma sessão).

| Corretivo | Motivo                                                      | Corpo do prompt                  | Sessão |
| --------- | ----------------------------------------------------------- | -------------------------------- | ------ |
| P-0.2b    | Unificação do design system (tokens `--hb-*`)               | neste arquivo                    | S-20   |
| P-0.3b    | Pipeline de migrations                                      | neste arquivo                    | S-22   |
| P-1.12b   | Reconciliação do Admin ao design system unificado           | neste arquivo                    | S-22b¹ |
| P-2.9b    | Usuário real no header de Projetos                          | neste arquivo                    | S-44   |
| P-0.7     | Resgate do banco (partições, enum de audit, 0000 duplicada) | AUDIT/04-prompts-pendentes.md §4 | S-54   |
| P-0.8     | Kit de backend compartilhado (sessão/audit/notificações)    | AUDIT/04-prompts-pendentes.md §4 | S-55   |
| P-0.9     | CI mínimo                                                   | AUDIT/04-prompts-pendentes.md §4 | S-56   |
| P-0.10    | Decisão B: RLS ativa (grants + policies + adoção)           | AUDIT/04-prompts-pendentes.md §4 | S-57   |
| P-0.11    | drizzle-kit reconciliado                                    | AUDIT/04-prompts-pendentes.md §4 | S-58   |
| P-1.25    | Admin: leitura protegida e fiação completa                  | AUDIT/04-prompts-pendentes.md §4 | S-59   |
| P-1.26    | Onboarding: convite, auto-signup e MFA bloqueante           | AUDIT/04-prompts-pendentes.md §4 | S-60   |
| P-1.27    | Documentos: visibilidade e área editorial verdadeiras       | AUDIT/04-prompts-pendentes.md §4 | S-61   |
| P-2.9c    | Projetos: operável de ponta a ponta                         | AUDIT/04-prompts-pendentes.md §4 | S-62   |
| P-3.8b    | Financeiro: governança e conciliação verdadeiras            | AUDIT/04-prompts-pendentes.md §4 | S-63   |
| P-0.12    | Storage: buckets e policies                                 | AUDIT/04-prompts-pendentes.md §4 | S-64   |
| P-0.13    | LGPD: fundação                                              | AUDIT/04-prompts-pendentes.md §4 | S-65   |
| P-0.14    | Jobs: Inngest de verdade                                    | AUDIT/04-prompts-pendentes.md §4 | S-66   |
| P-0.15    | packages/integrations + contrato de settings                | AUDIT/04-prompts-pendentes.md §4 | S-67   |
| P-0.16    | Registro retroativo (este próprio corretivo)                | AUDIT/04-prompts-pendentes.md §4 | S-68   |

¹ Sessão referenciada retroativamente como S-22b em SESSIONS.md S-68 (ponto 2 da entrada retificadora) — o bloco original nunca recebeu número.

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

## G5. Layouts nos prompts de integração (P-X.9)

Todo prompt de integração **P-X.9** de qualquer módulo **deve incluir os arquivos de layout do módulo** (`(grupo)/layout.tsx`) na lista de arquivos permitidos, para:

1. Converter o layout de `"use client"` para Server Component.
2. Substituir `MOCK_USER` hardcoded por dados reais via `getAuthUser()`.
3. Criar o componente `(grupo)/shell.tsx` Client Component correspondente (mantém `usePathname` e recebe `user` como prop).
4. Conectar `logoutAction` ao `onLogout` do `AppShell`.

**Padrão obrigatório (Server/Client split):**

```
(grupo)/layout.tsx   → Server Component: chama getAuthUser(), redireciona se null,
                       VERIFICA O PAPEL exigido pelo grupo (ex.: (diretoria) exige
                       diretor|conselheiro|super_admin; (admin) exige super_admin;
                       área editorial exige editor|super_admin) e redireciona/403 se
                       o papel não bate. Autenticar ≠ autorizar — o gate de papel no
                       layout é a camada 1 do BRAIN §3.
(grupo)/shell.tsx    → "use client": recebe user como prop, usa usePathname, renderiza AppShell
actions/auth.ts      → logoutAction: signOut + redirect(CANONICAL_LOGIN_URL)
```

> **Origem:** lacuna identificada em P-2.9b (registrada em SESSIONS.md). Aplica-se a partir de P-3.9 (Financeiro) em diante.

Além dos arquivos de layout, TODO P-X.9 deve listar entre os arquivos permitidos os componentes e formulários do Bloco A do módulo (P-X.2 e P-X.4). A integração usa e conecta esses componentes — NÃO reescreve as telas inline. Critério padrão de todo P-X.9: "nenhum componente/formulário do Bloco A permanece sem import (verificar por grep)". Origem: padrão PD-2 da auditoria (26+ componentes órfãos nas fases 1–3).

## G6. Kit de backend: use os packages, nunca copie

Vale para todo prompt de Bloco B (P-X.6 a P-X.12). Origem: achados F3-02/F3-03/F3-08
da auditoria — cópias locais de sessão/audit produziram 3 apps com actions que negam
qualquer usuário e 2 módulos com auditoria permanentemente vazia.

1. **Sessão/gates:** toda Server Action usa o action-client de `@hebron/auth`
   (`createSupabaseServerActionClient` / factory de safe-action do package — P-0.8).
   PROIBIDO criar `safe-action.ts` local com `createClient(url, anonKey, ...cookie...)`.
2. **Conexão de dados:** leituras e escritas rodam como `authenticated` (decisão B,
   P-0.10) — o client da sessão, não `DATABASE_URL` superuser. RLS é camada ativa.
3. **Auditoria:** usar o `logAudit` de package (P-0.8). Em módulos de governança
   (financeiro, votação, aprovações), falha de audit ABORTA a operação. Todo P-X.6
   que crie ações auditáveis DEVE incluir `ALTER TYPE admin.audit_action ADD VALUE
IF NOT EXISTS` para os valores novos do módulo — sem isso a auditoria falha em
   runtime (achado F3-02).
4. **Migrations:** geradas com `drizzle-kit generate` (P-0.11). NÃO citar/criar número
   de migration manualmente; o nome é o que o kit gerar. O runner aplica em ordem.
5. **Cross-app:** lógica consumida por outro app vive em `packages/integrations`
   (P-0.15). App NUNCA importa de outro app.
6. **Jobs:** cron/agendamento via `packages/jobs` (Inngest, P-0.14). Registrar o job
   no catálogo do package; nunca "fica para depois" sem registro.
7. **Critérios de integração (P-X.9):** cada fluxo de mutação do módulo deve ter
   critério próprio "ação X executável a partir da tela Y" — "substituir mocks" não
   é critério suficiente (padrão PD-1).

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
- [x] Wizard recebe edital_id e pré-preenche tipo + categoria (wiring completo em P-2.9c, S-62; ver SESSIONS S-68 ponto 6)
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

- [x] Skeletons específicos por tela
- [x] Estado vazio conciliação: "Todas as transações estão conciliadas"
- [x] Estado vazio importação: "Importe seu primeiro extrato bancário"
- [x] Lint passa
- [x] Types passam

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

- [x] transactions: sem UPDATE ou DELETE via constraint (imutável)
- [x] transaction_reversals: FK para transaction original, justificativa obrigatória
- [x] payables: status enum (pendente, aprovado, autorizado, pago, cancelado)
- [x] cost_centers: FK para projetos.projects (cross-schema)
- [x] categories: parent_id (árvore), com defaults sugeridos
- [x] bank_imports: file_url, format (ofx/csv), imported_at
- [x] bank_import_rows: data parseada (data, valor, descrição, match_transaction_id)
- [x] batch_approvals: week_start, week_end, approved_by, approved_at
- [x] Migration aplica sem erros
- [x] Types passam

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

- [x] Super_admin: full CRUD em financeiro.\*
- [x] Diretor gestor: SELECT + UPDATE em batch_approvals (aprovar)
- [x] Colaborador financeiro: CRUD em transações, payables, receivables
- [x] Submissor: SELECT em payment_schedules de projetos da própria instituição
- [x] transactions: sem UPDATE/DELETE para ninguém (constraint + RLS)
- [x] Demais papéis: sem acesso ao schema financeiro
- [x] Types passam

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

- [x] Transação criada como imutável (INSERT only)
- [x] Estorno: cria reversal referenciando original + nova transação corretiva
- [x] Import OFX/CSV: parse, normaliza, apresenta para confirmação
- [x] Match automático: sugere correspondência por valor+data+descrição
- [x] Lote semanal: agrupa payables da semana, envia email ao diretor gestor
- [x] Aprovação de lote: diretor gestor aprova; gera notificação para super_admin incluir no banco
- [x] OCR: extrai valor, CNPJ, data de imagem de NF e sugere categorização
- [x] Audit log em toda mutação
- [x] Lint passa
- [x] Types passam

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
Substituir mocks por dados reais e tornar o módulo OPERÁVEL. Converter páginas de "use client" + setTimeout para o padrão RSC + Suspense dos demais módulos (G5). Dashboard com saldos reais. Lançamentos com filtros server-side. Conciliação import → match → confirmar. Contas a pagar com o fluxo completo de governança (lote semanal → aprovação gestor → autorização → pago). Contas a receber. Fluxo de caixa projetado. Centros de custo.Relatórios. Formulários do Bloco A (P-3.4) conectados às actions reais — NÃO reescrever telas inline; os submits `console.log` viram submits reais. Leituras via client da sessão (G6.2).

**Arquivos permitidos para criação/edição:**

- `apps/financeiro/src/app/(dashboard)/layout.tsx` (G5: Server Component + gate de papel colaborador+)
- `apps/financeiro/src/app/(dashboard)/shell.tsx` (G5)
- `apps/financeiro/src/actions/auth.ts` (G5: logoutAction)
- `apps/financeiro/src/app/(dashboard)/page.tsx`
- `apps/financeiro/src/app/(dashboard)/lancamentos/page.tsx`
- `apps/financeiro/src/app/(dashboard)/conciliacao/page.tsx`
- `apps/financeiro/src/app/(dashboard)/orcamento/page.tsx`
- `apps/financeiro/src/app/(dashboard)/importacao/page.tsx`
- `apps/financeiro/src/app/(dashboard)/plano-contas/page.tsx`
- `apps/financeiro/src/app/(dashboard)/contas-pagar/page.tsx`
- `apps/financeiro/src/app/(dashboard)/contas-receber/page.tsx` (nova — decisão F1-Q9)
- `apps/financeiro/src/app/(dashboard)/fluxo-caixa/page.tsx` (nova — decisão F1-Q9)
- `apps/financeiro/src/app/(dashboard)/centros-custo/page.tsx` (existente fora de fluxo — integrar)
- `apps/financeiro/src/app/(dashboard)/relatorios/page.tsx` (existente fora de fluxo — integrar)
- `apps/financeiro/src/components/*.tsx` (conectar forms/tabelas do Bloco A; sem componente novo)
- `apps/financeiro/src/lib/queries.ts` (novo, padrão dos demais módulos)
- `apps/financeiro/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [x] Layout G5: anônimo → redirect login; papel sem acesso ao financeiro → bloqueado (teste)
- [x] Saldos reais por conta bancária no dashboard
- [~] Transações com filtros (client-side sobre dado real, não server-side — ver S-69, débito aceito: volume baixo, reescrever para paginação/query params seria reescrever a tela)
- [x] Lançamento de despesa e de receita CRIÁVEIS pelas telas (expense-form/revenue-form com submit real)
- [x] Estorno executável a partir da tela de lançamentos (reversal-form conectado)
- [x] Conciliação operável de ponta a ponta na tela: upload → preview → confirmar (import re-parseado — P-3.8b)
- [x] Contas a pagar: criar lote semanal, aprovar (gestor), autorizar (autorizador), marcar pago — cada passo executável pela tela por quem tem a designation (batch-approval-form conectado)
- [x] Contas a receber: listar e registrar recebimento
- [x] Fluxo de caixa projetado com dados reais
- [x] Orçamento: planejado vs executado real por centro de custo (budget-form conectado)
- [x] Plano de contas: CRUD de categorias operável
- [x] Nenhum componente/formulário do Bloco A (P-3.2/P-3.4) sem import (grep)
- [x] Nenhum submit `console.log`/`setTimeout` restante no app (grep)
- [x] Mock data removido
- [x] Lint passa · Types passam

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
Notificações: lote semanal para aprovação — email ao diretor com designation GESTOR do financeiro, CC ao diretor com designation AUTORIZADOR (resolver destinatários por public.designations, nunca por papel genérico). Lote aprovado (in_app ao super_admin). Pagamento pago (in_app). Vencimento próximo (3 dias antes — cron em packages/jobs). Orçamento >80% executado (in_app + email ao super_admin). Relatório mensal automático por email a diretores conselheiros (cron mensal em packages/jobs; PDF via @react-pdf/renderer + XLSX via exceljs). Export manual: action exportMonthlyReport que gera PDF+XLSX+ZIP contendo os recibos do mês (arquivos do bucket financeiro-recibos), acionável pelo super_admin na tela de relatórios.

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/batch-approval.tsx`
- `packages/email/src/templates/monthly-financial-report.tsx`
- `packages/email/src/templates/budget-alert.tsx`
- `apps/financeiro/src/lib/notifications.ts`
- `apps/financeiro/src/actions/reports.ts` (exportMonthlyReport — PDF+XLSX+ZIP)
- `packages/jobs/src/crons/financeiro.ts` (lote semanal, vencimentos, relatório mensal)

**Critérios de aceite:**

- [x] Lote semanal: email SOMENTE ao diretor gestor (designation), CC autorizador — diretor sem designation não recebe (fallback só ativa se nenhuma designation "gestor" existir; herdado de P-3.9, agora também via cron — ver S-70)
- [x] Alerta de orçamento >80%: email ao super_admin (`checkBudgetAlert`, disparado em tempo real por `markPayableAsPaid`/`createManualTransaction` — não por cron, ver S-70)
- [x] Relatório mensal automático: PDF+XLSX com totais por categoria, por cron mensal registrado (`financeiro-relatorio-mensal`)
- [x] Export manual: super_admin baixa ZIP com PDF+XLSX+recibos do mês pela tela de relatórios (`exportMonthlyReport`)
- [x] Vencimento próximo: in_app 3 dias antes, por cron registrado (`financeiro-vencimento-proximo`, payables e receivables)
- [x] Falha de auditoria em qualquer action nova aborta a operação (G6.3) — `exportMonthlyReport` usa `logFinanceiroAudit` (criticidade "critical")
- [x] Lint passa · Types passam

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
Conectar integrações reais via packages/integrations (P-0.15 — nada de import app→app). Projetos → Financeiro: aprovação cria centro de custo + payables (substituir stub). Financeiro → Projetos: executado vs orçado em tempo real (query cross-schema no package). Orçamento por instituição: checkBudget de Projetos consome financeiro.organization_budgets (P-3.8b) — remover definitivamente o workaround admin.system_settings (S-40) e registrar PATCH. Bloqueio por inadimplência de relatório (BRAIN §6.2): payable de projeto com relatório vencido entra em estado `bloqueado`; payable bloqueado não entra em lote semanal; action de override auditada, exclusiva de super_admin, com justificativa obrigatória. A detecção de vencimento é um cron em packages/jobs. Preparar stub: Flats → Financeiro (ajuda de custo).

**Arquivos permitidos para criação/edição:**

- `packages/integrations/src/financeiro.ts` (funções expostas pelo financeiro)
- `packages/integrations/src/projetos.ts` (atualizar: checkBudget → organization_budgets)
- `apps/financeiro/src/actions/payables.ts` (estado bloqueado + overrideBlock auditada)
- `packages/jobs/src/crons/projetos-inadimplencia.ts` (detecção de relatório vencido)
- `apps/projetos/src/lib/integrations/*` (apenas remoção/redirecionamento para o package)

**Critérios de aceite:**

- [x] Aprovação de projeto cria centro de custo e payables reais
- [x] Payables de projeto nascem NÃO aprovados
- [x] Executado vs orçado em tempo real (teste cross-schema)
- [x] Submissão de projeto bloqueada quando total aprovado excede organization_budgets do ano (teste)
- [x] Workaround system_settings removido; PATCH registrado
- [x] Relatório vencido → payables do projeto ficam `bloqueado` e não entram em lote (teste)
- [x] Override: só super_admin, exige justificativa, gera audit (teste)
- [x] Zero imports app→app (verificação do CI)
- [x] Stub Flats → Financeiro documentado no package
- [x] Lint passa · Types passam

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
Testes de integração. RLS (super_admin full, diretor gestor aprova, submissor vê só pagamentos próprios). Imutabilidade de transações (UPDATE/DELETE proibido). Estorno (cria reversal + nova transação). Import OFX/CSV (parse correto). Match automático (encontra correspondência). Governança (aprovação → autorização → pago). Integração Projetos → Financeiro (aprovação cria payables). Adicionar script `test` ao package.json do app (hoje inexistente — F3-10).

**Arquivos permitidos para criação/edição:**

- `apps/financeiro/src/__tests__/rls.test.ts`
- `apps/financeiro/src/__tests__/transactions.test.ts`
- `apps/financeiro/src/__tests__/conciliation.test.ts`
- `apps/financeiro/src/__tests__/governance.test.ts`

**Critérios de aceite:**

- [x] Transação: UPDATE/DELETE retorna erro
- [x] Estorno: cria reversal corretamente
- [x] Import OFX: parse correto dos campos
- [x] Match: encontra correspondência por valor+data
- [x] Governança: fluxo aprovação → autorização → pago funciona
- [x] RLS: submissor não vê transações de outros projetos
- [x] Designation: diretor sem designation gestor não aprova lote (teste)
- [x] Audit: falha simulada de gravação aborta a mutação (teste — G6.3)
- [x] Import: linhas adulteradas entre preview e confirmação não persistem (teste — F3-11/P-3.8b)
- [x] organization_budgets: submissão acima do teto é bloqueada (teste — S1-01)
- [x] Inadimplência: payable bloqueado não entra em lote; override auditado (teste — P-3.11)
- [x] Testes passam
- [x] Lint passa

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

- [x] 6 workspaces fixos como enum
- [x] Task com: título, descrição, prioridade (baixa/média/alta/urgente), status (a fazer/em progresso/em revisão/concluído), workspace, due_date, recurrence_rule
- [x] RecurrenceRule: tipo (diária/semanal/mensal/anual), intervalo, dia_da_semana, dia_do_mes
- [x] TaskTemplate: nome, tasks pré-definidas, trigger (evento de outro módulo)
- [x] ApprovalRequest: task_id, approver_id (diretor), status
- [x] Mock data: 30+ tarefas, 5+ recorrentes, 3+ templates
- [x] Lint passa
- [x] Types passam

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

- [x] KanbanBoard com drag-drop entre colunas (a fazer → em progresso → concluído)
- [x] TreeView estilo Xmind: pessoa → tarefas (para despacho do diretor gestor)
- [x] TaskCard com badge de prioridade, avatar do assignee, barra de subtarefas
- [x] FocusMode: lista de tarefas do dia + pomodoro (25min trabalho, 5min pausa)
- [x] CommandMenu (Cmd+K) com busca e criação rápida
- [x] TimeTracker com start/stop e total acumulado
- [x] 3 views coexistentes: Kanban, Lista, Árvore (toggle no header)
- [x] Responsivo
- [x] Lint passa
- [x] Types passam

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
Páginas: "Minhas tarefas" (lista priorizada). Board por workspace (kanban + lista + árvore como toggle). Detalhe da tarefa (descrição rich, anexos, subtarefas, comentários, time entries, log). Calendário de prazos. Tarefas recorrentes (configuração). Templates. Modo foco. (Sem tela de configuração de workspace: workspaces e colunas são fixos — BRAIN §6.9 e decisão D-5 da auditoria. As colunas do kanban são os 4 status do enum de P-4.1.).

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

- [x] "Minhas tarefas" com filtros: workspace, prioridade, status, assignee
- [x] Board com toggle Kanban/Lista/Árvore
- [x] Detalhe: sidebar com metadados, corpo com descrição + comentários
- [x] Calendário: visualização mensal/semanal com tarefas por data
- [x] Recorrentes: lista de regras com preview da próxima execução
- [x] Modo foco: página limpa com tarefas do dia + pomodoro
- [x] Templates: lista editável com preview
- [x] Responsivo
- [x] Lint passa
- [x] Types passam

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
Formulários: criar/editar tarefa (título, descrição com o editor rich text COMPARTILHADO de packages/ui — decisão D-1; não criar editor próprio do app, workspace, assignee, prioridade, due_date, tags, anexos). Criar subtarefa. Comentário com @menções (autocomplete de usuários). Configurar recorrência (tipo, intervalo, dia). Criar template (nome, lista de tarefas pré-definidas). Pedido de aprovação (selecionar diretor). Time entry manual.

**Arquivos permitidos para criação/edição:**

- `apps/tarefas/src/components/task-form.tsx`
- `apps/tarefas/src/components/subtask-form.tsx`
- `apps/tarefas/src/components/comment-form.tsx`
- `apps/tarefas/src/components/recurrence-form.tsx`
- `apps/tarefas/src/components/template-form.tsx`
- `apps/tarefas/src/components/approval-request-form.tsx`

**Critérios de aceite:**

- [x] Task form com editor rich text para descrição
- [x] @menções com autocomplete de usuários do workspace
- [~] Recurrence form com preview visual (ex: "Toda segunda-feira às 9h") — preview sem horário de dia; `RecurrenceRule` não tem esse campo (ver S-76)
- [x] Template form com lista de tarefas editável (drag-drop para reordenar)
- [x] Validação Zod em todos os formulários
- [x] Lint passa
- [x] Types passam

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

- [x] Skeletons por view (kanban, lista, árvore, calendário)
- [x] Modo foco vazio: "Nenhuma tarefa para hoje. Bom descanso!"
- [x] Workspace vazio: mensagem contextual + CTA criar tarefa
- [x] Lint passa
- [x] Types passam

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
Criar tabelas Drizzle no schema `tarefas`: workspaces (6 FIXOS, seed na migration — sem workspaces custom na v1, BRAIN §6.9), tasks, subtasks, assignees, comments, attachments, time_entries, tags, task_tags, recurrence_rules, task_templates, template_items, approval_requests, task_events (log de mudanças do módulo).

Modelo de acesso (decisão registrada — não deixar ao executor): NÃO existe membership por workspace. Todos os papéis internos (colaborador, diretor, conselheiro, super_admin) enxergam os 6 workspaces; a granularidade de escrita é por tarefa (creator/assignee) — ver P-4.7.

Auditoria central: aprovações de diretor (approval_requests) são mutação crítica → incluir `ALTER TYPE admin.audit_action ADD VALUE IF NOT EXISTS` para os valores do módulo (task.approval_requested, task.approved, task.rejected — G6.3). O log operacional do dia a dia fica em task_events.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/tarefas.ts`
- migration gerada via drizzle-kit generate (nome automático — G6.4)

**Critérios de aceite:**

- [x] 6 workspaces fixos seed na migration; nenhuma rota de criação de workspace existe
- [x] tasks: title, description, workspace_id, status, priority, due_date, created_by, source (manual/auto), source_ref
- [x] subtasks: task_id, title, completed
- [x] recurrence_rules: task_template_id, type, interval, day_of_week, day_of_month, next_run_at
- [x] approval_requests: task_id, approver_id, status (pendente/aprovado/rejeitado)
- [x] time_entries: task_id, user_id, started_at, ended_at, duration_minutes
- [x] task_events: task_id, actor_id, event_type, diff (jsonb)
- [x] Enum admin.audit_action recebe os valores de aprovação do módulo (ALTER TYPE na migration)
- [x] drizzle-kit check limpo após a migration
- [x] Migration aplica sem erros
- [x] Types passam

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
RLS para schema tarefas (semântica fechada — sem membership por workspace, ver P-4.6):

- Super_admin: full access.
- Colaborador: SELECT em todas as tarefas dos 6 workspaces (transparência interna — necessário para kanban/lista do workspace); INSERT em qualquer workspace; UPDATE/soft-DELETE apenas em tarefas que criou ou nas quais é assignee.
- Diretor/conselheiro: SELECT em tudo (TreeView de despacho); UPDATE apenas em approval_requests endereçados a si; NÃO recebem tarefas operacionais (BRAIN §6.9) — sem INSERT de task própria atribuída a diretor.
- Comentários/anexos/time_entries: seguem a visibilidade da tarefa; escrita do próprio autor.
- Demais papéis (submissor, aluno, hospede, ouvinte): sem acesso ao schema.

**Arquivos permitidos para criação/edição:**

- arquivo SQL de policies com nome sequencial posterior à migration do kit (G6.4)

**Critérios de aceite:**

- [x] Super_admin: full CRUD
- [x] Colaborador: SELECT em qualquer tarefa; UPDATE/DELETE só como creator/assignee (teste com 2 usuários)
- [x] Colaborador: INSERT em qualquer um dos 6 workspaces
- [x] Diretor: SELECT em todas; UPDATE apenas em approval_requests endereçados a si (teste)
- [x] Submissor: zero acesso ao schema (teste)
- [x] Comentários seguem a visibilidade da tarefa
- [x] Policies com USING e WITH CHECK separados, deny-by-default
- [x] Types passam

---

### P-4.8 — Server Actions Tarefas

**Fase:** 4
**Módulo:** tarefas
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-4.8-tarefas-actions`
- Dependências: P-4.7 concluído
- Env vars: `DATABASE_URL` (migrations), `SUPABASE_URL`, `SUPABASE_ANON_KEY` (actions rodam como authenticated via kit de @hebron/auth — G6.1/G6.2)

**Escopo:**
Server Actions: CRUD de tarefas. Mover entre colunas (drag-drop). Criar/completar subtarefas (progresso agregado). Comentários com @menções. Upload de anexos. Time tracking (start/stop/manual). Recorrência: criar/editar regra; a geração da próxima tarefa é um cron registrado em packages/jobs (P-0.14) que lê next_run_at. Templates (instanciar). Approval requests (enviar/aprovar/rejeitar — mutação crítica: audit central com abort em falha, G6.3). Tarefas automáticas de outros módulos: implementar createAutoTask em packages/integrations/src/tarefas.ts (P-0.15) — NÃO em lib do app (apps não importam apps).

**Arquivos permitidos para criação/edição:**

- `apps/tarefas/src/actions/tasks.ts`
- `apps/tarefas/src/actions/comments.ts`
- `apps/tarefas/src/actions/time-tracking.ts`
- `apps/tarefas/src/actions/recurrence.ts`
- `apps/tarefas/src/actions/templates.ts`
- `apps/tarefas/src/actions/approvals.ts`
- `packages/integrations/src/tarefas.ts` (createAutoTask)
- `packages/jobs/src/crons/tarefas.ts` (recorrência)

**Critérios de aceite:**

- [x] CRUD de tarefas com task_events; aprovações com audit central (admin.audit_log) que aborta a operação em falha (teste)
- [x] Mover tarefa entre colunas atualiza status
- [~] Subtarefas: progresso agregado (3/5 = 60%) — create/toggle implementados; agregação é valor derivado em leitura (`queries.ts`/RSC), fora do escopo de Server Actions deste prompt — ver P-4.9
- [x] Comentários com @menções geram notificação ao mencionado
- [x] Time tracking: start/stop com cálculo de duração
- [x] Recorrência: cron registrado em packages/jobs cria a tarefa na next_run_at (executado em dev com relógio simulado ou trigger manual — evidência no PR)
- [x] Template: instanciar cria todas as tarefas filhas
- [x] Approval: enviar notificação ao diretor; aprovar/rejeitar atualiza status
- [x] Todas as actions usam o action-client de @hebron/auth (grep: zero createClient manual)
- [x] createAutoTask exportada de packages/integrations com tarefa nascendo SEM assignee
- [x] Lint passa
- [x] Types passam

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

- `apps/tarefas/src/app/(dashboard)/layout.tsx` (G5: RSC + gate de papel interno colaborador+)
- `apps/tarefas/src/app/(dashboard)/shell.tsx` (G5)
- `apps/tarefas/src/actions/auth.ts` (G5: logoutAction)
- `apps/tarefas/src/app/(dashboard)/page.tsx`
- `apps/tarefas/src/app/(dashboard)/workspace/[slug]/page.tsx`
- `apps/tarefas/src/app/(dashboard)/tarefa/[id]/page.tsx`
- `apps/tarefas/src/app/(dashboard)/foco/page.tsx`
- `apps/tarefas/src/app/(dashboard)/calendario/page.tsx`
- `apps/tarefas/src/app/(dashboard)/recorrentes/page.tsx`
- `apps/tarefas/src/app/(dashboard)/templates/page.tsx`
- `apps/tarefas/src/components/*` (conectar componentes/forms do Bloco A — sem novo)
- `apps/tarefas/src/lib/queries.ts`
- `apps/tarefas/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [x] Layout G5: anônimo → redirect; papel externo (submissor/hospede) → bloqueado (teste)
- [x] Kanban: drag-drop chama moveTask, persiste e sobrevive a reload (não console.log — F2-P2)
- [x] Criar tarefa executável de: task-form, Cmd+K e CTA de workspace vazio
- [x] Editar/concluir tarefa executável do detalhe; subtarefa criável e completável com progresso
- [x] Comentário com @menção publicável pela tela e notifica o mencionado
- [x] Time tracking: start/stop operável no detalhe
- [x] Recorrência: regra criável pela tela de recorrentes com preview
- [x] Template: instanciável pela tela de templates
- [x] Pedido de aprovação enviável pela tela; diretor aprova/rejeita pela própria UI
- [x] TreeView com dados reais (pessoa → tarefas)
- [x] Modo foco com tarefas do dia reais
- [x] Nenhum componente/formulário do Bloco A (P-4.2/P-4.4) sem import (grep)
- [x] Mock data removido
- [x] Lint passa · Types passam

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
Notificações: tarefa atribuída (in_app + email). @menção em comentário (in_app). Prazo próximo (1 dia antes) e prazo vencido: detectados por cron diário registrado em packages/jobs (P-0.14) — adicionar packages/jobs/src/crons/tarefas-prazos.ts aos arquivos permitidos. Pedido de aprovação (in_app + email ao diretor). Aprovação/rejeição (in_app ao solicitante).

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/task-assigned.tsx`
- `packages/email/src/templates/task-overdue.tsx`
- `packages/email/src/templates/approval-request.tsx`
- `apps/tarefas/src/lib/notifications.ts`
- `packages/jobs/src/crons/tarefas-prazos.ts`

**Critérios de aceite:**

- [x] Atribuição: in_app + email ao assignee
- [x] @menção: in_app ao mencionado
- [x] Prazo: 1 dia antes (in_app); vencido (in_app + email)
- [x] Aprovação: in_app + email ao diretor
- [x] Lint passa
- [x] Types passam

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
Conectar integrações via packages/integrations (createAutoTask já criada em P-4.8/P-0.15). Projetos → Tarefas: submissão cria checklist de análise (substituir o stub de apps/projetos/src/lib/integrations/tarefas.ts por chamada real ao package). Flats → Tarefas: stub documentado no package (fase 7). Intranet → Tarefas: stub documentado no package (fase 5). Erros: criação de checklist na submissão é integração de leitura? NÃO — é mutação decorrente de fluxo crítico: falha deve ser logada estruturadamente e sinalizada, não engolida (padrão S1-22/P-0.15).

**Arquivos permitidos para criação/edição:**

- `packages/integrations/src/tarefas.ts` (createAutoTask — consolidar)
- `packages/integrations/src/projetos.ts` (chamada real na submissão)
- `packages/integrations/src/flats.ts` (stub documentado)
- `packages/integrations/src/intranet.ts` (stub documentado)
- `apps/projetos/src/actions/projects.ts` (apenas o ponto de chamada da integração)

**Critérios de aceite:**

- [x] `createAutoTask(source, sourceRef, templateId)` exportada de packages/integrations; zero imports app→app (verificação do CI)
- [x] Submissão de projeto cria tarefas de análise (real)
- [x] Tarefas automáticas nascem SEM assignee (super_admin atribui depois)
- [x] Stubs documentados para Flats e Intranet
- [x] Falha na criação do checklist não é engolida: log estruturado + notificação a super_admin
- [x] Lint passa
- [x] Types passam

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

- [x] RLS: colaborador não vê tarefas de outro colaborador (a menos que esteja no mesmo workspace)
- [x] Recorrência: gera tarefa no próximo período
- [x] Template: instancia todas as sub-tarefas
- [x] Subtarefas: completar atualiza progresso do pai
- [x] Integração: submissão de projeto cria tarefas
- [x] Approval: fluxo enviar → aprovar/rejeitar → status, com audit central abortando em falha
- [x] RLS conforme semântica do patch P-4.7: colaborador lê tudo, escreve só creator/assignee
- [x] Testes passam
- [x] Lint passa

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

- [x] Announcement com prioridade e corpo rich text
- [x] DashboardWidget: tipo (kpi/chart/feed/calendar), posição, config (jsonb)
- [x] KPI: nome, valor, unidade, trend (up/down/stable), período
- [x] DirectoryMember: nome, foto, papel, email, telefone, bio
- [x] Mock KPIs: projetos ativos, alunos na Plataforma, doações do mês (= soma de despesas da categoria "Doações" do plano de contas — semântica da decisão F1-Q10), audiência da Rádio
- [x] Lint passa
- [x] Types passam

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

- [x] KPICard com valor formatado, seta de trend e sparkline
- [x] WidgetGrid com drag-drop para reorganizar widgets
- [x] AppLauncher com ícones e links para os 8 módulos
- [x] SearchGlobal com resultados agrupados por módulo
- [x] FeedWidget com últimas ações (novo projeto, pagamento, tarefa concluída)
- [x] Responsivo (widgets empilham no mobile)
- [x] Lint passa
- [x] Types passam

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

- [x] Dashboard com widgets configuráveis (cada usuário monta o seu)
- [x] Feed de anúncios com filtro de prioridade
- [x] Diretório completo com busca e filtro por papel
- [x] Calendário com eventos de reuniões e prazos
- [x] Reuniões: lista com atas e decisões vinculadas
- [x] Busca cross-app com resultados agrupados
- [x] Responsivo
- [x] Lint passa
- [x] Types passam

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
Formulários: criar anúncio (título, corpo com editor compartilhado de packages/ui — D-1, prioridade). Configurar dashboard (adicionar/remover/reordenar widgets). Registrar decisão de reunião (vinculada a meeting_session, com opção de gerar tarefa). Configurar briefing (opt-in, frequência). Perfil no diretório.

**Arquivos permitidos para criação/edição:**

- `apps/intranet/src/components/announcement-form.tsx`
- `apps/intranet/src/components/widget-config-form.tsx`
- `apps/intranet/src/components/meeting-decision-form.tsx`
- `apps/intranet/src/components/briefing-config-form.tsx`

**Critérios de aceite:**

- [x] Anúncio: título, corpo rich text, prioridade (normal/importante/urgente)
- [x] Widget config: drag-drop para adicionar/remover/reordenar
- [x] Decisão: texto, reunião vinculada, checkbox "criar tarefa"
- [x] Briefing: toggle opt-in + frequência (diário/semanal)
- [x] Lint passa
- [x] Types passam

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

- [x] Skeletons para cada widget no dashboard
- [x] Feed vazio: "Nenhum anúncio recente"
- [x] Diretório vazio: "Nenhum membro encontrado"
- [x] Lint passa
- [x] Types passam

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
Criar tabelas Drizzle no schema `intranet`: announcements, dashboard_configs (user_id, widgets jsonb), meeting_decisions (meeting_session_id, content, task_id), briefing_preferences (user_id, enabled, frequency), kpi_snapshots (cache de KPIs agregados — ESCRITO por cron horário registrado em packages/jobs (P-0.14); o dashboard LÊ o snapshot mais recente e cai para query live apenas se não houver snapshot < 2h. Registrar o cron em P-5.8).

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/intranet.ts`
- migration gerada via drizzle-kit generate (G6.4)

**Critérios de aceite:**

- [x] announcements: title, body, priority, author_id, published_at
- [x] dashboard_configs: user_id (unique), widgets (jsonb com posições)
- [x] meeting_decisions: meeting_session_id (FK admin.meeting_sessions), content, task_id (FK tarefas.tasks, nullable)
- [x] briefing_preferences: user_id, enabled, frequency (daily/weekly)
- [x] kpi_snapshots: metric_name, value, period, captured_at
- [x] kpi_snapshots com unique (metric_name, period) e captured_at
- [x] drizzle-kit check limpo
- [x] Migration aplica sem erros
- [x] Types passam

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

- migration gerada via `drizzle-kit generate` a partir de `packages/db/src/schema/<modulo>.ts` (nome automático do kit; NÃO criar arquivo SQL numerado à mão — ver G6.4)

**Critérios de aceite:**

- [x] Super_admin: full CRUD
- [x] Diretores/conselheiros: criar anúncios, ver decisões
- [x] Colaboradores: ver anúncios (não criar) — [ ] ver diretório: fora de escopo (schema `public`, não `intranet`; ver débito técnico em SESSIONS.md S-91)
- [x] dashboard_config: cada um gerencia apenas a própria
- [x] Submissores: sem acesso ao schema intranet
- [x] Types passam

---

### P-5.8 — Server Actions Intranet

**Fase:** 5
**Módulo:** intranet
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-5.8-intranet-actions`
- Dependências: P-5.7 concluído
- Env vars: `DATABASE_URL` (migrations), `SUPABASE_URL`, `SUPABASE_ANON_KEY` (G6.1/G6.2)

**Escopo:**
Server Actions: CRUD de anúncios (audit central). Salvar/carregar config de dashboard. Registrar decisão de reunião (criar tarefa via createAutoTask de packages/integrations). KPIs agregados via packages/integrations: projetos ativos (count de projects em stages ativos), alunos (count de enrollments — stub até fase 6), doações do mês (SUM de transactions tipo despesa da categoria "Doações" do plano de contas no mês corrente — decisão F1-Q10; a categoria é criada no seed/plano de contas), tarefas abertas (count). Snapshot de KPIs: cron horário em packages/jobs grava kpi_snapshots (P-5.6).

Busca global cross-app — CONTRATO (fechado nesta auditoria): a busca executa com o client da SESSÃO do usuário (authenticated); a RLS de cada schema filtra o que ele pode ver — nenhuma reimplementação de visibilidade na aplicação. Conjunto indexável v1: projetos.projects (título), documentos.documents (título — respeitando visibility), tarefas.tasks (título), admin meeting_sessions (título/data). Financeiro NÃO entra na busca global v1 (dados sensíveis; acessível só pelo app próprio). Resultados agrupados por módulo.

**Arquivos permitidos para criação/edição:**

- `apps/intranet/src/actions/announcements.ts`
- `apps/intranet/src/actions/dashboard.ts`
- `apps/intranet/src/actions/decisions.ts`
- `apps/intranet/src/actions/kpis.ts`
- `apps/intranet/src/actions/search.ts`

**Critérios de aceite:**

- [x] CRUD de anúncios com audit central
- [x] Dashboard config persiste por usuário
- [x] Decisão de reunião cria tarefa via packages/integrations (teste)
- [x] KPI doações: SUM de despesas da categoria "Doações" no mês (teste com fixture)
- [x] KPIs live + snapshot por cron registrado
- [x] Busca roda com o client da sessão; colaborador NÃO recebe resultado restricted de documentos que seu papel não vê (teste de RLS via busca)
- [x] Busca retorna resultados de Projetos, Documentos e Tarefas agrupados; Financeiro ausente
- [x] Zero createClient manual / zero SERVICE_ROLE em actions (grep)
- [x] Lint passa · Types passam

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

- `apps/intranet/src/app/(dashboard)/layout.tsx` (G5: gate de papel interno — submissor/hospede/aluno/ouvinte ficam fora)
- `apps/intranet/src/app/(dashboard)/shell.tsx` (G5)
- `apps/intranet/src/actions/auth.ts` (G5)
- `apps/intranet/src/app/(dashboard)/page.tsx`
- `apps/intranet/src/app/(dashboard)/anuncios/page.tsx`
- `apps/intranet/src/app/(dashboard)/diretorio/page.tsx`
- `apps/intranet/src/app/(dashboard)/calendario/page.tsx`
- `apps/intranet/src/app/(dashboard)/reunioes/page.tsx`
- `apps/intranet/src/app/(dashboard)/busca/page.tsx`
- `apps/intranet/src/components/*` (conectar componentes/forms do Bloco A)
- `apps/intranet/src/lib/queries.ts`
- `apps/intranet/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [x] Layout G5: papel externo não entra na intranet (teste)
- [x] KPIs com dados reais (snapshot + fallback)
- [x] Anúncio criável pela tela por diretor/conselheiro (announcement-form conectado); colaborador não vê o botão
- [x] Decisão de reunião registrável pela tela, com checkbox "criar tarefa" funcionando de ponta a ponta
- [x] Dashboard configurável: adicionar/remover/reordenar widget persiste (widget-config-form conectado)
- [x] Briefing: opt-in/frequência configurável pela tela (briefing-config-form conectado)
- [x] Diretório: nome, foto, papel e contato INSTITUCIONAL; telefone pessoal só com consentimento (P-0.13) — não despejar public.users inteiro
- [x] Calendário com meeting_sessions reais
- [x] Busca funcional respeitando RLS (contrato de P-5.8)
- [x] Nenhum componente/formulário do Bloco A (P-5.2/P-5.4) sem import (grep)
- [x] Mock data removido
- [x] Lint passa · Types passam

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
Notificações: anúncio urgente (in_app + email para todos os papéis internos — comunicação operacional, isenta de opt-in de marketing). Decisão de reunião (in_app para diretores). Briefing: cron em packages/jobs conforme briefing_preferences (diário/semanal), com resumo agregado (projetos, tarefas, financeiro) — só para quem fez opt-in. O relatório financeiro mensal NÃO é deste prompt: é o cron de P-3.10 (não duplicar template nem envio).

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/urgent-announcement.tsx`
- `packages/email/src/templates/briefing.tsx`
- `apps/intranet/src/lib/notifications.ts`
- `packages/jobs/src/crons/briefing.ts` (job vive no package de jobs)

**Critérios de aceite:**

- [x] Anúncio urgente: in_app + email imediato a todos os internos
- [x] Anúncio normal/importante: apenas in_app/feed (sem email em massa)
- [x] Briefing: cron registrado em packages/jobs respeitando enabled + frequency por usuário (teste)
- [x] Briefing: resumo com KPIs + últimos eventos
- [x] Nenhum envio de relatório financeiro neste módulo (grep monthly-financial)
- [x] Lint passa · Types passam

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
Conectar integrações reais via packages/integrations. Intranet → Tarefas: decisão de reunião cria tarefa via createAutoTask (substituir stub do package). Plataforma → Intranet e Rádio → Intranet: stubs documentados no package (fases 6 e 8). Feed: função agregadora no package (packages/integrations/src/feed.ts) que consulta os últimos eventos de Projetos, Financeiro e Tarefas COM o client da sessão (RLS filtra o que o usuário vê — mesmo contrato da busca de P-5.8).

**Arquivos permitidos para criação/edição:**

- `packages/integrations/src/tarefas.ts` (consumo: decisão → createAutoTask)
- `packages/integrations/src/plataforma.ts` (stub documentado)
- `packages/integrations/src/radio.ts` (stub documentado)
- `packages/integrations/src/feed.ts` (agregador)

**Critérios de aceite:**

- [x] Decisão de reunião cria tarefa via packages/integrations (teste end-to-end)
- [x] Feed agrega eventos reais dos 3 módulos e respeita RLS: colaborador sem acesso a financeiro não vê eventos financeiros no feed (teste)
- [x] Stubs para Plataforma e Rádio documentados
- [x] Zero imports app→app (verificação do CI)
- [x] Lint passa
- [x] Types passam

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

- [x] RLS: colaborador não cria anúncios; diretor sim
- [x] KPIs: queries cross-schema retornam contagens corretas
- [x] Busca: resultados de múltiplos módulos
- [x] Busca: usuário sem papel para ver documento restricted não o recebe via busca global (contrato P-5.8)
- [x] Testes passam
- [x] Lint passa

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
Tipos e schemas Zod: Course, Module, Lesson (tipo: video/text/quiz/download), Enrollment, Progress, Quiz, QuizAttempt, Certificate, Discussion, DiscussionPost, Instructor. Trilha sequencial (unlock). Mock data com curso piloto como referência. Semântica de quiz (decisão D-5): quiz é tipo de aula; a aula-quiz conclui com attempt >= passing_score; tentativas ilimitadas; certificado permanece 'concluir 100% da trilha' (BRAIN §6.3).

**Arquivos permitidos para criação/edição:**

- `packages/types/src/plataforma/index.ts`
- `packages/validators/src/plataforma/index.ts`
- `apps/plataforma/src/lib/mock-data.ts`

**Critérios de aceite:**

- [x] Lesson com tipo enum: video, text, quiz, download
- [x] Progress granular por aula (lesson_id, user_id, completed_at)
- [x] Trilha sequencial: next_lesson_id, requires_completion
- [x] Quiz: questions (jsonb), passing_score
- [x] Certificate: course_id, user_id, issued_at, hash (verificação)
- [x] Mock data: 3+ cursos, 10+ aulas, 2+ quizzes
- [x] Lint passa
- [x] Types passam

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
Componentes: CourseCard (capa, título, instrutor, progresso). LessonPlayer (video HLS + controls). LessonContent (rich text). QuizForm (múltipla escolha, dissertativa). ProgressBar (por curso e geral). CertificateCard. DiscussionThread (por aula). CourseSidebar (lista de módulos/aulas com status de progresso). NoteWidget (notas no minuto do vídeo). Nota: QuizForm é só múltipla escolha — dissertativa fora da v1 (ver PATCH-023).

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

- [x] LessonPlayer com video HLS (hls.js), controle de velocidade, marcadores
- [x] CourseSidebar com módulos/aulas e ícones de progresso (completo/em andamento/locked)
- [x] QuizForm com tipos: múltipla escolha (dissertativa fora da v1 — ver PATCH-023)
- [x] NoteWidget: criar nota em timestamp do vídeo, clicável para ir ao ponto
- [x] ProgressBar por curso e global (% de conclusão)
- [x] Responsivo
- [x] Lint passa
- [x] Types passam

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
Páginas do aluno: Catálogo de cursos (filtros: categoria, instrutor — "dificuldade" fora da v1, ver PATCH-024). Página do curso (descrição, ementa, instrutor, CTA matrícula). Player de aula (vídeo + sidebar de navegação). Quiz. "Minha jornada" (cursos em andamento, progresso). Certificados. Discussões. Páginas do instrutor/pedagógico: Dashboard com estatísticas. Editor de curso (drag-drop módulos/aulas). Editor de aula. Editor de quiz.

**Arquivos permitidos para criação/edição:**

- `apps/plataforma/src/app/(aluno)/layout.tsx`
- `apps/plataforma/src/app/(aluno)/page.tsx`
- `apps/plataforma/src/app/(aluno)/curso/[slug]/page.tsx`
- `apps/plataforma/src/app/(aluno)/curso/[slug]/aula/[id]/page.tsx`
- `apps/plataforma/src/app/(aluno)/jornada/page.tsx`
- `apps/plataforma/src/app/(aluno)/certificados/page.tsx`
- `apps/plataforma/src/app/(instrutor)/layout.tsx`
- `apps/plataforma/src/app/(instrutor)/page.tsx`
- `apps/plataforma/src/app/(instrutor)/curso/novo/page.tsx` (editor de curso)
- `apps/plataforma/src/app/(instrutor)/curso/[id]/page.tsx` (editor de curso: módulos/aulas drag-drop)
- `apps/plataforma/src/app/(instrutor)/curso/[id]/aula/[aulaId]/page.tsx` (editor de aula)
- `apps/plataforma/src/app/(instrutor)/curso/[id]/quiz/[quizId]/page.tsx` (editor de quiz)

**Critérios de aceite:**

- [x] Catálogo com filtros e busca simples (título, categoria, instrutor); série entra como terceiro eixo em P-6.3b (ver PATCH-024)
- [x] Página de curso: descrição, ementa, instrutor, CTA matrícula
- [x] Player: vídeo + sidebar navegação + notas + discussão
- [x] "Minha jornada": cursos em andamento com progresso visual
- [x] Certificados: lista com download PDF
- [x] Editor de curso: drag-drop para ordenar módulos e aulas
- [x] Editor de aula e editor de quiz têm página própria e são navegáveis a partir do editor de curso
- [x] Responsivo
- [x] Lint passa
- [x] Types passam

---

### P-6.3b — Plataforma: série como coleção temática no catálogo

**Fase:** 6
**Módulo:** plataforma
**Tipo:** ui
**Pré-condições:**

- Branch: `fix/P-6.3b-plataforma-serie`
- Dependências: P-6.5 concluído
- Env vars: nenhuma

**Origem:** PATCH-024 — débito de S-105 (P-6.3), critério de aceite marcado `[~]`. BRAIN §6.3 lista título, série e categoria como três eixos distintos de busca; nenhuma camada modelava "série" (`Course` só tinha `category`).

**Escopo:**
Introduzir "série" (coleção temática de cursos, mesmo precedente do módulo Rádio §6.4) como terceiro eixo de busca/filtro do catálogo, ainda sobre mocks (Bloco A).

1. Tipo `Series` (`id`, `name`, `slug`, `description`, `createdAt`, `updatedAt`) e campos `seriesId: string | null` + `seriesName: string | null` (denormalizado, mesmo padrão de `instructorName`) em `Course`.
2. Schema Zod: `seriesSchema` e inclusão de `seriesId` opcional no schema de curso (`createCourseSchema`/equivalente).
3. Mock data: 2+ séries; associar `seriesId`/`seriesName` aos cursos existentes; ao menos um curso sem série (`null`).
4. Catálogo (`(aluno)/page.tsx`): filtro por série (Select, mesmo padrão dos filtros de categoria/instrutor); busca por texto passa a casar título e nome da série.
5. `course-form.tsx` (P-6.4): seletor opcional de série (Select com as séries do mock; opção "Sem série").
6. `course-card.tsx`: exibir o nome da série como rótulo discreto quando presente.

**Arquivos permitidos para criação/edição:**

- `packages/types/src/plataforma/index.ts`
- `packages/validators/src/plataforma/index.ts`
- `apps/plataforma/src/lib/mock-data.ts`
- `apps/plataforma/src/app/(aluno)/page.tsx`
- `apps/plataforma/src/components/course-form.tsx`
- `apps/plataforma/src/components/course-card.tsx`

**Critérios de aceite:**

- [x] `Series` modelado em types + `seriesSchema` em validators.
- [x] `Course.seriesId`/`seriesName` opcionais; ao menos um curso sem série no mock.
- [x] Catálogo filtra por série e a busca por texto casa título + nome da série.
- [x] `course-form` permite escolher série (incluindo "Sem série").
- [x] Sem regressão nos filtros de categoria/instrutor existentes.
- [x] Lint passa · Types passam.

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

- [x] Curso form: título, descrição (editor compartilhado — D-1), capa (upload para o bucket plataforma-capas de P-0.12), categoria, instrutor
- [x] Lesson form: upload de vídeo (URL Bunny.net) ou conteúdo rich text
- [x] Quiz editor: adicionar/remover perguntas, definir respostas corretas
- [x] Validação Zod
- [x] Lint passa
- [x] Types passam

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

- [x] Skeletons por tela
- [x] Estados vazios contextuais
- [x] Lint passa
- [x] Types passam

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
Criar tabelas no schema `plataforma`: courses, modules, lessons, enrollments, progress, quizzes, quiz_questions, quiz_attempts, certificates, discussions, discussion_posts, instructors, notes (user_id, lesson_id, timestamp_seconds, content), series (id, name, slug, description, timestamps — PATCH-024) + coluna `courses.series_id` (FK nullable para `series`).

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/plataforma.ts`
- migration gerada via `drizzle-kit generate` a partir de `packages/db/src/schema/<modulo>.ts` (nome automático do kit; NÃO criar arquivo SQL numerado à mão — ver G6.4)

**Critérios de aceite:**

- [x] courses: title, slug, description, category, cover_url, instructor_id, published
- [x] lessons: module_id, title, type (video/text/quiz/download), content, video_url, order, requires_previous
- [x] progress: lesson_id, user_id, completed_at (unique constraint)
- [x] certificates: course_id, user_id, issued_at, verification_hash (unique)
- [x] notes: lesson_id, user_id, timestamp_seconds, content
- [x] series: name, slug, description; courses.series_id (FK nullable) (PATCH-024)
- [x] Migration aplica sem erros
- [x] Types passam

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
RLS para schema plataforma. Qualquer usuário autenticado: SELECT em courses publicados; lessons de cursos matriculados. Trilha sequencial: criar função helper plataforma.can_access_lesson(user_id, lesson_id) — SECURITY DEFINER STABLE, mesmo padrão de has_role — que retorna true se a aula é a primeira do curso ou se a aula anterior (por module/order) tem progress.completed_at do usuário; a policy de SELECT em lessons usa o helper (evitar subquery correlata inline). Progresso e notas: apenas próprios. Super_admin e instrutor: CRUD completo. Certificados: SELECT próprio; verificação pública por hash via rota que consulta apenas (hash → curso, nome, data) — não abrir SELECT anon na tabela. Séries (PATCH-024): SELECT para autenticado, mesmo padrão de courses publicados; CRUD para super_admin/instrutor.

**Arquivos permitidos para criação/edição:**

- migration gerada via `drizzle-kit generate` a partir de `packages/db/src/schema/<modulo>.ts` (nome automático do kit; NÃO criar arquivo SQL numerado à mão — ver G6.4)

**Critérios de aceite:**

- [x] Autenticado: vê cursos publicados
- [x] Matriculado: vê aulas do curso, registra progresso
- [x] Helper can_access_lesson criado (SECURITY DEFINER STABLE) e usado pela policy de lessons
- [x] Aula N inacessível com aula N-1 incompleta; acessível após concluir (teste com 2 usuários)
- [x] Verificação pública de certificado expõe somente curso/nome/data via hash (teste)
- [x] Super_admin/instrutor: CRUD completo em cursos, módulos, aulas
- [x] Notas: apenas próprias
- [x] Certificados: próprio + verificação pública por hash
- [x] Séries: SELECT autenticado; CRUD super_admin/instrutor (PATCH-024)
- [x] Types passam

---

### P-6.8 — Server Actions Plataforma

**Fase:** 6
**Módulo:** plataforma
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-6.8-plataforma-actions`
- Dependências: P-6.7 concluído
- Env vars: `DATABASE_URL` (migrations), `SUPABASE_URL`, `SUPABASE_ANON_KEY`(G6.1/G6.2)

**Escopo:**
Server Actions: CRUD de cursos, módulos, aulas (instrutor/admin) — CRUD de curso aceita `series_id` (PATCH-024). Matrícula. Registrar progresso (marcar aula como concluída). Submeter quiz — SEMÂNTICA (decisão D-5 da auditoria): quiz é tipo de aula; a aula-quiz é considerada concluída quando um attempt atinge score >= passing_score; tentativas ilimitadas; attempts todos registrados. Emissão automática de certificado ao concluir 100% das aulas da trilha (BRAIN §6.3 — a regra de certificação NÃO muda; o quiz só conta como conclusão da própria aula). Certificado: PDF gerado com @react-pdf/renderer (D-6), hash de verificação único. CRUD de discussões e posts. Notas pessoais. Busca simples (título, série, categoria) filtrando de fato por `series_id` (PATCH-024).

**Arquivos permitidos para criação/edição:**

- `apps/plataforma/src/actions/courses.ts`
- `apps/plataforma/src/actions/enrollment.ts`
- `apps/plataforma/src/actions/progress.ts`
- `apps/plataforma/src/actions/quizzes.ts`
- `apps/plataforma/src/actions/certificates.ts`
- `apps/plataforma/src/actions/discussions.ts`

**Critérios de aceite:**

- [x] CRUD de cursos/módulos/aulas com reordenação
- [x] Matrícula: cria enrollment e libera acesso
- [x] Progresso: marcar aula como concluída, verificar trilha sequencial
- [x] Quiz: attempt < passing_score NÃO conclui a aula; attempt >= passing_score conclui (teste)
- [x] Tentativas ilimitadas, todas registradas
- [x] Certificado: emitido automaticamente quando 100% das aulas concluídas — incluindo aulas-quiz (teste)
- [x] Certificado em PDF (@react-pdf/renderer) com verification_hash único
- [x] Actions via kit de @hebron/auth; publicação de curso e emissão de certificado com audit central (ALTER TYPE com valores do módulo na migration de P-6.6)- [x] Certificado com hash de verificação pública
- [x] Discussões por aula com moderação (super_admin pode deletar)
- [x] Lint passa
- [x] Types passam

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
Substituir mocks. Catálogo com cursos reais, filtro de série consumindo dados reais (PATCH-024). Player com vídeo via Bunny.net HLS. Progresso real. Certificados reais com download PDF. Discussões reais. `course-form` conectado grava `series_id` (PATCH-024).

**Arquivos permitidos para criação/edição:**

- `apps/plataforma/src/app/(aluno)/layout.tsx` (G5: autenticado; qualquer papel — BRAIN §6.3)
- `apps/plataforma/src/app/(aluno)/shell.tsx`
- `apps/plataforma/src/app/instrutor/layout.tsx` (G5: gate instrutor|super_admin — segmento real, ver PATCH-022)
- `apps/plataforma/src/app/instrutor/shell.tsx`
- `apps/plataforma/src/actions/auth.ts` (G5)
- `apps/plataforma/src/app/(aluno)/page.tsx`
- `apps/plataforma/src/app/(aluno)/curso/[slug]/page.tsx`
- `apps/plataforma/src/app/(aluno)/curso/[slug]/aula/[id]/page.tsx`
- `apps/plataforma/src/app/(aluno)/jornada/page.tsx`
- `apps/plataforma/src/app/(aluno)/certificados/page.tsx`
- `apps/plataforma/src/app/instrutor/**/page.tsx` (segmento real, ver PATCH-022; incl. editores de P-6.3)
- `apps/plataforma/src/components/*` (conectar componentes/forms do Bloco A)
- `apps/plataforma/src/lib/queries.ts`
- `apps/plataforma/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [x] (aluno) exige login; (instrutor) exige papel instrutor|super_admin (teste)
- [x] Catálogo com cursos do banco; matrícula executável pelo CTA da página do curso
- [x] Player Bunny.net HLS funcional; marcar aula como concluída executável do player
- [x] Trilha sequencial: aula locked visível como locked e inacessível (UI + RLS)
- [x] Quiz respondível pela tela com resultado e retry (quiz-form conectado)
- [x] Notas em timestamp criáveis/clicáveis no player (note-widget conectado)
- [x] Discussões: post/reply pela tela da aula
- [x] Instrutor: criar curso, editar módulos/aulas com drag-drop, editar quiz — tudo pela UI
- [x] Certificado baixável em PDF com hash verificável por rota pública
- [x] Nenhum componente/formulário do Bloco A (P-6.2/P-6.4) sem import (grep)
- [x] Mock data removido
- [x] Lint passa · Types passam

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
Notificações: matrícula confirmada (email ao aluno — transacional). Novo curso publicado: email para usuários ativos COM opt-in de novidades (consents de P-0.13, finalidade "newsletter/novidades") — nunca para a base inteira sem consentimento. Certificado emitido (email + in_app — transacional). Resposta no fórum (in_app ao autor do post).

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/enrollment-confirmed.tsx`
- `packages/email/src/templates/new-course.tsx`
- `packages/email/src/templates/certificate-issued.tsx`
- `apps/plataforma/src/lib/notifications.ts`

**Critérios de aceite:**

- [x] Matrícula: email de confirmação com link para o curso
- [x] Novo curso: email SOMENTE a usuários com consentimento de novidades (teste: usuário sem opt-in não recebe)
- [x] Certificado: email com link + in_app
- [x] Resposta no fórum: in_app ao autor do post original
- [x] Lint passa · Types passam

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

- `packages/integrations/src/plataforma.ts` (KPI de alunos — substituir stub do package)

**Critérios de aceite:**

- [x] KPI de alunos disponível para Intranet (query cross-schema)
- [x] Stub da Intranet substituído por dados reais
- [x] Campo instructor_role preparado no schema (sem funcionalidade extra na v1)
- [x] Lint passa
- [x] Types passam

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

- [x] Trilha: aula 3 inacessível se aula 2 não concluída
- [x] Certificado: emitido quando todas as aulas marcadas como concluídas
- [x] Quiz: score calculado corretamente
- [x] RLS: aluno não vê progresso de outro aluno
- [x] Quiz: attempt abaixo do passing_score não conclui a aula (semântica P-6.8)
- [x] Certificado: curso com aula-quiz só certifica após quiz aprovado
- [x] Testes passam
- [x] Lint passa

---

### P-6.13 — Gestão de Instrutores (Plataforma)

**Fase:** 6
**Módulo:** plataforma
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-6.13-plataforma-instrutores`
- Dependências: P-6.12 concluído
- Env vars: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Escopo:**
Corretivo — gap registrado em S-113 (SESSIONS.md), nunca resolvido em P-6.6–P-6.12. `plataforma.instructors` só pode ser escrita por `super_admin` (RLS `instructors_mutate_admin`, `0020_plataforma_rls.sql`), mas nenhuma Server Action ou tela jamais consumiu isso. Hoje a única forma de cadastrar um instrutor é INSERT manual no banco (Supabase Studio/SQL) — o que bloqueia a criação de curso na prática: o select "Instrutor" do `CourseForm` fica vazio para qualquer instalação nova (confirmado em teste manual do Filipe pós-P-6.9). Criar CRUD de instrutores restrito a `super_admin`: listar, criar (vincular a um `user_id` existente + bio opcional), editar, remover (bloquear remoção se houver curso vinculado — nunca deixar `courses.instructor_id` órfão). Tela dentro da própria Plataforma, não no app Admin — "instrutor" continua sendo dado do módulo, não papel global (decisão ratificada em P-6.7/P-6.11).

**Arquivos permitidos para criação/edição:**

- `apps/plataforma/src/actions/instructors.ts`
- `apps/plataforma/src/app/instrutor/equipe/page.tsx`
- `apps/plataforma/src/components/instructor-form.tsx`
- `apps/plataforma/src/components/instructor-table.tsx`
- `apps/plataforma/src/lib/queries.ts`

**Critérios de aceite:**

- [x] super_admin cria instrutor vinculando a um usuário existente (`createInstructorSchema`, já existente em `@hebron/validators` desde o Bloco A, hoje órfão — sem nenhum consumidor)
- [x] super_admin edita instrutor; remoção bloqueada por FK/verificação se houver curso vinculado
- [x] Não-super_admin não acessa a tela (RLS nega escrita + gate de página redireciona)
- [x] `CourseForm` lista instrutores reais cadastrados — fim do select vazio (teste manual: criar instrutor → aparece no formulário de novo curso)
- [x] Lint passa · Types passam

---

### P-6.14 — Verificação Pública de Certificado (Plataforma)

**Fase:** 6
**Módulo:** plataforma
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-6.14-plataforma-certificado-publico`
- Dependências: P-6.12 concluído
- Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Escopo:**
Corretivo — P-6.7/P-6.8/P-6.9 (S-110/S-111/S-112) marcam repetidamente o critério "verificação pública de certificado por hash" como satisfeito pela função `plataforma.verify_certificate(hash)` (SECURITY DEFINER STABLE, GRANT a `anon`) — mas nenhuma rota ou página jamais chamou essa função. Confirmado por busca na codebase: zero páginas/rotas de verificação existem hoje; o hash só é impresso no PDF do certificado, sem nenhum lugar para um terceiro conferi-lo. Criar rota pública (sem exigir sessão) que recebe o hash e exibe curso, nome do aluno e data de emissão, consultando exclusivamente `plataforma.verify_certificate` — nunca SELECT direto na tabela `certificates` (RLS não abre `anon` nela, por design, desde P-6.7).

**Arquivos permitidos para criação/edição:**

- `apps/plataforma/src/app/certificado/verificar/page.tsx`
- `apps/plataforma/src/lib/queries.ts`
- `apps/plataforma/src/actions/certificates.ts` (PDF passa a referenciar a URL completa)
- `apps/plataforma/src/components/certificate-card.tsx` (link "verificar" apontando para a rota)

**Critérios de aceite:**

- [x] Rota acessível sem login (fora do gate de sessão de `(aluno)`)
- [x] Hash válido exibe curso/nome/data; hash inválido/inexistente exibe estado vazio claro, sem stack trace
- [x] Consulta usa somente `plataforma.verify_certificate` — nenhum SELECT direto em `certificates` (grep)
- [x] PDF do certificado (`downloadCertificatePdf`) passa a exibir a URL completa de verificação, não só o hash cru
- [x] Lint passa · Types passam

---

### P-6.15 — Upload de Mídia da Plataforma (capa de curso, anexo de aula)

**Fase:** 6
**Módulo:** plataforma
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-6.15-plataforma-uploads`
- Dependências: P-6.12 concluído
- Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (assinatura de upload, mesmo padrão de `apps/documentos`)

**Escopo:**
Corretivo — débito registrado desde P-6.4/S-106 e nunca resolvido em P-6.8/P-6.9 (ambos documentaram e conscientemente adiaram): `CourseForm`/`LessonForm` capturam `File` só localmente (`URL.createObjectURL`), sem nenhuma Server Action de upload — capa de curso e anexo de aula tipo "download" nunca chegam ao Storage de verdade. Dois problemas confirmados na codebase: (1) o bucket `plataforma-capas` existe desde P-0.12, mas sua policy de INSERT/UPDATE/DELETE restringe a `public.has_role('super_admin')` (`0020_storage_buckets.sql`) — inconsistente com a decisão de P-6.7 de que qualquer instrutor (dado, não papel) tem CRUD completo em cursos; um instrutor não-super_admin não conseguiria subir capa mesmo com a action pronta. (2) Não existe nenhum bucket para anexo de aula — `lessons.download_url`/`download_file_name`/`download_file_size_bytes` estão no schema desde P-6.6, mas P-0.12 só previu `plataforma-capas`. Criar: (a) Server Action de signed-upload para `plataforma-capas` (mesmo padrão de `getUploadUrl` em `apps/documentos/src/actions/documents.ts`); (b) migration ajustando as policies de `plataforma-capas` para `super_admin OR plataforma.is_instructor()`; (c) novo bucket `plataforma-anexos` (privado, mime/tamanho adequados a PDF/doc/zip) com policies — SELECT para matriculado (mesma visibilidade de aula), INSERT/UPDATE/DELETE staff — e sua Server Action de signed-upload; (d) conectar `CourseForm`/`LessonForm` às actions reais.

**Arquivos permitidos para criação/edição:**

- migration gerada via `drizzle-kit generate --custom` (nome automático, G6.4) — ajusta policies de `plataforma-capas` e cria `plataforma-anexos`
- `apps/plataforma/src/actions/uploads.ts`
- `apps/plataforma/src/components/course-form.tsx`
- `apps/plataforma/src/components/lesson-form.tsx`

**Critérios de aceite:**

- [ ] Instrutor (não só super_admin) sobe capa de curso pela tela (teste)
- [ ] Anexo de aula tipo "download" sobe pela tela e fica disponível para aluno matriculado (teste)
- [ ] Bucket `plataforma-anexos` criado com policy testada (quem lê/escreve)
- [ ] `plataforma-capas`: policy de escrita passa a aceitar instrutor, não só super_admin (teste)
- [ ] Nenhum `URL.createObjectURL`/File local sobrevive sem upload real (grep)
- [ ] Lint passa · Types passam

---

> **Nota de auditoria (2026-07-14):** P-6.13/6.14/6.15 são corretivos gerados por auditoria cruzada de PROMPTS.md × SESSIONS.md × codebase (ver SESSIONS.md). Não bloqueiam a Fase 7 (Flats é módulo independente) — podem rodar em paralelo ou depois, a critério do Filipe. Débitos leves adicionais (tipo `Note`/`createNoteSchema` ausentes em `@hebron/types`/`@hebron/validators`; KPIs `activeCourses`/`completionRate` calculados mas sem card na Intranet) foram avaliados e considerados não-bloqueantes — não geraram prompt.

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
Formulários: reserva completa multi-step (CONSENTIMENTO LGPD → dados do responsável com upload de documento para o bucket flats-documentos → acompanhantes com CPF e data de nascimento → veículo → 3 períodos de preferência → critérios de scoring → ajuda de custo opcional → revisão).

Step de consentimento (novo, primeiro step): finalidades granulares — processamento dos dados da reserva (obrigatório para prosseguir), dado de saúde autodeclarado do critério d (consentimento específico e destacado; o campo de saúde só aparece se consentido; sem laudo, sem detalhe clínico — apenas sim/não conforme BRAIN §6.8), comunicação por email sobre a reserva (transacional, informativo). Grava em public.consents (P-0.13).

Aprovação (selecionar período final, observações). Check-in/check-out: registro simples de transição com data/hora e observações — SEM checklist de inventário (decisão D-5; BRAIN §6.8: check-in é presencial na recepção).

**Arquivos permitidos para criação/edição:**

- `apps/flats/src/components/reservation-wizard.tsx`
- `apps/flats/src/components/reservation-wizard-steps/step-guest.tsx`
- `apps/flats/src/components/reservation-wizard-steps/step-companions.tsx`
- `apps/flats/src/components/reservation-wizard-steps/step-vehicle.tsx`
- `apps/flats/src/components/reservation-wizard-steps/step-periods.tsx`
- `apps/flats/src/components/reservation-wizard-steps/step-scoring.tsx`
- `apps/flats/src/components/approval-form.tsx`
- `apps/flats/src/components/checkin-form.tsx` → registro de check-in check-out (status + timestamp + observações), sem inventário
- `apps/flats/src/components/reservation-wizard-steps/step-consent.tsx`

**Critérios de aceite:**

- [ ] Wizard com step inicial de consentimento; sem consentimento de reserva não prossegue
- [ ] Campo de saúde (critério d) só exibido/persistido com consentimento específico (teste)
- [ ] Upload de documento de identidade para o bucket flats-documentos com policy restrita (P-0.12)
- [ ] Check-in form registra transição + timestamp + observações; nenhum checklist de inventário
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
Criar tabelas no schema `flats`: units (2 fixas, seed), reservations (status, selected_period como daterange, score_total), preferred_periods (reservation_id, period daterange — 3 por reserva), guests (reservation_id, name, cpf, birth_date, is_responsible — PII: acesso restrito a gestor/
super_admin via RLS), vehicles, scoring_responses (reservation_id, criterion, value, points — o critério d/saúde é dado sensível: coluna própria com acesso restrito e coleta condicionada a consentimento, P-7.4), aid_requests (reservation_id, type, amount), usage_history (user_id, reservation_id, days_used, period — regra 7d/12m), document_files (referência ao bucket flats-documentos).

Double-booking: CREATE EXTENSION IF NOT EXISTS btree_gist; constraint EXCLUDE USING gist (unit_id WITH =, selected_period WITH &&) em reservations, aplicável apenas a status que ocupam o flat (aprovada/confirmada/em_curso — usar WHERE na constraint).

Auditoria central: incluir ALTER TYPE admin.audit_action ADD VALUE IF NOT EXISTS para os valores do módulo (reservation.submitted/approved/rejected/checked_in/checked_out, aid.requested/approved) — G6.3.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/flats.ts`
- `packages/db/src/migrations/0016_flats.sql`

**Critérios de aceite:**

- [ ] units: 2 registros seed (flat 1, flat 2)
- [ ] reservations: status (solicitada, aprovada, rejeitada, confirmada, em_curso, concluida, cancelada)
- [ ] preferred_periods: 3 por reserva (constraint)
- [ ] scoring_responses: 10 critérios com pontuação calculada
- [ ] usage_history: user_id, reservation_id, days_used, period (para regra 7d/12m)
- [ ] EXCLUDE USING gist impede duas reservas ocupantes com períodos sobrepostos no mesmo flat (teste: INSERT sobreposto falha; períodos adjacentes não colidem; reserva rejeitada não bloqueia)
- [ ] Colunas de PII/saúde identificadas em comentário SQL e cobertas por RLS restrita (P-7.7)
- [ ] Enum de audit com os valores do módulo
- [ ] drizzle-kit check limpo
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
RLS para schema flats. Hóspede: CRUD apenas nas próprias reservas. Diretor gestor: usar o helper has_designation já criado em P-3.7 (escopo flats/gestor) — não criar helper novo. SELECT all + UPDATE para aprovar/rejeitar. Super_admin: full access. Diretores/conselheiros: NÃO podem criar reservas (conflito de interesse).

**Arquivos permitidos para criação/edição:**

- migration gerada via `drizzle-kit generate` a partir de `packages/db/src/schema/<modulo>.ts` (nome automático do kit; NÃO criar arquivo SQL numerado à mão — ver G6.4)

**Critérios de aceite:**

- [ ] Hóspede: CRUD apenas nas próprias reservas
- [ ] Diretor gestor: SELECT all + UPDATE (aprovar/rejeitar)
- [ ] Super_admin: full access
- [ ] Diretores/conselheiros: sem INSERT em reservations (conflito de interesse)
- [ ] Units: SELECT para todos os autenticados
- [ ] guests/scoring_responses (PII/saúde): SELECT restrito a gestor de flats e super_admin (teste)
- [ ] Types passam

---

### P-7.8 — Server Actions Flats

**Fase:** 7
**Módulo:** flats
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-7.8-flats-actions`
- Dependências: P-7.7 concluído
- Env vars: `DATABASE_URL` (migrations), `SUPABASE_URL`, `SUPABASE_ANON_KEY` (G6.1/G6.2)

**Escopo:**
Server Actions: criar reserva (com validação de elegibilidade, limite 7d/12m, disponibilidade). Calcular score automaticamente (10 critérios; b = frequência de uso calculada de flats.usage_history; j = participação em projetos via getProjectParticipationScore de packages/integrations — NUNCA import de apps/projetos). Aprovar/rejeitar: diretor gestor por designation (has_designation, mesmo helper de P-3.7, escopo flats/gestor). Solicitar ajuda de custo; quando aprovada, as despesas criadas no Financeiro NASCEM NÃO APROVADAS e seguem a governança dual normal (lote semanal → gestor aprova → autorizador autoriza — decisão D-4): a aprovação do auxílio pelo gestor de flats é decisão de mérito, não autorização financeira. Auditoria central com abort em falha (G6.3) em toda mutação. Confirmar reserva. Check-in/check-out. Desempate (idade → tempo sem descanso → nunca usou → sorteio). Soft-delete com justificativa.

**Arquivos permitidos para criação/edição:**

- `apps/flats/src/actions/reservations.ts`
- `apps/flats/src/actions/scoring.ts`
- `apps/flats/src/actions/approval.ts`
- `apps/flats/src/actions/checkin.ts`
- `apps/flats/src/actions/aid.ts`

**Critérios de aceite:**

- [ ] Validação de elegibilidade: pastores/missionários (via papel hospede)
- [ ] Validação: max 7 dias nos últimos 12 meses por indivíduo
- [ ] Score: 10 critérios; b de usage_history; j via packages/integrations (teste)
- [ ] Aprovar/rejeitar exige designation gestor de flats — diretor sem designation falha (teste)
- [ ] Ajuda aprovada cria payables NÃO aprovados no Financeiro, com data = dia anterior ao início (teste cross-schema); payables entram no fluxo de lote normal
- [ ] Audit central em toda mutação, abortando em falha (teste)
- [ ] Actions via kit de @hebron/auth (grep)
- [ ] (demais critérios inalterados: elegibilidade, 7d/12m, desempate, soft-delete)
- [ ] Desempate: idade → tempo sem descanso → nunca usou → sorteio (nesta ordem)
- [ ] Aprovação: diretor gestor seleciona 1 dos 3 períodos
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

- `apps/flats/src/app/(hospede)/layout.tsx` (G5: papel hospede; diretor/conselheiro BLOQUEADOS — conflito de interesse, BRAIN §6.8)
- `apps/flats/src/app/(hospede)/shell.tsx`
- `apps/flats/src/app/(admin)/layout.tsx` (G5: gestor por designation | super_admin)
- `apps/flats/src/app/(admin)/shell.tsx`
- `apps/flats/src/actions/auth.ts` (G5)
- `apps/flats/src/app/(hospede)/page.tsx`
- `apps/flats/src/app/(hospede)/reservar/page.tsx`
- `apps/flats/src/app/(hospede)/minhas-reservas/page.tsx`
- `apps/flats/src/app/(admin)/page.tsx`
- `apps/flats/src/app/(admin)/aprovacao/page.tsx`
- `apps/flats/src/app/(admin)/reserva/[id]/page.tsx`
- `apps/flats/src/components/*` (conectar wizard/forms do Bloco A)
- `apps/flats/src/lib/queries.ts`
- `apps/flats/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [ ] (hospede) exige papel hospede; diretor/conselheiro bloqueados também na UI (teste)
- [ ] (admin) exige designation gestor de flats ou super_admin (teste)
- [ ] Reserva SUBMETÍVEL de ponta a ponta pelo wizard do Bloco A (P-7.4) — não reescrever inline
- [ ] Score calculado ao submeter e visível na fila
- [ ] Aprovar/rejeitar executável pela fila (approval-form conectado): seleção de período final persiste
- [ ] Check-in e check-out executáveis pelo detalhe da reserva (checkin-form conectado)
- [ ] Solicitação de ajuda de custo executável pelo wizard/minhas-reservas
- [ ] Calendário com reservas reais
- [ ] Nenhum componente/formulário do Bloco A (P-7.2/P-7.4) sem import (grep)
- [ ] Mock data removido
- [ ] Lint passa · Types passam

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
Notificações: reserva submetida (in_app ao diretor gestor). Reserva aprovada/rejeitada (email ao hóspede com período selecionado ou motivo). Instruções de check-in (3 dias antes) e lembrete de check-out (no dia): crons registrados em packages/jobs (P-0.14)

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/reservation-submitted.tsx`
- `packages/email/src/templates/reservation-approved.tsx`
- `packages/email/src/templates/checkin-instructions.tsx`
- `apps/flats/src/lib/notifications.ts`
- `packages/jobs/src/crons/flats.ts`

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
Conectar integrações via packages/integrations. Flats → Tarefas: reserva confirmada gera tarefas de limpeza pré e pós-estadia via createAutoTask, usando os 2 templates de limpeza seedados nesta sessão (seed em tarefas task_templates com slugs estáveis 'limpeza-pre-estadia' e 'limpeza-pos-estadia' — criar aqui, com data da tarefa derivada do período da reserva). Flats → Financeiro: já implementado em P-7.8 (governança D-4) — aqui apenas o teste de integração e a substituição do stub do package. Flats ← Projetos: getProjectParticipationScore já consumida em P-7.8 — validar com teste.

**Arquivos permitidos para criação/edição:**

- `packages/integrations/src/flats.ts` (limpeza + auxílio — substituir stubs)
- `packages/db/src/seed/tarefas-templates.ts` (2 templates de limpeza, slugs estáveis)
- `apps/flats/src/actions/*` (apenas pontos de chamada)

**Critérios de aceite:**

- [ ] Templates de limpeza seedados com slugs estáveis; integração os resolve por slug, não por UUID
- [ ] Reserva confirmada cria as 2 tarefas SEM assignee, com datas derivadas do período (teste)
- [ ] Ajuda aprovada → payables não aprovados no Financeiro (teste, cobre D-4)
- [ ] Critério j auto-calculado (teste)
- [ ] Zero imports app→app (verificação do CI)
- [ ] Lint passa · Types passam

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
- [ ] Consentimento: reserva sem consentimento de dados não persiste; campo saúde exige consentimento específico (P-7.4)
- [ ] Auxílio: payables nascem não aprovados e entram na governança dual (D-4)
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

- [ ] Upload de .mp3 com extração automática de duração (lib `music-metadata` — registrar em SESSIONS; executor não deve escolher outra silenciosamente)
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
- migration gerada via `drizzle-kit generate` a partir de `packages/db/src/schema/<modulo>.ts` (nome automático do kit; NÃO criar arquivo SQL numerado à mão — ver G6.4)

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
RLS para schema radio. Anon: SELECT em tracks, authors, series, playlists, now_playing (ouvir sem cadastro). Autenticado com termo aceito: SELECT em exclusive_materials + download via signed URL. Super_admin: full CRUD. Demais: leitura pública. Grants: o SELECT anônimo exige GRANT USAGE/SELECT para `anon` APENAS nas tabelas públicas da rádio (tracks, authors, series, playlists, now_playing) — alinhar com a migration de grants de P-0.10; exclusive_materials e term_acceptances ficam fora do grant de anon.

**Arquivos permitidos para criação/edição:**

- migration gerada via `drizzle-kit generate` a partir de `packages/db/src/schema/<modulo>.ts` (nome automático do kit; NÃO criar arquivo SQL numerado à mão — ver G6.4)

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
- Env vars: `DATABASE_URL` (migrations), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (G6.1/G6.2)

**Escopo:**
Server Actions: upload de faixa para Cloudflare R2. CRUD de autores, séries, playlists. Auto DJ: API route server-side que serve áudio do R2 (proxy com playlist ativa). Atualizar "tocando agora" via Supabase Realtime. Aceitar termo (1x por usuário). Download de material exclusivo via signed URL. Configurar PWA: manifest + SERVICE WORKER (arquivo próprio) + Media Session API no player (metadados de faixa, controles na tela de bloqueio). Upload/signed URLs de R2 via client S3-compatible (@aws-sdk/client-s3 com endpoint R2) — registrar a escolha em SESSIONS.

**Arquivos permitidos para criação/edição:**

- `apps/radio/src/actions/tracks.ts`
- `apps/radio/src/actions/playlists.ts`
- `apps/radio/src/actions/materials.ts`
- `apps/radio/src/actions/terms.ts`
- `apps/radio/src/app/api/stream/route.ts`
- `apps/radio/src/app/manifest.ts`
- `apps/radio/public/sw.js` (service worker — background play/PWA)
- `apps/radio/src/lib/r2.ts` (client R2 S3-compatible, server-only)

**Critérios de aceite:**

- [ ] Upload de .mp3 para R2 com URL retornada
- [ ] Auto DJ: API route que serve faixa atual do playlist ativo (não stream contínuo — cada ouvinte pode estar em ponto diferente)
- [ ] "Tocando agora" atualizado via Supabase Realtime (broadcast)
- [ ] Termo: aceitar 1x, verificar antes de servir material exclusivo
- [ ] Signed URL para download de material exclusivo (expira em 1h)
- [ ] PWA: manifest + service worker registrado; áudio continua ao trocar de aba/minimizar (verificação manual documentada no PR)
- [ ] Media Session API: faixa/autor aparecem nos controles do SO
- [ ] Upload de .mp3 admin-only (gate super_admin via kit — G6.1)
- [ ] R2 keys usadas apenas server-side (grep em componentes client → zero)
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

- `apps/radio/src/app/layout.tsx` (root: shell client com player persistente)
- `apps/radio/src/app/shell.tsx` (player global entre navegações)
- `apps/radio/src/app/(admin)/layout.tsx` (G5: gate super_admin server-side)
- `apps/radio/src/actions/auth.ts` (logout do admin)
- `apps/radio/src/app/page.tsx`
- `apps/radio/src/app/autores/page.tsx`
- `apps/radio/src/app/autores/[slug]/page.tsx`
- `apps/radio/src/app/series/[slug]/page.tsx`
- `apps/radio/src/app/materiais/page.tsx`
- `apps/radio/src/app/(admin)/page.tsx`
- `apps/radio/src/components/*` (conectar componentes/forms do Bloco A)
- `apps/radio/src/lib/mock-data.ts` (remover)

**Critérios de aceite:**

- [ ] Player toca áudio real do R2 e PERSISTE entre navegações (não reinicia ao trocar de página)
- [ ] "Tocando agora" via Supabase Realtime
- [ ] Catálogos com dados do banco
- [ ] Material exclusivo: anônimo → login wall; sem termo → dialog de aceite; com termo → download via signed URL que expira (fluxo completo testável)
- [ ] Admin: upload de faixa, criação de playlist (drag-drop) e material exclusivo operáveis pela UI (forms de P-8.4 conectados); anônimo/não-admin bloqueado no (admin) (teste)
- [ ] PWA instala e toca em background (verificação manual documentada)
- [ ] Nenhum componente/formulário do Bloco A (P-8.2/P-8.4) sem import (grep)
- [ ] Mock data removido
- [ ] Lint passa · Types passam

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

- [ ] Novo material exclusivo: email para quem tem termo aceito E consentimento de comunicação de novidades (P-0.13) — termo de responsabilidade não é opt-in de email
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
Rádio → Intranet: KPI de audiência via packages/integrations. SEMÂNTICA (D-3, opção recomendada): o player envia heartbeat anônimo a cada 60s enquanto reproduz (session_id gerado no client, sem PII); "ouvinte" = sessão com >= 2 heartbeats; métricas: sessões únicas/dia e horas ouvidas/dia. Snapshot diário agregado gravado em radio.listener_stats por cron em packages/jobs; heartbeats brutos descartados após agregação (LGPD — sem rastro individual). Substituir stub da Intranet.

**Arquivos permitidos para criação/edição:**

- `packages/integrations/src/radio.ts` (KPI de audiência — substituir stub)
- `apps/radio/src/app/api/heartbeat/route.ts` (ingestão do heartbeat, anônima)
- `packages/jobs/src/crons/radio-stats.ts` (agregação diária + limpeza dos brutos)

**Critérios de aceite:**

- [ ] Heartbeat sem PII (payload: session_id efêmero + track_id) — verificado
- [ ] KPI: sessões únicas/dia e horas ouvidas/dia calculadas corretamente (teste com fixtures)
- [ ] Cron de agregação registrado em packages/jobs; brutos removidos após agregar (teste)
- [ ] Stub da Intranet substituído via packages/integrations
- [ ] Lint passa · Types passam

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
- [ ] Audiência: agregação diária calcula sessões/horas conforme D-3 (fixtures)
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
Auditoria completa de RLS e permissões no estado final (decisão B implementada em P-0.10 — este prompt VERIFICA, não decide). Verificar: DENY-by-default em toda tabela de todos os schemas (inclusive tarefas/intranet/plataforma/flats/radio criados nas fases 4–8). GRANTs por schema alinhados às policies — nenhum GRANT mais largo que a policy correspondente. Nenhuma leitura ou escrita remanescente via DATABASE_URL superuser em páginas actions (grep + teste). Cross-schema leaks (submissor não acessa financeiro; busca global e feed respeitam RLS). Impersonation não bypassa RLS nem confere autoridade (cookie assinado — F3-13, se corrigido; senão, corrigir aqui). Conflitos de interesse enforced em RLS (diretor não cria reserva; diretor≠submissor). Gates de layout (G5) alinhados com RLS. Signed URLs: expiração e escopo (R2, Storage). SQL injection em queries dinâmicas (busca, filtros).

**Arquivos permitidos para criação/edição:**

- `apps/admin/src/__tests__/security-audit.test.ts`
- arquivo SQL de fixes de RLS/GRANTs, se necessário (convenção G6.4)

**Critérios de aceite:**

- [ ] Toda tabela com RLS habilitado e DENY-by-default (verificação automatizada por introspecção)
- [ ] Zero conexões superuser em runtime de app (grep + teste)
- [ ] GRANTs ↔ policies reconciliados schema a schema
- [ ] Nenhum cross-schema leak (testes por papel)
- [ ] Conflitos de interesse enforced em RLS
- [ ] Cookie de impersonação assinado/inforjável (F3-13 fechado)
- [ ] Signed URLs com expiração adequada
- [ ] Nenhuma query dinâmica vulnerável a SQL injection
- [ ] Testes de segurança passam · Relatório de findings documentado

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
Compliance LGPD — superfícies de titular e revisão final (a fundação — public.consents, fluxo de anonimização, política de PII em audit diffs, retenção — existe desde P-0.13; o consentimento no cadastro existe desde P-1.26/P-7.4; este prompt NÃO recria nada disso).

Tela "Meus Dados" (componente compartilhado em packages/ui, montado em cada app): visualizar dados armazenados e consentimentos, revogar consentimento por finalidade, exportar (JSON + CSV), solicitar exclusão. Solicitação de exclusão: gera ticket para super_admin; a execução usa o fluxo de anonimização de P-0.13 — exclusão/anonimização REAL dos dados pessoais onde a lei exige, preservando registros contábeis/deliberativos pseudonimizados (BRAIN §9 emendado — decisão F1-Q4). Log de acesso a dados pessoais (leituras de CPF/documentos por admin ficam auditadas). Revisão final: varredura de todos os dados pessoais (CPF, documentos de identidade, fotos, saúde autodeclarada dos flats, views de documentos, heartbeats da rádio) confirmando base legal, acesso restrito e retenção configurada.

**Arquivos permitidos para criação/edição:**

- `packages/ui/src/components/my-data-page.tsx`
- `packages/auth/src/data-export.ts`
- `packages/auth/src/data-deletion.ts` (usa o fluxo de anonimização de P-0.13)
- `apps/*/src/app/**/meus-dados/page.tsx` (montagem por app)
- ajustes de schema, se necessários (convenção G6.4)

**Critérios de aceite:**

- [ ] "Meus Dados" em cada app: visualização, consentimentos revogáveis, export JSON+CSV, pedido de exclusão
- [ ] Exclusão executada anonimiza PII de verdade (teste fim-a-fim com usuário fixture) e preserva registros contábeis pseudonimizados
- [ ] Consentimento do cadastro é opt-in (verificação — já implementado em P-1.26/P-7.4)
- [ ] Acesso a CPF/documentos audita leitura (teste)
- [ ] Varredura final documentada: inventário de dados pessoais × base legal × retenção
- [ ] Lint passa · Types passam

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

- arquivo SQL de indexes, se necessário (convenção G6.4)
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
- [ ] Grep sem ocorrências (case-insensitive) em arquivos .tsx de UI: "vamos lá", "incrível", "awesome", "ops!", "oops", "não se preocupe", "estamos quase lá", "tudo certo!" — e revisão manual de exclamações genéricas restantes
- [ ] Lint passa
- [ ] Types passam

**Notas:**
Ref: BRAIN.md seção 5 (princípios visuais — fugir do "cara de IA"). Público em transição tecnológica — clareza > criatividade.

---

### P-9.5 — Deploy Final

**Fase:** 9
**Módulo:** fundacao
**Tipo:** config
**Pré-condições: **

- Branch: `main` (merge de todas as features)
- Dependências: P-9.4 concluído; P-9.0 (migração de usuários do legado) concluído
- Env vars: todas as env vars de produção configuradas na Vercel

**Escopo:**
Configurar deploy de produção. Vercel: 9 projetos separados (1 por app) com domínios customizados. DNS Cloudflare: subdomínios apontando para Vercel. Supabase: migration de produção aplicada. GitHub Actions: CI já existe (P-0.9) — adicionar apenas o workflow de DEPLOY (deploy automático em merge na main). Inngest: ambiente de produção configurado e crons de packages/jobs registrados (verificar cada cron do catálogo). pg_cron de partições ativo em produção (P-0.7). Sentry: DSN em cada app. Better Stack: 9 monitores. Seed de produção: 2 super_admins, 8 papéis, 6 workspaces de tarefas, plano de contas padrão INCLUINDO a categoria "Doações" (KPI da Intranet — decisão F1-Q10), designations (gestor/autorizador do financeiro; gestor de flats), 2 unidades de flat, 2 templates de limpeza (slugs de P-7.11).

**Arquivos permitidos para criação/edição:**

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `apps/*/vercel.json` (se necessário)
- `packages/db/src/seed.ts`

**Critérios de aceite:**

- [ ] 9 apps deployados com subdomínios corretos
- [ ] SSO funcional entre todos os subdomínios
- [ ] Deploy automático em merge na main (CI de PR já verde desde P-0.9)
- [ ] Todos os crons do catálogo de packages/jobs registrados em produção (lista verificada 1 a 1)
- [ ] pg_cron de partições ativo (INSERT de audit em mês futuro funciona em produção)
- [ ] Seed: 2 super_admins, 8 papéis, 6 workspaces, plano de contas com categoria "Doações", designations financeiro/flats, 2 unidades de flat, 2 templates de limpeza
- [ ] Usuários do legado migrados e aptos a logar (P-9.0 verificado em produção)
- [ ] (demais critérios inalterados: 9 apps, SSO, Sentry, Better Stack, migrations, testes, lint, types)
- [ ] Sentry capturando erros em todos os apps
- [ ] Better Stack monitorando uptime de todos os subdomínios
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

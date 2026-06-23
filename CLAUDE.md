# Hebron Aseec — Instruções de Desenvolvimento

> **Fonte da verdade:** `BRAIN.md` | **Sequência:** `PROMPTS.md` | **Log:** `SESSIONS.md`

## Contexto

Ecossistema de 9 apps Next.js para a Hebron Aseec (ONG cristã, 40+ anos). Monorepo com ~150 usuários ativos. Dev solo (Filipe Honório) + agentes IA. Metodologia SDD (Spec-Driven Development): frontend-first, um prompt por sessão.

## Stack

- **Framework:** Next.js 15 (App Router, RSC)
- **Linguagem:** TypeScript 5.6+ (strict, zero `any`)
- **Estilização:** Tailwind CSS v4 (CSS variables, sem `tailwind.config.js`)
- **Componentes:** shadcn/ui fork em `packages/ui` (nunca vanilla)
- **Formulários:** React Hook Form + Zod (schemas em `packages/validators`)
- **Estado servidor:** TanStack Query v5 (preferir RSC + Server Actions)
- **Tabelas:** TanStack Table v8
- **Ícones:** Lucide React
- **Tipografia:** Parkinsans (títulos/display) + Titillium Web (UI/corpo) via `next/font` — **nunca** Inter/Source Serif
- **Banco:** PostgreSQL 16 via Supabase (1 cluster, schemas por app)
- **ORM:** Drizzle ORM (migrations TypeScript, suporte RLS)
- **API:** Server Actions via `next-safe-action` (sem backend separado)
- **Auth:** Supabase Auth (email+senha, Magic Link) | MFA TOTP para super_admin/diretor
- **SSO:** Cookies em `.hebronaseec.com.br` | Login canônico: `app.hebronaseec.com.br/login`
- **Storage:** Supabase Storage (docs), Bunny.net Stream (vídeos), Cloudflare R2 (áudio)
- **Email:** Resend + React Email (`packages/email`)
- **IA:** OpenAI GPT-4.1 (triagem/scoring) | Claude (code gen)
- **Jobs:** Inngest | **Cache:** Upstash Redis
- **Monorepo:** pnpm 9 + Turborepo 2
- **Deploy:** Vercel (9 projetos, 1 conta Pro)
- **CI/CD:** GitHub Actions (lint, test, typecheck)

## Estrutura do monorepo

```
hebron-aseec/
├── apps/
│   ├── admin/          → admin.hebronaseec.com.br
│   ├── projetos/       → projetos.hebronaseec.com.br
│   ├── plataforma/     → plataforma.hebronaseec.com.br
│   ├── radio/          → radio.hebronaseec.com.br
│   ├── financeiro/     → financeiro.hebronaseec.com.br
│   ├── intranet/       → app.hebronaseec.com.br
│   ├── documentos/     → docs.hebronaseec.com.br
│   ├── flats/          → flats.hebronaseec.com.br
│   └── tarefas/        → tarefas.hebronaseec.com.br
├── packages/
│   ├── ui/             # Design system (shadcn fork com tokens próprios)
│   ├── db/             # Drizzle schemas + migrations
│   ├── auth/           # Supabase Auth helpers + RBAC
│   ├── email/          # Templates React Email
│   ├── validators/     # Schemas Zod compartilhados
│   ├── ai/             # Wrappers OpenAI
│   ├── config/         # ESLint, tsconfig, Tailwind presets
│   └── types/          # Tipos cross-app
├── tooling/
│   ├── eslint-config/
│   └── typescript-config/
├── BRAIN.md            # Fonte da verdade (regras de negócio + decisões)
├── PROMPTS.md          # Sequência de 119 prompts (fases 0-9)
├── SESSIONS.md         # Log append-only de sessões
├── PATCHES/            # Registro de mudanças em decisões
└── .docs/              # Documentação de referência (PRD, identidade visual, etc.)
```

## Convenções de código

### Nomenclatura

| Contexto           | Padrão                                             |
| ------------------ | -------------------------------------------------- |
| Arquivos e pastas  | `kebab-case`                                       |
| Componentes React  | `PascalCase`                                       |
| Funções/variáveis  | `camelCase`                                        |
| Tipos/interfaces   | `PascalCase`                                       |
| Tabelas/colunas DB | `snake_case`                                       |
| Schemas DB         | nome do módulo (`projetos`, `financeiro`, `admin`) |

### Server Actions

- Sempre usar `next-safe-action` com schema Zod
- RBAC check no handler, RLS como segunda camada no banco
- Schemas Zod compartilhados em `packages/validators`

### Componentes

- Fork customizado em `packages/ui` — nunca usar shadcn vanilla
- Compostos: `PageHeader`, `EmptyState`, `ErrorState`, `LoadingState`, `AppShell`

### Estilização

- Tailwind v4 com design tokens via CSS variables em `tokens.css`
- Sem `tailwind.config.js` (v4 usa CSS nativo)
- Mobile-first, espaçamento generoso, animações sutis

### Design tokens

- **Primário:** Azul `#202C85` | **Accent:** Laranja `#EA5A06`
- **Suporte:** Verde `#A1C520`, Azul Claro `#07B4E7`
- **Tipografia:** Parkinsans (títulos/display) | Titillium Web (UI/corpo)
- **Tokens canônicos:** vocabulário `--hb-*` + semânticos (`--fg`, `--bg`, `--surface`, `--divider`) em `packages/ui/src/tokens.css` — fonte única; **nunca** redefinir tokens/cores hex em CSS de app. Ver BRAIN.md §5.
- **Referências visuais:** `design-refs/<app>/` (protótipos Claude Design, versionados)

## Banco de dados

- 1 projeto Supabase, 10 schemas: `public` (compartilhado) + 1 por app
- Drizzle ORM para schemas e migrations (TypeScript)
- **RLS obrigatório em toda tabela** (DENY by default, USING + WITH CHECK separados)
- Imutabilidade: soft-delete + estornos, nunca hard delete
- Audit log (`admin.audit_log`) em toda mutação crítica

## Permissões (RBAC + RLS)

Três camadas obrigatórias, nunca apenas uma:

1. **Middleware Next.js** — bloqueia rota antes de renderizar
2. **Server Action gates** — valida ação específica
3. **RLS no Postgres** — última linha de defesa

Papéis: `super_admin`, `diretor`, `conselheiro`, `colaborador`, `submissor`, `aluno`, `hospede`, `ouvinte`. Múltiplos papéis por usuário permitidos.

## Comandos

```bash
pnpm install              # Instalar dependências
pnpm turbo build          # Build de todos apps/packages
pnpm turbo dev            # Dev servers
pnpm turbo lint           # ESLint workspace
pnpm turbo typecheck      # TypeScript strict check
pnpm turbo test           # Rodar testes
```

## Fluxo de trabalho SDD

1. Ler `BRAIN.md` (contexto fixo)
2. Ler prompt atual em `PROMPTS.md`
3. Executar o prompt (apenas arquivos permitidos)
4. Registrar em `SESSIONS.md` (append-only)
5. Se decisão mudou → criar PATCH em `PATCHES/`

**Blocos por módulo:**

- **Bloco A (P-X.1 a P-X.5):** UI com dados mockados → PAUSA para validação com diretoria
- **Bloco B (P-X.6 a P-X.12):** Backend + integração (substitui mocks por dados reais)

## Checklists

### Antes de cada prompt

- [ ] `BRAIN.md` carregado no contexto
- [ ] Prompt atual lido em `PROMPTS.md`
- [ ] Pré-condições verificadas (branch, dependências, env vars)
- [ ] Apenas arquivos permitidos serão criados/editados

### Antes de concluir cada prompt

- [ ] TypeScript strict (zero `any`)
- [ ] RLS em toda tabela nova
- [ ] Zod validation em todo input
- [ ] Responsivo (mobile-first)
- [ ] LGPD compliance (consentimento granular)
- [ ] Audit log em mutações críticas
- [ ] Lint passa
- [ ] Types passam

## Princípios invioláveis

- **Sem suposições:** sempre perguntar ao Filipe sobre regras de negócio ambíguas
- **Simplicidade:** público-alvo em transição tecnológica — interfaces simples e claras
- **Não parecer IA:** design system próprio, tipografia editorial, microcopy humano (sem "vamos lá!", sem exclamações genéricas). Estados vazios com citações bíblicas pertinentes
- **Imutabilidade:** soft-delete e estornos, nunca hard delete. Audit trails em tudo
- **Governança dual:** aprovação + autorização (duas pessoas, duas camadas) para decisões financeiras
- **Defense in depth:** RBAC + RLS sempre, nunca apenas um
- **Frontend-first:** UI com mocks → validação com diretoria → backend
- **Uma sessão = um prompt:** não misturar prompts na mesma sessão
- **Skill `/frontend-design` obrigatória:** todo prompt que envolver criação ou edição de UI (páginas, componentes, layouts, estados) deve invocar o skill `/frontend-design` antes de implementar

## Referências

- `BRAIN.md` — regras de negócio completas (seção 6) e decisões técnicas
- `PROMPTS.md` — sequência de 119 prompts (fases 0-9)
- `.docs/Identidade Visual da Hebron Aseec.md` — cores, fontes, logotipos
- `.docs/PRD Ecossistema Hebron Aseec.md` — requisitos de produto
- `.docs/EDITAL PARA SOLICITAÇÕES DE RESERVA NO FLAT.md` — regras de reserva
- `.docs/Claude.md` — documento técnico complementar ao PRD
- `.docs/SDD-STRUCTURE.md` — formato e metodologia SDD
- `.docs/Respostas*.md` — 164 Q&As de regras de negócio

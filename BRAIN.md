# BRAIN — Hebron Aseec Ecosystem

## 1. Contexto do projeto

A **Hebron Aseec** (Assistência Social, Educacional, Evangélica e Científica) é uma associação cristã sem fins lucrativos com mais de 40 anos de existência. Sua missão é prover recursos e apoio a missionários, pastores e instituições religiosas que avançam o Reino de Deus globalmente.

**Objetivo do ecossistema:** construir 9 aplicações web interconectadas em um monorepo, cobrindo toda a operação organizacional — desde submissão de projetos missionários até gestão financeira, tarefas internas e hospedagem em flats.

**Público-alvo:** ~150 usuários ativos (acesso esporádico, ~1x/mês para relatórios/documentos). Inclui 2 super_admins, 7 diretores, 2 conselheiros, colaboradores internos, pastores/missionários (submissores) e alunos.

**Desenvolvedor:** Filipe Honório (solo dev, apoiado por agentes IA via Claude Code).

**Metodologia:** Spec-Driven Development (SDD) — frontend-first com validação da diretoria entre blocos UI e backend.

**Landing page (www.hebronaseec.com.br):** fora do escopo — construída por fornecedor externo (Revelatio).

---

## 2. Stack tecnológica

### Frontend

- **Framework:** Next.js 15 (App Router, React Server Components)
- **Linguagem:** TypeScript 5.6+ (strict mode, zero `any`)
- **Estilização:** Tailwind CSS v4 (CSS variables, sem config file)
- **Componentes:** shadcn/ui fork customizado em `packages/ui` (não usar vanilla)
- **Formulários:** React Hook Form + Zod (schemas compartilhados client/server)
- **Estado servidor:** TanStack Query v5 (quando necessário; preferir RSC + Server Actions)
- **Tabelas:** TanStack Table v8
- **Ícones:** Lucide React
- **Tipografia:** Parkinsans (chamadas/títulos) + Titillium Web (UI/corpo) via `next/font`, seguindo estritamente o manual de identidade visual

### Backend e banco de dados

- **Banco:** PostgreSQL 16 via Supabase (1 cluster compartilhado, schemas separados por app)
- **ORM:** Drizzle ORM (migrations em TypeScript, suporte nativo a RLS)
- **API:** Next.js Route Handlers + Server Actions via `next-safe-action` (sem servidor backend separado)
- **Realtime:** Supabase Realtime (Postgres CDC + Broadcast)
- **Background jobs:** Inngest (free tier 50k executions/mês)
- **Cache:** Upstash Redis (free tier 10k req/dia)

### Autenticação e segurança

- **Provider:** Supabase Auth
- **Métodos (v1):** Email + senha, Magic Link (sem Google OAuth na v1)
- **MFA:** TOTP obrigatório (bloqueante — enrollment forçado no primeiro login, P-1.26 / PATCH-005) para `super_admin` e `diretor`; opcional para demais
- **SSO:** Cookies no domínio raiz `.hebronaseec.com.br` — login canônico em `app.hebronaseec.com.br/login`
- **Autorização:** RBAC (`public.role_assignments`) + RLS em toda tabela (DENY by default)

### Storage e CDN

- **Documentos/anexos:** Supabase Storage (RLS integrado, signed URLs)
- **Vídeos (Plataforma):** Bunny.net Stream (HLS adaptativo)
- **Áudio (Rádio):** Cloudflare R2 (sem custo de egress) + Bunny CDN
- **Imagens:** Supabase Storage + Next.js Image + Cloudflare edge

### Comunicação

- **Email transacional:** Resend + React Email (templates editáveis no Admin)
- **Notificações (v1):** in_app + email apenas (push e SMS removidos da v1)

### IA

- **Triagem/scoring de projetos:** OpenAI GPT-4.1 (critérios configuráveis no Admin)
- **Embeddings:** OpenAI text-embedding-3-small + pgvector — **v1** para detecção de duplicidade de projetos (P-2.14 / PATCH-012); **v2+** para busca semântica (Plataforma/Documentos)
- **Geração de código:** Claude Sonnet 4.6 (padrão); Opus 4.6 (prompts complexos)

### Observabilidade

- **Erros:** Sentry (5k events/mês free)
- **Logs:** Axiom (500GB/mês free) ou Vercel Log Drains
- **Métricas:** PostHog Cloud EU (1M events/mês free)
- **Uptime:** Better Stack (10 monitores free)
- **Web Vitals:** Vercel Analytics

### Monorepo e DevOps

- **Gerenciador:** pnpm 9 + Turborepo 2
- **Deploy:** Vercel (9 projetos separados, 1 conta Pro)
- **CI/CD:** GitHub Actions (lint, test, typecheck)
- **Feature flags:** tabela `admin.feature_flags` + cache Upstash (nível técnico apenas; controles de negócio são configuráveis explícitos)
- **Secrets:** Vercel Env Vars + Supabase Vault

### Custo mensal estimado (~500 usuários)

Vercel Pro $20 + Supabase Pro $25 + Bunny.net $5-15 + Resend Pro $20 + Cloudflare R2+DNS $5 + Sentry $26 (opcional) + IA ~$30 variável = **~$110-140/mês**

---

## 3. Arquitetura

### Topologia de subdomínios

| App        | Subdomínio                    |
| ---------- | ----------------------------- |
| Admin      | admin.hebronaseec.com.br      |
| Projetos   | projetos.hebronaseec.com.br   |
| Plataforma | plataforma.hebronaseec.com.br |
| Rádio      | radio.hebronaseec.com.br      |
| Financeiro | financeiro.hebronaseec.com.br |
| Intranet   | app.hebronaseec.com.br        |
| Documentos | docs.hebronaseec.com.br       |
| Flats      | flats.hebronaseec.com.br      |
| Tarefas    | tarefas.hebronaseec.com.br    |

### Estrutura do monorepo

```
hebron-aseec/
├── apps/{admin,projetos,plataforma,radio,financeiro,intranet,documentos,flats,tarefas}/
├── packages/{ui,db,auth,email,validators,ai,config,types}/
└── tooling/{eslint-config,typescript-config}/
```

### SSO cross-platform

Middleware detecta ausência de cookie → redireciona para `app.hebronaseec.com.br/login?return_to=...` → Supabase grava cookies com `Domain=.hebronaseec.com.br` → redirect de volta autenticado.

### Modelo de permissões (RBAC + RLS)

Três camadas obrigatórias, nunca apenas uma:

1. **Middleware Next.js** — bloqueia rota antes de renderizar
2. **Server Action / Route Handler gates** — valida ação específica
3. **RLS no Postgres** — última linha de defesa

> ✅ **Decisão tomada — opção B (PATCH-004):** as Server Actions conectam como `authenticated`, propagando o JWT do usuário (claims de papel) via o client de sessão do kit compartilhado (`@hebron/auth`, P-0.8) — nunca `DATABASE_URL` superuser. A RLS (camada 3) é, de fato, a última linha de defesa também nas actions (defense-in-depth real). Implementado em P-0.10 (grants por schema + correção de policies problemáticas) e obrigatório para todo prompt de Bloco B via G6 (`PROMPTS.md`).

### Papéis (independentes, não hierárquicos)

| Papel         | Escopo                          | Apps                                                                                |
| ------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| `super_admin` | Global, pode impersonar         | Todos                                                                               |
| `diretor`     | Conselho diretor                | Admin (leitura), Projetos, Financeiro, Intranet, Documentos, Flats, Tarefas         |
| `conselheiro` | Conselho consultivo             | Intranet, Documentos                                                                |
| `colaborador` | Equipe interna                  | Tarefas (criar), Intranet (limitado), Plataforma, Documentos, Financeiro (limitado) |
| `submissor`   | Externo (pastores/missionários) | Projetos, Plataforma, Documentos públicos, Rádio                                    |
| `aluno`       | Externo                         | Plataforma                                                                          |
| `hospede`     | Externo                         | Flats (próprias reservas)                                                           |
| `ouvinte`     | Anônimo                         | Rádio, Documentos públicos                                                          |

Múltiplos papéis por usuário permitidos (com verificação de conflito).

### Designações especiais (não são papéis)

- **Diretor Gestor:** aprovações financeiras, aprovação de flats, preside reuniões mensais, registra decisões de projetos pontuais
- **Diretor Autorizador:** autoriza pagamentos no banco (nunca o mesmo que aprovou)
- **Diretor Avaliador:** designado para avaliar projetos anuais (mix sistema + admin manual)

### Conflitos de interesse

- Diretores/conselheiros: NÃO podem submeter projetos NEM hospedar-se nos flats
- Diretores/conselheiros: PODEM acessar Plataforma, Rádio, Documentos como consumidores
- Super_admins: podem fazer tudo (inclusive submeter projetos em nome de terceiros)

---

## 4. Convenções de código

### Nomenclatura

- Arquivos e pastas: `kebab-case`
- Componentes React: `PascalCase`
- Funções/variáveis: `camelCase`
- Tipos/interfaces: `PascalCase`
- Tabelas/colunas DB: `snake_case`
- Schemas DB: nome do módulo (ex.: `projetos`, `financeiro`, `admin`)

### Server Actions

- Usar `next-safe-action` com schema Zod para validação
- Schemas Zod compartilhados em `packages/validators`

### Componentes

- Fork customizado em `packages/ui` — nunca usar shadcn vanilla diretamente
- Componentes compostos: `PageHeader`, `EmptyState`, `ErrorState`, `LoadingState`, `AppShell`

### Estilização

- Tailwind v4 com design tokens via CSS variables em `tokens.css`
- Sem `tailwind.config.js` (v4 usa CSS nativo)

### Email

- Templates React Email em `packages/email`
- Textos editáveis no Admin (nunca hardcoded)

### Testes

- Lint e types devem passar em todo prompt
- RLS testado por prompt de integração

### Storage (Supabase Storage — P-0.12)

Todo bucket é privado (`public = false`); nenhuma leitura acontece por URL direta — sempre signed URL (upload: `createSignedUploadUrl`; leitura: `createSignedUrl`) ou via service role no servidor. `storage.objects` tem RLS própria por bucket, além do controle na Server Action — mesma regra de "nunca uma única camada" do resto do sistema.

| Bucket                | Conteúdo                                                             | Path                                 | Quem lê / quem escreve                                                                                                                                                        | Retenção                         |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `hebron-docs`         | PDF de documentos/editais                                            | `documents/{author_id}/{uuid}.{ext}` | Leitura segue a visibilidade do documento pai (`public`/`internal`/`restricted`, igual à RLS de `documentos.documents`); escrita: super_admin/diretor/conselheiro/colaborador | Padrão (segue o documento)       |
| `project-attachments` | Anexos de propostas e de relatórios (Projetos)                       | `{uploaded_by}/{uuid}.{ext}`         | Dono lê/escreve a própria pasta; super_admin/diretor/conselheiro leem tudo                                                                                                    | Padrão                           |
| `financeiro-extratos` | Extrato bancário original (import de conciliação)                    | `{bank_account_id}/{uuid}.{ext}`     | super_admin/diretor/colaborador leem e escrevem; **sem UPDATE/DELETE**                                                                                                        | **5 anos** (decisão F3-Q6)       |
| `financeiro-recibos`  | NF/comprovantes/recibos anexados a payables/receivables/transactions | `{uploaded_by}/{uuid}.{ext}`         | super_admin/diretor/colaborador leem; super_admin/colaborador escrevem; DELETE só super_admin                                                                                 | **5 anos** (mesma decisão F3-Q6) |
| `flats-documentos`    | Documento de identidade/comprovantes do hóspede (PII sensível)       | `{user_id}/{uuid}.{ext}`             | Dono lê/escreve a própria pasta; super_admin/diretor leem tudo                                                                                                                | Padrão                           |
| `plataforma-capas`    | Imagem de capa de curso                                              | `{course_id}/{uuid}.{ext}`           | Qualquer autenticado lê; só super_admin escreve                                                                                                                               | Padrão                           |

Convenção de signed URL: prazo curto para uso imediato (1h, ex. `hebron-docs`), prazo longo apenas quando o link é salvo e reaberto depois (ex. anexos de projeto, 1 ano) — nunca usar signed URL para o que exige retenção legal de 5 anos (expiraria antes; guardar o **path** do Storage e gerar a signed URL sob demanda na leitura, como `financeiro.bank_imports.file_url`/`financeiro.attachments.file_url` já fazem).

`flats-documentos` e `plataforma-capas` são fundação antecipada (Fases 6 e 7 ainda não rodaram): usam apenas os papéis globais já existentes; P-6.4/P-6.8 e P-7.4/P-7.6 devem apertar o controle (por curso/reserva) quando as tabelas de app existirem.

---

## 5. Design system

### Fonte única da verdade (REGRA INVIOLÁVEL)

Todo o estilo visual compartilhado vive em **`packages/ui`**. O arquivo **`packages/ui/src/tokens.css`** é a **única** definição de tokens do ecossistema, usando o **vocabulário `--hb-*` + semânticos** (abaixo).

- **PROIBIDO** criar um `<app>.css` (ou qualquer CSS de app) que redefina cores/tipografia da marca. Componentes e classes visuais recorrentes (`.hb-card`, `.hb-stat`, `.hb-balao`, etc.) vivem em `packages/ui`, não em cada app.
- **PROIBIDO** escrever cor em hex no código de app (ex.: `#202c85`, `style={{color:'#07b4e7'}}`). Sempre usar o token (`var(--hb-blue)` / classe Tailwind mapeada ao token).
- Cada app só injeta as fontes via `next/font` no seu `layout.tsx` e importa `@hebron/ui`.

### Tokens canônicos de cor (`--hb-*`)

| Token                               | Hex                   | Uso                                                                          |
| ----------------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| `--hb-blue`                         | `#202C85`             | Primário (Pantone Blue 072 C) — superfícies de marca, títulos                |
| `--hb-blue-deep` / `--hb-blue-soft` | `#19236A` / `#2A38A0` | press / hover sobre azul                                                     |
| `--hb-orange`                       | `#EA5A06`             | Accent (Pantone Orange 021 C) — CTA, destaques quentes                       |
| `--hb-orange-deep`                  | `#C24A03`             | press laranja                                                                |
| `--hb-green`                        | `#A1C520`             | Suporte (Pantone 2291 C) — destaque "vida/missão", nunca superfície primária |
| `--hb-cyan`                         | `#07B4E7`             | Suporte (Pantone 306 C) — destaque "fé/evangelho"                            |
| `--hb-cream`                        | `#F7F8FC`             | superfície off-white (fundo de páginas)                                      |
| `--hb-gray-50/100/200/400/600`      | —                     | escala de neutros (borda → texto)                                            |
| `--hb-ink`                          | `#131737`             | near-black com viés azul — texto sobre claro                                 |

**Tokens semânticos** (preferir estes nos componentes): `--bg`, `--bg-alt`, `--bg-invert`, `--surface`, `--surface-alt`, `--fg`, `--fg-muted`, `--fg-subtle`, `--fg-invert`, `--brand`, `--brand-fg`, `--accent`, `--highlight-warm/cool/life`, `--border`, `--border-strong`, `--divider`.

> A definição completa (escala tipográfica, radii, sombras, motion, classe `.hb-balao`) está em `design-refs/admin/hebron-tokens.css` e foi adotada como base de `packages/ui/src/tokens.css`.

### Tipografia

- **Chamadas e títulos:** **Parkinsans** (`--font-display`) — geométrica, enérgica, humana, acolhedora. Fonte variável (300–800).
- **UI e corpo de texto:** **Titillium Web** (`--font-body`) — flexível, multi-peso, mesma fonte da marca-mãe Hebron.
- **PROIBIDO** usar Inter / Source Serif 4 (especificação antiga, revogada). Carregar as duas via `next/font` em cada `layout.tsx`; os `.ttf` originais estão em `.docs/.assets/`.

### Elementos de marca (usar onde a referência indicar)

- **Balão** (`.hb-balao`): forma-assinatura (retângulo arredondado + cauda), derivada do símbolo. Variantes de cor `--orange/--green/--cyan/--white`.
- **Círculos** (moléculas/células/pessoas): elemento gráfico de apoio em fundos e cards.
- **Eyebrow**: rótulo curto em maiúsculas com tracking largo, em azul, acima de títulos.

### Referências visuais por app

- Protótipos de alta fidelidade (Claude Design) ficam em **`design-refs/<app>/`** (versionado no repo). Hoje: `admin`, `documentos`, `financeiro`. Os demais chegam conforme gerados.
- **Todo prompt de UI (Bloco A)** deve consultar `design-refs/<app>/` se existir e replicar com fidelidade, traduzindo para `@hebron/ui` + Tailwind + tokens canônicos. Ver procedimento mecânico em `PROMPTS.md` › "Instruções Globais".
- Em conflito entre protótipo visual e regra de negócio → **BRAIN.md vence**.

### Princípios visuais (fugir do "cara de IA")

- Paleta com personalidade (não apenas slate + indigo) — usar a paleta Hebron.
- Microcopy revisado por humano — evitar "vamos lá!", "incrível!" e exclamações genéricas.
- Espaçamento generoso, animações sutis (não cinemáticas).
- Estados vazios com citações bíblicas pertinentes ao contexto institucional.
- Fork shadcn aplica tipografia e tokens próprios para não parecer template vanilla.

### Referência completa

→ `.docs/Identidade Visual da Hebron Aseec.md` (manual de marca) · `design-refs/` (protótipos) · `packages/ui/src/tokens.css` (tokens implementados)

---

## 6. Regras de negócio por módulo

### 6.1. Admin

- Cadastro unificado com aprovação (auto-signup + aprovação por super_admin)
- Suspensão granular por módulo (pode perder acesso a Projetos mas manter Plataforma)
- **Impersonação (ESSENCIAL):** super_admin assume identidade com banner persistente + log obrigatório — usado para suporte telefônico sem AnyDesk
- Convites por email com expiração
- Reuniões: auto-cria reunião mensal na 1ª quarta-feira; super_admin pode editar datas
- Audit logs pesquisáveis com filtros avançados (replay é v2+)
- Templates de email com texto definido no Admin, editáveis
- Feature flags são técnicas (deploys seguros); controles de negócio são configuráveis explícitos

### 6.2. Projetos (módulo mais complexo)

**Dois tipos de projeto:**

- **Pontual:** emergencial, avaliado mensalmente, formulário simplificado (6 campos obrigatórios), consenso presencial, sem parcelas (pagamento único, mas diretores podem dividir na aprovação)
- **Anual:** submissão em janela definida (datas no Admin), formulário estruturado completo, workflow de avaliação → votação → homologação

**Ciclo de vida (mesmo para ambos):**
`rascunho → validação → votação → homologação (7 dias) → aprovado/reprovado → em execução → concluído`

**Votação (projetos anuais):**

- Participantes: diretores + conselheiros
- Pergunta: "Você sente paz em investir neste projeto?"
- Voto **SECRETO** (ninguém vê quem votou o quê)
- Quórum: ≥50% dos diretores + conselheiros (contagem por **pessoa distinta**, não por atribuição — PATCH-007)
- Aprovação: maioria simples
- Sem quórum: votação estendida; super_admin pode acionar "botão de pânico" (maioria + 1 dos votos existentes)
- Encerramento manual: super_admin pode encerrar a votação a qualquer momento, aplicando o resultado apurado até então — mecanismo geral, distinto do "botão de pânico" acima, que só se aplica à falta de quórum (PATCH-007)

**Homologação:**

- 7 dias para contestação por qualquer diretor/conselheiro
- Máximo 2 contestações por projeto, cada pessoa pode contestar 1 vez
- Contestação retorna projeto para votação

**Avaliação:**

- Designação: mix de sugestão do sistema (afinidade: região, categoria, histórico) + atribuição manual do admin
- Avaliador vê projeto apenas na fase de votação
- Opinião (sim/não + texto) visível a outros diretores; voto NÃO
- Pode votar antes ou durante a reunião

**Orçamento e instituições:**

- Orçamento definido por instituição, por ano-calendário (jan-dez), no Financeiro (tabela `financeiro.organization_budgets` + UI de gestão — P-3.8b / PATCH-009; substitui o workaround anterior em `admin.system_settings`)
- Sistema bloqueia submissão se total excede orçamento (mensagem: "Contate o administrador")
- Instituições sem orçamento: sem teto, mas IA identifica desvios e influencia score
- Submissor pode estar vinculado a múltiplas instituições (N:N)
- Auto-signup com fluxo de aprovação: cria conta → seleciona/cria instituição → super_admin aprova

**Relatórios e prestação de contas:**

- **Relatório:** formal, estruturado, narrativo — periodicidade padrão trimestral (configurável por projeto)
- **Prestação de contas:** informal/voluntária (fotos, vídeos, notas fiscais, recibos)
- Lembretes automáticos: 7 dias antes, na data, 7 dias antes do vencimento
- Inadimplência bloqueia pagamentos (super_admin pode sobrescrever)

**Pagamentos:**

- Submissor define: valor total, nº parcelas, meses de pagamento (máx. 12)
- Default: último dia útil de cada mês
- Criados automaticamente no Financeiro quando projeto aprovado
- Nascem NÃO aprovados (devem seguir fluxo de aprovação + autorização)

**IA (configurável no Admin):**

- Score visível apenas para super_admin, diretores, conselheiros (nunca para submissor)
- Versão compacta gerada por IA ao final da submissão (template configurável)
- Triagem: classificação, score de aderência, resumo executivo
- Detecção de duplicidade via embeddings (pgvector) — **v1**, P-2.14 (PATCH-012)
- Detecção de renovação: auto-preenche campos de projetos anteriores similares — **v1**, P-2.13 (PATCH-012)

**Renovação/continuação:** nova entrada vinculada via `parent_project_id`, preserva histórico, estágios resetam

**Exclusão:** soft-delete com justificativa obrigatória em qualquer estágio, gera eventos para todos os módulos

### 6.3. Plataforma (LMS)

- Curso piloto já pronto; outros em desenvolvimento
- Criação inicialmente por super_admin; estrutura pronta para papel `professor` futuro
- Acesso a todos os cursos para qualquer usuário registrado (sem restrição por papel)
- Plataforma gratuita, requer cadastro com aprovação
- **Certificação (v1):** automática (concluir trilha = certificado)
- Manuais (líder/liderado) são conteúdo de curso (não documentos avulsos)
- Busca simples (título, série, categoria) na v1
- Fóruns de discussão por aula (nice-to-have, incluir)
- Trilhas sequenciais (desbloqueia próxima aula após conclusão)
- v2+: busca semântica (pgvector), transcrição (Whisper), recomendações personalizadas, modo offline

### 6.4. Rádio (escopo drasticamente simplificado)

**O que a Rádio É:**

- Auto DJ 24/7 tocando sermões pré-gravados (.mp3)
- Armazenamento em Cloudflare R2 (migrar do Google Drive)
- Player simples com "tocando agora"
- PWA com background play
- Conteúdo organizado por autor e série

**O que a Rádio NÃO É (removido):**

- Sem DJs ao vivo, sem grade programada, sem podcasts, sem pedidos musicais
- Sem "estúdio aberto", sem WhatsApp
- Sem AzuraCast, Icecast ou VPS dedicada
- Sem live streaming

**Acesso:**

- Ouvir: sem cadastro
- Materiais exclusivos (downloads): cadastro + aprovação + aceite de termos (não redistribuir, não comercializar — aceito 1 vez por usuário)

**Tecnologia (v1):** Cloudflare R2 + Next.js API route para player server-side + Supabase Realtime para "tocando agora" + signed URLs para conteúdo exclusivo

### 6.5. Financeiro

**Escala:** 2 super_admins dedicados, possível 1 colaborador como gestor financeiro. Contabilidade/fiscal/RH terceirizados.

**Contas bancárias:** atualmente 1, expectativa de 2+ em breve. Rastreamento de saldo separado por conta.

**Plano de contas:** hierárquico em árvore, ainda não existe (precisa ser criado). Estrutura sugerida com defaults editáveis.

**Fontes de receita:** Hebron Farmacêutica (principal), aluguel de imóveis, doações pessoais (apenas diretores e conselheiros). **Sem doações Pix do público na v1.**

**Governança de despesas (regra inviolável):**

1. Sistema agrupa pagamentos automaticamente por semana
2. Email de lote enviado para diretor gestor (CC diretor autorizador)
3. Diretor gestor APROVA (1ª camada)
4. Super_admin inclui no banco
5. Super_admin avisa diretor autorizador (fora do sistema, WhatsApp)
6. Diretor autorizador AUTORIZA no banco — nunca o mesmo que aprovou (2ª camada)
7. Super_admin marca "pago" no sistema

- Designações (quem aprova, quem autoriza) configuráveis no Admin

**Conciliação bancária:** DOR REAL — atualmente manual. Importação OFX/CSV é necessidade do dia 1. Match automático por valor + data + descrição.

**Relatórios:** mensal com recibos exportado como PDF+XLSX+ZIP pelo super_admin. Relatórios financeiros automáticos mensais por email para diretores/conselheiros.

**Pagamentos de projetos:** criados automaticamente quando projeto aprovado, seguem mesma governança (aprovação + autorização).

**OCR (nice-to-have v1):** Google Document AI ou GPT-4 Vision para extrair valor, CNPJ, data de notas fiscais e sugerir categorização.

### 6.6. Intranet

- Dashboard executivo consolidando dados de todos os módulos
- KPIs iniciais: projetos ativos, alunos na Plataforma, doações do mês (soma das transações de receita lançadas na categoria "Doações" do plano de contas no mês corrente — P-5.1/P-5.8, PATCH-008), audiência da Rádio
- Produção de conteúdo: diretores/conselheiros fazem anúncios curtos (normal/importante/urgente); presidente de sessão registra decisões; super_admins elaboram conteúdo
- Relatórios financeiros automáticos mensais por email
- Diretório de membros (todos: diretores, conselheiros, colaboradores, submissores, parceiros)
- Calendário compartilhado (integração Google Calendar)
- Widgets configuráveis por usuário
- Busca unificada cross-app
- Briefing diário opcional (opt-in, frequência configurável)

### 6.7. Documentos

- Tipos: editais, documentos legais, fiscais, SOPs, descrições de cargo
- Volume: centenas de documentos, atualizações constantes
- Visibilidade: `public | internal | restricted` (restrito por papel, não per-user)
- Publicação: apenas super_admins (ou colaboradores com papel `editor`)
- Editais pontuais: permanentemente disponíveis; anuais: abrem e fecham
- Versionamento com histórico
- Integração com Projetos: botão "submeter projeto" no edital → pré-preenche tipo + categoria no wizard

### 6.8. Flats

**Unidades:** 2 apartamentos gratuitos em condomínio fechado (capacidade 6 pessoas cada, 2 quartos sendo 1 suíte)

**Elegibilidade:** pastores em exercício ministerial reconhecido, missionários em contexto transcultural, cônjuges de pastores/missionários. **Diretores/conselheiros NÃO podem se hospedar.**

**Regras de reserva:**

- Máximo 7 dias consecutivos por período de 12 meses (por INDIVÍDUO, não por instituição)
- Hóspede submete 3 PERÍODOS DE PREFERÊNCIA (faixas de data abertas, não blocos fixos de 7 dias)
- Diretor gestor escolhe com base em scoring + conflitos de calendário

**Scoring automático (máx. 75 pontos)** — corrigido em S-121: o critério d) perdeu o nível "com laudo" (10 pts) por exigir dado médico confidencial e virou binário (autodeclarado, 5/0); máximo real é 75, não 80 (ver `.docs/Respostas10.md` Q156):
a) Tempo de ministério: 1pt/ano, max 10 | b) Frequência de uso: nunca (10), >1 ano (5), <12 meses (0) | c) Localização: remota (10), periferia (5), centro (0) | d) Saúde: autodeclarada sim (5), não (0) — sem laudos nem dados confidenciais | e) Situação familiar especial: até 5 | f) Último descanso fora da cidade: >2 anos (10), 1-2 (5), <1 (0) | g) Intensidade ministerial: alta (10), média (5), baixa (0) | h) Carta de recomendação: sim (5), não (0) | i) Tipo de sustento: dependente (5), parcial (3), autossustentado (0) | j) Participação em projetos Hebron: sim (5), não (0) — auto-calculado

**Assistência de IA no scoring (v1, P-7.13 — PATCH-012):** para os critérios subjetivos (d — saúde autodeclarada, g — intensidade ministerial), o sistema sugere uma pontuação a partir do texto livre do formulário; o gestor sempre confirma ou ajusta antes de salvar — a IA nunca decide sozinha, e a pontuação final permanece 100% determinística pela tabela acima.

**Desempate:** 1) Idade (mais velho prioriza), 2) Mais tempo sem descanso fora, 3) Nunca usou flat, 4) Sorteio

**Auxílio opcional:** diária fixa + transporte (voo R$1.000/pessoa ou combustível). Aprovado caso a caso. Se aprovado, cria despesas no Financeiro automaticamente (data = dia anterior ao início da reserva).

**Check-in:** presencial na recepção do condomínio (sem smart locks ou check-in autônomo na v1).

**Semântica de período (P-7.6b):** períodos (preferências, `selected_period`, `usage_history.period`) são armazenados como `daterange` do Postgres com **`end` inclusivo no domínio** — o custom type (`packages/db/src/schema/flats.ts`) corrige na leitura a canonicalização exclusiva (`[start,end+1)`) que o Postgres aplica na gravação, devolvendo sempre o `end` inclusivo originalmente informado.

### 6.9. Tarefas

**Workspaces fixos:** Administrativo, Financeiro, Contábil e Fiscal, Eclesiástico, Comunicação, Tecnologia e Inovação

**Criação:** qualquer colaborador cria. Tarefas auto-geradas de outros módulos: super_admin atribui manualmente após criação.

**Diretores:** NÃO recebem tarefas operacionais. Recebem PEDIDOS DE APROVAÇÃO para avançar tarefas.

**Recorrências:** contas de consumo (mensal), IPTU (anual), checagem de limpeza do flat (semanal), convite Capelowski (mensal).

**Visualizações (coexistentes):** Kanban (drag-drop), Lista (filtrável), Árvore/Mind-map (estilo Xmind — cada pessoa = branch, sub-branches = tarefas)

**Features v1:** CRUD com prazos/responsáveis/etiquetas/prioridade, subtarefas com progresso agregado, comentários com @menções, anexos, notificações, recorrência flexível, templates configuráveis, modo foco (agenda do dia + pomodoro), time tracking opcional, atalhos de teclado (Cmd+K)

---

## 7. Integrações cross-app

| Origem → Destino      | Mecanismo                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Projetos → Financeiro | Aprovação cria centro de custo + orçamento; cria pagamentos automáticos (nascem não aprovados) |
| Financeiro → Projetos | Query cross-schema em tempo real: executado vs. orçado                                         |
| Tarefas → Projetos    | Submissão cria checklist padrão de análise                                                     |
| Plataforma → Intranet | Métricas de progresso dos alunos no dashboard                                                  |
| Rádio → Intranet      | Audiência e "tocando agora" no dashboard                                                       |
| Flats → Tarefas       | Reserva confirmada gera tarefas de limpeza (pré e pós-estadia)                                 |
| Flats → Financeiro    | Auxílio aprovado cria despesas automáticas (data = dia antes da reserva)                       |
| Admin → Todos         | Push de configurações globais (logos, textos, feature flags)                                   |
| Documentos → Projetos | Edital com botão "submeter projeto" → pré-preenche wizard                                      |
| Intranet → Tarefas    | Action items de reunião viram tarefas                                                          |

**Regra geral:** dados via banco (foreign keys cross-schema), eventos via Supabase Realtime + Postgres triggers + Inngest para reações assíncronas.

### Jobs (Inngest — P-0.14)

`packages/jobs` é o client Inngest único do monorepo (`inngest.createFunction`
por cron) — a rota de serve vive em `apps/intranet/src/app/api/inngest/route.ts`
(um único app host; qualquer app poderia expor a rota, a intranet foi
escolhida por já tocar admin/documentos/projetos). A lógica de cada job vive
em `packages/jobs/src/crons/<módulo>.ts`, nunca em código de app — jobs
rodam sem sessão HTTP, então não podem reusar Server Actions (que dependem
de `cookies()`); a lógica compartilhada com a action manual (quando existe,
ex. reunião mensal) foi extraída para `packages/db` (`meetings.ts`,
`projetos-approval.ts`), consumida tanto pela action quanto pelo cron.

**Ator sistema** (`packages/db/src/system-actor.ts`, `getSystemActorId`):
mutações automáticas (aprovação automática de projeto, criação de reunião)
ainda precisam de um `actorId` real — `admin.audit_log.actor_id` é
`NOT NULL` com FK para `public.users`, e a RLS (decisão B, P-0.10) só
autoriza escrita para quem tem papel em `public.role_assignments`. Um
usuário real (`sistema@hebronaseec.org.br`, criado via Admin API,
get-or-create idempotente, papel `super_admin`) representa "o sistema" nesses
casos — nunca loga (sem uso de senha), existe só para ser referenciado.

**Catálogo** (`packages/jobs/src/catalog.ts`, `PLANNED_JOBS`): jobs cuja
lógica de negócio ainda não existe (financeiro P-3.10, tarefas P-4.8,
intranet P-5.8/5.10, flats P-7.10, rádio P-8.11) ficam documentados ali —
nome, cron planejado, prompt que os desbloqueia — em vez de uma função
Inngest vazia. Todo prompt que implementar um desses deve registrar a
função real em `src/crons/` e remover a entrada correspondente do catálogo.

### Cross-app (`packages/integrations` — P-0.15)

**Regra:** um app (`apps/<nome>`) nunca importa código de outro app —
nenhum app expõe `exports` em `package.json` para ser consumido como lib
(confirmado por grep em P-0.14), e um import relativo que atravessa para
`apps/<outro>/` reproduz o acoplamento que a auditoria (CS-6/S1-09)
encontrou entre Projetos e os módulos ainda não construídos (Tarefas,
Flats). Toda função tipada consumida por mais de um app vive em
`packages/integrations`, nomeada pela relação que implementa
(`<origem>-<destino>.ts`, ex. `documentos-projetos.ts`,
`projetos-flats.ts`, `projetos-tarefas.ts`) — nunca dentro de
`apps/<origem>/src/lib/integrations/`. Verificação: `pnpm
check:cross-app-imports` (script em `scripts/`, roda no CI) falha o build
se algum import relativo escapar da própria pasta do app.

Quando o módulo destino ainda não existe (ex. `createAutoTask`, que nasce
com Tarefas na Fase 4), a função entra como stub documentado em
`packages/integrations` — mesma convenção do catálogo de jobs: registrar a
lógica esperada em vez de uma implementação vazia que passaria por pronta.

**Configuração cross-app:** `admin.system_settings`/`admin.feature_flags`
(escritos pelo Admin, `apps/admin/src/actions/settings.ts`) são lidos por
qualquer app/job via `@hebron/db/settings` (`getSystemSetting`,
`getFeatureFlag`, `isFeatureEnabled`) — cache curto em memória por processo
(TTL 30s) para não virar round-trip ao banco em todo caminho crítico, sem
atrasar mais que segundos a propagação de uma mudança feita no Admin.

**Padrão de erro (S1-22):** integração de **leitura** (ex. `getEditalPrefill`)
pode degradar — retorna `null`/vazio e o chamador loga de forma
estruturada (`console.error("[contexto] ...")`), nunca lança sem contexto.
Integração de **mutação crítica** (ex. `onProjectSubmitted` quando deixar
de ser stub) nunca roda fire-and-forget (`.catch(console.error)` solto,
sem `await`) — o chamador sempre dá `await` e decide explicitamente se o
erro aborta a operação principal ou só é logado; "fogo e esquece" escondeu
falhas reais no código pré-auditoria (S-43).

---

## 8. Escopo v1 vs v2+

### Mantido na v1

- OCR para notas fiscais
- Conciliação bancária com importação OFX/CSV (PRIORIDADE — dor real)
- Impersonação auditada (ESSENCIAL — suporte por telefone)
- IA: scoring, versão compacta, triagem
- IA: detecção de renovação de projetos (P-2.13, PATCH-012)
- IA: detecção de duplicidade de projetos via embeddings/pgvector (P-2.14, PATCH-012) — não confundir com a busca semântica da Plataforma/Documentos, que segue v2+ (ver "Removido da v1" abaixo)
- IA: assistência de sugestão de pontuação nos critérios subjetivos do scoring de Flats, com confirmação do gestor — nunca decide sozinha (P-7.13, PATCH-012); pontuação final 100% determinística (§6.8)
- Templates de email editáveis com IA
- MFA TOTP obrigatório (bloqueante, com tela de enrollment no primeiro login) para super_admin e diretores (P-1.26, PATCH-005)
- Migração de usuários do sistema legado (P-9.0)
- Modo foco com pomodoro (Tarefas)
- Time tracking (Tarefas)
- Fóruns de discussão (Plataforma)
- Quizzes como tipo de aula, certificado com hash de verificação pública, notas pessoais em timestamp de vídeo (Plataforma) — mantidos, com semântica definida (PATCH-010)

### Removido da v1 (deferido para v2+)

- Doações Pix do público
- Busca semântica / pgvector (Plataforma/Documentos) — embeddings para detecção de duplicidade de projetos é caso à parte, promovido a v1 (ver "Mantido na v1" acima, PATCH-012)
- Transcrição automática Whisper
- Recomendações personalizadas
- Modo offline (exceto PWA Rádio)
- AzuraCast / VPS / Icecast / live streaming
- Open Finance
- Audit replay (apenas busca de logs)
- DJs ao vivo, podcasts, pedidos musicais (Rádio)
- Smart locks / check-in autônomo
- SMS, push notifications, Google OAuth
- Operações em lote de usuários

### Descartado (scope creep sem base no BRAIN — decisão D-5, PATCH-011)

Diferente do "removido/deferido" acima, os itens abaixo não ficam para v2+ — foram rejeitados porque contradiziam regra já definida no BRAIN ou exigiam modelagem que nenhum prompt criava:

- Workspaces customizáveis além dos 6 fixos (Tarefas) — contradiz §6.9 ("workspaces fixos"); exigiria modelo de membership/acesso que nenhum prompt cria
- Colunas customizáveis por workspace (Tarefas) — conflita com os 4 status fixos definidos em §6.9
- Checklist de inventário no check-in dentro do sistema (Flats) — check-in é presencial na recepção (§6.8); o sistema registra só a transição de status + timestamp

---

## 9. Checklists

### Antes de cada prompt

- [ ] BRAIN.md carregado no contexto
- [ ] Prompt atual do PROMPTS.md lido
- [ ] Pré-condições verificadas (branch, dependências, env vars)
- [ ] Apenas arquivos permitidos serão criados/editados

### Antes de concluir cada prompt

- [ ] TypeScript strict (zero `any`)
- [ ] RLS em toda tabela nova
- [ ] Zod validation em todo input
- [ ] Responsivo (mobile-first)
- [ ] LGPD compliance (consentimento granular, "Meus Dados")
- [ ] Audit log em mutações críticas
- [ ] Lint passa
- [ ] Types passam
- [ ] Testes verdes (quando aplicável)

### LGPD — fundação (P-0.13)

Resolve o conflito, identificado em auditoria (S1-03/F3-09), entre o
princípio de imutabilidade abaixo ("nunca hard delete") e o direito de
exclusão da LGPD (art. 18, VI — decisão F1-Q4: cumprir a lei). **Exclusão
real não é hard delete de linha — é anonimização de campo**: os dados de
identificação pessoal são substituídos por um pseudônimo determinístico; a
linha, as FKs e os registros institucionais vinculados ao usuário
(transações, votos, pareceres, relatórios) permanecem íntegros e
auditáveis sob o pseudônimo. Isso cumpre a lei (o titular deixa de ser
identificável) sem quebrar a auditabilidade dos atos da organização.

- **Consentimento** (`public.consents`, P-0.13): granular por finalidade —
  `comunicacao`, `newsletter`, `dados_reserva`, `dado_saude` — uma linha
  por (usuário, finalidade), revogável a qualquer momento pelo próprio
  titular (revogação é `granted = false`, nunca remoção de linha). Toda
  coleta de dado sensível (ex.: saúde autodeclarada no Flats, §6.8) exige
  consentimento específico e destacado antes do envio do formulário —
  nunca implícito num aceite geral de termos.
- **PII em audit diffs:** `computeDiff`/`logAudit`
  (`packages/db/src/audit.ts`) redigem automaticamente os campos da lista
  `SENSITIVE_AUDIT_FIELDS` (e-mail, nome, telefone, CPF, responsável
  legal) — o `admin.audit_log` (imutável, particionado até 2027) registra
  que o campo mudou, nunca o valor antes/depois. Todo prompt que adicionar
  um campo de PII a qualquer schema deve incluir o nome do campo nessa
  lista.
- **Anonimização** (`packages/db/src/anonymization.ts`, função
  `anonymizeUser`): a primitiva usada pelo fluxo de exclusão "Meus Dados"
  (P-9.2). Substitui a PII em `public.users` e o `responsavel_legal` das
  organizações criadas pelo usuário por um pseudônimo; redige os diffs de
  `admin.audit_log` referentes a esse usuário/organizações que ainda
  guardem valor bruto; grava uma entrada `user.anonymized` no próprio
  audit log. Não remove linhas, não revoga papéis/designações, não toca em
  `auth.users` — desativar o login faz parte do fluxo de exclusão
  fim-a-fim de P-9.2, não desta primitiva.
- **Retenção de dado comportamental** (`documentos.views`, F3-21):
  visualizações individuais (usuário + timestamp) são agregadas
  mensalmente por documento (`documentos.views_monthly_agg`) e as linhas
  individuais com mais de 6 meses são apagadas por
  `documentos.purge_old_views()` (pg_cron mensal) — mantém a contagem de
  leitura para métricas editoriais sem reter o rastro comportamental
  pessoal indefinidamente.

### Princípios invioláveis

- **Sem suposições:** sempre perguntar ao Filipe sobre regras de negócio
- **Simplicidade:** público-alvo em transição tecnológica — interfaces simples
- **Não parecer IA:** usar design system, tipografia editorial, microcopy humano
- **Imutabilidade:** soft-delete e estornos, nunca hard delete; audit trails em tudo. **Exceção legal:** exclusão LGPD é anonimização de PII (ver "LGPD — fundação" acima), nunca hard delete de linha
- **Governança dual:** aprovação + autorização (duas pessoas, duas camadas) para decisões financeiras
- **Defense in depth:** RBAC + RLS sempre, nunca apenas um
- **Frontend-first:** UI com mocks → validação com diretoria → backend

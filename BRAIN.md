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
- **MFA:** TOTP obrigatório para `super_admin` e `diretor`; opcional para demais
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
- **Embeddings (v2+):** OpenAI text-embedding-3-small + pgvector
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

> ⚠️ **Decisão técnica pendente (RLS x conexão superuser):** hoje as Server Actions conectam via `DATABASE_URL` (superusuário Postgres), o que **bypassa RLS** — o RBAC fica só no gate da action (camadas 1 e 2). Ou seja, a camada 3 (RLS) protege apenas acesso direto/cliente (PostgREST/anon key), não as actions. Há duas posturas possíveis, a decidir com o Filipe (auditar em P-9.1):
>
> - **(A)** Manter conexão superuser nas actions (mais simples) e ser honesto no modelo de ameaça: RLS protege o canal direto, gates protegem as actions. Documentar e garantir que **nenhuma** action pule o gate de RBAC.
> - **(B)** Fazer as actions conectarem como `authenticated` propagando o JWT (claims de papel), de modo que a RLS seja de fato a última linha de defesa mesmo nas actions (defense-in-depth real). Mais trabalho; exige repassar o token do usuário ao client Postgres.

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

| Bucket                 | Conteúdo                                          | Path                          | Quem lê / quem escreve                                                         | Retenção                       |
| ---------------------- | -------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------- | ------------------------------- |
| `hebron-docs`           | PDF de documentos/editais                         | `documents/{author_id}/{uuid}.{ext}` | Leitura segue a visibilidade do documento pai (`public`/`internal`/`restricted`, igual à RLS de `documentos.documents`); escrita: super_admin/diretor/conselheiro/colaborador | Padrão (segue o documento)      |
| `project-attachments`   | Anexos de propostas e de relatórios (Projetos)    | `{uploaded_by}/{uuid}.{ext}`   | Dono lê/escreve a própria pasta; super_admin/diretor/conselheiro leem tudo      | Padrão                          |
| `financeiro-extratos`   | Extrato bancário original (import de conciliação) | `{bank_account_id}/{uuid}.{ext}` | super_admin/diretor/colaborador leem e escrevem; **sem UPDATE/DELETE**            | **5 anos** (decisão F3-Q6)      |
| `financeiro-recibos`    | NF/comprovantes/recibos anexados a payables/receivables/transactions | `{uploaded_by}/{uuid}.{ext}`   | super_admin/diretor/colaborador leem; super_admin/colaborador escrevem; DELETE só super_admin | **5 anos** (mesma decisão F3-Q6) |
| `flats-documentos`      | Documento de identidade/comprovantes do hóspede (PII sensível) | `{user_id}/{uuid}.{ext}`     | Dono lê/escreve a própria pasta; super_admin/diretor leem tudo                  | Padrão                          |
| `plataforma-capas`      | Imagem de capa de curso                           | `{course_id}/{uuid}.{ext}`     | Qualquer autenticado lê; só super_admin escreve                                | Padrão                          |

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
- Quórum: ≥50% dos diretores + conselheiros
- Aprovação: maioria simples
- Sem quórum: votação estendida; super_admin pode acionar "botão de pânico" (maioria + 1 dos votos existentes)

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

- Orçamento definido por instituição, por ano-calendário (jan-dez), no Financeiro
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
- Detecção de duplicidade via embeddings (pgvector)
- Detecção de renovação: auto-preenche campos de projetos anteriores similares

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
- KPIs iniciais: projetos ativos, alunos na Plataforma, doações do mês, audiência da Rádio
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

**Scoring automático (máx. 80 pontos):**
a) Tempo de ministério: 1pt/ano, max 10 | b) Frequência de uso: nunca (10), >1 ano (5), <12 meses (0) | c) Localização: remota (10), periferia (5), centro (0) | d) Saúde: autodeclarada sim (5), não (0) — sem laudos nem dados confidenciais | e) Situação familiar especial: até 5 | f) Último descanso fora da cidade: >2 anos (10), 1-2 (5), <1 (0) | g) Intensidade ministerial: alta (10), média (5), baixa (0) | h) Carta de recomendação: sim (5), não (0) | i) Tipo de sustento: dependente (5), parcial (3), autossustentado (0) | j) Participação em projetos Hebron: sim (5), não (0) — auto-calculado

**Desempate:** 1) Idade (mais velho prioriza), 2) Mais tempo sem descanso fora, 3) Nunca usou flat, 4) Sorteio

**Auxílio opcional:** diária fixa + transporte (voo R$1.000/pessoa ou combustível). Aprovado caso a caso. Se aprovado, cria despesas no Financeiro automaticamente (data = dia anterior ao início da reserva).

**Check-in:** presencial na recepção do condomínio (sem smart locks ou check-in autônomo na v1).

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

---

## 8. Escopo v1 vs v2+

### Mantido na v1

- OCR para notas fiscais
- Conciliação bancária com importação OFX/CSV (PRIORIDADE — dor real)
- Impersonação auditada (ESSENCIAL — suporte por telefone)
- IA: scoring, versão compacta, triagem, detecção de renovação
- IA: scoring de flats (critérios subjetivos)
- Templates de email editáveis com IA
- MFA TOTP para super_admin e diretores
- Migração de usuários do sistema legado
- Modo foco com pomodoro (Tarefas)
- Time tracking (Tarefas)
- Fóruns de discussão (Plataforma)

### Removido da v1 (deferido)

- Doações Pix do público
- Busca semântica / pgvector / embeddings
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

### Princípios invioláveis

- **Sem suposições:** sempre perguntar ao Filipe sobre regras de negócio
- **Simplicidade:** público-alvo em transição tecnológica — interfaces simples
- **Não parecer IA:** usar design system, tipografia editorial, microcopy humano
- **Imutabilidade:** soft-delete e estornos, nunca hard delete; audit trails em tudo
- **Governança dual:** aprovação + autorização (duas pessoas, duas camadas) para decisões financeiras
- **Defense in depth:** RBAC + RLS sempre, nunca apenas um
- **Frontend-first:** UI com mocks → validação com diretoria → backend

# PROMPTS.md — Sequência de Desenvolvimento SDD

> **Referência:** BRAIN.md (fonte da verdade) | SDD-STRUCTURE.md (formato)
> **Total:** 119 prompts + 41 correções (ver tabela "Correções" abaixo) | Fases 0-9
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

### Correções (S1-26 — cabeçalho antigo dizia "3 correções"; eram 4; hoje são 41 no total, 11 pendentes: P-0.4b, P-7.1b, P-7.5b e as 8 do bloco B de Documentos abertas na auditoria de 2026-07-25 — P-1.18b a P-1.24b)

Corpo integral no próprio arquivo (as 4 originais) ou em `AUDIT/04-prompts-pendentes.md` §4 (as 15 da auditoria de 2026-07 — convenção registrada em cada sessão de SESSIONS.md a partir de S-54; transcrever o texto para dentro deste arquivo é trabalho mecânico à parte, não feito em P-0.16 para não misturar prompts na mesma sessão).

| Corretivo | Motivo                                                        | Corpo do prompt                  | Sessão   |
| --------- | ------------------------------------------------------------- | -------------------------------- | -------- |
| P-0.2b    | Unificação do design system (tokens `--hb-*`)                 | neste arquivo                    | S-20     |
| P-0.3b    | Pipeline de migrations                                        | neste arquivo                    | S-22     |
| P-1.12b   | Reconciliação do Admin ao design system unificado             | neste arquivo                    | S-22b¹   |
| P-2.9b    | Usuário real no header de Projetos                            | neste arquivo                    | S-44     |
| P-0.7     | Resgate do banco (partições, enum de audit, 0000 duplicada)   | AUDIT/04-prompts-pendentes.md §4 | S-54     |
| P-0.8     | Kit de backend compartilhado (sessão/audit/notificações)      | AUDIT/04-prompts-pendentes.md §4 | S-55     |
| P-0.9     | CI mínimo                                                     | AUDIT/04-prompts-pendentes.md §4 | S-56     |
| P-0.10    | Decisão B: RLS ativa (grants + policies + adoção)             | AUDIT/04-prompts-pendentes.md §4 | S-57     |
| P-0.11    | drizzle-kit reconciliado                                      | AUDIT/04-prompts-pendentes.md §4 | S-58     |
| P-1.25    | Admin: leitura protegida e fiação completa                    | AUDIT/04-prompts-pendentes.md §4 | S-59     |
| P-1.26    | Onboarding: convite, auto-signup e MFA bloqueante             | AUDIT/04-prompts-pendentes.md §4 | S-60     |
| P-1.27    | Documentos: visibilidade e área editorial verdadeiras         | AUDIT/04-prompts-pendentes.md §4 | S-61     |
| P-2.9c    | Projetos: operável de ponta a ponta                           | AUDIT/04-prompts-pendentes.md §4 | S-62     |
| P-3.8b    | Financeiro: governança e conciliação verdadeiras              | AUDIT/04-prompts-pendentes.md §4 | S-63     |
| P-0.12    | Storage: buckets e policies                                   | AUDIT/04-prompts-pendentes.md §4 | S-64     |
| P-0.13    | LGPD: fundação                                                | AUDIT/04-prompts-pendentes.md §4 | S-65     |
| P-0.14    | Jobs: Inngest de verdade                                      | AUDIT/04-prompts-pendentes.md §4 | S-66     |
| P-0.15    | packages/integrations + contrato de settings                  | AUDIT/04-prompts-pendentes.md §4 | S-67     |
| P-0.16    | Registro retroativo (este próprio corretivo)                  | AUDIT/04-prompts-pendentes.md §4 | S-68     |
| P-0.4b    | Auth: simetria de decode de cookie no browser client          | neste arquivo                    | pendente |
| P-0.6b    | Notificações in_app operáveis: slot no AppShell + piloto      | neste arquivo                    | S-175    |
| P-0.6c    | Notificações in_app: rollout do sino/central aos demais apps  | neste arquivo                    | S-176    |
| P-0.6d    | Client Drizzle tipado (remoção do stub de notifications)      | neste arquivo                    | S-177    |
| P-0.6e    | Emails: tipografia institucional (remover Inter)              | neste arquivo                    | S-178    |
| P-7.1b    | Flats: máximo de scoring em BRAIN §6.8 (80 → 75)              | neste arquivo                    | pendente |
| P-7.5b    | Flats: fiação das telas do Bloco A para validação diretoria   | neste arquivo                    | pendente |
| P-1.10b   | Admin: editor de templates de email acessível (órfão→Config)  | neste arquivo                    | S-181    |
| P-1.10c   | Emails enviados a partir dos templates do banco (DB-driven)   | neste arquivo                    | S-182    |
| P-1.14b   | Documentos: badge de visibilidade e pílula de status únicos   | neste arquivo                    | S-183    |
| P-1.15b   | Documentos: listagem por categoria — a rota que nunca existiu | neste arquivo                    | S-184    |
| P-1.16b   | Documentos: assinaturas, preferência por tipo de alerta       | neste arquivo                    | S-185    |
| P-1.16c   | Documentos: reordenação de categorias — UI ao backend (b)     | neste arquivo                    | S-186    |
| P-1.17b   | Documentos: fronteiras de erro e cópia de estados vazios      | neste arquivo                    | S-187    |
| P-1.18b   | Documentos: campos que a UI coleta e o banco não guarda       | neste arquivo                    | pendente |
| P-1.19b   | Documentos: RLS de rascunho, lixeira e papel conselheiro      | neste arquivo                    | pendente |
| P-1.20b   | Documentos: busca com acento, índice e fim da action órfã     | neste arquivo                    | pendente |
| P-1.20c   | Documentos: registro de leitura (`views`) que ninguém escreve | neste arquivo                    | pendente |
| P-1.21b   | Documentos: área editorial ainda lê como superusuário         | neste arquivo                    | pendente |
| P-1.22b   | Documentos: alerta de "novas versões" que nunca chega         | neste arquivo                    | pendente |
| P-1.23b   | Documentos: botão "submeter projeto" que o wizard ignora      | neste arquivo                    | pendente |
| P-1.24b   | Documentos: audit mockado e escrita sem cobertura de teste    | neste arquivo                    | pendente |

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
- [x] `pnpm turbo build` resolve dependências entre packages — restaurado em **P-0.1b** (S-167, 2026-07-20)
- [x] TypeScript strict mode habilitado em toda a workspace
- [x] Estrutura de diretórios completa: 9 apps + 8 packages + 2 tooling
- [x] Lint passa
- [x] Types passam

**Notas:**
Apps: admin, projetos, plataforma, radio, financeiro, intranet, documentos, flats, tarefas. Packages: ui, db, auth, email, validators, ai, config, types. Ref: BRAIN.md seção 3 (Arquitetura).

> ⚠️ **Auditoria 2026-07-20 (cruzamento S-1/S-2 × codebase):** dois débitos abertos deste prompt geraram corretivos — **P-0.1b** (build quebrado + config de build divergente entre os 9 apps) e **P-0.1c** (`packages/config` nunca implementado: decisão de validação de env registrada na S-1 continua sendo um stub `export {}`).

---

### P-0.1b — Restauração do Build e Uniformização da Config dos 9 Apps (CORRETIVO — bloqueia qualquer build)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** config
**Pré-condições:**

- Branch: `feat/P-0.1b-build-toolchain`
- Dependências: P-0.1 concluído
- Env vars: nenhuma

**Problema que este prompt resolve (achados da auditoria de 2026-07-20 sobre S-1/S-2):**

1. **`pnpm turbo build` falha — o critério de aceite de P-0.1 marcado `[x]` é falso hoje.**
   `apps/tarefas` quebra de forma **determinística** com `TypeError: Cannot read properties of undefined (reading 'length')` em `WasmHash._updateWithBuffer`, dentro do webpack compilado do Next 15.5.18. É incompatibilidade do hash WASM do webpack com **Node 24** — o ambiente local roda `v24.18.0` e o CI roda Node 20, então o CI nunca viu a falha.
   Sob build paralelo o erro **migra de app** (execução 1: `intranet`; execução 2: `flats` + `tarefas`; execução 3: `tarefas`), o que faz o sintoma parecer flakiness de concorrência. Não é: com `--concurrency=1` a falha é estável em `tarefas` (6/9 tasks, 7m32s), e `npx next build` isolado em `apps/tarefas` falha igual.
   **Reparo já verificado nesta auditoria:** forçar `output.hashFunction = "sha256"` no webpack de `apps/tarefas` compila o app (21.9s) e leva `pnpm turbo build --force` a **9/9 successful (5m42s)**. `tarefas` era o único bloqueio real.

2. **Toolchain não fixado.** `engines.node` é `">=20.0.0"` — permite exatamente a versão em que o build quebra — e não existe `.nvmrc` nem `.node-version`. O CI fixa Node 20 numa variável própria (`NODE_VERSION`), sem nenhuma relação com o `engines`. Divergência dev × CI sem sinal de erro.

3. **`next.config.ts` existe em 1 dos 9 apps.** O débito registrado na S-1 (“`next.config.ts` com `transpilePackages` ainda não criado”) nunca foi liquidado: só `apps/intranet` tem o arquivo. Os outros 8 compilam por resolução de symlink do pnpm (o path real cai fora de `node_modules`, então o SWC transpila), mas não há ponto único para config de build — foi exatamente por isso que o item 1 não teve onde ser corrigido.

4. **`apps/documentos` não tem `postcss.config.mjs`.** Consequência **verificada no bundle publicado**: o app não gera **nenhuma** classe utilitária do Tailwind. `@tailwindcss/postcss` nunca é invocado, as diretivas `@source` vazam **literalmente para o CSS servido** (`@source "../../../../packages/ui/src";@source "../";` no início do chunk) e `.flex{display:flex}` / `.grid{display:grid}` estão ausentes — presentes em `admin` e `projetos`, ausentes em `documentos`. Só o CSS escrito à mão em `globals.css` funciona; todo `className` utilitário do app é inerte. O app tem `@tailwindcss/postcss` e `tailwindcss` em `devDependencies`, então a única peça faltando é o arquivo de config.

**Decisão de abordagem (confirmar com Filipe — regra G1):**
Corrigir por **config compartilhada**, não por remendo em 9 arquivos:

1. Criar `packages/config/src/next.ts` exportando uma factory (`createNextConfig(overrides?)`) que já traz o `webpack` com `output.hashFunction = "sha256"` e a lista de `transpilePackages` do monorepo. Adicionar `next` como `peerDependency`/`devDependency` de `packages/config` (o tipo `NextConfig` vem de lá) e o export `"./next"` no `package.json`.
2. Criar `apps/<app>/next.config.ts` nos 9 apps consumindo a factory. `apps/intranet` migra para ela (hoje tem a lista de `transpilePackages` hardcoded).
3. Criar `apps/documentos/postcss.config.mjs`, cópia idêntica de `apps/admin/postcss.config.mjs`.
4. Fixar o toolchain: `.nvmrc` com a versão suportada e `engines.node` com faixa fechada. O CI passa a ler o `.nvmrc` (`actions/setup-node` com `node-version-file`) em vez da variável `NODE_VERSION`, para que dev e CI não possam divergir de novo.
   **Ponto de decisão para o Filipe:** com o reparo do item 1 o build fica verde tanto em Node 20 quanto em Node 24 — o `hashFunction` remove o acoplamento à versão. O `.nvmrc` entra como reprodutibilidade (defesa em profundidade), não como downgrade obrigatório. Definir se a versão canônica é `20` (paridade com o CI atual) ou `24` (paridade com a máquina do Filipe, evita instalar gerenciador de versão).

**Arquivos permitidos para criação/edição:**

- `packages/config/src/next.ts` (criar)
- `packages/config/package.json` (export `./next` + dep de `next`)
- `apps/{admin,projetos,plataforma,radio,financeiro,intranet,documentos,flats,tarefas}/next.config.ts` (8 criar, 1 migrar)
- `apps/documentos/postcss.config.mjs` (criar)
- `package.json` (`engines.node`)
- `.nvmrc` (criar)
- `.github/workflows/ci.yml` (ler `node-version-file`)
- `PROMPTS.md` (marcar critério de P-0.1 restaurado)
- `SESSIONS.md`

**Critérios de aceite:**

- [x] `pnpm turbo build --force` → **9/9 successful**, sem `--concurrency=1` (verificado com `--concurrency=4`; concorrência total sem flag estoura memória na máquina local — 8 cores/12GB — achado novo registrado em SESSIONS.md S-167, distinto do bug do hash WASM)
- [x] `apps/tarefas` compila isoladamente (`npx next build`) na versão de Node do `.nvmrc` (24.18.0) — Node 20 não testado (indisponível localmente); o fix (`hashFunction: "sha256"`) não é condicional à versão do Node
- [x] Os 9 apps têm `next.config.ts` consumindo a factory de `@hebron/config/next` — nenhuma lista de `transpilePackages` duplicada por app
- [x] `apps/documentos` emite utilitários do Tailwind: `.flex{display:flex}` e `.grid{display:grid}` presentes em `.next/static/css/*.css`, e **nenhum** `@source` literal no CSS publicado
- [x] `.nvmrc` existe e o CI o consome; `engines.node` com faixa fechada coerente com ele
- [x] `pnpm turbo lint typecheck` verde (38/38)
- [x] Critério 2 de P-0.1 revertido para `[x]` em PROMPTS.md
- [x] Registrar em SESSIONS.md

**Notas:**
Não “corrigir” o `@source` de `apps/admin`: a auditoria testou a hipótese de que `@source` com caminho de diretório sem glob não varre recursivamente e **refutou** — `gap-0` não aparece em nenhum arquivo de `apps/admin/src`, só em `packages/ui`, e mesmo assim `.gap-0` é emitido no CSS do admin. A forma de diretório funciona nesta versão do Tailwind; a falha do `documentos` é exclusivamente o `postcss.config.mjs` ausente. Os dois formatos de `@source` em uso na workspace (glob explícito em 7 apps, diretório em `admin`/`documentos`) são equivalentes — uniformizar é opcional e cosmético.
O erro do item 1 é do webpack, não do Turbopack: se algum app migrar para `--turbopack` no futuro, o `hashFunction` deixa de ser necessário para ele.

---

### P-0.1c — `packages/config`: validação de env em runtime (CORRETIVO — decisão da S-1 nunca implementada)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** config
**Pré-condições:**

- Branch: `feat/P-0.1c-env-validation`
- Dependências: P-0.1b concluído
- Env vars: as já usadas pela workspace (inventário abaixo)

**Problema que este prompt resolve (achado da auditoria de 2026-07-20):**
A S-1 registrou como decisão explícita: “`packages/config` = validação de env em runtime com `@t3-oss/env-nextjs`, distinto do `tooling/` que é dev-only”. Dois meses depois **nada disso existe**:

- `packages/config/src/index.ts` continua sendo o stub `export {}` criado na S-2 (arquivo intocado desde 2026-05-22).
- `packages/config/package.json` declara `"./env": "./src/env.ts"` — **o arquivo não existe**. É um export apontando para o vazio; qualquer `import from "@hebron/config/env"` quebra.
- `@t3-oss/env-nextjs` está instalado como dependência do package e **nunca é importado** por ninguém.
- Os **9 apps** declaram `@hebron/config` em `dependencies`; o único uso real no monorepo inteiro é a string `"@hebron/config"` dentro do array `transpilePackages` de `apps/intranet/next.config.ts`.
- Enquanto isso há **102 acessos crus a `process.env.*`** em código-fonte (fora de `.next`/`node_modules`), cobrindo 17 variáveis distintas, nenhuma validada: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `NODE_ENV`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` e os 7 `NEXT_PUBLIC_<APP>_URL`.

O risco concreto: variável ausente ou vazia só aparece como falha em runtime, em produção, no ponto de uso — normalmente como erro de conexão sem nome. É também o mesmo terreno do débito já registrado em memória sobre a separação `NEXT_PUBLIC_*` (browser) × `SUPABASE_URL`/`SUPABASE_ANON_KEY` (server), que hoje não tem nada que a imponha.

**Decisão de abordagem (confirmar com Filipe — regra G1):**

1. Implementar `packages/config/src/env.ts` com `createEnv` de `@t3-oss/env-nextjs`, separando `server`, `client` e `runtimeEnv`, com schemas Zod (`z.string().url()`, `z.string().min(1)`, `NODE_ENV` como enum). Respeitar a fronteira: segredos (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `OPENAI_API_KEY`, `RESEND_API_KEY`) **só** em `server`; nada de segredo em `client`.
2. Variáveis usadas por um subconjunto de apps (`NEXT_PUBLIC_<APP>_URL`) entram como opcionais ou num sub-export por app — **não** obrigar os 9 apps a declarar as 7 URLs de outros apps.
3. Reexportar por `packages/config/src/index.ts` e manter o export `"./env"` agora apontando para arquivo real.
4. **Não** migrar os 102 call sites neste prompt. Migrar apenas os pontos de borda que já quebram hoje se a env faltar (clients Supabase e `DATABASE_URL`), e registrar o restante como débito nominal na SESSIONS.md. Migração em massa vira ruído de diff e mistura escopo.
5. Sincronizar `.env.example` com o inventário real das 17 variáveis.

**Arquivos permitidos para criação/edição:**

- `packages/config/src/env.ts` (criar)
- `packages/config/src/index.ts` (reexportar)
- `packages/config/package.json` (corrigir/confirmar exports)
- `.env.example` (sincronizar com o inventário real)
- `SESSIONS.md`

**Critérios de aceite:**

- [x] `import { env } from "@hebron/config/env"` resolve e tipa (o export deixa de apontar para arquivo inexistente)
- [x] Segredos declarados apenas em `server`; nenhum segredo alcançável do bundle de cliente
- [x] Faltar uma variável obrigatória falha **no boot com nome da variável**, não no ponto de uso
- [x] `NEXT_PUBLIC_<APP>_URL` opcionais — nenhum app obrigado a declarar URL de app que não consome
- [x] `.env.example` cobre as 17 variáveis inventariadas
- [x] `pnpm turbo lint typecheck` verde; `pnpm turbo build` segue 9/9
- [x] Débito nominal registrado na SESSIONS.md: **102** call sites `process.env.*` em 54 arquivos ainda não migrados (S-168) — inclui os "pontos de borda" citados na nota de abordagem acima, não migrados por não constarem na lista de arquivos permitidos (suposição registrada em SESSIONS.md, G1)
- [x] Registrar em SESSIONS.md

**Notas:**
`@t3-oss/env-nextjs` valida no import — em RSC/Server Actions isso roda no boot do módulo, que é o comportamento desejado. Cuidado com `packages/db` e scripts de migration/seed, que rodam **fora** do Next (`tsx`): ali `createEnv` de `env-nextjs` pode reclamar de contexto; se acontecer, usar `@t3-oss/env-core` para o subconjunto server-only consumido por scripts, ou manter `process.env.DATABASE_URL` cru nesses runners e documentar a exceção.
Não alargar o escopo para o inventário de env dos jobs/Inngest (P-0.14) — se aparecer variável nova ali, registrar como débito, não implementar aqui.

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

- [x] Tokens de cor disponíveis como CSS variables (vocabulário canônico `--hb-*` + semânticos: `--brand`, `--accent`, `--fg`, `--bg`, `--border`, etc.)
- [x] Tipografia **Parkinsans + Titillium Web** configuradas via `next/font` (unificação final em P-0.2b, S-20; verificado nos 9 apps em P-0.2c)
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

### P-0.2c — Aposentadoria dos aliases DEPRECATED (CORRETIVO — critério de P-0.2b nunca fechado)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-0.2c-deprecated-aliases`
- Dependências: P-0.2b e P-1.12b concluídos
- Env vars: nenhuma
- Skill: **invocar `/impeccable` antes de começar**

**Problema que este prompt resolve (achado da auditoria de 2026-07-20):**
O bloco de aliases criado em P-0.2b está marcado no código como `/* DEPRECATED — remover após migração dos apps (P-1.12b) */` (`packages/ui/src/tokens.css:233`). P-1.12b executou (S-22b), mas seu escopo real foi **apenas eliminar hex hardcoded** do Admin — a migração do vocabulário de tokens nunca aconteceu, em nenhum app. O bloco continua vivo e continua sendo consumido:

- **228 ocorrências de aliases deprecated em 19 arquivos-fonte** (excluindo `.next/` e a própria definição em `tokens.css`): 11 em `apps/admin/src`, 8 em `apps/intranet/src`.
- Distribuição: `--color-muted-foreground` (51), `--color-primary` (40), `--color-border` (36), `--color-foreground` (25), `--color-muted` (24), `--color-support-green` (12), `--color-background` (9), `--color-support-sky` (8), `--color-accent` (8), `--color-ring` (5), `--color-primary-foreground` (4), e 1 cada de `--font-ui`, `--color-subtle`, `--color-primary-hover`, `--color-primary-active`, `--color-accent-hover`.
- O bloco declara **26 aliases**; parte deles (`--color-primary-muted`, `--color-accent-active`, `--color-accent-foreground`, `--color-support-*-hover/-muted/-foreground`, `--color-input-bg`) não tem **nenhum** consumidor — são alias mortos criados por simetria.

O risco concreto: o design system tem dois vocabulários vivos para as mesmas cores há dois meses. Toda UI nova pode legitimamente escolher o vocabulário errado, porque o errado continua funcionando. É exatamente a condição que P-0.2b existiu para eliminar, e o critério de aceite que declara isso resolvido está marcado `[x]` sem estar.

**Decisão de abordagem (confirmar com Filipe — regra G1):**

1. Migrar os **19 arquivos** pela tabela de equivalência do P-0.2b (item 2), que já é a fonte da verdade do mapeamento. Substituição mecânica — nenhum valor computado muda, os aliases são `var()` diretos para os canônicos.
2. Atenção à sintaxe Tailwind v4: usar `text-(--fg-muted)`, **não** `text-[--fg-muted]`. Ver o débito já registrado em memória sobre a forma de colchetes compilar para CSS inválido.
3. Cuidado específico com a colisão `text-(--var)`: `text-(--algo)` compila para `color`. Nenhum alias desta migração é de tipografia exceto `--font-ui` → `--font-body`, que deve virar `font-(family-name:--font-body)` ou a classe utilitária apropriada — **não** `font-(--font-body)`.
4. **Remover o bloco DEPRECATED inteiro** de `tokens.css` ao fim, incluindo os aliases mortos. Não manter "por segurança": o ponto do prompt é que só reste um vocabulário.
5. Corrigir os dois critérios de aceite desatualizados do P-0.2 (ver escopo, item 4) — sem isso, P-0.2 volta a ficar falso assim que o bloco sai.

**Escopo (siga na ordem):**

1. **Migrar `apps/admin/src`** (11 arquivos): `app/(dashboard)/templates-email/page.tsx`, `components/audit-log-skeleton.tsx`, `components/dashboard-skeleton.tsx`, `components/designation-form.tsx`, `components/email-template-editor.tsx`, `components/invitation-form.tsx`, `components/meeting-form.tsx`, `components/role-assignment-form.tsx`, `components/role-badge.tsx`, `components/user-table-skeleton.tsx`, `components/user-table.tsx`.
2. **Migrar `apps/intranet/src`** (8 arquivos): `app/(auth)/cadastro/components/cadastro-form.tsx`, `app/(auth)/cadastro/instituicao/components/instituicao-form.tsx`, `app/(auth)/cadastro/status/components/sign-out-link.tsx`, `app/(auth)/cadastro/status/page.tsx`, `app/(auth)/convite/page.tsx`, `app/(auth)/login/components/login-form.tsx`, `app/(auth)/mfa/enroll/components/mfa-enroll-form.tsx`, `components/auth-card.tsx`.
3. **Remover o bloco DEPRECATED** de `packages/ui/src/tokens.css` (linhas 233–262 na versão auditada).
4. **Corrigir os critérios do P-0.2 neste arquivo:** critério 1 nomeia `--color-primary`/`--color-accent`, tokens que este prompt revoga — reescrever para o vocabulário `--hb-*` + semânticos. Critério 2 está `[~]` remetendo a P-0.2b, que concluiu na S-20 e cujos 9 apps têm `next/font` com Parkinsans + Titillium verificados — passar para `[x]`.
5. **Uniformizar o import de tokens** nos 9 `globals.css`: hoje todos usam `@import "../../../../packages/ui/src/tokens.css"`, ignorando o export `"./tokens.css"` declarado em `packages/ui/package.json` e documentado em `packages/ui/src/index.ts`. Trocar por `@import "@hebron/ui/tokens.css"` **somente se o build dos 9 apps continuar verde** — Tailwind v4 + PostCSS nem sempre resolve export subpath em `@import`. Se falhar, reverter para o caminho relativo e corrigir a documentação do `index.ts` para refletir a forma que de fato funciona, registrando a razão na SESSIONS.md.

**Arquivos permitidos para criação/edição:**

- `apps/admin/src/**/*.tsx` (apenas troca de tokens)
- `apps/intranet/src/**/*.tsx` (apenas troca de tokens)
- `packages/ui/src/tokens.css` (remoção do bloco DEPRECATED)
- `packages/ui/src/index.ts` (apenas o comentário de documentação do import, se o item 5 exigir)
- `apps/*/src/app/globals.css` (apenas a linha do `@import` de tokens)
- `PROMPTS.md` (apenas os critérios do P-0.2)
- `SESSIONS.md`

**Critérios de aceite:**

- [x] `grep -rE '\-\-(color-primary|color-accent|color-support|color-background|color-foreground|color-muted|color-subtle|color-border|color-ring|font-ui)' apps/*/src packages/*/src` não retorna nada
- [x] Bloco DEPRECATED removido de `tokens.css`; nenhum alias de compatibilidade restante
- [x] Zero uso da forma `[--var]` introduzida na migração (só `(--var)`)
- [x] Nenhum `text-(--font-*)` ou `text-(--text-*)` introduzido (colisão que compila para `color`)
- [x] Critérios 1 e 2 do P-0.2 corrigidos neste arquivo (vocabulário canônico; `[~]` → `[x]`)
- [x] `pnpm turbo build lint typecheck` verde; build segue 9/9
- [x] Inspeção visual: telas de `apps/admin` e do fluxo de auth do `apps/intranet` inalteradas (a troca é de nome, não de valor)
- [x] Registrar em SESSIONS.md

**Notas:**
A migração é mecânica mas **não** é find/replace cego: `--color-muted` mapeia para `--surface-alt` e `--color-muted-foreground` para `--fg-muted` — prefixos que se sobrepõem. Substituir do nome mais longo para o mais curto, ou usar limite de palavra.
Não alargar o escopo para reescrever componentes, extrair classes novas para `patterns.css` ou ajustar layout. Se aparecer duplicação óbvia durante a migração, registrar como débito na SESSIONS.md — não resolver aqui.
O `apps/admin/src/app/admin.css` já está limpo (só tokens canônicos, ~50 linhas) — não mexer.

---

### P-0.2d — Primitivos Drawer e Tooltip (CORRETIVO — débito aberto desde a S-3)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-0.2d-drawer-tooltip`
- Dependências: P-0.2c concluído (para nascerem já com o vocabulário canônico)
- Env vars: nenhuma
- Skill: **invocar `/impeccable` antes de começar**

**Problema que este prompt resolve (achado da auditoria de 2026-07-20):**
O escopo do P-0.2 lista "Button, Input, Select, Dialog, **Drawer**, **Tooltip**, Toast, FormField". A S-3 registrou os dois como débito explícito — "não criados, não estavam na lista de arquivos permitidos" — e nenhum prompt posterior os reagendou. Dois meses depois:

- **Tooltip existe, mas privado.** `packages/ui/src/components/navigation-sidebar.tsx:81` implementa `NavTooltip` sobre `@radix-ui/react-tooltip`, com estilo e comportamento próprios (`delayDuration={300}`, portal, arrow). Não é exportado. `@radix-ui/react-tooltip` está em `dependencies` do package servindo a **um** consumidor interno.
- **Drawer não existe, e a necessidade sim.** `packages/ui/src/components/app-shell.tsx:202` implementa o drawer mobile inline: estado `mobileOpen`, overlay `fixed inset-0 z-(--z-overlay) bg-black/40 backdrop-blur-[2px]`, painel deslizante, trigger `Menu`. É um Drawer completo sem ser um componente.

O risco concreto: qualquer app que precisar de tooltip ou de painel deslizante vai reimplementar — com outro delay, outro z-index, outro comportamento de foco e outro tratamento de `Escape`. É o mesmo padrão de divergência que P-0.2b teve que corrigir nos tokens, agora em comportamento em vez de cor.

**Decisão de abordagem (confirmar com Filipe — regra G1):**

1. **Extrair, não inventar.** `Tooltip` sai de `NavTooltip` e `Drawer` sai do bloco mobile do `AppShell`. O comportamento hoje em produção é a especificação — este prompt não é oportunidade de redesenhar.
2. Refatorar `navigation-sidebar.tsx` e `app-shell.tsx` para **consumirem** os novos primitivos. Se a extração forçar mudança de aparência ou de comportamento, parar e perguntar: significa que a abstração está errada.
3. `Drawer` sobre `@radix-ui/react-dialog` (já em `dependencies`, já consumido por `dialog.tsx`) com variante de posição — não adicionar `vaul` nem outra dependência nova.
4. Acessibilidade não é opcional na extração: foco preso no painel aberto, `Escape` fecha, `aria-modal`, retorno do foco ao trigger. O Radix entrega isso; o ponto é não perder na extração.

**Arquivos permitidos para criação/edição:**

- `packages/ui/src/components/tooltip.tsx` (criar)
- `packages/ui/src/components/drawer.tsx` (criar)
- `packages/ui/src/components/navigation-sidebar.tsx` (consumir Tooltip)
- `packages/ui/src/components/app-shell.tsx` (consumir Drawer)
- `packages/ui/src/index.ts` (exportar)
- `SESSIONS.md`

**Critérios de aceite:**

- [x] `Tooltip` e `Drawer` exportados de `@hebron/ui` com seus tipos
- [x] `navigation-sidebar.tsx` não importa mais `@radix-ui/react-tooltip` diretamente
- [x] `app-shell.tsx` não gerencia mais overlay/painel mobile à mão
- [x] Comportamento inalterado: sidebar colapsada mostra tooltip com o mesmo delay; drawer mobile abre, fecha no overlay e no `Escape`
- [x] Foco preso no drawer aberto e devolvido ao trigger ao fechar
- [x] Tokens canônicos apenas (zero hex, zero alias deprecated)
- [x] `pnpm turbo build lint typecheck` verde; build segue 9/9
- [x] Débito da S-3 marcado como fechado na SESSIONS.md
- [x] Registrar em SESSIONS.md

**Notas:**
Este prompt fecha o escopo declarado do P-0.2 — depois dele os 8 primitivos listados existem. Não adicionar primitivos fora dessa lista (Popover, Sheet, Accordion): se algum app precisar, vira prompt próprio.
`bg-black/40` no overlay é o único valor não-tokenizado que atravessa a extração. Mantê-lo como está ou promovê-lo a token (`--overlay-scrim`) é decisão de Filipe — na dúvida, manter e registrar como débito.

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

### P-0.3c — Aposentar o caminho `drizzle-kit generate/check` (CORRETIVO — remover footgun de migrations)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-0.3c-drizzle-kit-retire`
- Dependências: P-0.3b concluído; migrations 0000–0059 já aplicadas
- Env vars: `DATABASE_URL`

**Problema que este prompt resolve (contexto — débito registrado na S-165, 2026-07-18):**
O P-0.3b (S-22) decidiu **preservar** os scripts `db:generate`, `db:check` e `db:push` e manter `out: "./src/migrations"` em `drizzle.config.ts` "para utilidade de dev". Na prática isso deixou o caminho `drizzle-kit` vivo em paralelo à fonte da verdade (os `.sql` numerados manuais), e os dois **divergiram por completo**:

- `src/migrations/meta/_journal.json` tem **14 tags** (numeração 0014–0027) cujos nomes **não correspondem** aos arquivos reais com esses números (ex.: a tag `0015_tarefas` no journal vs. o arquivo real `0015_user_status.sql`; `0016_charming_korath` e `0023_cute_spiral` não existem como `.sql`; `0024_radio_rls` no journal vs. `0024_lgpd_audit_actions.sql` real).
- Os snapshots (`meta/*_snapshot.json`) congelaram em `0027`; existem **68 arquivos `.sql`** numerados até `0059`.
- O `README.md` (reescrito no P-0.11) **documenta um fluxo quebrado**: afirma que `db:generate` é o ponto de partida para autorar migrations e que `db:check` "should always report Everything's fine". Ambos são **falsos** no estado atual — `db:check` acusaria drift catastrófico e `db:generate` diffaria contra o snapshot obsoleto `0027`, reemitindo DDL já aplicado e atribuindo um número colidente. Seguir o README **corrompe** o conjunto de migrations. Confirmado ao vivo na S-165.

O runner idempotente (`migrate.ts`) e o `schema-parity.test.ts` já são, na prática, o fluxo e o guarda-drift reais — mas a documentação e os scripts apontam para o caminho errado. Este prompt alinha ferramentas e documentação à realidade: **SQL numerado à mão = única fonte da verdade**, aposentando o caminho `drizzle-kit generate/check`.

**Decisão de abordagem (confirmar com Filipe se houver dúvida — regra G1):**
Abandonar o caminho `drizzle-kit generate/check` em vez de tentar reconciliar journal + 68 snapshots (fluxo frágil que nunca lidou bem com RLS/partições/funções `SECURITY DEFINER`):

1. **`packages/db/package.json`** — remover os scripts `db:generate`, `db:check` e `db:push` (nenhum é referenciado em CI/turbo — verificado). Manter `db:migrate`, `db:seed*` e `db:studio` (Studio segue útil para inspeção e não depende de `out`/journal).
2. **`packages/db/drizzle.config.ts`** — remover a chave `out: "./src/migrations"` (nada mais deve gravar ali automaticamente). Manter `schema: "./src/schema/index.ts"` e `dbCredentials` para type-inference do Drizzle ORM e para o `db:studio`.
3. **`packages/db/src/migrations/meta/`** — remover o diretório inteiro (`_journal.json` + `*_snapshot.json`): é vestígio obsoleto, não é lido por `migrate.ts` nem pelo teste de paridade, e sua presença induz ao erro.
4. **`packages/db/README.md`** — reescrever a seção "Migration flow" para refletir a realidade:
   - Migrations são `NNNN_<nome>.sql` **numeradas à mão**, sendo `NNNN` = maior número existente + 1 (próximo: `0060`).
   - Autorar o SQL manualmente (tabelas, colunas, enums, RLS, partições, funções, `ALTER TYPE … ADD VALUE`), preferindo idempotência (`IF NOT EXISTS`, `CREATE OR REPLACE`, blocos `DO $$ … EXCEPTION WHEN duplicate_object …`).
   - **Nunca** usar `drizzle-kit generate`/`check`/`push` — o caminho foi aposentado; qualquer arquivo que ele gere colide com a numeração e reemite DDL aplicado.
   - Nunca editar uma migration já aplicada; criar uma nova.
   - O guarda-drift é o `schema-parity.test.ts` (roda em CI via `pnpm turbo test`), **não** `db:check`.
   - Aplicar com `pnpm --filter @hebron/db db:migrate`.

**Arquivos permitidos para criação/edição:**

- `packages/db/package.json` (remover scripts `db:generate`, `db:check`, `db:push`)
- `packages/db/drizzle.config.ts` (remover chave `out`)
- `packages/db/src/migrations/meta/**` (remover diretório)
- `packages/db/README.md` (reescrever seção de fluxo de migrations)

**Critérios de aceite:**

- [x] `db:generate`, `db:check` e `db:push` removidos de `package.json`; `db:migrate`/`db:seed*`/`db:studio` preservados
- [x] `drizzle.config.ts` sem a chave `out`; `schema` e `dbCredentials` mantidos
- [x] `src/migrations/meta/` removido do repositório
- [x] `README.md` descreve numeração manual (`NNNN` = max+1), aposenta explicitamente `drizzle-kit generate/check/push`, e aponta `schema-parity.test.ts` como o guarda-drift
- [x] `pnpm --filter @hebron/db db:migrate` continua idempotente (rodar 2x não aplica nada)
- [x] `pnpm turbo typecheck` verde
- [x] `pnpm --filter @hebron/db test` (schema-parity) verde
- [x] Registrar em SESSIONS.md; atualizar a memória `project_drizzle_journal_drift.md` como RESOLVIDO

**Notas:**
Nenhum consumidor importa de `@hebron/db` raiz (todos usam subpaths: `/schema`, `/client`, `/audit`, etc.), então o stub `src/index.ts` (`export {}`) permanece intencional — não é débito. O `migrate.ts` já evoluiu além do P-0.3b (baseline + `STALE_IDS` + `ID_RENAMES` do P-0.7) e o débito de `no-non-null-assertion` naquele arquivo (nota da S-1.12b) já foi corrigido — nada a fazer nele. Este prompt é puramente de ferramentas/documentação: **não** cria nem altera migrations `.sql` nem toca no banco.

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

> ⚠️ **Auditoria 2026-07-22 (cruzamento S-5 × codebase):** dos 3 débitos da S-5, **D1** (exports `./mfa`) e **D3** (UI de enrollment MFA, entregue em P-1.26 — `/mfa/enroll`, `/mfa/challenge`) estão fechados, e o gap de fontes/tokens do `(auth)/layout.tsx` (nota da S-86) já foi sanado (Parkinsans + Titillium via `next/font` + `globals.css`). O **D2** gerou o corretivo **P-0.4b**: o lado servidor (Set-Cookie com domain no middleware) já existe, mas o browser client tem uma assimetria de codificação de cookie (codifica na escrita, não decodifica na leitura) dormente sob `base64url`. A verificação do domain SSO em produção permanece um débito operacional (só fecha em staging/produção).

---

### P-0.4b — Simetria de codificação de cookies no browser client (CORRETIVO — round-trip de cookie quebrado latente)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-0.4b-cookie-decode`
- Dependências: P-0.4 concluído
- Env vars: nenhuma (correção puramente de código)

**Problema que este prompt resolve (contexto — cruzamento S-5 × codebase, auditoria 2026-07-22):**

A S-5 registrou como débito **D2** que o domínio de cookie do browser client depende de um `document.cookie` customizado e que a alternativa mais robusta seria o servidor emitir `Set-Cookie` com domain. Esse lado já foi coberto: `apps/intranet/src/middleware.ts` hoje reescreve os cookies de sessão com `domain=.hebronaseec.com.br; secure; sameSite=lax` em produção. Mas ao cruzar `packages/auth/src/client.ts` com o comportamento real do `@supabase/ssr@0.5.2`, sobra um defeito latente na implementação inline de cookies:

- `setCookie` grava o valor com `encodeURIComponent(value)` (`client.ts:69`).
- `parseCookies` lê o valor com `c.slice(eqIdx + 1)` — **sem `decodeURIComponent`** (`client.ts:53`).

O caminho padrão do `@supabase/ssr` (quando `cookies` não é sobrescrito) usa o pacote `cookie` via `parse`/`serialize`, que é **simétrico**: `serialize` codifica o valor com `encodeURIComponent`, `parse` decodifica com `decodeURIComponent`. Ao sobrescrever `getAll`/`setAll` com uma versão que codifica na escrita mas não decodifica na leitura, o valor não faz round-trip.

Por que ainda não quebrou: `createBrowserClient` usa `cookieEncoding: "base64url"` por padrão, então os valores de token ficam no alfabeto URL-safe (`A–Za–z0–9-_`, prefixo `base64-`) — que `encodeURIComponent` não altera. O bug está **dormente, não ausente**: qualquer valor com caractere transformado por `encodeURIComponent` (mudança de encoding, cookie de sessão em formato "raw", conteúdo não-ASCII) é lido corrompido, e a sessão é descartada silenciosamente.

**Decisão de abordagem (confirmar com Filipe se houver dúvida — regra G1):**

Alinhar a leitura à escrita e ao comportamento de referência do `@supabase/ssr` (pacote `cookie`): valor codificado na escrita ⇒ decodificado na leitura; nome mantido cru (o `cookie` padrão não codifica nem decodifica o nome — os nomes do Supabase, `sb-<ref>-auth-token[.n]`, já são URL-safe).

1. Em `parseCookies`, aplicar `decodeURIComponent` ao valor lido (e ao nome, mantendo simetria com o `encodeURIComponent(name)` da escrita).
2. Decodificar de forma **segura**: `decodeURIComponent` lança `URIError` em sequência `%` malformada. Um cookie de terceiros no mesmo domínio (`.hebronaseec.com.br`) pode conter `%` não-codificado; sem proteção, um único cookie estranho derruba todo o `getAll` e desloga o usuário. Espelhar o `tryDecode` do pacote `cookie`: tentar decodificar e, em erro, cair no valor cru.
3. Não alterar o lado de escrita nem a lógica de domain/SSO — apenas fechar a assimetria de leitura. **Não** introduzir dependência nova (não importar o pacote `cookie` diretamente; a implementação inline existe por decisão da S-5 de manter o package agnóstico de DOM).

**Arquivos permitidos para criação/edição:**

- `packages/auth/src/client.ts` (corrigir `parseCookies`)
- `packages/auth/src/__tests__/client.test.ts` (criar — teste de round-trip)

**Critérios de aceite:**

- [x] `parseCookies` decodifica valor (e nome) com decode seguro (fallback ao valor cru em `URIError`)
- [x] Round-trip `setCookie` → `parseCookies` preserva valores com caracteres que `encodeURIComponent` transforma (ex.: `{`, `"`, `=`, espaço, acento) — coberto por teste
- [x] Cookie de terceiros com `%` malformado não lança nem esvazia o `getAll` — coberto por teste
- [x] Nenhuma mudança no comportamento de domain/`secure`/`sameSite` da escrita
- [x] `pnpm --filter @hebron/auth test` verde
- [x] `pnpm turbo lint typecheck` verde
- [x] Registrar em SESSIONS.md (o contrato de env vars não muda — memória `project_auth_env_vars` permanece válida)

**Notas:**
Ref: BRAIN.md §3 (SSO cross-platform). Os demais débitos da S-5 já estão fechados (ver a nota de auditoria em P-0.4). A verificação em produção do domain de cookie SSO permanece um débito **operacional** — só fecha com teste em staging/produção, fora do escopo de código deste prompt. Não alargar o escopo para reescrever a estratégia de cookie (ex.: mover 100% para `Set-Cookie` httpOnly no servidor): o browser client ainda precisa persistir a sessão logo após `signInWithPassword`, antes de qualquer round-trip pelo middleware.

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

> ⚠️ **Auditoria 2026-07-22 (cruzamento S-6 × codebase):** a S-6 fechou sem débitos e os 8 critérios de aceite seguem atendidos no código atual; os refinos posteriores (tokens canônicos em P-0.2b/S-20, citação bíblica opt-in no `EmptyState`, extração dos primitivos `Drawer`/`Tooltip`) já absorveram os pontos de manutenção do package. Dois gaps, porém, acumularam **nos consumidores** do AppShell: **(1)** `profileHref` é prop obrigatória e 6 dos 11 shells apontam "Meu perfil" para rota inexistente (404) — débito já registrado na sessão de P-5.9 ("`/perfil` ainda não existe como página — mesmo padrão dos outros apps") e nunca fechado → corretivo **P-0.5b**; **(2)** o app launcher (nota deste prompt) está copiado em 6 shells com drift real de ícones/ordem, e o shell do hóspede (papel externo) expõe atalhos para Admin/Financeiro enquanto aluno/submissor/instrutor não têm launcher algum → corretivo **P-0.5c** (inclui limpeza de API residual do `navigation-sidebar`). Observação fora do escopo destes corretivos: `NotificationBell`/`NotificationCenter` (P-0.6) seguem sem uso em nenhum app e o AppShell não tem slot de ações no header — débito de integração do P-0.6, a fechar quando o sistema de notificações for ligado de fato.

---

### P-0.5b — `profileHref` opcional e correção dos alvos de "Meu perfil" (CORRETIVO — links 404 no user menu)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-0.5b-profile-href`
- Dependências: P-0.5 concluído
- Env vars: nenhuma

**Problema que este prompt resolve (contexto — cruzamento S-6 × codebase, auditoria 2026-07-22):**

`AppShell`/`UserMenu` exigem `profileHref` como prop obrigatória. Como nenhum app tem página de perfil, cada shell inventou um alvo — e a maioria aponta para rota que não existe:

| Shell                              | `profileHref`    | Rota existe?                            |
| ---------------------------------- | ---------------- | --------------------------------------- |
| `apps/intranet` `(dashboard)`      | `/perfil`        | ❌ 404                                  |
| `apps/plataforma` `(aluno)`        | `/perfil`        | ❌ 404 (existe `/meus-dados`)           |
| `apps/plataforma` `instrutor`      | `/perfil`        | ❌ 404                                  |
| `apps/tarefas` `(dashboard)`       | `/configuracoes` | ❌ 404                                  |
| `apps/financeiro` `(dashboard)`    | `/configuracoes` | ❌ 404                                  |
| `apps/projetos` `(diretoria)`      | `/configuracoes` | ❌ 404                                  |
| `apps/admin`                       | `/configuracoes` | ✅                                      |
| `apps/projetos` `(submissor)`      | `/instituicao`   | ✅                                      |
| `apps/radio` `admin`               | `/admin`         | ✅ (placeholder — home, não perfil)     |
| `apps/flats` `(hospede)` e `admin` | `/`              | ✅ (placeholder — catálogo, não perfil) |

Ou seja: 6 shells servem um item de menu que leva a 404, e 3 servem um item "Meu perfil" que leva a uma página que não é perfil. A raiz é a API: prop obrigatória força cada app a preencher algo mesmo sem ter destino real. O débito foi registrado na sessão de P-5.9 e nunca fechado.

**Decisão de abordagem (confirmar com Filipe se houver dúvida — regra G1):**

1. Em `user-menu.tsx`, tornar `profileHref` opcional (`profileHref?: string`). Sem a prop, o item "Meu perfil" **não é renderizado** — o dropdown fica com o header de identidade (nome + email) e o item "Sair". O separador entre seções só aparece quando há item acima dele.
2. Em `app-shell.tsx`, repassar a prop como opcional (mesma assinatura).
3. Nos shells, corrigir os alvos:
   - `plataforma` `(aluno)`: `profileHref="/meus-dados"` (a página existe e é exatamente o perfil do aluno);
   - `admin` (`/configuracoes`) e `projetos` `(submissor)` (`/instituicao`): manter — destinos reais;
   - **todos os demais** (intranet, plataforma instrutor, tarefas, financeiro, projetos diretoria, radio, flats hóspede e flats admin): **omitir** a prop até existir página de perfil. Um item ausente é melhor que um item 404 ou enganoso (princípio "interfaces simples e claras").
4. Não criar páginas de perfil neste patch — quando o hub canônico de perfil existir (intranet, BRAIN.md §3), os shells reintroduzem `profileHref` apontando para a URL do app canônico.

**Arquivos permitidos para criação/edição:**

- `packages/ui/src/components/user-menu.tsx`
- `packages/ui/src/components/app-shell.tsx`
- `apps/intranet/src/app/(dashboard)/shell.tsx`
- `apps/plataforma/src/app/(aluno)/shell.tsx`
- `apps/plataforma/src/app/instrutor/shell.tsx`
- `apps/tarefas/src/app/(dashboard)/shell.tsx`
- `apps/financeiro/src/app/(dashboard)/shell.tsx`
- `apps/projetos/src/app/(diretoria)/shell.tsx`
- `apps/radio/src/app/admin/shell.tsx`
- `apps/flats/src/app/(hospede)/shell.tsx`
- `apps/flats/src/app/admin/shell.tsx`
- `SESSIONS.md`

**Critérios de aceite:**

- [x] `profileHref` opcional em `UserMenu` e `AppShell`; sem a prop, o item "Meu perfil" não renderiza e o dropdown não exibe separador órfão
- [x] Nenhum shell passa `profileHref` para rota inexistente (verificado por grep: todo valor passado corresponde a `page.tsx` real no app)
- [x] `plataforma` `(aluno)` aponta para `/meus-dados`; `admin` e `projetos` `(submissor)` mantêm seus alvos atuais
- [x] Dropdown continua navegável por teclado e com `aria-label` quando só resta "Sair"
- [x] `pnpm turbo lint typecheck` verde
- [x] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §3 (login canônico/SSO) e §5 (simplicidade). Não alargar o escopo para criar a página de perfil — ela pertence ao módulo Intranet (hub canônico) e terá prompt próprio. `hideQuote` do `EmptyState` permanece deprecated-mas-funcional (15+ usos nos apps); removê-lo exigiria tocar arquivos fora do escopo — não fazer aqui.

---

### P-0.5c — App launcher canônico e higiene de API do sidebar (CORRETIVO — duplicação com drift + launcher exposto a papel externo)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-0.5c-app-launcher`
- Dependências: P-0.5 concluído (P-0.5b recomendado antes, para evitar conflito nos mesmos shells)
- Env vars: nenhuma

**Problema que este prompt resolve (contexto — cruzamento S-6 × codebase, auditoria 2026-07-22):**

A nota do P-0.5 pede que a sidebar mostre "atalhos para outros apps do ecossistema". Foi implementado via prop `apps`, mas cada shell mantém sua **cópia local** da lista — 6 cópias hardcoded (intranet, admin, financeiro, tarefas, radio admin, flats admin, flats hóspede) — e o drift já é observável:

- **Ícones divergentes para o mesmo app:** Projetos é `FolderOpen` na intranet e `Briefcase` no flats; Financeiro é `DollarSign` na intranet e `BadgeDollarSign` no flats.
- **Ordens diferentes** entre shells (intranet começa em Admin; admin começa em Financeiro).
- **Inconsistência de papel:** o shell do **hóspede** (papel externo) exibe launcher completo com Admin e Financeiro — apps aos quais um hóspede jamais terá acesso — enquanto aluno (`plataforma`), submissor (`projetos`) e instrutor não têm launcher algum. O middleware de cada app bloqueia o acesso (defense in depth intacta), mas atalho para porta trancada viola o princípio "interfaces simples e claras".

Aproveitando que `navigation-sidebar.tsx` será tocado, fechar também as sobras de API deixadas pela migração do collapse toggle para o `AppShell`:

- `onCollapsedChange` é **obrigatório porém ignorado** (`_onCollapsedChange`) — força o drawer mobile a passar `() => undefined`;
- `showCollapseToggle` está deprecated e **sem nenhum uso** nos apps (verificado por grep);
- `AppShortcutTile` envolve o link em `NavTooltip collapsed={false}` — wrapper morto que nunca renderiza tooltip.

**Decisão de abordagem (confirmar com Filipe se houver dúvida — regra G1):**

1. Criar `packages/ui/src/components/ecosystem-apps.ts` com o catálogo canônico: `ECOSYSTEM_APPS` (os 9 apps, com `id`, `label`, `href` de produção e ícone Lucide canônicos, em ordem fixa) e helper `getAppShortcuts(currentAppId)` que devolve a lista sem o app atual. Exportar em `packages/ui/src/index.ts`.
2. Substituir as listas locais dos shells **internos** (intranet, admin, financeiro, tarefas, radio admin, flats admin) pelo helper, apagando as cópias.
3. **Remover** o launcher do shell do hóspede (`apps/flats/src/app/(hospede)/shell.tsx`) — alinhar ao padrão dos demais papéis externos (aluno/submissor/instrutor, que não recebem `apps`).
4. Higiene de API em `navigation-sidebar.tsx`: remover `showCollapseToggle` e `onCollapsedChange` da interface (o colapso é controlado exclusivamente pelo `AppShell` via prop `collapsed`), ajustar `app-shell.tsx` nos dois pontos de uso e remover o wrapper `NavTooltip` morto do `AppShortcutTile`.

**Arquivos permitidos para criação/edição:**

- `packages/ui/src/components/ecosystem-apps.ts` (criar)
- `packages/ui/src/components/navigation-sidebar.tsx`
- `packages/ui/src/components/app-shell.tsx`
- `packages/ui/src/index.ts`
- `apps/intranet/src/app/(dashboard)/shell.tsx`
- `apps/admin/src/components/admin-shell.tsx`
- `apps/financeiro/src/app/(dashboard)/shell.tsx`
- `apps/tarefas/src/app/(dashboard)/shell.tsx`
- `apps/radio/src/app/admin/shell.tsx`
- `apps/flats/src/app/admin/shell.tsx`
- `apps/flats/src/app/(hospede)/shell.tsx`
- `SESSIONS.md`

**Critérios de aceite:**

- [x] `ECOSYSTEM_APPS` é a única definição de atalhos do ecossistema (verificado por grep: nenhum `const APPS: AppShortcut[]` restante nos apps)
- [x] Ícone e ordem idênticos para o mesmo app em todos os shells
- [x] Shell do hóspede sem launcher; shells de aluno/submissor/instrutor permanecem sem launcher
- [x] `NavigationSidebarProps` sem `showCollapseToggle`/`onCollapsedChange`; drawer mobile sem `() => undefined`
- [x] `AppShortcutTile` sem wrapper de tooltip morto
- [x] `pnpm turbo build` verde (garante que a remoção de props não quebrou nenhum consumidor)
- [x] `pnpm turbo lint typecheck` verde
- [x] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §5 (simplicidade; não parecer IA) e nota do P-0.5 (app launcher). As URLs de produção permanecem hardcoded — agora em **um único lugar**; parametrizar por env para dev local fica fora de escopo (registrar como débito na sessão se incomodar no dia a dia). Filtragem de launcher por papel mais fina que "interno × externo" (ex.: colaborador sem acesso ao Financeiro) não entra aqui: launcher é atalho, não gate — RBAC real continua no middleware + RLS de cada app. Não mexer na estratégia de colapso nem no drawer mobile além da assinatura de props.

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

> ⚠️ **Auditoria 2026-07-22 (cruzamento S-7 × codebase):** dos 3 débitos registrados na S-7, dois foram fechados por corretivos posteriores (`drizzle.config.ts` → barrel em P-0.11; templates concretos de email → blocos B, P-X.10) e um **nunca foi liquidado**: `packages/db/src/client.ts:3` segue importando `./schema/public` (confirmado em F2-F2) — o `db` singleton é tipado com o **stub** de notifications (sem `channel`/`type`/`payload`/`sent_at`) e cego aos demais schemas → corretivo **P-0.6d**. A ressalva de RLS do audit (F2-F1, `notifications_insert_service` sem `TO service_role`) foi fechada nas migrations 0014/0055; a triplicação de helpers foi consolidada em P-0.8 (`makeNotificationInserter`). O gap maior está no lado **in_app**: os critérios "sino com badge", "central com filtros" e "clique marca como lida e navega" valem apenas como componentes — `NotificationBell`/`NotificationCenter` **não são renderizados por nenhum dos 9 apps** (grep: zero usos), o AppShell não tem slot de ações no header e não existe página `/notificacoes` em app algum (P-5.3 listou "Notificações centralizadas" no escopo mas a rota nunca esteve nos arquivos permitidos). Todos os módulos gravam notificações in_app que o usuário não tem como ver; os payloads usam `href` relativo ao app de origem (ex.: `/tarefa/${id}` em tarefas), o que quebraria navegação cross-app → corretivos **P-0.6b** (infra + piloto intranet) e **P-0.6c** (rollout). Fora isso, `EmailLayout` usa Inter — proibida pela identidade visual → corretivo **P-0.6e**.

---

### P-0.6b — Notificações in_app operáveis: slot no AppShell + piloto na intranet (CORRETIVO — bell/central nunca fiados)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** fullstack
**Pré-condições:**

- Branch: `feat/P-0.6b-notifications-wiring`
- Dependências: P-0.6, P-0.8 (kit `@hebron/auth`), P-0.10 (RLS ativa) concluídos
- Env vars: `DATABASE_URL`
- Skill `/impeccable` obrigatória antes de escrever qualquer JSX (G2 + CLAUDE.md)

**Problema que este prompt resolve (contexto — cruzamento S-7 × codebase, auditoria 2026-07-22):**

P-0.6 entregou `NotificationBell` e `NotificationCenter` como componentes "dumb" (decisão registrada na S-7), mas a fiação nunca aconteceu em nenhum prompt posterior: nenhum app os importa, o `AppShell` não tem slot de ações no header (o `UserMenu` é renderizado direto em `app-shell.tsx:289`) e não existe rota de central de notificações em nenhum app. Enquanto isso, os blocos B de **todos** os módulos (P-1.10, P-2.10, P-3.10, P-4.10, P-5.10, P-6.10, P-7.10, P-8.10) gravam notificações `in_app` via `createNotification` — que o usuário não tem como ver. Agravante estrutural: os payloads usam `href` **relativo ao app de origem** (ex.: `payload: { href: "/tarefa/${id}" }` em `apps/tarefas/src/lib/notifications.ts:119`); como as notificações de um usuário misturam módulos na mesma tabela, qualquer sino renderizado fora do app de origem navegaria para rota errada.

**Decisão de abordagem (confirmar com Filipe se houver dúvida — regra G1):**

1. **Slot no AppShell:** novo prop opcional `headerActions?: React.ReactNode`, renderizado no header entre o espaçador e o `UserMenu`. Prop opcional ⇒ zero breaking change nos 11 shells existentes.
2. **Contrato de payload cross-app:** padronizar `payload.module` (id canônico do app de origem — mesmo id de `ECOSYSTEM_APPS`) + `payload.href` relativo ao módulo de origem. Criar `resolveNotificationHref(payload, currentAppId)` em `ecosystem-apps.ts`: mesmo módulo (ou payload antigo sem `module`) → devolve o href relativo como está; módulo diferente → prefixa a URL canônica do módulo (`ECOSYSTEM_APPS` é a fonte única de URLs). Fallback obrigatório: payloads já gravados sem `module` continuam funcionando como hoje.
3. **Leitura/mutação em `packages/db`:** estender `src/notifications.ts` (que já tem `makeNotificationInserter`, P-0.8) com `listNotifications({ userId, unreadOnly?, limit, offset })`, `countUnread(userId)`, `markNotificationRead(id, userId)` e `markAllNotificationsRead(userId)`. **Todas** filtram por `user_id` no WHERE (gate na action + RLS `notifications_select_own`/`notifications_update_own` como segunda camada — defense in depth, nunca apenas uma).
4. **Containers compartilhados em `packages/ui`:** `notification-bell-container.tsx` e `notification-center-container.tsx` — client components que recebem por props as **actions injetadas** (list/markRead/markAllRead) e um callback `navigate` (o app injeta `router.push`). Assim o rollout (P-0.6c) vira fiação fina por app, sem copiar lógica (mesma razão do `getAppShortcuts` centralizado em P-0.5c). Sem dependência de `next/*` dentro de `packages/ui`.
5. **Piloto na intranet** (app canônico — `app.hebronaseec.com.br`): server actions via `next-safe-action` com o kit de P-0.8 (usuário da sessão = único `userId` aceito); shell passa o bell via `headerActions` com `centerHref="/notificacoes"`; página `(dashboard)/notificacoes/page.tsx` com a central (tabs todas/não lidas, paginação incremental). `apps/intranet/src/lib/notifications.ts` passa a incluir `module: "intranet"` nos payloads.
6. **Não alterar** o visual de `notification-bell.tsx`/`notification-center.tsx` (apenas consumi-los). Sem realtime/polling na v1: badge atualiza em navegação/`router.refresh` (registrar como decisão; polling é melhoria futura, não inventar agora).

**Arquivos permitidos para criação/edição:**

- `packages/ui/src/components/app-shell.tsx` (prop `headerActions`)
- `packages/ui/src/components/ecosystem-apps.ts` (`resolveNotificationHref`)
- `packages/ui/src/components/notification-bell-container.tsx` (criar)
- `packages/ui/src/components/notification-center-container.tsx` (criar)
- `packages/ui/src/index.ts` (exports novos)
- `packages/db/src/notifications.ts` (helpers de leitura/mutação)
- `packages/db/src/__tests__/notifications.test.ts` (criar)
- `apps/intranet/src/actions/notifications.ts` (criar)
- `apps/intranet/src/app/(dashboard)/notificacoes/page.tsx` (criar)
- `apps/intranet/src/app/(dashboard)/shell.tsx` (fiação do bell)
- `apps/intranet/src/lib/notifications.ts` (incluir `module` no payload)

**Critérios de aceite:**

- [x] `AppShell` aceita `headerActions` opcional; os 11 shells existentes seguem compilando sem mudança
- [x] Bell na intranet com badge real de não lidas e dropdown das últimas 10
- [x] `/notificacoes` na intranet: tabs todas/não lidas + paginação incremental + marcar todas como lidas
- [x] Clique marca como lida e navega para o href resolvido; notificação de outro módulo (`payload.module` ≠ intranet) navega para a URL absoluta do módulo de origem; payload antigo sem `module` não quebra
- [x] Actions gated pelo kit: usuário só lê/marca as próprias notificações (gate + RLS — teste cobrindo não-vazamento entre usuários)
- [x] `resolveNotificationHref` coberto por teste (mesmo módulo, módulo diferente, payload sem `module`, payload sem `href`)
- [x] Zero import de `next/*` em `packages/ui`
- [x] Lint · Types · `next build` da intranet verdes
- [x] Registrar em SESSIONS.md, referenciando o fechamento parcial do débito de fiação de P-0.6 (rollout fica para P-0.6c)

**Notas:**
Ref: BRAIN.md seção 9. Preferências de notificação por usuário continuam sendo escopo do Admin (fase 1 — nota original de P-0.6); não criar aqui. Não tocar no lado email (`packages/email`) — este prompt é só o lado in_app.

---

### P-0.6c — Notificações in_app: rollout do sino/central aos demais apps (CORRETIVO — continuação de P-0.6b)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** fullstack
**Pré-condições:**

- Branch: `feat/P-0.6c-notifications-rollout`
- Dependências: P-0.6b concluído
- Env vars: `DATABASE_URL`
- Skill `/impeccable` obrigatória antes de escrever qualquer JSX (G2 + CLAUDE.md)

**Escopo:**

Replicar o padrão de P-0.6b (actions gated + containers compartilhados + rota `/notificacoes`) nos apps com AppShell autenticado, e incluir `payload.module` em **todos** os `lib/notifications.ts`. Por app:

1. `src/actions/notifications.ts` — actions via kit (mesmo shape da intranet).
2. Rota `notificacoes/page.tsx` no(s) grupo(s) autenticado(s) com a central.
3. Shell(s) passam o bell via `headerActions` com `centerHref` apontando para a rota local.
4. `src/lib/notifications.ts` ganha `module: "<id canônico>"` nos payloads.

Cobertura: **admin** (`components/admin-shell.tsx`), **projetos** (`(diretoria)/shell.tsx` e `(submissor)/shell.tsx` — uma rota de central por grupo ou compartilhada, o que for mais simples), **plataforma** (`(aluno)/shell.tsx` e `instrutor/shell.tsx`), **financeiro** (`(dashboard)/shell.tsx`), **tarefas** (`(dashboard)/shell.tsx`), **flats** (`admin/shell.tsx` e `(hospede)/shell.tsx`), **radio** (apenas `admin/shell.tsx` — o shell público do player não recebe bell; ouvinte não tem notificações in_app na v1).

**Exceção a registrar:** `apps/documentos` não usa AppShell (superfície pública + área editorial própria) — **não** forçar o bell; registrar em SESSIONS.md como exceção consciente e perguntar ao Filipe se a área editorial deve ganhar o sino numa sessão futura.

**Arquivos permitidos para criação/edição:**

- `apps/{admin,projetos,plataforma,financeiro,tarefas,flats,radio}/src/actions/notifications.ts` (criar)
- `apps/{admin,projetos,plataforma,financeiro,tarefas,flats,radio}/src/app/**/notificacoes/page.tsx` (criar, nos grupos autenticados listados acima)
- Os 10 shells listados no escopo (fiação via `headerActions`)
- `apps/{admin,projetos,plataforma,financeiro,tarefas,flats,radio,documentos,intranet}/src/lib/notifications.ts` (adicionar `module` aos payloads — documentos e intranet inclusos: todo produtor identifica seu módulo mesmo sem consumir o bell)
- `packages/jobs/src/**` — **apenas** se os crons que criam notificações in_app precisarem do `module` no payload (não refatorar nada além disso)

**Critérios de aceite:**

- [x] Bell + central funcionais nos 7 apps do rollout (10 shells); intranet (P-0.6b) inalterada
- [x] Todos os `lib/notifications.ts` (9 apps) e crons de `packages/jobs` que gravam in_app incluem `payload.module`
- [x] Notificação criada no módulo X e clicada no módulo Y navega para a URL absoluta correta (verificado com pelo menos 1 teste do resolver já existente — não duplicar lógica por app)
- [x] Nenhuma cópia local de container/resolver: apps só importam de `@hebron/ui` (grep)
- [x] Exceção do documentos registrada em SESSIONS.md
- [x] Lint · Types · `next build` dos 7 apps verdes
- [x] Registrar em SESSIONS.md, fechando o débito de fiação de P-0.6

**Notas:**
Rollout mecânico — a inteligência está toda em P-0.6b. Se algum shell tiver particularidade que exija decisão de produto (ex.: hóspede ver ou não notificações de módulos internos), **não decidir sozinho**: RLS já limita a `user_id` próprio, então o que o hóspede vê são apenas as notificações dele; em dúvida sobre exibir o bell num papel externo, perguntar ao Filipe.

---

### P-0.6d — Client Drizzle tipado com o schema completo (CORRETIVO — débito S-7/F2-F2 nunca liquidado)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-0.6d-db-client-schema`
- Dependências: P-0.6, P-0.11 concluídos
- Env vars: `DATABASE_URL` (para rodar os testes de `packages/db`)

**Problema que este prompt resolve (contexto — cruzamento S-7 × codebase, auditoria 2026-07-22):**

A S-7 registrou como débito que `packages/db/src/client.ts` "ainda importa de `./schema/public`" — e ele importa até hoje (`client.ts:3`), fato reconfirmado pela auditoria de fase 2 (F2-F2: "o débito S-7 nunca foi liquidado; os apps contornam importando `@hebron/db/schema` diretamente"). Consequências: (1) o `db` singleton, na API relacional `db.query.*`, é tipado com o **stub** de `notifications` de `public.ts:172` — sem `channel`, `type`, `payload`, `sent_at` — e não enxerga nenhum dos schemas de módulo; (2) existem **duas** definições `pgTable("notifications")` vivas no código (`public.ts` e `notifications.ts`), um drift latente que o barrel `schema/index.ts` esconde mas não elimina — qualquer import direto do stub compila e lê colunas erradas.

**Decisão de abordagem (confirmar com Filipe se houver dúvida — regra G1):**

1. `client.ts` passa a importar `* as schema from "./schema/index"` — o `db` fica tipado com o schema completo (todos os módulos + notifications expandido). Sem ciclo de import: nada em `src/schema/**` importa `client.ts`.
2. Remover de `public.ts` o stub `notifications` e os tipos `Notification`/`NewNotification` derivados dele (a definição canônica é `schema/notifications.ts`, que o barrel já exporta). Verificado em 2026-07-22: **nenhum** arquivo importa `notifications` a partir de `schema/public` — os imports diretos de `schema/public` existentes (`consents.ts`, `system-actor.ts`, `anonymization.ts`, testes) usam outras tabelas e não são afetados.
3. Atualizar o comentário do barrel `schema/index.ts` (a ressalva "excluindo o stub" deixa de existir) — os re-exports em si não mudam.
4. **Não** tocar em `drizzle.config.ts` (já aponta para o barrel desde P-0.11) nem em migrations (a tabela real já foi expandida por `0001_notifications.sql`). Correção puramente de tipos/imports — nenhum SQL novo.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/client.ts` (import do barrel)
- `packages/db/src/schema/public.ts` (remover stub + tipos derivados)
- `packages/db/src/schema/index.ts` (comentário)

**Critérios de aceite:**

- [x] `db.query.notifications` tipado com `channel`/`type`/`payload`/`sent_at`; schemas de módulo visíveis em `db.query.*`
- [x] Grep: uma única definição `pgTable("notifications")` no repo
- [x] Grep: zero imports de `notifications` a partir de `schema/public`
- [x] `pnpm --filter @hebron/db test` verde (suites existentes não regridem)
- [x] `pnpm turbo lint typecheck` verde (workspace inteiro — apps que importam `@hebron/db` compilam sem mudança)
- [x] Registrar em SESSIONS.md, fechando o débito da S-7

**Notas:**
Se o typecheck do workspace revelar algum consumidor silencioso do stub, **não** adaptá-lo às escondidas: listar em SESSIONS.md e corrigir apontando para o schema canônico.

---

### P-0.6e — Tipografia institucional nos emails (CORRETIVO — EmailLayout usa Inter, proibida pela identidade)

**Fase:** 0
**Módulo:** fundacao
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-0.6e-email-typography`
- Dependências: P-0.6 concluído
- Env vars: nenhuma (`RESEND_API_KEY` não é necessária — mudança só de template)

**Problema que este prompt resolve (contexto — cruzamento S-7 × codebase, auditoria 2026-07-22):**

`packages/email/src/components/layout.tsx:27-28` define `fontFamily = 'Inter, -apple-system, …'` — e re-exporta essa stack como `emailFontFamily` para todos os templates concretos. A identidade visual (CLAUDE.md, BRAIN §5, PATCH 001) determina Parkinsans (display) + Titillium Web (UI/corpo) e proíbe Inter explicitamente. O desvio passou por todos os blocos B (P-1.10 → P-8.10) porque os templates herdam a stack do layout.

**Decisão de abordagem (confirmar com Filipe se houver dúvida — regra G1):**

1. Adicionar `<Font>` do `@react-email/components` dentro do `<Head>` do `EmailLayout`: webFont Google Fonts para **Titillium Web** (400/600/700), `fallbackFontFamily` de sistema (`Helvetica`/`sans-serif`).
2. Trocar a const `fontFamily` para `'Titillium Web', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` (**sem Inter em nenhuma posição da stack**). O re-export `emailFontFamily` mantém o nome — templates concretos herdam a correção sem edição.
3. Título do header ("Hebron Aseec") pode usar **Parkinsans** com fallback para a mesma stack — segundo `<Font>` apenas se o resultado justificar; caso contrário manter Titillium bold e registrar a escolha em SESSIONS.md.
4. Clientes de email sem suporte a web font (Outlook desktop, etc.) caem no fallback de sistema — limitação conhecida do meio, aceitável e a registrar; o que a regra proíbe é **Inter**, não o fallback.
5. Não tocar em `send.ts`, nos templates concretos, nem em cores/espacamentos do layout.

**Arquivos permitidos para criação/edição:**

- `packages/email/src/components/layout.tsx`

**Critérios de aceite:**

- [x] Grep `Inter` em `packages/email/src` → zero ocorrências
- [x] `<Font>` com Titillium Web no `<Head>`; stack de fallback sem Inter
- [x] Preview via `pnpm --filter @hebron/email email:dev` renderiza com Titillium Web (screenshot ou registro em SESSIONS.md)
- [x] Templates concretos existentes não precisam de edição (herdam via `emailFontFamily`)
- [x] Lint · Types verdes
- [x] Registrar em SESSIONS.md

**Notas:**
Observação lateral (não é escopo deste prompt): `send.ts` usa `renderAsync`, deprecado nas versões novas do React Email em favor de `render` assíncrono — trocar apenas quando o package for atualizado de versão, em sessão própria.

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

### P-1.10b — Consolidação e acesso ao editor de templates de email (CORRETIVO)

**Fase:** 1
**Módulo:** admin
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-1.10b-admin-email-templates-access`
- Dependências: P-1.10 concluído, **P-1.12b concluído** (design system unificado), P-1.25 concluído (fiação/leitura protegida do Admin)
- Env vars: nenhuma
- Skill: **invocar `/impeccable` antes de começar**

**Problema que este prompt resolve (contexto):**
O critério de aceite de P-1.10 "Templates editáveis no Admin com preview ao vivo" está marcado `[x]` mas **não é atingível no app rodando**. Existem duas telas paralelas e desconectadas:

1. `apps/admin/src/app/(dashboard)/templates-email/page.tsx` — editor **completo e funcional** (17 slugs em grupos Geral/Projetos, `EmailTemplateEditor` + preview ao vivo + save action com audit log), porém **órfão**: nenhum link no `admin-shell.tsx` nem em qualquer tela aponta para ele. Só abre digitando a URL. Além disso, esse arquivo e `email-template-editor.tsx`/`email-template-preview.tsx` **não entraram na lista de arquivos do P-1.12b** (S-22b) — ainda carregam hex hardcoded (ex.: `#F0FDF4`, `#F7F8FC`, `#BBF7D0`), violando o design system.
2. `apps/admin/src/app/(dashboard)/configuracoes/page.tsx` (aba `email-templates`) — mostra apenas um preview **somente-leitura** com o texto "Edição de templates disponível em breve via interface dedicada" (a "interface dedicada" é justamente a de cima, que já existe).

Ainda: a tabela `admin.email_templates` **não é semeada** em `packages/db/src/seed.ts` — num banco novo as duas telas renderizam vazias. O design-ref `design-refs/admin/screen-settings.jsx` (`{ key: "templates", label: "Templates de email" }`, editor com botão Salvar) confirma que a IA correta é: o **editor vive dentro de Configurações → aba "Templates de email"**.

**Escopo (siga na ordem):**

1. **Consolidar na aba de Configurações:** substituir o `EmailTemplatesPanel` somente-leitura em `configuracoes/page.tsx` (aba `email-templates`) pelo **editor real** — reutilizar `EmailTemplateEditor` + `EmailTemplatePreview` e a `saveEmailTemplate` server action (hoje inline em `templates-email/page.tsx`), preservando: agrupamento Geral/Projetos, seleção por slug via `searchParams`, save com `logAudit` e `revalidatePath`, e o gate `super_admin`.
2. **Eliminar a rota órfã:** converter `templates-email/page.tsx` em um **redirect permanente** para `/configuracoes?tab=email-templates` (`redirect()` no RSC), para não quebrar links salvos — ou remover a rota se não houver links externos. Não deixar duas telas editáveis.
3. **Migrar hex→token** em `email-template-editor.tsx` e `email-template-preview.tsx` (e no que for movido) para os tokens canônicos `--hb-*`/semânticos, fechando a lacuna herdada de P-1.12b. Rode e zere o grep de hex de marca conforme P-1.12b.
4. **Semear `admin.email_templates`** em `packages/db/src/seed.ts` (idempotente, `onConflictDoNothing` por `slug`) com os textos padrão de **todos os slugs** já listados em `TEMPLATE_META` (Geral + Projetos), derivando `subject`/`bodyText`/`bodyHtml` do conteúdo atual dos componentes React Email correspondentes em `packages/email/src/templates/*`. Usar as variáveis canônicas em português no corpo: `{{nome}}`, `{{link}}`, `{{papel}}`, `{{modulo}}` (as mesmas exibidas na UI).

**Arquivos permitidos para criação/edição:**

- `apps/admin/src/app/(dashboard)/configuracoes/page.tsx`
- `apps/admin/src/app/(dashboard)/templates-email/page.tsx` (converter em redirect ou remover)
- `apps/admin/src/components/email-template-editor.tsx`
- `apps/admin/src/components/email-template-preview.tsx`
- `packages/db/src/seed.ts`

**Critérios de aceite:**

- [x] A aba `Configurações → Templates de email` é **editável** (edição de assunto + corpo, preview ao vivo, save) e é acessível pela navegação (Configurações está no sidebar)
- [x] `/templates-email` não é mais uma segunda tela editável (redirect para `/configuracoes?tab=email-templates` ou removida)
- [x] `grep -rn "#f0fdf4\|#f7f8fc\|#bbf7d0\|#202c85\|#ea5a06\|#07b4e7\|#6b7280" apps/admin/src/components/email-template-*.tsx apps/admin/src/app/(dashboard)/templates-email` retorna vazio (zero hex de marca)
- [x] `seed.ts` popula `admin.email_templates` para todos os slugs de `TEMPLATE_META` (idempotente); num banco recém-semeado a aba mostra os textos padrão
- [x] Save continua registrando `email_template.updated` no audit log e revalidando a rota
- [x] Gate `super_admin` preservado
- [x] Testes do Admin continuam passando (103/105 — as 2 falhas restantes são drift de ambiente pré-existente, ver S-181 em SESSIONS.md)
- [x] `pnpm turbo build lint typecheck` verde
- [x] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §6.1 (templates editáveis) e §5 (design system). Este prompt **não** conecta os emails enviados aos textos do banco — isso é P-1.10c. Aqui só se resolve o acesso, a duplicação, o design system e o seed. Não invente novos slugs além dos já presentes em `TEMPLATE_META`.

---

### P-1.10c — Emails enviados a partir dos templates do banco (CORRETIVO)

**Fase:** 1
**Módulo:** admin / email
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.10c-db-driven-emails`
- Dependências: **P-1.10b concluído** (templates semeados e editáveis)
- Env vars: `DATABASE_URL`, `RESEND_API_KEY`

**Problema que este prompt resolve (contexto):**
Os emails **realmente enviados** (convite, boas-vindas, reset de senha, e demais) renderizam **componentes React hardcoded** (`InvitationEmail`, `WelcomeEmail`, …). A tabela `admin.email_templates`, editável pelo super_admin (P-1.10b), é **cosmética**: editar uma linha **não altera nenhum email enviado**. Isso contradiz BRAIN §6.1 ("templates editáveis, nunca hardcoded"). O seam já existe e nunca foi ligado: `packages/email/src/lib/send.ts` (`SendEmailOptions`) aceita `html?: string` e `subject?: string` como override, documentado como "usado quando o admin sobrescreveu o template via Admin", com precedência sobre o componente React — mas **nenhum caller carrega a linha do banco e passa `html`**.

**Escopo (siga na ordem):**

1. **Helper puro de interpolação** em `packages/email` (mantém o pacote agnóstico a banco): `interpolateStoredTemplate({ subject, bodyHtml, bodyText }, variables: Record<string,string>) => { subject: string; html: string; text: string }`, substituindo `{{chave}}` de forma segura (escapar HTML dos valores em `bodyHtml`; deixar placeholders desconhecidos intactos ou vazios — decidir e documentar). Exportar em `packages/email/src/index.ts`.
2. **Loader do banco** para a linha do template por `slug` (função em `packages/db` ou lib compartilhada `@hebron/db/email-templates`), retornando `null` quando não houver linha.
3. **Ligar nos envios:** nas actions que disparam email (convite em `apps/admin/src/actions/invitations.ts`; boas-vindas em `apps/intranet/src/actions/invitations.ts` e no `approveSignup` de `apps/admin/src/actions/users.ts`; reset de senha), **carregar a linha do template** pelo slug e, quando existir, passar `email.html` + `email.subject` (via `interpolateStoredTemplate`); quando **não existir**, manter o componente React atual como **fallback** (comportamento inalterado). O override do DB tem precedência (já suportado por `send.ts`).
4. **Contrato de variáveis:** o dicionário passado deve casar com as variáveis semeadas em P-1.10b (`{{nome}}`, `{{link}}`, `{{papel}}`, `{{modulo}}`, …). Documentar por slug quais variáveis são fornecidas.

**Arquivos permitidos para criação/edição:**

- `packages/email/src/lib/interpolate.ts` (criar) + `packages/email/src/index.ts` (export)
- `packages/db/src/email-templates.ts` (criar — loader por slug) + export no barrel/`package.json`
- `apps/admin/src/actions/invitations.ts`
- `apps/admin/src/actions/users.ts`
- `apps/intranet/src/actions/invitations.ts`
- `apps/admin/src/__tests__/` e/ou `apps/intranet/src/__tests__/` (teste de interpolação + fallback)

**Critérios de aceite:**

- [x] `interpolateStoredTemplate` substitui `{{var}}` corretamente e escapa HTML dos valores; testado
- [x] Com uma linha custom em `admin.email_templates`, o email enviado usa o texto do banco (assunto + corpo), não o componente React
- [x] Sem linha no banco, o envio cai no componente React atual (fallback), sem regressão
- [x] Convite, boas-vindas e reset de senha passam a respeitar o template editado
- [x] Nenhuma mudança de regra de negócio além da fonte do texto do email
- [x] Testes (novos + existentes de Admin/Intranet) passam
- [x] `pnpm turbo build lint typecheck` verde
- [x] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §6.1. `packages/email` **permanece agnóstico a banco** — quem lê o banco é o caller (action) ou `@hebron/db`; o pacote de email só interpola e envia. Não remover os componentes React Email: eles seguem como fallback e como base do seed (P-1.10b).

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
- `apps/documentos/src/app/editorial/layout.tsx`
- `apps/documentos/src/app/editorial/page.tsx`
- `apps/documentos/src/app/editorial/novo/page.tsx`

**Critérios de aceite:**

- [x] Home com seção de destaques e editais abertos em destaque
- [x] Listagem com filtros por categoria, visibilidade e tags
- [x] Página de documento com viewer inline, download e versões
- [x] Página de edital com cronograma visual, FAQ e botão "submeter projeto"
- [x] Busca full-text com resultados categorizados
- [x] Área editorial protegida (super_admin/editor) — `requireEditorSession()` em `apps/documentos/src/lib/session.ts`, desde S-61
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
Formulários editoriais: criar/editar documento (título, slug, conteúdo Markdown ou upload PDF, categoria, tags, visibilidade). Criar/editar edital (herda documento + datas abertura/fechamento, tipo de projeto, categoria de projeto, FAQ). Gestão de categorias (criar, editar, mover entre pais na árvore — ordem entre irmãos é sempre alfabética, ver nota P-1.16c). Subscriptions (email para alertas por categoria).

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

> **P-1.16c (CORRETIVO):** o critério original prometia "reordenar na árvore" com alça de arrastar, mas nunca teve wiring — cenário puramente visual. Decisão registrada em P-1.16c: saída **(b)**, escopo reduzido. A alça de arrastar foi removida de `category-form.tsx`; `categories-manager.tsx` agora expõe reparentamento (mover categoria para outro pai) via `moveCategoryInTree`, com seletor de árvore e confirmação. A ordem entre categorias irmãs permanece alfabética (já era o comportamento real em toda leitura de árvore) — não há coluna de ordem no banco. Ver SESSIONS.md.

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

### P-1.14b — Badge de visibilidade e pílula de status únicos (CORRETIVO)

**Fase:** 1
**Módulo:** documentos
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-1.14b-docs-badges`
- Dependências: P-1.27 concluído (S-61)
- Env vars: nenhuma
- Skill: **invocar `/impeccable` antes de começar**

**Problema que este prompt resolve (contexto):**
O critério de P-1.14 "DocumentCard com badge de visibilidade (público=verde, interno=azul, restrito=vermelho)" está marcado `[x]`, mas hoje **o mesmo dado é pintado de seis maneiras diferentes**, cada uma com sua própria tabela local:

- `apps/documentos/src/components/document-card.tsx:13-32` (`VISIBILITY`, com ícone + dot)
- `apps/documentos/src/components/document-viewer.tsx:356` (`VISIBILITY_LABEL`)
- `apps/documentos/src/app/[slug]/page.tsx:256` (`VISIBILITY_MAP`)
- `apps/documentos/src/app/editais/[slug]/page.tsx:292` (`VISIBILITY_MAP` — cópia literal da anterior)
- `apps/documentos/src/app/editorial/page.tsx:43,49` e `apps/documentos/src/app/editorial/documentos/page.tsx:10,16` (`VISIBILITY_LABEL` + `VISIBILITY_CLS`)
- `apps/documentos/src/app/busca/page.tsx:513-527` e `apps/documentos/src/app/page.tsx:673-681` — **ternários inline sem as cores semânticas**: na busca todo badge sai cinza (`--bg-alt`/`--fg-muted`), e na home só "Público" aparece, sem cor. O leitor de `/busca` não distingue interno de restrito.

O mesmo vale para o status do edital (aberto / encerra em breve / encerrado / permanente), duplicado em `components/edital-card.tsx:20-45`, `app/editais/[slug]/page.tsx:305-325`, `app/editorial/page.tsx:55-66` e `app/editorial/editais/page.tsx:20-32`. O design-ref resolve os dois com um componente só: `design-refs/documentos/components.jsx:634` (`VisibilityBadge`) e `:643` (`StatusPill`).

**Escopo (siga na ordem):**

1. **Criar `visibility-badge.tsx`** exportando `VisibilityBadge` (props: `visibility`, `size?: "sm" | "md"`, `withIcon?: boolean`) e a constante `VISIBILITY` como fonte única de rótulo/ícone/classe — herdando o mapeamento já correto de `document-card.tsx` (público → `--hb-green`, interno → `--hb-cyan`, restrito → `--color-destructive-muted`/`--hb-red`). Sem hex, sem CSS de app novo.
2. **Criar `edital-status-pill.tsx`** exportando `EditalStatusPill` e o helper puro `resolveEditalStatus({ opensAt, closesAt })` → `"open" | "closing_soon" | "closed" | "permanent"`, extraído de `edital-card.tsx` (que hoje é o único cálculo completo).
3. **Substituir as seis cópias de visibilidade e as quatro de status** pelos dois componentes. Nenhum arquivo pode manter tabela local de `visibility` ou de status de edital depois deste prompt.
4. **Corrigir a regressão visual de `/busca` e da home**: o badge passa a usar as cores semânticas nas três visibilidades (não só "Público"), igual ao resto do portal.

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/components/visibility-badge.tsx` (criar)
- `apps/documentos/src/components/edital-status-pill.tsx` (criar)
- `apps/documentos/src/components/document-card.tsx`
- `apps/documentos/src/components/document-viewer.tsx`
- `apps/documentos/src/components/edital-card.tsx`
- `apps/documentos/src/app/page.tsx`
- `apps/documentos/src/app/busca/page.tsx`
- `apps/documentos/src/app/[slug]/page.tsx`
- `apps/documentos/src/app/editais/page.tsx`
- `apps/documentos/src/app/editais/[slug]/page.tsx`
- `apps/documentos/src/app/editorial/page.tsx`
- `apps/documentos/src/app/editorial/documentos/page.tsx`
- `apps/documentos/src/app/editorial/editais/page.tsx`

**Critérios de aceite:**

- [x] `grep -rn "VISIBILITY_MAP\|VISIBILITY_CLS\|VISIBILITY_LABEL" apps/documentos/src` retorna apenas `visibility-badge.tsx`
- [x] `grep -rn "STATUS_COLOR\|STATUS_LABEL" apps/documentos/src` retorna apenas `edital-status-pill.tsx`
- [x] `/busca` e a home mostram as três visibilidades com as cores semânticas (verde / azul-claro / vermelho), idênticas às da página de documento
- [x] Cálculo de status do edital vive num único helper; `EditalCard` e as três telas que o repetiam passam a consumi-lo (mais duas cópias adicionais encontradas fora do enunciado — ver S-183)
- [x] Zero hex e zero CSS de app novo (BRAIN §5)
- [x] `pnpm --filter documentos typecheck lint test` verdes
- [x] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §5 e §6.7; design-ref `design-refs/documentos/components.jsx` (`VisibilityBadge`, `StatusPill`). Prompt de consolidação: não muda regra de visibilidade nem RLS, só a camada de apresentação.

---

### P-1.15b — Listagem por categoria: a rota que nunca foi criada (CORRETIVO)

**Fase:** 1
**Módulo:** documentos
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-1.15b-docs-categoria`
- Dependências: **P-1.14b concluído** (badge único), P-1.27 concluído (S-61)
- Env vars: nenhuma
- Skill: **invocar `/impeccable` antes de começar**

**Problema que este prompt resolve (contexto):**
O escopo de P-1.15 pede "**listagem por categoria com filtros (visibilidade, tags, data)**" e o critério "Listagem com filtros por categoria, visibilidade e tags" está `[x]` — mas **essa tela não existe**. O que existe é `/busca`, que aceita `?categoria=`, `?tags=` e `?tipo=` e **não tem filtro de visibilidade nenhum** (`app/busca/page.tsx:113-121` lê apenas `q`, `categoria`, `tags`, `tipo`). A seção "Explore por área" da home (`app/page.tsx:867-885`) linka para `/busca?categoria=<id>` como substituto — o usuário cai numa tela de resultados de busca, sem cabeçalho da categoria, sem subcategorias, sem contagem, sem alternância cartões/lista.

O design-ref tem a tela inteira especificada: `design-refs/documentos/screens-public.jsx:355` (`CategoryScreen`), rota `/c/<cat>` em `app.jsx:107`, com cabeçalho da categoria (ícone, nome, contagem "N documentos disponíveis para o seu perfil"), chips de subcategoria com contagem, chips de visibilidade **renderizados conforme o papel** (`Públicos` sempre; `Internos`/`Restritos` só para quem pode vê-los), alternância **Cartões / Lista** e grid onde edital ocupa duas colunas.

Consequência colateral: `apps/documentos/src/components/document-card.tsx` (`DocumentCard`, P-1.14) está **órfão — zero imports em todo o app** (`grep -rn "DocumentCard" apps/documentos/src` só devolve a própria definição). É o consumidor natural do grid desta tela. Note que S-61 registrou "zero componentes do Bloco A órfãos" como verificado; isso deixou de valer quando `/busca` foi reescrita como lista de resultados.

**Escopo (siga na ordem):**

1. **Criar a rota `/categoria/[slug]`** (RSC), lendo por `withAuthenticatedContext` + `getOptionalActorId` — mesmo padrão de `/busca` e `/editais`, para que a RLS filtre a visibilidade de verdade (F2-D1). Nunca usar o client superuser `db`.
2. **Cabeçalho + navegação:** breadcrumb (Início › Categorias › Nome), contagem de documentos visíveis ao papel atual, descrição da categoria; chips de subcategoria com contagem (`categories.parentId`).
3. **Filtro de visibilidade por URL** (`?vis=public|internal|restricted`), com os chips renderizados apenas para as visibilidades que o papel atual enxerga — o resultado da RLS é a fonte da verdade, o chip não pode oferecer o que a consulta não devolve. Adicionar também o recorte por período (`?periodo=`) previsto no escopo de P-1.15 (ex.: 12 meses / 24 meses / tudo), aplicado sobre `updatedAt`.
4. **Alternância Cartões / Lista** (`?view=grid|list`), grid usando **`DocumentCard`** (reconectado) e `EditalCard` ocupando duas colunas; a lista reusa o padrão `docs-row` já existente na home.
5. **Repontar a home:** os cards de "Explore por área" passam a linkar `/categoria/<slug>` (o slug já vem da consulta — `makeCat` em `app/page.tsx:118`), não mais `/busca?categoria=<id>`.
6. **Estados:** `loading.tsx` com `DocumentCardSkeleton`/`DocumentListSkeleton` e vazio contextual com versículo, no padrão das demais telas.
7. **Bookkeeping em PROMPTS.md** (parte deste prompt): marcar o critério `[~] Área editorial protegida (super_admin/editor)` de P-1.15 como `[x]` — atendido por `requireEditorSession()` (`apps/documentos/src/lib/session.ts`) desde S-61 — e corrigir a lista de arquivos de P-1.15, que ainda nomeia o route-group `(editorial)/...` quando a estrutura real é o segmento `editorial/...` (desvio nunca registrado como decisão, ver `AUDIT/02-codigo-documentos.md:11`).

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/app/categoria/[slug]/page.tsx` (criar)
- `apps/documentos/src/app/categoria/[slug]/loading.tsx` (criar)
- `apps/documentos/src/app/page.tsx` (apenas os links da seção de categorias)
- `apps/documentos/src/components/document-card.tsx` (ajustes mínimos para o grid, se necessário)
- `apps/documentos/src/__tests__/` (teste de visibilidade por papel na nova rota)
- `PROMPTS.md` (bookkeeping do item 7)

**Critérios de aceite:**

- [x] `/categoria/<slug>` existe, com cabeçalho, contagem, chips de subcategoria, filtro de visibilidade e de período, e alternância cartões/lista
- [x] Anônimo não vê documento `internal`/`restricted` na listagem nem na contagem — teste de regressão no padrão do bloco "F2-D1/F2-D2" de `rls.test.ts`
- [x] Chips de visibilidade só aparecem para as visibilidades que o papel atual enxerga
- [x] `DocumentCard` tem consumidor real; `grep -rn "DocumentCard" apps/documentos/src` devolve ≥1 import
- [x] Cards de categoria da home levam a `/categoria/<slug>`; nenhum link do app aponta para `/busca?categoria=`
- [x] Vazio com versículo e `loading.tsx` com skeleton
- [x] Critério `[~]` de P-1.15 fechado e lista de arquivos de P-1.15 corrigida para `editorial/...`
- [x] `pnpm --filter documentos typecheck lint test` verdes
- [x] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §6.7; design-ref `design-refs/documentos/screens-public.jsx:355` (`CategoryScreen`). `/busca` **não** deve ser alterada aqui: as duas telas têm propósitos distintos (busca = resultados em lista; categoria = navegação editorial). Não criar rota `/c/` — a URL canônica em português é `/categoria/<slug>`.

---

### P-1.16b — Assinaturas: preferência por tipo de alerta de verdade (CORRETIVO)

**Fase:** 1
**Módulo:** documentos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.16b-docs-assinaturas`
- Dependências: P-1.27 concluído (S-61)
- Env vars: `DATABASE_URL`

**Problema que este prompt resolve (contexto):**
`SubscriptionForm` (P-1.16) expõe **dois toggles independentes por categoria** — "avisar em nova versão" e "avisar quando abrir edital" (`components/subscription-form.tsx:37-42`, decisão registrada em S-26) — mas o banco não tem onde guardar isso: `documentos.subscriptions` armazena só `(user_id, category_id)` (`packages/db/src/schema/documentos.ts:174-195`). O wrapper colapsa os dois num só: `app/assinaturas/_client.tsx:41` inscreve a categoria se **qualquer** um dos toggles estiver ligado, e `:28-32` recarrega a tela com **ambos hardcoded em `true`**.

Resultado: o usuário desliga "nova versão", salva, vê "Preferências salvas." — e ao recarregar o toggle está ligado de novo. Pior, ele continua recebendo o e-mail que pediu para não receber: `lib/notifications.ts:57-62` (`notifyNewDocument`) e `notifyEditalOpen` consultam a mesma tabela sem nenhum filtro por tipo de evento. É uma UI que mente sobre o estado persistido.

**Escopo (siga na ordem):**

1. **Migration** (hand-write `NNNN_*.sql`, sem drizzle-kit): adicionar `on_new_version boolean NOT NULL DEFAULT true` e `on_edital_open boolean NOT NULL DEFAULT true` em `documentos.subscriptions`; refletir em `packages/db/src/schema/documentos.ts`. Linhas existentes ficam com ambos `true` — o comportamento atual preservado.
2. **Action de salvamento:** substituir o par `subscribe`/`unsubscribe` por chamada única `saveSubscriptions({ items: [{ categoryId, onNewVersion, onEditalOpen }] })` (upsert por `(user_id, category_id)`; remove a linha quando os dois toggles ficam `false`), mantendo `subscribe`/`unsubscribe` apenas se houver outro chamador. Gate `authenticatedAction` e audit no padrão do módulo.
3. **Honrar os flags no envio:** `notifyNewDocument` filtra por `on_new_version = true`; `notifyEditalOpen` filtra por `on_edital_open = true`.
4. **Carregar o estado real:** `app/assinaturas/page.tsx` passa os flags persistidos ao `_client.tsx`, que para de fabricar `true` e para de colapsar os toggles no submit.
5. **Teste:** assinante com `on_new_version = false` **não** recebe notificação ao publicar documento na categoria, e **recebe** ao abrir edital na mesma categoria (estender `actions.test.ts`, que já cobre o caminho feliz desde S-61).

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/NNNN_documentos_subscription_prefs.sql` (criar — próximo número livre; hoje `0060`)
- `packages/db/src/schema/documentos.ts`
- `apps/documentos/src/actions/subscriptions.ts`
- `apps/documentos/src/lib/notifications.ts`
- `apps/documentos/src/app/assinaturas/page.tsx`
- `apps/documentos/src/app/assinaturas/_client.tsx`
- `apps/documentos/src/__tests__/actions.test.ts`

**Critérios de aceite:**

- [x] `documentos.subscriptions` tem `on_new_version` e `on_edital_open`, com RLS preservada (policies existentes continuam válidas)
- [x] Desligar um toggle, salvar e recarregar devolve exatamente o estado salvo
- [x] `notifyNewDocument` e `notifyEditalOpen` respeitam os flags — coberto por teste
- [x] Desligar os dois toggles remove a inscrição (nenhuma linha órfã)
- [x] Nenhum toggle da UI sem correspondente persistido (auditar `SubscriptionFormValues` campo a campo)
- [x] `pnpm --filter documentos typecheck lint test` verdes; migration aplicada no Supabase de dev
- [x] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §6.7 (assinaturas por categoria). Alternativa descartada: simplificar a UI para um único toggle — a granularidade por tipo de evento é útil (quem acompanha editais raramente quer o ruído de cada nova versão de política) e já está desenhada; o que falta é o backend. Não introduzir frequência/digest aqui.

---

### P-1.16c — Reordenação de categorias: ligar a UI ao backend (ou remover a promessa) (CORRETIVO)

**Fase:** 1
**Módulo:** documentos
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-1.16c-docs-categorias-ordem`
- Dependências: P-1.27 concluído (S-61)
- Env vars: `DATABASE_URL`

**Problema que este prompt resolve (contexto):**
O critério de P-1.16 "Gestão de categorias (criar, editar, **reordenar** na árvore)" está `[x]`, mas a reordenação é **cenário**: `components/category-form.tsx:183` declara no próprio comentário "Reorder tree row (simplified drag indicator — visual only in Phase 1)" e renderiza linhas com `cursor: "grab"`, alça `GripVertical` e `title="Arraste para reordenar"` (`:206-222`) — **sem um único handler de drag**. O usuário arrasta e nada acontece, sem erro e sem feedback. S-26 registrou o débito com "wiring real na fase B"; a fase B passou (P-1.20/P-1.27) e o débito ficou sem dono (padrão PD-4 do `AUDIT/02-codigo-SINTESE.md:80`).

Do outro lado há a metade oposta do mesmo débito: a action `moveCategoryInTree` (`actions/categories.ts:235`) existe, tem proteção anti-ciclo e **teste** (`__tests__/actions.test.ts:416`), e **nenhum chamador em toda a UI**. Além disso ela só troca `parentId` — `documentos.categories` **não tem coluna de ordem** (`packages/db/src/schema/documentos.ts`), então a ordenação entre irmãos que a alça promete não é sequer representável hoje.

**Escopo (siga na ordem):**

1. **Decidir e registrar** (o prompt aceita as duas saídas, mas exige uma delas — não deixar a alça decorativa):
   - **(a) Ordem explícita:** migration adicionando `sort_order integer NOT NULL DEFAULT 0` em `documentos.categories`, `ORDER BY sort_order, name` em toda leitura de árvore (`actions/categories.ts`, `CategoryTree`, seletores dos formulários), e uma action `reorderCategory({ id, newParentId, newIndex })` (renomeando/estendendo `moveCategoryInTree`, preservando a checagem de descendência e o audit `category.updated`).
   - **(b) Escopo reduzido:** remover a alça e o `cursor: grab` de `category-form.tsx` e expor em `categories-manager.tsx` apenas o **reparentamento** — que é o que `moveCategoryInTree` já faz — via seletor "Mover para" com confirmação; a ordem visual permanece alfabética e isso passa a estar escrito.
2. **Ligar `categories-manager.tsx`** (a tela viva em `/editorial/categorias`) à action escolhida, com estado de carregamento, tratamento de erro (a mensagem de ciclo já existe no servidor) e `router.refresh()` no padrão das demais mutações do arquivo.
3. **Acessibilidade:** se a saída for (a) com drag, prover alternativa por teclado (mover acima / abaixo / mudar pai) — arrastar não pode ser o único caminho.
4. **Atualizar o critério de P-1.16** em PROMPTS.md conforme a saída escolhida, com uma linha de nota dizendo qual foi.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/NNNN_documentos_category_order.sql` (criar — apenas na saída (a); próximo número livre)
- `packages/db/src/schema/documentos.ts` (apenas na saída (a))
- `apps/documentos/src/actions/categories.ts`
- `apps/documentos/src/components/categories-manager.tsx`
- `apps/documentos/src/components/category-form.tsx`
- `apps/documentos/src/components/category-tree.tsx`
- `apps/documentos/src/__tests__/actions.test.ts`
- `PROMPTS.md` (critério de P-1.16 + nota da decisão)

**Critérios de aceite:**

- [x] Nenhuma afordância de arrastar sem comportamento: `grep -n "Arraste para reordenar\|cursor: \"grab\"" apps/documentos/src` retorna vazio **ou** o drag funciona de ponta a ponta
- [x] `moveCategoryInTree` (ou sua sucessora) tem chamador real na UI editorial
- [x] Reordenar/mover persiste, sobrevive a reload e grava `category.updated` no audit
- [x] Tentativa de mover categoria para um descendente é bloqueada com mensagem legível na UI
- [x] Operação alcançável por teclado
- [x] `pnpm --filter documentos typecheck lint test` verdes
- [x] Registrar em SESSIONS.md — incluindo qual saída foi escolhida e por quê

**Notas:**
Ref: BRAIN.md §6.7. Recomendação: saída **(b)** se a árvore de categorias for rasa e estável (é o caso hoje — a ordem alfabética não incomoda ninguém), (a) só se a diretoria pedir controle editorial da ordem. O importante é que a tela pare de prometer o que não faz.

---

### P-1.17b — Fronteiras de erro e cópia de estados vazios (CORRETIVO)

**Fase:** 1
**Módulo:** documentos
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-1.17b-docs-error-states`
- Dependências: P-1.27 concluído (S-61)
- Env vars: nenhuma
- Skill: **invocar `/impeccable` antes de começar**

**Problema que este prompt resolve (contexto):**
O critério de P-1.17 "Estado de erro com retry" está `[x]`, mas depois da integração com banco (P-1.21/P-1.27) **sobrou um só**: o `try/catch` da home (`app/page.tsx:462-499`). A `/busca`, que S-27 tinha entregue com `searchError` + botão "Tentar novamente", virou RSC e **perdeu qualquer tratamento** — hoje faz cinco consultas (`app/busca/page.tsx:139+`) sem `try/catch`. E `find apps/documentos/src -name "error.tsx"` devolve **vazio**: nenhuma rota do app tem fronteira de erro. Uma indisponibilidade do Supabase em `/[slug]`, `/editais`, `/categoria`, `/assinaturas` ou em qualquer tela editorial cai na tela de erro genérica do Next — em produção, uma página branca com "Application error", num portal público institucional.

Além disso, dois textos estão errados: o vazio de `/editais` diz "**Nenhum edital nesta categoria**" e "Tente selecionar outro filtro acima" (`app/editais/page.tsx:272-275`) quando o filtro é por **status**, não por categoria — o critério de P-1.17 pede "Nenhum edital aberto no momento". E `app/globals.css:897` carrega um hex de fallback (`var(--hb-gray-200, #d1d5db)`), único hex do arquivo, contra BRAIN §5.

**Escopo (siga na ordem):**

1. **`error.tsx` na raiz** (`app/error.tsx`, client component) com a identidade do portal: mensagem humana, botão "Tentar novamente" chamando `reset()`, link para a home. Sem exclamações genéricas nem tom de mascote (BRAIN — "não parecer IA").
2. **`error.tsx` na área editorial** (`app/editorial/error.tsx`), respeitando o shell da sidebar, para que uma falha de leitura não derrube a navegação editorial inteira.
3. **`global-error.tsx`** mínimo, cobrindo falha no próprio layout raiz.
4. **`/busca`:** envolver a leitura em `try/catch` e renderizar o estado de erro com retry (link que refaz a mesma query), no padrão da home — recuperando o que S-27 tinha e a reescrita perdeu.
5. **Cópia dos vazios:** `/editais` passa a refletir o filtro ativo ("Nenhum edital aberto no momento" quando o filtro é `aberto`, e a variante correspondente nos demais); revisar de passagem se cada vazio do módulo nomeia a ação certa.
6. **Fechar o hex** de `globals.css:897` usando o token canônico sem fallback literal.

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/app/error.tsx` (criar)
- `apps/documentos/src/app/global-error.tsx` (criar)
- `apps/documentos/src/app/editorial/error.tsx` (criar)
- `apps/documentos/src/app/busca/page.tsx`
- `apps/documentos/src/app/editais/page.tsx`
- `apps/documentos/src/app/globals.css`

**Critérios de aceite:**

- [x] Toda rota do app é coberta por uma fronteira de erro (raiz + editorial + `global-error`)
- [x] Erro de leitura em `/busca` renderiza estado com retry, não a tela do Next
- [x] Vazio de `/editais` corresponde ao filtro ativo; com filtro "Abertos" o texto é "Nenhum edital aberto no momento"
- [x] `grep -n "#[0-9a-fA-F]\{3,6\}" apps/documentos/src/app/globals.css` retorna vazio
- [x] Microcopy sem exclamação genérica; versículo mantido apenas nos vazios (não nos erros)
- [x] `pnpm --filter documentos typecheck lint test` verdes
- [x] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §5 e princípio "não parecer IA". `error.tsx` precisa ser client component com `reset`; não usar `router.refresh()` em RSC. Não converter páginas RSC em client só para tratar erro — a fronteira resolve.

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

## Documentos — Bloco B (Correções pós-auditoria)

> Levantados no cruzamento de P-1.18–P-1.24 × SESSIONS.md (S-28, S-29, S-29b, S-30, S-31, S-32) × codebase, em 2026-07-25. Todos os critérios citados estão `[x]` em PROMPTS.md; o que segue é o que o código não cumpre. Ordem sugerida de execução: P-1.19b → P-1.21b (a segunda depende da policy de rascunho criada pela primeira); as demais são independentes entre si.

---

### P-1.18b — Campos que a UI coleta e o banco não guarda (CORRETIVO)

**Fase:** 1
**Módulo:** documentos
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-1.18b-docs-campos-perdidos`
- Dependências: P-1.17b concluído (S-187)
- Env vars: `DATABASE_URL`

**Problema que este prompt resolve (contexto):**
O critério de P-1.18 lista as colunas de `documentos.documents` e está `[x]`, mas o modelo de domínio (`packages/types/src/documentos/index.ts:7`) declara `DocumentType` com oito valores (`edital`, `legal`, `fiscal`, `sop`, `cargo_description`, `policy`, `report`, `other`) e a tabela **não tem coluna `type`**. A consequência é uma UI que mente, o mesmo padrão que P-1.16b corrigiu nas assinaturas:

- `components/document-form.tsx:700` renderiza um `<select>` "Tipo de documento" com os oito valores e o guarda em `values.type` (`:192`);
- `app/editorial/novo/_client.tsx` chama `createDocument({ title, contentMd, storagePath, visibility, categoryId, tagIds })` — **`type` não é enviado**; o schema Zod da action (`actions/documents.ts:71-78`) sequer o aceita;
- as quatro telas que montam o objeto `Document` escrevem `type: "other"` fixo (`app/page.tsx:146`, `app/[slug]/page.tsx:228`, `app/categoria/[slug]/page.tsx:175`).

O editor escolhe "Política institucional", salva, e nada em lugar nenhum reflete a escolha — nem badge, nem filtro, nem listagem editorial.

O mesmo vale para os metadados da versão. `DocumentVersion` (`packages/types/src/documentos/index.ts:49-60`) tem `fileSizeBytes`, `mimeType` e `notes`; `documentos.document_versions` não tem nenhum dos três. `adaptDocVersion` (`app/[slug]/page.tsx:60-80`) devolve `fileSizeBytes: 0`, `notes: null` e um `mimeType` **adivinhado** a partir da extensão de `fileUrl`. Isso não é cosmético: `components/document-viewer.tsx:374-381` decide entre renderizar o PDF e renderizar o Markdown com base nesse `mimeType` inferido, e o chip de tamanho de `document-card.tsx:31` some sempre (0 é falsy). O tamanho real está disponível no cliente no momento do upload (`File.size`, `File.type`) e é simplesmente descartado — `novo/_client.tsx:42` chega a mandar `mimeType: "application/pdf"` fixo para `getUploadUrl` e não o persiste.

**Escopo (siga na ordem):**

1. **Migration** (hand-write `0061_documentos_document_type.sql`, sem drizzle-kit): criar o enum `documentos.document_type` com os oito valores de `DocumentType`; adicionar `documents.type documentos.document_type NOT NULL DEFAULT 'other'`; adicionar `document_versions.file_size_bytes bigint`, `mime_type text` e `notes text` (todos nullable — as versões já existentes não têm como recuperar o dado). Índice em `documents.type` (é filtro de listagem). Refletir tudo em `packages/db/src/schema/documentos.ts`.
2. **Backfill declarado na própria migration:** `UPDATE documentos.documents d SET type = 'edital' WHERE EXISTS (SELECT 1 FROM documentos.editals e WHERE e.id = d.id)` — todo edital é do tipo edital por definição, e é o único backfill honesto possível.
3. **Actions:** `createDocument`/`updateDocument` passam a aceitar `type` (default `other`) e `fileSizeBytes`/`mimeType` no par de campos que já acompanha `storagePath`; `createEdital` grava `type: 'edital'` sem expor a escolha. `updateDocument` inclui `type` no diff do audit (o padrão do arquivo é logar antes/depois dos campos governáveis).
4. **Fluxo de upload:** `uploadFile` (`novo/_client.tsx` e `editorial/[id]/editar/_client.tsx`) passa a repassar `file.size` e `file.type` reais em vez do `"application/pdf"` fixo, e os dois `_client` enviam `values.type` na chamada da action.
5. **Adaptadores:** as quatro telas leem `type`, `fileSizeBytes`, `mimeType` e `notes` do banco. Nenhum `type: "other"` fixo e nenhum `fileSizeBytes: 0` pode sobrar. Onde o dado for nulo (versões antigas), manter a inferência atual como _fallback_ explícito, com comentário — não como caminho principal.
6. **Superfície de leitura mínima:** exibir o tipo onde a tela já reserva espaço para ele (chip do `DocumentCard` e cabeçalho do `DocumentViewer`), usando os rótulos em português do `document-form`. Não criar filtro por tipo aqui — é escopo de outra tela.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/0061_documentos_document_type.sql` (criar)
- `packages/db/src/schema/documentos.ts`
- `apps/documentos/src/actions/documents.ts`
- `apps/documentos/src/actions/editals.ts`
- `apps/documentos/src/app/editorial/novo/_client.tsx`
- `apps/documentos/src/app/editorial/[id]/editar/_client.tsx`
- `apps/documentos/src/app/page.tsx`
- `apps/documentos/src/app/[slug]/page.tsx`
- `apps/documentos/src/app/categoria/[slug]/page.tsx`
- `apps/documentos/src/app/editais/[slug]/page.tsx`
- `apps/documentos/src/components/document-card.tsx`
- `apps/documentos/src/components/document-viewer.tsx`
- `apps/documentos/src/__tests__/actions.test.ts`

**Critérios de aceite:**

- [x] `documentos.documents` tem `type`; `documentos.document_versions` tem `file_size_bytes`, `mime_type` e `notes`
- [x] Escolher um tipo no formulário, salvar e reabrir devolve o tipo escolhido (teste em `actions.test.ts`)
- [x] `grep -rn "type: \"other\"\|fileSizeBytes: 0" apps/documentos/src/app` retorna vazio
- [x] `mimeType` do viewer vem da coluna quando existe; a inferência por extensão só atua como fallback comentado
- [x] Editais nascem e são backfillados com `type = 'edital'`
- [x] `pnpm --filter documentos typecheck lint test` verdes; migration aplicada no Supabase de dev
- [x] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §6.7. Não introduzir aqui filtro por tipo na busca nem badge novo de design — só fechar a lacuna entre o que a UI coleta/exibe e o que o banco guarda. Alternativa descartada: remover o `<select>` do formulário — o tipo é dado editorial legítimo (a diretoria distingue política de SOP de descrição de cargo) e já está desenhado.

---

### P-1.19b — RLS: rascunho, lixeira e o papel conselheiro (CORRETIVO)

**Fase:** 1
**Módulo:** documentos
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-1.19b-docs-rls-escrita`
- Dependências: P-1.17b concluído (S-187)
- Env vars: `DATABASE_URL`
- ⚠️ **Decisão de negócio pendente com o Filipe** (item 3 do escopo) — não implementar por conta própria

**Problema que este prompt resolve (contexto):**
P-1.19 nunca teve sessão própria em SESSIONS.md (débito de documentação registrado em S-68, ponto 5) e seus seis critérios estão `[x]`. As policies de `0005_documentos_rls.sql` cobrem bem a **leitura por visibilidade** — e a suíte `__tests__/rls.test.ts` cobre exatamente isso, e só isso: todos os `it()` do arquivo são SELECT. Três buracos ficaram do lado da escrita:

1. **Rascunho não é gateado por RLS.** As três policies de SELECT (`:55`, `:63`, `:72`) filtram `deleted_at IS NULL` e visibilidade, mas **não** `published_at`. Um rascunho com `visibility = 'public'` é legível por `anon` no banco. Hoje nenhuma tela vaza (todas filtram `isNotNull(publishedAt)` na consulta), mas isso é exatamente a camada que o BRAIN chama de "última linha de defesa": a proteção do rascunho depende inteiramente de nenhuma consulta futura esquecer o filtro.
2. **Documento soft-deletado é invisível para todos, inclusive para quem o apagou.** Não existe policy de SELECT que alcance `deleted_at IS NOT NULL`. `deleteDocument` (`actions/documents.ts:375-386`) já documenta o efeito no próprio código: ninguém — nem `super_admin` — consegue soft-deletar via client autenticado, porque o `UPDATE` precisa que a linha resultante satisfaça alguma policy de SELECT; a action contorna com `withSystemRole`. Consequência de produto: não há lixeira nem restauração — o documento apagado por engano só volta por SQL manual, o que contraria o princípio de imutabilidade/reversibilidade do BRAIN.
3. **`conselheiro` passa no portão e apanha do banco.** `lib/safe-action.ts:20` (`editorAction`) e `lib/session.ts` (`EDITOR_ROLES`) admitem `super_admin`, `diretor`, `conselheiro`, `colaborador`; **todas** as policies de escrita (`:84`, `:91`, `:97`, `:128`, `:157`, e as de `categories`/`tags`) admitem apenas `super_admin`, `diretor`, `colaborador`. Um conselheiro entra na área editorial, preenche o formulário, clica em publicar e recebe um erro cru de banco. BRAIN §6.7 diz "super_admins ou colaboradores com papel editor" — o conjunto do portão foi herdado de S-61 por conveniência, não por regra.

**Escopo (siga na ordem):**

1. **Policy de rascunho:** adicionar `published_at IS NOT NULL` às três policies de SELECT existentes **e** criar `documents_select_own_draft`, que devolve rascunhos e deletados para o autor (`author_id = auth.uid()`) e para `has_role('super_admin','diretor')`. Sem ela, `updateDocument`/`publishDocument` (que leem o `before` sob contexto autenticado) param de funcionar para rascunhos — verificar isso explicitamente, é o risco central deste prompt. Espelhar a mesma regra em `document_versions`, `document_tags` e `editals`, que herdam a visibilidade do pai.
2. **Lixeira:** com a policy do item 1, remover o `withSystemRole` de `deleteDocument` (e o comentário de débito) e adicionar uma action `restoreDocument` (`deleted_at = NULL`, audit `document.updated`) mais o acesso a ela na listagem editorial — uma aba/filtro "Removidos" em `app/editorial/documentos/page.tsx`, no padrão dos filtros já existentes da tela. Sem hard delete.
3. **Decidir o conjunto de papéis editoriais (perguntar ao Filipe antes de implementar):**
   - **(a)** `conselheiro` é editor: incluí-lo em todas as policies de escrita de `documentos.*`;
   - **(b)** `conselheiro` só lê (inclusive `restricted`, como hoje): removê-lo de `editorAction` e manter em `requireEditorSession` apenas se a área editorial for navegável em modo leitura — nesse caso a UI precisa esconder as ações de escrita para ele, não deixá-las falhar.
     Seja qual for a saída, o conjunto de papéis passa a viver **em um único lugar** exportado (`lib/session.ts`), consumido por `safe-action.ts` e pela UI; hoje a lista está duplicada nos dois arquivos.
4. **Testes de escrita em `rls.test.ts`:** a suíte só testa leitura. Adicionar, por papel (`anon`, `hospede`, `colaborador` autor, `colaborador` não-autor, `conselheiro`, `super_admin`): INSERT em `documents`, UPDATE do próprio vs. de terceiro, INSERT em `document_versions` com `created_by` alheio (deve falhar), e o par soft-delete/restore.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/0062_documentos_rls_rascunho_lixeira.sql` (criar)
- `apps/documentos/src/actions/documents.ts`
- `apps/documentos/src/lib/safe-action.ts`
- `apps/documentos/src/lib/session.ts`
- `apps/documentos/src/app/editorial/documentos/page.tsx`
- `apps/documentos/src/components/document-row-actions.tsx`
- `apps/documentos/src/__tests__/rls.test.ts`
- `PROMPTS.md` (nota da decisão do item 3 em P-1.19)

**Critérios de aceite:**

- [ ] `anon` não lê rascunho `public` nem documento soft-deletado — teste de regressão em `rls.test.ts`
- [ ] Autor e `super_admin`/`diretor` leem os próprios rascunhos; `updateDocument` e `publishDocument` continuam funcionando sobre rascunho sob contexto autenticado
- [ ] `deleteDocument` não usa mais `withSystemRole`; `grep -n "RLS debt" apps/documentos/src/actions/documents.ts` retorna vazio
- [ ] Documento removido aparece em "Removidos" na listagem editorial e pode ser restaurado, com audit dos dois lados
- [ ] Conjunto de papéis editoriais definido em um único lugar e coerente entre gate (`editorAction`), UI e policies — sem papel que passe no portão e falhe no banco
- [ ] `rls.test.ts` cobre INSERT/UPDATE por papel, não só SELECT
- [ ] `pnpm --filter documentos typecheck lint test` verdes; migration aplicada no Supabase de dev
- [ ] Registrar em SESSIONS.md — incluindo a saída escolhida no item 3 e quem decidiu

**Notas:**
Ref: BRAIN.md §6.7 e "Defense in depth". Este é o prompt de maior risco de regressão do lote: mexer nas policies de SELECT afeta toda leitura autenticada do módulo. Rodar a suíte inteira de `apps/documentos` (não só os testes novos) antes de fechar. Não tocar em `views`/`subscriptions` aqui — têm prompt próprio.

---

### P-1.20b — Busca: acentos, índice e a action órfã (CORRETIVO)

**Fase:** 1
**Módulo:** documentos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.20b-docs-busca`
- Dependências: P-1.17b concluído (S-187)
- Env vars: `DATABASE_URL`

**Problema que este prompt resolve (contexto):**
O critério de P-1.20 "Busca full-text por título, conteúdo Markdown e tags" está `[x]` e existe em **duas implementações que não se falam**:

- `actions/search.ts:15` (`searchDocuments`) — gate `authenticatedAction`, ILIKE em título/conteúdo + subquery de tags. **Zero chamadores fora dos testes**: `grep -rn "searchDocuments" apps/documentos/src` só devolve o próprio arquivo e `__tests__/search.test.ts`. S-29b registrou o motivo (a busca pública não podia usar uma action autenticada) mas a action ficou no repositório, testada, mantida e morta.
- `app/busca/page.tsx:139+` — cinco consultas inline no RSC, que são as que o usuário realmente executa, e que **nenhum teste cobre**. A suíte `search.test.ts` testa a implementação que ninguém usa.

E as duas têm o mesmo defeito de fundo: `ILIKE '%termo%'` é **sensível a acento**. Num portal em português, buscar `orcamento` não encontra "Orçamento", `estatuto de missoes` não encontra "Missões" — o caso mais comum de digitação rápida no celular, num público que o BRAIN descreve como "em transição tecnológica". Não há `unaccent` nem `pg_trgm` em nenhuma migration do repositório (`grep -rn "unaccent\|pg_trgm\|tsvector" packages/db/src/migrations` → vazio), e o `ILIKE '%…%'` com curinga à esquerda não usa índice nenhum (débito registrado em S-29 e nunca endereçado).

**Escopo (siga na ordem):**

1. **Migration** (`0063_documentos_busca.sql`): `CREATE EXTENSION IF NOT EXISTS unaccent` e `pg_trgm`; coluna gerada `documents.search_text` (ou índice de expressão, se preferir não materializar) sobre `unaccent(lower(title || ' ' || coalesce(content_md,'')))`; índice GIN `gin_trgm_ops` sobre ela. Índice equivalente em `tags.name` e `categories.name`.
2. **Um só lugar de busca:** extrair a consulta para `lib/search-query.ts` (função pura que recebe o handle Drizzle + filtros e devolve as linhas), consumida **tanto** por `app/busca/page.tsx` **quanto** por `actions/search.ts`. A action deixa de duplicar a lógica; se ela continuar sem chamador depois disso, removê-la e mover os testes para o módulo compartilhado — não manter action morta.
3. **Normalização do termo:** comparar sempre `unaccent(lower(...))` dos dois lados; manter o comportamento atual de busca por substring (não migrar para `tsquery` — a expectativa do usuário aqui é "contém", não "palavra inteira", e o corpus é pequeno).
4. **Testes:** `search.test.ts` passa a exercitar o módulo compartilhado (isto é, o caminho que a tela usa) e ganha casos de acento nas duas direções (`orcamento` → "Orçamento", `Orçamento` → "orcamento") e de maiúsculas/minúsculas.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/migrations/0063_documentos_busca.sql` (criar)
- `packages/db/src/schema/documentos.ts` (apenas se a coluna gerada for materializada)
- `apps/documentos/src/lib/search-query.ts` (criar)
- `apps/documentos/src/actions/search.ts`
- `apps/documentos/src/app/busca/page.tsx`
- `apps/documentos/src/__tests__/search.test.ts`

**Critérios de aceite:**

- [ ] Buscar sem acento encontra documento com acento, e vice-versa — coberto por teste
- [ ] `/busca` e `actions/search.ts` compartilham a mesma consulta; nenhuma lógica de busca duplicada no RSC
- [ ] Se a action seguir sem chamador, ela foi removida (não há action morta com teste próprio)
- [ ] `EXPLAIN` do filtro de texto usa o índice GIN (registrar o plano em SESSIONS.md)
- [ ] Testes cobrem o caminho que a tela `/busca` executa
- [ ] `pnpm --filter documentos typecheck lint test` verdes; migration aplicada no Supabase de dev
- [ ] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §6.7 e princípio "Simplicidade". Não introduzir ranking por relevância, destaque de trecho (`ts_headline`) nem paginação nova — o escopo é acento, índice e fim da duplicação. A visibilidade continua sendo filtrada pela RLS via `withAuthenticatedContext`, como já é hoje; nada neste prompt pode contornar isso.

---

### P-1.20c — Registro de leitura: a tabela `views` que ninguém escreve (CORRETIVO)

**Fase:** 1
**Módulo:** documentos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.20c-docs-views`
- Dependências: P-1.17b concluído (S-187)
- Env vars: `DATABASE_URL`

**Problema que este prompt resolve (contexto):**
"Tabela `documentos.views` para analytics" está `[x]` em P-1.18 e "Registrar views" está no escopo de P-1.20 — a tabela existe, a action existe, a policy existe, a retenção existe, e **nenhuma linha é escrita jamais**: `grep -rn "registerView" apps/documentos/src` fora de `actions/documents.ts:421` retorna vazio. Nenhuma página chama a action.

O efeito é visível para o usuário: `app/editorial/page.tsx:67-70` calcula "views nos últimos 30 dias" e o KPI (`:135`) exibe **0 permanentemente** no painel editorial. E o efeito é invisível no resto da pilha: P-0.13 construiu a máquina de retenção inteira em cima de dado que não existe — `documentos.views_monthly_agg` (`packages/db/src/schema/documentos.ts:233`) e a função `documentos.purge_old_views` (`0023_documentos_views_retention.sql`) agregam e expurgam uma tabela vazia todo mês.

**Escopo (siga na ordem):**

1. **Chamar `registerView`** na abertura de documento e de edital (`app/[slug]/page.tsx` e `app/editais/[slug]/page.tsx`). Como são RSC e a action é `authenticatedAction`, registrar de forma que a falha **nunca** derrube a página: chamada não bloqueante com `try/catch` silencioso, ou um pequeno client component `<ViewTracker documentId>` que dispara uma vez no mount. Escolher uma das duas e registrar o porquê.
2. **Não contar duas vezes:** deduplicar leituras do mesmo usuário no mesmo documento dentro de uma janela curta (ex.: 30 min) — um `F5` não pode virar métrica. Fazer isso na action, não na página.
3. **Decidir sobre o anônimo:** a policy `views_insert_authenticated` (`0005_documentos_rls.sql:227`) exige `auth.uid()`, então leitura anônima do portal público nunca é contada — o KPI mede só a fração autenticada. Registrar isso explicitamente na tela (rótulo do KPI: "leituras de usuários identificados") **ou** passar a contar anônimos sem `user_id`, o que exige nova policy e uma linha na política de privacidade. Recomendação: manter só autenticados e corrigir o rótulo — é a saída compatível com a LGPD sem trabalho novo de consentimento.
4. **Dar destino ao dado:** exibir contagem de leituras na listagem editorial de documentos (coluna) e no painel, lendo de `views` + `views_monthly_agg` (o histórico agregado não pode sumir do total só porque passou de 6 meses).
5. **Teste:** abrir o mesmo documento duas vezes na janela de dedupe grava uma linha; usuário diferente grava outra; anônimo não grava (ou grava sem `user_id`, conforme o item 3).

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/actions/documents.ts`
- `apps/documentos/src/components/view-tracker.tsx` (criar — apenas na saída client component)
- `apps/documentos/src/app/[slug]/page.tsx`
- `apps/documentos/src/app/editais/[slug]/page.tsx`
- `apps/documentos/src/app/editorial/page.tsx`
- `apps/documentos/src/app/editorial/documentos/page.tsx`
- `apps/documentos/src/__tests__/actions.test.ts`

**Critérios de aceite:**

- [ ] Abrir um documento autenticado grava linha em `documentos.views`
- [ ] Recarregar a página dentro da janela de dedupe **não** duplica a linha — coberto por teste
- [ ] Falha ao registrar leitura não quebra nem atrasa a renderização da página
- [ ] KPI do painel editorial reflete dado real e o rótulo diz exatamente o que está sendo contado
- [ ] Total de leituras considera `views` + `views_monthly_agg`
- [ ] `pnpm --filter documentos typecheck lint test` verdes
- [ ] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §6.7 e LGPD (P-0.13). `documentos.views` é dado comportamental pessoal: não expor leitura individual em nenhuma tela (quem leu o quê), só agregados. A retenção de 6 meses já está implementada e não deve ser alterada aqui.

---

### P-1.21b — A área editorial ainda lê como superusuário (CORRETIVO)

**Fase:** 1
**Módulo:** documentos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.21b-docs-leitura-editorial`
- Dependências: **P-1.19b concluído** (policy de rascunho/lixeira), P-1.17b concluído (S-187)
- Env vars: `DATABASE_URL`

**Problema que este prompt resolve (contexto):**
S-61 (P-1.27) corrigiu F2-D1 migrando **as páginas públicas** para `withAuthenticatedContext`, para que a RLS fosse exercida de verdade. Nove páginas ficaram para trás e seguem lendo pelo client superusuário `db` (`@hebron/db/client`), que ignora RLS por construção:

`app/assinaturas/page.tsx`, `app/editorial/page.tsx`, `app/editorial/documentos/page.tsx`, `app/editorial/editais/page.tsx`, `app/editorial/categorias/page.tsx`, `app/editorial/assinaturas/page.tsx`, `app/editorial/auditoria/page.tsx`, `app/editorial/novo/page.tsx`, `app/editorial/[id]/editar/page.tsx`.

O portão de entrada é `requireEditorSession()`, que só verifica se o usuário tem **algum** papel editorial. Depois disso não há autorização por documento. Na prática: um `colaborador` abre `/editorial/documentos`, vê a lista completa — inclusive documentos `restricted`, que a RLS reserva a `super_admin`/`diretor`/`conselheiro` — e abre `/editorial/<id>/editar` de qualquer um deles, lendo o conteúdo inteiro. É a mesma classe de falha de F2-D1, um andar acima: a visibilidade que o portal público respeita some assim que se entra na área editorial.

`app/assinaturas/page.tsx` é o caso mais claro: é tela de usuário comum (não editorial) lendo com superusuário e filtrando por `userId` só no código.

**Escopo (siga na ordem):**

1. **Migrar as nove páginas** para `withAuthenticatedContext` + o `actorId` da sessão já resolvida (`requireEditorSession` devolve a sessão; `assinaturas` usa `getOptionalActorId`/`resolveSession` como as públicas). Mesmo padrão de S-61 — nenhuma consulta nova, só a troca do handle.
2. **Onde a RLS não bastar, dizer por quê:** o painel (`editorial/page.tsx`) agrega KPIs sobre todo o acervo e a auditoria (`editorial/auditoria/page.tsx`) lê `admin.audit_log`, que tem regra própria. Para cada consulta que **precisar** continuar como serviço, usar `withSystemRole` explicitamente, com comentário de uma linha justificando — não o client `db` genérico. Contagem agregada não é vazamento; conteúdo de documento é.
3. **Consequência esperada e desejada:** a lista editorial de um `colaborador` passa a não incluir documentos `restricted` de terceiros. Se a diretoria quiser que todo editor veja tudo, isso é decisão de negócio e vira uma policy explícita em P-1.19b — não o efeito colateral de usar o client errado.
4. **Teste de regressão:** `colaborador` autenticado não recebe documento `restricted` alheio pela consulta da listagem editorial nem pela consulta da tela de edição — no padrão do bloco "Regressão F2-D1/F2-D2" de `rls.test.ts`.

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/app/assinaturas/page.tsx`
- `apps/documentos/src/app/editorial/page.tsx`
- `apps/documentos/src/app/editorial/documentos/page.tsx`
- `apps/documentos/src/app/editorial/editais/page.tsx`
- `apps/documentos/src/app/editorial/categorias/page.tsx`
- `apps/documentos/src/app/editorial/assinaturas/page.tsx`
- `apps/documentos/src/app/editorial/auditoria/page.tsx`
- `apps/documentos/src/app/editorial/novo/page.tsx`
- `apps/documentos/src/app/editorial/[id]/editar/page.tsx`
- `apps/documentos/src/lib/session.ts` (se precisar expor a sessão já resolvida)
- `apps/documentos/src/__tests__/rls.test.ts`

**Critérios de aceite:**

- [ ] `grep -rn "@hebron/db/client" apps/documentos/src/app` retorna vazio (ou só linhas com `withSystemRole` justificado em comentário)
- [ ] `colaborador` não lê documento `restricted` alheio por nenhuma rota editorial — teste de regressão
- [ ] Nenhuma tela editorial quebra para `super_admin`, `diretor` e `colaborador` autor (verificar rascunhos, que dependem da policy de P-1.19b)
- [ ] `/assinaturas` lê as inscrições sob contexto do próprio usuário
- [ ] `pnpm --filter documentos typecheck lint test` verdes
- [ ] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md "Defense in depth"; precedente S-61 (F2-D1/F2-D2). Executar **depois** de P-1.19b: sem a policy de rascunho, a fila de rascunhos do painel e a tela de edição ficam vazias sob contexto autenticado.

---

### P-1.22b — O alerta de "novas versões" que nunca chega (CORRETIVO)

**Fase:** 1
**Módulo:** documentos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.22b-docs-alerta-versao`
- Dependências: P-1.16b concluído (S-185)
- Env vars: `DATABASE_URL`, `RESEND_API_KEY`

**Problema que este prompt resolve (contexto):**
P-1.16b acertou a persistência das preferências de assinatura, mas o alerta prometido pelo toggle continua não existindo. O rótulo é literal: `components/subscription-form.tsx:280` diz **"Novas versões"**, com `aria-label` "Notificar novas versões em {categoria}". A flag `on_new_version` gateia `notifyNewDocument` (`lib/notifications.ts:57-65`), que é chamada de um único lugar: `publishDocument` (`actions/documents.ts:296-300`) — ou seja, **na primeira publicação de um documento**. `updateDocument` cria a versão 2, 3, 4 (`:200-206`) e **não notifica ninguém, nunca**.

O caso de uso real do módulo é justamente esse: o inscrito em "Políticas institucionais" quer saber quando a política **foi revisada**, não apenas quando uma política nova nasce. Hoje ele marca o toggle, é informado de que está inscrito, e a revisão passa em silêncio.

O mesmo caminho tem um segundo defeito, de sinal oposto: `publishDocument` notifica **toda vez** que é chamada, e `components/document-row-actions.tsx:26-28` permite despublicar e republicar. Cada ciclo dispara um novo "Novo documento: …" para a lista inteira de inscritos — em um portal onde despublicar para corrigir e republicar é operação corriqueira.

**Escopo (siga na ordem):**

1. **Notificar nova versão:** ao concluir `updateDocument` sobre um documento **já publicado**, notificar os inscritos da categoria com `on_new_version = true`. Reusar `createNotification`/`makeNotificationInserter` no padrão de `notifyNewDocument`.
2. **Controle editorial do disparo (evitar ruído):** a notificação de versão é **opt-in por edição** — checkbox "Avisar os inscritos desta categoria" no formulário de edição (desmarcado por default), enviado como campo da action. Correção de vírgula não vira e-mail; revisão de política vira. Aproveitar o campo `notes` da versão (criado em P-1.18b, se já executado) como resumo da mudança no corpo do e-mail; se P-1.18b ainda não tiver rodado, omitir o resumo — **não** criar coluna aqui.
3. **Template:** `packages/email/src/templates/new-version.tsx`, no mesmo layout institucional dos três existentes, com número da versão, categoria e link. Não reaproveitar `new-document.tsx` com texto ambíguo — são eventos diferentes.
4. **Não duplicar na republicação:** `publishDocument` só dispara `notifyNewDocument`/`notifyEditalOpen` na **primeira** publicação. Como `published_at` volta a `NULL` ao despublicar, marcar o fato de outra forma — a existência de notificação anterior do tipo `document.published` para aquele `entityId` no audit/`notifications` é a fonte disponível sem migration. Escolher e registrar o critério.
5. **Testes** (`actions.test.ts`, que já cobre o caminho feliz desde S-61): inscrito com `on_new_version = true` recebe ao publicar nova versão com o opt-in ligado; não recebe com o opt-in desligado; não recebe nada ao republicar um documento já publicado antes.

**Arquivos permitidos para criação/edição:**

- `packages/email/src/templates/new-version.tsx` (criar)
- `apps/documentos/src/lib/notifications.ts`
- `apps/documentos/src/actions/documents.ts`
- `apps/documentos/src/components/document-form.tsx`
- `apps/documentos/src/app/editorial/[id]/editar/_client.tsx`
- `apps/documentos/src/components/subscription-form.tsx` (só se o rótulo precisar de ajuste após a decisão)
- `apps/documentos/src/__tests__/actions.test.ts`

**Critérios de aceite:**

- [ ] Publicar nova versão de documento publicado, com o opt-in ligado, envia e-mail aos inscritos com `on_new_version = true` — e só a eles
- [ ] Opt-in desligado não envia nada
- [ ] Despublicar e republicar não dispara segunda notificação de "novo documento" — coberto por teste
- [ ] Template próprio de nova versão, com layout institucional e microcopy sem exclamação genérica
- [ ] Nenhum toggle da UI de assinaturas sem evento correspondente de fato disparado (reauditar os dois, campo a campo, como pedia P-1.16b)
- [ ] `pnpm --filter documentos typecheck lint test` verdes
- [ ] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §6.7; P-1.16b (S-185) para o contrato das flags. Alternativa descartada: renomear o toggle para "Novas publicações" e não implementar nada — resolveria a mentira, mas apagaria o caso de uso mais citado do módulo (acompanhar revisão de política). Não introduzir digest/frequência aqui.

---

### P-1.23b — O botão "submeter projeto" que o wizard ignora (CORRETIVO)

**Fase:** 1
**Módulo:** documentos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.23b-docs-projetos-params`
- Dependências: P-2.9c concluído (S-62), P-1.17b concluído (S-187)
- Env vars: nenhuma

**Problema que este prompt resolve (contexto):**
Os cinco critérios de P-1.23 estão `[x]` e o handshake entre os dois módulos está quebrado em três pontos independentes, cada um suficiente para zerar o outro:

1. **Nome do parâmetro.** `components/edital-submit-button.tsx` emite `?edital_id=<uuid>` (exatamente como o escopo de P-1.23 especifica). O wizard lê `searchParams.get("editalId")` (`apps/projetos/src/app/(submissor)/novo/page.tsx:1178`, entregue em F2-P3). São chaves diferentes: o link abre o wizard, o `useEffect` não encontra nada, `getEditalPrefillForWizard` não é chamada, e o formulário abre em branco — sem erro, sem aviso. Os dois lados foram implementados, testados isoladamente, e nunca no mesmo teste.
2. **A "categoria de projeto" nunca é gravada.** `components/edital-form.tsx:709-717` oferece um `<select>` "Categoria de projeto" com **slugs** (`evangelizacao`, `capacitacao-lideranca`, …). Os dois clients que salvam editais montam a chamada sem esse campo (`app/editorial/novo/_client.tsx` e `app/editorial/[id]/editar/_client.tsx:147` enviam `projectType` e param aí), e a action nem poderia recebê-lo: `actions/editals.ts:55` exige `projectCategoryId: z.string().uuid()`, referenciando `documentos.categories` (`packages/db/src/schema/documentos.ts:159`) — a árvore de categorias **do próprio módulo de documentos**, não as categorias de projeto. É o mesmo mapeamento inexistente já documentado em `packages/integrations/src/documentos-projetos.ts` e em F2-P3. Resultado: `editals.project_category_id` é sempre `NULL`, o botão nunca emite `categoria`, e o `<select>` é decorativo.
3. **`tipo` significa coisas diferentes nos dois lados.** O botão emite `tipo` = `editals.project_type` (`missionario`, `educacional`, `saude`…, de `edital-form.tsx:180-187`), enquanto o wizard usa `tipo` para o ciclo do projeto (`anual` | `pontual`). Mesmo nome, domínios disjuntos.

**Escopo (siga na ordem):**

1. **Fechar o contrato em um lugar só:** definir os nomes e o formato dos parâmetros em `packages/integrations/src/documentos-projetos.ts` (constantes + função `buildProjetoNovoUrl(...)` e o parser correspondente), e fazer **os dois lados** consumirem dali. Nenhum literal `"edital_id"`/`"editalId"` solto em componente ou página depois deste prompt.
2. **Escolher a chave canônica** (`edital_id`, como escrito em P-1.23 e no BRAIN §7) e aceitar `editalId` como alias de leitura por compatibilidade, com comentário de prazo. Renomear o parâmetro de ciclo para algo inequívoco (`ciclo`) e manter `tipo` apenas para o tipo de projeto do edital.
3. **Corrigir a categoria de projeto:** trocar `editals.project_category_id` (FK para `documentos.categories`) por `editals.project_category_slug text`, alinhado ao vocabulário de `projetos.project_categories` — migration + schema + action + os dois clients passando `values.projectCategory`. Se a lista de slugs de `edital-form.tsx:189-196` divergir das categorias reais de Projetos, **a fonte da verdade é `projetos`**: importar a lista de `packages/integrations`, não redigitá-la.
4. **Pré-preencher a categoria no wizard,** fechando o débito que F2-P3 deixou aberto por falta desse mapeamento.
5. **Teste de ponta a ponta do contrato:** um teste em `packages/integrations` (ou em `apps/documentos`) que monta a URL com o builder e a devolve pelo parser com os mesmos valores — o teste que teria pego a divergência de nome.

**Arquivos permitidos para criação/edição:**

- `packages/integrations/src/documentos-projetos.ts`
- `packages/db/src/migrations/0064_documentos_edital_project_category.sql` (criar)
- `packages/db/src/schema/documentos.ts`
- `apps/documentos/src/actions/editals.ts`
- `apps/documentos/src/components/edital-submit-button.tsx`
- `apps/documentos/src/components/edital-form.tsx`
- `apps/documentos/src/app/editorial/novo/_client.tsx`
- `apps/documentos/src/app/editorial/[id]/editar/_client.tsx`
- `apps/documentos/src/app/editais/[slug]/page.tsx`
- `apps/projetos/src/app/(submissor)/novo/page.tsx`
- `apps/projetos/src/lib/queries.ts`
- testes do contrato (`packages/integrations/src/__tests__/` ou `apps/documentos/src/__tests__/`)

**Critérios de aceite:**

- [ ] Clicar em "Submeter projeto neste edital" abre o wizard **com o edital vinculado visível** e o tipo pré-preenchido
- [ ] Nome dos parâmetros vem de um único módulo compartilhado; `grep -rn "edital_id\|editalId" apps/documentos/src apps/projetos/src` só encontra usos derivados dele
- [ ] "Categoria de projeto" escolhida no formulário do edital é persistida, aparece na página pública do edital e chega pré-preenchida no wizard
- [ ] Nenhum campo do `EditalForm` sem correspondente persistido (auditar `EditalFormValues` campo a campo)
- [ ] Teste de ida e volta do contrato de URL
- [ ] `pnpm --filter documentos --filter projetos typecheck lint test` verdes; migration aplicada no Supabase de dev
- [ ] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md §7 (Documentos → Projetos); F2-P3 e o débito de mapeamento registrado em `packages/integrations/src/documentos-projetos.ts`. Este prompt cruza dois apps: rodar o build dos dois. Migration de renomeação de coluna precisa preservar os dados existentes (hoje todos `NULL`, o que torna a troca barata — confirmar com `SELECT count(*) FROM documentos.editals WHERE project_category_id IS NOT NULL` antes).

---

### P-1.24b — Testes: o audit mockado e o caminho de escrita sem cobertura (CORRETIVO)

**Fase:** 1
**Módulo:** documentos
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-1.24b-docs-testes`
- Dependências: os demais corretivos deste bloco concluídos (executar por último)
- Env vars: `DATABASE_URL`

**Problema que este prompt resolve (contexto):**
S-32 decidiu mockar `logDocumentAudit` em `__tests__/actions.test.ts:82-84` com uma justificativa que **deixou de valer no dia seguinte**: "o enum `admin.audit_action` não inclui valores de documento". A migration `0006_documentos_audit_actions.sql` adicionou os dez valores, e `lib/audit.ts` hoje só delega para `@hebron/db/audit`. O mock permaneceu: nenhum teste do módulo verifica que publicar, despublicar, mover categoria ou remover documento **grava audit** — justamente as mutações que o BRAIN exige auditar, e a tela `/editorial/auditoria` existe para mostrar.

Somado a isso, o critério de P-1.24 "RLS: anon vê public; autenticado vê public+internal; restricted respeita papel" é verdadeiro mas parcial: `rls.test.ts` só testa SELECT (ver P-1.19b), e `search.test.ts` testa a action órfã, não a busca que a tela executa (ver P-1.20b).

**Escopo (siga na ordem):**

1. **Remover o mock de `../lib/audit`** de `actions.test.ts` e asseverar as linhas gravadas em `admin.audit_log` (ator, ação, entidade, `entity_id` e presença do diff) para: `document.created`, `document.updated`, `document.published`, `document.unpublished`, `document.deleted`, `category.*` e `edital.*`. Limpeza no `afterAll` pelo mesmo prefixo de id já usado no arquivo.
2. **Cobrir os fluxos que ganharam código nos corretivos deste bloco** e que sobrevivem sem teste próprio: tipo do documento (P-1.18b), lixeira/restauração (P-1.19b), dedupe de leitura (P-1.20c), notificação de nova versão e não-duplicação na republicação (P-1.22b), contrato de URL com Projetos (P-1.23b). Onde o corretivo já tiver criado o teste, apenas verificar e não duplicar.
3. **Documentar a fronteira do ambiente:** os testes deste módulo dependem de rede até o Supabase e falham por `ENOTFOUND` em sandbox — deixar isso explícito no cabeçalho do arquivo de setup, para que a próxima sessão não interprete a falha como regressão.
4. **Bookkeeping em PROMPTS.md:** rever os critérios `[x]` de P-1.18 a P-1.24 à luz do que foi efetivamente entregue nos corretivos, marcando o que ficou de fora com `[~]` e uma nota apontando o corretivo responsável — o mesmo tratamento que P-1.15b deu ao critério de P-1.15.

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/__tests__/actions.test.ts`
- `apps/documentos/src/__tests__/rls.test.ts`
- `apps/documentos/src/__tests__/search.test.ts`
- `apps/documentos/src/__tests__/setup-env.ts`
- `PROMPTS.md` (bookkeeping do item 4)

**Critérios de aceite:**

- [ ] `grep -n "vi.mock(\"../lib/audit\")" apps/documentos/src/__tests__` retorna vazio
- [ ] Toda mutação crítica do módulo tem asserção de audit correspondente
- [ ] Nenhum corretivo deste bloco fica sem teste de regressão
- [ ] Critérios de P-1.18–P-1.24 refletem o estado real do código
- [ ] `pnpm --filter documentos typecheck lint test` verdes (com `DATABASE_URL` alcançável)
- [ ] Registrar em SESSIONS.md

**Notas:**
Ref: BRAIN.md (audit log em toda mutação crítica). Executar por último: este prompt fecha a conta do bloco e é o único que pode marcar critérios de P-1.18–P-1.24 como cumpridos.

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

- [x] Instrutor (não só super_admin) sobe capa de curso pela tela (teste)
- [x] Anexo de aula tipo "download" sobe pela tela e fica disponível para aluno matriculado (teste)
- [x] Bucket `plataforma-anexos` criado com policy testada (quem lê/escreve)
- [x] `plataforma-capas`: policy de escrita passa a aceitar instrutor, não só super_admin (teste)
- [x] Nenhum `URL.createObjectURL`/File local sobrevive sem upload real (grep)
- [x] Lint passa · Types passam

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

- [x] Unit: nome, capacidade (6), quartos (2), fotos, amenidades
- [x] Reservation com 3 preferred_periods: [{start, end}, {start, end}, {start, end}]
- [x] Guest: responsável + até 6 acompanhantes + 2 menores de 3 anos
- [x] Vehicle: placa, cor, modelo, marca (obrigatório se vier de carro)
- [x] ScoringCriteria: 10 critérios (a-j) com pontuação automática (max 75 — ver
      decisão em SESSIONS.md; "max 80" do enunciado e do cabeçalho BRAIN §6.8
      não bate com a soma real dos 10 critérios documentados)
- [x] Regra: max 7 dias por 12 meses por indivíduo
- [x] AidRequest: diária, transporte (aéreo R$1.000/pessoa ou combustível)
- [x] Lint passa
- [x] Types passam

**Notas:**
Ref: BRAIN.md seção 6.8 e edital de flats em `.docs/EDITAL PARA SOLICITAÇÕES DE RESERVA NO FLAT.md`.

---

### P-7.1b — Correção do máximo de scoring em BRAIN §6.8 (CORRETIVO)

**Fase:** 7
**Módulo:** flats
**Tipo:** doc
**Pré-condições:**

- Branch: `feat/P-7.1b-brain-scoring-max`
- Dependências: P-7.1 concluído
- Env vars: nenhuma

**Problema que este prompt resolve (contexto):**
BRAIN §6.8 abre com "Scoring automático (máx. 80 pontos)", mas a soma dos 10 critérios documentados logo abaixo é **75** — o critério d) "situação de saúde" perdeu o nível "com laudo" (10 pts) por exigir dado médico confidencial e virou binário (5/0), conforme `.docs/Respostas10.md` Q156. Em S-121 o Filipe confirmou 75 como máximo real e o código já usa `SCORING_MAX_POINTS = 75` (`packages/types/src/flats/index.ts`); apenas o texto do BRAIN (fonte da verdade) ficou defasado. Débito deixado explicitamente em S-121 para "PATCH dedicado".

**Escopo:**

1. BRAIN.md §6.8: trocar "Scoring automático (máx. 80 pontos)" por "Scoring automático (máx. 75 pontos)", com nota curta remetendo à decisão de S-121 (remoção do nível "com laudo" do critério d).
2. Varrer o restante do BRAIN por outras menções a "80" ligadas ao scoring de flats e alinhar para 75 (não tocar em scoring de outros módulos).

**Arquivos permitidos para criação/edição:**

- `BRAIN.md` (apenas §6.8 e referências cruzadas ao máximo de scoring de flats)

**Critérios de aceite:**

- [x] §6.8 diz "máx. 75 pontos" com nota da decisão
- [x] Nenhuma outra menção a "80 pontos" no scoring de flats no BRAIN
- [x] Nenhuma mudança de código/tipos (já corretos — `SCORING_MAX_POINTS = 75`)

**Notas:**
Correção documental pura, sem mudança de comportamento. Fechar em SESSIONS.md o débito aberto em S-121.

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

- [x] AvailabilityCalendar: timeline horizontal com reservas coloridas por status
- [x] ScoringPanel: 10 critérios com barra de pontuação e total
- [x] PeriodPicker: 3 seletores de range de data com validação (max 7 dias cada)
- [x] ApprovalQueue: lista ordenada por score com desempate visível
- [x] Responsivo
- [x] Lint passa
- [x] Types passam

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

- [x] Catálogo com fotos e disponibilidade por flat
- [x] Formulário completo: dados pessoais, acompanhantes, veículo, 3 períodos, critérios
- [x] Status da reserva com timeline visual
- [x] Calendário consolidado (admin) com ambos os flats
- [x] Fila de aprovação ordenada por score
- [x] Responsivo
- [x] Lint passa
- [x] Types passam

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

- [x] Wizard com step inicial de consentimento; sem consentimento de reserva não prossegue
- [x] Campo de saúde (critério d) só exibido/persistido com consentimento específico (teste)
- [x] Upload de documento de identidade para o bucket flats-documentos com policy restrita (P-0.12)
- [x] Check-in form registra transição + timestamp + observações; nenhum checklist de inventário
- [x] Acompanhantes: dinâmico (adicionar/remover), max 6+2 menores
- [x] 3 períodos de preferência com validação de disponibilidade
- [x] Critérios de scoring: inputs por tipo (anos, seleção, boolean, texto)
- [x] Ajuda de custo: toggle + tipo (aéreo/combustível) + valor
- [x] Score calculado automaticamente em tempo real no formulário
- [x] Lint passa
- [x] Types passam

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

- [x] Skeletons por tela
- [x] Estados vazios contextuais
- [x] Lint passa
- [x] Types passam

---

### P-7.5b — Fiação das telas do Bloco A Flats para validação da diretoria (CORRETIVO)

**Fase:** 7
**Módulo:** flats
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-7.5b-flats-wiring`
- Dependências: P-7.5 concluído
- Env vars: nenhuma
- Skill `/impeccable` obrigatória antes de escrever qualquer JSX (G2 + CLAUDE.md)

**Problema que este prompt resolve (contexto):**
O wizard de reserva (P-7.4), o `approval-form`, o `checkin-form` (P-7.4) e o `approval-queue-skeleton` (P-7.5) foram construídos como componentes autocontidos mas **nunca conectados a nenhuma página** — as páginas não estavam nos "arquivos permitidos" de P-7.4/P-7.5 (registrado em S-124/S-125). Resultado: a rota `/reservar` ainda serve o formulário single-page de P-7.3, **sem o step de consentimento LGPD, sem upload de documento e com o campo de saúde (critério d) exibido incondicionalmente** — contrariando BRAIN §6.8 ("o campo de saúde só aparece se consentido"). Como a PAUSA de validação com a diretoria vem logo após P-7.5, ela revisaria telas incompletas e uma superfície de reserva não conforme à LGPD. Este prompt antecipa para o Bloco A (ainda com mocks) a fiação que P-7.9 faria só no Bloco B, satisfazendo desde já o critério de P-7.9 "Nenhum componente do Bloco A sem import".

**Escopo:**

1. `(hospede)/reservar/page.tsx`: substituir o corpo pelo `<ReservationWizard />` de P-7.4 (mantendo mocks). O formulário single-page de P-7.3 é aposentado — a reserva passa a ter uma única superfície (wizard: consentimento → responsável + upload → acompanhantes → veículo → 3 períodos → scoring → auxílio → revisão).
2. `admin/aprovacao/page.tsx`: manter a `ApprovalQueue` e conectar o `approval-form.tsx` (selecionar reserva → abrir o form de aprovação com seleção de período final + observações; submit mock). Usar `ApprovalQueueSkeleton` como estado de loading da fila.
3. `admin/reserva/[id]/page.tsx`: na seção de check-in/check-out, substituir `status-actions.tsx` pelo `checkin-form.tsx` (transição + timestamp + observações, mock). Remover `status-actions.tsx`.
4. Rodar `grep` garantindo que nenhum componente/skeleton de P-7.2/P-7.4/P-7.5 fique sem import a partir de `app/`.

**Arquivos permitidos para criação/edição:**

- `apps/flats/src/app/(hospede)/reservar/page.tsx`
- `apps/flats/src/app/admin/aprovacao/page.tsx`
- `apps/flats/src/app/admin/reserva/[id]/page.tsx`
- `apps/flats/src/app/admin/reserva/[id]/status-actions.tsx` (remover)
- `apps/flats/src/components/reservation-wizard.tsx`, `approval-form.tsx`, `checkin-form.tsx` — apenas ajustes mínimos de props (callback de submit mock) se necessário para o wiring, sem alterar layout/visual

**Critérios de aceite:**

- [x] `/reservar` renderiza o wizard de P-7.4 (step de consentimento presente; campo de saúde só exibido com consentimento específico; upload de documento presente)
- [x] Formulário single-page de P-7.3 removido; sem duplicação de superfície de reserva
- [x] `approval-form` alcançável pela fila de aprovação (seleção de período final + observações, mock)
- [x] Check-in/check-out pelo detalhe da reserva via `checkin-form`; `status-actions.tsx` removido
- [x] `ApprovalQueueSkeleton` conectado como loading da fila
- [x] `grep`: nenhum componente do Bloco A (P-7.2/P-7.4/P-7.5) sem import a partir de `app/` (exceto `period-picker.tsx`, órfão pré-existente — ver S-127)
- [x] Lint passa · Types passam · `next build` verde (sanidade dos route groups)

**Notas:**

- Continua **Bloco A**: os dados de domínio (a reserva em si) permanecem mockados; P-7.9 troca mock→real e adiciona o gating de auth (G5). Este prompt NÃO cria Server Actions nem toca no schema.
- Ao chegar em **P-7.9**, corrigir a lista de arquivos permitidos (hoje aponta para `apps/flats/src/app/(admin)/...`): o grupo `(admin)` não existe — a estrutura real é `admin/...` (segmento real, decidido em P-7.3/S-123).
- Registrar em SESSIONS.md, fechando os débitos de fiação abertos em S-124/S-125.

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

- [x] units: 2 registros seed (flat 1, flat 2)
- [x] reservations: status (solicitada, aprovada, rejeitada, confirmada, em_curso, concluida, cancelada)
- [x] preferred_periods: 3 por reserva (constraint)
- [x] scoring_responses: 10 critérios com pontuação calculada
- [x] usage_history: user_id, reservation_id, days_used, period (para regra 7d/12m)
- [x] EXCLUDE USING gist impede duas reservas ocupantes com períodos sobrepostos no mesmo flat (teste: INSERT sobreposto falha; períodos adjacentes não colidem; reserva rejeitada não bloqueia)
- [x] Colunas de PII/saúde identificadas em comentário SQL e cobertas por RLS restrita (P-7.7)
- [x] Enum de audit com os valores do módulo
- [x] drizzle-kit check limpo
- [x] Migration aplica sem erros
- [x] Types passam

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

- [x] Hóspede: CRUD apenas nas próprias reservas
- [x] Diretor gestor: SELECT all + UPDATE (aprovar/rejeitar)
- [x] Super_admin: full access
- [x] Diretores/conselheiros: sem INSERT em reservations (conflito de interesse)
- [x] Units: SELECT para todos os autenticados
- [x] guests/scoring_responses (PII/saúde): SELECT restrito a gestor de flats e super_admin (teste)
- [x] Types passam

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

- [x] Validação de elegibilidade: pastores/missionários (via papel hospede)
- [x] Validação: max 7 dias nos últimos 12 meses por indivíduo
- [x] Score: 10 critérios; b de usage_history; j via packages/integrations (teste)
- [x] Aprovar/rejeitar exige designation gestor de flats — diretor sem designation falha (teste)
- [x] Ajuda aprovada cria payables NÃO aprovados no Financeiro, com data = dia anterior ao início (teste cross-schema); payables entram no fluxo de lote normal
- [x] Audit central em toda mutação, abortando em falha (teste)
- [x] Actions via kit de @hebron/auth (grep)
- [x] (demais critérios inalterados: elegibilidade, 7d/12m, desempate, soft-delete)
- [x] Desempate: idade → tempo sem descanso → nunca usou → sorteio (nesta ordem)
- [x] Aprovação: diretor gestor seleciona 1 dos 3 períodos
- [x] Lint passa
- [x] Types passam

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

- [x] (hospede) exige papel hospede; diretor/conselheiro bloqueados também na UI (teste)
- [x] (admin) exige designation gestor de flats ou super_admin (teste)
- [x] Reserva SUBMETÍVEL de ponta a ponta pelo wizard do Bloco A (P-7.4) — não reescrever inline
- [x] Score calculado ao submeter e visível na fila
- [x] Aprovar/rejeitar executável pela fila (approval-form conectado): seleção de período final persiste
- [x] Check-in e check-out executáveis pelo detalhe da reserva (checkin-form conectado)
- [x] Solicitação de ajuda de custo executável pelo wizard/minhas-reservas
- [x] Calendário com reservas reais
- [x] Nenhum componente/formulário do Bloco A (P-7.2/P-7.4) sem import (grep) — exceto period-picker.tsx, órfão pré-existente (S-127)
- [x] Mock data removido
- [x] Lint passa · Types passam

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

- [x] Reserva submetida: in_app ao diretor gestor + email
- [x] Aprovada: email ao hóspede com período final e instruções
- [x] Rejeitada: email ao hóspede com motivo
- [x] Check-in: email 3 dias antes com todas as instruções
- [x] Check-out: lembrete no dia
- [x] Lint passa
- [x] Types passam

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

- [x] Templates de limpeza seedados com slugs estáveis; integração os resolve por slug, não por UUID
- [x] Reserva confirmada cria as 2 tarefas SEM assignee, com datas derivadas do período (teste)
- [x] Ajuda aprovada → payables não aprovados no Financeiro (teste, cobre D-4)
- [x] Critério j auto-calculado (teste)
- [x] Zero imports app→app (verificação do CI)
- [x] Lint passa · Types passam

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

- [x] RLS: diretor/conselheiro não cria reserva (conflito de interesse)
- [x] Scoring: 10 critérios somam corretamente (max real 75 — ver nota de S-121/PROMPTS P-7.1, cabeçalho do BRAIN §6.8 nunca foi corrigido)
- [x] Desempate: ordem correta (idade → tempo → nunca usou → sorteio)
- [x] 7d/12m: reserva que excede limite é bloqueada
- [x] Double-booking: duas reservas no mesmo flat/período retorna erro
- [x] Fluxo completo funciona end-to-end
- [x] Consentimento: reserva sem consentimento de dados não persiste; campo saúde exige consentimento específico (P-7.4)
- [x] Auxílio: payables nascem não aprovados e entram na governança dual (D-4)
- [x] Testes passam
- [x] Lint passa

---

## Flats — Correções de Bloco B (auditoria pós-P-7.12)

> Débitos identificados cruzando os prompts P-7.6–7.12 com a codebase (S-128–S-134). Rodar após P-7.12, antes da Fase 8. Ordem recomendada: P-7.6b (bug de dados que os testes atuais mascaram) → P-7.9b → P-7.9c.

---

### P-7.6b — Canonicalização estável do custom type `daterange` (CORRETIVO)

**Fase:** 7
**Módulo:** flats
**Tipo:** schema
**Pré-condições:**

- Branch: `feat/P-7.6b-daterange-canonical`
- Dependências: P-7.12 concluído
- Env vars: `DATABASE_URL`

**Problema que este prompt resolve (contexto):**
O custom type `daterange` (`packages/db/src/schema/flats.ts`) grava limites inclusivos (`toDriver` → `[start,end]`), mas o Postgres canonicaliza `daterange` de tipo discreto para `[start,end+1)`. O `fromDriver` lê essa forma exclusiva **sem subtrair o dia**, então todo `end` volta do banco 1 dia à frente do que o hóspede informou. Pior: a aprovação (`approval-form.tsx` → `approval.ts`) seleciona o período a partir dos `preferredPeriods` **já relidos do banco** (já +1) e o regrava como `selectedPeriod`, sofrendo uma segunda canonicalização — `selectedPeriod.end` acumula **+2 dias**. Isso corrompe: (a) a exibição do período no detalhe da reserva e em "Minhas reservas"; (b) o cron de lembrete de check-out (`selectedPeriod.end === hoje`, dispara 2 dias tarde); (c) `daysUsed` no check-out, que grava `usage_history` e alimenta a regra de elegibilidade 7d/12m (superestima o consumo, podendo bloquear reservas futuras legítimas). S-133 e S-134 descreveram o sintoma como "armadilha de teste" e ajustaram os _fixtures_ para acomodar o deslocamento, em vez de corrigir a raiz. A correção é no mapeamento de leitura (JS), não no dado armazenado nem no `EXCLUDE` de double-booking (que opera server-side sobre a forma canônica e permanece correto).

**Escopo:**

1. `daterange.fromDriver` (`packages/db/src/schema/flats.ts`): quando o limite superior vier com bracket exclusivo `)` (forma canônica do Postgres), subtrair 1 dia para recuperar o `end` inclusivo original — tornando o round-trip write→read estável. Manter `toDriver` como está (`[start,end]`). Documentar a decisão em comentário destacado no próprio custom type (fonte permanente pedida em S-133/S-134).
2. Remover as compensações de `-1 dia` nos _fixtures_ dos testes que mascaravam o bug: `packages/integrations/src/__tests__/flats.test.ts` e `apps/flats/src/__tests__/reservations.test.ts` (`fetchStoredPeriod`/`daysUsed` esperados passam a bater com o literal informado).
3. Verificar e, se necessário, ajustar os consumidores de leitura: exibição em `admin/reserva/[id]/page.tsx` e `minhas-reservas`, o cron `runFlatsCheckoutReminders` (`packages/jobs/src/crons/flats.ts`) e o cálculo `daysUsed` em `checkin.ts` — fixando a semântica de contagem de dias (definir se `daysUsed = end − start` conta noites ou dias inclusivos, e alinhar à regra "7 dias" de BRAIN §6.8).
4. Nota curta em BRAIN §6.8 registrando que períodos são armazenados como `daterange` com `end` inclusivo no domínio.

**Arquivos permitidos para criação/edição:**

- `packages/db/src/schema/flats.ts` (só o custom type `daterange` + comentário)
- `packages/integrations/src/__tests__/flats.test.ts`
- `apps/flats/src/__tests__/reservations.test.ts`
- `apps/flats/src/actions/checkin.ts` (só o cálculo de `daysUsed`, se o ajuste de semântica exigir)
- `packages/jobs/src/crons/flats.ts` (só a comparação de data, se necessário)
- `BRAIN.md` (§6.8, nota de semântica de período)

**Critérios de aceite:**

- [x] Round-trip `db.insert(period {start,end}) → select` devolve exatamente `{start,end}` (teste)
- [x] Após aprovação, `selectedPeriod` lido bate com o período de preferência escolhido, sem deslocamento (teste)
- [x] Testes de P-7.11/P-7.12 passam **sem** os _fixtures_ compensatórios de `-1 dia`
- [x] `daysUsed` no check-out corresponde ao período real informado; regra 7d/12m testada com o valor correto
- [x] Cron de check-out dispara no dia real do `end`
- [x] `EXCLUDE USING gist` de double-booking permanece correto (adjacência e overlap) (teste)
- [x] Lint passa · Types passam

**Notas:**
Correção puramente de leitura — nenhuma migração de dados: linhas já gravadas (`[x,y)` no banco) passam a ser lidas com `end = y−1`, que é o valor inclusivo pretendido. Fechar em SESSIONS.md a armadilha registrada em S-133/S-134.

---

### P-7.9b — Fiação do ciclo de vida pós-aprovação e revisão de auxílio (CORRETIVO)

**Fase:** 7
**Módulo:** flats
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-7.9b-flats-lifecycle-ui`
- Dependências: P-7.12 concluído (recomendado após P-7.6b)
- Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Skill `/impeccable` obrigatória antes de escrever qualquer JSX (G2 + CLAUDE.md)

**Problema que este prompt resolve (contexto):**
Três Server Actions de P-7.8 estão implementadas, testadas (P-7.12) e sem **nenhum acionador na UI**: `confirmReservation` (aprovada→confirmada), `cancelReservation` (soft-delete) e `reviewAidRequest` (gestor aprova/rejeita auxílio). Consequências em cascata em uso real: (a) uma reserva aprovada **nunca chega a `confirmada`**, logo o `CheckinForm` (que só habilita a partir de `confirmada`) é inalcançável, a integração Flats→Tarefas (`onFlatsReservationConfirmed`, disparada só por `confirmReservation`) **nunca roda**, e `usage_history` nunca é escrito — a regra 7d/12m não acumula; (b) não há caminho de cancelamento; (c) o auxílio pode ser **solicitado** pelo hóspede (wizard) mas **nunca aprovado/rejeitado** pelo gestor, então o fluxo Flats→Financeiro / governança dual D-4 (testado em P-7.11) **nunca gera payable** em produção. S-131 registrou confirm/cancel como adiados "para um prompt futuro que desenhe a UI correspondente"; a revisão de auxílio nunca foi sinalizada.

**Escopo:**

1. **Detalhe da reserva (gestor)** `admin/reserva/[id]/page.tsx`: quando `status = aprovada`, expor botão **Confirmar reserva** (`confirmReservation`); em qualquer status não-terminal, botão **Cancelar** com campo de justificativa (`cancelReservation`, mín. 10 caracteres, schema já existente). Quando houver `aidRequest` com status `solicitado`, expor **Aprovar / Rejeitar auxílio** (`reviewAidRequest`), coletando valor da diária e/ou do transporte (combustível) conforme o schema exige. Extrair a interatividade para Client Components colocados (padrão de `aprovacao-client.tsx`), já que a página é Server Component async.
2. **Minhas reservas (hóspede)** `minhas-reservas/page.tsx`: no cartão da reserva atual, quando `status = aprovada`, botão **Confirmar** (dono confirma presença — `confirmReservation` já autoriza dono OU gestor); em status não-terminal, **Cancelar** com justificativa.
3. **Robustez:** envolver a chamada de `onFlatsAssistanceApproved` em `aid.ts` em try/catch best-effort com log estruturado (mesmo padrão de `reservations.ts`/`approval.ts`), para não deixar o auxílio `aprovado` sem payable derrubar a resposta ao gestor.
4. `router.refresh()` após cada transição para refletir o novo status (padrão de `checkin-form.tsx`).

**Arquivos permitidos para criação/edição:**

- `apps/flats/src/app/admin/reserva/[id]/page.tsx`
- `apps/flats/src/app/admin/reserva/[id]/lifecycle-actions.tsx` (novo — confirmar/cancelar/revisar auxílio, Client)
- `apps/flats/src/app/(hospede)/minhas-reservas/page.tsx`
- `apps/flats/src/app/(hospede)/minhas-reservas/reservation-actions.tsx` (novo — confirmar/cancelar, Client)
- `apps/flats/src/actions/aid.ts` (apenas o try/catch da chamada de integração)
- `apps/flats/src/lib/queries.ts` (apenas se faltar expor `aidRequest.id`/status para a UI)

**Critérios de aceite:**

- [x] Reserva `aprovada` confirmável pelo detalhe (gestor) e por "Minhas reservas" (hóspede dono); status vai a `confirmada` e dispara as 2 tarefas de limpeza (teste de fluxo já cobre `onFlatsReservationConfirmed`)
- [x] Check-in/check-out passam a ser alcançáveis de ponta a ponta pela UI (confirmar → check-in → check-out)
- [x] Cancelamento executável (dono ou gestor) com justificativa; status vai a `cancelada`; bloqueado em status terminal
- [x] Auxílio `solicitado` aprovável/rejeitável pelo gestor no detalhe; aprovação gera payable `pendente` no Financeiro (D-4)
- [x] Falha da integração Financeiro não derruba a resposta de `reviewAidRequest` (best-effort, log estruturado)
- [x] Gates de papel respeitados (hóspede não vê ações de gestor e vice-versa); `next build` verde
- [x] Lint passa · Types passam

**Notas:**
Não reescrever `CheckinForm`/`ApprovalForm` — apenas adicionar os acionadores que faltam. Fechar em SESSIONS.md os débitos de confirm/cancel (S-131) e o de revisão de auxílio.

---

### P-7.9c — Persistência do documento do responsável em `flats.document_files` (CORRETIVO)

**Fase:** 7
**Módulo:** flats
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-7.9c-flats-document-persist`
- Dependências: P-7.12 concluído
- Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Problema que este prompt resolve (contexto):**
O wizard (P-7.4, `step-guest.tsx`) faz upload do documento do responsável ao bucket `flats-documentos` e grava o path em `guest.responsibleDocumentUrl` (validado por `createReservationRequestSchema`), mas `createReservation` **nunca lê esse campo**: a referência é descartada no servidor, `flats.document_files` (tabela e RLS prontas desde P-7.6/P-7.7, com `document_files_owner_all` concedendo INSERT ao dono) **nunca é escrita**, e `queries.ts` fixa `responsibleDocumentUrl: null`. Resultado: o gestor nunca acessa o documento exigido pelo edital, e cada upload vira um objeto órfão no storage. Débito registrado em S-130 ("para quando a UI for conectada, P-7.9") e no comentário de `queries.ts` — **não resolvido em P-7.9**. `document_files` exige `storageKey`, `fileName`, `mimeType`, `fileSizeBytes`, que o payload atual não carrega (só o path).

**Escopo:**

1. **Payload:** estender `createReservationRequestSchema` (`packages/validators/src/flats`) para o documento do responsável carregar metadados (`storageKey`, `fileName`, `mimeType`, `fileSizeBytes`) além do path — ou um sub-objeto `responsibleDocument`. `step-guest.tsx` já tem o `File` no handler de upload; capturar `name/type/size` no estado do formulário; `reservation-wizard.tsx` inclui no payload final.
2. **Persistência:** em `createReservation`, após inserir o `guests` responsável, inserir 1 linha em `document_files` (`reservationId`, `guestId` = responsável, `uploadedBy` = `ctx.actorId`) dentro da mesma `withAuthenticatedContext` (RLS `document_files_owner_all` já concede). Auditar (`document.uploaded` ou reaproveitar o diff de `reservation.submitted`).
3. **Leitura:** `queries.ts` passa a ler `document_files` da reserva e devolver uma URL assinada (Supabase `createSignedUrl`, bucket privado) em `responsibleDocumentUrl`, em vez de `null`.
4. **Exibição:** o detalhe da reserva (gestor) e/ou `GuestList` mostram um link "Ver documento" quando presente.

**Arquivos permitidos para criação/edição:**

- `packages/validators/src/flats/index.ts`
- `apps/flats/src/components/reservation-wizard-steps/step-guest.tsx`
- `apps/flats/src/components/reservation-wizard.tsx`
- `apps/flats/src/actions/reservations.ts`
- `apps/flats/src/lib/queries.ts`
- `apps/flats/src/app/admin/reserva/[id]/page.tsx` (ou `components/guest-list.tsx`) — só a exibição do link

**Critérios de aceite:**

- [x] Enviar o wizard com documento persiste 1 linha em `flats.document_files` vinculada ao `guest` responsável e à reserva (teste)
- [x] `uploadedBy` = requerente; RLS permite o INSERT do próprio hóspede
- [x] Gestor abre o documento via URL assinada a partir do detalhe da reserva
- [x] Reserva sem documento continua válida (campo opcional preservado)
- [x] `responsibleDocumentUrl` deixa de ser `null` fixo quando há documento
- [x] Lint passa · Types passam

**Notas:**
Escopo mínimo de "fechar o loop" do upload já existente — sem novos buckets nem colunas. Fechar em SESSIONS.md o débito de S-130.

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

- [x] Track: title, author_id, series_id, file_url (R2), duration_seconds
- [x] Playlist: name, tracks (ordered), loop
- [x] Author: name, bio, photo
- [x] Series: name, author_id, description
- [x] NowPlaying: track_id, started_at, position_seconds
- [x] ExclusiveMaterial: title, file_url, requires_term
- [x] TermAcceptance: user_id, accepted_at (aceito 1 vez)
- [x] SEM tipos para DJs, grade, podcast, pedidos musicais
- [x] Lint passa
- [x] Types passam

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

- [x] Player persistente no footer (continua tocando entre páginas)
- [x] Player com: play/pause, próxima, anterior, volume, barra de progresso
- [x] "Tocando agora" com nome da faixa, autor e série
- [x] PlaylistView com faixas ordenadas e indicador de faixa atual
- [x] MaterialCard: download disponível apenas com termo aceito
- [x] TermsAcceptDialog: texto do termo + checkbox + botão aceitar
- [x] Responsivo (player adapta no mobile)
- [x] Lint passa
- [x] Types passam

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

- [x] Home com player em destaque e "tocando agora"
- [x] Catálogos por autor e por série com busca
- [x] Página de autor: bio, foto, lista de séries
- [x] Materiais exclusivos: login wall + aceite de termo antes do download
- [x] Admin: upload de faixas, criar playlists, gerenciar materiais
- [x] Player persistente em TODAS as páginas (não recarrega)
- [x] Responsivo
- [x] Lint passa
- [x] Types passam

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

- [x] Upload de .mp3 com extração automática de duração (lib `music-metadata` — registrar em SESSIONS; executor não deve escolher outra silenciosamente)
- [x] Playlist com drag-drop para reordenar faixas
- [x] Material exclusivo com campo de descrição e upload
- [x] Validação Zod
- [x] Lint passa
- [x] Types passam

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

- [x] Skeletons por tela
- [x] Player error state: "Não foi possível carregar o áudio. Tentando novamente..."
- [x] Lint passa
- [x] Types passam

---

### P-8.5b — Estados reais do player: erro, carregamento e vazio (CORRETIVO)

**Fase:** 8
**Módulo:** radio
**Tipo:** ui
**Pré-condições:**

- Branch: `feat/P-8.5b-radio-player-states`
- Dependências: P-8.5 concluído
- Env vars: nenhuma
- Skill `/impeccable` obrigatória antes de escrever qualquer JSX (G2 + CLAUDE.md)

**Problema que este prompt resolve (contexto):**
O critério de aceite de P-8.5 "Estado de erro no player (falha ao carregar áudio)" foi satisfeito **apenas como demonstração estática** no card "Tocando agora" da home (`page.tsx`), acionável por `?state=error`. O componente `Player` real (`player.tsx`) — montado de forma persistente no `layout.tsx` de **todas** as páginas, e o único lugar com um elemento `<audio>` que de fato carrega áudio — **não tem nenhum tratamento de erro, carregamento ou vazio**: o `<audio>` não tem `onError`/`onStalled`/`onWaiting`, e `if (!track) return null` faz a barra fixa do player **desaparecer** silenciosamente quando não há faixas. S-142 registrou explicitamente que `player.tsx` estava fora da lista de arquivos permitidos de P-8.5, então o estado foi feito só como demonstração visual no hero. Consequência concreta já visível no Bloco A: como as `fileUrl` dos mocks são chaves R2 relativas (`radio-tracks/…mp3`) que não resolvem, **o player real falha ao carregar em toda página e o ouvinte vê um player morto, sem feedback nem tentativa de recuperação** — exatamente o cenário que o critério de P-8.5 pedia para cobrir.

**Escopo:**
Levar os três estados (carregando, erro, vazio) para dentro do `Player` real, sem reescrever a lógica de reprodução/navegação já existente (P-8.2):

1. **Erro (`onError`/`onStalled` do `<audio>`):** exibir inline na barra do player a copy literal do critério — "Não foi possível carregar o áudio. Tentando novamente..." (ícone `AlertTriangle`, tom `--hb-orange`). Auto-retry **limitado** (ex.: até 3 tentativas com backoff, via `key`/`load()`); ao esgotar, cair para um estado terminal com botão manual **"Tentar novamente"** — nunca um laço infinito de reload contra uma URL permanentemente quebrada.
2. **Carregando (`onWaiting`/`onLoadStart`, limpar em `onCanPlay`/`onPlaying`):** indicador sutil de buffering (não trocar a barra inteira por skeleton — o `PlayerSkeleton` de P-8.5 é para o card da home, não para a barra fixa); play/pause desabilitado enquanto busca.
3. **Vazio (`tracks.length === 0`):** em vez de `return null` (a barra some), manter a barra fixa visível com a copy "Nenhuma faixa disponível." (mesma do critério de vazio de P-8.5), sem controles ativos.
4. Resetar o contador de tentativas ao trocar de faixa (`currentIndex`) e ao dar play manualmente.

**Arquivos permitidos para criação/edição:**

- `apps/radio/src/components/player.tsx`

**Critérios de aceite:**

- [x] `<audio>` com `onError`/`onStalled` → estado de erro inline "Não foi possível carregar o áudio. Tentando novamente..." no player real (não só no card da home)
- [x] Auto-retry limitado (sem laço infinito) + fallback manual "Tentar novamente" ao esgotar as tentativas
- [x] Estado de carregamento (`onWaiting`/`onCanPlay`) com play/pause desabilitado enquanto busca
- [x] `tracks.length === 0` mantém a barra visível com "Nenhuma faixa disponível." em vez de sumir
- [x] Contador de tentativas reseta ao trocar de faixa e ao play manual
- [x] Nenhuma regressão em navegação/volume/progresso já existentes (P-8.2)
- [x] Responsivo (estados legíveis no mobile, onde anterior/próxima/volume já ficam ocultos)
- [x] Lint passa · Types passam

**Notas:**
Não tocar em `page.tsx` — a demonstração de `?state=` de P-8.5 permanece válida para a validação com a diretoria. Escopo mínimo: apenas fechar erro/carregamento/vazio no componente que realmente carrega áudio. Fechar em SESSIONS.md o débito registrado em S-142 (estado de erro do player mapeado ao card da home porque `player.tsx` estava fora dos arquivos permitidos). Esta correção deve estar concluída **antes** da validação de Bloco A com a diretoria (PAUSA abaixo).

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

- [x] tracks: title, author_id, series_id, file_url, duration_seconds, uploaded_at
- [x] playlists: name, is_active (apenas 1 ativa por vez)
- [x] playlist_tracks: playlist_id, track_id, position
- [x] now_playing: singleton (1 row), track_id, started_at
- [x] exclusive_materials: title, file_url, description
- [x] term_acceptances: user_id (unique), accepted_at
- [x] SEM tabelas de DJs, grade, podcast, pedidos
- [x] Migration aplica sem erros
- [x] Types passam

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

- [x] Anon: SELECT em tracks, authors, series, now_playing
- [x] Autenticado: SELECT em exclusive_materials SE term_acceptances existe
- [x] Super_admin: full CRUD
- [x] term_acceptances: INSERT próprio, SELECT próprio
- [x] Types passam

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

- [x] Upload de .mp3 para R2 com URL retornada
- [x] Auto DJ: API route que serve faixa atual do playlist ativo (não stream contínuo — cada ouvinte pode estar em ponto diferente)
- [x] "Tocando agora" atualizado via Supabase Realtime (broadcast)
- [x] Termo: aceitar 1x, verificar antes de servir material exclusivo
- [x] Signed URL para download de material exclusivo (expira em 1h)
- [x] PWA: manifest + service worker registrado; áudio continua ao trocar de aba/minimizar (verificação manual documentada no PR)
- [x] Media Session API: faixa/autor aparecem nos controles do SO
- [x] Upload de .mp3 admin-only (gate super_admin via kit — G6.1)
- [x] R2 keys usadas apenas server-side (grep em componentes client → zero)
- [x] Lint passa
- [x] Types passam

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

- [x] Player toca áudio real do R2 e PERSISTE entre navegações (não reinicia ao trocar de página)
- [x] "Tocando agora" via Supabase Realtime
- [x] Catálogos com dados do banco
- [x] Material exclusivo: anônimo → login wall; sem termo → dialog de aceite; com termo → download via signed URL que expira (fluxo completo testável)
- [x] Admin: upload de faixa, criação de playlist (drag-drop) e material exclusivo operáveis pela UI (forms de P-8.4 conectados); anônimo/não-admin bloqueado no (admin) (teste)
- [x] PWA instala e toca em background (verificação manual documentada)
- [x] Nenhum componente/formulário do Bloco A (P-8.2/P-8.4) sem import (grep)
- [x] Mock data removido
- [x] Lint passa · Types passam

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

- [x] Novo material exclusivo: email para quem tem termo aceito E consentimento de comunicação de novidades (P-0.13) — termo de responsabilidade não é opt-in de email
- [x] Template com layout institucional
- [x] Lint passa
- [x] Types passam

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

- [x] Heartbeat sem PII (payload: session_id efêmero + track_id) — verificado
- [x] KPI: sessões únicas/dia e horas ouvidas/dia calculadas corretamente (teste com fixtures)
- [x] Cron de agregação registrado em packages/jobs; brutos removidos após agregar (teste)
- [x] Stub da Intranet substituído via packages/integrations
- [x] Lint passa · Types passam

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

- [x] RLS: anon acessa tracks; sem termo não acessa materials
- [x] Playlist: apenas 1 ativa por vez
- [x] Termo: duplo aceite retorna erro
- [x] Audiência: agregação diária calcula sessões/horas conforme D-3 (fixtures)
- [x] Testes passam
- [x] Lint passa

### P-8.9b — Persistência da descrição de material exclusivo (CORRETIVO)

**Fase:** 8
**Módulo:** radio
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-8.9b-radio-material-description`
- Dependências: P-8.12 concluído
- Env vars: nenhuma
- Skill `/impeccable` obrigatória antes de editar `material-card.tsx`/`materials-admin-panel.tsx` (G2 + CLAUDE.md — edição de componentes com mudança visível)

**Problema que este prompt resolve (contexto):**
O formulário de material exclusivo (`material-upload-form.tsx`, P-8.4) coleta uma "Descrição" num `<textarea>` e a repassa em `MaterialUploadFormValues.description`; a coluna `exclusive_materials.description` existe no schema (P-8.6/S-145) e o critério de aceite de P-8.6 lista literalmente "exclusive_materials: title, file_url, description". Porém a descrição **é silenciosamente descartada e nunca persistida**: `createExclusiveMaterialSchema` (`packages/validators/src/radio/index.ts`) não tem o campo `description`, e `materials-admin-panel.tsx` (`handleSubmit`) chama `create({ title, fileUrl, requiresTerm })` omitindo-a. Consequência concreta: o admin digita uma descrição que desaparece no submit — um input morto —, a coluna fica sempre `NULL`, e nem o card público (`material-card.tsx`) nem a lista do admin exibem descrição alguma. Débito registrado em S-145 (P-8.6) e S-148 (P-8.9), adiado porque `packages/validators` estava fora dos arquivos permitidos daqueles prompts.

**Escopo:**
Fechar o fluxo da descrição de ponta a ponta, sem tocar em outras entidades:

1. `createExclusiveMaterialSchema`: adicionar `description: z.string().max(2000).nullable().optional().default(null)` (mesmo idioma de `createAuthorSchema.bio`/`createSeriesSchema.description`).
2. `ExclusiveMaterial` (`packages/types/src/radio`): adicionar `description: string | null` — hoje o tipo não expõe a coluna, então o card não tem como renderizá-la.
3. `materials-admin-panel.tsx`: passar `description: values.description || null` na chamada `create({...})`. `createMaterial` (P-8.8) já insere o `input` inteiro — nenhuma mudança na action é necessária além do schema.
4. Exibir a descrição onde ela é útil: `material-card.tsx` (abaixo do título, quando presente) e a lista do `materials-admin-panel.tsx`. Manter truncamento/estado ausente coerentes com o resto do card (G2 / `/impeccable`).

**Arquivos permitidos para criação/edição:**

- `packages/validators/src/radio/index.ts`
- `packages/types/src/radio/index.ts`
- `apps/radio/src/components/materials-admin-panel.tsx`
- `apps/radio/src/components/material-card.tsx`

**Critérios de aceite:**

- [x] `createExclusiveMaterialSchema` aceita `description` (opcional, ≤2000, default null)
- [x] Ao criar um material com descrição pela UI admin, `exclusive_materials.description` é persistida (não mais NULL)
- [x] `ExclusiveMaterial` expõe `description`
- [x] `material-card.tsx` exibe a descrição quando presente; ausência não quebra o layout
- [x] Lista do admin mostra a descrição (ou indica ausência) sem regressão visual
- [x] Nenhuma mudança de comportamento em título/arquivo/termo já existentes
- [x] Lint passa · Types passam

**Notas:**
Escopo mínimo: apenas costurar a descrição que já é coletada. Não adicionar edição/remoção de material (fora de escopo — P-8.8 só expõe `createMaterial`). `material-upload-form.tsx` já coleta a descrição corretamente (state → `onSubmit`) e não precisa mudar. Fechar em SESSIONS.md o débito de S-145/S-148.

---

### P-8.11b — Fiação do heartbeat de audiência no player (CORRETIVO)

**Fase:** 8
**Módulo:** radio
**Tipo:** integration
**Pré-condições:**

- Branch: `feat/P-8.11b-radio-heartbeat-wiring`
- Dependências: P-8.12 concluído
- Env vars: nenhuma
- Skill `/impeccable`: `player.tsx` é um componente (G2 + CLAUDE.md), mas esta correção adiciona apenas um `useEffect` de efeito colateral, sem nenhum JSX/elemento visual novo — invocar o skill somente se o executor precisar tocar em markup visível (não deve)

**Problema que este prompt resolve (contexto):**
P-8.11 (S-150) construiu o pipeline de audiência **completo** — rota de ingestão anônima (`api/heartbeat/route.ts`), tabela bruta (`radio.listener_heartbeats`), cron de agregação diária (`packages/jobs/src/crons/radio-stats.ts` → `radio.listener_stats`) e o KPI cross-app (`packages/integrations/src/radio.ts::getRadioDashboardStatus`) —, MAS o `player.tsx` **nunca envia heartbeat**. A própria S-150 registrou isto como débito técnico explícito ("`player.tsx` NÃO foi editado… o endpoint `/api/heartbeat` existe mas nunca recebe tráfego real do player", candidato a "um novo P-8.9b/P-8.13, ou incluído no escopo de P-8.12"), porque `player.tsx` estava fora dos arquivos permitidos de P-8.11 (que só listava os 3 arquivos de backend) e editá-lo entraria em G2. S-151 (P-8.12) confirmou que o débito seguia aberto. Consequência concreta: `radio.listener_heartbeats` fica sempre vazia em produção → o cron agrega zero → `radio.listener_stats` nunca recebe dados reais → o KPI de audiência da Intranet é permanentemente nulo. Todo o feature de P-8.11 está inerte de ponta a ponta.

**Escopo:**
Fiar o único emissor que faltava, sem reescrever a reprodução/estados já existentes (P-8.2 / P-8.5b / P-8.9):

1. Gerar um `session_id` **efêmero, sem PII**, uma vez por montagem do player (ex.: `crypto.randomUUID()` em `useRef`/`sessionStorage`) — nunca derivado de usuário, cookie ou qualquer identificador estável (LGPD / D-3).
2. Enquanto o player estiver de fato reproduzindo (`isPlaying`, com `track` válido e sem estado de erro terminal), enviar `POST /api/heartbeat` com `{ sessionId, trackId: track.id }` a cada 60s (D-3: "heartbeat anônimo a cada 60s enquanto reproduz"). Enviar também o primeiro heartbeat ao iniciar a reprodução, de modo que uma sessão que ouve >= ~1 min gere os >= 2 heartbeats que a semântica D-3 exige para contar como "ouvinte".
3. Parar o intervalo ao pausar, ao entrar em estado de erro terminal e ao desmontar; retomar ao voltar a tocar. `fetch` best-effort — falha de rede não pode quebrar a reprodução (mesmo espírito do registro do service worker em `player.tsx`).
4. Sem novo elemento visual — o heartbeat é invisível ao ouvinte.

**Arquivos permitidos para criação/edição:**

- `apps/radio/src/components/player.tsx`
- `apps/radio/src/lib/use-listener-heartbeat.ts` (hook client dedicado — opcional, para não inflar o player; separa o efeito de audiência da lógica de reprodução)

**Critérios de aceite:**

- [x] `player.tsx` envia `POST /api/heartbeat` a cada 60s enquanto reproduz, parando ao pausar/erro/desmontar
- [x] Payload sem PII: apenas `sessionId` efêmero (gerado no client) + `trackId` — verificado (grep: nenhum e-mail/user id/cookie no payload)
- [x] `session_id` não é derivado de nenhum identificador estável de usuário
- [x] Uma sessão que reproduz >= ~1 min gera >= 2 heartbeats (contável como "ouvinte" por D-3)
- [x] Falha do `fetch` não interrompe a reprodução (best-effort)
- [x] Nenhuma regressão em play/pause/volume/progresso/erro (P-8.2/P-8.5b) — verificação manual documentada no PR
- [x] Nenhuma mudança visual no player
- [x] Lint passa · Types passam

**Notas:**
Este é o elo que faltava para o feature de audiência de P-8.11 funcionar de ponta a ponta; sem ele, `listener_stats`/KPI ficam permanentemente vazios. Verificação de ponta a ponta sugerida no PR: reproduzir > 2 min, confirmar linhas em `radio.listener_heartbeats`, rodar `runRadioStatsAggregation` e conferir a linha do dia em `radio.listener_stats`. A retenção/base legal desses heartbeats já está no escopo de auditoria de P-9.2. Fechar em SESSIONS.md o débito de S-150/S-151 (`player.tsx` sem heartbeat).

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

- [x] Toda tabela com RLS habilitado e DENY-by-default (verificação automatizada por introspecção)
- [~] Zero conexões superuser em runtime de app (grep + teste)
- [x] GRANTs ↔ policies reconciliados schema a schema
- [x] Nenhum cross-schema leak (testes por papel)
- [x] Conflitos de interesse enforced em RLS
- [x] Cookie de impersonação assinado/inforjável (F3-13 fechado)
- [~] Signed URLs com expiração adequada
- [x] Nenhuma query dinâmica vulnerável a SQL injection
- [x] Testes de segurança passam · Relatório de findings documentado

---

### P-9.1b — Fechamento dos achados abertos da auditoria (S-02 + S-05) (CORRETIVO)

**Fase:** 9
**Módulo:** fundacao
**Tipo:** integration
**Origem:** achados S-02 (ALTO) e S-05 (MÉDIO) da auditoria P-9.1, registrados em
SESSIONS.md S-154. P-9.1 os deixou em aberto porque o fix é arquitetural / fora
dos arquivos permitidos daquele prompt (verificação, não decisão).
**Pré-condições:**

- Branch: `feat/P-9.1b-security-audit-fixes`
- Dependências: P-9.1 concluído (migration `0055` aplicada; `security-audit.test.ts` verde)
- Env vars: `DATABASE_URL`

**Escopo:**

Corrigir os dois achados de segurança que P-9.1 documentou mas não fechou. NÃO
reabrir a auditoria nem alterar policies/GRANTs (isso foi P-9.1); aqui só se
elimina o bypass de RLS na aplicação e encurta a URL assinada.

**S-02 — Eliminar leituras/mutações via `db` superuser (owner) que contornam RLS.**
Hoje páginas RSC (`lib/queries.ts`) e Server Actions (`actions/*.ts`) de vários
apps acessam dados protegidos por RLS através da conexão owner (`@hebron/db/client`),
onde a RLS não se aplica (nenhuma tabela tem FORCE ROW LEVEL SECURITY). Converter
esses acessos para `withAuthenticatedContext({ actorId }, (tx) => …)` (kit de
`@hebron/db/authenticated`, decisão B / P-0.10), de modo que a RLS volte a ser
camada ativa na leitura — não só nos gates de layout/action. Regras:

1. Toda leitura/mutação de dado de negócio escopado por usuário/papel passa a rodar
   dentro de `withAuthenticatedContext` com o `actorId` da sessão resolvida
   (`resolveSession`/`getAuthUser`). O `tx` recebido substitui o `db` cru na query.
2. O que é legitimamente service-level permanece fora do contexto autenticado e
   deve ficar explícito: inserts de `admin.audit_log` (já via `withSystemRole`),
   inserts de `public.notifications` por service role (`lib/notifications.ts`),
   resolução de sessão/papéis em `@hebron/auth/server`, contadores agregados
   públicos e jobs. Documentar cada exceção mantida como comentário no arquivo.
3. Prioridade por gravidade (pior primeiro): `admin` (0 usos hoje) → `financeiro`
   (gate largo `colaborador+` lendo todas as contas/transações) → `projetos` →
   demais apps onde o isolamento por linha (hóspede/aluno/submissor) importa.
4. Onde `withAuthenticatedContext` já é usado, apenas garantir que NÃO reste
   leitura irmã via `db` cru no mesmo fluxo (grep por `db.select`/`db.query`/
   `db.execute` em `lib/queries.ts` e `actions/*.ts`).

Se o volume tornar o prompt grande demais para uma sessão, PARE e registre em
SESSIONS.md a divisão sugerida em sub-prompts por app (P-9.1b-1…n) — não misturar
apps sem registro (metodologia "uma sessão = um prompt").

**S-05 — Encurtar a URL assinada da plataforma (10 anos → curta) + resolver sob demanda.**
`apps/plataforma/src/actions/uploads.ts` usa `READ_URL_EXPIRES_IN_SECONDS =
60*60*24*365*10`. Reduzir para TTL curto alinhado ao restante (1h, como flats/radio)
e resolver a URL de leitura no momento do consumo (server component que renderiza
capa/anexo), em vez de persistir/propagar uma URL de longa duração. Ajustar os
schemas de `packages/validators` que hoje exigem `z.string().url()` pré-resolvida
(aceitar `storagePath` + resolver na borda) apenas se necessário para o consumo
sob demanda. Não alterar buckets nem policies de storage.

**Arquivos permitidos para criação/edição:**

- S-02 (por app, apenas os que fazem leitura/mutação RLS via `db` cru):
  - `apps/admin/src/lib/queries.ts`, `apps/admin/src/actions/*.ts`,
    `apps/admin/src/app/(dashboard)/**/page.tsx` (somente troca de `db`→`tx`)
  - `apps/financeiro/src/lib/queries.ts`, `apps/financeiro/src/actions/*.ts`
  - `apps/projetos/src/lib/queries.ts`, `apps/projetos/src/actions/*.ts`
  - `apps/documentos/src/lib/*.ts`, `apps/documentos/src/actions/*.ts`
  - `apps/flats/src/lib/queries.ts`, `apps/flats/src/actions/*.ts`
  - `apps/intranet/src/lib/queries.ts`, `apps/intranet/src/actions/*.ts`
  - `apps/plataforma/src/lib/queries.ts`, `apps/plataforma/src/actions/*.ts`
  - `apps/tarefas/src/lib/queries.ts`, `apps/tarefas/src/actions/*.ts`
  - `apps/radio/src/lib/queries.ts`, `apps/radio/src/actions/*.ts`
- S-05:
  - `apps/plataforma/src/actions/uploads.ts`
  - componentes/páginas de plataforma que consomem `coverImageUrl`/`downloadUrl`
    (ex.: `course-card.tsx`, `lesson-view.tsx`) — só o necessário para resolver sob demanda
  - `packages/validators/src/plataforma/*.ts` (somente se o schema exigir)
- Testes/registro:
  - `apps/admin/src/__tests__/security-audit.test.ts` (novos casos: leitura por
    papel com DADOS semeados prova isolamento por linha, não só 0 linhas)
  - `SESSIONS.md` (entrada + índice)

**Critérios de aceite:**

- [ ] Nenhuma leitura/mutação de dado RLS-escopado via `db` cru em `lib/queries.ts`
      / `actions/*.ts` (grep limpo; exceções service-level comentadas)
- [ ] Teste por papel com dados semeados: usuário A não lê a linha do usuário B
      no mesmo schema (isolamento horizontal via RLS, não só via gate de layout)
- [ ] `financeiro`: `colaborador` sem designação financeira não lê contas/transações
      que a RLS não permite (prova de que a RLS voltou a valer na leitura)
- [ ] `plataforma`: URL de leitura assinada com TTL ≤ 1h; resolução sob demanda,
      sem URL de longa duração persistida/propagada
- [ ] Exceções service-level (audit, notifications, jobs) preservadas e documentadas
- [ ] `security-audit.test.ts` estendido e verde · SESSIONS.md atualizado
- [ ] Lint passa · Types passam

> **Nota (S-155):** o volume real (~80 arquivos em 9 apps, levantado por
> varredura antes da implementação) excede uma sessão. Seguindo a cláusula de
> contingência do próprio P-9.1b ("se o volume tornar o prompt grande demais
> ... registrar a divisão sugerida em sub-prompts por app"), o fix de S-02 foi
> dividido nos sub-prompts **P-9.1b-1 a P-9.1b-7** abaixo, um app (ou grupo de
> apps de baixo volume) por sessão, na ordem de prioridade indicada no escopo
> original (admin → financeiro → projetos → demais apps onde o isolamento por
> linha importa). S-05 (URL assinada da plataforma) foi anexado ao sub-prompt
> da plataforma (P-9.1b-7). Nenhum código de app foi alterado nesta sessão —
> apenas o levantamento e o registro da divisão.

---

### P-9.1b-1 — Fechamento do achado S-02 em `admin` (CORRETIVO)

**Fase:** 9
**Módulo:** admin
**Tipo:** integration
**Origem:** divisão de P-9.1b (S-155) — prioridade #1: único app com **zero** usos
de `withAuthenticatedContext` hoje, incluindo CRUD de `users`/`role_assignments`
(alta sensibilidade) gated apenas por `super_admin` no safe-action, sem RLS ativa.
**Pré-condições:**

- Branch: `feat/P-9.1b-1-admin-rls`
- Dependências: `withAuthenticatedContext`/`withSystemRole` (`@hebron/db/authenticated`,
  P-0.10); `lib/safe-action.ts` do admin já resolve `ctx.actorId` via `resolveSession`
- Env vars: `DATABASE_URL`

**Escopo:**

Migrar todo acesso a dado de negócio em `admin` de `db` cru (`@hebron/db/client`)
para `withAuthenticatedContext({ actorId: ctx.actorId }, (tx) => …)`:

1. `src/lib/queries.ts` — `getDirectors()`.
2. `src/actions/impersonation.ts` — leituras de `users.fullName` (ator + alvo).
3. `src/actions/invitations.ts`, `meetings.ts` — CRUD.
4. `src/actions/roles.ts` — CRUD de `role_assignments` (grants de papel).
5. `src/actions/settings.ts` — CRUD de configurações.
6. `src/actions/users.ts` (maior arquivo — 17 call-sites): `createUser`,
   `updateUser`, `suspendUser`/`unsuspendUser`, `resetPassword`, `approveUser`,
   `approveSignup` (inclui `db.insert(roleAssignments)` — grant de papel),
   `rejectSignup`.

`db.insert(notifications)` dentro dos helpers de notificação e qualquer escrita
em `admin.audit_log` (já via `@hebron/db/audit`) permanecem como exceção
service-level — não migrar, apenas comentar a exceção no arquivo (regra G6.3 /
regra 2 do escopo original de P-9.1b).

**Arquivos permitidos para criação/edição:**

- `apps/admin/src/lib/queries.ts`
- `apps/admin/src/actions/impersonation.ts`, `invitations.ts`, `meetings.ts`,
  `roles.ts`, `settings.ts`, `users.ts`
- `apps/admin/src/__tests__/security-audit.test.ts` (novo caso: usuário
  autenticado sem `super_admin` não lê/edita `users`/`role_assignments` de
  outro registro via RLS — dados semeados, não só 0 linhas)
- `SESSIONS.md`

**Critérios de aceite:**

- [x] Grep limpo de `db.select`/`db.query`/`db.execute`/`db.insert`/`db.update`
      em `lib/queries.ts` e nos 6 arquivos de `actions/*.ts` listados (exceções
      de notificação/audit comentadas)
- [x] Teste com dados semeados prova isolamento horizontal em `users`/`role_assignments`
- [x] `security-audit.test.ts` estendido e verde
- [x] Lint passa · Types passam · SESSIONS.md atualizado

---

### P-9.1b-2 — Fechamento do achado S-02 em `financeiro` (CORRETIVO)

**Fase:** 9
**Módulo:** financeiro
**Tipo:** integration
**Origem:** divisão de P-9.1b (S-155) — prioridade #2: gate `colaborador+` lê
todas as contas/transações da organização sem RLS ativa na leitura (achado
original de S-02, o exemplo citado explicitamente na auditoria P-9.1).
**Pré-condições:**

- Branch: `feat/P-9.1b-2-financeiro-rls`
- Dependências: P-9.1b-1 concluído (mesmo padrão, primeiro app já validado);
  `apps/financeiro/src/actions/payables.ts` já migrado — usar como template
- Env vars: `DATABASE_URL`

**Escopo:**

1. `src/lib/queries.ts` (maior superfície de leitura do módulo, 21 call-sites) —
   `getBankAccounts`, `getCategories`, `getCostCenterOptions`, `getTransactions`,
   `getPayables`, `getReceivables`, `getBudgets`, `getBatchApprovals`,
   `getLatestBankImport`, `getTransactionsForAccount`, `getUsersMap`: todas para
   `withAuthenticatedContext`.
2. `src/actions/accounts.ts`, `categories.ts`, `conciliation.ts`, `import.ts`,
   `organization-budgets.ts` — totalmente não migrados, migrar por completo.
3. `src/actions/approval.ts`, `reports.ts`, `transactions.ts` — mixed (já usam
   `withAuthenticatedContext` para parte do fluxo): eliminar os call-sites raw
   restantes, incluindo os helpers duplicados `getPayableOrThrow`/
   `getTransactionOrThrow` (hoje raw e repetidos em `approval.ts` e
   `transactions.ts` — consolidar em `lib/queries.ts` como uma função só,
   recebendo `tx: AuthenticatedTx`, e importar dos dois arquivos).
4. O `db.insert(notifications)` de alerta de autorização em `approval.ts`
   permanece exceção service-level (documentar).

**Arquivos permitidos para criação/edição:**

- `apps/financeiro/src/lib/queries.ts`
- `apps/financeiro/src/actions/accounts.ts`, `categories.ts`, `conciliation.ts`,
  `import.ts`, `organization-budgets.ts`, `approval.ts`, `reports.ts`,
  `transactions.ts`
- `apps/admin/src/__tests__/security-audit.test.ts` (novo caso: `colaborador`
  sem designação financeira não lê `bankAccounts`/`transactions`/`payables`/
  `receivables` do schema `financeiro` — dados semeados)
- `SESSIONS.md`

**Critérios de aceite:**

- [x] Grep limpo de `db` cru em `lib/queries.ts` e nos 8 arquivos de `actions/*.ts`
      (exceção de notificação comentada)
- [x] Helpers `getPayableOrThrow`/`getTransactionOrThrow` consolidados (sem
      duplicação entre `approval.ts` e `transactions.ts`)
- [x] Teste prova que `colaborador` sem designação financeira não lê
      contas/transações (RLS volta a valer na leitura — critério original de
      P-9.1b)
- [x] Lint passa · Types passam · SESSIONS.md atualizado

---

### P-9.1b-3 — Fechamento do achado S-02 em `projetos` (CORRETIVO)

**Fase:** 9
**Módulo:** projetos
**Tipo:** integration
**Origem:** divisão de P-9.1b (S-155) — prioridade #3. `lib/queries.ts` já roda
em `withAuthenticatedContext` (leituras migradas); as mutações em `actions/*.ts`
ainda usam `db` cru.
**Pré-condições:**

- Branch: `feat/P-9.1b-3-projetos-rls`
- Dependências: P-9.1b-2 concluído
- Env vars: `DATABASE_URL`

**Escopo:**

Migrar `src/actions/evaluations.ts`, `organizations.ts`, `projects.ts` (maior
arquivo do módulo — 21 call-sites, ciclo de vida completo do projeto),
`reports.ts`, `voting.ts` de `db` cru para `withAuthenticatedContext`. O
`db.insert(notifications)` em `projects.ts` permanece exceção service-level.

**Arquivos permitidos para criação/edição:**

- `apps/projetos/src/actions/evaluations.ts`, `organizations.ts`, `projects.ts`,
  `reports.ts`, `voting.ts`
- `apps/admin/src/__tests__/security-audit.test.ts` (novo caso: `submissor`
  não lê/edita projeto de organização à qual não pertence — dados semeados)
- `SESSIONS.md`

**Critérios de aceite:**

- [x] Grep limpo de `db` cru nos 5 arquivos de `actions/*.ts`
- [x] Teste prova isolamento horizontal por organização em `projects`
- [x] Lint passa · Types passam
- [x] SESSIONS.md atualizado — causa raiz do drift de GRANT (S-158)
      identificada via MCP `plugin:supabase:supabase`: `apps/projetos/src/__tests__/voting.test.ts`
      tratava `GRANT USAGE ON SCHEMA projetos`/`SELECT` em
      `projects`/`votes`/`organization_members` como temporário (`afterAll`
      revogava), quando esses grants são permanentes (mesmo padrão de
      `documentos`). Toda execução da suíte no banco compartilhado revogava
      o acesso globalmente por ~2min. Corrigido: removido o
      GRANT/REVOKE de `voting.test.ts`; grants restaurados
      (idênticos a `0056`); suíte `@hebron/projetos` estável em 2 execuções
      consecutivas (105/107 — as 2 restantes são o achado secundário
      pré-existente e fora de escopo de `close-voting.test.ts`, já
      documentado). Ver S-159 em SESSIONS.md.

---

### P-9.1b-4 — Fechamento do achado S-02 em `documentos` (CORRETIVO)

**Fase:** 9
**Módulo:** documentos
**Tipo:** integration
**Origem:** divisão de P-9.1b (S-155) — prioridade #4. `documentos` não tem
`lib/queries.ts`; a lógica de leitura vive inline em `actions/*.ts`, 100% via
`db` cru.
**Pré-condições:**

- Branch: `feat/P-9.1b-4-documentos-rls`
- Dependências: P-9.1b-3 concluído
- Env vars: `DATABASE_URL`

**Escopo:**

Migrar `src/actions/categories.ts`, `documents.ts` (maior arquivo — 19
call-sites), `editals.ts`, `search.ts`, `subscriptions.ts`, `tags.ts` de `db`
cru para `withAuthenticatedContext`. Avaliar `src/lib/notifications.ts` (6
call-sites): se for fan-out de notificação genuinamente service-level (mesmo
padrão de exceção de outros módulos), documentar como exceção; se depender de
papel/escopo do destinatário, migrar.

**Arquivos permitidos para criação/edição:**

- `apps/documentos/src/actions/categories.ts`, `documents.ts`, `editals.ts`,
  `search.ts`, `subscriptions.ts`, `tags.ts`
- `apps/documentos/src/lib/notifications.ts` (só se decidido migrar, ver escopo)
- `apps/admin/src/__tests__/security-audit.test.ts` (novo caso: usuário sem
  papel editorial não lê/edita documento fora do seu escopo — dados semeados)
- `SESSIONS.md`

**Critérios de aceite:**

- [x] Grep limpo de `db` cru nos 6 arquivos de `actions/*.ts` (decisão sobre
      `lib/notifications.ts` registrada em SESSIONS.md)
- [x] Teste prova isolamento de documento por papel/escopo
- [x] Lint passa · Types passam · SESSIONS.md atualizado

---

### P-9.1b-5 — Fechamento do achado S-02 em `intranet` (CORRETIVO)

**Fase:** 9
**Módulo:** intranet
**Tipo:** integration
**Origem:** divisão de P-9.1b (S-155) — prioridade #5.
**Pré-condições:**

- Branch: `feat/P-9.1b-5-intranet-rls`
- Dependências: P-9.1b-4 concluído
- Env vars: `DATABASE_URL`

**Escopo:**

1. `src/lib/queries.ts` (9 call-sites) — migrar para `withAuthenticatedContext`.
2. `src/actions/announcements.ts`, `briefing.ts`, `dashboard.ts`, `decisions.ts`
   (mixed — já usam `withAuthenticatedContext` parcialmente) — eliminar os
   call-sites raw restantes, incluindo a leitura de permissão
   `meetingSessions.chairUserId` em `decisions.ts`.
3. `src/actions/invitations.ts` — não migrado, migrar por completo (inclui
   `db.insert(roleAssignments)` — grant de papel).
4. `src/actions/kpis.ts` (5 call-sites): os agregados (`count`/`sum` org-wide
   sobre `projects`/`financialCategories`+`transactions`/`tasks`) são
   candidatos a exceção service-level (não retornam linha individual). Decidir
   e documentar — se migrado, confirmar que o agregado não vaza contagem que a
   RLS do schema de origem negaria a um `authenticated` sem designação.

**Arquivos permitidos para criação/edição:**

- `apps/intranet/src/lib/queries.ts`
- `apps/intranet/src/actions/announcements.ts`, `briefing.ts`, `dashboard.ts`,
  `decisions.ts`, `invitations.ts`, `kpis.ts`
- `apps/admin/src/__tests__/security-audit.test.ts` (novo caso: colaborador
  não lê anúncio/decisão fora do seu escopo — dados semeados)
- `SESSIONS.md`

**Critérios de aceite:**

- [x] Grep limpo de `db` cru nos arquivos listados (decisão sobre `kpis.ts`
      registrada em SESSIONS.md)
- [x] Teste prova isolamento em pelo menos uma tabela de `intranet`
- [x] Lint passa · Types passam · SESSIONS.md atualizado

---

### P-9.1b-6 — Fechamento do achado S-02 em `tarefas` (CORRETIVO)

**Fase:** 9
**Módulo:** tarefas
**Tipo:** integration
**Origem:** divisão de P-9.1b (S-155) — prioridade #6.
**Pré-condições:**

- Branch: `feat/P-9.1b-6-tarefas-rls`
- Dependências: P-9.1b-5 concluído
- Env vars: `DATABASE_URL`

**Escopo:**

1. `src/lib/queries.ts` (21 call-sites — `getAuthUser`, `getTasks`,
   `getTasksByWorkspace`, `getTaskById`, `getAssignedTasks`, `getTaskTemplates`,
   `getRecurrenceRuleViews`, `getAssignableUsers`, `getApprovers`, `getTags`)
   — migrar todas para `withAuthenticatedContext`.
2. `src/actions/approvals.ts`, `comments.ts`, `recurrence.ts`, `tasks.ts`,
   `templates.ts`, `time-tracking.ts` (todos mixed) — eliminar os call-sites
   raw restantes.

**Arquivos permitidos para criação/edição:**

- `apps/tarefas/src/lib/queries.ts`
- `apps/tarefas/src/actions/approvals.ts`, `comments.ts`, `recurrence.ts`,
  `tasks.ts`, `templates.ts`, `time-tracking.ts`
- `apps/admin/src/__tests__/security-audit.test.ts` (novo caso: usuário não lê
  tarefa de workspace ao qual não pertence — dados semeados)
- `SESSIONS.md`

**Critérios de aceite:**

- [x] Grep limpo de `db` cru em `lib/queries.ts` e nos 6 arquivos de
      `actions/*.ts`
- [x] Teste prova isolamento por workspace em `tasks`
- [x] Lint passa · Types passam · SESSIONS.md atualizado

---

### P-9.1b-7 — Fechamento residual de S-02 (flats/plataforma/radio) + S-05 (CORRETIVO)

**Fase:** 9
**Módulo:** fundacao (flats, plataforma, radio)
**Tipo:** integration
**Origem:** divisão de P-9.1b (S-155) — os três apps já estão quase totalmente
migrados (auditoria P-9.1/P-X.9 anteriores); resta apenas o call-site raw
residual de cada um, mais o achado S-05 (mesma app: plataforma). Agrupados numa
única sessão por baixo volume (3 apps, ≤2 call-sites cada + S-05).
**Pré-condições:**

- Branch: `feat/P-9.1b-7-flats-plataforma-radio-rls`
- Dependências: P-9.1b-6 concluído
- Env vars: `DATABASE_URL`

**Escopo:**

**S-02 residual:**

1. `apps/flats/src/lib/queries.ts`, `apps/plataforma/src/lib/queries.ts`,
   `apps/radio/src/lib/queries.ts` — cada um tem um único `getAuthUser()` que
   faz `db.select({ fullName: users.fullName })` cru pelo id já retornado por
   `supabase.auth.getUser()`. Como o `actorId` já é conhecido nesse ponto (não é
   bootstrap sem sessão), migrar para `withAuthenticatedContext({ actorId }, …)`
   como nos demais módulos — não tratar como exceção.
2. `apps/plataforma/src/lib/queries.ts` — `isInstructor()` (leitura raw de
   `instructors`) — migrar igualmente.

**S-05 — TTL da URL assinada da plataforma:**

3. `apps/plataforma/src/actions/uploads.ts` — reduzir
   `READ_URL_EXPIRES_IN_SECONDS` de 10 anos para ≤1h (mesmo padrão de
   flats/radio) e resolver a URL de leitura sob demanda no momento do consumo
   (server component que renderiza capa/anexo), em vez de persistir/propagar
   uma URL de longa duração.
4. Componentes/páginas de plataforma que consomem `coverImageUrl`/`downloadUrl`
   (ex.: `course-card.tsx`, `lesson-view.tsx`) — só o necessário para resolver
   a URL sob demanda.
5. `packages/validators/src/plataforma/*.ts` — ajustar apenas se o schema
   exigir `z.string().url()` pré-resolvida e isso bloquear a resolução sob
   demanda (aceitar `storagePath` + resolver na borda).

Não alterar buckets nem policies de storage (regra original de P-9.1b).

**Arquivos permitidos para criação/edição:**

- `apps/flats/src/lib/queries.ts`, `apps/plataforma/src/lib/queries.ts`,
  `apps/radio/src/lib/queries.ts`
- `apps/plataforma/src/actions/uploads.ts`
- componentes/páginas de plataforma que consomem `coverImageUrl`/`downloadUrl`
  (apenas o necessário)
- `packages/validators/src/plataforma/*.ts` (somente se o schema exigir)
- `apps/admin/src/__tests__/security-audit.test.ts` (guarda de TTL ≤1h para
  plataforma, mesmo formato do teste já existente para flats/radio)
- `SESSIONS.md`

**Critérios de aceite:**

- [x] Grep limpo de `db` cru nos 3 `lib/queries.ts` (flats, plataforma, radio)
- [x] URL de leitura da plataforma com TTL ≤1h; resolução sob demanda, sem URL
      de longa duração persistida/propagada
- [x] `security-audit.test.ts` estendido (guarda de TTL da plataforma) e verde
- [x] Lint passa · Types passam · SESSIONS.md atualizado
- [x] **Fechamento de P-9.1b:** com P-9.1b-1..7 concluídos, os achados S-02 e
      S-05 de S-154 podem ser marcados como corrigidos no índice da auditoria
      (atualizar a entrada S-154 ou registrar entrada de fechamento em
      SESSIONS.md referenciando os 7 sub-prompts)

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

- [x] "Meus Dados" em cada app: visualização, consentimentos revogáveis, export JSON+CSV, pedido de exclusão
- [x] Exclusão executada anonimiza PII de verdade (teste fim-a-fim com usuário fixture) e preserva registros contábeis pseudonimizados
- [x] Consentimento do cadastro é opt-in (verificação — já implementado em P-1.26/P-7.4)
- [x] Acesso a CPF/documentos audita leitura (teste)
- [x] Varredura final documentada: inventário de dados pessoais × base legal × retenção
- [~] Lint passa · Types passam

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

- [x] Nenhuma query N+1 identificada
- [x] Indexes criados para queries frequentes
- [x] Bundle size por app < 500KB initial load
- [~] Web Vitals dentro dos targets
- [x] Imagens otimizadas via Next.js Image
- [x] Componentes pesados com lazy loading
- [x] Lint passa
- [x] Types passam

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

- [x] Nenhuma frase genérica "cara de IA" encontrada
- [x] Citações bíblicas nos estados vazios pertinentes ao contexto de cada módulo
- [x] Tom institucional consistente em todos os apps
- [x] Português correto, sem anglicismos desnecessários
- [x] Sem exclamações genéricas ("Vamos lá!", "Incrível!", etc.)
- [x] Grep sem ocorrências (case-insensitive) em arquivos .tsx de UI: "vamos lá", "incrível", "awesome", "ops!", "oops", "não se preocupe", "estamos quase lá", "tudo certo!" — e revisão manual de exclamações genéricas restantes
- [x] Lint passa
- [x] Types passam

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

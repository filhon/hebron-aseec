# 01 — VERIFICAÇÃO NEGATIVA (FASE 1)

> O que a spec exige e **não existe no código**. Cada item declara onde e como foi procurado.
> Fontes cruzadas: PRD (`.docs/PRD Ecossistema Hebron Aseec.md`), `.docs/Claude.md` (complementar), `BRAIN.md` §6/§8, `PROMPTS.md`, `PATCHES/`.
> Convenção: **AUSENTE** = busca exaustiva (locais e padrões listados). **NÃO LOCALIZADO** = busca parcial.

---

### [NEG-001] Os três prompts de IA promovidos à v1 por PATCH-012 nunca foram escritos nem implementados

- **Severidade:** P1 | **Domínio:** Drift de escopo | **App:** projetos, flats
- **Status:** CONFIRMADO
- **Evidência:** `PATCHES/012-ia-embeddings-v1-scoring-flats-renovacao.md:10`
- **Trecho:**
  ```
  Perguntado se cada uma deveria virar v1 (com prompt) ou ficar v2+ (corrigindo o BRAIN), o Filipe
  decidiu (Fase 1 Q3): **"Pode criar os prompts"** — as três entram na v1, com prompts próprios:
  P-2.13 (renovação), P-2.14 (embeddings de duplicidade) e P-7.13 (assistência de scoring de flats).
  ```
- **Esperado:** BRAIN §8 "Mantido na v1" lista os três explicitamente (linhas 575–577), cada um com referência de prompt. PATCH-012 registra decisão do dono do produto.
- **Encontrado:** Nenhum dos três prompts existe. `grep -n "P-2\.13\|P-2\.14\|P-7\.13" PROMPTS.md` → **0 resultados**. Em `SESSIONS.md` as únicas menções são notas de outras sessões dizendo que a coluna/funcionalidade "só chega em P-7.13" (linhas 8579, 8859, 8956, 9429) — ou seja, o débito foi reconhecido 4 vezes e nunca aberto.
- **Como procurei (exaustivo):**
  - `PROMPTS.md`, `SESSIONS.md`: padrão `P-2\.13|P-2\.14|P-7\.13`
  - Código: `grep -rniE "pgvector|embedding|vector\(|text-embedding|cosine|<=>"` em `packages/db/src/migrations/*.sql`, `packages/ai/src`, `apps/*/src`, `packages/*/src` → **0 ocorrências em todo o repositório**
  - `packages/ai/src/`: contém apenas `financeiro/ocr.ts`, `projects/compact-version.ts`, `projects/scoring.ts` — nenhum módulo de duplicidade, renovação ou flats
  - Extensão Postgres: nenhuma migration executa `CREATE EXTENSION vector`
- **Impacto:** Três requisitos que o dono do produto aprovou explicitamente para a v1 não existem. O **P-2.14 (duplicidade)** e o **P-2.13 (renovação)** são exigências diretas do PRD, não só do BRAIN — ver `[NEG-002]`. Sem eles, o submissor pode reenviar o mesmo projeto sem qualquer aviso e a renovação anual é digitação manual integral.
- **Correção sugerida:** Escrever e executar P-2.13, P-2.14 e P-7.13; ou, se a diretoria preferir adiar, emitir um PATCH revogando explicitamente PATCH-012 e reescrevendo BRAIN §8. Deixar como está mantém a contradição que a auditoria anterior (S1-12/S1-13) já havia fechado.

---

### [NEG-002] Requisito 5 do PRD para Projetos (formulário "inteligente") não implementado

- **Severidade:** P1 | **Domínio:** Drift PRD ↔ código | **App:** projetos
- **Status:** CONFIRMADO
- **Evidência:** `.docs/PRD Ecossistema Hebron Aseec.md:89`
- **Trecho:**
  ```
  5) O formulário de submissão deve ser "inteligente", embutido com IA. Caso o usuário esteja
  submetendo um projeto que ele já submeteu o sistema deve avisar. Caso ele esteja submetendo um
  projeto para a renovação (já submeteu projeto com um nome igual ou descrição parecida no ano
  passado), o sistema deve entender e auto preencher os campos e seguir para a tela de resumo,
  permitindo que o submissor altere qualquer campo pré-preenchido.
  ```
- **Esperado:** Aviso de duplicidade na submissão + auto-preenchimento por detecção de renovação, com tela de resumo editável.
- **Encontrado:** A coluna `parent_project_id` existe (`packages/db/src/migrations/0007_projetos.sql:118`) com índice (`:158`), e o schema Zod aceita o campo (`packages/validators/src/projetos/index.ts:123,208`), mas **nada no wizard jamais o preenche**. As duas únicas escritas são repasses passivos do input:
  ```ts
  // apps/projetos/src/actions/projects.ts:174
  parentProjectId: parsedInput.parentProjectId ?? null,
  ```
  Não há componente de UI, action ou query que detecte projeto similar, calcule semelhança ou ofereça pré-preenchimento.
- **Como procurei (exaustivo):** `grep -rn "parentProjectId|parent_project"` em `apps/*/src` → apenas as 2 linhas acima; `grep -rniE "renovac|renewal"` em `apps/*/src`, `packages/*/src`, migrations → apenas comentários de schema e o tipo em `packages/types/src/projetos/index.ts:225` ("Renewal link — preserved history, stages reset").
- **Impacto:** A infraestrutura de dados de renovação está pronta e permanentemente vazia. O PRD trata isso como funcionalidade obrigatória do módulo mais complexo do ecossistema.
- **Correção sugerida:** Mesmo pacote de `[NEG-001]` (P-2.13/P-2.14).

---

### [NEG-003] P-9.0 — migração de usuários do sistema legado: escopo v1 sem prompt e sem código

- **Severidade:** P1 | **Domínio:** Ausência de entregável | **App:** fundação
- **Status:** CONFIRMADO
- **Evidência:** `BRAIN.md:580`
- **Trecho:**
  ```
  - Migração de usuários do sistema legado (P-9.0)
  ```
  (bloco "### Mantido na v1")
- **Esperado:** Um prompt P-9.0 executado antes do deploy final. `PROMPTS.md:10531` o declara **pré-condição** de P-9.5: `Dependências: P-9.4 concluído; P-9.0 (migração de usuários do legado) concluído`.
- **Encontrado:** P-9.0 **não existe como prompt**. `grep -n "P-9.0" PROMPTS.md` retorna exatamente 2 linhas, ambas referências a ele como dependência (10531 e 10552) — nenhum cabeçalho `### P-9.0`. Nenhuma sessão em `SESSIONS.md`. Nenhum script de importação/migração de usuários em `packages/db/src/seed*`, `scripts/`.
- **Como procurei (exaustivo):** `grep -n "P-9.0"` em `PROMPTS.md` e `SESSIONS.md`; `grep -n "^### P-9"` em `PROMPTS.md` (retorna 9.1, 9.1b, 9.1b-1..7, 9.2, 9.3, 9.4, 9.5); `ls packages/db/src/seed/`; `ls scripts/`.
- **Impacto:** Os ~150 usuários ativos atuais não têm caminho de entrada no sistema novo. Sem isso o go-live exige recadastro manual de toda a base, incluindo os submissores externos (pastores/missionários) — exatamente o público que o BRAIN §1 descreve como "em transição tecnológica".
- **Correção sugerida:** Escrever P-9.0 (extração do legado → `public.users` + `auth.users` via Admin API + convite/reset de senha em massa) antes de P-9.5.

---

### [NEG-004] P-9.5 (Deploy Final) nunca executado — nenhum critério de aceite fechado

- **Severidade:** P1 | **Domínio:** Produção | **App:** todos
- **Status:** CONFIRMADO
- **Evidência:** `PROMPTS.md:10546-10559`
- **Trecho:**
  ```
  - [ ] 9 apps deployados com subdomínios corretos
  - [ ] SSO funcional entre todos os subdomínios
  - [ ] Deploy automático em merge na main (CI de PR já verde desde P-0.9)
  - [ ] Todos os crons do catálogo de packages/jobs registrados em produção (lista verificada 1 a 1)
  - [ ] pg_cron de partições ativo (INSERT de audit em mês futuro funciona em produção)
  ...
  - [ ] Sentry capturando erros em todos os apps
  - [ ] Better Stack monitorando uptime de todos os subdomínios
  ```
- **Esperado:** Fase 9 concluída antes do go-live.
- **Encontrado:** Todos os 13 critérios em `[ ]`. Nenhuma sessão de P-9.5 em `SESSIONS.md` (a última é S-256/P-6.19). Não existe `.github/workflows/deploy.yml` nem nenhum `apps/*/vercel.json`.
- **Como procurei (exaustivo):** `grep -n "^## S-.*P-9.5" SESSIONS.md` → 0; `ls .github/workflows/` → apenas `ci.yml`; `find apps -name vercel.json -not -path "*/node_modules/*"` → 0.
- **Impacto:** Bloqueia produção por definição — é o prompt cuja conclusão _é_ o deploy.
- **Correção sugerida:** Executar após fechar os P0/P1 deste relatório.

---

### [NEG-005] Fases 7 (Flats), 8 (Rádio) e 9 (Polimento) têm código, mas o ciclo de auditoria por fase parou na 6

- **Severidade:** P2 | **Domínio:** Drift de registro | **App:** flats, radio
- **Status:** CONFIRMADO
- **Evidência:** `SESSIONS.md` — última entrada `## S-256 — P-6.19` (linha 23235)
- **Encontrado:** O padrão consolidado do projeto é: bloco implementado → sessão "Auditoria: débitos técnicos P-X.Y–P-X.Z" → série de corretivos. Isso ocorreu para Projetos (S-196, S-203), Financeiro (S-214), Tarefas (S-221), Intranet (S-240), Plataforma (S-252). **Flats e Rádio nunca receberam sessão de auditoria de bloco**, embora tenham corretivos pontuais anteriores (P-7.6b, P-7.9b, P-7.9c, P-8.9b, P-8.11b).
- **Impacto:** Flats e Rádio são os dois módulos com menor cobertura de revisão adversarial. Flats guarda PII sensível (documento de identidade, saúde autodeclarada) e Rádio expõe o único endpoint público não autenticado que escreve no banco. A auditoria por domínio deste relatório os cobre, mas com profundidade menor do que uma sessão dedicada daria.
- **Correção sugerida:** Rodar as duas sessões de auditoria de bloco antes do go-live, ou aceitar formalmente o risco.

---

### [NEG-006] Rate limiting: prometido na stack, ausente no código

- **Severidade:** P1 | **Domínio:** Produção/Segurança | **App:** todos
- **Status:** CONFIRMADO
- **Evidência:** `BRAIN.md:40`
- **Trecho:**
  ```
  - **Cache:** Upstash Redis (free tier 10k req/dia)
  ```
  E `.docs/Claude.md` §2.3: _"Upstash Redis — Sessões temporárias, rate limiting, locks distribuídos."_
- **Esperado:** Rate limiting em endpoints públicos e ações sensíveis (login, cadastro, heartbeat da rádio, submissão de projeto).
- **Encontrado:** **Nenhuma dependência Upstash/Redis em nenhum `package.json` do monorepo.** Nenhum código de rate limiting.
- **Como procurei (exaustivo):** `grep -rniE "upstash|ratelimit|rate-limit|rate limit"` em `apps/*/src` e `packages/*/src` → 0 arquivos; `grep -rn "upstash\|redis"` em `package.json`, `apps/*/package.json`, `packages/*/package.json` → 0.
- **Impacto:** `POST /api/heartbeat` (rádio) é público, sem autenticação e sem captcha, e insere uma linha por chamada — ver `[D8-003]`. As telas de login e cadastro não têm limite de tentativas além do que o Supabase Auth aplica por padrão.
- **Correção sugerida:** Instalar `@upstash/ratelimit` + `@upstash/redis` e aplicar, no mínimo, em `/api/heartbeat`, login, cadastro e submissão de projeto.

---

### [NEG-007] Observabilidade inteira (Sentry, Axiom, PostHog, Better Stack) prometida e ausente

- **Severidade:** P1 | **Domínio:** Produção | **App:** todos
- **Status:** CONFIRMADO
- **Evidência:** `BRAIN.md:68-74` (seção "### Observabilidade")
- **Trecho:**
  ```
  - **Erros:** Sentry (5k events/mês free)
  - **Logs:** Axiom (500GB/mês free) ou Vercel Log Drains
  - **Métricas:** PostHog Cloud EU (1M events/mês free)
  - **Uptime:** Better Stack (10 monitores free)
  - **Web Vitals:** Vercel Analytics
  ```
- **Encontrado:** Nenhuma das cinco existe. Nenhum `sentry.client.config.ts`, nenhum `@sentry/nextjs`, nenhum `posthog-js`, nenhum drain configurado. O erro em produção hoje só existe no log efêmero da Vercel via `console.error`.
- **Como procurei (exaustivo):** `grep -rn "sentry\|posthog"` em todos os `package.json` → 0; `find . -name "sentry*.config.*" -not -path "*/node_modules/*"` → 0; `grep -rniE "sentry|posthog|axiom|betterstack"` em `apps/*/src`, `packages/*/src` → 0.
- **Impacto:** Ecossistema de 9 apps indo a produção sem captura de erro. Uma falha de Server Action em produção é invisível — e como todo `serverError` é mascarado por padrão do `next-safe-action` (ver `[D4-004]`), o usuário vê "erro inesperado" e ninguém fica sabendo.
- **Correção sugerida:** Sentry é o mínimo indispensável (parte de P-9.5, critério `[ ] Sentry capturando erros em todos os apps`). Os demais podem ficar para depois do go-live.

---

### [NEG-008] Security headers (CSP, HSTS, X-Frame-Options) inexistentes

- **Severidade:** P1 | **Domínio:** Produção/Segurança | **App:** todos
- **Status:** CONFIRMADO
- **Evidência:** `packages/config/src/next.ts` (arquivo íntegro, 33 linhas)
- **Trecho:**
  ```ts
  export function createNextConfig(overrides: NextConfig = {}): NextConfig {
    const { webpack: overrideWebpack, transpilePackages, ...rest } = overrides;
    return {
      transpilePackages: transpilePackages ?? TRANSPILE_PACKAGES,
      ...rest,
      webpack: (config, context) => {
        config.output = { ...config.output, hashFunction: "sha256" };
        return overrideWebpack ? overrideWebpack(config, context) : config;
      },
    };
  }
  ```
- **Esperado:** PRD "Premissas Gerais [3]": _"deve possuir regras de segurança rígidas, evitando ataques, invasões, quebra de LGPD, etc., envidando esforços para promover as práticas mais seguras."_
- **Encontrado:** Nenhuma função `headers()` no config compartilhado. Os 9 apps consomem `createNextConfig()` sem override (verificado: os 9 `next.config.ts` são idênticos, 3 linhas cada). Portanto nenhum app envia CSP, HSTS, X-Frame-Options, X-Content-Type-Options ou Referrer-Policy.
- **Como procurei (exaustivo):** `cat apps/*/next.config.ts` (9 arquivos, todos `export default createNextConfig();`); `grep -rn "headers()" packages/config/src/` → 0; `grep -rn "Content-Security-Policy\|Strict-Transport" apps packages --include="*.ts" --include="*.mjs"` → 0.
- **Impacto:** Sem `X-Frame-Options`/`frame-ancestors`, qualquer página do ecossistema pode ser embutida em iframe de terceiro (clickjacking sobre ações de aprovação financeira e votação de projetos). Sem CSP, um XSS armazenado (ex.: rich text de tarefas/anúncios) executa sem restrição de origem.
- **Correção sugerida:** Adicionar `async headers()` em `createNextConfig` com o conjunto padrão; CSP pode começar em `report-only`.

---

### [NEG-009] Integração com Google Calendar (Intranet) ausente

- **Severidade:** P2 | **Domínio:** Ausência de entregável | **App:** intranet
- **Status:** CONFIRMADO
- **Evidência:** `BRAIN.md:428`
- **Trecho:**
  ```
  - Calendário compartilhado (integração Google Calendar)
  ```
- **Encontrado:** Existe uma rota `/calendario` própria (`apps/intranet/src/app/(dashboard)/calendario`) e `/reunioes`, ambas alimentadas por dados internos. **Nenhuma integração com Google Calendar**: nenhuma dependência `googleapis`, nenhum OAuth de calendário, nem sequer exportação `.ics`.
- **Como procurei (exaustivo):** `grep -rniE "google.?calendar|calendar.*api|\.ics|icalendar|googleapis"` em `apps/*/src`, `packages/*/src` → 0 resultados relevantes; `grep -rn "googleapis" */package.json` → 0.
- **Impacto:** Escopo declarado do BRAIN não entregue. Um calendário interno cobre parte do valor, mas a diretoria continua com agenda dupla.
- **Correção sugerida:** Decidir explicitamente: implementar (mínimo: exportação `.ics` por reunião, que resolve 80% do caso com 5% do esforço) ou emitir PATCH movendo para v2+.

---

### [NEG-010] Vírus scan em upload — exigido pelo PRD, silenciosamente abandonado

- **Severidade:** P2 | **Domínio:** Drift PRD ↔ código | **App:** projetos, documentos, financeiro, tarefas, flats
- **Status:** CONFIRMADO
- **Evidência:** `.docs/Claude.md` §4.2, "Funcionalidades básicas" de Projetos
- **Trecho:**
  ```
  - Upload de documentos com vírus scan.
  ```
- **Encontrado:** Nenhuma varredura de qualquer tipo. `BRAIN.md` (fonte da verdade) **não menciona vírus scan em lugar nenhum** — o requisito sumiu do PRD para o BRAIN sem PATCH que registre a decisão.
- **Como procurei (exaustivo):** `grep -rniE "virus|clamav|antivirus|malware|scan.*file"` em `apps/*/src`, `packages/*/src` → 0; `grep -in "virus" BRAIN.md PROMPTS.md` → 0.
- **Impacto:** 6 buckets aceitam upload de submissores externos (`project-attachments`, `hebron-docs`, `financeiro-recibos`, `flats-documentos`, `tarefas-anexos`, `plataforma-anexos`). Arquivo malicioso enviado por um pastor externo é servido por signed URL a um diretor. O risco é moderado (não há execução server-side), mas o PRD pediu explicitamente.
- **Correção sugerida:** Emitir PATCH aceitando o risco e removendo do escopo, **ou** ligar o scan do Supabase Storage / uma Edge Function com ClamAV. A decisão precisa estar registrada.

---

### [NEG-011] SEO do portal de Documentos: sitemap e structured data ausentes

- **Severidade:** P3 | **Domínio:** Drift PRD ↔ código | **App:** documentos
- **Status:** CONFIRMADO
- **Evidência:** `.docs/Claude.md` §4.7, "Funcionalidades específicas"
- **Trecho:**
  ```
  - **SEO rico** — sitemap automático, structured data, OG tags.
  ```
- **Encontrado:** OG tags ✅ (`openGraph` presente em `apps/documentos/src/app/layout.tsx`, `page.tsx`, `[slug]/page.tsx`, `editais/[slug]/page.tsx`). **Sitemap ausente** (`find apps/documentos/src -name "sitemap*"` → 0). **Structured data ausente** (`grep -rn "JsonLd\|application/ld+json\|schema.org" apps/documentos/src` → 0). Também não há `robots.ts`.
- **Impacto:** O portal público de editais — a porta de entrada do público externo — não é indexável de forma controlada. Baixo impacto operacional, mas é o único app com objetivo de alcance público.
- **Correção sugerida:** `app/sitemap.ts` + `app/robots.ts` (nativos do Next 15, ~40 linhas) e JSON-LD `Article`/`GovernmentService` na página de edital.

---

### [NEG-012] O pipeline de vídeo da Plataforma (Bunny.net Stream) não existe — o instrutor cola uma URL na mão

- **Severidade:** P2 | **Domínio:** Ausência de entregável | **App:** plataforma
- **Status:** CONFIRMADO
- **Evidência:** `BRAIN.md:53`
- **Trecho:**
  ```
  - **Vídeos (Plataforma):** Bunny.net Stream (HLS adaptativo)
  ```
  E `.docs/Claude.md` §4.3, "Funcionalidades básicas" da Plataforma: _"Upload de vídeo com transcodificação automática via Bunny Stream."_
- **Esperado:** Upload de vídeo pela tela do instrutor, transcodificação e entrega HLS pela Bunny.
- **Encontrado:** **Zero integração com a Bunny.** O campo `plataforma.lessons.video_url` (`0019_shocking_wrecking_crew.sql:71`) é preenchido por um campo de texto que o instrutor digita — `apps/plataforma/src/components/lesson-form.tsx:259-261`:
  ```tsx
  <FormField label="URL do vídeo" error={errors.videoUrl} required>
    <Input
      value={videoUrl}
  ```
  O player **suporta** HLS (`apps/plataforma/src/components/lesson-player.tsx:4,84-88`, com `hls.js` carregado sob demanda e fallback nativo no Safari/iOS) ✅ — então uma URL da Bunny colada à mão funcionaria. O que não existe é o outro lado: nenhum cliente de API, nenhum upload, nenhuma transcodificação.
- **Como procurei (exaustivo):** `grep -rniE "bunny|\.m3u8"` em `apps/plataforma/src`, `packages/*/src` → só referências a `hls.js` no player; `grep -rn "BUNNY|bunny" .env.example packages/config/src/env.ts` → **0 variáveis de ambiente**; nenhuma dependência de SDK Bunny em nenhum `package.json`.
- **Impacto:** A Plataforma é um LMS de vídeo e não tem por onde receber vídeo. O curso piloto (BRAIN §6.3: _"Curso piloto já pronto"_) depende de alguém hospedar o arquivo fora do ecossistema e colar o link — sem controle de acesso (a URL colada não é assinada, então quem tiver o link assiste sem matrícula), sem transcodificação adaptativa e sem a conta Bunny que o orçamento do BRAIN §2 já prevê ("Bunny.net $5-15").
- **Correção sugerida:** Escrever o prompt que falta (upload → Bunny Stream API → `video_url` com o playback ID, e URL assinada na leitura), ou emitir PATCH movendo a Bunny para v2+ e assumindo explicitamente que o vídeo é hospedado fora com link público.

---

## Itens verificados como PRESENTES (contra-prova)

Para calibrar: o escopo v1 do BRAIN §8 foi conferido item a item. O que **existe** e foi confirmado em código:

| Entregável v1 (BRAIN §8)                            | Evidência                                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| OCR de notas fiscais                                | `packages/ai/src/financeiro/ocr.ts` + `apps/financeiro/src/actions/ocr.ts` (fiado em P-3.8c) |
| Conciliação bancária OFX/CSV                        | `apps/financeiro/src/actions/conciliation.ts`, `import.ts`, `lib/import-parsers.ts`          |
| Impersonação auditada                               | `packages/auth/src/impersonation.ts` + `ImpersonationBanner` no layout do Admin              |
| IA: scoring / versão compacta / triagem             | `packages/ai/src/projects/scoring.ts`, `compact-version.ts`                                  |
| Templates de email editáveis                        | `admin.email_templates` + `packages/db/src/email-templates.ts` (P-1.10b/c)                   |
| MFA TOTP bloqueante                                 | `apps/intranet/src/actions/mfa.ts`, rotas `/mfa/enroll`, `/mfa/challenge`                    |
| Modo foco com pomodoro                              | `apps/tarefas/src/components/focus-mode.tsx:40` (`usePomodoro`)                              |
| Time tracking                                       | `apps/tarefas/src/actions/time-tracking.ts` + `tarefas.time_entries`                         |
| Atalhos de teclado (Cmd+K)                          | `apps/tarefas/src/components/command-menu.tsx:35`                                            |
| Fóruns de discussão (Plataforma)                    | `apps/plataforma/src/actions/discussions.ts` + `plataforma.discussions`                      |
| Quizzes / certificado com hash / notas em timestamp | `plataforma.quizzes`, `certificates`, `notes` + P-6.14 (verificação pública)                 |
| Relatório mensal PDF+XLSX+ZIP                       | `apps/financeiro/src/actions/reports.ts` (`@react-pdf/renderer`, `exceljs`, `archiver`)      |
| PWA da Rádio com background play                    | `apps/radio/src/app/manifest.ts` + `apps/radio/public/sw.js` + registro em `player.tsx:104`  |
| Supabase Realtime ("tocando agora")                 | `apps/radio/src/app/api/stream/route.ts:83-90` (`supabase.channel("now-playing")`)           |
| LGPD "Meus Dados" em cada app                       | 9/9 apps têm `**/meus-dados/page.tsx`                                                        |
| Anonimização LGPD                                   | `packages/db/src/anonymization.ts` (`anonymizeUser`)                                         |
| Consentimento granular                              | `public.consents` + `packages/db/src/consents.ts`                                            |
| Briefing diário                                     | `packages/jobs/src/crons/briefing.ts`                                                        |
| Busca unificada cross-app                           | `intranet` — migrations `0039_intranet_global_search`, `0079_..._precisao`                   |

E o que corretamente **não existe**, por ter sido removido da v1 (BRAIN §8 "Removido"/"Descartado"): doações Pix, busca semântica em Plataforma/Documentos, transcrição Whisper, recomendações, modo offline (exceto PWA da rádio), AzuraCast/Icecast, Open Finance, audit replay, DJs/podcasts/pedidos musicais, smart locks, SMS/push/Google OAuth, operações em lote de usuários, workspaces customizáveis, colunas customizáveis, checklist de inventário no check-in. ✅ Nenhum vestígio indevido encontrado.

# Runbook — PACOTE 5 (Prontidão de produção / P-9.5)

> Complementa `AUDIT/04-BACKLOG-CORRECAO.md`. Esta sessão implementou tudo que é
> código/repositório; o que resta é provisionamento real de contas externas
> (Vercel, Sentry, Upstash, Better Stack, Cloudflare, Inngest, GitHub) — sem
> credenciais para essas contas, esses passos precisam ser executados por
> Filipe. Cada seção abaixo tem exatamente o que fazer e onde.

## O que já está pronto no código

- **Security headers** — `packages/config/src/next.ts` (`createNextConfig`) envia
  `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Strict-Transport-Security` e uma `Content-Security-Policy-Report-Only` em
  todos os 9 apps, sem precisar de nenhuma variável de ambiente. Verificado com
  `next build && next start` real (ver seção "Como verificar" abaixo).
- **Sentry (SDK)** — `@sentry/nextjs` instalado nos 9 apps (catálogo pnpm),
  `src/instrumentation.ts` + `src/instrumentation-client.ts` em cada um,
  `next.config.ts` envolvido em `withSentryConfig`, e os 23 `error.tsx`/
  `global-error.tsx` agora chamam `Sentry.captureException(error)`. Sem
  `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`, o SDK desliga sozinho — dev/CI não
  quebram. **Falta**: criar os 9 projetos Sentry e preencher os DSNs (seção
  "Sentry" abaixo).
- **Rate limiting** — `packages/auth/src/rate-limit.ts` (`@upstash/ratelimit`).
  Aplicado em 3 pontos concretos:
  - `apps/radio/src/app/api/heartbeat/route.ts` — 60 req/5min por IP
  - `apps/intranet/src/actions/invitations.ts::acceptInvitation` — 10/10min por token de convite
  - `apps/projetos/src/actions/projects.ts::submitProject` — 10/hora por ator
    Sem `UPSTASH_REDIS_REST_URL`/`TOKEN`, cai num limitador em memória por
    instância (funciona em dev, **não protege de verdade em produção
    serverless** — ver seção "Upstash"). Login/MFA não passam por aqui de
    propósito: são chamadas diretas ao Supabase Auth do browser
    (`apps/intranet/src/app/(auth)/login/components/login-form.tsx`), e o
    Supabase já aplica rate limit próprio nesse caminho (`over_email_send_rate_limit`,
    já tratado na UI) — configurável em Supabase Dashboard → Authentication →
    Rate Limits (seção "Supabase" abaixo).
- **`.github/workflows/deploy.yml`** — dispara depois que o workflow `CI`
  termina com sucesso na `main` (`workflow_run`), um job por app (matriz),
  via Vercel CLI (`vercel pull` → `build` → `deploy --prebuilt --prod`).
  **Falta**: os 9 projetos Vercel + secrets no GitHub (seção "Vercel" +
  "GitHub Actions secrets").
- **`.env.example`** — criado em cada um dos 9 `apps/*/` com só as variáveis
  que aquele app efetivamente lê (nenhum app sem uso de service role recebe a
  chave). `.env.example` da raiz ganhou a seção `SEED_*` para o seed de
  produção.
- **Seed de produção** — `packages/db/src/seed/producao.ts`
  (`seedChartOfAccounts`, `seedSuperAdmins`, `seedDesignations`), agora parte
  de `pnpm --filter @hebron/db db:seed` junto com o que já existia
  (`seedProjetosChecklistTemplate`, `seedEmailTemplates`,
  `seedFlatsCleaningTemplates` — este último só estava com script próprio,
  não rodava no `db:seed` principal; agora roda). Já estavam prontos por
  migration, nada a fazer: 6 workspaces de tarefas (`0031_tarefas.sql`), 2
  unidades de flat (`0021_flats.sql`), 8 papéis (enum `role`). **Identidades
  reais (2 super_admins, gestor/autorizador do financeiro, gestor de flats)
  não são inventadas em código** — o seed lê `SEED_SUPER_ADMIN_1_EMAIL` etc.
  (ver `.env.example` da raiz) e pula com aviso se ausentes.

## Como verificar o que já está pronto (sem depender de infra externa)

```bash
# Security headers — build real + servidor real + curl
pnpm --filter @hebron/admin exec next build
pnpm --filter @hebron/admin exec next start --port 3900 &
curl -sI http://localhost:3900/   # deve trazer os 5 headers

# Rate limit — testes determinísticos (limitador em memória, sem rede)
pnpm --filter @hebron/auth test -- rate-limit

# Seed (caminho "skip" — sem tocar o banco)
pnpm --filter @hebron/db test -- seed-producao

# Lint + typecheck do monorepo inteiro
pnpm turbo lint typecheck
```

---

## Passo a passo — provisionamento real

### 1. Vercel

Para cada um dos 9 apps (`admin`, `documentos`, `financeiro`, `flats`,
`intranet`, `plataforma`, `projetos`, `radio`, `tarefas`):

1. Criar um projeto Vercel apontando para este repositório Git.
2. **Settings → General → Root Directory** = `apps/<nome-do-app>`.
3. **Settings → General → "Include source files outside of the Root
   Directory in the Build Step"** = ativado (obrigatório em monorepo pnpm —
   sem isso o build não enxerga `packages/*`).
4. **Settings → Environment Variables** — colar o conteúdo de
   `apps/<app>/.env.example` já preenchido com valores reais de produção
   (Production environment).
5. **Settings → Domains** — adicionar o subdomínio do app (ver tabela de
   subdomínios em `BRAIN.md` §3).
6. Anotar o **Project ID** (Settings → General → Project ID) — vai para o
   secret `VERCEL_PROJECT_ID_<APP>` no GitHub (seção 8).
7. **Settings → Git → Deploy Hooks / Ignored Build Step** — como o deploy
   passa a ser feito pelo GitHub Actions (`vercel deploy --prebuilt`), pode
   desativar o deploy automático do próprio Vercel neste projeto (Settings →
   Git → "Ignore Build Step" com um comando que sempre retorna `exit 0` false,
   ou desconectar o auto-deploy do branch `main`), para não deployar duas
   vezes o mesmo commit.

O **Org ID** é o mesmo para os 9 projetos (Vercel → Account Settings → your
team → Project ID/Team ID na URL, ou `vercel teams ls` via CLI).

### 2. GitHub Actions — secrets

Repository → Settings → Secrets and variables → Actions, adicionar:

- `VERCEL_TOKEN` — Vercel → Account Settings → Tokens → criar um com escopo
  no time correto.
- `VERCEL_ORG_ID` — o Org/Team ID do passo 1.
- `VERCEL_PROJECT_ID_ADMIN`, `VERCEL_PROJECT_ID_DOCUMENTOS`,
  `VERCEL_PROJECT_ID_FINANCEIRO`, `VERCEL_PROJECT_ID_FLATS`,
  `VERCEL_PROJECT_ID_INTRANET`, `VERCEL_PROJECT_ID_PLATAFORMA`,
  `VERCEL_PROJECT_ID_PROJETOS`, `VERCEL_PROJECT_ID_RADIO`,
  `VERCEL_PROJECT_ID_TAREFAS` — um Project ID por app (passo 1.6).

Depois disso, todo merge na `main` que passar no workflow `CI` deploya os 9
apps automaticamente.

### 3. Cloudflare DNS

Para cada subdomínio (`app`, `admin`, `projetos`, `plataforma`, `radio`,
`financeiro`, `docs`, `flats`, `tarefas` — ver tabela exata em `BRAIN.md` §3),
criar um registro CNAME apontando para `cname.vercel-dns.com` (Vercel indica o
valor exato na tela de Domains de cada projeto, passo 1.5) — proxy Cloudflare
(nuvem laranja) pode ficar desligado inicialmente para o certificado da Vercel
emitir sem conflito, e ligado depois se for usar WAF/cache.

### 4. Supabase (produção)

1. Confirmar/criar o projeto Supabase de produção (separado do de
   desenvolvimento).
2. Aplicar as migrations: `DATABASE_URL=<prod> pnpm --filter @hebron/db
db:migrate`.
3. **pg_cron de partições (P-0.7)** — verificar que a extensão `pg_cron` está
   ativa (Supabase Dashboard → Database → Extensions) e que o job de criação
   de partição futura de `admin.audit_log` está agendado (`SELECT * FROM
cron.job;` no SQL Editor). Critério de aceite original: um INSERT em
   `admin.audit_log` datado num mês futuro precisa funcionar sem erro de
   partição ausente — testar manualmente após aplicar as migrations.
4. **Supabase Auth → Rate Limits** — revisar/ajustar os limites nativos de
   login por senha, magic link e verificação MFA (é o que protege
   login/cadastro por senha, já que esse fluxo é client-side direto ao
   Supabase — ver seção "Rate limiting" acima).
5. Rodar o seed: `SUPABASE_URL=<prod> SUPABASE_SERVICE_ROLE_KEY=<prod>
DATABASE_URL=<prod> SEED_SUPER_ADMIN_1_EMAIL=... SEED_SUPER_ADMIN_1_NAME=...
SEED_SUPER_ADMIN_2_EMAIL=... SEED_SUPER_ADMIN_2_NAME=... pnpm --filter
@hebron/db db:seed`. Rodar de novo mais tarde com
   `SEED_FINANCEIRO_GESTOR_EMAIL`/`SEED_FINANCEIRO_AUTORIZADOR_EMAIL`/
   `SEED_FLATS_GESTOR_EMAIL` assim que as pessoas já tiverem conta (convite
   aceito) — designação pressupõe usuário existente.
6. **P-9.0 (migração do legado)** — pré-condição declarada em `PROMPTS.md`
   para este mesmo prompt (P-9.5) e listada como item pendente no PACOTE 7 do
   backlog. Fora do escopo desta sessão (ver `AUDIT/04-BACKLOG-CORRECAO.md`,
   PACOTE 7).

### 5. Sentry

1. Criar uma organização (se ainda não existir) e 9 projetos, um por app
   (Platform: Next.js).
2. Para cada projeto, copiar o DSN em **Settings → Client Keys (DSN)** e
   colar em `SENTRY_DSN` **e** `NEXT_PUBLIC_SENTRY_DSN` do respectivo app na
   Vercel (são o mesmo valor).
3. Opcional (upload de source maps, recomendado): criar um **Auth Token**
   (Settings → Auth Tokens, escopo `project:releases`) e preencher
   `SENTRY_ORG`, `SENTRY_PROJECT` (slug do projeto — já vem certo em cada
   `.env.example`) e `SENTRY_AUTH_TOKEN` em cada app na Vercel. Sem isso o
   Sentry ainda captura erros, só com stack trace minificado.
4. **Verificação** (critério de aceite original — "teste com erro
   proposital"): depois do deploy, abrir cada app em produção e forçar um
   erro (ex.: uma rota inexistente que dispare o `error.tsx`, ou um botão de
   teste temporário) e confirmar que aparece no dashboard do Sentry
   correspondente. Repetir para os 9.

### 6. Upstash (rate limiting real)

1. Criar um banco Redis (Upstash Console → Create Database, região próxima
   da Vercel/Supabase).
2. Copiar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` (REST API,
   não a URL do protocolo Redis).
3. Colar nas variáveis de ambiente da Vercel dos 3 apps que têm rate limit
   real: `radio`, `intranet`, `projetos` (ver `.env.example` de cada um).
4. **Verificação**: `curl` repetido a `/api/heartbeat` (radio) mais de 60
   vezes em 5 minutos deve começar a devolver 429.

### 7. Better Stack (uptime)

Criar 9 monitores HTTP, um por subdomínio de produção, checando o endpoint
raiz (`/`) de cada app a cada 1–5 min. Nenhuma mudança de código necessária.

### 8. Inngest

1. Criar (ou confirmar) o app de produção no Inngest Cloud.
2. Copiar `INNGEST_SIGNING_KEY` e `INNGEST_EVENT_KEY` para as variáveis de
   ambiente do app **intranet** na Vercel (único app com a rota
   `/api/inngest` — ver `apps/intranet/.env.example`). Sem isso o Inngest
   roda em modo dev mesmo em produção.
3. Depois do primeiro deploy da intranet, no Inngest Cloud → Apps, sincronizar
   (Inngest detecta a rota `/api/inngest` automaticamente) e conferir que os
   16 crons abaixo aparecem registrados (catálogo completo de
   `packages/jobs/src/crons/*.ts`, verificado nesta sessão):

   | Função                                | Agenda          |
   | ------------------------------------- | --------------- |
   | `admin-ensure-monthly-meetings`       | dia 1, 06:00    |
   | `documentos-edital-closing-reminders` | diário, 08:00   |
   | `financeiro-lote-semanal`             | segundas, 08:00 |
   | `financeiro-vencimento-proximo`       | diário, 08:00   |
   | `financeiro-relatorio-mensal`         | dia 1, 08:00    |
   | `projetos-report-reminders`           | diário, 08:00   |
   | `projetos-evaluation-reminders`       | diário, 08:00   |
   | `projetos-homologacao-auto-approve`   | diário, 03:00   |
   | `projetos-inadimplencia`              | diário, 05:00   |
   | `intranet-kpi-snapshot`               | a cada hora     |
   | `intranet-briefing`                   | diário, 07:00   |
   | `tarefas-recorrencia`                 | diário, 06:00   |
   | `tarefas-prazos`                      | diário, 07:00   |
   | `flats-checkin-reminder`              | diário, 08:00   |
   | `flats-checkout-reminder`             | diário, 06:00   |
   | `radio-audiencia-snapshot`            | diário, 01:00   |

### 9. SSO entre os 9 subdomínios

Depois que todos os 9 apps estiverem no ar com domínio final
(`*.hebronaseec.com.br`), logar em `app.hebronaseec.com.br/login` (login
canônico) e confirmar que navegar para os outros 8 subdomínios chega
autenticado (cookie de sessão em `.hebronaseec.com.br`, já implementado desde
o PACOTE 3 desta auditoria — `packages/auth/src/app-middleware.ts`). Isso só
é testável com os domínios reais no ar, não localmente.

---

## Checklist final (critérios de aceite originais do PACOTE 5)

- [x] Os 9 apps enviam o conjunto completo de security headers — verificado
      nesta sessão com `next build`+`next start`+`curl` real.
- [ ] Sentry captura erro em todos os 9 apps — SDK pronto no código; falta
      criar os projetos e testar em produção (seção 5).
- [ ] `/api/heartbeat` recusa acima do limite configurado — lógica pronta e
      testada (limitador em memória); falta Upstash real para proteção entre
      instâncias serverless (seção 6).
- [x] Cada app tem `.env.example` só com as variáveis que ele lê; nenhum app
      sem uso de service role recebe a chave.
- [ ] `INNGEST_SIGNING_KEY` configurada em produção — ação manual (seção 8).
- [ ] Todos os crons do catálogo registrados em produção, verificados 1 a 1 —
      lista completa acima (seção 8), verificação manual pós-deploy.
- [ ] pg_cron de partições ativo; SSO verificado entre os 9 subdomínios —
      ação manual (seções 4 e 9).
- [ ] Demais critérios originais de P-9.5 (9 apps deployados, deploy
      automático em merge, Better Stack, migration de produção aplicada,
      P-9.0 migração do legado) — deploy workflow pronto (`deploy.yml`);
      restante depende de infraestrutura real (seções 1–4, 7) e do PACOTE 7
      (P-9.0, fora do escopo desta sessão).

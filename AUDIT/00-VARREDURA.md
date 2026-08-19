# 00 — VARREDURA MECÂNICA (FASE 0)

> Auditoria final pré-produção · 2026-08-19 · read-only
> Escopo varrido: `apps/*/src`, `packages/*/src`, `packages/db/src/migrations`, raiz do monorepo.
> Ferramenta: ripgrep (via Grep) + scripts Python ad-hoc (parser de migrations, cruzamento TS↔SQL).

## Inventário base

| Item                     | Valor                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Apps                     | 9 (admin, projetos, plataforma, radio, financeiro, intranet, documentos, flats, tarefas) |
| Packages                 | 10 (ui, db, auth, email, validators, ai, config, types, integrations, jobs)              |
| Migrations SQL           | 92 arquivos (`0000_initial` → `0083_plataforma_arquivamento_funcoes`)                    |
| Tabelas criadas          | 102 (excluídas partições `admin.audit_log_*`)                                            |
| Policies RLS vivas       | 314 (após aplicar todos os `DROP POLICY`)                                                |
| Páginas (`page.tsx`)     | 114                                                                                      |
| Arquivos de actions      | 82                                                                                       |
| Route handlers (`/api`)  | 3 (`intranet/api/inngest`, `radio/api/heartbeat`, `radio/api/stream`)                    |
| Última sessão registrada | S-256 — P-6.19 (Plataforma, Fase 6)                                                      |

---

## 1. `TODO|FIXME|HACK|XXX|WIP`

**Resultado: 4 hits, todos DESCARTADOS.**

| Hit                                                  | Destino                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| `apps/tarefas/src/__tests__/integrations.test.ts:48` | Descartado — palavra portuguesa "TODO super_admin", não marcador |
| `packages/jobs/src/crons/radio-stats.ts:24,28`       | Descartado — "TODO o conteúdo" / "TODOS os", português           |
| `packages/jobs/src/__tests__/radio-stats.test.ts:5`  | Descartado — "TODOS os heartbeats", português                    |

Nenhum marcador de trabalho inacabado real no código. ✅

## 2. `@ts-ignore | @ts-expect-error | as any | : any`

**Resultado: 25 hits, todos em `__tests__/`. Zero em código de produção. DESCARTADOS.**

Padrão dominante: `roles: roles as any` em helpers de mock de sessão de teste (tarefas, intranet, financeiro, plataforma). Nenhum `@ts-ignore`/`@ts-expect-error` em lugar nenhum do repositório. O requisito "zero `any`" do BRAIN §9 está cumprido no código de produção. ✅

## 3. `console.log|error|warn` fora de logger estruturado

**Resultado: 34 ocorrências em 17 arquivos. Todas DESCARTADAS.**

- `console.log`: apenas em `packages/db/src/migrate.ts` (CLI de migration), `seed.ts` e `seed/tarefas-templates.ts` (CLIs de seed) — saída de terminal legítima.
- `console.error`: usado como logger estruturado com prefixo de contexto, exatamente como BRAIN §7 ("Padrão de erro S1-22") determina — ex. `packages/integrations/src/projetos-tarefas.ts`, `apps/projetos/src/actions/projects.ts` (8×), `apps/flats/src/actions/reservations.ts`.

Não há biblioteca de logging estruturado (Axiom/pino) instalada — ver achado **[D8-004]** (observabilidade do PRD ausente). O uso de `console.error` em si não é o defeito; a ausência do destino é.

## 4. `.skip( | .only( | xit( | xdescribe(`

**Resultado: 0 hits reais.** Os 5 hits do padrão foram `process.exit(0|1)` em CLIs de seed/migrate. Nenhum teste desabilitado. ✅

## 5. `mock|stub|placeholder|fake` em código de produção

**Resultado: 0 hits fora de `__tests__/`.** Todo uso de `vi.mock`, `MOCK_SIGNED_URL`, `fakeProjectId` está em arquivos de teste. ✅

Observação separada: `packages/integrations` e `packages/jobs/src/catalog.ts` mantêm _stubs documentados_ por decisão explícita do BRAIN §7 (função registrada em vez de implementação vazia). Isso é convenção deliberada, não código morto — mas ver **[NEG-*]** para verificar quais stubs continuam stubs depois do módulo destino ter sido construído.

## 6. `localhost|127.0.0.1|http://` hardcoded

**Resultado: 5 hits, todos DESCARTADOS.**

- `packages/auth/src/middleware.ts:73-76` — `CANONICAL_LOGIN_URL` com ternário sobre `process.env.NODE_ENV === "production"`. Trecho literal:
  ```ts
  export const CANONICAL_LOGIN_URL =
    process.env.NODE_ENV === "production"
      ? "https://app.hebronaseec.com.br/login"
      : "http://localhost:3005/login";
  ```
  Guardado por ambiente — correto.
- 3 hits em `__tests__/session-gate.test.ts` (admin, projetos, documentos) — constante de asserção de teste.
- `packages/auth/src/client.ts:24` — comentário.

Nenhuma URL de dev/preview alcançável em produção. ✅

## 7. `USING (true)` em policies SQL

**Resultado: 11 policies permissivas. Todas TRIADAS COMO LEGÍTIMAS.**

| Policy                                                | Cmd         | TO              | Justificativa                                                   |
| ----------------------------------------------------- | ----------- | --------------- | --------------------------------------------------------------- | ------ | ----------- | ------ | ------ | --------------------------------------------------------------- |
| `documentos.categories.categories_select_all`         | SELECT      | public          | Portal público de documentos (BRAIN §6.7) — taxonomia é pública |
| `documentos.tags.tags_select_all`                     | SELECT      | public          | idem                                                            |
| `documentos.views_monthly_agg.*_select_authenticated` | SELECT      | authenticated   | Agregado mensal sem PII (BRAIN §9, retenção F3-21)              |
| `plataforma.instructors.*_select_authenticated`       | SELECT      | authenticated   | BRAIN §6.3: "acesso a todos os cursos para qualquer registrado" |
| `plataforma.series.*_select_authenticated`            | SELECT      | authenticated   | idem                                                            |
| `radio.authors                                        | now_playing | playlist_tracks | playlists                                                       | series | tracks` (6) | SELECT | public | BRAIN §6.4: "Ouvir: sem cadastro" — catálogo da rádio é público |

Nenhuma policy permissiva de INSERT/UPDATE/DELETE. Nenhuma tabela com PII ou dado financeiro exposta por `USING (true)`. ✅

## 8. RLS habilitado por tabela

**Resultado: 102/102 tabelas com `ENABLE ROW LEVEL SECURITY`. Zero exceções.** ✅

Verificação: parser sobre os 92 `.sql`, comparando `CREATE TABLE <schema>.<t>` contra `ALTER TABLE <schema>.<t> ENABLE ROW LEVEL SECURITY`. Diferença = conjunto vazio.

A cobertura por **comando** (SELECT/INSERT/UPDATE/DELETE) está na matriz completa em `02-DOMINIOS/D1-autorizacao.md`.

## 9. `service_role | SERVICE_ROLE` — mapa completo

**12 pontos de uso de `SUPABASE_SERVICE_ROLE_KEY` em código de aplicação/packages.** Cada um analisado individualmente em `02-DOMINIOS/D1-autorizacao.md` §3. Resumo:

| Arquivo                                               | Uso                                  | Gate manual equivalente?                |
| ----------------------------------------------------- | ------------------------------------ | --------------------------------------- |
| `apps/documentos/src/app/[slug]/page.tsx:93`          | signed URL `hebron-docs`             | ✅ linha lida antes sob RLS             |
| `apps/documentos/src/app/editais/[slug]/page.tsx:118` | signed URL `hebron-docs`             | ✅ (verificado)                         |
| `apps/documentos/src/actions/documents.ts:52`         | upload/signed URL                    | ✅ `editorAction`                       |
| `apps/financeiro/src/actions/attachments.ts:12`       | signed URL `financeiro-recibos`      | ✅ `colaboradorAction` + leitura RLS    |
| `apps/financeiro/src/actions/reports.ts:48`           | export de relatório                  | ✅ (verificado)                         |
| `apps/admin/src/actions/users.ts:25`                  | Supabase Admin API (criar usuário)   | ✅ `superAdminAction`                   |
| `apps/intranet/src/actions/profile.ts:28`             | signed URL `perfil-avatares`         | ✅ `staffAction` + path = `ctx.actorId` |
| `apps/intranet/src/actions/invitations.ts:30`         | Admin API (convite)                  | ✅ (verificado)                         |
| `apps/intranet/src/lib/queries.ts:159`                | signed URL de avatares (lote)        | ⚠️ ver `[D1-006]`                       |
| `apps/plataforma/src/actions/uploads.ts:10`           | signed URL `plataforma-capas/anexos` | ⚠️ ver `[D1-006]`                       |
| `packages/db/src/system-actor.ts:39`                  | provisiona ator sistema (jobs)       | ✅ por desenho (BRAIN §7)               |
| `packages/auth/src/{data-export,data-deletion}.ts`    | LGPD (escreve audit + multi-schema)  | ✅ documentado                          |

Nenhum uso de service role para **ler dados de negócio** contornando RLS. O padrão dominante — ler a linha sob `withAuthenticatedContext` e usar o service role apenas para assinar o storage path já autorizado — está correto e é consistente.

## 10. `NEXT_PUBLIC_*` — inventário e justificativa

**14 variáveis distintas. Nenhuma expõe segredo.**

| Variável                                                                          | Deveria ser pública? | Motivo                                         |
| --------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                                        | ✅ sim               | endpoint público do projeto Supabase           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                                   | ✅ sim               | chave anônima — protegida por RLS, por desenho |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                                            | ✅ sim               | idem (nomenclatura nova do Supabase)           |
| `NEXT_PUBLIC_SITE_URL` / `_APP_URL`                                               | ✅ sim               | URL canônica de login (SSO)                    |
| `NEXT_PUBLIC_{PLATAFORMA,RADIO,FINANCEIRO,DOCUMENTOS,FLATS,TAREFAS,PROJETOS}_URL` | ✅ sim               | links cross-app em UI/notificações             |

Segredos reais (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `IMPERSONATION_COOKIE_SECRET`, `INNGEST_*`, `R2_*`, `DATABASE_URL`) **não** têm prefixo `NEXT_PUBLIC_` e são lidos apenas em módulos servidor. ✅

Verificação cruzada: `packages/config/src/env.ts` separa o schema `server` do `client`, e `SUPABASE_SERVICE_ROLE_KEY` está apenas no bloco server (linha 15).

## 11. Catch silencioso

**Resultado: 4 hits em código não-teste. Triados:**

| Hit                                              | Destino                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `packages/auth/src/impersonation.ts:76-77`       | Descartado — `catch { return null }` ao parsear cookie malformado; retornar "sem impersonação" é o comportamento correto |
| `apps/documentos/src/lib/session.ts:41-42`       | Descartado — `getOptionalActorId`, sessão ausente é caso normal (portal público)                                         |
| `packages/db/src/__tests__/storage.test.ts:126`  | Descartado — teste                                                                                                       |
| `packages/db/src/__tests__/consents.test.ts:236` | Descartado — teste                                                                                                       |

Um catch adicional relevante foi encontrado fora do padrão regex e **promovido a achado**: `apps/radio/src/app/api/heartbeat/route.ts:39` (`catch { return 400 }` mascara qualquer falha de banco como "trackId inválido") — ver `[D4-001]`.

## 12. Dependências não declaradas por app (deploy isolado Vercel)

**Resultado: 0 reais.** Script cruzou todo `from "..."`/`require("...")` contra `dependencies`/`devDependencies`/`peerDependencies` de cada workspace. Os 3 alarmes (`aprovado`, `pendente`, `module`, `@hebron/auth`, `@hebron/db`, `next`) foram verificados um a um e são falsos positivos de comentário ou auto-referência. ✅

## 13. `.env.example`

Existe **apenas na raiz** (2999 bytes, bem documentado, cobre todas as variáveis do ecossistema incluindo `R2_ENDPOINT`, `IMPERSONATION_COOKIE_SECRET`, `INNGEST_*`). Nenhum app tem `.env.example` próprio. Promovido a achado `[D3-003]` (P3) — os 9 projetos Vercel são configurados independentemente e não há documento por app dizendo quais variáveis aquele app exige.

---

## Hits promovidos a achado

| Origem da varredura       | Achado     | Severidade |
| ------------------------- | ---------- | ---------- |
| §3 (ausência de logger)   | `[D8-004]` | P1         |
| §9 (service role storage) | `[D1-006]` | P2         |
| §11 (catch heartbeat)     | `[D4-001]` | P2         |
| §13 (.env.example)        | `[D3-003]` | P3         |

**Todo hit da Fase 0 tem destino registrado.** Nenhum ficou pendente.

## Achados estruturais encontrados durante a Fase 0 (detalhados nos domínios)

Três fatos de peso apareceram já na varredura e estão desenvolvidos com evidência nos arquivos de domínio:

1. **8 dos 9 apps não têm `middleware.ts`** — apenas `apps/intranet`. A camada 1 das "três camadas obrigatórias" (BRAIN §3, PRD §3.3) não existe na maioria do ecossistema. → `[D1-001]`
2. **Nenhum rate limiting, nenhum security header, nenhuma observabilidade** — sem Upstash/Redis, sem Sentry, sem PostHog, `packages/config/src/next.ts` não define `headers()`. → `[D8-001]`, `[D8-002]`, `[D8-004]`
3. **P-9.5 (Deploy Final) nunca executado e P-9.0 (migração do legado) não existe como prompt** — todos os critérios de aceite de P-9.5 estão `[ ]`. → `[NEG-001]`, `[NEG-002]`

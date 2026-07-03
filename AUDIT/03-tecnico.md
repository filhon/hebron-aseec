# AUDIT/03 — Fase 3: Auditoria técnica do código (independente das specs)

**Fase:** 3 · **Data:** 2026-07-02 · **Auditor:** agente Fable 5 (read-only fora de `AUDIT/`)
**Escopo:** apps com código real (admin, documentos, financeiro, projetos, intranet) + packages (auth, db, email, ui, validators, types, ai, config). Flats/plataforma/radio/tarefas são scaffold (1 arquivo cada) e não foram avaliados.
**Método:** leitura direta de código e migrations; verificação de comportamento de biblioteca em `node_modules` quando o achado dependia de runtime (nenhum código executado, nenhum arquivo fora de `AUDIT/` alterado).

Convenção de IDs: `F3-nn`. Cross-refs para a Fase 2 usam os IDs `F2-*` de `02-codigo-SINTESE.md`.

---

## 1. Sumário dos achados

| ID    | Severidade  | Dimensão          | Achado (uma linha)                                                                                                                                                                                                                                  |
| ----- | ----------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F3-01 | **CRÍTICO** | RLS/Drizzle       | Partições de `admin.audit_log` acabam em 2026-08-01; o job que criaria as próximas não existe → mutações de admin e documentos passam a falhar; sem partição DEFAULT                                                                                |
| F3-02 | **CRÍTICO** | Drizzle/Auditoria | Enum `admin.audit_action` no banco não tem nenhum valor `projetos.*`/`project.*`/`financeiro.*` → toda gravação de auditoria desses módulos falha e é engolida por `catch` — trilha permanentemente vazia                                           |
| F3-03 | **CRÍTICO** | Auth              | Resolução de sessão feita à mão em admin/projetos/financeiro não funciona (GoTrue ignora header `cookie`) → todo gate de Server Action nesses 3 apps nega inclusive usuários logados (fail-closed)                                                  |
| F3-04 | **ALTO**    | RLS               | `invitations_select_by_token USING (true)` expõe todas as colunas de convites — inclusive o token — a qualquer papel; latente hoje, vira exposição real na migração para `authenticated`                                                            |
| F3-05 | **ALTO**    | RLS               | Nenhum `GRANT USAGE/SELECT` em nenhum schema de módulo em nenhuma migration — a migração planejada para conexão `authenticated`+JWT (decisão B da Fase 1) não tem o artefato de grants de que depende                                               |
| F3-06 | **ALTO**    | Drizzle           | Reconstrução de banco novo é impossível: 0000 duplicada faz `public.users` nascer sem FK para `auth.users`, e `0009_financeiro_rls` ordena antes de `0010_financeiro` e falha ao criar policy de tabela inexistente                                 |
| F3-07 | **ALTO**    | Drizzle           | drizzle-kit abandonado de fato: journal/snapshot só conhecem a migration 0000; as outras 14 são SQL à mão sem verificação de consistência com os schemas TS                                                                                         |
| F3-08 | **ALTO**    | Fronteiras        | Preocupações transversais reimplementadas por app: resolução de sessão ×3 (2 cópias idênticas), lib de auditoria ×4 com semânticas de erro opostas, lib de notificações ×3 — foi essa triplicação que propagou o F3-03                              |
| F3-09 | **ALTO**    | LGPD              | CPF, telefone, e-mail e rastro comportamental armazenados; zero modelagem de consentimento; nenhum caminho de eliminação — e o audit log imutável guarda PII em `diff`, tornando o direito de eliminação inexecutável como está                     |
| F3-10 | **ALTO**    | Testes            | Não existe CI (`.github/` não existe, contradizendo CLAUDE.md); financeiro tem zero testes e nem script `test`; todos os packages compartilhados (auth, db, validators, email, ui) têm zero testes                                                  |
| F3-11 | **ALTO**    | Validação         | `confirmImport` persiste as linhas que o **cliente** reenvia após o preview (adulteráveis) e nunca armazena o arquivo original (`fileUrl` recebe o nome do arquivo, placeholder admitido em comentário) — conciliação bancária sem fonte de verdade |
| F3-12 | **MÉDIO**   | Fronteiras        | `@supabase/supabase-js` em duas versões no workspace: `^2.46.0` (5 pacotes) vs `^2.106.1` (documentos) — 60 minors de distância, dois runtimes de auth no mesmo monorepo                                                                            |
| F3-13 | **MÉDIO**   | Auth              | Cookie de impersonação é JSON base64url sem assinatura e non-httpOnly — qualquer usuário forja `_impersonatedId` e polui a trilha de auditoria (não confere autoridade; verificado)                                                                 |
| F3-14 | **MÉDIO**   | RLS/Infra         | `convites/page.tsx` cria um pool postgres novo a cada render, fora do singleton — vazamento de conexões contra o pooler do Supabase                                                                                                                 |
| F3-15 | **MÉDIO**   | RLS               | `notifications_insert_service` e `audit_log_insert_service` com `WITH CHECK (true)` **sem cláusula `TO`** aplicam-se a PUBLIC (inclui `anon`) — inserção arbitrária de notificação/audit pelo canal direto (agrava o F2-F1b)                        |
| F3-16 | **BAIXO**   | Validação         | 7 server actions inline em páginas do admin usam `formData.get(...) as string` sem Zod próprio — mitigado porque delegam a safe actions com schema; `handleResend` re-valida papéis à mão                                                           |
| F3-17 | **BAIXO**   | Drizzle           | `financeiro-stubs.ts` é definição morta e duplicada de `cost_centers` (zero imports desde P-3.6)                                                                                                                                                    |
| F3-18 | **BAIXO**   | RLS               | `users_insert_service`: comentário promete "service role only", policy real é `WITH CHECK (auth.uid() = id)` (self-insert) — política e intenção divergem                                                                                           |
| F3-19 | **BAIXO**   | Validação         | Parser CSV divide por vírgula sem tratar vírgula entre aspas (já F2/S-53)                                                                                                                                                                           |
| F3-20 | **BAIXO**   | Drizzle           | Client drizzle tipado só com o schema `public` (`client.ts:3`) — queries relacionais indisponíveis para os demais schemas                                                                                                                           |
| F3-21 | **BAIXO**   | LGPD              | `documentos.views` acumula rastro de leitura (userId + viewedAt) sem política de retenção                                                                                                                                                           |

Dimensão 4 (TypeScript) não gerou achados: é o ponto mais saudável do código — ver §3.4.

---

## 2. Achados detalhados

### F3-01 — CRÍTICO · Partições do audit_log acabam em 30 dias e o job que as criaria não existe

**Evidência.**

- `packages/db/src/migrations/0002_admin.sql:64` — `admin.audit_log` é `PARTITION BY RANGE ("created_at")`.
- `0002_admin.sql:66-78` — só existem 3 partições: `2026_05`, `2026_06`, `2026_07` (limite superior `2026-08-01`). Não há partição DEFAULT.
- `0002_admin.sql:67` — comentário: _"A Inngest job (P-1.8) cria partições automaticamente mês a mês."_ Grep por `inngest` (case-insensitive) em todo o repo: **zero código** — só menções em BRAIN/PROMPTS/SESSIONS/CLAUDE.md. Também não há `pg_cron`, função `create_audit_partition`, nem partição `2026_08` em migration alguma.

**Impacto.** A partir de 2026-08-01, todo `INSERT` em `admin.audit_log` falha com "no partition of relation found for row". O efeito difere por app por causa do F3-08:

- **admin** (`apps/admin/src/lib/audit.ts:31-59` — sem try/catch) e **documentos** (`apps/documentos/src/lib/audit.ts:21-42` — sem try/catch): `logAudit` propaga → **toda mutação que audita passa a falhar** (criar usuário, convite, papel, documento, categoria…).
- **projetos/financeiro**: o catch engole (ver F3-02) — as mutações "funcionam" e a auditoria se perde.

**Recomendação (patch sugerido, não aplicado).** Antes de 2026-08-01: (a) migration imediata criando partições até o fim de 2027 **ou** partição DEFAULT como rede de segurança; (b) decisão sobre o mecanismo permanente — `pg_cron` no Supabase é o caminho de menor atrito, já que Inngest não existe no projeto. Registrar a escolha no BRAIN.

### F3-02 — CRÍTICO · Auditoria de projetos e financeiro nunca grava: valores ausentes do enum no banco, erro engolido

**Evidência.**

- Enum no banco = migrations: `0002_admin.sql:9-26` (16 valores de admin) + `0004` (`invitation.accepted`) + `0006` (11 valores de documentos). Grep por `ALTER TYPE` em `packages/db/src/migrations/`: **somente 0004 e 0006**. Nenhum valor `project.*`, `vote.*`, `evaluation.*`, `contestation.*`, `report.*`, `organization.*`, `financeiro.*` existe em migration alguma.
- Schema TS diverge do banco: `packages/db/src/schema/admin.ts:44-59` declara os 14 valores de projetos com o comentário _"added via ALTER TYPE in P-2.8 migration"_ — **essa migration não existe**.
- Financeiro nem no TS está: `apps/financeiro/src/lib/audit.ts:50` força `params.action as unknown as NewAuditLog["action"]` (idem `apps/projetos/src/lib/audit.ts:46`). São os únicos dois `as unknown as` do monorepo inteiro — o cast marca exatamente o ponto de drift.
- Ambos os wrappers engolem a falha: `catch (err) { console.error(...) }` (`apps/projetos/src/lib/audit.ts:51-53`, `apps/financeiro/src/lib/audit.ts:55-57`).

**Impacto.** Todo `logProjetosAudit`/`logFinanceiroAudit` falha no Postgres com `invalid input value for enum admin.audit_action` e vira uma linha de `console.error` que ninguém lê. A trilha de auditoria dos dois módulos com maior exigência de governança (votação, aprovação financeira dual) é **permanentemente vazia, em silêncio**. Nota de precisão: hoje o dano é mascarado pelo F3-03 (as actions nem chegam a executar); corrigir o F3-03 sem corrigir este transforma perda silenciosa em regra. A afirmação da síntese da Fase 2 ("logAudit consistente nos 4 módulos") descreve os **call sites**, não o sucesso da gravação — vale corrigir a leitura.

**Recomendação.** Migration `ALTER TYPE ... ADD VALUE IF NOT EXISTS` com a lista canônica de actions de projetos e financeiro (a lista TS de `admin.ts:44-59` + `FinanceiroAuditAction` de `financeiro/src/lib/audit.ts:10-30` é o ponto de partida); alinhar o enum TS; remover os casts; **decidir a semântica de erro** (ver F3-08) — para módulo financeiro, auditoria que falha deveria falhar a operação, não o contrário.

### F3-03 — CRÍTICO · Gate de sessão de admin/projetos/financeiro rejeita todo mundo (mecanismo não funciona)

**Evidência.**

- `apps/admin/src/lib/safe-action.ts:26-37`, `apps/projetos/src/lib/safe-action.ts:21-33` e `apps/financeiro/src/lib/safe-action.ts:21-33` (os dois últimos são cópias byte-a-byte) montam um `createClient(url, anonKey, { global: { headers: { cookie: ... } }, auth: { persistSession: false } })` e chamam `supabase.auth.getUser()`.
- GoTrue não lê sessão de cookies; o cliente não tem sessão em memória (`persistSession: false`, nunca houve `signIn`) nem header `Authorization` customizado. Verificado na biblioteca instalada: `node_modules/.pnpm/@supabase+auth-js@2.106.1/.../GoTrueClient.js:2489-2498` — sem `access_token` em memória e sem `hasCustomAuthorizationHeader`, `getUser()` retorna `AuthSessionMissingError` **sem sequer consultar o servidor**. O header `cookie` encaminhado é irrelevante para esse caminho.
- Resultado: `resolveSession()` lança "Não autenticado" para **qualquer** chamada, inclusive de super_admin logado.
- Contraste que confirma o diagnóstico: **documentos** usa `createSupabaseServerActionClient` de `@hebron/auth/server` (`apps/documentos/src/lib/safe-action.ts:3,10-21`), que parseia cookies via `@supabase/ssr` — esse caminho funciona.
- Por que ninguém percebeu: os testes mockam exatamente essa camada (`vi.mock("@supabase/supabase-js")` em `apps/admin/src/__tests__/impersonation.test.ts:63`; `vi.mock("@hebron/auth/server")` em documentos), e as mutações desses apps quase não têm caminho de UI (F2-P1, P-3.9 pendente) — o fluxo nunca foi exercitado de ponta a ponta.

**Impacto.** Fail-closed: não há exposição — há inoperância. Nenhuma Server Action gated de admin, projetos e financeiro funciona em runtime. Classifico CRÍTICO pela cláusula "lacuna que invalida trabalho futuro": o P-2.9c corretivo (decidido na Fase 2) e o P-3.9 vão fiar UI em actions que falham sempre, e cada módulo novo tende a copiar o mesmo `safe-action.ts` (o padrão já se copiou 3×).

**Recomendação.** Um único caminho: substituir a resolução manual dos 3 apps por `createSupabaseServerActionClient` do `packages/auth` (o código de documentos serve de referência) e apagar as cópias. Teste de integração sem mock da camada de sessão em pelo menos um app (ver F3-10). Verificação runtime recomendada após a correção: login real + uma action por app.

### F3-04 — ALTO · Token de convite legível por qualquer papel via RLS

**Evidência.** `packages/db/src/migrations/0002_admin.sql:213-216`:

```sql
-- Token público lido durante o fluxo de aceite (sem autenticação ainda).
CREATE POLICY "invitations_select_by_token"
  ON "admin"."invitations" FOR SELECT
  USING (true);
```

Policy `FOR SELECT` sem `TO` aplica-se a PUBLIC; `USING (true)` não restringe linha nem coluna. RLS não filtra colunas: quem puder fazer SELECT na tabela lê **email, papéis propostos e o próprio token** de todos os convites pendentes.

**Impacto.** Latente hoje por dois acidentes: o schema `admin` não está exposto no PostgREST e não há grants (F3-05), e o app fala com o banco como superuser de qualquer forma. No momento em que a decisão B (conexão `authenticated`) for implementada e o grant de USAGE/SELECT chegar, qualquer autenticado enumera convites e **aceita o convite de outra pessoa** (tomada de conta com os papéis do convidado). O nome da policy revela a intenção correta (busca por token); a implementação entrega busca de todos os tokens.

**Recomendação.** Remover a policy; o fluxo de aceite deve buscar o convite por token via canal server-side controlado (como já faz, com conexão privilegiada), nunca via RLS aberta. Se um dia precisar via API: função `SECURITY DEFINER` que recebe o token e devolve apenas o necessário.

### F3-05 — ALTO · Grants inexistentes: a migração para RLS ativa não tem chão

**Evidência.** Grep por `GRANT|REVOKE` em `packages/db/src/migrations/`: **zero ocorrências**. Os schemas `admin`, `documentos`, `projetos`, `financeiro` não têm `GRANT USAGE` para `authenticated`/`anon`, nem grants de tabela. As policies `TO authenticated` (ex.: `0010_financeiro.sql:426+`, `0009_financeiro_rls.sql:37+`) pressupõem um papel que hoje não pode nem enxergar o schema.

**Impacto.** Consequência dupla: (a) confirma que toda a RLS dos schemas de módulo é inalcançável hoje (PD-3 da Fase 2 — a conexão é superuser); (b) mais importante para o futuro: a decisão da Fase 1 (Q2, opção B — migrar leituras para `authenticated`+JWT) **não tem o artefato de grants de que depende**, e nenhum prompt pendente o cria. Sem esse degrau, a migração vai falhar no primeiro SELECT e o risco é "resolver" com `GRANT ALL` apressado.

**Recomendação.** Migration dedicada de grants por schema (USAGE + SELECT/INSERT/UPDATE/DELETE por tabela, alinhados às policies), parte do pacote da decisão B. Sem grants para `anon` em nada além do estritamente público (documentos públicos).

### F3-06 — ALTO · Banco novo não se reconstrói a partir das migrations

**Evidência.** Dois defeitos independentes:

1. **0000 duplicada com esquemas divergentes.** `0000_easy_alex_power.sql` (gerada por drizzle-kit) e `0000_initial.sql` (à mão) criam as mesmas 4 tabelas public. O runner ordena por nome (`migrate.ts:62-64`): `easy_alex_power` roda primeiro e cria `users` **sem** `REFERENCES auth.users(id) ON DELETE CASCADE` (`0000_easy_alex_power.sql:48-57`); `0000_initial` usa `CREATE TABLE IF NOT EXISTS` (`0000_initial.sql:42-50`), então a versão correta — com FK e CASCADE — **nunca é aplicada**. Banco novo nasce silenciosamente sem a amarração users↔auth.users (e órfãos possíveis se um auth.user for deletado).
2. **Ordem 0009 < 0010.** `0009_financeiro_rls.sql:37+` cria policies sobre `financeiro.transactions`/`payables`/etc., que só nascem em `0010_financeiro.sql:133+`. Em banco novo o runner aplica 0009 antes de 0010 e **aborta com erro**. (No banco real funcionou porque 0010/P-3.6 foi aplicada antes de 0009/P-3.7 existir — o registro em `public._migrations` esconde o problema. Confirma S1-04/F2-M2 no nível de código.)

**Impacto.** O conjunto de migrations não é executável do zero — nem para ambiente de staging, nem para restore de desastre, nem para os testes de RLS em banco descartável. O primeiro defeito é o pior por ser **silencioso** (o segundo pelo menos falha alto).

**Recomendação.** (a) Eliminar uma das 0000 (manter a com FK; se `easy_alex_power` sai, remover do journal e do BASELINE_IDS); (b) renumerar `0009_financeiro_rls` → pós-0010 (e.g. `0011_financeiro_rls`), com UPDATE correspondente em `public._migrations` no banco real; (c) teste de fumaça "migrations em banco efêmero" no CI (ver F3-10).

### F3-07 — ALTO · drizzle-kit abandonado: 14 de 15 migrations à mão, sem verificação de drift

**Evidência.** `packages/db/src/migrations/meta/_journal.json` tem **uma** entrada (`0000_easy_alex_power`); `meta/` só tem `0000_snapshot.json`. Todas as demais migrations são SQL manual aplicado por um runner próprio (`migrate.ts`) que ordena por nome e registra em `public._migrations` — com lista de BASELINE_IDS hardcoded (`migrate.ts:24-30`).

**Impacto.** `drizzle-kit generate`/`check` estão inutilizados: o snapshot acha que o banco tem 4 tabelas. Não existe verificação mecânica de que os schemas TS (usados pelo código para tipar queries) correspondem ao SQL aplicado — e o F3-02 é exatamente o acidente que essa verificação teria pego (enum TS com 14 valores a mais que o banco). A conferência manual desta auditoria encontrou paridade nas **tabelas/colunas** (users com phone/document_cpf/suspended_modules via `0002:177-179` ✓; notifications via 0001 ✓; documentos/projetos/financeiro ✓), mas paridade hoje não é garantia amanhã: cada migration futura à mão é uma aposta.

**Recomendação.** Decidir explicitamente: ou (a) reconciliar o drizzle-kit (regenerar snapshot a partir do estado atual e voltar a gerar migrations), ou (b) assumir SQL-first e adicionar um teste que compara schema TS ↔ banco efêmero migrado (introspecção). O estado intermediário atual — schema TS como "documentação otimista" — é o que produziu F3-02.

### F3-08 — ALTO · Transversais reimplementados por app; as cópias já divergiram

**Evidência.**

- **Sessão**: 3 implementações manuais (F3-03), sendo projetos/financeiro cópias idênticas; documentos usa o package. 4 apps, 2 mecanismos, 1 funciona.
- **Auditoria**: 4 implementações com contratos e semânticas diferentes — admin propaga erro e detecta impersonação (`admin/lib/audit.ts`), documentos propaga via SQL bruto (`documentos/lib/audit.ts:29-41`), projetos/financeiro engolem com `console.error` e cast forçado. A mesma pergunta ("falha de audit derruba a operação?") tem 2 respostas diferentes no mesmo sistema — em prejuízo justamente dos módulos financeiro/votação.
- **Notificações**: 3 libs (`admin` 127 linhas, `documentos` 236, `projetos` 772) orquestrando o mesmo `createNotification` de `packages/email`.
- Sem inversões: nenhum package importa app (verificado). O problema é só a duplicação apps-side.

**Impacto.** Não é estética: o F3-03 existe **três vezes** porque a resolução de sessão foi copiada em vez de importada; o F3-02 tem duas semânticas de falha porque cada app decidiu sozinho. Os próximos 5 módulos vão copiar de algum desses quatro — o errado, por base rate.

**Recomendação.** Promover para packages: `resolveSession`/action clients base (em `@hebron/auth`), `logAudit` único parametrizado por módulo (decidindo a semântica de erro por criticidade), e o miolo comum de notificações. É pré-requisito lógico dos prompts corretivos da Fase 4.

### F3-09 — ALTO · LGPD: dados pessoais sem consentimento modelado e sem caminho de eliminação

**Evidência.**

- Dados pessoais em banco: `public.users.phone`/`document_cpf` (`packages/db/src/schema/public.ts:42-43`), e-mail/nome; `projetos.organizations.endereco`/`telefone` (`projetos.ts:125-126`); rastro comportamental em `documentos.views` (userId + viewedAt, `documentos.ts:198-217`); convites com e-mail (`admin.invitations`).
- Consentimento: grep por `consent|lgpd|consentimento` em `apps/` e `packages/`: só UI de busca e página de auditoria (falsos positivos de copy). **Nenhuma tabela, coluna ou fluxo.** O checklist do CLAUDE.md ("LGPD compliance — consentimento granular") não tem nenhuma materialização em código.
- Eliminação: o sistema é soft-delete/imutável por princípio (correto para atos administrativos), mas não existe **nenhum** mecanismo de eliminação/anonimização de dados pessoais: `suspendUser` apenas suspende; não há action de apagar/anonimizar usuário; e o audit log **imutável e particionado** guarda PII nos diffs (`admin/actions/users.ts:75` grava email+fullName; `computeDiff` em updateUser grava before/after de phone). LGPD Art. 18 (eliminação a pedido do titular) é inexecutável sem estratégia de redação/pseudonimização.

**Impacto.** Para uma ONG com ~150 usuários o risco imediato é baixo, mas o custo de retrofit cresce com cada tabela nova. A Fase 1 já apontou LGPD como transversal sem prompt dono (achado de spec); este F3 confirma que **no código** não há nem o embrião.

**Recomendação.** Decisões antes dos próximos módulos (plataforma/EAD e flats coletarão mais PII): (a) modelo de consentimento (tabela `public.consents` granular por finalidade); (b) política de PII em audit diffs — ou não gravar campos sensíveis, ou gravar referência; (c) fluxo de anonimização de usuário (apagar PII, manter FKs); (d) retenção para `documentos.views`.

### F3-10 — ALTO · Sem CI; zonas críticas com zero testes

**Evidência.**

- `.github/` **não existe** no repo (CLAUDE.md declara "CI/CD: GitHub Actions (lint, test, typecheck)"). Lint/typecheck/testes só rodam quando alguém roda.
- Testes existentes: 11 suítes em 3 apps (admin 4, documentos 3, projetos 4) — de qualidade real (integração contra banco, RLS por papel; ver §3.8). **financeiro: zero testes e sem script `test`** no `package.json` (só admin/documentos/projetos têm). Packages `auth`, `db`, `validators`, `email`, `ui`: zero testes.
- As suítes existentes mockam a camada de sessão (`vi.mock("@supabase/supabase-js")`, `vi.mock("@hebron/auth/server")`) — precisamente a camada onde vive o F3-03.

**Impacto.** A combinação é o mecanismo de sobrevivência dos três CRÍTICOS: sem CI nada roda sistematicamente; sem testes no financeiro a governança dual depende de leitura de código; com a sessão mockada o gate quebrado passa. O "34/34 verdes" da Fase 2 mede o que os mocks permitem medir.

**Recomendação.** (a) Workflow GitHub Actions mínimo: `pnpm turbo lint typecheck test` + o teste de migrations em banco efêmero (F3-06c); (b) suíte de integração do financeiro (aprovação dual, estorno, imutabilidade — as triggers SQL já existem e merecem teste); (c) 1 teste de sessão **sem mock** por app após corrigir F3-03.

### F3-11 — ALTO · Importação bancária: dados adulteráveis pelo cliente e arquivo original descartado

**Evidência.** `apps/financeiro/src/actions/import.ts`:

- O fluxo é `parseImportFile` (servidor parseia e devolve preview) → cliente exibe → `confirmImport` recebe `rows` **do cliente** (`confirmImportSchema:168-174`) e persiste (`:196-204`). Nada garante que as linhas confirmadas são as que o servidor parseou — o cliente pode alterar valores, datas e descrições entre as duas chamadas.
- `:184` — `fileUrl: input.fileName, // URL stored after Supabase Storage upload; using fileName as placeholder` — o extrato original **nunca é armazenado**; `bank_imports.file_url` guarda só o nome.

**Impacto.** O registro de conciliação bancária não tem fonte de verdade verificável: nem o arquivo, nem garantia de correspondência entre parse e persistência. Para o módulo cuja razão de ser é integridade financeira com governança dual, é uma lacuna de desenho, não de acabamento. (Mitigação parcial: gate de `colaborador`+ — quando o F3-03 for corrigido — e audit em `confirmImport`, que hoje não grava por F3-02.)

**Recomendação.** Ou o servidor re-parseia na confirmação (cliente manda o arquivo/hash, não as linhas), ou o preview vira estado server-side (persistir `bank_import` como rascunho na 1ª chamada e confirmar na 2ª). Em ambos: upload real do arquivo para Storage e `file_url` verdadeiro.

### Achados MÉDIOS

**F3-12 — supabase-js dividido em `^2.46.0` e `^2.106.1`.** `@hebron/documentos` declara `^2.106.1`; admin, financeiro, projetos, `@hebron/auth` e `@hebron/db` declaram `^2.46.0`. Com pnpm isso resolve em dois pacotes fisicamente distintos — dois runtimes de auth com 60 minors de diferença de comportamento no mesmo SSO. Alinhar (recomendo `^2.106.x` em todos, via `pnpm.overrides` ou catalog) junto com a correção do F3-03. Drizzle (`^0.36.0`/`^0.36.4`) e zod (`^3.23.8`/`^3.24.0`) também divergem, sem consequência conhecida — alinhar por higiene.

**F3-13 — Cookie de impersonação forjável.** `packages/auth/src/impersonation.ts:24-26` — estado é JSON base64url puro, sem MAC, e non-httpOnly por design (`:5`). Verificado que nenhum código deriva **autoridade** dele (usos: anotação em `admin/lib/audit.ts:36-48`, banner, layout) — logo não é escalação. Mas qualquer usuário pode setar o cookie e fazer o audit log registrar `_impersonatedId` falso em suas próprias ações, contaminando investigações. Assinar (HMAC com secret server-side) ou mover a detecção para estado server-side.

**F3-14 — Pool por render.** `apps/admin/src/app/(dashboard)/convites/page.tsx:14-18` — `getDb()` faz `drizzle(postgres(url))` a cada render da página, ignorando o singleton de `@hebron/db/client` (cujo comentário em `client.ts:13-14` explica exatamente por que isso é ruim). Cada visita à página abre um pool novo (default 10 conexões) nunca fechado — contra o pooler do Supabase, é esgotamento de conexões em produção. Trocar pelo `db` compartilhado.

**F3-15 — INSERTs `WITH CHECK (true)` sem `TO` aplicam-se a PUBLIC.** `0000_initial.sql:202-204` (notifications) e `0002_admin.sql:197-199` (audit_log). A Fase 2 (F2-F1b) registrou como "qualquer autenticado insere"; tecnicamente é pior: sem `TO`, a policy vale para todos os papéis, inclusive `anon` — hoje inócuo pelos mesmos acidentes do F3-04/05, mas na migração B vira canal aberto de spam de notificações e poluição de audit. Corrigir para `TO service_role` (ou remover, já que os inserts vêm de conexão privilegiada).

### Achados BAIXOS

- **F3-16** — Actions inline com `formData.get(...) as string` sem Zod local: `convites/page.tsx:23-31,34-45`, `usuarios/[id]/page.tsx:21-54`, `configuracoes/page.tsx:43`, `templates-email/page.tsx:370`. Todas delegam a safe actions com schema (o gate e a validação real acontecem lá), então o risco é de robustez (null → "null"), não de segurança. `handleResend` (`convites/page.tsx:34-45+`) re-valida papéis à mão, duplicando o que o schema da action já faz.
- **F3-17** — `packages/db/src/schema/financeiro-stubs.ts`: definição morta de `cost_centers` (zero imports; `index.ts` exporta a de `financeiro.ts` desde P-3.6). Divergência mínima entre as duas (`.unique()` inline vs constraint nomeada). Apagar.
- **F3-18** — `0000_initial.sql:161-164`: comentário "service role only", policy `WITH CHECK (auth.uid() = id)` — self-insert. Inócuo (o insert real vem do trigger SECURITY DEFINER), mas política e intenção divergem; documentar ou restringir.
- **F3-19** — `import.ts:94`: `line.split(",")` quebra com vírgula entre aspas (formato comum de banco brasileiro: `"PAGTO FORNECEDOR, REF 123"`). Já registrado (S-53); reforço porque o dado é financeiro.
- **F3-20** — `packages/db/src/client.ts:3`: `drizzle(..., { schema })` só com `schema/public` — o modo relacional (`db.query.*`) não existe para admin/documentos/projetos/financeiro. Query-builder funciona (é o que os apps usam); custo é ergonomia futura. Passar o schema completo do `index.ts`.
- **F3-21** — `documentos.views` cresce sem retenção nem agregação; é dado comportamental pessoal (LGPD) e também tabela que só cresce. Definir janela (ex.: agregar por mês após N meses).

---

## 3. O que está genuinamente sólido (por dimensão)

1. **RLS como artefato SQL** — deny-by-default consistente (45 `ENABLE ROW LEVEL SECURITY` cobrindo todas as tabelas de módulo; as 4 `CREATE TABLE` a mais são partições do audit_log), policies granulares por papel com `USING`/`WITH CHECK` separados (ex.: `0010_financeiro.sql:420-515`), helpers `has_role`/`has_designation` como `SECURITY DEFINER STABLE` corretos, idempotência (`DO $$ ... EXCEPTION WHEN duplicate_object`) em todo lugar. Os `USING (true)` de documentos (categorias/tags públicas, `0005_documentos_rls.sql:20-38`) são intencionais e comentados — não são achados.
2. **Schemas por app respeitados** — cada módulo em seu schema, FKs cross-schema deliberadas (financeiro.cost_centers → projetos.projects), zero tabela de módulo em `public` além das 4 compartilhadas de propósito.
3. **`packages/auth` bem desenhado** — browser/server/middleware clients separados, cookies SSO com domínio correto, `CANONICAL_LOGIN_URL`, MFA helpers. O problema (F3-03/08) é adoção, não desenho. O middleware do intranet (`apps/intranet/src/middleware.ts`) é exemplar: `getUser()` server-side, refresh propagado, redirect canônico.
4. **TypeScript** — zero `any` em código de produção, zero `@ts-ignore`/`@ts-expect-error`, zero `eslint-disable`, zero non-null assertion em `src/` (config de lint respeitada de verdade). Os ~384 `as` restantes são majoritariamente aliases de import e narrowing de DOM em formulários. Os únicos 2 `as unknown as` do monorepo apontam para o F3-02 — concentração de cast funcionou como detector de área doente, e a área é uma só.
5. **Validação de borda** — next-safe-action + Zod em 100% das actions exportadas dos 4 apps; schemas compartilhados em `@hebron/validators` consumidos pelos forms (RHF + zodResolver). Contratos cross-app tipados via `@hebron/db/schema` e `@hebron/types`.
6. **`packages/email`** — injeção de dependência limpa (insert function), sem log de PII, erros propagados, templates React Email tipados.
7. **Imutabilidade financeira no SQL** — INSERT-only + triggers de bloqueio + estorno com dupla guarda (constatação da Fase 2 confirmada na leitura da 0010).
8. **Os testes que existem são reais** — integração contra Postgres com RLS por papel (`SET LOCAL role`/JWT claims), state machine, quórum, versionamento. O déficit (F3-10) é de **cobertura e execução**, não de qualidade.
9. **Higiene de segredos** — nenhum `.env*` versionado (só `.env.example` com placeholders); `SERVICE_ROLE_KEY` usada apenas server-side (os 2 usos em páginas públicas de documentos são o F2-D1, já registrado).

---

## 4. Padrões (leitura transversal da Fase 3)

- **PT-1 — A camada que executa não é a camada que está certa.** RLS excelente que nada avalia (conexão superuser), policies `TO authenticated` sem grants, gate de sessão que nega tudo, audit enum sem valores: em cada dupla "intenção declarada / caminho executado", o caminho executado é outro. É a versão código-puro do PD-3 da Fase 2.
- **PT-2 — Cópia local em vez de package: cada cópia apodrece sozinha.** Sessão ×3, audit ×4, notificações ×3 (F3-08). As duas falhas CRÍTICAS de runtime (F3-02, F3-03) existem em multiplicidade por causa disso.
- **PT-3 — Infra prometida em comentário, nunca criada.** Job de partições "via Inngest" (F3-01), enum "added via ALTER TYPE in P-2.8" (F3-02), "URL stored after Supabase Storage upload" (F3-11): o comentário descreve o sistema desejado; o repositório contém outro. Comentários deste projeto não são evidência — verificar sempre.
- **PT-4 — Fail-silent nos módulos mais críticos.** Onde a operação é financeira/deliberativa (projetos, financeiro), erros de auditoria são engolidos; onde é administrativa (admin, documentos), propagam. É exatamente o inverso do que a governança pede.

---

## 5. Perguntas para o Filipe (Fase 3)

1. **(F3-01, prazo 2026-08-01)** Para as partições do audit_log: prefere (a) migration já criando partições até 2027 + partição DEFAULT de segurança, com `pg_cron` mensal depois, ou (b) desparticionar a tabela até o volume justificar (150 usuários dificilmente justificam particionamento hoje)? A opção (b) simplifica o sistema; a (a) preserva o desenho original.

R. Prefiro preservar o desenho original, então, opto pela opção (a).

2. **(F3-02)** A lista de audit actions do TS (`admin.ts:44-59` + as 20 de financeiro) é a lista canônica que devo tratar como alvo da migration corretiva, ou há actions planejadas que deveriam entrar na mesma leva?

Essa é uma pergunta difícil, porque ainda há código a ser gerado e estou na metade do desenvolvimento. Se há actions planejadas, elas deverão estar nos prompts.

3. **(F3-03/08)** Confirma que o alvo é padronizar os 4 apps no `createSupabaseServerActionClient` de `@hebron/auth` (padrão documentos) e promover `resolveSession`+action clients para o package? Isso toca arquivo de todos os módulos e merece prompt corretivo dedicado.

R. Sim, esse é o alvo. Você está correto!

4. **(F3-02/08)** Semântica de erro de auditoria: em módulos de governança (financeiro, votação), falha ao gravar audit deve **abortar a operação** (recomendo) ou apenas alertar? A resposta define o wrapper único do package.

R. A falha ao gravar audit DEVE abortar a operação. Sigo a sua recomendação.

5. **(F3-09)** LGPD: quer que a Fase 4 proponha um prompt de fundação LGPD (consentimento + anonimização + política de PII em audit diffs) antes dos módulos que coletam mais PII (plataforma, flats), ou trata isso como pós-MVP consciente? Registro que o checklist do CLAUDE.md promete "consentimento granular" em todo prompt.

R. Sim, a Fase 4 deve propor um prompt de fundação LGPD.

6. **(F3-11)** Importação bancária: o arquivo original do extrato deve ser retido (Storage) por quanto tempo? Existe requisito contábil/fiscal da ONG (ex.: 5 anos) que defina isso? A resposta muda o desenho do corretivo.

R. São 5 anos, assim como todo registro contábil.

7. **(F3-07)** Migrations daqui em diante: voltar ao drizzle-kit (snapshot reconciliado) ou assumir SQL-first com teste de paridade? Preciso da decisão para redigir os prompts corretivos da Fase 4 sem ambiguidade.

R. Devemos voltar ao drizzle-kit, conforme o desenho original.

---

## 6. Observações sem severidade (preferências, registradas à parte)

- `confirmImport` faz um UPDATE por linha no auto-match (N+1); um `UPDATE ... FROM` resolveria. Irrelevante no volume atual.
- O runner de migrations poderia validar checksum dos arquivos já aplicados (detectaria edição retroativa de migration — que já aconteceu no histórico do projeto).
- `packages/config` segue stub (1 arquivo); a validação de env prometida na S-1 faria diferença exatamente nos erros de env que o F3-03 mascara.
- Os três `notifications.ts` de app têm assinaturas quase iguais com nomes diferentes (`notifyX` vs `sendX`) — se forem unificados (F3-08), padronizar nomenclatura.
- `parseOFX` ignora timezone de `DTPOSTED` (trunca para data) — comportamento provavelmente desejado, mas não documentado.

---

_Fase 3 concluída. Próxima: **FASE 4 — Auditoria dos prompts pendentes**, em sessão nova, com F1-_, F2-_ e F3-_ como entrada. Os itens com prazo (F3-01) e os pré-requisitos de correção (F3-03 antes de P-2.9c/P-3.9; F3-05 antes da decisão B) devem ser tratados como insumo prioritário dos prompts corretivos.\*

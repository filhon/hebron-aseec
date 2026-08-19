# D2 — Integridade de dados (Nível A no Financeiro, B nos demais)

## Checklist

| Item                                                                                | Status                                          |
| ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| Constraints (UNIQUE, FK, NOT NULL, CHECK) no Postgres, não só no TS/Zod             | ✅ ver §1                                       |
| Valores monetários em numeric — nunca float; arredondamento único e consistente     | ✅ ver §2                                       |
| Escritas multi-tabela em transação; check-then-act protegido por constraint ou lock | ✅ ver §3                                       |
| Imutabilidade do PRD respeitada (estorno em vez de UPDATE/DELETE)                   | ✅ ver §4 — melhor implementação do repositório |
| Soft delete onde especificado; todo `ON DELETE CASCADE` revisado                    | ⛔ `[D2-001]`                                   |
| Datas em UTC/timestamptz; campos date-only não tratados como timestamp              | ✅ ver §5                                       |
| Índices em FKs e nas colunas de filtro/ordenação das listagens principais           | ⚠️ `[D2-002]`                                   |

---

## 1. Constraints no banco

169 foreign keys declaradas. `NOT NULL` e `UNIQUE` usados de forma sistemática — amostras verificadas nas tabelas mais críticas:

- `financeiro.transaction_reversals` (`0010_financeiro.sql:317-324`): `original_transaction_id` e `reversal_transaction_id` ambos `NOT NULL UNIQUE REFERENCES ... ON DELETE RESTRICT`
- `projetos.votes` (`0007_projetos.sql:241`): `UNIQUE ("project_id", "user_id")` — impede voto duplo no banco, não só na action
- `projetos.contestations`: `UNIQUE (project_id, user_id)` + trigger `check_contestation_limit` para o teto de 2 por projeto (documentado em `0007_projetos_rls.sql:61-63`)
- `plataforma.certificates` (`0019_shocking_wrecking_crew.sql:8-9`): `UNIQUE("verification_hash")` e `UNIQUE("course_id","user_id")`
- `documentos.subscriptions` (`0005_documentos.sql:142`): `UNIQUE ("user_id", "category_id")`
- `tarefas`: `0076_tarefas_approval_unico_pendente.sql` e `0077_tarefas_recorrencia_unica_ativa.sql` adicionam índices únicos parciais para "só um pendente/ativo por vez" — regra de negócio empurrada para o banco em vez de ficar só na action. ✅

`CHECK` de domínio: presentes onde há faixa numérica (ex. `admin.feature_flags`: `CHECK ("rollout_percent" BETWEEN 0 AND 100)`). O uso é modesto porque a maior parte dos domínios fechados usa `ENUM` do Postgres, o que é equivalente ou melhor.

## 2. Valores monetários

**Nenhuma coluna monetária usa float.** Todas são `numeric(12,2)` ou `numeric(14,2)`:

```
"amount"            numeric(12,2)  NOT NULL      (payables, receivables, transactions, attachments)
"budget_total"      numeric(12,2)  NOT NULL
"initial_balance"   numeric(14,2)  NOT NULL DEFAULT 0
"planned_amount"    numeric(14,2)  NOT NULL
"total_amount"      numeric(14,2)  NOT NULL
```

Busca exaustiva por `\b(double precision|real|float[48]?)\b` nos 92 arquivos `.sql`: **zero ocorrências** (os hits de "real" são a palavra portuguesa em comentários). ✅

Do lado do TypeScript, o Drizzle devolve `numeric` como `string`, e o código faz `parseFloat` em 25 pontos do Financeiro. Verifiquei se algum resultado de aritmética float volta ao banco: **não volta**. Os dois usos de soma em JS são exclusivamente de exibição:

- `apps/financeiro/src/actions/approval.ts:126-129` — `totalAmount` alimenta `toLocaleString("pt-BR", { style: "currency" })` no corpo do e-mail do lote semanal
- `apps/financeiro/src/lib/notifications.ts:143` — idem, alerta de orçamento

As agregações que importam rodam em SQL sobre `numeric`, como em `apps/financeiro/src/lib/queries.ts:120`:

```ts
delta: sql<string>`sum(case when ${transactions.type} = 'credito' then ${transactions.amount} else -${transactions.amount} end)`,
```

E as comparações de valor na conciliação usam epsilon, nunca igualdade de float (`apps/financeiro/src/actions/conciliation.ts:133`):

```ts
const amountMatch = Math.abs(txAmount - Math.abs(rowAmount)) < 0.01;
```

✅ Tratamento correto. (A conciliação tem um desvio de _especificação_, não de tipo — ver `[D6-003]`.)

## 3. Transações e check-then-act

Toda mutação de negócio roda dentro de `withAuthenticatedContext`, que abre uma transação — verificado nas actions de todos os 9 apps. Os padrões check-then-act sensíveis estão protegidos por constraint, não por leitura otimista:

| Padrão                                 | Proteção                                                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Voto duplo                             | `UNIQUE ("project_id","user_id")` em `projetos.votes`                                                                                              |
| Estorno duplo                          | `UNIQUE` em `transaction_reversals.original_transaction_id` — o `SELECT` prévio em `transactions.ts:538-549` é só para a mensagem de erro amigável |
| Contestação duplicada / teto de 2      | `UNIQUE (project_id,user_id)` + trigger `check_contestation_limit`                                                                                 |
| Aprovação pendente duplicada (tarefas) | índice único parcial (`0076`)                                                                                                                      |
| Recorrência ativa duplicada            | índice único parcial (`0077`)                                                                                                                      |
| Double-booking de flat                 | ver `03-FLUXOS.md` §FLX-05                                                                                                                         |

O único check-then-act sem constraint que encontrei é o aceite de convite (`apps/intranet/src/actions/invitations.ts:69-88`): o `SELECT` do token e o `UPDATE ... SET acceptedAt` ficam em transações separadas, com um `createUser` no Auth entre eles. Dois requests simultâneos com o mesmo token passariam ambos pelo `SELECT`. Na prática o segundo `admin.auth.admin.createUser` falha por e-mail duplicado, então o efeito se autolimita a um erro 500. **P3, não gerei achado próprio.**

## 4. Imutabilidade — implementação exemplar

O BRAIN §9 exige "soft-delete e estornos, nunca hard delete". No Financeiro isso é imposto **no banco**, não só por convenção:

`packages/db/src/migrations/0010_financeiro.sql:305-311`:

```sql
  FOR EACH ROW EXECUTE FUNCTION financeiro.forbid_transaction_mutation();
```

(dois triggers — um para UPDATE, um para DELETE, sobre `financeiro.transactions`)

Reforçado por grant mínimo em `0014_grants_authenticated.sql:98`:

```sql
GRANT SELECT, INSERT                  ON "financeiro"."transactions"         TO authenticated;
```

— sem UPDATE nem DELETE, e sem policy para eles.

E o caminho legítimo de correção existe: `createReversal` (`apps/financeiro/src/actions/transactions.ts:526`), gateado por `superAdminAction`, cria uma transação de tipo oposto (`:554`) e a vincula pelo registro de estorno. Além disso, `payables`/`receivables` já pagos são bloqueados de cancelamento com mensagem que aponta o caminho certo (`:144`, `:399`): _"Não é possível cancelar uma conta já paga. Use o estorno de transação."_

Três camadas — trigger, grant e ausência de policy — para a mesma regra. ✅

---

### [D2-001] `ON DELETE CASCADE` de `auth.users` destrói 17 tabelas de registro institucional, contrariando a regra de imutabilidade

- **Severidade:** P1 | **Domínio:** Integridade de dados / LGPD | **App:** todos
- **Status:** CONFIRMADO
- **Evidência:** `packages/db/src/migrations/0000_initial.sql:43`
- **Trecho:**
  ```sql
  CREATE TABLE IF NOT EXISTS "public"."users" (
    "id"           uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  ```
- **Esperado:** `BRAIN.md:680` — _"**Imutabilidade:** soft-delete e estornos, nunca hard delete; audit trails em tudo. **Exceção legal:** exclusão LGPD é anonimização de PII (ver 'LGPD — fundação' acima), nunca hard delete de linha"_. E `BRAIN.md:641-642`: _"a linha, as FKs e os registros institucionais vinculados ao usuário (transações, votos, pareceres, relatórios) permanecem íntegros e auditáveis sob o pseudônimo"_.
- **Encontrado:** A cadeia existe e nunca foi cortada — busca por `DROP CONSTRAINT` sobre essa FK nos 92 arquivos: 0 resultados. Um `auth.admin.deleteUser(id)` — ou um clique em "Delete user" no painel do Supabase, que é o gesto natural de um super_admin — apaga a linha de `public.users` e, em cascata, **17 tabelas**:
  ```
  documentos.subscriptions.user_id          plataforma.progress.user_id
  intranet.briefing_preferences.user_id     plataforma.quiz_attempts.user_id
  intranet.dashboard_configs.user_id        projetos.organization_members.user_id
  plataforma.certificates.user_id           public.consents.user_id
  plataforma.discussion_posts.author_id     public.data_deletion_requests.user_id
  plataforma.enrollments.user_id            public.designations.user_id
  plataforma.notes.user_id                  public.notifications.user_id
  radio.term_acceptances.user_id            public.role_assignments.user_id
  tarefas.assignees.user_id
  ```
- **Impacto:** Três consequências concretas, em ordem de gravidade:
  1. **`public.consents` é apagada.** É exatamente o registro que prova a base legal do tratamento perante a ANPD. Apagá-lo junto com o titular destrói a evidência de conformidade — o oposto do que a LGPD exige reter.
  2. **`plataforma.certificates` é apagada.** O certificado tem hash de verificação pública (P-6.14): um QR code emitido e distribuído passa a apontar para nada, sem qualquer registro de que já existiu.
  3. **`public.role_assignments` e `public.designations` somem**, levando junto o rastro de quem tinha qual poder — enquanto `admin.audit_log.actor_id` continua apontando para um usuário que não existe mais.

  A proteção que hoje impede o desastre é **acidental**: `projetos.votes.user_id` (`0007_projetos.sql:238`) foi declarada sem cláusula `ON DELETE`, portanto `NO ACTION`, e aborta a cascata. Isso salva os diretores e conselheiros que já votaram — e **não salva** submissores, alunos, hóspedes e colaboradores, que são a maioria dos ~150 usuários.

- **Correção sugerida:** Trocar `ON DELETE CASCADE` por `ON DELETE RESTRICT` na FK `public.users → auth.users`, tornando o hard delete impossível no banco e forçando o fluxo de anonimização de P-0.13. Revisar caso a caso as 17 filhas: preferências de UI (`dashboard_configs`, `briefing_preferences`) podem manter CASCADE; registros institucionais (`certificates`, `consents`, `role_assignments`, `designations`, `enrollments`, `term_acceptances`) devem virar `RESTRICT`.

---

### [D2-002] 56 chaves estrangeiras sem índice; ~8 delas em caminhos de listagem reais

- **Severidade:** P2 | **Domínio:** Integridade/Performance | **App:** financeiro, plataforma, documentos, radio
- **Status:** CONFIRMADO
- **Evidência:** cruzamento entre as 169 FKs declaradas e todos os `CREATE INDEX` / `UNIQUE` / `PRIMARY KEY` dos 92 arquivos de migration
- **Encontrado:** 56 FKs sem índice na coluna. A grande maioria é coluna de autoria (`created_by`, `updated_by`, `approved_by`, `uploaded_by`) — raramente usada como predicado, impacto desprezível enquanto não houver hard delete. **Não vou inflar o achado com as 56.** As que estão em caminho de consulta real são:

  | Coluna sem índice                                   | Caminho afetado                                                                                     |
  | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
  | `financeiro.transactions.category_id`               | DRE e relatório mensal agrupam por categoria (`actions/reports.ts`)                                 |
  | `financeiro.payables.account_id`                    | listagem de contas a pagar filtrada por conta bancária                                              |
  | `financeiro.receivables.account_id`, `.category_id` | idem, contas a receber                                                                              |
  | `financeiro.payables.payment_schedule_id`           | join com parcelas de projeto aprovado                                                               |
  | `plataforma.progress.lesson_id`                     | `checkAndIssueCertificate` faz `inArray(progress.lessonId, outlineLessonIds)` a cada aula concluída |
  | `documentos.document_tags.tag_id`                   | listagem por tag no portal público                                                                  |
  | `radio.playlist_tracks.track_id`                    | montagem da playlist do Auto DJ                                                                     |
  | `radio.listener_heartbeats.track_id`                | agregação diária do cron `radio-stats`                                                              |

- **Contexto:** P-9.3 (S-165) criou `0059_performance_indexes.sql`, que acertou o índice de maior impacto de todos — `role_assignments (user_id, role) WHERE revoked_at IS NULL`, que serve `public.has_role()` dentro do `USING` de praticamente toda policy dos 9 schemas. Esse trabalho foi bem-feito e deliberado. O que ficou de fora foi a varredura de FKs.
- **Impacto:** Com ~150 usuários e volume atual, nenhuma dessas queries dói hoje. `plataforma.progress.lesson_id` e `radio.listener_heartbeats.track_id` são as que crescem mais rápido (uma linha por aula concluída, uma por 60s de escuta por ouvinte) e serão as primeiras a degradar.
- **Correção sugerida:** Uma migration única com os 8 índices acima. É o tipo de coisa que fica barata agora e cara depois.

---

## 5. Datas

**200 colunas `timestamptz`/`timestamp with time zone` contra 0 `timestamp without time zone`.** O único hit de `timestamp` sem timezone é `"timestamp_seconds" integer NOT NULL` (`0019_shocking_wrecking_crew.sql:97`) — o offset em segundos de uma nota de aula, um inteiro, não uma data. ✅

Campos genuinamente date-only usam `date`: `due_date`, `week_start`/`week_end`, `period_start`/`period_end`, `expected_date`, `received_date`, `birth_date`, `ministry_start_date`, `year_month`. ✅ Nenhum campo de dia sendo guardado como instante.

Caso especial verificado: os períodos de Flats usam `daterange` com semântica de `end` **inclusivo no domínio**, corrigida na leitura pelo custom type (`packages/db/src/schema/flats.ts`), conforme BRAIN §6.8 e P-7.6b. É o tratamento correto para a canonicalização exclusiva que o Postgres aplica na gravação. ✅

## 6. Observação: numeração duplicada de migrations

Seis números de migration aparecem duas ou três vezes: `0005`, `0007`, `0019`, `0020`, `0021`, `0022`. O runner (`packages/db/src/migrate.ts:104-106`) ordena por nome de arquivo:

```ts
const files = (await readdir(MIGRATIONS_DIR))
  .filter((f) => f.endsWith(".sql"))
  .sort();
```

Conferi os seis empates: em todos, a ordem alfabética coloca a criação de tabela antes da RLS que a modifica (`0005_documentos` < `0005_documentos_rls`, `0007_projetos` < `0007_projetos_rls`, `0019_financeiro_organization_budgets` < `0019_shocking_wrecking_crew`, e os três `0020_*` em ordem compatível). **Funciona — por sorte da nomenclatura, não por desenho.** O runner já carrega um mapa `ID_RENAMES` (`:41-43`) justamente porque um caso desses já quebrou antes (`0009_financeiro_rls` rodava antes de `0010_financeiro`, que criava as tabelas que ela modificava).

`0019_shocking_wrecking_crew.sql` é um arquivo auto-gerado pelo `drizzle-kit` (nome aleatório, marcadores `--> statement-breakpoint`, `ON DELETE cascade` em minúsculas) que sobreviveu ao P-0.3c, o prompt que aposentou esse caminho. Ele cria todas as tabelas de `plataforma`. Registro como P3 em `D4-incompletude.md`; não há defeito funcional, só um resíduo de um pipeline abandonado dentro do diretório que hoje é a única fonte de verdade do schema.

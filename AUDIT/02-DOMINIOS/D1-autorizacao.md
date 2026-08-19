# D1 — Autorização e multi-tenancy (Nível A — exaustivo)

## Checklist

| Item                                                                          | Status                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Toda tabela com RLS habilitado                                                | ✅ 102/102                                                         |
| Políticas cobrindo SELECT, INSERT, UPDATE e DELETE                            | ⚠️ ver §1 — lacunas majoritariamente intencionais, 1 achado        |
| Nenhuma política permissiva fora de tabelas genuinamente públicas             | ✅ 11 `USING(true)`, todas justificadas (ver `00-VARREDURA.md` §7) |
| Todo uso de service role mapeado com autorização manual equivalente           | ⚠️ 12 mapeados, 2 achados                                          |
| Toda Server Action e route handler valida sessão **e** papel no servidor      | ⛔ ver `[D1-002]`, `[D1-003]`, `[D1-004]`                          |
| Filtro de tenant/organização em toda query de listagem                        | ✅ ver §5                                                          |
| Matriz de papéis do PRD × checks reais no código                              | ✅ ver §6                                                          |
| Webhooks validam assinatura/origem                                            | ✅ com ressalva — ver §7                                           |
| Nenhum segredo acessível em código client; cada `NEXT_PUBLIC_` justificada    | ✅ ver `00-VARREDURA.md` §10                                       |
| Middleware Next.js bloqueando rota antes de renderizar (camada 1 do BRAIN §3) | ⛔ ver `[D1-001]`                                                  |

---

## 1. Matriz de cobertura RLS por comando

102 tabelas, 314 policies vivas (após aplicar todos os `DROP POLICY` na ordem das migrations). Método: parser Python sobre os 92 arquivos `.sql`, resolvendo `CREATE POLICY`/`DROP POLICY` sequencialmente e expandindo `FOR ALL` nos quatro comandos.

**Tabelas sem policy de UPDATE** (15): `admin.audit_log`, `documentos.document_versions`, `documentos.views`, `documentos.views_monthly_agg`, `financeiro.attachments`, `financeiro.batch_approval_items`, `financeiro.transaction_reversals`, `financeiro.transactions`, `plataforma.quiz_attempts`, `projetos.compact_versions`, `projetos.project_attachments`, `projetos.project_versions`, `projetos.report_attachments`, `projetos.votes`, `tarefas.workspaces`.

**Tabelas sem policy de DELETE** (25, incluindo as acima).

Isso **não é um defeito por si só** — o BRAIN §4 impõe imutabilidade ("soft-delete e estornos, nunca hard delete") e ausência de policy = DENY. Uma tabela de lançamento financeiro sem UPDATE/DELETE é exatamente o desenho correto.

O que verifiquei foi o inverso: **existe código que tenta escrever onde a policy não existe?** Cruzei todo `.update(X)` / `.delete(X)` do Drizzle em `apps/*/src` e `packages/*/src` contra a matriz, mapeando cada símbolo TS para `schema.tabela`. **Resultado: 1 único caso** — e é o `[D1-005]` abaixo. Todas as demais 15 tabelas sem UPDATE nunca recebem UPDATE do código. ✅

Também confirmei que `tarefas.workspaces` só tem SELECT — coerente com BRAIN §6.9 ("workspaces fixos") e com PATCH-011, que descartou workspaces customizáveis. ✅

---

### [D1-001] Oito dos nove apps não têm middleware — a camada 1 das "três camadas obrigatórias" não existe

- **Severidade:** P1 | **Domínio:** Autorização | **App:** admin, projetos, plataforma, radio, financeiro, documentos, flats, tarefas
- **Status:** CONFIRMADO
- **Evidência:** busca exaustiva `find apps/<app> -maxdepth 3 -name "middleware.ts" -not -path "*/node_modules/*"` nos 9 apps
- **Encontrado:**
  ```
  admin: ❌   projetos: ❌   plataforma: ❌   radio: ❌   financeiro: ❌
  intranet: ✅ apps/intranet/src/middleware.ts
  documentos: ❌   flats: ❌   tarefas: ❌
  ```
- **Esperado:** `BRAIN.md:121-125`, trecho literal:

  ```
  Três camadas obrigatórias, nunca apenas uma:

  1. **Middleware Next.js** — bloqueia rota antes de renderizar
  2. **Server Action / Route Handler gates** — valida ação específica
  3. **RLS no Postgres** — última linha de defesa
  ```

  E `PROMPTS.md:952`, que ao justificar uma decisão de UI afirma como fato consumado: _"O middleware de cada app bloqueia o acesso (defense in depth intacta)"_. E `PROMPTS.md:994`: _"RBAC real continua no middleware + RLS de cada app"_.

- **Mitigação real encontrada:** todos os 8 apps gateiam no **layout do segmento protegido**, com um helper `require*Session()` que roda no servidor antes de renderizar. Verificado um a um:
  | App | Gate |
  | --- | ---- |
  | admin | `(dashboard)/layout.tsx:19` → `await requireAdminSession()` |
  | plataforma | `(aluno)/layout.tsx:11` → `requireAlunoSession()`; `instrutor/layout.tsx:11` → `requireInstrutorSession()` |
  | flats | `(hospede)/layout.tsx:11` → `requireHospedeSession()`; `admin/layout.tsx:11` → `requireGestorSession()` |
  | tarefas | `(dashboard)/layout.tsx:11` → `requireStaffSession()` |
  | radio | `admin/layout.tsx:11` → `requireSuperAdminSession()` |
  | projetos / financeiro / documentos | `lib/session.ts` expõe `requireSubmissorSession`/`requireDiretorSession`/`requireColaboradorSession`/`requireEditorSession` |
- **Impacto:** A proteção de página **existe** e é server-side, então não há rota renderizando dado protegido para anônimo. As consequências reais da ausência do middleware são outras três, e todas são reais:
  1. **Route handlers não são cobertos por layout.** `apps/radio/src/app/api/heartbeat/route.ts` e `.../stream/route.ts` ficam sem qualquer camada acima da própria função — ver `[D8-003]`.
  2. **Refresh de token de sessão não acontece.** O padrão do `@supabase/ssr` é renovar o access token no middleware e reescrever o cookie na resposta. Sem middleware, um access token expirado só é renovado se alguma Server Action gravar cookie — em navegação puramente de leitura, o usuário é deslogado ao expirar. Para um público que acessa "~1x/mês" (BRAIN §1), isso é atrito recorrente.
  3. **O SSO cross-domínio depende do middleware da intranet.** `apps/intranet/src/middleware.ts` é quem reescreve os cookies com `domain=.hebronaseec.com.br` (`PROMPTS.md:787`). Os outros 8 apps nunca reescrevem — dependem de o usuário ter passado pela intranet primeiro.
- **Correção sugerida:** Criar um `createHebronMiddleware(config)` em `packages/auth` e montar `src/middleware.ts` nos 8 apps, com `matcher` cobrindo páginas **e** `/api`. Refresh de sessão + redirect para `CANONICAL_LOGIN_URL` + reescrita de cookie de domínio ficam num único lugar.

---

### [D1-002] `createReceiptSignedUrl` é um Server Action público sem autenticação, com service role sobre o bucket de comprovantes fiscais

- **Severidade:** P1 | **Domínio:** Autorização | **App:** financeiro
- **Status:** CONFIRMADO
- **Evidência:** `apps/financeiro/src/actions/attachments.ts:1` e `:26-37`
- **Trecho (literal, arquivo aberto nesta sessão):**

  ```ts
  "use server";
  ...
  // Exportada (função async — único jeito de exportar algo de um arquivo
  // "use server" além de safe-actions) para o OCR (actions/ocr.ts) reusar a
  // mesma geração de signed URL do bucket financeiro-recibos, em vez de
  // duplicar a leitura de SUPABASE_SERVICE_ROLE_KEY.
  export async function createReceiptSignedUrl(path: string): Promise<string> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from("financeiro-recibos")
      .createSignedUrl(path, READ_URL_EXPIRES_IN_SECONDS);

    if (error || !data) {
      throw new Error("Não foi possível gerar o link do comprovante");
    }

    return data.signedUrl;
  }
  ```

- **Esperado:** Toda superfície de servidor exposta valida sessão e papel (BRAIN §3, camada 2). O bucket `financeiro-recibos` tem controle declarado em `BRAIN.md:203`: _"super_admin/diretor/colaborador leem; super_admin/colaborador escrevem; DELETE só super_admin"_, com retenção legal de 5 anos.
- **Encontrado:** No Next.js App Router (versão instalada confirmada: **next 15.5.18**, declarada `^15.3.0`), **toda função async exportada de um arquivo `"use server"` é registrada como Server Action e recebe um endpoint invocável**. `createReceiptSignedUrl` não faz nenhuma checagem: nem `resolveSession`, nem papel, nem validação do formato do `path`. Ela vai direto ao client de service role, que **bypassa integralmente a RLS de `storage.objects`**.

  O comentário no código mostra que o autor sabia que exportar de um `"use server"` cria uma superfície ("único jeito de exportar algo de um arquivo `use server`") — mas tratou isso como limitação de módulo, não como exposição de endpoint.

  A action legítima que usa o helper, `extractNfFromAttachment` (`ocr.ts:29`), **é** gateada (`colaboradorAction`) e serve de contraste direto.

- **Impacto:** Um chamador que conheça o ID da action (derivável do manifesto de build; não é segredo criptográfico) e um storage path válido obtém uma signed URL para qualquer nota fiscal, recibo ou comprovante do Financeiro — **sem sessão nenhuma**. O caso concreto mais provável não é o atacante externo cego, e sim o **colaborador cujo papel foi revogado**: ele já viu paths legítimos enquanto tinha acesso e continua conseguindo baixá-los, porque a revogação de papel não é consultada em lugar nenhum deste caminho. O `path` também não é validado — não há sequer verificação de que ele pertence à pasta do próprio usuário.
- **Correção sugerida:** Transformar em função não exportada e mover para um módulo comum sem `"use server"` (ex.: `src/lib/storage.ts`), importado por `attachments.ts` e `ocr.ts`. Se precisar continuar exportada, envolver em `colaboradorAction` e validar que o `path` corresponde a um `financeiro.attachments.file_url` existente, lido sob RLS.

---

### [D1-003] Duas outras funções exportadas de arquivos `"use server"` criam endpoints não intencionais

- **Severidade:** P3 | **Domínio:** Autorização | **App:** flats, plataforma
- **Status:** CONFIRMADO
- **Evidência:**
  - `apps/flats/src/actions/aid.ts:1` (`"use server"`) e `:30`
    ```ts
    export async function createAidRequest(
      tx: AuthenticatedTx,
      actorId: string,
      reservationId: string,
      input: AidRequestInput,
    ): Promise<void> {
    ```
  - `apps/plataforma/src/actions/certificates.ts:1` (`"use server"`) e `:42`
    ```ts
    export async function checkAndIssueCertificate(
      tx: AuthenticatedTx,
      params: { actorId: string; courseId: string },
    ): Promise<Certificate | null> {
    ```
- **Encontrado:** Ambas recebem um `AuthenticatedTx` como primeiro argumento. Diferente de `[D1-002]`, **não são exploráveis**: um chamador remoto só consegue enviar JSON, e a primeira operação sobre `tx` (`tx.insert(...)` / `tx.execute(...)`) falha imediatamente sobre um objeto simples. Registro-as porque são a mesma causa raiz do `[D1-002]` e porque a próxima função exportada nesse padrão pode não ter a mesma sorte.
- **Impacto:** Superfície de ataque desnecessária; erro 500 não tratado se sondadas.
- **Correção sugerida:** Mover helpers internos para arquivos sem `"use server"` (`src/lib/`), como regra geral do projeto. Vale como convenção a registrar no BRAIN §4.

---

### [D1-004] `createContestation` altera o estágio de um projeto sem nenhum gate de papel na aplicação

- **Severidade:** P2 | **Domínio:** Autorização | **App:** projetos
- **Status:** CONFIRMADO
- **Evidência:** `apps/projetos/src/actions/projects.ts:788`
- **Trecho:**
  ```ts
  export const createContestation = projetosAction
    .schema(createContestationSchema)
    .action(async ({ parsedInput, ctx }) => {
  ```
  onde `projetosAction` é, literalmente, o cliente sem checagem de papel (`apps/projetos/src/lib/safe-action.ts:16`):
  ```ts
  export { baseAction as projetosAction };
  ```
  e `baseAction` (`:10-13`) só resolve a sessão:
  ```ts
  const baseAction = createSafeActionClient().use(async ({ next }) => {
    const cookieStore = await cookies();
    const { actorId, roles } = await resolveSession(cookieStore);
    return next({ ctx: { actorId, roles } });
  });
  ```
- **Esperado:** `BRAIN.md:314-317` — _"Máximo 2 contestações por projeto, cada pessoa pode contestar 1 vez"_, com contestação restrita a diretor/conselheiro (a policy `contestations_insert_reviewer` de `0007_projetos_rls.sql:77-82` codifica exatamente isso). BRAIN §3 exige gate na camada 2 além da RLS.
- **Encontrado:** Qualquer usuário autenticado — inclusive um `submissor` externo, ou um `aluno` — chega ao corpo da action. O INSERT em `projetos.contestations` é barrado pela RLS, então **não é explorável**. Mas a ação faz `getProjectOrThrow` e um `count()` antes disso, e o `UPDATE projects SET stage='votacao'` vem _depois_ do insert — dentro da mesma transação, então o rollback é correto.
- **Impacto:** Defense-in-depth reduzida a uma única camada numa mutação de governança (devolver um projeto de homologação para votação). Combinado com `[D1-001]` (sem middleware), esta operação é guardada **só pela RLS** — o oposto explícito do princípio "nunca apenas um" do BRAIN §9. Além disso, o erro que o submissor recebe é um `serverError` genérico mascarado (ver `[D4-004]`), não "acesso negado".
- **Correção sugerida:** Trocar `projetosAction` por `conselheiroDiretorAction`, que já existe em `apps/projetos/src/lib/safe-action.ts:41` e implementa exatamente esse conjunto de papéis. Mudança de uma linha.

---

### [D1-005] A anonimização LGPD faz UPDATE em `admin.audit_log`, que não tem policy de UPDATE

- **Severidade:** P2 | **Domínio:** Autorização / LGPD | **App:** fundação
- **Status:** CONFIRMADO (o UPDATE existe e a policy não; o efeito depende da conexão — ver abaixo)
- **Evidência:** `packages/db/src/anonymization.ts:138-141`
- **Trecho:**
  ```ts
  await dbHandle
    .update(auditLog)
    .set({ diff: redacted })
    .where(eq(auditLog.id, row.id));
  redactedAuditEntries++;
  ```
- **Cobertura de policy em `admin.audit_log`** (única tabela do sistema em que código escreve sem policy correspondente — resultado do cruzamento descrito em §1):
  - `audit_log_select_super_admin` — SELECT (`0003_admin_rls.sql:15-17`)
  - `audit_log_insert_service` — INSERT `TO service_role` (`0014_grants_authenticated.sql:124-126`)
  - **Nenhuma policy de UPDATE ou DELETE.** Grants: `GRANT SELECT ON "admin"."audit_log" TO authenticated` (`0014_grants_authenticated.sql:33`) — nem o grant de UPDATE existe.
- **Encontrado:** A função assina `dbHandle: typeof defaultDb = defaultDb`, onde `defaultDb` é o client de `packages/db/src/client.ts:26`, que conecta por `DATABASE_URL` (superuser). **Com o handle padrão o UPDATE funciona**, porque superuser ignora RLS e grants. O defeito é a fragilidade: no dia em que essa primitiva for chamada com um handle autenticado — que é o padrão obrigatório de todo o resto do sistema (BRAIN §3, decisão B/PATCH-004) — o UPDATE vira **no-op silencioso**: `postgres-js` não lança quando 0 linhas são afetadas, e `redactedAuditEntries` seguirá incrementando, **reportando sucesso**.
- **Impacto:** É o caminho de cumprimento do art. 18, VI da LGPD. Uma falha silenciosa aqui significa que o titular recebe confirmação de exclusão enquanto seu nome/e-mail/CPF permanece nos diffs do audit log. O contador retornado (`redactedAuditEntries`) não distingue "redigi" de "tentei redigir", então nem o teste nem o operador percebem.
- **Correção sugerida:** Ou (a) usar `.returning({ id: auditLog.id })` e falhar/alertar quando o array vier vazio, ou (b) mover a redação para uma função `SECURITY DEFINER` em SQL, coerente com o restante do desenho (a tabela é imutável por decisão, e a exceção LGPD merece ser explícita no banco, não implícita na escolha do handle).

---

### [D1-006] Signed URL emitida para qualquer path informado pelo cliente, sem verificar propriedade

- **Severidade:** P2 | **Domínio:** Autorização | **App:** plataforma, intranet
- **Status:** CONFIRMADO
- **Evidência:**
  - `apps/plataforma/src/actions/uploads.ts:56-68`
    ```ts
    export const getCourseCoverReadUrl = staffAction
      .schema(getCourseCoverReadUrlSchema)
      .action(async ({ parsedInput }) => {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.storage
          .from("plataforma-capas")
          .createSignedUrl(parsedInput.storagePath, READ_URL_EXPIRES_IN_SECONDS);
    ```
    com `getCourseCoverReadUrlSchema = z.object({ storagePath: z.string().min(1) })` (`:52-54`)
  - `apps/intranet/src/actions/profile.ts:64-76` — `getMyAvatarReadUrl`, mesmo padrão sobre `perfil-avatares`. O nome promete "My", mas o schema aceita qualquer `storagePath` (`:60-62`).
- **Encontrado:** Ambas são gateadas por papel (`staffAction`) ✅, mas nenhuma valida que o path pertence ao recurso/usuário pedido. `parsedInput.storagePath` é uma string livre repassada direto ao service role.
- **Impacto:** Contido, porque os dois buckets afetados são de baixa sensibilidade — capa de curso (BRAIN §4: "qualquer autenticado lê") e avatar de equipe interna (exibido no diretório da intranet de qualquer forma). Não há escalonamento entre buckets: o `.from("...")` é fixo em cada função. Registro como P2 e não P1 por isso.

  O contraste que mostra o padrão certo está no mesmo arquivo: `getMyAvatarUploadUrl` (`profile.ts:44-58`) **constrói** o path a partir de `ctx.actorId` em vez de aceitá-lo do cliente:

  ```ts
  const path = `${ctx.actorId}/${crypto.randomUUID()}.${extFromFileName(parsedInput.fileName)}`;
  ```

- **Correção sugerida:** Na leitura, aplicar a mesma disciplina: para o avatar, exigir `storagePath.startsWith(ctx.actorId + "/")`; para a capa, resolver o path a partir do `courseId` lido sob RLS em vez de aceitar a string.

---

## 3. Mapa completo de uso de service role

Os 12 pontos estão tabelados em `00-VARREDURA.md` §9. O padrão dominante do ecossistema — **ler a linha sob `withAuthenticatedContext` e usar o service role apenas para assinar um storage path já autorizado** — está correto e é aplicado com consistência. O exemplo canônico é `apps/documentos/src/app/[slug]/page.tsx`, onde o documento é buscado sob RLS (`:155-211`) e só então `getSignedUrl` (`:88-100`) assina o path — com o comentário `:152-154` registrando que essa página já foi o defeito oposto ("lia via client superuser e renderizava documentos `restricted` para qualquer anônimo que soubesse o slug", achado F2-D1) e foi corrigida.

Nenhum uso de service role para **ler dados de negócio** contornando RLS foi encontrado. Os desvios estão em `[D1-002]` e `[D1-006]`, ambos no eixo de storage.

## 4. `withSystemRole` — o bypass de RLS interno

**85 chamadas** em `apps/*/src` e `packages/*/src`. `packages/db/src/authenticated.ts:63-73` implementa via `RESET ROLE` / `SET LOCAL ROLE authenticated`, dentro da transação já aberta.

Classifiquei todas: **71 são escrita em `admin.audit_log` ou `public.notifications`** — tabelas cuja policy de INSERT é `TO service_role` por decisão de desenho (F3-15/S-57), então o bypass é o mecanismo previsto, não um desvio. **14 escrevem dado de negócio**, e cada uma carrega um comentário explicando qual policy contorna e por que a autorização já foi estabelecida. Amostrei as mais sensíveis:

- `apps/projetos/src/actions/voting.ts:82` — lê `votes` agregado para apurar resultado. A RLS de `votes` é super_admin-only (cédula secreta); sem o bypass, o auto-close nunca dispararia. **Retorna apenas `totalVoted`/`inFavor`, nunca identidade.** ✅ Sigilo do voto preservado.
- `apps/admin/src/actions/users.ts` (6×) — criação/suspensão/aprovação de usuário, sob `adminAction` (super_admin). `public.users` só tem policy de self-update, então o bypass é necessário. ✅
- `apps/tarefas/src/actions/approvals.ts:70` — confirma existência do aprovador escolhido; comentário registra "só confirma existência, nenhum dado de terceiro sai da action". ✅
- `apps/financeiro/src/actions/approval.ts:374` — ver ressalva em §8.

**Avaliação:** o uso é disciplinado e auditável. Não gerei achado sobre o padrão em si.

## 5. Filtro de tenant/organização

`projetos` é o único módulo com noção real de tenant (organização proponente). A separação é feita **na RLS**, não no código de aplicação — `projects_select_own_or_org` (`0007_projetos_rls.sql:40-55`):

```sql
"submitter_id" = auth.uid()
OR (
  "organization_id" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "projetos"."organization_members" om
    WHERE om.organization_id = "projetos"."projects"."organization_id"
      AND om.user_id = auth.uid()
  )
)
```

Como todas as leituras de listagem passam por `withAuthenticatedContext` (verificado em `apps/projetos/src/lib/queries.ts` — as 14 funções exportadas de leitura, linhas 101, 135, 160, 187, 277, 562, 715, 783, 926, 1170, 1199, 1233, 1275, 1311, 1407, abrem o contexto autenticado), o filtro é aplicado inclusive em agregações e relatórios. ✅ Nenhuma listagem "interna" escapando encontrada.

## 6. Matriz de papéis PRD × código

Os 8 papéis do BRAIN §3 (`super_admin`, `diretor`, `conselheiro`, `colaborador`, `submissor`, `aluno`, `hospede`, `ouvinte`) estão implementados em `packages/types/src/roles` e materializados em gates por app. Distribuição real dos 220 safe-actions do ecossistema:

| Gate                              | Nº de actions | App(s)                                                 |
| --------------------------------- | ------------- | ------------------------------------------------------ |
| `colaboradorAction`               | 32            | financeiro, tarefas                                    |
| `staffAction`                     | 32            | intranet, tarefas, plataforma                          |
| `superAdminAction`                | 29            | vários                                                 |
| `adminAction`                     | 23            | admin                                                  |
| `editorAction` / `adminDocAction` | 19            | documentos                                             |
| `diretorAction`                   | 13            | projetos, financeiro, tarefas                          |
| `<app>Action` (só autenticado)    | 47            | vários — ver ressalva `[D1-004]`                       |
| `authenticatedAction`             | 12            | documentos, intranet                                   |
| `submissorAction`                 | 5             | projetos                                               |
| `gestorAction`                    | 4             | flats                                                  |
| `boardAction`                     | 3             | intranet                                               |
| `diretorWithDesignationAction`    | 2             | financeiro                                             |
| `conselheiroDiretorAction`        | 1             | projetos                                               |
| `hospedeAction`                   | 1             | flats                                                  |
| `publicAction`                    | 1             | intranet (`acceptInvitation` — token público, correto) |

**Designações especiais** (BRAIN §3: gestor, autorizador, avaliador) estão implementadas como dimensão separada de papel, via `public.designations` lida em `resolveSession` (`packages/auth/src/server.ts:104-109`) e consumida por `diretorWithDesignationAction` (financeiro) e `gestorAction` (flats). ✅ O modelo do BRAIN foi respeitado — designação não virou papel.

**Conflito de interesse** (BRAIN §3: "Diretores/conselheiros NÃO podem submeter projetos NEM hospedar-se nos flats"): ver `[D6-002]` em `D6-drift-prd.md`.

`publicAction` também é exportado em `apps/admin/src/lib/safe-action.ts:31` mas **não tem nenhum consumidor** (`grep -rn "publicAction" apps/admin/src` → só a definição). Código morto — registrado em `D4-incompletude.md`.

## 7. Webhooks

Só existe um endpoint de webhook: `apps/intranet/src/app/api/inngest/route.ts`. Usa `serve({ client: inngest, functions })` do `inngest/next`, que valida a assinatura da requisição contra `INNGEST_SIGNING_KEY` — a variável está declarada em `.env.example`. ✅

**Ressalva:** a validação só é efetiva se `INNGEST_SIGNING_KEY` estiver setada no ambiente de produção, e isso é justamente um critério de P-9.5, que nunca rodou (`[NEG-004]`). Sem a chave, o SDK opera em modo dev. Não é achado de código; é dependência do gap de deploy.

Não há webhooks de Resend, pagamentos ou OneSignal — coerente, já que push/SMS/Pix saíram da v1 (BRAIN §8). ✅

## 8. Ressalva sobre a autorização de pagamento (governança dual)

A governança dual do BRAIN §6.5 está corretamente implementada em `apps/financeiro/src/actions/approval.ts`: `approveBatch` (`:209`) exige designação `gestor`, `authorizeBatch` (`:329`) exige designação `autorizador`, e a separação de pessoas é checada explicitamente (`:361-365`):

```ts
// Dual governance: authorizer must differ from approver
if (batch.approvedBy === ctx.actorId) {
  throw new Error(
    "O autorizador deve ser uma pessoa diferente do aprovador (governança dual)",
  );
}
```

✅ Regra inviolável respeitada.

Porém o UPDATE da autorização roda sob `withSystemRole` porque a policy `batch_approvals_update_gestor` não contempla o autorizador. O próprio código documenta (`:372-379`): _"Gate de aplicação já validou acima quem pode chegar aqui... débito de RLS registrado em SESSIONS.md/PATCH-016, não corrigido aqui (fora de escopo alterar policy)"_.

Ou seja: **na mutação financeira mais sensível do ecossistema, a camada 3 é deliberadamente contornada**. A camada 2 está sólida e a 1 não existe (`[D1-001]`). Não gero achado próprio porque a autorização manual é rigorosa e o débito está registrado, mas ele entra no backlog: a policy deveria aceitar `diretor` com designação `autorizador` para o par de colunas `authorized_by/authorized_at`.

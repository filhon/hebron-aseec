# D4 — Incompletude disfarçada (Nível B + hits da Fase 0)

## Checklist

| Item                                                                     | Status                                                    |
| ------------------------------------------------------------------------ | --------------------------------------------------------- |
| Todos os hits da Fase 0 triados com destino registrado                   | ✅ ver `00-VARREDURA.md`                                  |
| Nenhum catch silencioso mascarando falha como estado vazio               | ⚠️ `[D4-001]`                                             |
| Nenhum botão/rota sem handler; nenhum endpoint sem chamador              | ✅ ver §1 — resultado notável                             |
| Estados de loading/empty/error nas telas principais; submit com disable  | ⚠️ `[D4-002]` (loading ✅, disable ✅, error boundary ⛔) |
| Paginação em toda listagem que cresce; nenhum fetch dentro de loop (N+1) | ⛔ `[D4-003]`, `[D4-005]`                                 |

---

## 1. Código morto — resultado negativo (bom)

Script cruzou os **220 safe-actions exportados** de `apps/*/src/actions/*.ts` contra todo o código-fonte de cada app (`.ts` + `.tsx`, excluindo testes), procurando actions sem nenhum consumidor.

**Resultado: zero actions órfãs.** Nenhum endpoint sem chamador em nenhum dos 9 apps.

Isso não é acidente: a série de corretivos que atacou exatamente essa classe de defeito — P-2.8c ("Quatro actions sem porta de entrada"), P-3.9c ("Cinco actions e quatro estados que nenhuma tela alcança"), P-3.8c ("O OCR de nota fiscal que existe, funciona e ninguém chama"), P-1.16c ("Reordenação de categorias: ligar a UI ao backend, ou remover a promessa") — fechou o problema de forma completa e ele não voltou. ✅

Dois resíduos menores sobraram, ambos P3:

- `apps/admin/src/lib/safe-action.ts:31` — `export const publicAction = createSafeActionClient();` sem nenhum consumidor no app (`grep -rn "publicAction" apps/admin/src` retorna só a definição). Diferente do gêmeo da intranet, que é usado por `acceptInvitation`. É um cliente **sem autenticação** exportado e disponível para uso acidental — remover é mais seguro que manter.
- `packages/db/src/migrations/0019_shocking_wrecking_crew.sql` — arquivo auto-gerado pelo `drizzle-kit` (nome aleatório, marcadores `--> statement-breakpoint`, `ON DELETE cascade` em caixa baixa) que sobreviveu ao P-0.3c, o prompt que aposentou justamente esse caminho ("Aposentar o caminho `drizzle-kit generate/check` — remover footgun de migrations", S-171). Cria todas as 13 tabelas de `plataforma` e está aplicado em produção, então **não pode ser simplesmente apagado** — mas o nome deveria ser normalizado junto com o registro em `public._migrations`, como o runner já faz para outros casos via `ID_RENAMES` (`packages/db/src/migrate.ts:41-43`).

---

### [D4-001] O endpoint público da Rádio converte qualquer falha de banco em "trackId inválido"

- **Severidade:** P2 | **Domínio:** Incompletude | **App:** radio
- **Status:** CONFIRMADO
- **Evidência:** `apps/radio/src/app/api/heartbeat/route.ts:34-41`
- **Trecho:**
  ```ts
  try {
    await db.insert(listenerHeartbeats).values({
      sessionId: parsed.data.sessionId,
      trackId: parsed.data.trackId,
    });
  } catch {
    return NextResponse.json({ error: "trackId inválido" }, { status: 400 });
  }
  ```
- **Esperado:** BRAIN §7 ("Padrão de erro S1-22") determina que a falha seja logada de forma estruturada com contexto — `console.error("[contexto] ...")` — e nunca engolida sem sinal.
- **Encontrado:** O `catch` não recebe nem inspeciona o erro. Qualquer falha — pool esgotado, timeout do Supabase, violação de constraint, banco fora do ar — vira a mesma resposta 400 com a mensagem "trackId inválido", que descreve **apenas uma** das causas possíveis. Nada é logado.
- **Impacto:** Este é o alimentador de `radio.listener_heartbeats`, que o cron `radio-stats` agrega diariamente em `radio.listener_stats` e que abastece o KPI de audiência da Intranet (P-5.8b). Se o insert começar a falhar em produção, o sintoma visível será **"a audiência da rádio caiu para zero"** — indistinguível de ninguém estar ouvindo. Sem Sentry (`[NEG-007]`), sem log, e com o player descartando o erro silenciosamente do lado do cliente, o diagnóstico começa do zero.
- **Correção sugerida:** `catch (err) { console.error("[radio/heartbeat] insert failed:", err); return NextResponse.json({ error: "Não foi possível registrar a escuta" }, { status: 500 }); }` — 500 para falha de infraestrutura, reservando o 400 para o caso genuíno de FK inválida.

---

### [D4-002] Seis dos nove apps não têm fronteira de erro (`error.tsx`)

- **Severidade:** P2 | **Domínio:** Incompletude | **App:** admin, plataforma, radio, intranet, flats, tarefas
- **Status:** CONFIRMADO
- **Evidência:** `find apps/<app>/src/app -name "error.tsx" | -name "global-error.tsx"` nos 9 apps
- **Encontrado:**
  | App | `error.tsx` | `global-error.tsx` | `loading.tsx` | Suspense+Skeleton |
  | --- | --- | --- | --- | --- |
  | projetos | 3 | 1 | 10 | — |
  | financeiro | 2 | 1 | 12 | — |
  | documentos | 2 | 1 | 7 | — |
  | tarefas | 0 | 0 | 3 | — |
  | admin | 0 | 0 | 0 | ✅ |
  | plataforma | 0 | 0 | 0 | ✅ |
  | intranet | 0 | 0 | 0 | ✅ |
  | flats | 0 | 0 | 0 | ✅ |
  | radio | 0 | 0 | 0 | ✅ |
- **Nuance importante (para não inflar o achado):** os cinco apps sem `loading.tsx` **não** estão sem estado de carregamento — usam `<Suspense fallback={<...Skeleton/>}>` inline, que é igualmente válido no App Router. Verificado: `apps/plataforma/src/components/{course-card,certificate-list,player}-skeleton.tsx`, `apps/intranet/src/components/{announcements,dashboard}-skeleton.tsx`, `apps/admin/src/components/{audit-log,user-table,dashboard}-skeleton.tsx`, `apps/flats/src/components/{approval-queue,calendar}-skeleton.tsx`, `apps/radio/src/components/{catalog,player}-skeleton.tsx`. ✅ E `ErrorState` do design system é usado inline em 17 páginas para erros **esperados**.

  O que falta é especificamente a **fronteira de erro do React**: uma exceção não capturada dentro de um Server Component (timeout de banco, `undefined` inesperado num map) não tem onde ser interceptada e cai na tela de erro padrão do Next.js — genérica, em inglês, fora da identidade visual.

- **Impacto:** O padrão certo já existe e foi entregue em três apps pelos corretivos P-1.17b, P-2.5b e P-3.5b. Ele simplesmente não foi propagado. Combinado com `[NEG-007]` (sem Sentry), um erro de renderização em produção mostra uma tela quebrada ao usuário e não gera nenhum registro.
- **Correção sugerida:** Copiar o par `error.tsx` + `global-error.tsx` de `apps/projetos/src/app/` para os 6 apps restantes, ajustando a cópia. É trabalho mecânico de uma sessão.

---

### [D4-003] Nenhuma listagem do ecossistema tem paginação; o Financeiro carrega o razão inteiro a cada visita

- **Severidade:** P2 | **Domínio:** Incompletude/Escala | **App:** financeiro (crítico), admin, todos
- **Status:** CONFIRMADO
- **Evidência:** busca por `.offset(`, `cursor`, `page=` em todos os `apps/*/src/lib/queries.ts` → **0 resultados em todo o monorepo**
- **Trecho — `apps/financeiro/src/lib/queries.ts:211-224`:**
  ```ts
  export async function getTransactions(): Promise<Transaction[]> {
    const actorId = await getActorId();
    const { rows, reversalRows, matchedRows } = await withAuthenticatedContext(
      { actorId },
      async (tx) => {
        const rows = await tx.select().from(transactions);
        const reversalRows = await tx.select().from(transactionReversals);
  ```
  Sem `where`, sem `limit`, sem `orderBy`.
- **Encontrado:** Dez `select().from(T)` irrestritos no Financeiro. Separando os que importam dos que não:
  - **Crescem sem teto:** `transactions` (razão contábil — uma linha por lançamento, para sempre), `transactionReversals`, `payables` (`:315`), `batchApprovalItems` (`:321`, `:547`), `budgets` (`:471`), `batchApprovals` (`:546`)
  - **Naturalmente pequenas, sem problema:** `bankAccounts` (`:115` — BRAIN §6.5: "atualmente 1, expectativa de 2+"), `costCenters` (`:317`, `:488` — um por projeto aprovado), `tarefas.workspaces` (6 fixos)

  Caso relacionado: a tela de auditoria do Admin usa `.limit(500)` (`apps/admin/src/app/(dashboard)/auditoria/page.tsx:134`) — um teto rígido, sem paginação. Como `admin.audit_log` é particionado mensalmente e registra toda mutação crítica dos 9 apps, os 500 mais recentes cobrem poucos dias. BRAIN §6.1 promete _"Audit logs pesquisáveis com filtros avançados"_, e a busca não alcança nada além dessa janela.

- **Impacto:** Com ~150 usuários, o volume de hoje não dói. O que dói é o formato: um razão contábil não tem teto natural, e a tela de lançamentos é a mais usada do Financeiro. A degradação será gradual e depois súbita — a página carrega bem até o dia em que o payload estoura o limite da Server Function da Vercel. Não é risco de produção **hoje**; é risco garantido no horizonte de vida do sistema.
- **Correção sugerida:** Priorizar `getTransactions` e `getPayables`: `where` por período (padrão: mês corrente), `orderBy(desc(date))` e `limit`/`offset`. Na auditoria, trocar o teto rígido por paginação por cursor sobre `created_at`. Um `DataTable` compartilhado (`[D3-001]`) resolveria os dois de uma vez.

---

### [D4-004] As 267 mensagens de erro em português nunca chegam ao usuário — todas viram uma frase genérica em inglês

- **Severidade:** P1 | **Domínio:** Incompletude/UX | **App:** todos
- **Status:** CONFIRMADO (verificado contra o código-fonte da versão instalada)
- **Evidência:** `apps/tarefas/node_modules/next-safe-action/dist/index.mjs:1008-1014` — **versão instalada 7.10.8** (declarada `^7.9.0` nos 9 apps)
- **Trecho (literal, do pacote instalado):**
  ```js
  var createSafeActionClient = (createOpts) => {
  	const handleServerError =
  		createOpts?.handleServerError ||
  		((e) => {
  			console.error("Action error:", e.message);
  			return DEFAULT_SERVER_ERROR_MESSAGE;
  		});
  ```
  com, na linha 429 do mesmo arquivo:
  ```js
  var DEFAULT_SERVER_ERROR_MESSAGE =
    "Something went wrong while executing the operation.";
  ```
- **Encontrado:** **Nenhum dos 9 apps passa `handleServerError`.** Busca exaustiva: `grep -rn "handleServerError" apps/*/src packages/*/src` retorna 2 resultados, ambos comentários dentro de testes de `apps/tarefas/src/__tests__/`. Todos os clientes são criados como `createSafeActionClient()` sem opções — verificado nos 9 `apps/*/src/lib/safe-action.ts`.

  Enquanto isso, as actions lançam **267 erros com mensagem escrita em português**, cuidadosamente redigidos:

  ```
  "Apenas o submissor pode editar o próprio rascunho"
  "O autorizador deve ser uma pessoa diferente do aprovador (governança dual)"
  "Limite de 2 contestações por projeto atingido"
  "Submissores só podem excluir projetos em rascunho. Contate a diretoria para outros estágios."
  "Não é possível cancelar uma conta já paga. Use o estorno de transação."
  ```

  E a UI está pronta para exibi-los — ex. `apps/admin/src/components/role-assignment-panel.tsx:30-31`:

  ```ts
  if (result?.serverError) {
    setError(result.serverError);
  ```

  Só que `result.serverError` é sempre `"Something went wrong while executing the operation."`.

  O próprio projeto já havia percebido o sintoma sem diagnosticar a causa — `apps/tarefas/src/__tests__/recurrence.test.ts:416-421`:

  ```
  // apps/tarefas/src/lib/safe-action.ts não define handleServerError, então
  // o serverError aqui é sempre a mensagem genérica do next-safe-action
  // (mesma convenção documentada em time-tracking.test.ts) — a mensagem em
  // português de assertNoOtherActiveRule é a que a tela mostraria via
  // useAction, não algo que este teste consiga inspecionar diretamente.
  ```

  A última frase está incorreta: a tela **não** mostra a mensagem em português. Mostra a genérica.

- **Impacto:** É o achado com maior alcance de usuário de toda esta auditoria. Um diretor que tenta autorizar um lote que ele mesmo aprovou não lê "o autorizador deve ser uma pessoa diferente do aprovador" — lê uma frase em inglês que não explica nada. Um submissor que tenta excluir um projeto fora do rascunho idem. Contradiz frontalmente:
  - BRAIN §5: _"Microcopy revisado por humano"_, _"Não parecer IA"_
  - BRAIN §9: _"**Simplicidade:** público-alvo em transição tecnológica — interfaces simples"_
  - P-9.4 (Copy Review), cujos critérios foram marcados `[x] Tom institucional consistente em todos os apps` e `[x] Português correto, sem anglicismos desnecessários` — a revisão passou pelos `.tsx` e não alcançou o caminho de erro das actions.

  Agrava `[D1-004]`: o submissor barrado pela RLS ao tentar contestar também recebe a frase genérica, sem saber que o problema é de permissão.

- **Correção sugerida:** Definir `handleServerError` uma vez em `packages/auth` (ou `packages/config`) e usá-lo nos 9 `safe-action.ts`: repassar `e.message` para erros de negócio conhecidos e cair na genérica só para o inesperado. Uma abordagem simples e segura é uma classe `BusinessError extends Error` cuja mensagem é repassada; todo o resto vira genérico e vai para o log/Sentry.

---

### [D4-005] Duas consultas abrem uma conexão por linha (N+1) — o mesmo defeito que P-5.9e já corrigiu na Intranet

- **Severidade:** P2 | **Domínio:** Incompletude/Performance | **App:** plataforma, flats
- **Status:** CONFIRMADO
- **Evidência 1:** `apps/plataforma/src/lib/queries.ts:954-963`
- **Trecho:**
  ```ts
    return Promise.all(
      rows.map(async (certificate) => {
        const verification = await withAuthenticatedContext({ actorId }, (tx) =>
          tx.execute<{
            course_title: string;
            user_name: string | null;
          }>(
            sql`SELECT * FROM plataforma.verify_certificate(${certificate.verificationHash})`,
          ),
        );
  ```
  Cada certificado abre **uma transação nova** (`withAuthenticatedContext` faz `BEGIN` + `SET LOCAL ROLE` + injeção do claim de papel). Dez certificados = dez transações, disputando um pool de `max: 5` conexões (`packages/db/src/client.ts:22`).
- **Evidência 2:** `apps/flats/src/lib/queries.ts:372-376`
- **Trecho:**
  ```ts
        .map(async (row) => {
          const { data } = await supabase.storage
            .from("flats-documentos")
            .createSignedUrl(row.storageKey, DOCUMENT_URL_EXPIRES_IN_SECONDS);
          return data ? ([row.guestId, data.signedUrl] as const) : null;
        }),
  ```
  Uma chamada de rede ao Supabase Storage por documento.
- **Encontrado:** A correção de ambos já existe no repositório, escrita para o mesmo defeito em outro app. P-5.9e ("O diretório que abre uma conexão de rede por pessoa", S-245) produziu `resolveAvatarReadUrls` — `apps/intranet/src/lib/queries.ts:191-208` — que usa a API em lote:
  ```ts
  const { data, error } = await supabase.storage
    .from("perfil-avatares")
    .createSignedUrls(uniquePaths, AVATAR_READ_URL_EXPIRES_IN_SECONDS);
  ```
  com deduplicação de paths antes da chamada. O Flats faz exatamente o que a Intranet parou de fazer.
- **Impacto:** Bem contido hoje (poucos certificados por aluno, poucos hóspedes por tela) e por isso é P2, não P1. O de `plataforma` é o mais perigoso dos dois porque consome **conexões de banco**, não só round-trips HTTP: com o pool em 5, uma tela de certificados de um aluno veterano pode serializar e, sob concorrência, esgotar o pool para os demais.
- **Correção sugerida:** Em `plataforma`, abrir **uma** transação e chamar `verify_certificate` com `ANY(array)` ou fazer o join direto. Em `flats`, trocar por `createSignedUrls` reusando o padrão de `resolveAvatarReadUrls`.

---

## 2. Duplo envio — verificado e correto

O padrão do ecossistema é `useAction` do `next-safe-action`, cujo `status` alimenta o `disabled` do botão. Exemplo verificado ponta a ponta na Rádio (o app que menos aparecia nas buscas por `isPending`/`isExecuting`, e mesmo assim está correto):

`apps/radio/src/components/authors-admin-panel.tsx:55-71` obtém `createStatus`/`updateStatus`/`deleteStatus`, deriva `isSaving`, e passa como prop; `apps/radio/src/components/author-form.tsx:202`:

```tsx
<Button type="submit" disabled={isLoading} loading={isLoading}>
```

✅ Nenhum formulário aceita duplo envio.

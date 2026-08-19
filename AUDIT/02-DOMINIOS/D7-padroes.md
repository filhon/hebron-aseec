# D7 — Padrões e APIs (Nível C, com verificação de versão)

## Checklist

| Item                                                                               | Status                                 |
| ---------------------------------------------------------------------------------- | -------------------------------------- |
| Padrões Next 15: `params`/`searchParams` assíncronos, `@supabase/ssr` (não legado) | ✅ ver §1                              |
| Toda API de lib usada existe na versão instalada                                   | ✅ ver §2                              |
| `"use client"` apenas onde necessário; nenhum módulo com segredo em client         | ✅ ver §3                              |
| Middleware cobre páginas **e** `/api`; nenhuma API Node em edge runtime            | ✅ (onde existe) — ver §4 e `[D1-001]` |
| **Extra: o pipeline declarado (`lint` + `typecheck`) realmente passa?**            | ⛔ `[D7-001]`                          |

---

## 1. Padrões Next 15

| Verificação                                    | Resultado                                                                                                                                                                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@supabase/auth-helpers` (legado)              | **0 ocorrências** em todo o repositório ✅                                                                                                                                                                                  |
| `@supabase/ssr` como caminho único             | ✅ `packages/auth/src/{server,client,middleware}.ts`                                                                                                                                                                        |
| `params`/`searchParams` como `Promise`         | 39 arquivos usando `params: Promise<...>` ✅                                                                                                                                                                                |
| `params` síncrono (assinatura Next 14)         | **0 ocorrências** ✅                                                                                                                                                                                                        |
| `"use client"` + `use(params)` em `page.tsx`   | **0 ocorrências** — o footgun conhecido (que quebra o build) foi evitado. As 10 `page.tsx` marcadas `"use client"` (as 9 telas de `/notificacoes` + o kanban do pipeline) **não recebem `params`**, verificado uma a uma ✅ |
| `runtime = "edge"`                             | **0 ocorrências** — nenhuma API Node roda em edge ✅                                                                                                                                                                        |
| `runtime = "nodejs"` declarado onde necessário | ✅ `apps/intranet/src/middleware.ts:18`, `apps/radio/src/app/api/heartbeat/route.ts:19`, `.../stream/route.ts:26` — todos usam `@hebron/db/client` (postgres-js, precisa de `net`/`tls`)                                    |

## 2. Versões e consistência de dependências

Versões **instaladas** conferidas antes de qualquer afirmação:

| Pacote             | Declarado                       | Instalado   |
| ------------------ | ------------------------------- | ----------- |
| `next`             | `^15.3.0` (uniforme nos 9 apps) | **15.5.18** |
| `next-safe-action` | `^7.9.0` (uniforme nos 9 apps)  | **7.10.8**  |
| `openai`           | `^4.67.0`                       | **4.104.0** |
| `react`            | `^19.0.0` (uniforme)            | —           |

O `pnpm-workspace.yaml` usa **catalog** para as três dependências que já causaram drift, com o motivo documentado no próprio arquivo (`:6-9`):

```yaml
# P-0.8: versões compartilhadas entre apps/packages para evitar drift
# (supabase-js chegou a existir em 2 versões — ^2.46.0 e ^2.106.1 — o que
# quebra o parsing de cookies do @supabase/ssr quando misturado no mesmo
# processo). Sempre referenciar via "catalog:" nos package.json.
catalog:
  "@supabase/supabase-js": ^2.106.1
  drizzle-orm: ^0.36.4
  zod: ^3.24.0
```

Verificação: `grep -rn '"zod"|"drizzle-orm"|"@supabase/supabase-js"' apps/*/package.json packages/*/package.json | grep -v "catalog:"` → **0 resultados**. Nenhum workspace escapou do catálogo. ✅

Nenhuma API de biblioteca usada fora do que a versão instalada oferece foi encontrada. As duas afirmações desta auditoria que dependem de comportamento de lib foram checadas contra o código-fonte do pacote instalado, não de memória:

- `next-safe-action@7.10.8` — `handleServerError` padrão, lido em `dist/index.mjs:1008-1014` (ver `[D4-004]`)
- `next@15.5.18` — exports de arquivo `"use server"` viram Server Actions (ver `[D1-002]`)

## 3. Fronteira client/server

Varredura em todos os arquivos com `"use client"` procurando importação de módulo com segredo (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `DATABASE_URL`, `@hebron/db/client`):

**0 vazamentos.** ✅

O uso de `"use client"` é contido: as páginas marcadas como cliente são as que precisam mesmo (central de notificações com estado e polling; kanban com drag-and-drop). O restante da UI é RSC, como o BRAIN §2 pede.

## 4. Middleware

Onde existe — apenas `apps/intranet` — o matcher está correto e cobre `/api`:

```ts
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

✅ Padrão correto. O problema é ele não existir nos outros 8 apps — achado registrado em `[D1-001]`, não repetido aqui.

---

### [D7-001] `pnpm turbo typecheck` falha — o CI está vermelho no `main`

- **Severidade:** P1 | **Domínio:** Padrões/CI | **App:** packages/auth
- **Status:** CONFIRMADO (executado nesta sessão)
- **Evidência:** saída de `pnpm turbo typecheck --concurrency=3` nesta auditoria
- **Trecho (saída literal):**

  ```
  @hebron/auth:typecheck: src/__tests__/data-deletion.test.ts(89,6): error TS2769: No overload matches this call.
  @hebron/auth:typecheck:       Property 'nickname' is missing in type '{ id: string; bankName: string; createdBy: string; }'
                                but required in type '{ createdBy: ...; bankName: ...; nickname: ...; ... }'.

   Tasks:    9 successful, 10 total
  Cached:    8 cached, 10 total
  Failed:    @hebron/auth#typecheck
   ERROR  run failed: command  exited (2)
  ```

- **Código responsável** — `packages/auth/src/__tests__/data-deletion.test.ts:87-94`:
  ```ts
  await db
    .insert(bankAccounts)
    .values({
      id: ACCOUNT_ID,
      bankName: "Banco Teste",
      createdBy: TARGET_ID,
    })
    .onConflictDoNothing();
  ```
  `financeiro.bank_accounts.nickname` passou a ser `NOT NULL` (migration `0069_financeiro_colunas_ausentes.sql`, corretivo P-3.6b/S-215 — "Seis campos que o formulário coleta e o banco não tem onde guardar"). O schema Drizzle acompanhou; este teste não.
- **Esperado:** `BRAIN.md:628-629` — checklist obrigatório ao concluir **cada** prompt:
  ```
  - [ ] Lint passa
  - [ ] Types passam
  ```
  E `.github/workflows/ci.yml:31`:
  ```yaml
  - run: pnpm turbo lint typecheck
  ```
- **Encontrado:** O job `lint-typecheck` do CI executa exatamente o comando que falha. Portanto **o CI está reprovando em `main`** — e como o mesmo job também roda `pnpm check:cross-app-imports` (`:36`) depois, essa verificação nem chega a executar.

  Para calibrar: **`pnpm turbo lint` passa integralmente** — verificado nesta sessão, `Tasks: 19 successful, 19 total`, exit 0. O problema é só o typecheck, e só em um pacote, e só em arquivo de teste (o código de produção de `packages/auth` compila).

- **Impacto:** Duplo. (1) O portão de qualidade automatizado do projeto está desligado na prática: com o CI vermelho por um motivo conhecido e tolerado, um erro de tipo **novo e real** entra sem ser notado, porque a falha já é esperada. (2) É um caso de drift de registro — as sessões seguintes a S-215 marcaram "[x] Types passam" nos seus critérios de aceite enquanto o workspace inteiro não compilava.

  Vale notar a armadilha que quase escondeu isto: rodar `pnpm turbo typecheck | tail` reporta **exit 0** (o código de saída é o do `tail`), e a saída truncada mostra pacotes bem-sucedidos. A falha só aparece lendo o conteúdo.

- **Correção sugerida:** Acrescentar `nickname: "Conta Teste"` ao fixture. Correção de uma linha. Depois, confirmar `pnpm turbo typecheck` verde de ponta a ponta **lendo a saída**, não o exit code de um pipe.

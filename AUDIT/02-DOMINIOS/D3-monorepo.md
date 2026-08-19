# D3 — Costuras do monorepo (Nível B)

## Checklist

| Item                                                                       | Status        |
| -------------------------------------------------------------------------- | ------------- |
| Lógica de negócio compartilhada vive em `packages/`, não duplicada por app | ✅ ver §1     |
| Um único schema Zod por entidade                                           | ✅ ver §2     |
| Tipos derivados do Drizzle, sem interfaces manuais paralelas divergindo    | ✅ ver §3     |
| Componentes vindos do design system; duplicatas locais listadas            | ⚠️ `[D3-001]` |
| Auth/sessão implementada de forma idêntica nos apps                        | ⚠️ `[D3-002]` |
| Todo import declarado no `package.json` do próprio app                     | ✅ ver §4     |
| `.env.example` completo por app; nomes idênticos para o mesmo recurso      | ⚠️ `[D3-003]` |

---

## 1. Isolamento entre apps — verificado e automatizado

A regra do BRAIN §7 ("um app nunca importa código de outro app") **é imposta por CI**, não só por convenção:

- `scripts/check-cross-app-imports.mjs` existe
- `package.json:10` — `"check:cross-app-imports": "node scripts/check-cross-app-imports.mjs"`
- `.github/workflows/ci.yml:33-36`:
  ```yaml
  # G6.5 / P-0.15: apps nunca importam de outro app — código cross-app
  - run: pnpm check:cross-app-imports
  ```

Verificação independente: `grep -rnE 'from "\.\.(/\.\.)+/(apps|\.\./apps)' apps/*/src` → **0 resultados**. ✅

Toda função consumida por mais de um app vive em `packages/integrations`, nomeada pela relação (`documentos-projetos.ts`, `projetos-flats.ts`, `projetos-tarefas.ts`, `financeiro.ts`, `intranet.ts`, `plataforma.ts`, `flats.ts`), exatamente como o BRAIN §7 especifica. ✅ Esta é uma das partes mais bem executadas do projeto.

## 2. Schemas Zod

85 schemas exportados em `packages/validators/src/{admin,documentos,financeiro,flats,intranet,plataforma,projetos,radio,tarefas}`; 76 definidos localmente em `apps/*/src`. Cruzei os dois conjuntos por nome: **uma única colisão**, `updateSeriesSchema`, e ela é falso positivo — `packages/validators/src/radio/index.ts:33` trata da série de sermões da Rádio, `apps/plataforma/src/actions/series.ts:41` da coleção temática de cursos. Entidades diferentes com nome igual, em módulos diferentes.

O padrão dominante é o correto: o schema base fica em `validators` e a action o estende com o que é específico da operação. Exemplo (`apps/plataforma/src/actions/series.ts:41-43`):

```ts
const updateSeriesSchema = seriesSchema.extend({
  seriesId: z.string().uuid(),
});
```

onde `seriesSchema` vem de `packages/validators/src/plataforma/index.ts:22`. ✅ Nenhuma validação divergente da mesma coisa em apps diferentes.

## 3. Tipos

`packages/types` concentra os tipos cross-app e `packages/db/src/schema/*.ts` é a fonte Drizzle. Não encontrei interfaces manuais duplicando tabelas e divergindo — os tipos de domínio em `packages/types/src/<modulo>/` são _view models_ de UI (ex. `Document`, `CompactProjectView`), deliberadamente diferentes da linha do banco, e são montados a partir dela nas queries. ✅

---

### [D3-001] Design system incompleto contra a própria especificação; um composto vive dentro de um app

- **Severidade:** P3 | **Domínio:** Monorepo | **App:** packages/ui, tarefas
- **Status:** CONFIRMADO
- **Evidência:** `ls packages/ui/src/components/` — 30 arquivos
- **Esperado:** `.docs/Claude.md` §5.1 especifica o conteúdo de `packages/ui`:
  ```
  - Componentes base (fork de shadcn/ui customizado): Button, Input, Select, Dialog, Drawer,
    Tooltip, Toast, DataTable, Combobox, DatePicker, FormField.
  - Padrões compostos: PageHeader, EmptyState, ErrorState, LoadingState, AppShell,
    NavigationSidebar, CommandMenu.
  ```
- **Encontrado:** Presentes: `button`, `input`, `select`, `dialog`, `drawer`, `tooltip`, `toast`, `form-field`, `page-header`, `empty-state`, `error-state`, `loading-state`, `app-shell`, `navigation-sidebar` — 14 dos 18. **Ausentes de `packages/ui`: `DataTable`, `Combobox`, `DatePicker`, `CommandMenu`.**

  `CommandMenu` existe, mas dentro de um app: `apps/tarefas/src/components/command-menu.tsx:22`. Funciona (`:35` implementa o atalho `Cmd/Ctrl+K`), mas nenhum outro app pode usá-lo.

  Sobre `DataTable`: `@tanstack/react-table` está declarado em **1 dos 9** `package.json` (`apps/admin/package.json:28`) e é usado em **um único arquivo** de todo o monorepo (`apps/admin/src/components/user-table.tsx`). Os outros 26 arquivos com tabela no ecossistema montam `<table>` à mão. O BRAIN §2 declara "Tabelas: TanStack Table v8" e o `.docs/Claude.md` §2.2 justifica: _"Essencial para Financeiro, Projetos e Tarefas (filtros, ordenação, virtualização)"_ — os três apps citados não o têm.

- **Impacto:** Nenhum defeito funcional. O custo é de manutenção: filtro, ordenação e paginação são reimplementados por tela, e é justamente onde `[D4-003]` (paginação ausente) aparece. Um `DataTable` compartilhado teria resolvido os dois de uma vez.
- **Correção sugerida:** Promover `CommandMenu` para `packages/ui` (mover, não copiar). Decidir explicitamente sobre `DataTable`: ou extrair um a partir de `user-table.tsx` e adotar nas listagens grandes, ou emitir PATCH removendo TanStack Table da stack declarada — hoje o BRAIN promete uma coisa e o código faz outra.

---

### [D3-002] O gate de sessão por app é copiado 12 vezes em vez de compartilhado

- **Severidade:** P3 | **Domínio:** Monorepo | **App:** todos
- **Status:** CONFIRMADO
- **Evidência:** `apps/admin/src/lib/session.ts:12-27` e `apps/plataforma/src/lib/queries.ts:104-111`
- **Trecho (admin):**

  ```ts
  export async function requireAdminSession(): Promise<ActionSession> {
    const cookieStore = await cookies();

    let session: ActionSession;
    try {
      session = await resolveSession(cookieStore);
    } catch {
      redirect(CANONICAL_LOGIN_URL);
    }

    if (!session.roles.includes("super_admin")) {
      redirect(CANONICAL_LOGIN_URL);
    }

    return session;
  }
  ```

- **Trecho (plataforma), mesma forma:**
  ```ts
  export async function requireAlunoSession(): Promise<ActionSession> {
    const cookieStore = await cookies();
    try {
      return await resolveSession(cookieStore);
    } catch {
      redirect(CANONICAL_LOGIN_URL);
    }
  }
  ```
- **Encontrado:** O núcleo — `resolveSession` — **é** compartilhado (`packages/auth/src/server.ts:71`), e isso é o que importa para segurança. O que está duplicado é o invólucro "resolve, senão redireciona, e checa papel X": 12 variantes espalhadas entre `apps/*/src/lib/session.ts` e `apps/*/src/lib/queries.ts` (`requireAdminSession`, `requireSubmissorSession`, `requireDiretorSession`, `requireColaboradorSession`, `requireEditorSession`, `requireAlunoSession`, `requireInstrutorSession`, `requireHospedeSession`, `requireGestorSession`, `requireStaffSession`, `requireSuperAdminSession`).

  Também não há convenção de onde ele mora: admin/projetos/financeiro/documentos usam `lib/session.ts`; plataforma/flats/tarefas/radio o enterram em `lib/queries.ts`.

- **Impacto:** Uma mudança na política de redirect (ex.: preservar `return_to`, que hoje **nenhum** deles faz — todos mandam para `CANONICAL_LOGIN_URL` puro, perdendo a rota original) precisa ser aplicada em 12 lugares. Está diretamente ligado a `[D1-001]`: se o middleware existisse, ele seria o lugar natural desse gate.
- **Correção sugerida:** `createRoleGate(roles: Role[])` em `packages/auth`, e os apps passam a declarar só a lista de papéis. Resolve junto o `return_to` perdido.

---

### [D3-003] Nenhum app tem `.env.example` próprio

- **Severidade:** P3 | **Domínio:** Monorepo/Deploy | **App:** todos
- **Status:** CONFIRMADO
- **Evidência:** `.env.example` existe apenas na raiz (2999 bytes). Verificação: `ls apps/<app>/.env.example` nos 9 apps → ausente em todos.
- **Encontrado:** O arquivo da raiz é **bom**: documenta as 25+ variáveis do ecossistema, explica por que `R2_ENDPOINT` foi acrescentado fora da lista original do prompt, marca `IMPERSONATION_COOKIE_SECRET` como obrigatório em produção com o comando de geração (`openssl rand -base64 48`), e registra que as URLs cross-app são opcionais. O problema não é qualidade, é granularidade.
- **Impacto:** O deploy são **9 projetos Vercel independentes** (BRAIN §2), cada um com seu próprio painel de variáveis. Não existe documento dizendo que, por exemplo, o app `radio` precisa de `R2_*` e o app `flats` não; ou que só a `intranet` precisa de `INNGEST_*` (por hospedar a rota de serve). Quem configurar os 9 projetos vai colar tudo em todos, ampliando desnecessariamente a exposição de segredos — em particular `SUPABASE_SERVICE_ROLE_KEY` em apps que não o usam.
- **Correção sugerida:** Derivar um `.env.example` por app a partir do que cada um efetivamente lê (`packages/config/src/env.ts` já tem a estrutura para isso), como parte de P-9.5.

---

## 4. Dependências declaradas

Script cruzou todo `from "..."` / `require("...")` de cada workspace contra `dependencies` + `devDependencies` + `peerDependencies`. **Nenhuma dependência real não declarada.** Os 6 alarmes foram verificados um a um e são falsos positivos:

| Alarme                                                                 | Verificação                                                                                                                |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `apps/financeiro`: `aprovado`, `pendente`                              | `approval.ts:201,322` — texto dentro de comentário: `// All payables in the batch move from "pendente" → "aprovado".`      |
| `packages/auth`: `next`                                                | `server.ts:44` — comentário: _"Kept structural (not imported from \"next/headers\") so this package…"_; não há import real |
| `packages/auth`: `@hebron/auth`, `packages/db`: `@hebron/db`, `module` | auto-referências em comentário/JSDoc                                                                                       |

✅ Deploy isolado na Vercel não quebra por hoisting.

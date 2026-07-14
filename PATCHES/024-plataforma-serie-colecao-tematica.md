# PATCH-024 — Plataforma: "série" é coleção temática de cursos (entidade Series)

**Data:** 2026-07-14
**Origem:** Débito de S-105 (P-6.3), critério de aceite marcado `[~]`.
**Motivo:** O Escopo de P-6.3 pede filtros por "categoria, dificuldade, instrutor" e o critério de aceite pede "busca simples (título, **série**, categoria)"; P-6.8 repete "busca simples (título, **série**, categoria)"; e a regra vem de **BRAIN §6.3** ("Busca simples (título, série, categoria) na v1"). Nenhuma camada modela "série": `Course` (P-6.1) só tem `category`. S-105 implementou o filtro como título + categoria + instrutor e registrou a lacuna.

BRAIN §6.3 lista **título, série e categoria como três eixos distintos** — logo "série" não é sinônimo de "categoria". O paralelo direto no ecossistema é o módulo **Rádio (§6.4 / P-8.1)**, que já modela `Series` como uma coleção temática (`name`, `author_id`, `description`) — ex.: uma série de sermões. Aplicado ao LMS, "série" é uma **coleção temática de cursos** (ex.: série "Fundamentos", série "Discipulado"), um agrupamento acima da categoria do qual um curso faz parte.

## Decisão (Filipe, 2026-07-14)

Modelar **`Series`** como entidade própria (coleção temática de cursos), com `Course.seriesId` opcional, e usar a série como terceiro eixo de busca/filtro do catálogo — alinhando código, BRAIN §6.3 e o precedente do Rádio. O campo "dificuldade" do texto de Escopo de P-6.3 **não** entra: não está em BRAIN nem no critério de aceite (que fala em "série"), foi só ruído do texto de escopo; fica fora da v1.

Escopo de Bloco A (mocks) — a tabela `plataforma.series` e a coluna `courses.series_id` são adicionadas no schema de Bloco B (ver "Ajustes de prompts a jusante").

## Prompt corretivo proposto

### P-6.3b — Plataforma: série como coleção temática no catálogo

**Fase:** 6
**Módulo:** plataforma
**Tipo:** ui
**Pré-condições:**

- Branch: `fix/P-6.3b-plataforma-serie`
- Dependências: P-6.5 concluído
- Env vars: nenhuma

**Escopo:**

Introduzir "série" (coleção temática de cursos) como terceiro eixo de busca/filtro do catálogo, ainda sobre mocks (Bloco A).

1. Tipo `Series` (`id`, `name`, `slug`, `description`, `createdAt`, `updatedAt`) e campos `seriesId: string | null` + `seriesName: string | null` (denormalizado, mesmo padrão de `instructorName`) em `Course`.
2. Schema Zod: `seriesSchema` e inclusão de `seriesId` opcional no schema de curso (`createCourseSchema`/equivalente).
3. Mock data: 2+ séries (ex.: "Fundamentos da Fé", "Formação de Líderes"); associar `seriesId`/`seriesName` aos cursos existentes; ao menos um curso **sem** série (`null`), para exercitar o caso opcional.
4. Catálogo (`(aluno)/page.tsx`): adicionar filtro por série (Select, mesmo padrão dos filtros de categoria/instrutor); a busca por texto passa a casar título **e** nome da série.
5. `course-form.tsx` (P-6.4): seletor opcional de série no formulário de curso (Select com as séries do mock; opção "Sem série").
6. `course-card.tsx` (opcional): exibir o nome da série como rótulo discreto quando presente.

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

**Aplicado em:** S-108 (`SESSIONS.md`), branch `fix/P-6.3b-plataforma-serie`.

## Ajustes de prompts a jusante (Bloco B)

Ao executar, atualizar (não precisa migration à mão — ver G6.4):

- **P-6.6** (schema): adicionar tabela `plataforma.series` (id, name, slug, description, timestamps) e coluna `courses.series_id` (FK nullable) à lista de tabelas do escopo.
- **P-6.7** (RLS): `series` — SELECT para autenticado (como `courses` publicados); CRUD para super_admin/instrutor.
- **P-6.8** (actions): "busca simples (título, série, categoria)" passa a filtrar de fato por `series_id`; CRUD de curso aceita `series_id`.
- **P-6.9** (integração): filtro de série do catálogo passa a consumir dados reais; `course-form` conectado grava `series_id`.

## Fora de escopo

- "Dificuldade" (do texto de Escopo de P-6.3) — não modelada; não está em BRAIN nem no critério. Se um dia entrar, é decisão nova.
- Página de série (listar cursos de uma série) — nice-to-have de v2+, não pedido em BRAIN.

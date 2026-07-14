# PATCH-022 — Plataforma: área do instrutor é segmento `instrutor/`, não grupo `(instrutor)`

**Data:** 2026-07-14
**Origem:** Divergência de S-105 (P-6.3) vs. referências de path em P-6.9 (e menções a "série" em P-6.3/P-6.8).
**Motivo:** P-6.3 lista os arquivos do instrutor sob o grupo de rota `apps/plataforma/src/app/(instrutor)/...`. Grupos de rota do Next.js App Router (`(nome)`) não adicionam segmento à URL — tanto `(aluno)/page.tsx` quanto `(instrutor)/page.tsx` resolveriam para `/`, e o Next.js rejeita o build ("two parallel pages that resolve to the same path"). S-105 resolveu, corretamente, renomeando o grupo `(instrutor)` para o segmento real `instrutor/` (mesmo precedente de `apps/documentos`, que usa `editorial/`), deixando toda a área do instrutor sob `/instrutor/*`. Build limpo confirmado.

O problema residual é **de documentação**, não de código: P-6.9 (Bloco B) ainda lista os arquivos do instrutor como `(instrutor)/...`. Uma sessão futura seguindo o prompt ao pé da letra recriaria exatamente o conflito de rota que S-105 já resolveu, ou editaria caminhos inexistentes.

## Decisão

Ratificar o segmento real `instrutor/` (não o grupo `(instrutor)`) como a estrutura canônica da área do instrutor na Plataforma. O gate de papel (`instrutor|super_admin`) continua viável via `instrutor/layout.tsx` + middleware — um segmento real não enfraquece o controle de acesso frente a um grupo de rota.

Estrutura canônica (estado atual da codebase, confirmado em S-105):

```
apps/plataforma/src/app/
├── (aluno)/            # grupo de rota → resolve para /
│   ├── layout.tsx
│   ├── page.tsx        # catálogo → /
│   ├── curso/[slug]/page.tsx
│   ├── curso/[slug]/aula/[id]/page.tsx
│   ├── jornada/page.tsx
│   └── certificados/page.tsx
└── instrutor/          # SEGMENTO real → resolve para /instrutor/*
    ├── layout.tsx
    ├── page.tsx        # painel → /instrutor
    ├── curso/novo/page.tsx
    ├── curso/[id]/page.tsx
    ├── curso/[id]/aula/[aulaId]/page.tsx
    └── curso/[id]/quiz/[quizId]/page.tsx
```

## Correções aplicadas em `PROMPTS.md`

Referências de path corrigidas na lista de arquivos permitidos de **P-6.9** (Integração UI ↔ Backend), de `(instrutor)` para `instrutor`:

- `apps/plataforma/src/app/(instrutor)/layout.tsx` → `apps/plataforma/src/app/instrutor/layout.tsx`
- `apps/plataforma/src/app/(instrutor)/shell.tsx` → `apps/plataforma/src/app/instrutor/shell.tsx`
- `apps/plataforma/src/app/(instrutor)/**/page.tsx` → `apps/plataforma/src/app/instrutor/**/page.tsx`

O critério de aceite de P-6.9 "(instrutor) exige papel instrutor|super_admin" permanece válido — refere-se à **área** do instrutor (agora servida pelo segmento `instrutor/`), não à sintaxe de grupo de rota. A copy do critério foi mantida por clareza semântica; apenas os paths de arquivo mudaram.

## Fora de escopo deste patch (registrado, não corrigido aqui)

Duas outras lacunas de P-6.1–P-6.5 dependem de decisão de negócio do Filipe e serão tratadas em patch(es) próprio(s) após a definição:

1. **Quiz dissertativa** (critério de P-6.2 `[~]`): `QuizQuestion` só modela múltipla escolha; questão dissertativa é incompatível com a auto-correção/auto-conclusão do PATCH-010. Precisa de decisão: manter só múltipla escolha em v1 (e ajustar o critério do prompt) ou modelar dissertativa com correção manual (fora do modelo atual).
2. **Filtro/busca por "dificuldade/série"** (critério de P-6.3 `[~]`, reaparece em P-6.8): `Course` não tem campo de dificuldade nem de série; o filtro foi implementado como título+categoria+instrutor. Precisa de decisão sobre modelar (ou não) um campo de nível/série em `Course`.

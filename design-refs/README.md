# design-refs/ — Referências visuais por aplicação

> Protótipos de alta fidelidade gerados no **Claude Design** (claude.ai). São a **fonte da verdade VISUAL** de cada app: layout, hierarquia, espaçamento, composição de telas, estados e tratamento da marca.
>
> **Fonte da verdade de TOKENS e regras:** `BRAIN.md` §5. **Sequência de implementação:** `PROMPTS.md`.

## O que há aqui

| App | Pasta | Telas incluídas |
|---|---|---|
| Admin | `design-refs/admin/` | overview, users, invites, audit-meetings, settings |
| Documentos | `design-refs/documentos/` | público (home, doc, edital, busca), editorial |
| Financeiro | `design-refs/financeiro/` | dashboard, lançamentos, contas a pagar, conciliação, importação, orçamento, plano de contas |

> As referências dos demais apps (Tarefas, Intranet, Plataforma, Flats, Rádio) serão geradas no Claude Design e adicionadas aqui em pastas com o **mesmo nome do app** (`design-refs/<app>/`). Um prompt de UI só tem referência se a pasta do app existir.

## Como cada pasta está organizada

- `*.html` / `index.html` — entrada do protótipo (abra no navegador para ver as telas).
- `tokens.css` (ou `hebron-tokens.css`) — os **tokens canônicos** (`--hb-*` + semânticos `--fg`/`--bg`/`--surface`/`--divider` + classe `.hb-balao`). É a base que foi adotada como design system oficial em `packages/ui`.
- `styles.css` / `app.css` — estilos das telas do protótipo (classes como `.hb-card`, `.hb-stat`, `.hb-timeline`).
- `screen-*.jsx` / `screens-*.jsx` — cada tela do protótipo em JSX.
- `components.jsx`, `data.jsx`, `icons.jsx` — componentes, dados mockados e ícones do protótipo.

## Como consumir (resumo — detalhe em PROMPTS.md › "Instruções Globais")

1. **Antes** de qualquer prompt de UI (Bloco A), abra `design-refs/<app>/` se existir.
2. **Replique com fidelidade**: layout, grid, espaçamento, hierarquia tipográfica, ordem dos elementos, estados (vazio/erro/loading) e o tratamento de marca (forma `balão`, círculos, eyebrow).
3. **Traduza para a stack real**, não copie o protótipo cru:
   - Os protótipos são JSX + CSS puro. A implementação usa **Next.js + Tailwind v4 + componentes de `@hebron/ui`**.
   - Use **somente** os tokens canônicos de `packages/ui/src/tokens.css` (`--hb-*` e semânticos).
   - **NUNCA** crie um `<app>.css` redefinindo cores da marca. **NUNCA** escreva hex no código (ex.: `#202c85`). Use o token.
4. Em divergência entre o protótipo e o BRAIN.md, **o BRAIN.md vence** (regra de negócio) — registre a divergência visual em `SESSIONS.md`.

# AUDIT/patches — patches propostos pela Fase 4

Propostas de alteração em `PROMPTS.md` no formato antes/depois. **Nada foi aplicado** — a auditoria
é read-only fora de `AUDIT/`. Aplicar somente após as decisões pendentes (perguntas na §8 de
`AUDIT/04-prompts-pendentes.md`).

## Organização

- **1 arquivo por prompt** com mudança substantiva (`P-3.9.md`, `P-4.6.md`, …).
- `G5-G6-instrucoes-globais.md` — emenda à G5 (gate de papel; reuso do Bloco A) e **nova G6**
  (kit de backend obrigatório) — é o patch mais importante: substitui dezenas de repetições nos
  prompts individuais.
- `migracoes-numeracao.md` — mudança mecânica idêntica em 13 prompts (números de migration →
  drizzle-kit/convenção G6.4), agrupada.
- `patches-leves.md` — mudanças de 1–3 linhas em 20 prompts, agrupadas.

## Dependências das decisões

| Patch | Bloqueado por |
| --- | --- |
| P-4.4, P-5.4, P-6.4 (editor) | D-1 (editor rich text) |
| P-8.6/P-8.11 (audiência) | D-3 (semântica de ouvinte) |
| P-7.8/P-7.11/P-7.12 (auxílio) | D-4 (governança do auxílio — recomendação já redigida) |
| Emendas do BRAIN (via P-0.16) | D-5 (veto ou aprovação das decisões delegadas) |

Os corretivos P-0.7…P-0.16, P-1.25…P-1.27, P-2.9c, P-3.8b e os novos prompts (P-2.13, P-2.14,
P-5.13, P-7.13, P-9.0) estão redigidos nas §4–§5 de `AUDIT/04-prompts-pendentes.md`.

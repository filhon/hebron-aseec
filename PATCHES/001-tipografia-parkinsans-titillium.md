# PATCH-001 — Tipografia: Inter/Source Serif 4 → Parkinsans/Titillium Web

**Data da decisão original:** não registrada formalmente; primeira menção escrita em `.docs/Claude.md` (aviso de revisão 2026-06-13). Consolidada e implementada em **P-0.2b** (S-20, 2026-06-13).
**Data deste registro retroativo:** 2026-07-06 (P-0.16, autorizado por Filipe — Fase 0, pergunta 4).
**Motivo:** A stack técnica original (`.docs/Claude.md`) especificava Inter (UI) + Source Serif 4 (títulos), seguindo um padrão "SaaS genérico" que contradiz o princípio "não parecer IA" do próprio documento (BRAIN.md §5, `.docs/Identidade Visual da Hebron Aseec.md`). A decisão foi corrigida antes de qualquer execução de UI de fase ≥ 1, mas nunca ganhou um PATCH formal — apenas uma nota de revogação no cabeçalho de `.docs/Claude.md` e a observação em `PROMPTS.md` (P-0.2). A auditoria (S1-16) identificou a lacuna e autorizou a reconstrução retroativa.

**Impacto:**

- `packages/ui/src/tokens.css`: `--font-display` e `--font-body` passam a apontar para Parkinsans/Titillium Web via `next/font`, não Inter/Source Serif 4.
- BRAIN.md §2 (stack) e §5 (design system): tipografia documentada como Parkinsans + Titillium Web desde a origem.
- `PROMPTS.md` G3/G4: proíbem explicitamente Inter/Source Serif 4 em qualquer prompt de UI.
- P-0.2 foi executado com a tipografia errada; P-0.2b (S-20) migrou o que já existia. Nenhum prompt de fase ≥ 1 herdou a tipografia antiga.

**Antes** (`.docs/Claude.md` §2.2, texto original da stack):

```
| Tipografia | **Inter** (UI) + **Source Serif 4** (títulos editoriais) via next/font | Combinação serifa/sans dá ar institucional e foge do default técnico. |
```

**Depois** (`BRAIN.md` §2, Frontend):

```
- **Tipografia:** Parkinsans (chamadas/títulos) + Titillium Web (UI/corpo) via `next/font`, seguindo estritamente o manual de identidade visual
```

E (`BRAIN.md` §5, Tipografia):

```
- **Chamadas e títulos:** **Parkinsans** (`--font-display`) — geométrica, enérgica, humana, acolhedora. Fonte variável (300–800).
- **UI e corpo de texto:** **Titillium Web** (`--font-body`) — flexível, multi-peso, mesma fonte da marca-mãe Hebron.
- **PROIBIDO** usar Inter / Source Serif 4 (especificação antiga, revogada). Carregar as duas via `next/font` em cada `layout.tsx`; os `.ttf` originais estão em `.docs/.assets/`.
```

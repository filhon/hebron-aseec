# PATCH-014 — D-1: editor de texto rico compartilhado nasce em `packages/ui`

**Data:** 2026-07-07 (P-4.4, S-76)
**Motivo:** PROMPTS.md cita a decisão "D-1" desde a auditoria (registrada como pendente em S-68/PATCH omitido de propósito: "D-1 (editor rich text) ... só passa a ter efeito quando os prompts que a consomem rodarem — P-4.4/P-5.13/P-8.6"). P-4.4 é o primeiro desses prompts: seu escopo exige explicitamente "descrição com o editor rich text COMPARTILHADO de packages/ui — decisão D-1; não criar editor próprio do app". Como o componente ainda não existia, esta sessão o cria — fechando a decisão que a auditoria só havia anotado como intenção.

**Decisão:** um único componente `RichTextEditor` vive em `packages/ui/src/components/rich-text-editor.tsx` (exportado por `@hebron/ui`) e é o único editor de texto rico do monorepo. Nenhum app pode implementar o seu próprio (equivalente à regra já aplicada ao `MarkdownEditor` de Documentos, que é Markdown — um formato deliberadamente diferente, não coberto por esta decisão).

**Escopo técnico:**

- Sem dependência de terceiros (nenhuma lib de editor rico existia no monorepo). Implementado com `contentEditable` + `document.execCommand` (API depreciada mas universalmente suportada; trade-off aceito para não introduzir uma dependência nova sem aprovação explícita do Filipe).
- Valor trafega como string HTML (`value`/`onChange: (html) => void`), consistente com `description: z.string()` em `createTaskSchema` (`packages/validators/src/tarefas/index.ts`) — nenhuma mudança de schema foi necessária.
- Toolbar mínima: negrito, itálico, sublinhado, lista, lista numerada, link — sem tabelas, imagens embutidas ou formatação avançada (não pedido pelo escopo, "não parecer IA"/simplicidade).
- Segue os tokens canônicos (`--radius`, `--border`, `--brand`, etc.) e convenção de classes Tailwind v4 já usada no restante de `packages/ui` (não o padrão de `style={{}}` inline usado nos formulários mais antigos de Documentos).

**Consumidores previstos:** `apps/tarefas/src/components/task-form.tsx` (P-4.4, esta sessão), e futuramente `apps/intranet` (P-5.13 — corpo de anúncio) e `apps/plataforma` (P-8.6 — descrição de curso), conforme já sinalizado em `PROMPTS.md:3079` e `PROMPTS.md:3526`.

**Impacto:** nenhuma migration de banco. Nenhuma mudança de contrato em `packages/validators` ou `packages/types`. Primeiro consumidor de um componente novo em `packages/ui` desde a unificação do design system (P-0.2b/P-1.12b).

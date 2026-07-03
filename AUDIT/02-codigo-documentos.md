# AUDIT/02 — Verificação spec ↔ código — Documentos (P-1.13 a P-1.24 + commit fora de fluxo `3be389f`)

**Fase:** 2 · **Data:** 2026-07-02 · **Auditor:** agente Fable 5

## Tabela de veredictos

| Prompt | Veredito | Evidência-chave |
| --- | --- | --- |
| P-1.13 Tipos | **Implementado fiel** | types/validators/mocks validados retroativamente (S-23); mock deletado em P-1.21 (grep "mock" vazio no app) |
| P-1.14 Componentes | **Implementado; metade morto** | Vivos: `edital-card`, `category-tree`, `document-viewer`, `version-history`, `document-card`. Morto: `search-bar` (busca reescrita como `<form method="get">` em P-1.21) |
| P-1.15 Páginas | **Implementado com desvio estrutural não registrado** | Rota mudou de route-group `(editorial)` (URL raiz) para segmento real `/editorial` — os arquivos do prompt eram `(editorial)/...`; os reais são `editorial/...`. A mudança aparece só implicitamente na lista de arquivos da sessão P-1.21, nunca como decisão. Critério "[~] área editorial protegida" segue não atendido (ver F2-D2) |
| P-1.16 Formulários | **Implementado; hoje todo morto** | `document-form`, `edital-form`, `category-form`, `subscription-form`, `markdown-editor`: **zero imports**. As telas reais (`editorial/novo`, `editorial/[id]/editar`, `editorial/categorias`) usam implementações próprias criadas fora de fluxo (`3be389f`). Subscription: **não existe nenhuma UI viva** para assinar categoria (actions `subscribe/unsubscribe` sem chamador) |
| P-1.17 Estados | **Implementado fiel** (vivificado fora de fluxo) | Skeletons usados pelos `loading.tsx` criados no commit `3be389f` (ex.: `app/loading.tsx`, `busca/loading.tsx`) |
| P-1.18 Schema | **Implementado fiel** | `0005_documentos.sql` com 8 tabelas, RLS deny-by-default, herança edital via FK 1-1; desvio de numeração documentado (S-28) |
| P-1.19 RLS | **Implementado fiel** (sem sessão — anomalia de registro já confirmada pelo Filipe) | `0005_documentos_rls.sql:55–95` cumpre os critérios: anon→public, autenticado→internal, restricted por papel, editor/admin CRUD; testes de RLS confirmam (`rls.test.ts:202–316`). **Porém o app não usa essas policies nas páginas públicas — ver F2-D1** |
| P-1.20 Actions | **Implementado fiel** | `actions/documents.ts:40–342` — upload via signed URL, versionamento em `updateDocument`, publish/unpublish com audit, gates `editorAction`/`adminDocAction`/`authenticatedAction` (`lib/safe-action.ts:31–65`); anti-ciclo em categorias; débito do enum de audit liquidado por `0006_documentos_audit_actions.sql` — **fora de fluxo, sem registro** (`3be389f`) |
| P-1.21 Integração | **Implementado com desvio grave não documentado** | Mock removido, SSR real, busca server-side (✓). **Mas o filtro de visibilidade está errado nas páginas públicas e ausente no detalhe — ver F2-D1 (CRÍTICO)** |
| P-1.22 Notificações | **Parcialmente implementado** | Templates + 3 funções existem (`lib/notifications.ts`); **nenhuma é chamada** por nenhuma action (grep: zero chamadores fora do arquivo e testes). Critérios "[x] Email enviado a subscribers…" não correspondem ao código; débito registrado em S-30, nunca liquidado; lembrete de 7 dias depende de Inngest inexistente (S1-06) |
| P-1.23 Edital→Projetos | **Implementado fiel na ponta Documentos; integração aberta na ponta Projetos** | `edital-submit-button.tsx:20+` gera `edital_id` + params; o wizard de Projetos **não lê** os params (ver 02-codigo-projetos F2-P3) |
| P-1.24 Testes | **Implementado fiel** | 3 suítes reais: RLS por papel incl. soft-delete e versões (`rls.test.ts`), versionamento incremental (`actions.test.ts:205–256`), busca por título/conteúdo/tag/categoria (`search.test.ts`) |
| Trabalho fora de fluxo (`3be389f`, 2026-06-20) | **Sem spec, sem sessão; funcional mas com buracos** | +14.793 linhas: `editorial/[id]/editar/` (873 l, wired a `updateDocument`/`updateEdital` reais — `_client.tsx:16–18`), `editorial/categorias/` + `categories-manager.tsx`, `documentos-logo.tsx`, `loading.tsx` (5), `packages/auth/src/server.ts`, migration `0006`. Ver F2-D2/F2-D3 |

## Achados detalhados

### F2-D1 (CRÍTICO) — Modelo de visibilidade não é aplicado no portal público
As páginas públicas consultam o banco com a conexão superuser (bypassa a RLS correta de P-1.19) e aplicam o filtro **errado ou nenhum**:
- `app/page.tsx:238–239, 273–274, 307–308` e `app/busca/page.tsx:162–163, 203–204`: `visibility IN ('public','internal')` **sem verificar sessão** — documentos `internal` (spec: só autenticados) são listados e buscáveis por visitante anônimo.
- `app/[slug]/page.tsx:141–198`: a query por slug **não tem filtro de visibility algum** — um documento `restricted` publicado é renderizado por completo para qualquer anônimo que tenha o slug, incluindo geração de **signed URL do PDF** (`:196–198`).
O critério P-1.19/P-1.24 "anon vê apenas public" passa nos testes (que exercitam a RLS via role anon) e falha na aplicação real (que nunca usa o role anon). É o exemplo mais claro do padrão "defesa declarada na camada que não executa".

### F2-D2 (CRÍTICO) — Área editorial sem nenhuma autenticação
`editorial/layout.tsx` (reescrito fora de fluxo em `3be389f`) é um componente estático: sidebar + o texto decorativo "Acesso restrito: super_admin / editor" (`:118–126`). Grep por `getUser|getAuthUser|redirect` em `app/editorial/**`: **zero**. O dashboard editorial (KPIs, fila de rascunhos — inclusive documentos não publicados), `novo`, `[id]/editar` e `categorias` renderizam para qualquer visitante com dados lidos via superuser. As mutações são protegidas pelos gates das actions (camada 2 existe), mas rascunhos e conteúdo restrito vazam pela leitura. Observação: o guard "UI-only" prometido nas S-25/S-26 (com "middleware real em P-1.18" — prompt que nunca cobriu isso) foi **removido** na reescrita fora de fluxo.

### F2-D3 (ALTO) — Navegação editorial aponta para 4 rotas inexistentes
`editorial/layout.tsx:50–86` linka `/editorial/documentos`, `/editorial/editais`, `/editorial/assinaturas`, `/editorial/auditoria` — nenhuma dessas páginas existe (file listing). Quatro 404s permanentes na navegação principal da área editorial, produto do trabalho fora de fluxo sem critério de aceite.

### F2-D4 (ALTO) — Subscriptions sem UI e notificações sem chamador: promessa do módulo quebrada de ponta a ponta
A cadeia "assinar categoria → documento publicado → e-mail ao assinante" (BRAIN §6.7, P-1.16+P-1.22) não tem nenhum elo funcional: `subscription-form.tsx` morto → ninguém consegue assinar; `publishDocument` não chama `notifyNewDocument`; job de "edital fechando" sem executor. Cada peça existe isolada e testada; o fluxo não existe.

### F2-D5 (MÉDIO) — FAQ de edital hardcoded
Débito de P-1.21 (registrado): FAQ em `editais/[slug]/page.tsx` é lista fixa no código, sem persistência. Critério P-1.15 "página de edital com FAQ" formalmente atendido, funcionalmente estático. Permanece sem dono.

### Verificações que passaram
- Versionamento automático em `updateDocument` com histórico imutável — implementado e testado.
- Gates diferenciados por sensibilidade (`editorAction` vs `adminDocAction` para editais) — acima do especificado.
- Busca server-side com ILIKE, filtro de publicado/não deletado testados.
- A tela de edição criada fora de fluxo usa as actions reais (não duplica lógica) — o problema é de registro e de auth, não de fiação.

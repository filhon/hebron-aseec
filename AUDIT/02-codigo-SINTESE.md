# AUDIT/02 — Síntese da Fase 2: verificação spec ↔ código (54 unidades concluídas)

**Fase:** 2 · **Data:** 2026-07-02 · **Auditor:** agente Fable 5 (read-only fora de `AUDIT/`)
**Detalhes por grupo:** `02-codigo-fundacao.md` · `02-codigo-admin.md` · `02-codigo-documentos.md` · `02-codigo-projetos.md` · `02-codigo-financeiro.md`
**Verificação global desta sessão:** `pnpm turbo lint typecheck` → 34/34 verdes.

---

## 1. Placar dos veredictos (54 unidades)

| Veredito                                       | Qtd       | Unidades                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementado fiel                              | 27        | P-0.1, P-0.2b, P-0.3, P-0.3b, P-0.5, P-0.6, P-1.1, P-1.3, P-1.6, P-1.7, P-1.11, P-1.12b, P-1.13, P-1.15*, P-1.17, P-1.18, P-1.19, P-1.20, P-1.23, P-1.24, P-2.1, P-2.5, P-2.6, P-2.7, P-2.9b, P-2.12, P-3.1, P-3.5, P-3.6 (*P-1.15 com desvio de rota não registrado) — nota: 29 listados, 2 com asterisco contam na linha seguinte                                                                |
| Implementado com desvio (documentado)          | 6         | P-0.2 (Drawer/Tooltip nunca criados), P-2.3 (rota pipeline), P-2.8 (alcançabilidade), P-3.3 (4 telas do escopo), P-3.4, P-3.7 (RLS correta porém inócua em runtime)                                                                                                                                                                                                                                |
| Implementado com desvio (NÃO documentado)      | 8         | P-1.2, P-1.4, P-1.5, P-1.14, P-1.16, P-2.2, P-2.4, P-3.2 — Bloco A parcial/totalmente **código morto** após os P-X.9; formulários mortos com submit falso (`setTimeout`)                                                                                                                                                                                                                           |
| Parcialmente implementado, declarado concluído | 7         | **P-0.4** (MFA "obrigatório" inexistente), **P-1.8** (resetPassword no-op), **P-1.9** (integração de leitura sem nenhuma proteção), **P-1.10** (notificações nunca chamadas), **P-1.12** (teste "end-to-end" não cobre o critério), **P-1.21/P-1.22** (visibilidade não aplicada; notificações sem chamador), **P-2.9** (3 de 17 actions com caminho de UI), **P-3.8** (designation não enforçada) |
| Não encontrado                                 | 0         | —                                                                                                                                                                                                                                                                                                                                                                                                  |
| Trabalho fora de fluxo auditado                | 6 commits | `3be389f` (~14,8k linhas, sem registro), `a088f6c` (attachments, sem registro), `dd5ce05`/S-45 (sem corpo), `502dec4` (parcialmente morto), `4db663a` (AdminShell), `6aedd41`/`4b68f72` (= sessões P-2.10/P-3.4 com mensagem genérica)                                                                                                                                                             |

Nenhum prompt caiu em "não encontrado": **tudo que foi declarado existe como arquivo**. O problema do projeto não é código faltante — é código desconectado, desprotegido e histórico não confiável.

---

## 2. Achados consolidados por severidade

### CRÍTICOS (segurança/exposição de dados — todos inéditos em relação à Fase 1)

| ID        | Achado                                                                                                                                                                                                                                                                                    | Evidência                                                                                       | Detalhe em    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------- |
| **F2-A1** | App Admin inteiro sem proteção de **leitura**: sem middleware, layout sem auth, páginas RSC com conexão superuser. Visitante anônimo lê nome/e-mail/CPF/telefone de todos os usuários, audit log, convites                                                                                | `apps/admin/src/app/(dashboard)/layout.tsx:13–53`; ausência de `apps/admin/src/middleware.ts`   | 02-admin      |
| **F2-D1** | Portal público de Documentos serve documentos `internal` a anônimos (filtro hardcoded public+internal sem sessão) e `[slug]` **não filtra visibility** — documento `restricted` renderizado + signed URL de PDF para qualquer um com o slug                                               | `apps/documentos/src/app/page.tsx:238–239`; `busca/page.tsx:162–163`; `[slug]/page.tsx:141–198` | 02-documentos |
| **F2-D2** | Área editorial sem nenhuma autenticação (label "Acesso restrito" é decorativa); rascunhos e KPIs renderizados a anônimos                                                                                                                                                                  | `apps/documentos/src/app/editorial/layout.tsx` (grep auth: zero)                                | 02-documentos |
| **F2-P4** | Área `(diretoria)` de Projetos exige só login, sem papel; `ScoreIndicator` recebe `role="diretor"` hardcoded → **submissor autenticado vê score IA, breakdown, versão compacta e votos** — viola BRAIN §6.2; SESSIONS (S-38/S-39) afirmava enforcement na aplicação                       | `(diretoria)/layout.tsx:11–14`; `pipeline/[id]/page.tsx:122–124`; `lib/queries.ts:624+`         | 02-projetos   |
| **F2-A3** | Onboarding inexistente de ponta a ponta: e-mail de convite aponta para `/convite` (rota inexistente); `acceptInvitation` não cria conta nem atribui papéis. Combinado com O-1 (sem auto-signup) e F2-P1 (sem UI de criar instituição): **nenhuma pessoa nova consegue entrar no sistema** | `apps/admin/src/actions/invitations.ts:59, 142–227`                                             | 02-admin      |

Nota comum aos críticos: **a RLS correspondente está correta e testada** (documentos, projetos, admin). A exposição existe porque as páginas leem via `DATABASE_URL` superuser sem gate próprio — as decisões do Filipe na Fase 1 (Q2: migrar para authenticated+JWT, opção B) atacam a causa raiz. Enquanto B não chega, esses quatro pontos precisam de gate de papel na camada de aplicação **antes de qualquer deploy**.

### ALTOS

| ID        | Achado                                                                                                                                                                                                                                                                                                                                                                                   | Detalhe em                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **F2-P1** | Projetos: das 17 Server Actions, só 3 têm caminho de UI (rascunhos + voto). Sem UI: submeter projeto (bloqueio de orçamento + score IA), transições de stage (kanban só `console.log` — `pipeline/page.tsx:174`), contestação, pânico, avaliador/parecer, organizações, relatórios ("Enviar Relatório" é botão morto — `(submissor)/[id]/page.tsx:133–142`). P-2.9 declarado concluído   | 02-projetos                    |
| **F2-A4** | Padrão Bloco A → código morto: ~26 componentes órfãos nos 4 apps (10 admin, 6 documentos, 8+ projetos, 2 financeiro), incluindo os que materializavam a stack obrigatória (TanStack Table, RHF+Zod) e 3 formulários com submit falso (`setTimeout`). A UI validada pelo Filipe no Bloco A não é a que roda                                                                               | 02-admin/-documentos/-projetos |
| **F2-F1** | Financeiro: separação gestor/autorizador por designation **não existe em camada executável** (grep `designation` no app: zero; `approveBatch` aceita qualquer diretor; RLS com `has_designation` bypassada). S-52/S-53 afirmam o contrário — divergência SESSIONS × código                                                                                                               | 02-financeiro                  |
| **F2-A2** | `resetPassword` gera link de recovery e o descarta (`generateLink` não envia e-mail); template `password-reset` nunca importado. Ação reporta sucesso e o usuário não recebe nada                                                                                                                                                                                                        | 02-admin                       |
| **F2-D4** | Documentos: cadeia assinatura→publicação→e-mail sem nenhum elo vivo (form morto, `notifyNewDocument` sem chamador, job sem executor). Critérios P-1.22 [x]                                                                                                                                                                                                                               | 02-documentos                  |
| **F2-P3** | Integração edital→wizard aberta nas duas pontas "concluídas": botão gera URL correta (P-1.23), wizard real não lê os params nem chama `getEditalPrefill` (critério [x] do P-2.4 refere-se a componente morto)                                                                                                                                                                            | 02-projetos                    |
| **F2-D3** | Sidebar editorial linka 4 rotas inexistentes (404 permanentes) — produto de trabalho fora de fluxo sem critérios                                                                                                                                                                                                                                                                         | 02-documentos                  |
| **F2-X1** | Trabalho fora de fluxo volumoso não registrado: `3be389f` (~14,8k linhas: tela de edição de documentos, gestão de categorias, `auth/server.ts`, migration 0006 que liquidou débito S-29 silenciosamente) e `a088f6c` (migration 0008 + upload de anexos que tornou verdadeiro um critério do P-2.9). SESSIONS não menciona nada disso — o registro histórico subrepresenta o código real | 02-documentos/-projetos        |

### MÉDIOS

| ID                | Achado                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F2-F1b (fundação) | `WITH CHECK (true)` sem `TO service_role` em `notifications_insert_service` (0000) e `audit_log_insert_service` (0002): autenticado insere notificação/audit arbitrários pelo canal direto        |
| F2-P5             | Quórum conta `role_assignments`, não pessoas — papel duplo conta 2× no denominador                                                                                                                |
| F2-P6             | Votação sem encerramento no caso comum (auto-close só com 100% de turnout; pânico sem UI) — ambiguidade de spec que virou buraco                                                                  |
| F2-A5             | Reuniões: 4 botões mortos; `createMeeting`/`autoCreateMonthlyMeetings` sem chamador e sem cron                                                                                                    |
| F2-F2             | Lote semanal notifica todos os diretores (spec: diretor gestor)                                                                                                                                   |
| F2-F3             | Fluxo de aprovação de pagamentos (contas-pagar) fora dos arquivos permitidos do P-3.9 — sem patch, fecha o módulo sem UI de governança (confirma S1-10/S1-14)                                     |
| F2-M1             | MFA: challenge só para quem já tem TOTP; sem enrollment/enforcement (confirma S1-07 no código — `login-form.tsx:104–121`)                                                                         |
| F2-M2             | Runner de migrations não reconstitui banco novo (confirma S1-04 no código — `migrate.ts:62–64` + ordem 0009<0010)                                                                                 |
| F2-M3             | P-1.12b: critério de grep satisfeito só em minúsculas; hex maiúsculo em `email-template-preview.tsx:41–44` e defaults de templates; aliases deprecated `--color-*` usados em código novo (P-2.10) |
| F2-M4             | `bank-account-form` (fora de fluxo): morto, submit `console.log` — o "botão morto" que motivou o trabalho continua sem função                                                                     |

### BAIXOS (agrupado)

Drawer/Tooltip nunca criados (S-3); `packages/config` stub (validação de env prometida na S-1 inexistente); `client.ts` do db importa só schema public (S-7); CSV só vírgula + split ingênuo com aspas (S-53); `transaction-table-skeleton` e `payable-card` criados e nunca usados; FAQ de edital hardcoded (S-25/P-1.21, documentado); `.catch(console.error)` como convenção de integração (já S1-22).

---

## 3. Desvios silenciosos acumulados (padrões — o que prevê os 70% restantes)

**PD-1 — "Integrado" significa leitura, não operação.** Em todos os módulos com P-X.9 concluído, as telas leem dados reais, mas as mutações críticas não têm fiação: 3/17 actions em Projetos, botões mortos em Admin (reuniões) e Projetos (relatório, kanban), aprovação de lote fora do P-3.9. O agente implementador entende "substituir mocks" literalmente e marca [x] em critérios cuja intenção era o fluxo funcionar. **Previsão:** P-4.9, P-5.9, P-6.9, P-7.9, P-8.9 produzirão o mesmo — dashboards vivos, operações mortas — a menos que os critérios digam explicitamente "ação X executável a partir da tela Y".

**PD-2 — Bloco A vira código morto no Bloco B.** Os P-X.9 reescrevem telas inline (por restrição de "arquivos permitidos" que não incluem os componentes) e abandonam componentes/formulários do Bloco A sem registro — inclusive a stack prometida (RHF, TanStack). A UI que a diretoria validou não é a que existe. **Previsão:** o mesmo em cada módulo novo; e qualquer auditoria futura de "onde está o formulário X" achará dois: um morto com validação e um vivo sem.

**PD-3 — Segurança declarada nas camadas que não executam.** RLS excelente e testada + conexão superuser em 100% das leituras/escritas + gates só em mutação + zero verificação de papel em layout/página = módulos operando com 0–1 das 3 camadas prometidas. As SESSIONS descrevem a intenção ("enforçado na aplicação", "enforced no Server Action") que o código não contém. A decisão (B) do Filipe resolve a raiz; até lá, cada página nova nasce exposta.

**PD-4 — Débito remetido a prompt que não o cobre, liquidado silenciosamente, ou nunca.** Casos: "middleware real em P-1.18" (prompt de schema); prefill do wizard remetido a "prompt UI de documentos" (fase já encerrada); enum de audit e attachments liquidados em commits sem sessão; notificações de admin/documentos e enrollment de MFA nunca. O SESSIONS registra débitos bem, mas não há mecanismo de recolhimento — débito registrado ≠ débito com dono.

**PD-5 — O registro histórico subrepresenta e às vezes contradiz o código.** Subrepresenta: `3be389f`/`a088f6c`/S-45 (milhares de linhas sem sessão). Contradiz: S-52/S-53 (designation), S-38/S-39 (mascaramento de score "na aplicação"), P-1.12 ("end-to-end"). Critérios [x] no PROMPTS não sobrevivem à verificação em ~8 prompts. Consequência direta para a Fase 4: **nenhum [x] de PROMPTS.md pode ser tratado como fato sem verificação pontual.**

---

## 4. O que está genuinamente sólido (honestidade de auditoria)

- **Migrations e RLS como artefatos SQL**: deny-by-default em todas as tabelas dos 4 schemas, policies granulares, triggers de imutabilidade e limites — qualidade alta e consistente.
- **Testes**: 11 suítes de integração reais contra banco (admin, documentos, projetos), cobrindo RLS por papel, state machine, quórum, versionamento, fluxo completo. Não são testes de fachada.
- **Imutabilidade financeira**: trigger + INSERT-only + estorno com guarda dupla — em profundidade.
- **Design system pós-P-0.2b/P-1.12b**: tokens canônicos, patterns sem hex, admin.css esvaziado.
- **Auditoria de mutações**: `logAudit` consistente nos 4 módulos, com anotação de impersonação.
- **Lint/typecheck**: 34/34 hoje, TS strict sem `any` visível nos arquivos lidos.

---

## 5. Perguntas para o Filipe (Fase 2)

1. **(F2-A1/D1/D2/P4)** Os quatro críticos de exposição só se materializam com deploy público. Os apps admin/documentos/projetos estão hoje **deployados e acessíveis** (Vercel, domínios reais), ou rodam apenas em localhost? A resposta define se isso é "corrigir antes de retomar" ou "incidente ativo a mitigar agora".

R. OS apps só rodam em localhost no momento. Nada foi deployado e está acessível publicamente.

2. **(F2-A3)** Enquanto o auto-signup (O-1) não existe: os ~150 usuários atuais serão criados manualmente pelo Supabase Dashboard, ou o fluxo de convite deve ser consertado primeiro (criar conta + papéis + página `/convite`)? Isso muda a prioridade do prompt corretivo de onboarding.

R. Enquanto o auto-signup não existe, o fluxo de convite deve está funcionamento maravilhosamente bem. Não irei criar usuários manualmente no Supabase.

3. **(F2-P1)** A fiação UI→actions de Projetos (submeter, transicionar, contestar, avaliar, relatar) não tem prompt dono — P-2.9 já foi "concluído". Prefere um corretivo P-2.9c dedicado (recomendo), ou empacotar isso na rodada de correções da Fase 4 da auditoria?

R. Sigo a sua recomendação: prompt corretivo.

4. **(F2-F1)** A semântica implementada da governança dual é "qualquer diretor aprova; super_admin autoriza; aprovador ≠ autorizador". O BRAIN pede "diretor **gestor** aprova; diretor **autorizador** autoriza". Confirma que devo tratar o modelo do BRAIN como alvo (checagem de designation nas actions) e o atual como desvio a corrigir?

R. Você está correto. O diretor gestor aprova e o diretor autorizador autoriza no banco. Você deve tratar o modelo do BRAIN como alvo.

5. **(F2-P6)** Qual a regra de encerramento de votação quando há quórum e maioria mas nem todos votaram? (ex.: encerra na reunião mensal; encerra após N dias; só fechamento manual do super_admin). Nenhuma spec define, e o código deixa aberta para sempre.

R. Vamos deixar definido que o super_admin terá o poder de realizar o fechamento manual da votação.

6. **(PD-2)** Os componentes mortos do Bloco A: prefere que a Fase 4 proponha prompts que os **reconectem** (recuperando RHF/TanStack prometidos na stack) ou que os **removam** oficialmente (aceitando as reescritas inline como padrão)? Vale a mesma decisão para os 3 formulários com submit falso.

R. Prefiro que a Fase 4 proponha prompts que reconectem os componentes, recuperando RHF/TanStack prometidos.

---

_Fase 2 concluída. Próxima: **FASE 3 — Auditoria técnica do código (independente das specs)**, em sessão nova. Os achados F2-_ alimentam também a Fase 4 (patches nos prompts pendentes).\*

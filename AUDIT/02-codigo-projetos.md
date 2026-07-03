# AUDIT/02 — Verificação spec ↔ código — Projetos (P-2.1 a P-2.12, P-2.9b, S-45 + commits fora de fluxo)

**Fase:** 2 · **Data:** 2026-07-02 · **Auditor:** agente Fable 5

## Tabela de veredictos

| Prompt | Veredito | Evidência-chave |
| --- | --- | --- |
| P-2.1 Tipos | **Implementado fiel** | S-33 detalhada e coerente; validators com superRefine; mock removido em P-2.9 |
| P-2.2 Componentes | **Implementado; maioria morta** | Vivos: `project-kanban`, `project-timeline`, `evaluation-card`, `score-indicator`, `vote-panel` (via wrapper), `project-card`. Mortos: `organization-card`, `report-card` |
| P-2.3 Páginas | **Implementado com desvio documentado** | Rota `(diretoria)/pipeline/*` em vez de `(diretoria)/*` — registrado (S-37). Escopo citava "envio de relatório, prestação de contas, perfil da instituição" que só ganharam página no S-45 (fora de prompt) |
| P-2.4 Formulários | **Implementado; hoje todo morto, com submits falsos** | `project-wizard.tsx` + 5 steps, `punctual-project-form.tsx`, `report-form.tsx`: **zero imports** (S-41 reescreveu o wizard inline em `novo/page.tsx`). Os mortos contêm submit simulado: `project-wizard.tsx:330`, `punctual-project-form.tsx:217`, `report-form.tsx:281` (`await new Promise(res => setTimeout(res, 1000))`). Critério "[x] Recepção de query params (edital_id…)" hoje só é verdadeiro no componente morto — o wizard real não recebe (F2-P3) |
| P-2.5 Estados | **Implementado fiel** | Skeletons vivos via `loading.tsx` (adicionados fora de fluxo); correção de rota documentada |
| P-2.6 Schema | **Implementado fiel** | `0007_projetos.sql`: 12 tabelas, RLS deny-by-default, trigger de limite de contestação, soft-delete em índices; state machine como constante TS (decisão S-38) |
| P-2.7 RLS | **Implementado fiel** | `0007_projetos_rls.sql:23–121` — reviewer só vê `votacao+`, votes SELECT só super_admin, reports restritos; testado (`rls.test.ts:251–343`) |
| P-2.8 Actions | **Implementado fiel no código; inalcançável na prática** | 17 actions com gates por papel; state machine validada; quórum ≥50% + maioria simples (`voting.ts:64–68`); botão de pânico com desempate documentado (S-40). **Mas ver F2-P1: quase nada disso tem caminho de UI** |
| P-2.9 Integração | **Parcialmente implementado, declarado concluído** | Leitura integrada (dashboards, kanban, detalhe, reunião com BI real — `reuniao/page.tsx:10–14`); mock deletado. **Mutação quase toda desconectada**: ver F2-P1. Critério "[x] Votação funcional" vale (castVote wired); "[x] Wizard salva projeto" vale só para rascunho; kanban não persiste drag (F2-P2) |
| P-2.9b Corretivo | **Implementado fiel** | Layouts Server Component + shells + `logoutAction` (`(diretoria)/layout.tsx:11–14`); **mas o layout só autentica, não autoriza — F2-P4 (CRÍTICO)** |
| P-2.10 Notificações | **Implementado fiel** (com [~] declarados) | 9 funções + override de template via Admin; lembretes dependem de Inngest (documentado). Ressalva: as funções são chamadas pelas actions — que em maioria não são alcançáveis pela UI (F2-P1), logo os fluxos de notificação também não disparam na prática |
| P-2.11 Cross-app | **Parcial (como declarado em SESSIONS)** | `integrations/financeiro.ts` (cost_center na aprovação), `tarefas.ts` (stub), `documentos.ts` (`getEditalPrefill` + score flats). Fire-and-forget `.catch(console.error)` (`actions/projects.ts:564, 648`). Wizard não chama `getEditalPrefill` (F2-P3). PROMPTS marca [x] com 1 [~]; SESSIONS diz parcial — o registro correto é o do SESSIONS |
| P-2.12 Testes | **Implementado fiel** (sem sessão — anomalia já confirmada) | 4 suítes reais e substantivas: fluxo completo de ciclo de vida com transições e payment_schedules (`flow.test.ts:181–460`), quórum/maioria/pânico (`voting.test.ts`), RLS incl. cédula secreta (`rls.test.ts:342+`), state machine (`state-machine.test.ts`). Bloqueio de orçamento testado |
| S-45 "Polish" (fora de prompt, corpo ausente) | **Identificado e auditado** | = commit `dd5ce05`: páginas novas `(submissor)/instituicao` (253 l, leitura, sem action de edição), `(submissor)/relatorios` (211 l, lista real, link p/ detalhe), `(diretoria)/relatorios-dir` (87 l), `stage-utils.ts`, `projetos-logo.tsx`, ajustes de AppShell/sidebar. Leitura OK; nenhum caminho de mutação |
| `a088f6c` (fora de fluxo, sem sessão) | **Funcional; sem registro** | Migration `0008_project_attachments.sql` + upload real no wizard para bucket `project-attachments` (`novo/page.tsx:847–861`). Foi isso que tornou verdadeiro o critério "[x] wizard faz upload de anexos" do P-2.9 — nenhuma sessão o registra |

## Achados detalhados

### F2-P1 (ALTO — o achado central do módulo) — Backend completo, produto inoperante: 3 de 17 actions têm caminho de UI
Grep de imports de `actions/*` em páginas/componentes (fora de testes): apenas `createAnnualDraft`, `createPunctualDraft` (`novo/page.tsx:20–21`) e `castVote` (`vote-panel-wrapper.tsx:5`). Sem nenhum chamador na UI: `submitProject` (**o coração do módulo**: rascunho→validação, bloqueio por orçamento, score IA, versão compacta), `transitionProjectStage`, `createContestation`, `deleteProject`, `triggerPanicButton`, `assignEvaluator`, `submitEvaluation`, `createOrganization`/`updateOrganization`/membros, `createReport`/`submitReport`/`reviewReport`.

Cenários concretos com o código atual:
- Submissor cria rascunho pelo wizard e **não tem botão para submeter** — todo projeto morre em `rascunho`.
- Ainda que submetido (via banco), diretoria **não consegue** movê-lo para votação: o drag do kanban faz `console.log("Move", …)` e nada mais (`pipeline/page.tsx:174`); não há botões de transição no detalhe.
- "Enviar Relatório" no detalhe do submissor é `type="button"` sem handler (`(submissor)/[id]/page.tsx:133–142`); `report-form.tsx` morto tem submit falso de 1s. A regra de negócio central "relatórios obrigatórios/inadimplência" não tem caminho funcional.
- Submissor **não consegue criar instituição** (nenhuma UI chama `createOrganization`) — sem instituição, o wizard não tem o que selecionar; o onboarding do módulo é impossível de ponta a ponta (soma-se ao F2-A3 do Admin: nem conta nova é possível).
- Não existe UI de designação de avaliador nem de parecer; não existe UI de contestação.

Os testes (P-2.12) exercitam essas actions diretamente — por isso passam. O que falta é exclusivamente a fiação UI→action, exatamente o que P-2.9 declarou concluído ("Pipeline kanban reflete stages do banco" ✓ leitura; a intenção óbvia do prompt — operar o pipeline — não).

### F2-P2 (ALTO) — Kanban com drag-and-drop puramente cosmético
`project-kanban.tsx` implementa DnD nativo com estado otimista (P-2.2 ✓), e a página o liga a um handler que só loga (`pipeline/page.tsx:174`). Diretoria "move" o card, o card volta. Não há chamada a `transitionProjectStage`, que existe e é testada.

### F2-P3 (ALTO) — Integração edital→wizard aberta nas duas pontas declaradas concluídas
`novo/page.tsx` não lê `edital_id`/`tipo`/`categoria` de `searchParams` (grep: zero) e não chama `getEditalPrefill` (S-43, débito remetido a "prompt UI do módulo documentos" — que já acabou). O critério "[x]" de P-2.4 refere-se ao wizard antigo, morto. P-1.23 (Documentos) gera a URL correta; ninguém a consome.

### F2-P4 (CRÍTICO) — Área da diretoria acessível a qualquer autenticado; score IA exposto a submissor
`(diretoria)/layout.tsx:11–14` verifica apenas `getAuthUser() !== null` — **nenhuma checagem de papel**. `getDirectorProjectDetail` (`lib/queries.ts:624+`) não verifica o papel do chamador e roda na conexão superuser (RLS bypassada). `pipeline/[id]/page.tsx:122–124` renderiza `<ScoreIndicator score={project.scoreAi} role="diretor" />` com **papel hardcoded** — o componente que encapsula a visibilidade recebe sempre "diretor". Cenário: um submissor autenticado navega para `/pipeline/<uuid>` e vê score IA, breakdown, versão compacta e contagem de votos do próprio projeto (ou de qualquer outro). Viola diretamente BRAIN §6.2 ("score invisível para submissor") — a regra que S-38/S-39 disseram estar "enforçada obrigatoriamente nas Server Actions/aplicação". Divergência SESSIONS × código.

### F2-P5 (MÉDIO) — Quórum conta atribuições, não pessoas
`voting.ts:34–41` conta linhas de `role_assignments` com papel diretor/conselheiro. Usuário com os dois papéis (permitido pelo BRAIN) conta duas vezes no denominador do quórum e no `totalEligible` do fechamento automático — quórum fica artificialmente mais difícil e o auto-fechamento ("todos votaram") pode nunca disparar.

### F2-P6 (MÉDIO) — Votação sem mecanismo de encerramento no caso comum
Fechamento automático só quando `totalVoted >= totalEligible` (`voting.ts:112–115`). Com quórum atingido e maioria formada mas turnout < 100%, a votação fica aberta para sempre: o pânico (super_admin) é a única saída e não tem UI. Nenhum prompt definiu prazo/encerramento de votação — ambiguidade de spec que virou buraco funcional.

### F2-P7 (BAIXO) — Erro engolido como convenção
Integrações e IA disparam fire-and-forget com `.catch(console.error)`/`catch` de continuação (`actions/projects.ts:564, 648`; decisão registrada S-40/S-43). Consistente com o achado transversal S1-22; nenhum caso novo além dos registrados.

### Verificações que passaram
- RLS de projetos é a mais bem construída do repo (reviewer por stage, cédula secreta, org-scoped) e é testada de verdade.
- Trigger de contestação (máx 2/projeto) + UNIQUE (1/pessoa) no banco.
- `payment_schedules` gerados na aprovação — coberto por teste de fluxo.
- P-2.9b entregue exatamente como especificado (o problema de autorização é lacuna do prompt, herdada por G5 — já apontada como S1-08).
- Voto: identidade fora do diff de audit; agregação na UI; `onConflictDoNothing` impede duplo voto.

# Auditoria de conformidade — documentos embrionários × implementação

> **Data:** 2026-08-26 · **Branch:** `fix/P-2.8d-projetos-segundo-voto` (HEAD `ad6fbfe`)
> **Pergunta desta auditoria:** o que foi construído corresponde ao que o Filipe respondeu no levantamento de requisitos?

## Escopo e método

**Fontes normativas (o "contratado"):**

- `.docs/PRD Ecossistema Hebron Aseec.md` — premissas gerais e escopo do módulo Projetos
- `.docs/Respostas.md` a `Respostas10.md` — 164 Q&As de regra de negócio
- `.docs/EDITAL PARA SOLICITAÇÕES DE RESERVA NO FLAT.md` — critérios de pontuação dos Flats
- `.docs/Claude.md` — escopo técnico dos 9 módulos (**documento histórico**, parcialmente revogado)
- `.docs/Identidade Visual da Hebron Aseec.md` — marca

**Fontes de decisão superveniente (o que legitimamente mudou):**

- `BRAIN.md` — fonte da verdade consolidada
- `PATCHES/001` a `PATCHES/028` — 28 mudanças de decisão registradas

**Método:** leitura do código real (schemas Drizzle, Server Actions, rotas, validators, templates de email, jobs), não dos registros de sessão. Cada achado abaixo cita arquivo e linha. Onde uma resposta do Filipe foi posteriormente revogada por PATCH ou por decisão no BRAIN, o item aparece na seção **"Não são desvios"** — não como falha.

**Limite declarado:** esta auditoria compara _especificação × código-fonte_. Não executei `build`, `lint`, `typecheck` nem a suíte de testes; não há aqui juízo sobre saúde de build. Também não é uma re-auditoria técnica — `AUDIT/04-BACKLOG-CORRECAO.md` (11 pacotes, todos executados em S-257…S-272) já cobriu RLS, gates, middleware e robustez.

---

## Legenda

| Símbolo | Significado                                                  |
| ------- | ------------------------------------------------------------ |
| ✅      | Conforme — implementado como especificado                    |
| ⚠️      | Parcial — existe, mas não cobre o que a resposta pedia       |
| ❌      | Divergente ou ausente — precisa de prompt novo               |
| 🔵      | Mudança de decisão registrada — **não é desvio**             |
| ❓      | Pergunta que o Filipe devolveu ao agente e nunca foi fechada |

---

## Sumário executivo

O ecossistema está **substancialmente construído e fiel** nas transversais (auth/SSO/MFA, RBAC+RLS em três camadas, LGPD, design system, notificações, jobs) e em 7 dos 9 módulos. Financeiro, Flats, Tarefas, Documentos, Plataforma e Rádio implementam as regras que o Filipe descreveu com pouca ou nenhuma divergência material.

**A concentração de desvios está no módulo Projetos** — precisamente o módulo que o próprio Filipe identificou como "o maior ponto de fricção, porque é o ponto de contato com o público externo" (Respostas.md Q15). E dentro dele, os desvios não são periféricos: **o estágio de validação foi implementado como um rótulo de status sem nenhuma das capacidades que o definem.**

Três achados encadeados explicam a maior parte do problema:

1. **Não existe "valor aprovado".** A tabela `projetos.projects` só tem `budget_total` (o valor _solicitado_). Não há campo de valor aprovado em lugar nenhum do repositório.
2. **Projeto só é editável em `rascunho`.** `updateDraftProject` rejeita qualquer outro estágio (`apps/projetos/src/actions/projects.ts:581`). Ninguém — nem super_admin — consegue alterar um projeto em validação.
3. **Logo, aprovação parcial é inexprimível.** O PRD ("se o valor aprovado será completo ou parcial") e a Q9 inteira descrevem um mecanismo que o sistema não tem como representar.

Junto com isso caem, por dependência, a comunicação de alteração ao submissor (PRD item 8) e a contestação do submissor durante a validação (Q11, Q32, Q33) — ambas ausentes.

**Placar por módulo:**

| Módulo       | ✅  | ⚠️  | ❌  | Veredito                                                     |
| ------------ | --- | --- | --- | ------------------------------------------------------------ |
| **Projetos** | 14  | 6   | 9   | Fluxo do submissor e da votação sólidos; **validação é oca** |
| Admin        | 10  | 2   | 0   | Bom; achado do banner de impersonação (§2.1) era incorreto   |
| Documentos   | 8   | 1   | 0   | Conforme                                                     |
| Financeiro   | 12  | 1   | 1   | Governança dual exemplar                                     |
| Tarefas      | 9   | 0   | 0   | Conforme, inclusive a visão árvore estilo Xmind              |
| Intranet     | 7   | 2   | 1   | Conforme; "ata" é lista de decisões, não documento           |
| Plataforma   | 8   | 0   | 0   | Conforme                                                     |
| Flats        | 11  | 1   | 0   | Melhor aderência do ecossistema ao documento de origem       |
| Rádio        | 6   | 0   | 0   | Conforme ao escopo simplificado (PATCH-002)                  |
| Transversais | 11  | 3   | 1   | —                                                            |

---

# 1. Módulo Projetos

## 1.1 ❌ Não existe o conceito de "valor aprovado"

**Especificado:**

- PRD, Projetos: _"Os diretores discutem na reunião se aprovam ou não e as condições orçamentárias (se o valor aprovado será completo ou parcial)."_
- PRD item 9: _"os responsáveis pelos projetos devem receber um e-mail com um texto padrão, contendo o projeto aprovado, **o valor aprovado** e o período da parceria."_
- Respostas.md Q9: _"nos projetos pontuais, como os diretores entram em consenso sobre a aprovação ou não, o valor também é um consenso. Sendo assim, **ele é informado no campo da aprovação**."_
- Respostas4.md Q54 (pontual): _"na aprovação da diretoria, o valor pode ser dividido se houver o desejo de ajudar e não houver a possibilidade um pagamento único."_

**Implementado:** nada. `grep -r "approvedAmount|approved_amount|valorAprovado|valor_aprovado"` no monorepo retorna **zero ocorrências**. `projetos.projects` tem apenas `budgetTotal` ([packages/db/src/schema/projetos.ts:220](packages/db/src/schema/projetos.ts#L220)), que é o valor pedido pelo submissor no wizard.

**Consequência em cadeia:** `generatePaymentSchedule` gera as parcelas a partir de `budgetTotal`. Se a diretoria aprovar R$ 30 mil de um pedido de R$ 50 mil, o Financeiro recebe contas a pagar de R$ 50 mil. Não há como o super_admin corrigir isso pelo módulo Projetos.

**Severidade: CRÍTICO.** É o mecanismo central de decisão da associação e ele não existe no modelo de dados.

---

## 1.2 ❌ O estágio "validação" não permite validar nada

**Especificado:**

- Respostas2.md Q23: _"Na fase da validação só poderão alterar os projetos os super_admins."_
- Respostas3.md Q38: _"o projeto estará em validação, onde os super_admins poderão vasculhar os projetos e **modificar todas as informações**."_
- Respostas.md Q9 (anual): _"esse valor já é calibrado com o orçamento **na fase da validação**. Então, ao votar no projeto os diretores também já estão votando no valor apresentado. Caso haja alguma discordância, **o projeto deve retornar para o stage de validação para o valor ser alterado**."_

**Implementado:**

```ts
// apps/projetos/src/actions/projects.ts:581
if (project.stage !== "rascunho") {
  throw new BusinessError(
    "Apenas projetos em rascunho podem ser editados. Solicite nova revisão se necessário.",
  );
}
```

Não há outra ação de escrita sobre `projetos.projects` em nenhum app — `apps/admin/src/actions/` não tem sequer um arquivo de projetos. O `VALID_STAGE_TRANSITIONS` ([packages/db/src/schema/projetos.ts:80](packages/db/src/schema/projetos.ts#L80)) também **não permite `votacao → validacao`**, então o retorno para recalibrar valor descrito na Q9 é impossível.

Na prática, "validação" hoje significa apenas: o projeto ficou visível para a diretoria e é possível designar avaliadores.

**Severidade: CRÍTICO.**

---

## 1.3 ❌ Alteração durante a validação não é comunicada ao submissor

**Especificado (PRD item 8):** _"Qualquer alteração no projeto durante as etapas de validação (stage que os avaliadores podem realizar qualquer alteração no projeto) devem ser comunicadas ao submissor por e-mail."_

**Implementado:** nada — consequência direta de 1.2. Não existe evento de alteração para notificar.

---

## 1.4 ❌ Contestação do submissor durante a validação não existe

**Especificado:**

- Respostas.md Q11: _"O submissor pode contestar as alterações via sistema… o responsável poderá enviar uma mensagem através do sistema."_
- Respostas2.md Q32: _"Só preciso que esse evento gere notificações para os super-admins para que eles respondam a contestação."_
- Respostas2.md Q33: _"Quando o valor for alterado, o submissor será notificado e terá até o prazo de fechamento para a reunião de planejamento (7 dias antes). Uma vez fechado para votação, o submissor não poderá mais contestar."_

**Implementado:** `projetos.contestations` existe, mas é **exclusivamente** a contestação de diretor/conselheiro sobre o resultado da votação:

```ts
// apps/projetos/src/actions/projects.ts:1101
export const createContestation = conselheiroDiretorAction…
  if (project.stage !== "homologacao") { throw new BusinessError(…) }
```

O submissor não tem nenhum canal de contestação, e o Q75 lista "Contestação do submissor → super_admins" como notificação esperada. Ausente.

**Nota:** a Q32 é uma das perguntas que o Filipe devolveu (_"Não tenho isso fechado ainda. Qual é a sua sugestão?"_) e nunca foi fechada — ver §10.

---

## 1.5 ❌ Projeto pontual não passa por homologação

**Especificado (Respostas.md Q1, resposta literal):** _"O pontual também deve passar pela homologação. Isso visa garantir que os diretores e avaliadores saibam do resultado antes dos responsáveis pelo projeto, **caso seja necessário uma contestação do resultado ou valor aprovado**."_

`BRAIN.md` §6.2 concorda: _"Ciclo de vida (mesmo para ambos): rascunho → validação → votação → homologação (7 dias) → aprovado/reprovado…"_

**Implementado — o código diz o contrário, explicitamente:**

```ts
// packages/db/src/schema/projetos.ts:78-84
// pontual: validacao → aprovado | reprovado (skip votacao/homologacao)
validacao: ["votacao", "aprovado", "reprovado"],
```

Como `createContestation` exige `stage === "homologacao"`, uma decisão sobre projeto pontual **nunca pode ser contestada** — exatamente o risco que a Q1 nomeia. Não há PATCH que revogue essa resposta.

**Severidade: ALTO.**

---

## 1.6 ❌ Não há janela de submissão de projetos anuais

**Especificado:**

- PRD item 2: _"O projeto anual só poderá ser enviado num intervalo de tempo pré-determinado, definido no módulo admin (aberto/fechado)."_
- Respostas3.md Q51: _"será uma data de abertura e fechamento definida pelo super_admin no módulo admin."_

**Implementado:** nada. `createAnnualDraft` ([apps/projetos/src/actions/projects.ts:358](apps/projetos/src/actions/projects.ts#L358)) e `submitProject` (:671) não consultam data nenhuma. As únicas chaves de `admin.system_settings` lidas pelo módulo são `projetos_scoring_criteria`, `projetos_compact_template` e `projetos_duplicate_threshold` (:151-179). A tela de Configurações do Admin menciona "janela" apenas em texto explicativo ([apps/admin/src/app/(dashboard)/configuracoes/page.tsx:726](<apps/admin/src/app/(dashboard)/configuracoes/page.tsx#L726>)).

Um edital anual em `documentos` tem datas de abertura/fechamento, mas elas não governam a submissão em `projetos`.

**Severidade: ALTO** — é a válvula que impede submissão fora de época, e a Q51 justifica exatamente como "evitar demandas desnecessárias".

---

## 1.7 ❌ Os três anexos obrigatórios não são coletados

**Especificado (Respostas3.md Q47):** _"O que não pode deixar de ter: Nome do Projeto, nome do responsável, local da execução do projeto (precisamos saber com precisão), valor total do projeto, número de parcelas, meses de pagamento e anexo (**vídeo de apresentação de até 3 minutos, orçamento completo por etapas (planilha) e carta de recomendação**)."_

Respostas4.md Q54 confirma que no pontual esses três viram opcionais, _"porém, é bom que hajam os campos em caso de exigência"_.

**Implementado:** o wizard coleta dois PDFs genéricos e um **checkbox de autodeclaração** para a carta:

```ts
// apps/projetos/src/components/project-wizard-steps/step-attachments.tsx:14
const REQUIRED_DOCS = [
  { id: "projeto", label: "Documento do Projeto", accept: "application/pdf" },
  {
    id: "estatuto",
    label: "Estatuto ou CNPJ",
    accept: "application/pdf,image/jpeg,image/png",
  },
];
```

```tsx
// :115-119 — carta de recomendação é um toggle, não um arquivo
Carta de Recomendação
"Confirmo que possuo carta de recomendação assinada por liderança"
```

O próprio código registra a omissão (:8-13): _"Vídeo e planilha, prometidos pelo P-2.4 original, não cabem neste bucket… exigiriam nova migration de allowed_mime_types."_ Ou seja: foi um contorno técnico, não uma decisão de negócio.

**Impacto:** o vídeo de 3 minutos é, pela narrativa do PRD, o principal insumo de avaliação da diretoria. Hoje não há onde enviá-lo.

---

## 1.8 ❌ "Nome do responsável" não existe

**Especificado:** Q47 lista como campo que "não pode deixar de ter". Respostas4.md Q56 é explícita sobre por que ele é distinto do submissor: _"um executivo de uma agência missionária pode submeter vários projetos, cada um com o seu responsável."_

**Implementado:** `projetos.projects` tem apenas `submitterId` ([packages/db/src/schema/projetos.ts:202](packages/db/src/schema/projetos.ts#L202)). Nenhum campo de responsável. O `annualProjectFields` ([packages/validators/src/projetos/index.ts:66](packages/validators/src/projetos/index.ts#L66)) não coleta.

No cenário da agência missionária, todos os projetos ficam atribuídos ao executivo e o responsável real não é registrável.

---

## 1.9 ⚠️ "Local da execução com precisão" virou dois campos de texto livre

**Especificado:** Q47 pede local _"com precisão"_; Q55 pergunta o formato e o Filipe devolve a pergunta (_"qual seria a melhor forma? Ele digitar um texto livre e ser validado por uma API de endereços globais no backend?"_) — nunca fechada.

**Implementado:** `regiao` (min. 2 caracteres) + `pais` ([packages/validators/src/projetos/index.ts:96-97](packages/validators/src/projetos/index.ts#L96)), gravados em `ministry_region` / `ministry_area`. Sem validação de endereço, sem CEP, sem geocodificação.

**Agravante no pontual:** Respostas4.md Q54 diz que no formulário pontual o básico é _"nome do projeto, **endereço** e valor"_ — e em `createPunctualProjectSchema` `regiao` e `pais` são **opcionais** ([:204-205](packages/validators/src/projetos/index.ts#L204)). Um dos três campos essenciais do pontual pode ficar vazio.

Ver §10 — depende de decisão do Filipe.

---

## 1.10 ⚠️ Relatórios: sem cronograma automático e sem periodicidade por projeto

**Especificado:**

- Respostas2.md Q26: _"O padrão geral é trimestral, mas **deve haver a possibilidade de configurar por projeto**. Por exemplo, projetos de construção solicitamos relatórios mensais."_
- Respostas.md Q5: relatórios _"provocados pelo staff da Aseec (disparo via módulo admin, com avisos periódicos automáticos por e-mail…)"_
- Claude.md §4.2: _"Cronograma de relatórios automático — gerado a partir do prazo de execução."_

**Implementado:**

- ✅ Disparo manual pelo staff: `createReport = diretorAction` ([apps/projetos/src/actions/reports.ts:95](apps/projetos/src/actions/reports.ts#L95))
- ✅ Lembretes automáticos (7 dias antes / na data / antes do vencimento): `packages/jobs/src/crons/projetos.ts`
- ✅ Bloqueio de pagamento por inadimplência: `packages/jobs/src/crons/projetos-inadimplencia.ts:83`
- ❌ Periodicidade por projeto: não existe coluna. "trimestral" aparece só em um comentário ([packages/db/src/schema/projetos.ts:420](packages/db/src/schema/projetos.ts#L420))
- ❌ Geração automática do cronograma: `grep "generateReportSchedule"` → zero ocorrências

Cada relatório precisa ser criado à mão, um a um. É trabalho manual recorrente exatamente do tipo que a Q65 pede para automatizar (_"O objetivo desse ecossistema é reduzir as demandas humanas"_).

---

## 1.11 ⚠️ "Prestação de contas" foi absorvida por "relatório"

**Especificado (Respostas2.md Q28, com o Filipe confirmando a distinção):** _"Relatório é mais formal e estruturado, já a prestação de contas é uma foto, vídeo de alguma atividade específica, nota fiscal de uma compra, etc."_ E Q5: _"a prestação de contas é algo voluntário e estará sempre disponível para quem quiser fazer/enviar."_

**Implementado:** a expressão aparece uma única vez no módulo — como _eyebrow_ decorativo acima do título "Relatórios":

```tsx
// apps/projetos/src/app/(submissor)/relatorios/page.tsx:21
<p className="hb-eyebrow">Prestação de contas</p>
<h1>Relatórios</h1>
<p>Relatórios obrigatórios dos projetos aprovados em execução.</p>
```

A tela lista apenas relatórios **pendentes e obrigatórios**. Não há envio voluntário, nem canal para foto/vídeo/NF avulsos. Claude.md §4.2 listava isso como tela 6 do submissor.

---

## 1.12 ⚠️ Designação de avaliador é 100% manual

**Especificado:**

- Respostas.md Q3: _"Acredito que o ideal seja um misto entre **sugestão do sistema** e designação manual do admin."_
- Respostas2.md Q24: critérios de afinidade = região, categoria, histórico de avaliações
- `BRAIN.md` §6.2: _"mix de sugestão do sistema (afinidade: região, categoria, histórico) + atribuição manual do admin"_

**Implementado:** `assignEvaluator` ([apps/projetos/src/actions/evaluations.ts:31](apps/projetos/src/actions/evaluations.ts#L31)) recebe um `evaluatorId` e grava. Não há função de sugestão em lugar nenhum. ✅ O lembrete por e-mail 7 dias antes da reunião existe (`runEvaluationReminders`, [packages/jobs/src/crons/projetos.ts:90](packages/jobs/src/crons/projetos.ts#L90)).

---

## 1.13 ⚠️ Email de aprovação sem valor aprovado nem período da parceria

**Especificado (PRD item 9):** e-mail com _"o projeto aprovado, o valor aprovado e o período da parceria."_

**Implementado** ([packages/email/src/templates/project-status-change.tsx:65-70](packages/email/src/templates/project-status-change.tsx#L65)):

> _"Temos uma boa notícia: o projeto "{título}" foi aprovado pela diretoria da Hebron Aseec após o período de homologação. Os pagamentos serão processados conforme o cronograma aprovado."_

Sem valor (que aliás não existe — §1.1), sem período.

---

## 1.14 ⚠️ Comprovante de pagamento não chega ao submissor

**Especificado (Respostas4.md Q66):** _"Sim, deverá ver. **Inclusive com o comprovante de pagamento que deverá ser anexado à transação.** Uma outra possibilidade é permitir que o submissor envie uma nota fiscal/recibo do valor recebido."_

**Implementado:** a função de notificação **tem** o parâmetro:

```ts
// packages/integrations/src/financeiro.ts:227-230
export async function notifyProjectPaymentMade(
  paymentScheduleId: string,
  receiptUrl?: string, // ← usado em :303
);
```

Mas o único chamador nunca o passa:

```ts
// apps/financeiro/src/actions/approval.ts:539
await notifyProjectPaymentMade(paymentTx.paymentScheduleId);
```

E não há upload de NF/recibo pelo submissor. ✅ A projeção de pagamentos no dashboard do submissor está implementada ([apps/projetos/src/lib/queries.ts:346](apps/projetos/src/lib/queries.ts#L346)).

---

## 1.15 ⚠️ Submissão vai direto para validação

**Especificado (Respostas3.md Q41):** _"O que muda o stage é quando um **super_admin 'abre' o projeto para validação**."_

**Implementado:** `submitProject` move `rascunho → validacao` no mesmo ato do submissor ([apps/projetos/src/actions/projects.ts:723](apps/projetos/src/actions/projects.ts#L723)). Não há estado de espera para triagem.

Divergência de baixo impacto operacional, mas registrada porque a resposta foi explícita.

---

## 1.16 ❌ Alteração de orçamento não notifica o submissor

**Especificado:**

- Respostas.md Q7: _"Caso o orçamento seja alterado (aumentado), isso pode gerar mais demandas para o submissor, então, ele deve ser informado dessa alteração por e-mail."_
- Respostas2.md Q31: _"[se diminuído] o submissor deverá ser notificado por e-mail e realizar ajustes nos valores solicitados."_
- Respostas5.md Q75: "Orçamento alterado → submissor" consta da lista que o Filipe validou como completa.

**Implementado:** `grep "notifyBudget|orcamento.*alterado"` → zero. A edição de orçamento em `apps/financeiro/src/actions/organization-budgets.ts` não dispara notificação.

---

## 1.17 ✅ O que está fiel em Projetos

| Regra                                          | Fonte             | Evidência                                                                                           |
| ---------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| Voto secreto (RLS restringe SELECT)            | Q42               | `packages/db/src/schema/projetos.ts:366`                                                            |
| Pergunta "sente paz em investir"               | Q20               | `:365`                                                                                              |
| Quórum = metade de diretores + conselheiros    | Q43 / PATCH-007   | `apps/projetos/src/actions/voting.ts:52` (`countEligibleVoters`)                                    |
| Botão de pânico do super_admin                 | Q44 / PATCH-026   | `voting.ts:409` (`triggerPanicButton`)                                                              |
| Mudança de voto até encerrar                   | PATCH-028         | `voting.ts:131` (`castVote`)                                                                        |
| Máx. 2 contestações, 1 por pessoa              | Q17               | UNIQUE `:415` + trigger no banco                                                                    |
| Contestação retorna à votação                  | Q17               | `projects.ts:1101` em diante                                                                        |
| Homologação automática após 7 dias             | Q16 / PATCH-026   | `packages/jobs/src/crons/projetos.ts:142`                                                           |
| Renovação com `parent_project_id`              | Q19               | `schema/projetos.ts:206` + `findRenewalCandidate` (`projects.ts:228`)                               |
| Detecção de duplicidade (embeddings)           | PRD 5 / PATCH-012 | `schema/projetos.ts:246` + `packages/ai/src/projects/duplicate-detection.ts`                        |
| Score de IA oculto ao submissor                | Q49               | `schema/projetos.ts:242` (comentário) + RLS                                                         |
| Critérios de IA configuráveis (JSON)           | Q50, Q63          | `projects.ts:147` (`projetos_scoring_criteria`)                                                     |
| Versão compacta editável pelo submissor        | Q58, Q62          | `packages/ai/src/projects/compact-version.ts` + `compact_versions`                                  |
| Bloqueio por orçamento da instituição          | PRD 3, Q8         | `packages/integrations/src/projetos.ts:70` — "Contate o administrador"                              |
| Instituição N:N com submissores                | Q72               | `organization_members` (`schema/projetos.ts:150`)                                                   |
| Cadastro de instituição com os campos da Q71   | Q71               | `schema/projetos.ts:120` (nome, cnpj, endereço, telefone, responsável legal, denominação, estatuto) |
| Wizard escolhe pontual/anual na 1ª etapa       | PRD 1             | `project-wizard.tsx:66`, `ANNUAL_STEPS`/`PONTUAL_STEPS` (:137-146)                                  |
| Pontual sem parcelas                           | Q54               | `project-wizard.tsx:131` (pula "Cronograma")                                                        |
| Soft-delete com justificativa obrigatória      | Q6                | `deleteProjectSchema` (`validators:297`) + `deleteProject` (`projects.ts:1196`)                     |
| Pauta da reunião com BI financeiro             | Q34, Q74          | `apps/projetos/src/app/(diretoria)/reuniao/page.tsx` (`getMeetingBIData`)                           |
| Parecer visível / voto não                     | Q39               | `evaluations.recommendation` + `notes` públicos; `votes` sob RLS                                    |
| Pagamentos criados na aprovação, não aprovados | Q65, Q133         | `projects.ts:1035` (`generatePaymentSchedule` + `onProjectApproved`)                                |
| Meses de pagamento escolhidos pelo submissor   | Q45 / P-2.6c      | `meses_pagamento` (`schema/projetos.ts:227`)                                                        |

---

# 2. Módulo Admin

## 2.1 ~~❌ Banner de impersonação só existe dentro do Admin~~ — **achado incorreto**

> **Correção (verificação em código, 2026-08-26, ao gerar os prompts):** o achado
> abaixo é falso. O componente vive em
> `packages/ui/src/components/impersonation-banner.tsx`, o `AppShell` o renderiza
> ([app-shell.tsx:329](packages/ui/src/components/app-shell.tsx#L329)) e **os 9
> apps passam a prop** — 12 layouts, todos chamando `getActiveImpersonation`:
> admin `(dashboard)`, projetos `(diretoria)`/`(submissor)`, plataforma
> `(aluno)`/`instrutor`, radio `admin`, financeiro `(dashboard)`, intranet
> `(dashboard)`, documentos `editorial`, flats `(hospede)`/`admin`, tarefas
> `(dashboard)`. Provavelmente o achado é anterior ao PACOTE 6 (S-262). **Não
> gera prompt** — `P-1.28` foi cancelado. O texto original fica abaixo para
> rastreabilidade.

**Especificado:** Claude.md §4.1 — _"Impersonation auditada (super-admin pode 'assumir' um usuário para suporte, **com banner persistente** e log obrigatório)"_; `BRAIN.md` §6.1 repete "banner persistente". A Q88 é enfática sobre a importância (_"tivemos que utilizar ferramentas de acesso remoto (AnyDesk)… a funcionalidade é completamente necessária"_).

**Implementado:** a troca de identidade é feita na camada de sessão compartilhada (`packages/auth/src/server.ts:62`, `impersonation.ts`), portanto vale nos 9 apps. Mas o banner existe apenas em `apps/admin/src/components/admin-shell.tsx`. Não há componente de banner em `packages/ui`.

**Consequência:** o super_admin que impersona um submissor e navega até `projetos.hebronaseec.com.br` — que é justamente o cenário de suporte da Q88 — **opera como outra pessoa sem nenhum aviso na tela**. Risco real de ação atribuída ao usuário errado.

**Severidade: ALTO.**

## 2.2 ⚠️ Templates de email: 4 de ~30 são editáveis pelo Admin

**Especificado (Respostas.md Q10):** _"**Nada deve ser hardcoded.** Todos os templates de e-mail devem ser definidos no módulo admin."_

**Implementado:** a infraestrutura está correta e funciona — `admin.email_templates` ([packages/db/src/schema/admin.ts:253](packages/db/src/schema/admin.ts#L253)) + `interpolateStoredTemplate` + precedência sobre o componente React. Mas só **4 slugs** têm chamador: `invitation`, `password-reset`, `welcome` e `projetos-payment-made`.

Os outros ~26 templates em `packages/email/src/templates/` são componentes React fixos. Entre eles, justamente o `project-status-change` — que o PRD item 9 chama de "texto padrão" e que a Q10 usava como exemplo.

## 2.3 ⚠️ Sem geração de template por IA

**Especificado (Q52):** _"o super_admin pode descrever os aspectos do texto do e-mail para que a IA aplique num template em HTML/React Email."_ `BRAIN.md` §8 lista "Templates de email editáveis com IA" como **mantido na v1**.

**Implementado:** `packages/ai/src/` contém apenas `projects/`, `flats/` e `financeiro/`. Sem geração de email.

## 2.4 ✅ O que está fiel em Admin

| Regra                                                       | Fonte     | Evidência                                                                          |
| ----------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| Suspensão granular por módulo                               | Q78       | `users.suspendedModules` (`schema/public.ts:80`)                                   |
| Designações gestor/autorizador como configuração, não papel | Q152      | `public.designations` (`schema/public.ts:144`)                                     |
| Conflito de interesse diretor/conselheiro                   | Q80       | `findRoleSetConflict` / `findUserRoleConflict` (`@hebron/db/conflict-of-interest`) |
| Super_admin submete em nome de terceiros                    | Q80       | `submissorAction` aceita `super_admin` (`safe-action.ts:29`)                       |
| Reunião mensal auto-criada, editável                        | Q160      | `admin.meeting_sessions` + cron `ensureMonthlyMeetings`                            |
| Presidente designado por reunião (flag, não papel)          | Q22, Q37  | `meeting_sessions.chairUserId` (`schema/admin.ts:271`)                             |
| Auditoria só para super_admin                               | Q86       | rota `(dashboard)/auditoria` sob gate de super_admin                               |
| Papéis independentes, múltiplos por usuário                 | Q79, Q80  | `public.role_assignments`                                                          |
| Convites com expiração                                      | Claude.md | `apps/admin/src/actions/invitations.ts`                                            |

---

# 3. Módulo Financeiro

## 3.1 ⚠️ Lote semanal aprovado ≠ autorizado: quem autoriza é diretor, não o fluxo do Q148

**Especificado (Respostas9.md Q148):** _"A autorização é feita no banco (internet banking ou app) e depois **o super_admin marcaria as transações como pagas**."_ E Q133: o diretor gestor aprova; outro diretor autoriza.

**Implementado:** `authorizeBatch = diretorWithDesignationAction("autorizador")` ([apps/financeiro/src/actions/approval.ts:330](apps/financeiro/src/actions/approval.ts#L330)), com guarda de governança dual explícita (:359-363). Isso é **mais rigoroso** que o descrito (exige o autorizador registrar no sistema, além do banco). Não é um defeito, mas é uma divergência de fluxo operacional que vale validar com o Filipe: hoje o segundo diretor precisa entrar no sistema — no processo real descrito por ele, isso não acontecia.

## 3.2 ❌ Sem tela de DRE — **mas isso é correto**

Claude.md §4.5 tela 8 pede "DRE simplificada por período". A Q104 revoga: _"Nós temos uma empresa terceirizada que faz a gestão contábil… Quando precisamos de algum documento oficial (balancete, DRE, etc.), solicitamos à empresa."_ → classificado como 🔵, ver §9.

## 3.3 ✅ O que está fiel em Financeiro

| Regra                                                     | Fonte      | Evidência                                                         |
| --------------------------------------------------------- | ---------- | ----------------------------------------------------------------- |
| Governança dual (aprova ≠ autoriza)                       | Q148, Q101 | `approval.ts:359` — guarda explícita                              |
| Lote semanal agrupado automaticamente, email pelo sistema | Q149       | `getWeeklyBatchWindow` / `createWeeklyBatch`                      |
| Autorizador em cópia no email de aprovação                | Q148       | `approval.ts:165` (`cc: autorizadorEmails`)                       |
| Importação OFX/CSV para conciliação                       | Q103       | rota `(dashboard)/importacao` + `actions/import.ts`               |
| Match por valor + data + descrição                        | Q102 / P-8 | `actions/conciliation.ts:54`                                      |
| Export mensal PDF + XLSX + ZIP de comprovantes, manual    | Q132, Q159 | `exportMonthlyReport` (`actions/reports.ts:255`, `archiver` :230) |
| Múltiplas contas bancárias                                | Q97        | `financeiro.accounts` + `actions/accounts.ts`                     |
| Plano de contas hierárquico editável                      | Q98        | rota `plano-contas` + `actions/categories.ts`                     |
| Orçamento por instituição, ano-calendário                 | Q7, Q30    | `financeiro.organization_budgets` (PATCH-009)                     |
| Imutabilidade por estorno                                 | Claude.md  | `transaction_reversals`                                           |
| OCR de nota fiscal                                        | Q155       | `packages/ai/src/financeiro/ocr.ts` + `actions/ocr.ts` (P-3.8c)   |
| Relatório financeiro mensal por email à diretoria         | Q105       | `templates/monthly-financial-report.tsx` + cron                   |
| Auxílio de flat vira despesa automática                   | Q139       | `packages/integrations/src/financeiro.ts:87-171`                  |

---

# 4. Módulo Flats

**É o módulo com melhor aderência ao documento de origem.** O edital foi transposto criterioso item a item.

| Regra                                                        | Fonte               | Evidência                                                     |
| ------------------------------------------------------------ | ------------------- | ------------------------------------------------------------- |
| 10 critérios de pontuação (a–j)                              | Edital §4           | `scoringCriterionEnum` (`schema/flats.ts:92`)                 |
| Máximo 75 pontos (sem laudo médico)                          | Q151, Q156 / P-7.1b | `apps/flats/src/lib/notifications.ts:155` — "/75"             |
| Saúde binária, sem dado médico confidencial                  | Q151, Q156          | critério `d_saude` sim/não                                    |
| Desempate: idade → tempo sem descanso → nunca usou → sorteio | Edital §5           | `apps/flats/src/lib/tie-break.ts:34`                          |
| Participação prévia em projetos auto-calculada               | Q157                | integração `projetos-flats`                                   |
| 7 dias por 12 meses, por indivíduo                           | Q125, Q140          | `MAX_DAYS_PER_12_MONTHS` (`actions/reservations.ts:39`, :138) |
| 3 períodos de preferência (faixas livres)                    | Q137                | `flats.preferred_periods` + `daterange` (P-7.6b)              |
| Aprovação pelo diretor gestor                                | Q123                | `reviewReservation = gestorAction` (`actions/approval.ts:29`) |
| Diretor/conselheiro não pode se hospedar                     | Q80 / BRAIN §6.8    | `actions/reservations.ts:115` — mensagem literal de conflito  |
| Acompanhantes: nome, CPF, nascimento; menores de 3 anos      | Q158                | `flats.guests` (`isUnder3`, `reservations.ts:216`)            |
| Veículo: placa, cor, modelo, marca                           | Q158                | `flats.vehicles` (`schema/flats.ts:260`)                      |
| Documento do responsável                                     | Q158 / P-7.9c       | `flats.document_files` (`schema/flats.ts:390`)                |
| Check-in presencial (sem fechadura digital)                  | Q124, Q155          | `actions/checkin.ts` só registra transição                    |
| Auxílio (diária + transporte) → despesa D-1                  | Q139                | `packages/integrations/src/financeiro.ts:87`                  |
| 2 unidades, capacidade 6, 2 quartos com suíte                | Q121                | `flats.units` defaults (`schema/flats.ts:121`)                |
| IA sugere pontuação subjetiva, gestor confirma               | Q150 / PATCH-012    | `packages/ai/src/flats/scoring-assistance.ts`                 |

⚠️ **Único ponto:** `breakTie()` é uma função pura, testada, mas **não chamada no servidor** — a fila de aprovação (`components/approval-queue.tsx:49-77`) reimplementa a ordem de desempate só para exibição. O próprio arquivo documenta isso ([lib/tie-break.ts:15-18](apps/flats/src/lib/tie-break.ts#L15)). Duplicação de regra com risco de divergir. Baixo impacto hoje (o gestor decide manualmente), mas é dívida.

---

# 5. Módulo Tarefas — conforme

| Regra                                       | Fonte      | Evidência                                                        |
| ------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| 6 workspaces fixos                          | Q110       | `workspaceSlugEnum` (`schema/tarefas.ts:18`)                     |
| Qualquer colaborador cria tarefa            | Q108       | gates de `apps/tarefas/src/lib/safe-action.ts`                   |
| Diretores recebem pedidos de aprovação      | Q109       | `tarefas.approval_requests` (`schema/tarefas.ts:384`)            |
| **Visão árvore estilo Xmind**               | Q107, Q135 | `components/tree-view.tsx` + `BoardView = kanban\|lista\|arvore` |
| Recorrências (mensal, anual, semanal)       | Q111       | `tarefas.recurrence_rules` + rota `/recorrentes`                 |
| Templates com gatilhos                      | Q136       | `tarefas.task_templates` + rota `/templates`                     |
| Tarefas auto-geradas atribuídas manualmente | Q112       | `taskSourceEnum` + P-4.8b                                        |
| Modo foco com pomodoro                      | Q155       | rota `(dashboard)/foco`                                          |
| Time tracking                               | Q155       | `tarefas.time_entries` (`schema/tarefas.ts:253`)                 |

---

# 6. Módulo Intranet

## 6.1 ⚠️ "Ata" é uma lista de decisões, não uma ata

**Especificado (Q83):** _"A ata da reunião é registrada no sistema… acredito que a intranet, que é onde os diretores/conselheiros consumirão as informações, faz mais sentido."_

**Implementado:** `intranet.meeting_decisions` — decisões estruturadas registradas pelo presidente da sessão (`apps/intranet/src/actions/decisions.ts:59`, PATCH-017). Não há documento de ata, upload de anexo nem texto corrido.

A transcrição por Whisper é legitimamente v2+ (`BRAIN.md` §8) — 🔵. Mas o registro da ata em si foi pedido para a v1.

## 6.2 ✅ O que está fiel em Intranet

| Regra                                       | Fonte            | Evidência                                                               |
| ------------------------------------------- | ---------------- | ----------------------------------------------------------------------- |
| 4 KPIs iniciais                             | Q114 / PATCH-008 | `actions/kpis.ts:148-261` (projetos ativos, alunos, doações, audiência) |
| Briefing opt-in com frequência configurável | Q115             | `intranet.briefing_preferences` + `actions/briefing.ts`                 |
| Diretório com todos os públicos             | Q116             | rota `(dashboard)/diretorio`                                            |
| Presidente de sessão registra decisões      | Q22 / PATCH-017  | `actions/decisions.ts:59`                                               |
| Busca unificada cross-app                   | Claude.md §4.6   | rota `(dashboard)/busca` (P-5.8c)                                       |
| Decisão de reunião vira tarefa              | Q136 / BRAIN §7  | `packages/integrations/src/tarefas.ts` (P-5.11b)                        |
| Calendário com export `.ics` / Google       | PATCH-027        | P-5.13, `(dashboard)/calendario`                                        |
| Anúncios (normal/importante/urgente)        | Q113 / BRAIN     | `actions/announcements.ts`                                              |

---

# 7. Módulo Documentos — conforme

| Regra                                                 | Fonte     | Evidência                                                    |
| ----------------------------------------------------- | --------- | ------------------------------------------------------------ |
| Visibilidade `public\|internal\|restricted` por papel | Q92, Q94  | `documentos.documents.visibility` + RLS (P-1.19b/c)          |
| Só super_admin publica; colaborador pode ser editor   | Q93       | gates da área `/editorial`                                   |
| Editais pontuais permanentes / anuais com janela      | Q91       | `edital-form.tsx:570` — "Sempre disponível, sem janela"      |
| "Submeter projeto" pré-preenche tipo + categoria      | Q95       | `parseProjetoNovoParams` (`project-wizard.tsx:411`, P-1.23b) |
| Versionamento com histórico                           | Q91       | `documentos.versions`                                        |
| Assinatura por categoria com alerta                   | Claude.md | rota `/assinaturas` (P-1.16b, P-1.22b)                       |
| Registro de leitura com retenção LGPD de 6 meses      | F3-21     | `views_monthly_agg` + `purge_old_views()`                    |

---

# 8. Módulos Plataforma e Rádio — conformes

**Plataforma** (Q117–Q120, Q145–Q147):

- ✅ Acesso livre a todos os cursos para qualquer cadastrado (Q119)
- ✅ Certificado automático ao concluir a trilha, com hash público (Q120 / PATCH-010) — rota `/certificado/verificar`
- ✅ Estrutura pronta para papel professor (Q118) — `plataforma.instructors`, rota `/instrutor/equipe` (P-6.13, P-6.19)
- ✅ Busca simples por título/série/categoria (Q147) — `searchCourses`, sem pgvector
- ✅ Fóruns por aula (Q146, mantido na v1) — `discussions` criado junto com a aula (`actions/courses.ts:354`)
- ✅ Série como coleção temática (PATCH-024)
- ✅ Vídeo via Bunny Stream (P-6.20)

**Rádio** (Q126–Q130, Q142–Q144 / PATCH-002):

- ✅ Sem AzuraCast, VPS, grade, DJs, podcasts ou pedidos musicais
- ✅ Conteúdo organizado por autor e série (Q142) — rotas `/autores`, `/series`
- ✅ Ouvir sem cadastro; materiais exclusivos exigem aceite de termo único por usuário (Q129, Q143) — `actions/terms.ts:15`, RLS `exclusive_materials_select_term_accepted`
- ✅ PWA (`app/manifest.ts`)

---

# 9. Transversais

## 9.1 ✅ Conformes

| Regra                                             | Fonte            | Evidência                                                     |
| ------------------------------------------------- | ---------------- | ------------------------------------------------------------- |
| Login: só email+senha e magic link                | Q163             | `login-form.tsx:21` — `AuthMode = "password" \| "magic_link"` |
| MFA TOTP obrigatório e bloqueante                 | Q164 / PATCH-005 | `(auth)/mfa/enroll`, `(auth)/mfa/challenge` (P-1.26, P-1.26b) |
| SSO por cookie no domínio raiz                    | Claude.md §3.2   | `packages/auth`, `CANONICAL_LOGIN_URL`                        |
| RBAC + RLS + middleware (3 camadas)               | PRD 9, Q80       | middleware nos 8 apps (PACOTE 3) + decisão B (PATCH-004)      |
| Notificações: só in_app + email                   | Q161             | `notificationChannelEnum` (`schema/notifications.ts:17`)      |
| Sino + central compartilhados; clique leva à tela | Q162             | P-0.6b/c em todos os apps; rotas `/notificacoes`              |
| Consentimento granular LGPD                       | BRAIN §9         | `public.consents` (`schema/public.ts:176`)                    |
| "Meus dados" em todos os 9 apps                   | Claude.md §5.4   | 9 rotas `meus-dados` confirmadas                              |
| Exclusão LGPD por anonimização                    | PATCH-006        | `packages/db/src/anonymization.ts` (P-9.2, PACOTE 1)          |
| PII redigida no audit log                         | BRAIN §9         | `SENSITIVE_AUDIT_FIELDS` (`packages/db/src/audit.ts`)         |
| Parkinsans + Titillium via `next/font`            | PATCH-001        | 9 apps (intranet carrega nos layouts de grupo)                |
| App nunca importa de outro app                    | BRAIN §7         | `pnpm check:cross-app-imports` no CI                          |

## 9.2 ⚠️ Higiene de design system

Violações residuais de "nunca hex no código de app" (`BRAIN.md` §5) — todas cosméticas, nenhuma bloqueante:

- `#4a6009` repetido em 4 telas do Admin — `convites/page.tsx:208`, `lgpd/page.tsx:150`, `usuarios/page.tsx:223`, `usuarios/[id]/page.tsx:220`. Não é token; parece um verde escuro derivado à mão de `--hb-green`.
- `#ffffff` / `#e5e7eb` em `apps/admin/src/components/audit-log-filters.tsx:75-76` — cinza genérico do Tailwind em vez de `--surface` / `--border`.
- **`Inter` ainda presente** em `apps/admin/src/components/email-template-preview.tsx:51` — fonte explicitamente proibida pelo PATCH-001. O P-0.6e removeu do `EmailLayout`, mas o preview do Admin ficou.
- Emails de status usam `#16A34A` / `#DC2626` (verde e vermelho do Tailwind) em vez de `--hb-green` / `--hb-red` — `templates/project-status-change.tsx:67,75`. Em email o literal é inevitável, mas o valor deveria vir da paleta Hebron.

_Fora de escopo desta crítica (literais legítimos):_ geradores de PDF `@react-pdf/renderer`, `app/manifest.ts`, e o HTML dos templates-semente em `configuracoes/page.tsx` — email não resolve CSS variables.

---

# 10. Perguntas nunca fechadas

Nestes pontos o Filipe devolveu a pergunta ao agente e não houve resposta posterior nem no BRAIN nem em PATCH. **A implementação escolheu sozinha** — contrariando o princípio "Sem suposições".

| #    | Pergunta                                                    | O que o código decidiu                               | Precisa decisão? |
| ---- | ----------------------------------------------------------- | ---------------------------------------------------- | ---------------- |
| Q55  | Formato do "local de execução com precisão"                 | Dois textos livres (`regiao`, `pais`), sem validação | **Sim** — §1.9   |
| Q32  | Formato da contestação do submissor (thread vs. formulário) | Não implementou nada                                 | **Sim** — §1.4   |
| Q87  | "Replay serve para desfazer ou visualizar?"                 | BRAIN deferiu para v2+ (só busca de logs)            | Não (🔵)         |
| Q84  | Feature flags: técnicas ou de negócio?                      | BRAIN §6.1 fechou: técnicas                          | Não (🔵)         |
| Q113 | Diretores produzem conteúdo na Intranet?                    | BRAIN §6.6 fechou: sim, anúncios curtos              | Não (🔵)         |

---

# 11. Não são desvios — decisões registradas

Itens do `Claude.md` / PRD que **não** devem ser cobrados, porque o próprio Filipe os revogou:

| Item removido                                       | Revogado por                                                          |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| Inter + Source Serif 4                              | PATCH-001 → Parkinsans + Titillium                                    |
| Google OAuth                                        | Q163 / PATCH-003                                                      |
| Push (OneSignal) e SMS                              | Q161 / PATCH-003                                                      |
| AzuraCast, Icecast, VPS, DJs, grade, podcasts       | Q144, Q153 / PATCH-002                                                |
| Doações Pix                                         | Q106, Q155 / PATCH-003                                                |
| Busca semântica / pgvector (Plataforma, Documentos) | Q147, Q155 — mas **mantida** para duplicidade de projetos (PATCH-012) |
| Transcrição Whisper, recomendação, modo offline     | Q155 / PATCH-003                                                      |
| Open Finance (Pluggy/Belvo)                         | Q155                                                                  |
| Audit replay                                        | Q87 / BRAIN §8                                                        |
| Check-in autônomo e `pricing_rules` (Flats)         | Q122, Q124, Q155 / PATCH-003                                          |
| DRE / balancete (Financeiro)                        | **Q104** — contabilidade terceirizada                                 |
| Operações em lote de usuários                       | BRAIN §8                                                              |
| Workspaces customizáveis, colunas customizáveis     | PATCH-011 (D-5)                                                       |
| Checklist de inventário no check-in                 | PATCH-011 (D-5)                                                       |
| Landing page                                        | Q14 / PRD — fora do escopo                                            |
| Sincronização bidirecional Google Calendar          | PATCH-027 → export unidirecional                                      |
| Google Stitch como ferramenta                       | Q13 → substituída por Claude Code                                     |

---

# 12. Backlog proposto

> **Status (2026-08-26):** os prompts foram redigidos por inteiro em
> `PROMPTS.md`, seção _"Conformidade requisitos × implementação (2026-08-26)"_,
> depois de conferidos contra o código. Quatro ajustes ao que está proposto
> abaixo: **`P-1.28` cancelado** (§2.1 é achado falso); **`P-2.21` dividido** —
> responsável (executável) fica em `P-2.21`, local de execução (bloqueado pela
> Q55) vira `P-2.26`; **`P-2.14b` criado** para subir as regras ao BRAIN antes
> da Onda A; e `P-2.22`…`P-2.25` mantêm a numeração original.

Prompts novos, em ordem de execução sugerida. As dependências estão explícitas — **P-2.15 destrava P-2.16 e P-2.17**.

## Onda A — o núcleo da decisão (bloqueia go-live de Projetos)

### `P-2.15` — O valor aprovado que o sistema nunca soube registrar

Adiciona `projetos.projects.approved_amount` (+ `approved_notes`) e o caminho de escrita. Migration, action `registerDecision` restrita à designação **diretor gestor** (hoje qualquer `diretorAction` aprova — §1.5), UI de aprovação com campo de valor e observação, e `generatePaymentSchedule` passando a ler `approved_amount ?? budget_total`.
_Fecha: §1.1. Fontes: PRD, Q9, Q54._
_Critério de aceite: aprovar pontual de R$ 50 mil com valor aprovado de R$ 30 mil gera payables somando R$ 30 mil._

### `P-2.16` — A validação que só sabia mudar de nome

Permite ao super*admin editar projeto em `validacao`; adiciona `votacao → validacao` ao `VALID_STAGE_TRANSITIONS`; dispara email ao submissor a cada alteração, com diff dos campos.
\_Fecha: §1.2, §1.3. Fontes: Q23, Q38, Q9, PRD item 8.*
_Depende de: P-2.15._

### `P-2.17` — A contestação que só o outro lado podia fazer

Canal de contestação do submissor durante a validação, com prazo (fecha 7 dias antes da reunião, Q33) e notificação aos super*admins.
\_Fecha: §1.4. Fontes: Q11, Q32, Q33, Q75.*
_⚠️ **Requer decisão do Filipe antes de escrever:** thread de mensagens ou formulário estruturado? (Q32 nunca fechada.)_

### `P-2.18` — O pontual que pula a homologação

Corrige `VALID_STAGE_TRANSITIONS` para `validacao → homologacao` também no pontual, ou registra um PATCH revogando a Q1.
_Fecha: §1.5. Fonte: Q1._
_⚠️ **Requer decisão:** a Q1 é explícita, mas o código a contradiz há muitas sessões. Se a prática mudou, o certo é um PATCH — não deixar código e spec discordando em silêncio._

## Onda B — o que o submissor precisa e não tem

### `P-2.19` — A janela de submissão que nunca fechou

`admin.system_settings["projetos_janela_anual"]` (data início/fim) + bloqueio em `createAnnualDraft` e `submitProject` + UI no Admin + aviso na tela do submissor.
_Fecha: §1.6. Fontes: PRD item 2, Q51._

### `P-2.20` — Os três anexos que a diretoria pediu e o formulário não aceita

Amplia `allowed_mime_types` / `file_size_limit` do bucket `project-attachments` (ou roteia vídeo para Bunny Stream), tipa os anexos (`kind: video | planilha | carta | outro`), torna os três obrigatórios no anual e opcionais no pontual, e substitui o checkbox de carta por upload real.
_Fecha: §1.7. Fontes: Q47, Q54._

### `P-2.21` — Responsável e local: os dois campos essenciais que faltam

Adiciona `responsavel_nome` (+ contato) ao projeto; define e implementa o formato de "local da execução"; torna endereço obrigatório no pontual.
_Fecha: §1.8, §1.9. Fontes: Q47, Q54, Q55, Q56._
_⚠️ **Requer decisão:** formato do local (Q55 nunca fechada). Sugestão: CEP + logradouro + cidade/UF + país, com CEP validado por ViaCEP no Brasil e texto livre fora dele._

### `P-2.22` — O cronograma de relatórios que ninguém gera

`projects.report_frequency` (`mensal|trimestral|semestral`, default trimestral) + geração automática do cronograma na entrada em `em_execucao`, derivada dos meses de pagamento.
_Fecha: §1.10. Fontes: Q26, Q5, Claude.md §4.2._

### `P-2.23` — A prestação de contas que virou subtítulo

Entidade própria (voluntária, sempre disponível, sem prazo): foto/vídeo/NF anexados a um projeto em execução, tela de envio e listagem no detalhe do projeto.
_Fecha: §1.11. Fontes: Q5, Q28, Claude.md §4.2 tela 6._

## Onda C — comunicação e suporte

### ~~`P-1.28` — O banner de impersonação que só o Admin mostra~~ — **CANCELADO**

Verificado em código ao gerar os prompts: o banner já está em `packages/ui`, o
`AppShell` o renderiza e os 9 apps passam a prop (12 layouts). Ver a correção em
§2.1. Nada a fazer.

### `P-2.24` — Três notificações prometidas que nunca saem

(a) email de aprovação com valor aprovado e período da parceria (depende de P-2.15); (b) notificação ao submissor quando o orçamento da instituição muda; (c) `receiptUrl` propagado em `markPayableAsPaid` + upload de NF/recibo pelo submissor.
_Fecha: §1.13, §1.16, §1.14. Fontes: PRD item 9, Q7, Q31, Q66, Q75._

### `P-1.29` — Os 26 templates de email que o Admin não alcança

Estende a precedência DB-driven do P-1.10c aos demais slugs, com seed a partir dos componentes React atuais.
_Fecha: §2.2. Fonte: Q10 ("nada deve ser hardcoded")._

## Onda D — refinamento

### `P-2.25` — A sugestão de avaliador por afinidade

Score de afinidade (região, categoria, histórico) sugerindo avaliadores na tela de designação; a atribuição continua manual.
_Fecha: §1.12. Fontes: Q3, Q24._

### `P-1.30` — Geração de template de email por IA

Super*admin descreve em prosa, IA devolve HTML no design system.
\_Fecha: §2.3. Fontes: Q52, BRAIN §8.*

### `P-5.14` — A ata que virou lista

Documento de ata vinculado à reunião (texto + anexos), coexistindo com as decisões estruturadas.
_Fecha: §6.1. Fonte: Q83._

### `P-0.17` — Higiene final de tokens

Remove `#4a6009`, `#ffffff`/`#e5e7eb` e o `Inter` do preview de templates; alinha as cores de status dos emails à paleta Hebron.
_Fecha: §9.2. Fonte: BRAIN §5, PATCH-001._

### `P-7.14` — O desempate que existe em dois lugares

Liga `breakTie()` no servidor e faz a fila de aprovação consumir o mesmo resultado, em vez de reimplementar a ordenação.
_Fecha: §4 (nota). Fonte: Edital §5._

---

# 13. Veredito

**Oito dos nove módulos estão prontos ou a poucos ajustes de estarem.** A qualidade de aderência em Flats, Financeiro e Tarefas é alta — o edital de flats, em particular, foi transposto com fidelidade item a item, incluindo a correção de 80 → 75 pontos derivada da recusa do Filipe a pedir laudo médico.

**Projetos não está pronto.** Não por falta de código — o módulo tem 99 arquivos, votação secreta com quórum, homologação automática, detecção de duplicidade por embeddings e integração financeira transacional. Está incompleto no eixo que menos aparece numa demonstração e mais importa na operação: **o que acontece entre o submissor apertar "enviar" e a diretoria votar.** Hoje, esse intervalo é um rótulo de status.

O padrão por trás dos achados de Projetos é reconhecível: o que estava em `BRAIN.md` foi implementado com rigor; o que ficou **apenas** nas `Respostas*.md` e no PRD, e nunca subiu para o BRAIN, foi implementado pela metade ou não foi implementado. A validação (Q9, Q23, Q33, Q38), o valor aprovado (Q9, Q54), a janela de submissão (Q51), os anexos (Q47) e o nome do responsável (Q56) têm exatamente esse perfil.

> **Correção (verificação em código, 2026-08-26):** o padrão vale para quatro dos cinco itens, não para todos. **Janela de submissão anual** (§6.2, _"submissão em janela definida (datas no Admin)"_), **periodicidade de relatório configurável por projeto**, **prestação de contas informal**, **sugestão de avaliador por afinidade** e o **ciclo de vida único para pontual e anual** já constam do `BRAIN.md` §6.2 — e mesmo assim não foram implementados. Estar no BRAIN é necessário, não suficiente. O que de fato falta ao BRAIN é: valor aprovado, edição em validação, contestação do submissor, os três anexos e o nome do responsável (escopo de `P-2.14b`).

**Recomendação:** antes de rodar a Onda A, subir para o `BRAIN.md` §6.2 as regras de validação, valor aprovado, janela e anexos — com o texto das respostas originais. Sem isso, o próximo agente implementador vai reproduzir a mesma lacuna, porque ele lê o BRAIN, não os `.docs`.

**Três decisões pendentes bloqueiam prompts específicos:**

1. **Formato da contestação do submissor** (Q32) → bloqueia P-2.17
2. **Formato do "local de execução"** (Q55) → bloqueia P-2.21
3. **Pontual passa ou não por homologação?** (Q1 vs. código) → bloqueia P-2.18

As demais ondas são executáveis como estão.

# PATCH-029 — Projetos: contestação do submissor é formulário estruturado, uma vez por alteração

**Data:** 2026-08-27 (decisão + implementação em P-2.17 CORRETIVO)

**Motivo:** `AUDIT/06 §1.4`. `projetos.contestations` só cobre a contestação de
diretor/conselheiro sobre o resultado da votação (na homologação). O
submissor não tinha canal nenhum durante a validação, apesar de Q11/Q32/Q33
descreverem um: "o submissor pode contestar as alterações via sistema... o
responsável poderá enviar uma mensagem através do sistema." A Q32 nunca foi
fechada — devolvida por Filipe em 2026 com "Não tenho isso fechado ainda.
Qual é a sua sugestão?" — e bloqueava P-2.17 por inteiro.

## Pergunta feita ao Filipe

Qual o formato da contestação do submissor durante a validação?

- **(a)** Formulário estruturado, uma vez por alteração: o submissor responde
  a um evento de alteração específico com uma justificativa; o super_admin
  resolve (aceita/rejeita) e o ciclo fecha. Simples, auditável, sem canal de
  conversa.
- **(b)** Thread de mensagens por projeto: submissor e super_admins trocam
  mensagens enquanto o projeto está em validação. Mais próximo do "enviar
  uma mensagem através do sistema" da Q11, mais caro (leitura, não lidas,
  ordem, moderação).
- **(c)** Reuso de `projetos.contestations` com uma coluna `kind`: barato,
  mas mistura duas regras de negócio diferentes (a do diretor devolve o
  projeto à votação; a do submissor, não) numa constraint só.

## Decisão (Filipe, 2026-08-27)

**(a) — Formulário estruturado, uma vez por alteração.** A Q33 já dá prazo
("até 7 dias antes da reunião") e a Q32 pede notificação aos super_admins
para que **respondam** — um ciclo com começo e fim, não uma conversa aberta.

## Impacto

- Nova tabela `projetos.submitter_contestations`, distinta de
  `projetos.contestations` (que continua exclusiva da contestação de
  diretor/conselheiro na homologação — não ganhou coluna `kind`, preservando
  sua UNIQUE e seu trigger de máximo 2 sem condicionais).
- "Uma vez por alteração" é literal: cada linha referencia o
  `project_version_id` específico criado por `updateProjectInValidation`
  (P-2.16) — o "evento de alteração" da Q32/BRAIN. UNIQUE
  `(project_version_id)` impede uma segunda contestação sobre o mesmo
  evento; uma nova edição do super_admin abre um novo evento contestável.
- Canal disponível apenas com `stage = 'validacao'` e até 7 dias antes da
  próxima reunião mensal agendada (`admin.meeting_sessions`, type='mensal',
  status='scheduled') — mesma fonte que `runEvaluationReminders`
  (`packages/jobs/src/crons/projetos.ts`) já usa. Sem reunião agendada, o
  canal fica aberto (nenhum prazo iminente a fechar).
- Resolução é super_admin-only: aceita/rejeita + resposta textual
  obrigatória. Não reverte automaticamente o campo alterado nem muda o
  estágio do projeto — "fecha o ciclo" é apenas o estado da própria
  contestação, distinto da contestação de diretor/conselheiro (que devolve o
  projeto a `votacao`).
- `BRAIN.md` §6.2 "Contestação do submissor" ganha o formato definido; a
  "Decisões pendentes" perde a entrada Q32.

**Antes** (`BRAIN.md` §6.2, texto anterior a esta sessão):

```
**Contestação do submissor:**

- Existe, é distinta da contestação de diretor/conselheiro na homologação
- Ocorre durante a validação, quando o valor (ou outra informação) é alterado pelo super_admin
- Notifica os super_admins, que devem responder
- Fecha 7 dias antes da reunião de planejamento — depois de fechado para votação, o submissor não pode mais contestar (Q11, Q32, Q33, Q75)
```

**Depois** (`BRAIN.md` §6.2, texto vigente):

```
**Contestação do submissor:**

- Existe, é distinta da contestação de diretor/conselheiro na homologação — tabela própria (`projetos.submitter_contestations`), não reusa `projetos.contestations`
- Ocorre durante a validação, quando o valor (ou outra informação) é alterado pelo super_admin — formulário estruturado, uma vez por alteração: uma contestação por evento de alteração, super_admin aceita/rejeita com resposta textual, sem thread de mensagens (PATCH-029)
- Notifica os super_admins na abertura (in_app + email), e o submissor na resposta
- Fecha 7 dias antes da reunião de planejamento — depois de fechado para votação, o submissor não pode mais contestar (Q11, Q32, Q33, Q75)
```

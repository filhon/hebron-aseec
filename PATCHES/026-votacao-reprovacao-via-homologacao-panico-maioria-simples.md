# PATCH-026 — Votação de projetos: reprovação passa por homologação; botão de pânico é maioria simples

**Data:** 2026-07-28 (decisão + implementação em P-2.8b, S-205)
**Motivo:** Auditoria S-203 (P-2.8b) achou que `castVote` calculava
`newStage = "reprovado"` numa reprovação decisiva, testava contra
`VALID_STAGE_TRANSITIONS` (`votacao: ["homologacao"]`), falhava a checagem e
pulava o bloco inteiro **em silêncio** — projeto ficava preso em `votação`
para sempre, sem erro e sem log. `closeVoting` e `triggerPanicButton`
tinham o problema oposto: escreviam `stage: "reprovado"` direto, sem
consultar o mapa — a transição que `transitionProjectStage` recusaria.

Duas perguntas de regra de negócio foram feitas ao Filipe antes de corrigir:

1. **Para onde vai uma reprovação?** Resposta: manter `votacao:
["homologacao"]` — nenhuma mudança no mapa. Ao investigar a implicação
   dessa escolha, descobriu-se que `runHomologacaoAutoApprove`
   (`packages/jobs/src/crons/projetos.ts`) aprova **incondicionalmente**
   qualquer projeto parado em `homologacao` há 7+ dias sem contestação —
   sem checar o resultado da votação. Manter o mapa como estava, sem mais
   nada, faria uma reprovação decisiva entrar em homologação e, se ninguém
   a contestasse manualmente em 7 dias, ser **auto-aprovada** pelo cron —
   invertendo o resultado da votação (pior que o bug original, que ao menos
   não decidia nada). Perguntado sobre como resolver esse conflito, o
   Filipe optou por ampliar o escopo do corretivo para also corrigir o
   cron, em vez de reconsiderar o mapa.
2. **Qual é a regra real do botão de pânico?** BRAIN dizia "maioria + 1 dos
   votos existentes"; o código sempre implementou maioria simples
   (`inFavor > against`, empate = reprovado). O Filipe confirmou: a
   implementação está certa, o texto do BRAIN é que estava impreciso.

**Impacto:**

- `castVote`, `closeVoting` e `triggerPanicButton`
  (`apps/projetos/src/actions/voting.ts`) convergem no mesmo destino
  (`homologacao`) para qualquer votação conclusiva — aprovada ou reprovada
  — validando contra `VALID_STAGE_TRANSITIONS` e lançando erro explícito em
  vez de escrever `stage` direto ou pular em silêncio. A decisão real da
  votação (`voteApproved: boolean`) fica registrada no snapshot de
  `project_versions`.
- `runHomologacaoAutoApprove` (`packages/jobs/src/crons/projetos.ts`) lê
  `voteApproved` do snapshot de entrada em homologação: `false` confirma a
  reprovação após 7 dias sem contestação (não aprova por omissão);
  ausente (entrada manual via `transitionProjectStage`) preserva o
  comportamento histórico de aprovação automática.
- `BRAIN.md` §6.2 ganha uma linha explicitando o que já era verdade para
  aprovação e agora vale simetricamente para reprovação: sem contestação em
  7 dias, o resultado apurado na votação se confirma.
- Texto do botão de pânico em `BRAIN.md` §6.2 corrigido de "maioria + 1 dos
  votos existentes" para "maioria simples ... empate resolve para
  reprovado", refletindo a implementação real. **O critério de decisão do
  botão de pânico não mudou** — só o texto que o descrevia.

**Antes** (`BRAIN.md` §6.2, texto anterior a esta sessão):

```
- Sem quórum: votação estendida; super_admin pode acionar "botão de pânico" (maioria + 1 dos votos existentes)

**Homologação:**

- 7 dias para contestação por qualquer diretor/conselheiro
- Máximo 2 contestações por projeto, cada pessoa pode contestar 1 vez
- Contestação retorna projeto para votação
```

**Depois** (`BRAIN.md` §6.2, texto vigente):

```
- Sem quórum: votação estendida; super_admin pode acionar "botão de pânico" (maioria simples entre os votos existentes; empate resolve para reprovado — PATCH-026)

**Homologação:**

- 7 dias para contestação por qualquer diretor/conselheiro
- Máximo 2 contestações por projeto, cada pessoa pode contestar 1 vez
- Contestação retorna projeto para votação
- Sem contestação em 7 dias: resultado apurado na votação se confirma automaticamente — aprovado ou reprovado, conforme o voto (mapa de estágios não permite votação decidir "reprovado" fora da homologação — PATCH-026)
```

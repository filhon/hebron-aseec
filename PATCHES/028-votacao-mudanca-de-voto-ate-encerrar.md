# PATCH-028 — Votação de projetos: mudar de voto é permitido até a votação encerrar

**Data:** 2026-08-26 (decisão + implementação em P-2.8d, S-203/S-281)

**Motivo:** Auditoria S-203 (P-2.8b) achou que `castVote`
(`apps/projetos/src/actions/voting.ts:130-137`) insere o voto com
`.onConflictDoNothing()` — a constraint única `(project_id, user_id)` impede
a linha duplicada, correto como proteção contra duplo clique — e a action
segue para recontar o resultado, devolvendo `ok: true` sem ter alterado nada.
Quem clicou "Não sinto paz" depois de ter votado "Sinto paz" recebia
confirmação de um voto que não mudou. O BRAIN não dizia se mudar de voto era
permitido; P-2.8d ficou bloqueado até essa resposta.

## Pergunta feita ao Filipe

Um conselheiro ou diretor pode mudar o voto já dado enquanto a votação está
aberta? Três saídas possíveis:

- **(a)** Não pode — segundo voto com valor diferente devolve erro de negócio.
- **(b)** Pode, até a votação fechar — upsert com audit da mudança.
- **(c)** Pode, mas só até o quórum ser atingido — híbrido.

## Decisão (Filipe, 2026-08-26)

**(b) — Pode, até a votação fechar.** O voto pode ser alterado livremente
enquanto o projeto está no estágio `votacao`. "Até fechar" já é imposto pelo
próprio ciclo de vida: assim que a votação encerra (auto-close por turnout
100%, `closeVoting` manual ou `triggerPanicButton`), o projeto sai do estágio
`votacao` e `getVotingProject` passa a recusar qualquer chamada a `castVote`
com "Projeto não está em fase de votação" — não foi necessário nenhum
controle adicional de prazo.

## Impacto

- `castVote` (`apps/projetos/src/actions/voting.ts`) distingue três casos ao
  receber um voto para um `(project_id, user_id)` que já existe (uma leitura
  prévia via `withSystemRole` decide qual):
  - **Duplo clique, mesmo valor:** nada é escrito, nenhum audit novo —
    idempotente e silencioso, como já era.
  - **Valor diferente (mudança de voto):** `UPDATE` direto, escopado por
    `WHERE project_id = ... AND user_id = ctx.actorId`; audit `vote.changed`
    registra `previousValue` → `value` dentro da mesma transação.
  - **Voto novo:** `INSERT ... ON CONFLICT DO NOTHING`, inalterado; audit
    `vote.cast`.
- Novo valor de enum `admin.audit_action`: `vote.changed` (migration
  `0092_projetos_vote_changed_audit_action.sql`, `ALTER TYPE ... ADD VALUE`
  isolado por convenção do monorepo).
- **Tentativa descartada:** a primeira implementação fez o UPDATE via
  upsert (`INSERT ... ON CONFLICT (project_id, user_id) DO UPDATE`) rodando
  como `authenticated` (RLS ativa), com uma nova policy `votes_update_own`
  espelhando `votes_insert_own`. Não funciona: no Postgres, RLS para
  `UPDATE`/`ON CONFLICT DO UPDATE` exige primeiro que a linha seja "visível"
  — e a policy de SELECT de `votes` (`votes_select_admin_only`, cédula
  secreta) nega isso a qualquer papel que não seja `super_admin`, **inclusive
  ao próprio votante** (migration `0009_fix_rls_org_members_votes.sql`, de
  propósito). Uma policy de UPDATE dedicada nunca chega a ser avaliada,
  porque a checagem de visibilidade herdada da falta de SELECT já filtra a
  linha antes disso — confirmado empiricamente (0 linhas afetadas mesmo com
  `USING`/`WITH CHECK` corretos). A correção real: o `UPDATE` roda via
  `withSystemRole` (mesmo padrão já usado pela leitura agregada em
  `getVoteResult` e pelo INSERT em `admin.audit_log`) — escopado pelo
  `WHERE` explícito, não por RLS. Não foi criada nenhuma policy/GRANT de
  UPDATE para `votes`.
- `apps/projetos/src/components/vote-panel.tsx` ganha a affordance "Alterar
  meu voto" no estado de confirmação, reabrindo os botões Sim/Não (com opção
  de cancelar sem enviar); a ordem de renderização passa a checar o estado
  de erro antes do estado de voto travado, para que uma tentativa de mudança
  que falhe apareça como erro em vez de continuar mostrando a confirmação
  antiga.
- `BRAIN.md` §6.2 (Votação) ganha uma linha explicitando a regra.

**Antes** (`BRAIN.md` §6.2, Votação — antes desta sessão):

```
- Participantes: diretores + conselheiros
- Pergunta: "Você sente paz em investir neste projeto?"
- Voto SECRETO (ninguém vê quem votou o quê)
- Quórum: ≥50% dos diretores + conselheiros (contagem por pessoa distinta, não por atribuição — PATCH-007)
- Aprovação: maioria simples
- Sem quórum: votação estendida; super_admin pode acionar "botão de pânico" (maioria simples entre os votos existentes; empate resolve para reprovado — PATCH-026)
- Encerramento manual: super_admin pode encerrar a votação a qualquer momento, aplicando o resultado apurado até então — mecanismo geral, distinto do "botão de pânico" acima, que só se aplica à falta de quórum (PATCH-007)
```

**Depois** (`BRAIN.md` §6.2, texto vigente):

```
- Participantes: diretores + conselheiros
- Pergunta: "Você sente paz em investir neste projeto?"
- Voto SECRETO (ninguém vê quem votou o quê)
- Quórum: ≥50% dos diretores + conselheiros (contagem por pessoa distinta, não por atribuição — PATCH-007)
- Aprovação: maioria simples
- Voto pode ser alterado livremente enquanto o projeto está em votação — mesmo valor: idempotente e silencioso; valor diferente: atualiza e audita (vote.changed) — permitido até a votação encerrar, não depois (PATCH-028)
- Sem quórum: votação estendida; super_admin pode acionar "botão de pânico" (maioria simples entre os votos existentes; empate resolve para reprovado — PATCH-026)
- Encerramento manual: super_admin pode encerrar a votação a qualquer momento, aplicando o resultado apurado até então — mecanismo geral, distinto do "botão de pânico" acima, que só se aplica à falta de quórum (PATCH-007)
```

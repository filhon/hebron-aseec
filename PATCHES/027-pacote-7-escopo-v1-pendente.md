# PATCH-027 — PACOTE 7: seis entregas de escopo v1 nunca implementadas — decisão da diretoria

**Data:** 2026-08-20
**Motivo:** `AUDIT/04-BACKLOG-CORRECAO.md` § PACOTE 7 encontrou seis itens declarados escopo v1 (`BRAIN.md` §8, a maioria via PATCH-012) sem nenhuma linha de código: P-2.13 (renovação), P-2.14 (duplicidade via embeddings), P-7.13 (assistência de IA no scoring de Flats), P-9.0 (migração do legado), Bunny.net Stream (upload de vídeo) e Google Calendar (Intranet). Diferente dos demais pacotes da auditoria, este exigia decisão antes de código — "implementar ou revogar", sem meio-termo, para cada item.

## Decisão (Filipe, 2026-08-20)

Todos os seis **permanecem na v1** — nenhum foi revogado. Cinco seguem com o escopo original; um teve o escopo reduzido.

| Item                                           | Decisão                                                    | Detalhe                                                                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| P-2.13 — Detecção de renovação                 | Implementar, escopo original                               | PRD requisito 5                                                                                                          |
| P-2.14 — Duplicidade via pgvector              | Implementar, escopo original                               | PRD requisito 5 (junto com P-2.13, mesmo formulário "inteligente")                                                       |
| P-7.13 — Assistência de IA no scoring de Flats | Implementar, escopo original                               | Pontuação final permanece 100% determinística (§6.8)                                                                     |
| P-9.0 — Migração de usuários do legado         | Implementar, escopo original — **urgente**, bloqueia P-9.5 | Legado confirmado: outro projeto Supabase (Auth apenas), construído por terceirizada                                     |
| Bunny.net Stream                               | Implementar — upload real + URL assinada                   | Fecha o acesso não controlado (hoje: link colado, sem matrícula)                                                         |
| Google Calendar (Intranet)                     | Implementar — **escopo reduzido**                          | Sincronização bidirecional (OAuth2) → exportação unidirecional sem OAuth (botão "Adicionar ao Google Calendar" + `.ics`) |

## Prompts escritos nesta sessão (S-263)

`PROMPTS.md`: P-2.13, P-2.14 (Fase 2), P-5.13 (Fase 5, Google Calendar — escopo reduzido), P-6.20 (Fase 6, Bunny Stream), P-7.13 (Fase 7), P-9.0 (Fase 9).

**P-9.0 foi além da especificação: código escrito e verificado nesta sessão** (`packages/db/src/scripts/migrate-legacy-users.ts`, `packages/email/src/templates/legacy-access.tsx`, `typecheck`/`lint` verdes) — é o único dos seis urgente o bastante para não esperar uma sessão própria. A **execução real** (`--execute` contra o projeto legado e produção) fica para o Filipe, que não tinha as credenciais do projeto legado disponíveis no momento desta decisão — ver `AUDIT/PACOTE-7-P9.0-RUNBOOK.md`.

Os outros cinco (P-2.13, P-2.14, P-5.13, P-6.20, P-7.13) foram deliberadamente **só especificados, não implementados** nesta sessão — decisão de sequenciamento do Filipe: "um prompt por vez, em sessões separadas", mesmo padrão de todo o resto do projeto (uma sessão = um prompt).

## Impacto em `BRAIN.md`

- §6.6 (linha 428): "Calendário compartilhado (integração Google Calendar)" → escopo reduzido, ver `PROMPTS.md` § P-5.13.
- §8 ("Mantido na v1"): os quatro itens de PATCH-012 (P-2.13, P-2.14, P-7.13, P-9.0) já estavam listados corretamente — nenhuma mudança de texto, só a confirmação de que a decisão foi revalidada e os prompts existem agora. Bunny.net Stream não precisou de linha em §8 (é stack declarada em §2, não um item de escopo v1/v2+ ambíguo) — só faltava o prompt, que agora existe (P-6.20).

## Por que nenhum foi revogado

Nenhum dos seis tinha, na avaliação de Filipe, motivo de negócio para sair da v1: P-2.13/P-2.14 são exigência direta do PRD (não só do BRAIN); P-7.13 é assistência opcional de baixo risco (não decide sozinha); P-9.0 é via de entrada obrigatória para os ~150 usuários atuais; Bunny fecha um risco de acesso já identificado (link sem matrícula); Google Calendar, mesmo reduzido, ainda entrega o valor central (agenda no calendário pessoal do usuário) sem o custo de manter uma integração OAuth.

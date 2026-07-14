# PATCH-023 — Plataforma: quiz é só múltipla escolha na v1 (dissertativa removida do escopo)

**Data:** 2026-07-14
**Origem:** Débito de S-104 (P-6.2), critério de aceite marcado `[~]`.
**Motivo:** O critério de aceite de P-6.2 pede "QuizForm com tipos: **múltipla escolha e dissertativa**", e o Escopo de P-6.2 lista "QuizForm (múltipla escolha, dissertativa)". Nenhuma camada modela questão dissertativa: `QuizQuestion` (P-6.1) tem só `options` + `correctOptionId`, e `quizQuestionSchema` exige no mínimo 2 alternativas. S-104 implementou apenas múltipla escolha e registrou a lacuna como débito.

Questão dissertativa é **incompatível com o modelo de quiz da v1** definido no PATCH-010 e reafirmado no BRAIN §6.3 / PROMPTS P-6.8: a aula-quiz conclui **automaticamente** quando `attempt.score >= passingScore`, com tentativas ilimitadas e **sem correção humana**. Uma questão dissertativa não pode ser auto-pontuada — exigiria um fluxo de correção manual pelo instrutor (fila de correção, estado "aguardando avaliação", notificação), que não existe em nenhuma camada e que quebraria a auto-conclusão da trilha. Não é uma lacuna de implementação de P-6.2; é uma sobre-especificação do critério frente ao modelo de negócio da v1.

## Decisão (Filipe, 2026-07-14)

**Quiz na v1 é só múltipla escolha.** Dissertativa fica fora do escopo da v1. Nenhuma mudança de código — `quiz-form.tsx`, `quiz-editor.tsx`, `QuizQuestion` e `quizQuestionSchema` já estão corretos para o modelo de auto-correção. O que muda é o **critério de aceite do prompt**, que passa a refletir o modelo real, e o débito registrado em S-104 deixa de ser débito (vira decisão de produto).

Correção manual de dissertativa, se um dia entrar, é feature nova de v2+ (exige: tipo `essay` em `QuizQuestion`, estado de attempt "pendente de correção", action de correção pelo instrutor com audit, e revisão da regra de auto-conclusão do PATCH-010) — não um conserto retroativo do Bloco A.

## Correções aplicadas

### `PROMPTS.md` — P-6.2

- Critério de aceite: `- [~] QuizForm com tipos: múltipla escolha e dissertativa`
  → `- [x] QuizForm com tipos: múltipla escolha (dissertativa fora da v1 — ver PATCH-023)`
- Escopo: `QuizForm (múltipla escolha, dissertativa)`
  → `QuizForm (múltipla escolha — dissertativa fora da v1, ver PATCH-023)`

### `apps/plataforma/src/components/quiz-form.tsx`

Comentário de cabeçalho reescrito: deixa de rotular "dissertativa" como débito registrado em SESSIONS e passa a citar a decisão de produto (PATCH-023), para que nenhuma sessão futura re-sinalize a lacuna.

## Critérios de aceite

- [x] Critério de P-6.2 reflete o modelo real (só múltipla escolha).
- [x] Comentário de `quiz-form.tsx` cita a decisão, não um débito em aberto.
- [x] Zero mudança de comportamento em runtime; lint/types da Plataforma seguem verdes.

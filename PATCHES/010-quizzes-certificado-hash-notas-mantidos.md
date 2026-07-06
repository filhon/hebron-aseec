# PATCH-010 — Plataforma: quizzes, certificado com hash e notas em timestamp mantidos (v1, com semântica definida)

**Data:** 2026-07-02 (decisão, Fase 1 da auditoria, delegada ao critério do auditor — implementação prevista na Fase 6, ainda pendente)
**Registrado retroativamente em:** 2026-07-06 (P-0.16)
**Motivo:** A auditoria (S1-23, "scope creep embutido nos prompts pendentes") encontrou três funcionalidades especificadas nos prompts pendentes da Fase 6 sem ancoragem no BRAIN: quizzes como tipo de aula com `passing_score` (BRAIN §6.3 define certificação apenas como "concluir trilha = certificado", sem menção a quiz), certificado com hash de verificação pública, e notas pessoais em timestamp de vídeo (`NoteWidget`). Nenhum é absurdo — mas o método do projeto diz que o BRAIN vence sobre scope creep não decidido. Perguntado se deveria decidir item a item ou delegar o julgamento (Fase 1 Q8: "o que você julga necessário manter ou descartar?"), o Filipe delegou. O critério aplicado (registrado na Fase 4 da auditoria, §6): manter o que agrega valor real com modelagem isolada (baixo custo de reversão, sem acoplamento), descartar o que contradiz regra já definida ou exige modelagem que nenhum prompt cria (ver PATCH-011 para os itens descartados pelo mesmo critério). O Filipe revisou a proposta e não vetou nenhum item (Fase 4 Q5: "Não, nenhum veto").

**Decisão e semântica definida (elimina a ambiguidade que era o risco):**

- **Quizzes:** tipo de aula (`plataforma.quizzes`, `quiz_questions`, `quiz_attempts`). Uma aula-quiz conclui quando o aluno atinge `attempt.score ≥ passing_score`; tentativas ilimitadas. A regra de certificação do BRAIN §6.3 **não muda**: certificado = 100% da trilha concluída (aulas de quiz contam como qualquer outra aula concluída).
- **Certificado com hash:** coluna de hash + rota pública de verificação. Anti-fraude barato (1 coluna + 1 rota), sem mudança de regra de negócio.
- **Notas pessoais em timestamp (`NoteWidget`):** tabela isolada (`plataforma.notes`), sem acoplamento a certificação ou progresso — valor direto ao aluno.

**Impacto:**

- `BRAIN.md` §6.3 e §8 passam a citar estas três features como mantidas na v1, com a semântica acima — a Fase 6 (P-6.1–P-6.12) implementa a partir desta definição, não de uma leitura livre dos prompts pendentes.
- Nenhuma mudança de código nesta sessão (Fase 6 ainda não rodou); este PATCH é a base normativa para quando rodar.

**Antes** (`BRAIN.md` §6.3, Plataforma — antes desta sessão, sem menção a quiz/hash/notas):

```
- **Certificação (v1):** automática (concluir trilha = certificado)
```

(silêncio sobre quiz, hash de certificado e notas — os prompts pendentes da Fase 6 já assumiam as três, sem decisão registrada.)

**Depois** (`BRAIN.md` §8, Mantido na v1 — linha adicionada nesta sessão):

```
- Quizzes como tipo de aula, certificado com hash de verificação pública, notas pessoais em timestamp de vídeo (Plataforma) — mantidos, com semântica definida (PATCH-010)
```

A regra de certificação em `BRAIN.md` §6.3 (linha "concluir trilha = certificado") permanece **inalterada** — os quizzes contam como aulas dentro da trilha, não substituem a regra.

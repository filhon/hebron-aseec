# Patches leves agrupados

Mudanças pequenas (1–3 linhas por prompt), agrupadas para não pulverizar 20 arquivos de uma linha.
Formato: prompt → linha ANTES → linha DEPOIS (ou ADICIONAR). Motivo entre parênteses.

---

## P-3.12 — Testes Financeiro

```
ADICIONAR ao escopo: "Adicionar script `test` ao package.json do app (hoje inexistente — F3-10)."
ADICIONAR critérios:
- [ ] Designation: diretor sem designation gestor não aprova lote (teste)
- [ ] Audit: falha simulada de gravação aborta a mutação (teste — G6.3)
- [ ] Import: linhas adulteradas entre preview e confirmação não persistem (teste — F3-11/P-3.8b)
- [ ] organization_budgets: submissão acima do teto é bloqueada (teste — S1-01)
- [ ] Inadimplência: payable bloqueado não entra em lote; override auditado (teste — P-3.11)
```

## P-4.4 — Formulários Tarefas (D-1)

```
ANTES:  Formulários: criar/editar tarefa (título, descrição rich text, ...)
DEPOIS: Formulários: criar/editar tarefa (título, descrição com o editor rich text COMPARTILHADO
        de packages/ui — decisão D-1; não criar editor próprio do app; ...)
```

## P-4.10 — Notificações Tarefas (CS-5)

```
ANTES:  Prazo próximo (1 dia antes, in_app). Prazo vencido (in_app + email).
DEPOIS: Prazo próximo (1 dia antes) e prazo vencido: detectados por cron diário registrado em
        packages/jobs (P-0.14) — adicionar packages/jobs/src/crons/tarefas-prazos.ts aos arquivos
        permitidos.
```

## P-4.12 — Testes Tarefas

```
ADICIONAR critérios:
- [ ] Approval: fluxo enviar → aprovar/rejeitar → status, com audit central abortando em falha
- [ ] RLS conforme semântica do patch P-4.7: colaborador lê tudo, escreve só creator/assignee
```

## P-5.1 — Tipos Intranet (decisão F1-Q10)

```
ANTES:  - [ ] Mock KPIs: projetos ativos, alunos na Plataforma, doações do mês, audiência da Rádio
DEPOIS: - [ ] Mock KPIs: projetos ativos, alunos na Plataforma, doações do mês (= soma de despesas
        da categoria "Doações" do plano de contas — semântica da decisão F1-Q10), audiência da Rádio
```

## P-5.4 — Formulários Intranet (D-1)

```
ANTES:  criar anúncio (título, corpo, prioridade)
DEPOIS: criar anúncio (título, corpo com editor compartilhado de packages/ui — D-1, prioridade)
```

## P-5.7 — RLS Intranet

```
Arquivos permitidos: trocar `0013_intranet_rls.sql` pela convenção G6.4 (ver migracoes-numeracao.md).
```

## P-5.12 — Testes Intranet

```
ADICIONAR critério:
- [ ] Busca: usuário sem papel para ver documento restricted não o recebe via busca global (contrato P-5.8)
```

## P-6.1 — Tipos Plataforma (D-5, semântica de quiz)

```
ADICIONAR ao escopo: "Semântica de quiz (decisão D-5): quiz é tipo de aula; a aula-quiz conclui
com attempt >= passing_score; tentativas ilimitadas; certificado permanece 'concluir 100% da
trilha' (BRAIN §6.3)."
```

## P-6.4 — Formulários Plataforma (D-1, CS-11)

```
ANTES:  Curso form: título, descrição rich text, capa (upload), categoria, instrutor
DEPOIS: Curso form: título, descrição (editor compartilhado — D-1), capa (upload para o bucket
        plataforma-capas de P-0.12), categoria, instrutor
```

## P-6.11 — Cross-App Plataforma (CS-6)

```
ANTES:  - apps/plataforma/src/lib/integrations/intranet.ts
        - apps/intranet/src/lib/integrations/plataforma-stub.ts (substituir por real)
DEPOIS: - packages/integrations/src/plataforma.ts (KPI de alunos — substituir stub do package)
```

## P-6.12 — Testes Plataforma

```
ADICIONAR critérios:
- [ ] Quiz: attempt abaixo do passing_score não conclui a aula (semântica P-6.8)
- [ ] Certificado: curso com aula-quiz só certifica após quiz aprovado
```

## P-7.7 — RLS Flats

```
ANTES:  Diretor gestor (designation): SELECT + UPDATE para aprovar/rejeitar.
DEPOIS: Diretor gestor: usar o helper has_designation já criado em P-3.7 (escopo flats/gestor) —
        não criar helper novo. SELECT all + UPDATE para aprovar/rejeitar.
        Arquivos: convenção G6.4 no lugar de 0017_flats_rls.sql.
ADICIONAR critério:
- [ ] guests/scoring_responses (PII/saúde): SELECT restrito a gestor de flats e super_admin (teste)
```

## P-7.10 — Notificações Flats (CS-5)

```
ANTES:  Instruções de check-in (email 3 dias antes com endereço, contato, regras). Lembrete de
        check-out (email no dia).
DEPOIS: Instruções de check-in (3 dias antes) e lembrete de check-out (no dia): crons registrados
        em packages/jobs (P-0.14) — adicionar packages/jobs/src/crons/flats.ts aos permitidos.
```

## P-7.12 — Testes Flats

```
ADICIONAR critérios:
- [ ] Consentimento: reserva sem consentimento de dados não persiste; campo saúde exige
      consentimento específico (P-7.4)
- [ ] Auxílio: payables nascem não aprovados e entram na governança dual (D-4)
```

## P-8.4 — Formulários Rádio

```
ANTES:  - [ ] Upload de .mp3 com extração automática de duração
DEPOIS: - [ ] Upload de .mp3 com extração automática de duração (lib `music-metadata` — registrar
        em SESSIONS; executor não deve escolher outra silenciosamente)
```

## P-8.7 — RLS Rádio (decisão B)

```
ADICIONAR ao escopo: "Grants: o SELECT anônimo exige GRANT USAGE/SELECT para `anon` APENAS nas
tabelas públicas da rádio (tracks, authors, series, playlists, now_playing) — alinhar com a
migration de grants de P-0.10; exclusive_materials e term_acceptances ficam fora do grant de anon."
Arquivos: convenção G6.4 no lugar de 0019_radio_rls.sql.
```

## P-8.10 — Notificações Rádio (CS-9)

```
ANTES:  - [ ] Novo material exclusivo: email para todos com termo aceito
DEPOIS: - [ ] Novo material exclusivo: email para quem tem termo aceito E consentimento de
        comunicação de novidades (P-0.13) — termo de responsabilidade não é opt-in de email
```

## P-8.12 — Testes Rádio

```
ADICIONAR critério:
- [ ] Audiência: agregação diária calcula sessões/horas conforme D-3 (fixtures)
```

## P-9.3 — Performance

```
Arquivos permitidos: trocar `0022_indexes.sql (se necessário)` por "arquivo SQL de indexes, se
necessário (convenção G6.4)".
```

## P-9.4 — Copy Review (S1-26)

```
ADICIONAR critério:
- [ ] Grep sem ocorrências (case-insensitive) em arquivos .tsx de UI: "vamos lá", "incrível",
      "awesome", "ops!", "oops", "não se preocupe", "estamos quase lá", "tudo certo!" — e revisão
      manual de exclamações genéricas restantes
```

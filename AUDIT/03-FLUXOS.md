# 03 — RASTREAMENTO PONTA A PONTA (FASE 3)

> 8 fluxos críticos, priorizados por: dinheiro > autenticação/autorização > PII > operação principal.
> Cada elo foi aberto em código nesta sessão. `✅` = elo íntegro; `⛔` = rompido; `⚠️` = frágil.

---

## FLX-01 — Projeto aprovado → pagamentos criados no Financeiro (DINHEIRO)

| Elo                                                  | Estado | Evidência                                                                   |
| ---------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| UI: diretoria move projeto para `aprovado`           | ✅     | `apps/projetos/src/app/(diretoria)/pipeline/page.tsx`                       |
| Server Action `moveProject`                          | ✅     | `apps/projetos/src/actions/projects.ts:707`                                 |
| Validação de transição                               | ✅     | `VALID_STAGE_TRANSITIONS[project.stage]` (`:687`)                           |
| Autorização                                          | ✅     | `diretorAction`                                                             |
| Transação + snapshot de versão                       | ✅     | `withAuthenticatedContext` + `createVersionSnapshot`                        |
| RLS efetiva                                          | ✅     | `projects_update_*`                                                         |
| `generatePaymentSchedule` (parcelas)                 | ✅     | `await` explícito — `projects.ts:741`                                       |
| **`onProjectApproved` (centro de custo + payables)** | **⛔** | **`projects.ts:744` — sem `await`**                                         |
| Payables nascem `pendente`                           | ✅     | `packages/db/src/projetos-approval.ts:143`                                  |
| Idempotência da integração                           | ✅     | `UNIQUE (project_id)` no centro de custo + `onConflictDoNothing` no payable |
| Audit                                                | ✅     | `financeiro.payable.created`, criticality alta                              |
| Erro de volta na UI                                  | ⛔     | ver `[D4-004]` — mensagem genérica                                          |

**Elo rompido: `[FLX-001]` abaixo.**

---

### [FLX-001] A criação dos pagamentos de um projeto aprovado roda em "fogo e esquece" — o BRAIN proíbe isso explicitamente

- **Severidade:** P1 | **Domínio:** Fluxo / Dinheiro | **App:** projetos, financeiro
- **Status:** CONFIRMADO
- **Evidência 1:** `apps/projetos/src/actions/projects.ts:735-747`
- **Trecho:**

  ```ts
  if (
    parsedInput.toStage === "aprovado" &&
    afterProject.parcelas &&
    afterProject.meses &&
    afterProject.budgetTotal
  ) {
    await generatePaymentSchedule(afterProject);

    // Cross-app: criar centro de custo no módulo financeiro
    onProjectApproved(parsedInput.projectId).catch((err) =>
      console.error("[projetos/approve] financeiro integration failed:", err),
    );
  }
  ```

  Note o contraste dentro do mesmo bloco: `generatePaymentSchedule` **tem** `await`; `onProjectApproved`, que é quem de fato cria os payables, não tem.

- **Evidência 2:** `packages/jobs/src/crons/projetos.ts:277-283` — o mesmo defeito no caminho automático (aprovação por decurso do prazo de homologação):
  ```ts
  if (updated.parcelas && updated.meses && updated.budgetTotal) {
    await generatePaymentSchedule(updated);
  }
  onProjectApproved(project.id).catch((err: unknown) =>
    console.error("[jobs/projetos] onProjectApproved failed:", err),
  );
  ```
- **Esperado:** `BRAIN.md:559-563`, regra escrita justamente para isto:
  ```
  Integração de **mutação crítica** (ex. `onProjectSubmitted` quando deixar
  de ser stub) nunca roda fire-and-forget (`.catch(console.error)` solto,
  sem `await`) — o chamador sempre dá `await` e decide explicitamente se o
  erro aborta a operação principal ou só é logado; "fogo e esquece" escondeu
  falhas reais no código pré-auditoria (S-43).
  ```
- **Encontrado:** Verifiquei **todas** as outras integrações de mutação crítica do ecossistema. Todas seguem a regra:
  | Integração | Padrão |
  | ---------- | ------ |
  | `onFlatsAssistanceApproved` (`apps/flats/src/actions/aid.ts:217`) | `await` dentro de `try/catch` ✅ |
  | `onFlatsReservationConfirmed` (`apps/flats/src/actions/reservations.ts:377`) | `await` dentro de `try/catch` ✅ |
  | `onMeetingActionItemDecided` (`apps/intranet/src/actions/decisions.ts:104`) | `await` dentro de `try/catch` ✅ |
  | `onProjectSubmitted` (`apps/projetos/src/actions/projects.ts:628`) | `await` dentro de `try/catch` ✅ |
  | **`onProjectApproved`** (2 call sites) | **fire-and-forget** ⛔ |

  A convenção é conhecida, está documentada e é obedecida em quatro de cinco casos. A exceção é exatamente a integração que move dinheiro.

- **Impacto:** Duas consequências, e a segunda é a pior:
  1. **Se a integração falhar, ninguém fica sabendo.** O projeto fica `aprovado`, o `payment_schedules` existe (esse teve `await`), e `financeiro.payables` fica vazio. O cron do lote semanal (`selectWeeklyBatchPendingPayables`) não encontra nada, o diretor gestor não recebe nada para aprovar, e o missionário não recebe. O único vestígio é um `console.error` num log efêmero — e não há Sentry (`[NEG-007]`).
  2. **A promessa pode nem chegar a executar.** Numa Server Action da Vercel, o container pode ser congelado assim que a action retorna; num `step.run` do Inngest, assim que o step resolve. Uma promise flutuante criada e não aguardada não tem garantia de completar em runtime serverless. Isto é, a falha não precisa de um erro para acontecer — basta o timing.

  Não classifico como P0 porque não há valor errado nem corrupção: `onProjectApproved` é idempotente (`UNIQUE (project_id)` no centro de custo, `onConflictDoNothing` no payable), então reexecutar conserta. O problema é que nada reexecuta e nada avisa.

- **Correção sugerida:** `await onProjectApproved(...)` dentro de `try/catch` com log estruturado, exatamente como os outros quatro. Decidir explicitamente se o erro aborta a aprovação (recomendo que **não** aborte — mas que grave uma notificação para o super_admin, já que o projeto aprovado sem payables é um estado que precisa de intervenção humana).

---

## FLX-02 — Aprovação e autorização de lote de pagamento, governança dual (DINHEIRO)

| Elo                                             | Estado | Evidência                                                                                            |
| ----------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| Cron cria lote semanal (seg. 8h)                | ✅     | `packages/jobs/src/crons/financeiro.ts:184`                                                          |
| Email para gestor, CC autorizador               | ⚠️     | `[D5-001]` — não reenviado se o retry ocorrer                                                        |
| `approveBatch` exige designação `gestor`        | ✅     | `apps/financeiro/src/actions/approval.ts:209`                                                        |
| Bloqueia lote já aprovado                       | ✅     | `:227-229`                                                                                           |
| `authorizeBatch` exige designação `autorizador` | ✅     | `:329`                                                                                               |
| **Autorizador ≠ aprovador**                     | ✅     | `:361-365`, checagem explícita                                                                       |
| Payables `pendente → aprovado → autorizado`     | ✅     | com `and(inArray(ids), eq(status, anterior))` — transição só a partir do estado correto              |
| Transação + audit atômicos                      | ✅     | comentário `:212-213`: "se o audit falhar, a aprovação é revertida"                                  |
| RLS efetiva no UPDATE de `batch_approvals`      | ⚠️     | contornada por `withSystemRole` no lado do autorizador (débito PATCH-016, documentado em `:372-379`) |
| Erro de volta na UI                             | ⛔     | `[D4-004]` — "O autorizador deve ser uma pessoa diferente do aprovador" nunca é exibido              |

**Veredito:** a regra inviolável do BRAIN §6.5 está corretamente implementada. Os dois elos frágeis são conhecidos e documentados no próprio código. O mais visível ao usuário é o `[D4-004]`: quem tentar autorizar o próprio lote recebe uma frase genérica em inglês em vez da explicação da governança dual.

---

## FLX-03 — Estorno de lançamento (DINHEIRO, imutabilidade)

| Elo                                            | Estado | Evidência                                                                                                              |
| ---------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| UI: `reversal-form.tsx` com `router.refresh()` | ✅     | `apps/financeiro/src/components/reversal-form.tsx`                                                                     |
| `createReversal` sob `superAdminAction`        | ✅     | `apps/financeiro/src/actions/transactions.ts:526`                                                                      |
| Bloqueia estorno duplicado (leitura)           | ✅     | `:538-551`                                                                                                             |
| **Constraint de banco atrás da leitura**       | ✅     | `UNIQUE original_transaction_id` (`0010_financeiro.sql:319`) — check-then-act protegido                                |
| Cria transação de tipo oposto                  | ✅     | `:554` — `debito → credito`                                                                                            |
| UPDATE/DELETE na transação original impossível | ✅     | triggers `forbid_transaction_mutation()` (`0010:305-311`) + grant só `SELECT, INSERT` (`0014:98`) + ausência de policy |
| `ON DELETE RESTRICT` nas duas FKs              | ✅     | `0010:319-320`                                                                                                         |
| Audit                                          | ✅     | ação dedicada                                                                                                          |

**Veredito: fluxo íntegro em todos os elos.** É a melhor implementação do repositório — a imutabilidade do BRAIN §9 é imposta por três mecanismos independentes no banco, não por convenção de código.

---

## FLX-04 — Exclusão de dados pessoais, LGPD (PII)

| Elo                                    | Estado | Evidência                                                             |
| -------------------------------------- | ------ | --------------------------------------------------------------------- |
| UI `/meus-dados` nos 9 apps            | ✅     | 9/9 `**/meus-dados/page.tsx`                                          |
| Consentimento revogável por finalidade | ✅     | `setConsent` (`meus-dados/page.tsx:16`), `granted=false` nunca DELETE |
| Exportação JSON + CSV                  | ✅     | `exportMyData` (`:95-101`)                                            |
| Titular solicita exclusão              | ✅     | `requestDataDeletion` (`:104-114`) → ticket `pending`                 |
| RLS: só o próprio titular pede         | ✅     | `data_deletion_requests_insert_own`                                   |
| **super_admin vê os pedidos**          | **⛔** | **nenhuma tela lista `data_deletion_requests`**                       |
| **super_admin executa/rejeita**        | **⛔** | **`executeDataDeletion`/`rejectDataDeletion` sem nenhum chamador**    |
| Anonimização (primitiva)               | ✅     | `anonymizeUser` existe e é testada                                    |
| Redação de PII em audit diffs          | ⚠️     | `[D1-005]` (UPDATE sem policy) + `[D8-003]` (lista incompleta)        |
| Log de acesso de terceiro a PII        | ⛔     | `logPiiAccess` sem chamador — `[D8-002]`                              |

**Elo rompido: `[D8-001]` — P0.** O fluxo aceita o pedido e não tem caminho de produto para atendê-lo. Tudo em volta está pronto; falta uma tela.

---

## FLX-05 — Convite → papel → acesso cross-app (AUTENTICAÇÃO/AUTORIZAÇÃO)

| Elo                                                            | Estado | Evidência                                                                                  |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| super_admin cria convite                                       | ✅     | `sendInvitation`, `adminAction`                                                            |
| **Combinação de papéis validada contra conflito de interesse** | ⛔     | `[D6-002]` — `sendInvitation` aceita `["diretor","submissor"]`                             |
| Email com token e expiração                                    | ✅     | `admin.invitations` com `expires_at`, `revoked_at`                                         |
| `acceptInvitation` público por token                           | ✅     | `publicAction`, com justificativa documentada (`invitations.ts:52-64`)                     |
| Token single-use, não expirado, não revogado                   | ✅     | `:70-83`                                                                                   |
| Race check-then-act no token                                   | ⚠️     | SELECT e `acceptedAt` em transações separadas; autolimitado pelo e-mail único do Auth (P3) |
| Cria conta no Auth + espelha em `public.users`                 | ✅     | trigger `on_auth_user_created`                                                             |
| **Concede papéis sem checar conflito**                         | ⛔     | `[D6-002]` — `invitations.ts:122`                                                          |
| Cookie de sessão com `domain=.hebronaseec.com.br`              | ⚠️     | só o middleware da intranet reescreve — `[D1-001]`                                         |
| Acesso reconhecido em outro app                                | ✅     | `resolveSession` compartilhado lê o cookie e os papéis                                     |
| Gate de página no app destino                                  | ✅     | `require*Session()` no layout                                                              |
| **Middleware bloqueando antes de renderizar**                  | ⛔     | `[D1-001]` — ausente em 8 de 9 apps                                                        |
| Refresh do access token expirado                               | ⛔     | consequência de `[D1-001]`                                                                 |

**Veredito:** funciona no caminho feliz. As duas rupturas são a porta de conflito de interesse aberta (`[D6-002]`) e a camada 1 inexistente (`[D1-001]`), que também explica por que a sessão não se renova sozinha.

---

## FLX-06 — Impersonação para suporte (AUTORIZAÇÃO)

| Elo                                                      | Estado | Evidência                                                              |
| -------------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| Gate `requireSuperAdmin()`                               | ✅     | `apps/admin/src/actions/impersonation.ts:19-28`                        |
| Impede impersonar a si mesmo                             | ✅     | `:42-43`                                                               |
| Cookie assinado com HMAC-SHA256                          | ✅     | `packages/auth/src/impersonation.ts:38-40`, `timingSafeEqual` em `:86` |
| Falha fechada em produção sem segredo                    | ✅     | `:30-34`                                                               |
| Expiração de 8h                                          | ✅     | `IMPERSONATION_COOKIE_MAX_AGE_SECONDS`                                 |
| Audit no início e no fim, com duração e IP               | ✅     | `:90-101` e `:130-143`                                                 |
| Banner persistente                                       | ⚠️     | só no layout do Admin                                                  |
| **A sessão efetivamente assume a identidade do usuário** | **⛔** | **`resolveSession` não lê o cookie**                                   |

**Elo rompido: `[FLX-002]` abaixo.**

---

### [FLX-002] A impersonação registra, avisa e audita — mas nunca troca de identidade

- **Severidade:** P1 | **Domínio:** Fluxo / Autorização | **App:** admin
- **Status:** CONFIRMADO
- **Evidência:** `packages/auth/src/server.ts:71-116` (função `resolveSession`, lida integralmente)
- **Trecho:**

  ```ts
  export async function resolveSession(
    cookieStore: ActionCookieStore,
  ): Promise<ActionSession> {
    const supabase = createSupabaseServerActionClient({ ... });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) throw new Error("Não autenticado");

    const rows = await db
      .select({ role: roleAssignments.role })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, user.id),
          isNull(roleAssignments.revokedAt),
        ),
      );
    ...
    return {
      actorId: user.id,
      roles: rows.map((r) => r.role),
      designations: designationRows.map((d) => d.type),
    };
  }
  ```

  Não há nenhuma leitura de `IMPERSONATION_COOKIE_NAME` aqui. `actorId` e `roles` são sempre os do super_admin autenticado.

- **Esperado:** `BRAIN.md:279`, marcado como **ESSENCIAL**:
  ```
  - **Impersonação (ESSENCIAL):** super_admin assume identidade com banner persistente + log
    obrigatório — usado para suporte telefônico sem AnyDesk
  ```
  E `.docs/Claude.md` §4.1: _"**Impersonation auditada** (super-admin pode 'assumir' um usuário para suporte, com banner persistente e log obrigatório)."_
- **Encontrado (busca exaustiva):** `grep -rn "IMPERSONATION_COOKIE_NAME|parseImpersonationState"` em `apps/*/src` e `packages/*/src` retorna consumidores em **exatamente dois lugares**, ambos dentro de `apps/admin`:
  1. `apps/admin/src/actions/impersonation.ts` — grava, apaga e audita o cookie
  2. `apps/admin/src/app/(dashboard)/layout.tsx:22-23,45-51` — lê para renderizar o `ImpersonationBanner`

  **Nenhum caminho de autorização, em nenhum dos 9 apps, consulta esse cookie.** O efeito real de "impersonar" é: grava-se um cookie assinado, aparece uma tarja no Admin, grava-se uma entrada de audit, e o super_admin é redirecionado para `/usuarios/{id}` — ainda como ele mesmo. Ele não vê nem uma tela a mais do que já veria.

- **Impacto:** O propósito declarado é literalmente inatingível: _"usado para suporte telefônico sem AnyDesk"_ significa enxergar o que o usuário enxerga — no Projetos, na Plataforma, no Flats. Como o cookie é gravado com `domain=.hebronaseec.com.br` em produção (`impersonation.ts:30-31`), os outros apps **poderiam** lê-lo; nenhum lê. O super_admin liga para o pastor e continua sem ver a tela dele.

  O que existe é a moldura de segurança da funcionalidade — assinatura HMAC infalsificável, expiração de 8h, audit de início/fim com duração e IP — construída com cuidado real em volta de um núcleo que não existe. É por isso que o defeito passou por auditorias por fase: cada peça isolada está correta.

  Registro também o lado positivo: como nada honra o cookie, **não há risco de escalonamento de privilégio** por essa via.

- **Correção sugerida:** Decidir entre duas saídas honestas. (a) Implementar: `resolveSession` passa a ler e validar o cookie e, se presente e válido, devolve `actorId`/`roles` do impersonado — mantendo `actorId` real do super_admin no audit (a assinatura de `logAudit` já suporta separar ator de entidade). (b) Reclassificar: se a diretoria concluir que suporte por telefone não precisa disso, emitir PATCH removendo "ESSENCIAL" do BRAIN §6.1 e apagar cookie, banner e actions. O que não se sustenta é a terceira opção atual — o BRAIN afirmar que existe e o registro de auditoria dizer que aconteceu.

---

## FLX-07 — Reserva de flat → aprovação → auxílio → limpeza (PII + cross-app)

| Elo                                                     | Estado | Evidência                                                                                                                                      |
| ------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Formulário com 3 períodos de preferência                | ✅     | `packages/validators/src/flats`                                                                                                                |
| Consentimento de dado sensível (saúde)                  | ✅     | `public.consents`, finalidade `dado_saude`                                                                                                     |
| CPF validado                                            | ⚠️     | só `^\d{11}$`, sem dígito verificador (P3)                                                                                                     |
| Documento de identidade → `flats-documentos`            | ✅     | bucket privado, 10 MB, MIME restrito                                                                                                           |
| `hospedeAction` barra diretor/conselheiro               | ✅     | `apps/flats/src/lib/safe-action.ts:31-38`                                                                                                      |
| Scoring determinístico, máx. 75                         | ✅     | `SCORING_MAX_POINTS = 75`                                                                                                                      |
| **Assistência de IA nos critérios subjetivos (P-7.13)** | ⛔     | `[NEG-001]` — prompt nunca escrito                                                                                                             |
| Gestor aprova (`gestorAction`)                          | ✅     | designação `gestor` exigida                                                                                                                    |
| **Double-booking impedido no banco**                    | ✅     | `EXCLUDE USING gist (unit_id WITH =, selected_period WITH &&) WHERE status IN ('aprovada','confirmada','em_curso')` (`0021_flats.sql:263-269`) |
| Confirmar/cancelar: dono ou gestor                      | ✅     | checagem no corpo (`reservations.ts:337-346`, `:424-433`)                                                                                      |
| Auxílio aprovado → despesa no Financeiro                | ✅     | `await onFlatsAssistanceApproved` (`aid.ts:217`)                                                                                               |
| Reserva confirmada → tarefa de limpeza                  | ✅     | `await onFlatsReservationConfirmed` (`reservations.ts:377`)                                                                                    |
| Signed URL dos documentos                               | ⚠️     | `[D4-005]` — uma chamada de rede por documento                                                                                                 |
| **Leitura de CPF/documento pelo gestor auditada**       | ⛔     | `[D8-002]` — `logPiiAccess` não instrumentado                                                                                                  |

**Veredito:** o fluxo operacional está íntegro e o double-booking tem a melhor proteção possível (constraint de exclusão GiST, não lógica de aplicação). As rupturas são de PII: a leitura de dado sensível de pastores e missionários não deixa rastro.

---

## FLX-08 — Matrícula → progresso → certificado (LMS)

| Elo                                             | Estado | Evidência                                                                |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| Catálogo e matrícula para qualquer autenticado  | ✅     | BRAIN §6.3; `enrollInCourse` sob `plataformaAction`                      |
| Trilha sequencial (desbloqueio)                 | ✅     | `plataforma.course_outline()`, `requires_completion`                     |
| Aula arquivada não tranca a trilha              | ✅     | P-6.16 / `0082`, `0083`                                                  |
| Progresso por aula                              | ✅     | `markLessonComplete`                                                     |
| Certificado automático ao concluir              | ✅     | `checkAndIssueCertificate` — conta pela outline, não por `course_id` cru |
| Hash de verificação pública                     | ✅     | `UNIQUE(verification_hash)`, rota `/certificado/verificar`               |
| Certificado sobrevive a curso arquivado         | ✅     | P-6.17                                                                   |
| **Vídeo da aula**                               | ⛔     | `[NEG-012]` — URL colada à mão; sem Bunny, sem URL assinada              |
| Listagem de certificados                        | ⚠️     | `[D4-005]` — uma transação por certificado                               |
| **Certificado sobrevive à exclusão do usuário** | ⛔     | `[D2-001]` — `ON DELETE CASCADE` de `public.users`                       |

**Veredito:** a lógica pedagógica é sólida e foi bem endurecida pelos corretivos P-6.16/6.17/6.19. Os dois elos rompidos são de infraestrutura: o vídeo não tem pipeline e o certificado não tem proteção contra hard delete do aluno.

---

## Síntese dos fluxos

| Fluxo                              | Veredito                                           |
| ---------------------------------- | -------------------------------------------------- |
| FLX-01 Projeto → pagamentos        | ⛔ elo rompido `[FLX-001]`                         |
| FLX-02 Governança dual             | ⚠️ íntegro; frágil no e-mail e na mensagem de erro |
| FLX-03 Estorno                     | ✅ íntegro em todos os elos                        |
| FLX-04 Exclusão LGPD               | ⛔ **P0** — sem caminho de execução                |
| FLX-05 Convite → papel → cross-app | ⛔ conflito de interesse + sem middleware          |
| FLX-06 Impersonação                | ⛔ elo rompido `[FLX-002]`                         |
| FLX-07 Reserva de flat             | ⚠️ operacional íntegro; PII sem rastro             |
| FLX-08 LMS                         | ⚠️ lógica íntegra; vídeo e certificado expostos    |

**Padrão observado:** os elos que quebram quase nunca estão na lógica de negócio — que é consistentemente boa, com constraints de banco onde importa. Quebram nas **costuras**: entre a action e a integração cross-app (FLX-01), entre a primitiva e a tela (FLX-04), entre o cookie e a sessão (FLX-06), entre o registro e a leitura (FLX-07). É o tipo de falha que a auditoria por fase estruturalmente não vê, porque cada lado da costura passa no seu próprio critério de aceite.

# D6 — Drift PRD ↔ código (Nível B, cruza com Fase 1)

## Checklist

| Item                                                                                 | Status                                     |
| ------------------------------------------------------------------------------------ | ------------------------------------------ |
| Reduções silenciosas ("simplificado", "por enquanto", "v1", "básico") em comentários | ✅ ver §1 — resultado limpo                |
| Máquinas de estado: transições no código = transições do PRD                         | ✅ com 1 ambiguidade — ver §2 e `[D6-004]` |
| Critérios de aceite: edge cases verificados, não só caminho feliz                    | ⚠️ ver `[D6-001]`                          |
| Validações do PRD (CPF, e-mail, limites, valores mínimos) com a rigidez especificada | ⚠️ ver §3                                  |
| Entidades renomeadas no código sem atualização da spec (ou vice-versa)               | ⛔ `[D6-004]`                              |

---

## 1. Reduções silenciosas — busca limpa

Busca exaustiva em `apps/*/src` e `packages/*/src` (excluindo testes) pelos padrões `por enquanto|simplificad|versão básica|por ora|provisóri|temporári|futuramente|não implementad|fica para|deixad[oa] para`:

**2 hits, ambos legítimos.**

- `packages/db/src/consents.ts:39` — "de uma finalidade específica para vários usuários", frase normal
- `packages/types/src/projetos/index.ts:274` — `// Formulário simplificado — 6 campos obrigatórios.` que **é** a especificação do BRAIN §6.2 para projeto pontual, não uma redução

Nenhuma funcionalidade foi cortada com "por enquanto" e esquecida. ✅ Este era o achado que a Fase 1 previa como provável e ele não se materializou — as ausências reais deste ecossistema (`[NEG-001]` a `[NEG-012]`) são prompts que nunca foram escritos, não implementações amputadas.

## 2. Máquina de estados de projetos

`packages/db/src/schema/projetos.ts:79-88`:

```ts
export const VALID_STAGE_TRANSITIONS: Record<ProjectStage, ProjectStage[]> = {
  rascunho: ["validacao"],
  validacao: ["votacao", "aprovado", "reprovado"],
  votacao: ["homologacao"],
  homologacao: ["aprovado", "reprovado"],
  aprovado: ["em_execucao"],
  reprovado: [],
  em_execucao: ["concluido"],
  concluido: [],
};
```

Confronto com `BRAIN.md:293-294` (`rascunho → validação → votação → homologação (7 dias) → aprovado/reprovado → em execução → concluído`): **casa exatamente**. ✅

E PATCH-026 (votação não pode decidir "reprovado" fora da homologação) está honrado — `votacao: ["homologacao"]`, sem atalho. O mapa é consumido por `apps/projetos/src/actions/projects.ts:687` e `voting.ts:154,270,351`, e tem teste dedicado (`apps/projetos/src/__tests__/state-machine.test.ts`). ✅

**Ambiguidade da spec, não do código:** o comentário `:77-78` documenta `pontual: validacao → aprovado | reprovado (skip votacao/homologacao)`, o que explica a bifurcação em `validacao`. O BRAIN diz em `:293` "**Ciclo de vida (mesmo para ambos)**", mas em `:290` diz que o projeto pontual é decidido por "**consenso presencial**" — que é justamente não passar pela votação do sistema. O BRAIN se contradiz; o código escolheu a leitura coerente. Registro para que a spec seja corrigida, não o código.

## 3. Validações

| Regra do BRAIN                                            | Implementação                                                                                | Veredito      |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------- |
| Scoring de Flats — máx. 75 pts (§6.8, corrigido em S-121) | `apps/flats/src/actions/scoring.ts:33` → `export const SCORING_MAX_POINTS = 75;`             | ✅            |
| Critério d) saúde binário (5/0), sem laudo                | `scoring.ts:52` → `healthSelfDeclared: boolean \| null`                                      | ✅            |
| Máx. 2 contestações por projeto; 1 por pessoa             | `UNIQUE (project_id,user_id)` + trigger `check_contestation_limit`                           | ✅            |
| Quórum ≥50% por **pessoa distinta** (PATCH-007)           | `countEligibleVoters` + `computeVoteResult` (P-2.8b/S-205)                                   | ✅            |
| Teto de orçamento bloqueia submissão (§6.2)               | `checkOrganizationBudget` (PATCH-013), mesma query usada no dashboard (`queries.ts:463-468`) | ✅            |
| Governança dual: autorizador ≠ aprovador (§6.5)           | `approval.ts:361-365`                                                                        | ✅            |
| Máx. 7 dias consecutivos por 12 meses (§6.8)              | `flats.usage_history` + `daterange`                                                          | ✅            |
| CPF                                                       | `packages/validators/src/flats/index.ts:5` → `z.string().regex(/^\d{11}$/)`                  | ⚠️ ver abaixo |

**CPF:** validado apenas como 11 dígitos, sem dígito verificador — aceita `00000000000`. O BRAIN não exige verificação de DV, então não é violação de spec; é rigor abaixo do razoável para um documento que identifica o hóspede de um flat e é PII sensível. **P3**, sem achado próprio.

---

### [D6-001] Três corretivos marcados como "pendentes" já estão feitos ou foram superados — drift de registro

- **Severidade:** P3 | **Domínio:** Drift de registro | **App:** fundação, flats
- **Status:** CONFIRMADO
- **Evidência:** `PROMPTS.md:26`
- **Trecho:**
  ```
  ### Correções (S1-26 — cabeçalho antigo dizia "3 correções"; eram 4; hoje são 41 no total,
  3 pendentes: P-0.4b, P-7.1b, P-7.5b — ...)
  ```
  e as linhas da tabela:
  ```
  | P-0.4b    | Auth: simetria de decode de cookie no browser client          | neste arquivo | pendente |
  | P-7.1b    | Flats: máximo de scoring em BRAIN §6.8 (80 → 75)              | neste arquivo | pendente |
  | P-7.5b    | Flats: fiação das telas do Bloco A para validação diretoria   | neste arquivo | pendente |
  ```
- **Encontrado, item a item:**
  - **P-0.4b — feito.** `SESSIONS.md:13583` registra `## S-172 — P-0.4b — Simetria de codificação de cookies no browser client (CORRETIVO — round-trip de cookie quebrado latente)`. A tabela nunca foi atualizada.
  - **P-7.1b — feito.** O objetivo era corrigir o máximo de 80 para 75 no BRAIN. `BRAIN.md:455` já diz: _"**Scoring automático (máx. 75 pontos)** — corrigido em S-121…"_, e o código concorda (`SCORING_MAX_POINTS = 75`). O conteúdo foi entregue por outra sessão; a linha ficou.
  - **P-7.5b — superado.** Era "fiação das telas do Bloco A Flats para validação da diretoria". O Bloco B inteiro do Flats (P-7.6 a P-7.12, mais P-7.6b/P-7.9b/P-7.9c) rodou depois, ligando as telas a dados reais. O prompt perdeu o objeto. Nenhuma sessão o registra.
- **Impacto:** Baixo em risco técnico, alto em confiança no registro. `PROMPTS.md` é uma das quatro fontes de verdade da metodologia SDD; se ele afirma que há 3 correções pendentes e nenhuma está de fato pendente, a próxima pessoa a planejar trabalho a partir dele planeja errado. Este é o mesmo tipo de defeito que `[NEG-003]` (P-9.0 citado como pré-condição e inexistente) — o registro e a realidade se soltaram nas bordas.
- **Correção sugerida:** Atualizar as três linhas e o cabeçalho (`3 pendentes` → `0 pendentes`), com nota apontando S-172 e S-121. Marcar P-7.5b como "superado por P-7.6–P-7.12".

---

### [D6-002] A regra de conflito de interesse é verificada em 1 dos 3 caminhos que concedem papéis

- **Severidade:** P2 | **Domínio:** Drift PRD ↔ código / Governança | **App:** admin, intranet
- **Status:** CONFIRMADO
- **Evidência:** `apps/admin/src/actions/roles.ts:18-51` (a verificação) e os outros dois pontos de escrita
- **Trecho (a verificação, correta e bidirecional):**

  ```ts
  const GOVERNANCE_ROLES: Role[] = ["diretor", "conselheiro"];
  const RESTRICTED_ROLES: Role[] = ["submissor", "hospede"];

  async function checkConflictOfInterest(
    tx: AuthenticatedTx,
    userId: string,
    newRole: Role,
  ): Promise<void> {
    ...
    if (GOVERNANCE_ROLES.includes(newRole)) {
      const conflicts = current.filter((r) => RESTRICTED_ROLES.includes(r));
      if (conflicts.length > 0) {
        throw new Error(
          `Conflito de interesse: o usuário já possui o(s) papel(éis) ${conflicts.join(", ")}. ` +
            `Diretores e conselheiros não podem ser submissores nem hóspedes.`,
        );
  ```

- **Esperado:** `BRAIN.md:151-154`:

  ```
  ### Conflitos de interesse

  - Diretores/conselheiros: NÃO podem submeter projetos NEM hospedar-se nos flats
  ```

  e `BRAIN.md:142`: _"Múltiplos papéis por usuário permitidos (**com verificação de conflito**)."_

- **Encontrado:** Existem **três** caminhos que inserem em `public.role_assignments` (busca exaustiva `grep -rn "insert(roleAssignments)" apps/*/src packages/*/src`, excluindo testes):

  | #   | Local                                                               | Chama `checkConflictOfInterest`? |
  | --- | ------------------------------------------------------------------- | -------------------------------- |
  | 1   | `apps/admin/src/actions/roles.ts:122` (`assignRole`)                | ✅ sim, em `:95`                 |
  | 2   | `apps/admin/src/actions/users.ts:478` (aprovação de auto-cadastro)  | ❌ **não**                       |
  | 3   | `apps/intranet/src/actions/invitations.ts:122` (`acceptInvitation`) | ❌ **não**                       |

  O caminho 2 concede `submissor` fixo ao aprovar um auto-cadastro:

  ```ts
  await tx.insert(roleAssignments).values({
    userId: parsedInput.id,
    role: "submissor",
    scope: "global",
    grantedBy: ctx.actorId,
  });
  ```

  Se quem se auto-cadastrou já for `diretor` ou `conselheiro`, o conflito nasce ali, silenciosamente.

  O caminho 3 insere **os papéis que o convite carregar**, e `sendInvitation` (`apps/admin/src/actions/invitations.ts:33`) aceita qualquer combinação: `roles: z.array(roleEnum).min(1, "Selecione pelo menos um papel")`. Nada impede um convite com `["diretor", "submissor"]`.

- **Impacto:** A regra existe para proteger a lisura das decisões: um diretor que também é submissor vota em projetos concorrentes ao seu, e um conselheiro hóspede se autoaprova reserva de flat (o `.docs/EDITAL...` trata a hospedagem como benefício concedido). As portas 2 e 3 permitem exatamente a combinação que a porta 1 recusa — e nenhuma RLS cobre a regra (é semântica de negócio, não de linha).
- **Correção sugerida:** Extrair `checkConflictOfInterest` para `packages/db` (ou `packages/auth`) e chamá-la nos três caminhos. Adicionalmente, validar a combinação já em `sendInvitation`, para falhar cedo em vez de no aceite.

---

### [D6-003] A conciliação bancária sugere payable/receivable só por valor; a spec pede valor + data + descrição

- **Severidade:** P3 | **Domínio:** Drift PRD ↔ código | **App:** financeiro
- **Status:** CONFIRMADO
- **Evidência:** `apps/financeiro/src/actions/conciliation.ts:164-169` e `:181-186`
- **Trecho:**
  ```ts
      if (rowAmount < 0) {
        const payableMatch = pendingPayables.find((p) => {
          const pAmount = parseFloat(p.amount);
          return Math.abs(pAmount - Math.abs(rowAmount)) < 0.01;
        });
  ```
- **Esperado:** `BRAIN.md:413` — _"**Conciliação bancária:** DOR REAL — atualmente manual. Importação OFX/CSV é necessidade do dia 1. **Match automático por valor + data + descrição.**"_
- **Encontrado:** O casamento contra **transação já lançada** (`:130-148`) implementa os três critérios corretamente — valor com tolerância de 1 centavo, data com janela de 3 dias, e exige sobreposição de descrição. ✅

  Já a **sugestão** de payable/receivable usa apenas o valor. Sem filtro de data e sem descrição, `.find()` devolve o primeiro registro pendente de mesmo valor — e o Financeiro é cheio de valores recorrentes idênticos (BRAIN §6.9 cita conta de consumo mensal, IPTU anual, convite Capelowski mensal como recorrências).

- **Impacto:** Limitado, porque é rotulado `confidence: "medium"` e um humano confirma antes de aplicar (só o match de transação, de alta confiança, é aplicado automaticamente em `:159-161`). O custo é sugestão errada frequente numa tela que existe justamente para eliminar trabalho manual — a "dor real" do BRAIN.
- **Correção sugerida:** Acrescentar a janela de data (`dueDate`/`expectedDate` vs. `row.date`, ±5 dias) e desempatar por descrição, reusando a heurística que já existe logo acima no mesmo arquivo.

---

### [D6-004] `ProjectStage` tem 9 valores no `packages/types` e 8 no banco — a UI carrega um estágio que não existe

- **Severidade:** P3 | **Domínio:** Drift de tipos | **App:** projetos
- **Status:** CONFIRMADO
- **Evidência:** `packages/types/src/projetos/index.ts:1-14` vs. `packages/db/src/schema/projetos.ts:64-73`
- **Trecho (types — 9 valores):**

  ```ts
  // ─── ProjectStage ─────────────────────────────────────────────────────────────
  // 9-state lifecycle: rascunho → validacao → votacao → homologacao (7d) →
  // aprovado/reprovado → em_execucao → concluido | cancelado (any stage)

  export type ProjectStage =
    | "rascunho"
    ...
    | "concluido"
    | "cancelado";
  ```

- **Trecho (schema — 8 valores, sem `cancelado`):**
  ```ts
  export const PROJECT_STAGES = [
    "rascunho",
    "validacao",
    "votacao",
    "homologacao",
    "aprovado",
    "reprovado",
    "em_execucao",
    "concluido",
  ] as const;
  ```
- **Encontrado:** `cancelado` não existe no enum do Postgres, não aparece em `VALID_STAGE_TRANSITIONS` e nenhuma action o escreve — mas sobrevive em cinco lugares da UI: `stage-utils.ts:17` (label), `:34` (badge), `project-kanban.tsx:28,86` (grupo de encerrados + estilo), `project-timeline.tsx:22,34` (label + cor), e no filtro do pipeline (`:178,182`).

  O código chegou a documentar a inconsistência em vez de resolvê-la — `apps/projetos/src/app/(diretoria)/pipeline/page.tsx:196-199`:

  ```ts
  // "cancelado" existe no enum de @hebron/types para a coluna de
  // encerrados, mas não é um estágio da state machine real (nem droppable
  // — PIPELINE_STAGES não a lista) — nunca alcançado a partir do drag.
  if (targetStage === "cancelado") return;
  ```

- **Esperado:** O cancelamento no BRAIN §6.2 é _soft-delete com justificativa_, não um estágio: _"Exclusão: soft-delete com justificativa obrigatória em qualquer estágio"_ — e é exatamente assim que `deleteProject` (`apps/projetos/src/actions/projects.ts:880`) o implementa, gravando `deletedAt`.
- **Impacto:** Nenhum defeito visível ao usuário (a coluna "encerrados" nunca recebe nada por esse rótulo). O custo é o tipo mentir: `ProjectStage` é usado em assinaturas por todo o app, e o compilador exige tratar um caso impossível, o que produz ramos mortos como o `return` acima. É também a única violação encontrada do item "tipos derivados do Drizzle, sem interfaces manuais paralelas divergindo" de D3.
- **Correção sugerida:** Remover `"cancelado"` de `packages/types/src/projetos/index.ts` (e o comentário "9-state") e limpar os cinco pontos de UI. O compilador aponta todos.

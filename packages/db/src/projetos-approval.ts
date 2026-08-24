import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "./client";
import { costCenters, payables } from "./schema/financeiro";
import { paymentSchedules, projects } from "./schema/projetos";
import { roleAssignments, users } from "./schema/public";
import { logAudit } from "./audit";
import { getSystemActorId } from "./system-actor";
import { makeNotificationInserter } from "./notifications";
import { createNotification } from "@hebron/email/types";

/**
 * Efeitos colaterais de um projeto entrar em stage "aprovado" — extraído de
 * `apps/projetos/src/actions/projects.ts` (P-0.14) para que tanto a action
 * manual (`transitionProjectStage`) quanto o cron de homologação automática
 * (`packages/jobs`, sem sessão HTTP) chamem exatamente a mesma lógica, em vez
 * de duas cópias divergentes.
 */

/**
 * Emite uma linha de `payment_schedules` por parcela do projeto.
 *
 * P-2.6c corrigiu dois defeitos aqui:
 *
 * 1. **Meses reais.** Antes, o mês de cada parcela era `(i % 12) + 1` —
 *    jan/fev/mar — porque o banco só guardava a CONTAGEM (`meses`). Agora
 *    `projects.meses_pagamento` guarda a lista escolhida no wizard e é ela
 *    que define o vencimento. Projetos anteriores à migration 0091 têm a
 *    coluna `null`: para eles o fallback mantém exatamente o comportamento
 *    antigo (Jan–N), para não mudar o resultado de nada já aprovado.
 * 2. **Centavos.** `toFixed(2)` em toda parcela perdia até n−1 centavos por
 *    projeto (R$ 10.000,00 ÷ 3 = três de 3.333,33 = R$ 9.999,99). O cálculo
 *    passa a ser em centavos inteiros, com o resto distribuído nas primeiras
 *    parcelas — a soma é exatamente `budget_total`.
 *
 * `mesesPagamento` é opcional na assinatura (e não parte do `Pick`) para que
 * chamadores que montam o projeto à mão continuem válidos; os dois call sites
 * reais (`transitionProjectStage` e o cron de homologação) passam a linha
 * inteira de `projects`, então a coluna chega sozinha.
 */
export async function generatePaymentSchedule(
  project: Pick<
    typeof projects.$inferSelect,
    "id" | "parcelas" | "budgetTotal" | "evaluationYear" | "meses"
  > & { mesesPagamento?: number[] | null },
): Promise<void> {
  if (!project.parcelas || !project.budgetTotal || !project.evaluationYear)
    return;

  const evalYear = project.evaluationYear;

  // Meses escolhidos (ordem crescente) ou, para projeto anterior a 0091,
  // o fallback histórico Jan–N.
  const chosen = project.mesesPagamento;
  const months =
    chosen && chosen.length > 0
      ? [...chosen].sort((a, b) => a - b)
      : Array.from(
          { length: project.meses ?? project.parcelas },
          (_, i) => (i % 12) + 1,
        );

  // Divisão em centavos inteiros: `resto` parcelas recebem um centavo a mais.
  // O divisor é o número de linhas emitidas (não `parcelas`), que é o que
  // garante soma exata mesmo numa linha antiga em que meses ≠ parcelas.
  const totalCents = Math.round(parseFloat(project.budgetTotal) * 100);
  const base = Math.floor(totalCents / months.length);
  const resto = totalCents - base * months.length;

  const paymentRows = months.map((month, i) => {
    const cents = base + (i < resto ? 1 : 0);
    // String de data montada diretamente — `new Date(y, m-1, 1).toISOString()`
    // desloca o dia (e às vezes o mês) conforme o fuso do processo.
    const dueDateStr = `${evalYear}-${String(month).padStart(2, "0")}-01`;
    return {
      projectId: project.id,
      amount: (cents / 100).toFixed(2),
      month,
      dueDate: dueDateStr,
      status: "pendente" as const,
    };
  });

  await db.insert(paymentSchedules).values(paymentRows);
}

// ---------------------------------------------------------------------------
// onProjectApproved — Projetos → Financeiro
//
// Chamado quando um projeto transiciona para "aprovado". Cria:
//   1. Um centro de custo no schema financeiro (1:1 com o projeto).
//   2. Um payable por parcela em payment_schedules (P-3.11 — substitui o
//      stub anterior, que só criava o centro de custo). Nascem em
//      status "pendente" — NÃO aprovados (BRAIN §6.2) — e seguem o fluxo
//      normal de governança dual (aprovação + autorização).
// As payment_schedules já são criadas em paralelo por generatePaymentSchedule.
//
// Idempotente: onConflictDoNothing evita duplicatas em retentativas — tanto
// o centro de custo (UNIQUE project_id) quanto o payable (UNIQUE
// payment_schedule_id) toleram reexecução sem duplicar dados.
// Falha silenciosa para o chamador: não bloqueia a transição do projeto
// (ver comentário nos call-sites em apps/projetos e packages/jobs).
// ---------------------------------------------------------------------------

export async function onProjectApproved(projectId: string): Promise<void> {
  const [project] = await db
    .select({
      title: projects.title,
      budgetTotal: projects.budgetTotal,
      evaluationYear: projects.evaluationYear,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project?.budgetTotal) return;

  const year = project.evaluationYear ?? new Date().getFullYear();
  // Code format: PROJ-{year}-{last 8 chars of UUID} — legível e único
  const suffix = projectId.replace(/-/g, "").slice(-8).toUpperCase();
  const code = `PROJ-${year}-${suffix}`;
  // Aliased para o closure abaixo — o estreitamento de `project?.budgetTotal`
  // não atravessa a fronteira de função do callback de db.transaction.
  const projectTitle = project.title;
  const projectBudgetTotal = project.budgetTotal;

  const actorId = await getSystemActorId();

  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(costCenters)
      .values({
        projectId,
        code,
        name: projectTitle,
        budgetTotal: projectBudgetTotal,
        status: "ativo",
      })
      .onConflictDoNothing()
      .returning();

    const costCenter =
      inserted[0] ??
      (
        await tx
          .select()
          .from(costCenters)
          .where(eq(costCenters.projectId, projectId))
          .limit(1)
      )[0];

    if (!costCenter) throw new Error("Falha ao criar/obter centro de custo");

    const schedules = await tx
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, projectId));

    for (const schedule of schedules) {
      const payableRows = await tx
        .insert(payables)
        .values({
          description: `Parcela ${schedule.month} — ${projectTitle}`,
          amount: schedule.amount,
          dueDate: schedule.dueDate,
          costCenterId: costCenter.id,
          paymentScheduleId: schedule.id,
          status: "pendente",
          createdBy: actorId,
        })
        .onConflictDoNothing()
        .returning();

      const payable = payableRows[0];
      if (!payable) continue; // já existia (retentativa) — nada novo a auditar

      await logAudit(
        {
          actorId,
          action: "financeiro.payable.created",
          entity: "payable",
          entityId: payable.id,
          diff: {
            source: "project-approval",
            projectId,
            paymentScheduleId: schedule.id,
            amount: payable.amount,
            dueDate: payable.dueDate,
          },
        },
        tx,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// notifyProjectApprovalFailure — chamada pelos dois call sites de
// onProjectApproved (apps/projetos/src/actions/projects.ts e
// packages/jobs/src/crons/projetos.ts, PACOTE 2 / FLX-001) quando a
// integração falha. Um projeto aprovado sem centro de custo/payables é
// intervenção humana obrigatória — a transição de estágio já foi commitada
// e não é revertida por isso, mas ninguém pode ficar sem saber que o
// dinheiro do projeto não foi provisionado. Best-effort (Promise.allSettled
// + audit "best_effort"): a notificação da falha não pode ela mesma travar
// o chamador nem mascarar o erro original.
// ---------------------------------------------------------------------------

export async function notifyProjectApprovalFailure(
  projectId: string,
  errorMessage: string,
): Promise<void> {
  const actorId = await getSystemActorId();

  await logAudit({
    actorId,
    action: "financeiro.integration.failed",
    entity: "project",
    entityId: projectId,
    diff: {
      integration: "onProjectApproved",
      error: errorMessage,
    },
    criticality: "best_effort",
  });

  const admins = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .innerJoin(roleAssignments, eq(roleAssignments.userId, users.id))
    .where(
      and(
        inArray(roleAssignments.role, ["super_admin"]),
        isNull(roleAssignments.revokedAt),
        isNull(users.suspendedAt),
      ),
    );

  const title = "Integração financeira falhou";
  const body =
    "Um projeto foi aprovado, mas o centro de custo e os pagamentos não foram criados automaticamente. Verifique e crie manualmente se necessário.";
  const href = `/pipeline/${projectId}`;

  await Promise.allSettled(
    admins.map((admin) =>
      createNotification({
        insert: makeNotificationInserter(),
        data: {
          userId: admin.id,
          channel: "in_app",
          type: "financeiro.integration.failed",
          title,
          body,
          payload: { module: "projetos", projectId, href },
        },
      }),
    ),
  );
}

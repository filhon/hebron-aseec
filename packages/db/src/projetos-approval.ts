import { eq } from "drizzle-orm";
import { db } from "./client";
import { costCenters, payables } from "./schema/financeiro";
import { paymentSchedules, projects } from "./schema/projetos";
import { logAudit } from "./audit";
import { getSystemActorId } from "./system-actor";

/**
 * Efeitos colaterais de um projeto entrar em stage "aprovado" — extraído de
 * `apps/projetos/src/actions/projects.ts` (P-0.14) para que tanto a action
 * manual (`transitionProjectStage`) quanto o cron de homologação automática
 * (`packages/jobs`, sem sessão HTTP) chamem exatamente a mesma lógica, em vez
 * de duas cópias divergentes.
 */

export async function generatePaymentSchedule(
  project: Pick<
    typeof projects.$inferSelect,
    "id" | "parcelas" | "budgetTotal" | "evaluationYear" | "meses"
  >,
): Promise<void> {
  if (!project.parcelas || !project.budgetTotal || !project.evaluationYear)
    return;

  const amountPerInstallment =
    parseFloat(project.budgetTotal) / project.parcelas;

  // Create one payment per month in the `meses` count (evenly distributed Jan–meses)
  // Full months list is in version snapshot; DB stores only count so we distribute evenly
  const monthCount = project.meses ?? project.parcelas;
  const paymentRows = Array.from({ length: monthCount }, (_, i) => {
    const month = ((i % 12) + 1) as
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6
      | 7
      | 8
      | 9
      | 10
      | 11
      | 12;
    const evalYear = project.evaluationYear;
    if (!evalYear) throw new Error("Ano de avaliação ausente");
    const dueDate = new Date(evalYear, month - 1, 1);
    const dueDateStr = dueDate.toISOString().split("T")[0];
    if (!dueDateStr) throw new Error("Invalid due date");
    return {
      projectId: project.id,
      amount: amountPerInstallment.toFixed(2),
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

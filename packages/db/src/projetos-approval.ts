import { eq } from "drizzle-orm";
import { db } from "./client";
import { costCenters } from "./schema/financeiro";
import { paymentSchedules, projects } from "./schema/projetos";

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
// Chamado quando um projeto transiciona para "aprovado".
// Cria um centro de custo no schema financeiro (stub até Fase 4).
// As payment_schedules já são criadas em paralelo por generatePaymentSchedule.
//
// Idempotente: onConflictDoNothing evita duplicatas em retentativas.
// Falha silenciosa: não bloqueia a transição do projeto.
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

  await db
    .insert(costCenters)
    .values({
      projectId,
      code,
      name: project.title,
      budgetTotal: project.budgetTotal,
      status: "ativo",
    })
    .onConflictDoNothing();
}

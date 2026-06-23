import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { costCenters, projects } from "@hebron/db/schema";

// ---------------------------------------------------------------------------
// onProjectApproved — Projetos → Financeiro
//
// Chamado quando um projeto transiciona para "aprovado".
// Cria um centro de custo no schema financeiro (stub até Fase 4).
// As payment_schedules já são criadas em paralelo por generatePaymentSchedule
// em apps/projetos/src/actions/projects.ts.
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

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { projects } from "@hebron/db/schema";

// ---------------------------------------------------------------------------
// getProjectParticipationScore — Projetos → Flats
//
// Retorna métricas de participação de um usuário em projetos para compor o
// score de solicitações no módulo Flats (campo auto-calculado, Fase 7).
// Chamada pela action de scoring do módulo Flats.
// ---------------------------------------------------------------------------

export type ProjectParticipationScore = {
  userId: string;
  activeProjects: number;
  totalApprovedOrExecuted: number;
  totalBudgetApproved: number;
  completedProjects: number;
};

const ACTIVE_STAGES = ["aprovado", "em_execucao"] as const;
const POSITIVE_STAGES = ["aprovado", "em_execucao", "concluido"] as const;

export async function getProjectParticipationScore(
  userId: string,
): Promise<ProjectParticipationScore> {
  const userProjects = await db
    .select({
      stage: projects.stage,
      budgetTotal: projects.budgetTotal,
    })
    .from(projects)
    .where(and(eq(projects.submitterId, userId), isNull(projects.deletedAt)));

  const active = userProjects.filter((p) =>
    (ACTIVE_STAGES as readonly string[]).includes(p.stage),
  );

  const positive = userProjects.filter((p) =>
    (POSITIVE_STAGES as readonly string[]).includes(p.stage),
  );

  const totalBudget = positive.reduce(
    (acc, p) => acc + parseFloat(p.budgetTotal ?? "0"),
    0,
  );

  const completed = userProjects.filter((p) => p.stage === "concluido");

  return {
    userId,
    activeProjects: active.length,
    totalApprovedOrExecuted: positive.length,
    totalBudgetApproved: totalBudget,
    completedProjects: completed.length,
  };
}

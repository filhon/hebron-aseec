import { and, eq, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { documents, editals, projects } from "@hebron/db/schema";

// ---------------------------------------------------------------------------
// getEditalPrefill — Documentos → Projetos
//
// Retorna dados do edital para pré-preencher o wizard de criação de projeto.
// Chamada pelo wizard quando recebe ?editalId=<uuid> na URL.
// ---------------------------------------------------------------------------

export type EditalPrefill = {
  editalId: string;
  editalTitle: string;
  tipo: "pontual" | "anual" | null;
  projectCategoryId: string | null;
  closesAt: Date | null;
};

export async function getEditalPrefill(
  editalId: string,
): Promise<EditalPrefill | null> {
  const [row] = await db
    .select({
      id: editals.id,
      title: documents.title,
      projectType: editals.projectType,
      projectCategoryId: editals.projectCategoryId,
      closesAt: editals.closesAt,
    })
    .from(editals)
    .innerJoin(documents, eq(documents.id, editals.id))
    .where(eq(editals.id, editalId))
    .limit(1);

  if (!row) return null;

  const tipo = row.projectType as "pontual" | "anual" | null;

  return {
    editalId: row.id,
    editalTitle: row.title,
    tipo: tipo ?? null,
    // projectCategoryId referencia documentos.categories; o wizard usa
    // projetos.projectCategories — o mapeamento é feito pelo componente
    // com base no slug da categoria quando o módulo financeiro estiver completo.
    projectCategoryId: row.projectCategoryId,
    closesAt: row.closesAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// getProjectParticipationScore — Flats → Projetos
//
// Retorna métricas de participação de um usuário em projetos para compor o
// score de solicitações no módulo Flats (campo auto-calculado na Fase 3).
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

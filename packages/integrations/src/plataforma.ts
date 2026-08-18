import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { courses, enrollments } from "@hebron/db/schema";

// ---------------------------------------------------------------------------
// getStudentKpiMetrics — Plataforma → Intranet
//
// Alimenta o KPI "Alunos na Plataforma" do dashboard da Intranet (BRAIN.md,
// tabela de integrações cross-app §"Plataforma → Intranet"). Substitui o
// stub criado em P-5.11 agora que o schema da Plataforma existe (P-6.6).
//
// totalEnrolled conta alunos distintos (não matrículas) — um aluno com
// várias matrículas conta uma vez só, coerente com "alunos" como unidade do
// KPI. activeCourses conta cursos publicados e não arquivados
// (courses.published AND archived_at IS NULL, P-6.16 — arquivar não
// despublica, então sem o segundo filtro um curso arquivado continuava
// somando no KPI), o universo visível a qualquer usuário registrado (BRAIN
// §6.3). completionRate
// é a fração de matrículas concluídas (enrollments.completedAt) sobre o
// total de matrículas, 0 quando não há nenhuma.
//
// Vive em packages/integrations (P-0.15) — o dashboard da Intranet nunca
// importa direto de apps/plataforma (G6.5, PROMPTS.md).
// ---------------------------------------------------------------------------

export interface StudentKpiMetrics {
  totalEnrolled: number;
  activeCourses: number;
  completionRate: number;
}

export async function getStudentKpiMetrics(): Promise<StudentKpiMetrics> {
  const [enrollmentRow] = await db
    .select({
      totalEnrolled: sql<number>`count(distinct ${enrollments.userId})::int`,
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(case when ${enrollments.completedAt} is not null then 1 end)::int`,
    })
    .from(enrollments);

  const [courseRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(courses)
    .where(and(eq(courses.published, true), isNull(courses.archivedAt)));

  const total = enrollmentRow?.total ?? 0;
  const completed = enrollmentRow?.completed ?? 0;

  return {
    totalEnrolled: enrollmentRow?.totalEnrolled ?? 0,
    activeCourses: courseRow?.count ?? 0,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

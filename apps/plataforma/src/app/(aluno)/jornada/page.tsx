import { PageHeader, EmptyState } from "@hebron/ui";
import { Route } from "lucide-react";
import { CourseCard } from "../../../components/course-card";
import { ProgressBar } from "../../../components/progress-bar";
import {
  requireAlunoSession,
  getUserEnrollmentsWithProgress,
} from "../../../lib/queries";

export default async function JornadaPage() {
  const session = await requireAlunoSession();
  const entries = await getUserEnrollmentsWithProgress(session.actorId);

  const inProgress = entries.filter((e) => !e.enrollment.completedAt);
  const completed = entries.filter((e) => e.enrollment.completedAt);

  const overallPercent =
    entries.length > 0
      ? Math.round(
          entries.reduce((sum, e) => sum + e.progressPercent, 0) /
            entries.length,
        )
      : 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Minha jornada"
        description="Seus cursos em andamento e concluídos na Plataforma."
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={Route}
          title="Você ainda não se matriculou em nenhum curso"
          description="Explore o catálogo e matricule-se em uma trilha de formação."
          quote={{
            text: "Prossigo para o alvo, pelo prêmio da soberana vocação de Deus em Cristo Jesus.",
            reference: "Filipenses 3:14",
          }}
        />
      ) : (
        <div className="space-y-10">
          <div className="rounded-md border border-(--border) bg-(--surface) p-5">
            <ProgressBar
              value={overallPercent}
              label="Progresso geral na Plataforma"
              size="md"
            />
          </div>

          <section className="space-y-4">
            <h2 className="font-(family-name:--font-display) text-lg text-(--fg)">
              Em andamento
            </h2>
            {inProgress.length === 0 ? (
              <p className="text-sm text-(--fg-muted)">
                Nenhum curso em andamento no momento.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {inProgress.map((entry) => (
                  <CourseCard
                    key={entry.enrollment.id}
                    course={entry.course}
                    progressPercent={entry.progressPercent}
                    href={`/curso/${entry.course.slug}`}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-(family-name:--font-display) text-lg text-(--fg)">
              Concluídos
            </h2>
            {completed.length === 0 ? (
              <p className="text-sm text-(--fg-muted)">
                Nenhum curso concluído ainda.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map((entry) => (
                  <CourseCard
                    key={entry.enrollment.id}
                    course={entry.course}
                    progressPercent={entry.progressPercent}
                    href={`/curso/${entry.course.slug}`}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

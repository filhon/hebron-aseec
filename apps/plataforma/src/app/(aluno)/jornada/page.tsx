import { Suspense } from "react";
import { PageHeader, EmptyState, ErrorState } from "@hebron/ui";
import { Route } from "lucide-react";
import { CourseCard } from "../../../components/course-card";
import { CourseCardSkeleton } from "../../../components/course-card-skeleton";
import { ProgressBar } from "../../../components/progress-bar";
import {
  requireAlunoSession,
  getUserEnrollmentsWithProgress,
} from "../../../lib/queries";

function Bone({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded bg-(--surface-alt) ${className}`} />
  );
}

function JornadaSkeleton() {
  return (
    <div aria-hidden="true" role="presentation" className="space-y-10">
      <div className="rounded-md border border-(--border) bg-(--surface) p-5">
        <Bone className="mb-2.5 h-3 w-48" />
        <Bone className="h-1.5 w-full rounded-(--radius-pill)" />
      </div>

      {[0, 1].map((i) => (
        <section key={i} className="space-y-4">
          <Bone className="h-4 w-32" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <CourseCardSkeleton key={j} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

async function JornadaContent() {
  const session = await requireAlunoSession();

  let entries: Awaited<ReturnType<typeof getUserEnrollmentsWithProgress>>;
  try {
    entries = await getUserEnrollmentsWithProgress(session.actorId);
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar sua jornada"
        description="Verifique sua conexão e tente novamente."
      />
    );
  }

  const inProgress = entries.filter((e) => !e.enrollment.completedAt);
  const completed = entries.filter((e) => e.enrollment.completedAt);

  const overallPercent =
    entries.length > 0
      ? Math.round(
          entries.reduce((sum, e) => sum + e.progressPercent, 0) /
            entries.length,
        )
      : 0;

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Route}
        title="Você ainda não se matriculou em nenhum curso"
        description="Explore o catálogo e matricule-se em uma trilha de formação."
        quote={{
          text: "Prossigo para o alvo, pelo prêmio da soberana vocação de Deus em Cristo Jesus.",
          reference: "Filipenses 3:14",
        }}
      />
    );
  }

  return (
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
  );
}

export default function JornadaPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Minha jornada"
        description="Seus cursos em andamento e concluídos na Plataforma."
      />

      <Suspense fallback={<JornadaSkeleton />}>
        <JornadaContent />
      </Suspense>
    </div>
  );
}

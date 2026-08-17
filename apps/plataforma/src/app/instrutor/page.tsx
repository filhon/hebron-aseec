import { Suspense } from "react";
import Link from "next/link";
import { PageHeader, Button, EmptyState, ErrorState } from "@hebron/ui";
import { BookOpen, Plus, Users, Award, TrendingUp } from "lucide-react";
import { ProgressBar } from "../../components/progress-bar";
import {
  requireInstrutorSession,
  getInstructorDashboardCourses,
} from "../../lib/queries";

function Bone({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded bg-(--surface-alt) ${className}`} />
  );
}

function InstrutorDashboardSkeleton() {
  return (
    <div aria-hidden="true" role="presentation">
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border border-(--border) bg-(--surface) p-5"
          >
            <Bone className="h-4 w-4 rounded-full" />
            <Bone className="mt-3 h-6 w-12" />
            <Bone className="mt-2 h-2.5 w-20" />
          </div>
        ))}
      </div>

      <Bone className="mb-4 h-4 w-24" />

      <ul className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <li
            key={i}
            className="flex flex-col gap-3 rounded-md border border-(--border) bg-(--surface) p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Bone className="h-2.5 w-20" />
              <Bone className="h-4 w-2/3" />
              <Bone className="h-2.5 w-32" />
            </div>
            <Bone className="h-2.5 w-full rounded-(--radius-pill) sm:w-48" />
          </li>
        ))}
      </ul>
    </div>
  );
}

async function InstrutorDashboardContent() {
  const session = await requireInstrutorSession();

  let courseStats: Awaited<ReturnType<typeof getInstructorDashboardCourses>>;
  try {
    courseStats = await getInstructorDashboardCourses(session.actorId);
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar o painel"
        description="Verifique sua conexão e tente novamente."
      />
    );
  }

  const publishedCourses = courseStats.filter((c) => c.course.isPublished);
  const draftCourses = courseStats.filter((c) => !c.course.isPublished);
  const totalEnrollments = courseStats.reduce(
    (sum, c) => sum + c.enrollmentCount,
    0,
  );
  const totalCertificates = courseStats.reduce(
    (sum, c) => sum + c.certificateCount,
    0,
  );

  const stats = [
    {
      label: "Cursos publicados",
      value: publishedCourses.length,
      icon: BookOpen,
    },
    {
      label: "Rascunhos",
      value: draftCourses.length,
      icon: BookOpen,
    },
    {
      label: "Alunos matriculados",
      value: totalEnrollments,
      icon: Users,
    },
    {
      label: "Certificados emitidos",
      value: totalCertificates,
      icon: Award,
    },
  ];

  return (
    <>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-md border border-(--border) bg-(--surface) p-5"
          >
            <stat.icon className="h-4 w-4 text-(--brand)" aria-hidden="true" />
            <p className="mt-3 font-(family-name:--font-display) text-2xl text-(--fg)">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-(--fg-muted)">{stat.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-4 font-(family-name:--font-display) text-lg text-(--fg)">
        Cursos
      </h2>

      {courseStats.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Nenhum curso ainda"
          description="Os cursos que você criar aparecem aqui, com matrículas e progresso."
          action={
            <Button asChild>
              <Link href="/instrutor/curso/novo">Criar curso</Link>
            </Button>
          }
          hideQuote
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {courseStats.map(({ course, enrollmentCount, avgPercent }) => (
            <li key={course.id}>
              <Link
                href={`/instrutor/curso/${course.id}`}
                className="flex flex-col gap-3 rounded-md border border-(--border) bg-(--surface) p-5 transition-colors duration-(--transition-fast) hover:border-(--brand) sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="hb-eyebrow">{course.category}</span>
                    {!course.isPublished && (
                      <span className="rounded-(--radius-pill) bg-(--color-warning-muted) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--hb-orange-deep)">
                        Rascunho
                      </span>
                    )}
                  </div>
                  <h3 className="mt-0.5 truncate font-(family-name:--font-display) text-base text-(--fg)">
                    {course.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-(--fg-muted)">
                    {enrollmentCount} aluno{enrollmentCount === 1 ? "" : "s"}{" "}
                    matriculado{enrollmentCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="w-full sm:w-48">
                  <ProgressBar
                    value={avgPercent}
                    label="Progresso médio"
                    size="sm"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function InstrutorDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Painel do instrutor"
        description="Estatísticas e cursos da Plataforma."
        actions={
          <Button
            asChild
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            <Link href="/instrutor/curso/novo">Novo curso</Link>
          </Button>
        }
      />

      <Suspense fallback={<InstrutorDashboardSkeleton />}>
        <InstrutorDashboardContent />
      </Suspense>
    </div>
  );
}

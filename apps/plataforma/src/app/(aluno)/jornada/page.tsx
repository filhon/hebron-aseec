"use client";

import * as React from "react";
import { PageHeader, EmptyState } from "@hebron/ui";
import { Route } from "lucide-react";
import { CourseCard } from "../../../components/course-card";
import { CourseCardSkeleton } from "../../../components/course-card-skeleton";
import { ProgressBar } from "../../../components/progress-bar";
import {
  mockCourses,
  mockEnrollments,
  mockLessons,
  mockProgress,
} from "../../../lib/mock-data";

const CURRENT_USER_ID = "user-aluno-01";
const LOADING_DELAY_MS = 500;

function progressPercentFor(courseId: string): number {
  const totalLessons = mockLessons.filter(
    (l) => l.courseId === courseId,
  ).length;
  if (totalLessons === 0) return 0;
  const completedLessons = mockProgress.filter(
    (p) =>
      p.userId === CURRENT_USER_ID && p.courseId === courseId && p.completedAt,
  ).length;
  return Math.round((completedLessons / totalLessons) * 100);
}

export default function JornadaPage() {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), LOADING_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const enrollments = mockEnrollments.filter(
    (e) => e.userId === CURRENT_USER_ID,
  );

  const inProgress = enrollments.filter((e) => !e.completedAt);
  const completed = enrollments.filter((e) => e.completedAt);

  const overallPercent =
    enrollments.length > 0
      ? Math.round(
          enrollments.reduce(
            (sum, e) => sum + progressPercentFor(e.courseId),
            0,
          ) / enrollments.length,
        )
      : 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Minha jornada"
        description="Seus cursos em andamento e concluídos na Plataforma."
      />

      {loading ? (
        <div className="space-y-10">
          <div className="animate-pulse space-y-1.5 rounded-md border border-(--border) bg-(--surface) p-5">
            <div className="flex items-baseline justify-between gap-2">
              <div className="h-2.5 w-40 rounded bg-(--surface-alt)" />
              <div className="h-2.5 w-8 rounded bg-(--surface-alt)" />
            </div>
            <div className="h-2.5 w-full rounded-(--radius-pill) bg-(--surface-alt)" />
          </div>

          <section className="space-y-4">
            <div className="h-5 w-32 animate-pulse rounded bg-(--surface-alt)" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          </section>
        </div>
      ) : enrollments.length === 0 ? (
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
            <h2 className="font-(--font-display) text-lg text-(--fg)">
              Em andamento
            </h2>
            {inProgress.length === 0 ? (
              <p className="text-sm text-(--fg-muted)">
                Nenhum curso em andamento no momento.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {inProgress.map((enrollment) => {
                  const course = mockCourses.find(
                    (c) => c.id === enrollment.courseId,
                  );
                  if (!course) return null;
                  return (
                    <CourseCard
                      key={enrollment.id}
                      course={course}
                      progressPercent={progressPercentFor(course.id)}
                      href={`/curso/${course.slug}`}
                    />
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-(--font-display) text-lg text-(--fg)">
              Concluídos
            </h2>
            {completed.length === 0 ? (
              <p className="text-sm text-(--fg-muted)">
                Nenhum curso concluído ainda.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map((enrollment) => {
                  const course = mockCourses.find(
                    (c) => c.id === enrollment.courseId,
                  );
                  if (!course) return null;
                  return (
                    <CourseCard
                      key={enrollment.id}
                      course={course}
                      progressPercent={progressPercentFor(course.id)}
                      href={`/curso/${course.slug}`}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

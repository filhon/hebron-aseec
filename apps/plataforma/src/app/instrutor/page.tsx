"use client";

import Link from "next/link";
import { PageHeader, Button, EmptyState } from "@hebron/ui";
import { BookOpen, Plus, Users, Award, TrendingUp } from "lucide-react";
import { ProgressBar } from "../../components/progress-bar";
import {
  mockCourses,
  mockEnrollments,
  mockLessons,
  mockProgress,
  mockCertificates,
} from "../../lib/mock-data";

const CURRENT_INSTRUCTOR_ID = "instr-01";

function courseStats(courseId: string) {
  const enrollments = mockEnrollments.filter((e) => e.courseId === courseId);
  const totalLessons = mockLessons.filter(
    (l) => l.courseId === courseId,
  ).length;

  const avgPercent =
    enrollments.length === 0 || totalLessons === 0
      ? 0
      : Math.round(
          enrollments.reduce((sum, e) => {
            const completed = mockProgress.filter(
              (p) =>
                p.userId === e.userId &&
                p.courseId === courseId &&
                p.completedAt,
            ).length;
            return sum + completed / totalLessons;
          }, 0) / enrollments.length,
        ) * 100;

  return { enrollmentCount: enrollments.length, avgPercent };
}

export default function InstrutorDashboardPage() {
  const courses = mockCourses.filter(
    (c) => c.instructorId === CURRENT_INSTRUCTOR_ID,
  );
  const publishedCourses = courses.filter((c) => c.isPublished);
  const draftCourses = courses.filter((c) => !c.isPublished);
  const totalEnrollments = courses.reduce(
    (sum, c) => sum + mockEnrollments.filter((e) => e.courseId === c.id).length,
    0,
  );
  const totalCertificates = courses.reduce(
    (sum, c) =>
      sum + mockCertificates.filter((cert) => cert.courseId === c.id).length,
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
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Painel do instrutor"
        description="Estatísticas e cursos sob sua responsabilidade."
        actions={
          <Button
            asChild
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            <Link href="/instrutor/curso/novo">Novo curso</Link>
          </Button>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-(--radius-md) border border-(--border) bg-(--surface) p-5"
          >
            <stat.icon className="h-4 w-4 text-(--brand)" aria-hidden="true" />
            <p className="mt-3 font-(--font-display) text-2xl font-(--font-weight-bold) text-(--fg)">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-(--fg-muted)">{stat.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-4 font-(--font-display) text-lg font-(--font-weight-semibold) text-(--fg)">
        Seus cursos
      </h2>

      {courses.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Nenhum curso ainda"
          description="Crie seu primeiro curso para começar a formar alunos."
          action={
            <Button asChild>
              <Link href="/instrutor/curso/novo">Criar curso</Link>
            </Button>
          }
          hideQuote
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {courses.map((course) => {
            const { enrollmentCount, avgPercent } = courseStats(course.id);
            return (
              <li key={course.id}>
                <Link
                  href={`/instrutor/curso/${course.id}`}
                  className="flex flex-col gap-3 rounded-(--radius-md) border border-(--border) bg-(--surface) p-5 transition-colors duration-(--transition-fast) hover:border-(--brand) sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="hb-eyebrow">{course.category}</span>
                      {!course.isPublished && (
                        <span className="rounded-(--radius-pill) bg-(--color-warning-muted) px-2 py-0.5 text-[10px] font-(--font-weight-semibold) uppercase tracking-wide text-(--hb-orange-deep)">
                          Rascunho
                        </span>
                      )}
                    </div>
                    <h3 className="mt-0.5 truncate font-(--font-display) text-base font-(--font-weight-semibold) text-(--fg)">
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
            );
          })}
        </ul>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, EmptyState, Button } from "@hebron/ui";
import { BookOpen, GraduationCap } from "lucide-react";
import { CourseSidebar } from "../../../../components/course-sidebar";
import { ProgressBar } from "../../../../components/progress-bar";
import {
  mockCourses,
  mockCourseModules,
  mockLessons,
  mockProgress,
  mockEnrollments,
  mockInstructors,
} from "../../../../lib/mock-data";

const CURRENT_USER_ID = "user-aluno-01";

export default function CursoDetalhePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const course = mockCourses.find((c) => c.slug === slug);

  const [justEnrolled, setJustEnrolled] = React.useState(false);

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          icon={GraduationCap}
          title="Curso não encontrado"
          description="O curso que você procura não existe ou foi removido."
          action={
            <Button variant="outline" onClick={() => router.push("/")}>
              Voltar ao catálogo
            </Button>
          }
          hideQuote
        />
      </div>
    );
  }

  const instructor = mockInstructors.find((i) => i.id === course.instructorId);
  const modules = mockCourseModules.filter((m) => m.courseId === course.id);
  const lessons = mockLessons.filter((l) => l.courseId === course.id);

  const alreadyEnrolled = mockEnrollments.some(
    (e) => e.userId === CURRENT_USER_ID && e.courseId === course.id,
  );
  const enrolled = alreadyEnrolled || justEnrolled;

  const progress = enrolled
    ? mockProgress.filter(
        (p) => p.userId === CURRENT_USER_ID && p.courseId === course.id,
      )
    : [];

  const completedCount = progress.filter((p) => p.completedAt).length;
  const progressPercent =
    lessons.length > 0
      ? Math.round((completedCount / lessons.length) * 100)
      : 0;

  const nextLesson =
    lessons.find(
      (l) => !progress.some((p) => p.lessonId === l.id && p.completedAt),
    ) ?? lessons[0];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <span className="hb-eyebrow">{course.category}</span>
      <PageHeader
        breadcrumb={[{ label: "Catálogo", href: "/" }, { label: course.title }]}
        title={course.title}
        description={course.description}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {enrolled ? (
            <div className="rounded-(--radius-md) border border-(--border) bg-(--surface) p-5">
              <ProgressBar
                value={progressPercent}
                label="Seu progresso neste curso"
              />
              {nextLesson && (
                <Button
                  className="mt-4"
                  onClick={() =>
                    router.push(`/curso/${course.slug}/aula/${nextLesson.id}`)
                  }
                >
                  {completedCount === 0 ? "Começar curso" : "Continuar curso"}
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-(--radius-md) border border-(--border) bg-(--surface) p-5">
              <p className="mb-4 text-sm text-(--fg-muted)">
                Matricule-se para acompanhar sua trilha, marcar aulas concluídas
                e emitir certificado ao final.
              </p>
              <Button variant="accent" onClick={() => setJustEnrolled(true)}>
                Matricular-se
              </Button>
            </div>
          )}

          {instructor && (
            <div className="rounded-(--radius-md) border border-(--border) bg-(--surface) p-5">
              <span className="hb-eyebrow">Instrutor</span>
              <h2 className="mt-1 font-(--font-display) text-base font-(--font-weight-semibold) text-(--fg)">
                {instructor.name}
              </h2>
              {instructor.bio && (
                <p className="mt-2 text-sm leading-relaxed text-(--fg-muted)">
                  {instructor.bio}
                </p>
              )}
            </div>
          )}
        </div>

        <aside className="rounded-(--radius-md) border border-(--border) bg-(--surface) p-4">
          <h2 className="mb-1 flex items-center gap-2 px-1 text-sm font-(--font-weight-semibold) text-(--fg)">
            <BookOpen className="h-4 w-4 text-(--brand)" aria-hidden="true" />
            Ementa
          </h2>
          <CourseSidebar
            modules={modules}
            lessons={lessons}
            progress={progress}
            onSelectLesson={(lesson) =>
              router.push(`/curso/${course.slug}/aula/${lesson.id}`)
            }
          />
        </aside>
      </div>
    </div>
  );
}

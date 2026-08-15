"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { PageHeader, Button } from "@hebron/ui";
import { BookOpen } from "lucide-react";
import type {
  Course,
  CourseModule,
  Enrollment,
  Lesson,
  Progress,
} from "@hebron/types/plataforma";
import { CourseSidebar } from "./course-sidebar";
import { ProgressBar } from "./progress-bar";
import { enrollInCourse } from "../actions/enrollment";

export interface CourseDetailViewProps {
  course: Course;
  instructorBio: string | null;
  modules: CourseModule[];
  lessons: Lesson[];
  enrollment: Enrollment | null;
  progress: Progress[];
}

export function CourseDetailView({
  course,
  instructorBio,
  modules,
  lessons,
  enrollment,
  progress,
}: CourseDetailViewProps) {
  const router = useRouter();

  const { execute: enroll, status } = useAction(enrollInCourse, {
    onSuccess: () => router.refresh(),
  });

  const enrolled = enrollment !== null;
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
            <div className="rounded-md border border-(--border) bg-(--surface) p-5">
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
            <div className="rounded-md border border-(--border) bg-(--surface) p-5">
              <p className="mb-4 text-sm text-(--fg-muted)">
                Matricule-se para acompanhar sua trilha, marcar aulas concluídas
                e emitir certificado ao final.
              </p>
              <Button
                variant="accent"
                onClick={() => enroll({ courseId: course.id })}
                loading={status === "executing"}
                disabled={status === "executing"}
              >
                Matricular-se
              </Button>
            </div>
          )}

          {course.instructorName && (
            <div className="rounded-md border border-(--border) bg-(--surface) p-5">
              <span className="hb-eyebrow">Instrutor</span>
              <h2 className="mt-1 font-(family-name:--font-display) text-base text-(--fg)">
                {course.instructorName}
              </h2>
              {instructorBio && (
                <p className="mt-2 text-sm leading-relaxed text-(--fg-muted)">
                  {instructorBio}
                </p>
              )}
            </div>
          )}
        </div>

        <aside className="rounded-md border border-(--border) bg-(--surface) p-4">
          <h2 className="mb-1 flex items-center gap-2 px-1 text-sm font-semibold text-(--fg)">
            <BookOpen className="h-4 w-4 text-(--brand)" aria-hidden="true" />
            Ementa
          </h2>
          <CourseSidebar
            modules={modules}
            lessons={lessons}
            progress={progress}
            // Aula "desbloqueada" na trilha só é navegável depois da
            // matrícula — o CTA de matrícula é a única porta para o
            // conteúdo (P-6.2b, item 6); antes disso a ementa é só leitura.
            onSelectLesson={
              enrolled
                ? (lesson) =>
                    router.push(`/curso/${course.slug}/aula/${lesson.id}`)
                : undefined
            }
          />
        </aside>
      </div>
    </div>
  );
}

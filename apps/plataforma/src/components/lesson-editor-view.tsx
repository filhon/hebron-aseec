"use client";

import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { PageHeader } from "@hebron/ui";
import type { Course, Lesson } from "@hebron/types/plataforma";
import { LessonForm, type LessonFormValues } from "./lesson-form";
import { updateLesson } from "../actions/courses";

export interface LessonEditorViewProps {
  course: Course;
  lesson: Lesson;
}

export function LessonEditorView({ course, lesson }: LessonEditorViewProps) {
  const router = useRouter();

  const { execute, status } = useAction(updateLesson, {
    onSuccess: () => router.refresh(),
  });

  function handleSubmit(values: LessonFormValues) {
    execute({
      lessonId: lesson.id,
      moduleId: lesson.moduleId,
      courseId: course.id,
      title: values.title,
      type: values.type,
      order: lesson.order,
      videoId: values.videoId,
      videoUrl: values.videoUrl,
      videoDurationSeconds: values.videoDurationSeconds,
      textContent: values.textContent,
      downloadUrl: values.downloadUrl,
      downloadFileName: values.downloadFileName,
      downloadFileSizeBytes: values.downloadFileSizeBytes,
      requiresCompletion: values.requiresCompletion,
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <PageHeader
        breadcrumb={[
          { label: "Painel", href: "/instrutor" },
          { label: course.title, href: `/instrutor/curso/${course.id}` },
          { label: lesson.title },
        ]}
        title="Editar aula"
      />

      <LessonForm
        moduleId={lesson.moduleId}
        courseId={course.id}
        lesson={lesson}
        onSubmit={handleSubmit}
        isLoading={status === "executing"}
      />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { PageHeader } from "@hebron/ui";
import type { Instructor, Series } from "@hebron/types/plataforma";
import { CourseForm, type CourseFormValues } from "./course-form";
import { createCourse } from "../actions/courses";

export interface NewCourseViewProps {
  instructors: Instructor[];
  series: Series[];
  categories: string[];
}

export function NewCourseView({
  instructors,
  series,
  categories,
}: NewCourseViewProps) {
  const router = useRouter();

  const { execute, status } = useAction(createCourse, {
    onSuccess: ({ data }) => {
      if (data?.course) router.push(`/instrutor/curso/${data.course.id}`);
    },
  });

  function handleSubmit(values: CourseFormValues) {
    execute({
      title: values.title,
      slug: values.slug,
      description: values.description,
      category: values.category,
      instructorId: values.instructorId,
      seriesId: values.seriesId,
      coverImageUrl: values.coverImageUrl,
      isPublished: false,
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <PageHeader
        title="Novo curso"
        description="Preencha as informações básicas. Módulos e aulas são adicionados no editor do curso."
      />

      <CourseForm
        instructors={instructors}
        series={series}
        categories={categories}
        onSubmit={handleSubmit}
        isLoading={status === "executing"}
      />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { PageHeader } from "@hebron/ui";
import type { Course, Lesson, Quiz } from "@hebron/types/plataforma";
import type { CreateQuizInput } from "@hebron/validators";
import { QuizEditor } from "./quiz-editor";
import { createQuiz, updateQuiz } from "../actions/quizzes";

export interface QuizEditorViewProps {
  course: Course;
  lesson: Lesson;
  quiz: Quiz | null;
}

export function QuizEditorView({ course, lesson, quiz }: QuizEditorViewProps) {
  const router = useRouter();

  const { execute: create, status: createStatus } = useAction(createQuiz, {
    onSuccess: ({ data }) => {
      if (data?.quiz) {
        router.push(`/instrutor/curso/${course.id}/quiz/${data.quiz.id}`);
      }
    },
  });
  const { execute: update, status: updateStatus } = useAction(updateQuiz, {
    onSuccess: () => router.refresh(),
  });

  function handleSubmit(values: CreateQuizInput) {
    if (quiz) {
      update({
        quizId: quiz.id,
        questions: values.questions,
        passingScore: values.passingScore,
      });
    } else {
      create(values);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <PageHeader
        breadcrumb={[
          { label: "Painel", href: "/instrutor" },
          { label: course.title, href: `/instrutor/curso/${course.id}` },
          { label: lesson.title },
        ]}
        title="Editar quiz"
        description={lesson.title}
      />

      <QuizEditor
        lessonId={lesson.id}
        quiz={quiz ?? undefined}
        onSubmit={handleSubmit}
        isLoading={createStatus === "executing" || updateStatus === "executing"}
      />
    </div>
  );
}

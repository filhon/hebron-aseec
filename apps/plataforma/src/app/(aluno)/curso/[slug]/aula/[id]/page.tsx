"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, EmptyState, Button } from "@hebron/ui";
import { CheckCircle2, Download, FileText, GraduationCap } from "lucide-react";
import { CourseSidebar } from "../../../../../../components/course-sidebar";
import { LessonPlayer } from "../../../../../../components/lesson-player";
import { QuizForm } from "../../../../../../components/quiz-form";
import { DiscussionThread } from "../../../../../../components/discussion-thread";
import {
  NoteWidget,
  type LessonNote,
} from "../../../../../../components/note-widget";
import {
  mockCourses,
  mockCourseModules,
  mockLessons,
  mockQuizzes,
  mockQuizAttempts,
  mockProgress,
  mockDiscussions,
  mockDiscussionPosts,
} from "../../../../../../lib/mock-data";
import type {
  DiscussionPost,
  Progress,
  QuizAnswer,
  QuizAttempt,
} from "@hebron/types/plataforma";

const CURRENT_USER_ID = "user-aluno-01";
const CURRENT_USER_NAME = "João Pedro Lima";

function formatFileSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function AulaPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();

  const course = mockCourses.find((c) => c.slug === slug);
  const lesson = course
    ? mockLessons.find((l) => l.id === id && l.courseId === course.id)
    : undefined;

  const [completedLessonIds, setCompletedLessonIds] = React.useState<
    Set<string>
  >(
    () =>
      new Set(
        mockProgress
          .filter(
            (p) =>
              p.userId === CURRENT_USER_ID &&
              p.courseId === course?.id &&
              p.completedAt,
          )
          .map((p) => p.lessonId),
      ),
  );
  const [notesByLesson, setNotesByLesson] = React.useState<
    Record<string, LessonNote[]>
  >({});
  const [currentTimeSeconds, setCurrentTimeSeconds] = React.useState(0);
  const [posts, setPosts] = React.useState<DiscussionPost[]>(() => {
    const discussion = mockDiscussions.find((d) => d.lessonId === id);
    return discussion
      ? mockDiscussionPosts.filter((p) => p.discussionId === discussion.id)
      : [];
  });
  const [attempts, setAttempts] = React.useState<QuizAttempt[]>(
    () => mockQuizAttempts,
  );

  if (!course || !lesson) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          icon={GraduationCap}
          title="Aula não encontrada"
          description="Esta aula não existe ou foi removida."
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

  const modules = mockCourseModules.filter((m) => m.courseId === course.id);
  const lessons = mockLessons.filter((l) => l.courseId === course.id);
  const quiz = lesson.quizId
    ? mockQuizzes.find((q) => q.id === lesson.quizId)
    : undefined;

  const progress: Progress[] = lessons
    .filter((l) => completedLessonIds.has(l.id))
    .map((l) => ({
      id: `local-${l.id}`,
      userId: CURRENT_USER_ID,
      lessonId: l.id,
      courseId: course.id,
      completedAt: new Date(),
      createdAt: new Date(),
    }));

  const lessonId = lesson.id;
  const nextLessonId = lesson.nextLessonId;

  const isComplete = completedLessonIds.has(lessonId);
  const lastAttempt = quiz
    ? [...attempts]
        .filter((a) => a.quizId === quiz.id && a.userId === CURRENT_USER_ID)
        .sort((a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime())[0]
    : undefined;

  function markComplete() {
    setCompletedLessonIds((prev) => new Set(prev).add(lessonId));
  }

  function goToNextLesson() {
    if (nextLessonId) {
      router.push(`/curso/${slug}/aula/${nextLessonId}`);
    }
  }

  function handleQuizSubmit(answers: QuizAnswer[]) {
    if (!quiz) return;
    const correct = answers.filter((answer) => {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      return question?.correctOptionId === answer.optionId;
    }).length;
    const score = Math.round((correct / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;

    const attempt: QuizAttempt = {
      id: `local-attempt-${Date.now()}`,
      quizId: quiz.id,
      userId: CURRENT_USER_ID,
      answers,
      score,
      passed,
      attemptedAt: new Date(),
    };
    setAttempts((prev) => [...prev, attempt]);
    if (passed) markComplete();
  }

  function handleDiscussionSubmit(
    content: string,
    parentPostId: string | null,
  ) {
    const post: DiscussionPost = {
      id: `local-post-${Date.now()}`,
      discussionId: `disc-${lessonId}`,
      authorId: CURRENT_USER_ID,
      authorName: CURRENT_USER_NAME,
      content,
      parentPostId,
      createdAt: new Date(),
      updatedAt: null,
    };
    setPosts((prev) => [...prev, post]);
  }

  const currentNotes = notesByLesson[lessonId] ?? [];

  function handleAddNote(content: string, timestampSeconds: number) {
    const note: LessonNote = {
      id: `local-note-${Date.now()}`,
      timestampSeconds,
      content,
      createdAt: new Date(),
    };
    setNotesByLesson((prev) => ({
      ...prev,
      [lessonId]: [...(prev[lessonId] ?? []), note],
    }));
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        breadcrumb={[
          { label: "Catálogo", href: "/" },
          { label: course.title, href: `/curso/${course.slug}` },
          { label: lesson.title },
        ]}
        title={lesson.title}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {lesson.type === "video" && lesson.videoUrl && (
            <>
              <LessonPlayer
                videoUrl={lesson.videoUrl}
                durationSeconds={lesson.videoDurationSeconds}
                markers={currentNotes.map((note) => ({
                  timeSeconds: note.timestampSeconds,
                  label: note.content,
                }))}
                onTimeUpdate={setCurrentTimeSeconds}
                onEnded={markComplete}
              />

              <NoteWidget
                notes={currentNotes}
                currentTimeSeconds={currentTimeSeconds}
                onAddNote={handleAddNote}
              />
            </>
          )}

          {lesson.type === "text" && lesson.textContent && (
            <div className="space-y-4 rounded-md border border-(--border) bg-(--surface) p-6">
              <div
                className="text-sm leading-relaxed text-(--fg)"
                dangerouslySetInnerHTML={{ __html: lesson.textContent }}
              />
              {!isComplete && (
                <Button
                  onClick={markComplete}
                  leftIcon={
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  }
                >
                  Marcar como concluída
                </Button>
              )}
            </div>
          )}

          {lesson.type === "download" && lesson.downloadUrl && (
            <div className="space-y-4 rounded-md border border-(--border) bg-(--surface) p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--brand-muted)">
                  <FileText
                    className="h-5 w-5 text-(--brand)"
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-(--fg)">
                    {lesson.downloadFileName}
                  </p>
                  {lesson.downloadFileSizeBytes && (
                    <p className="text-xs text-(--fg-muted)">
                      {formatFileSize(lesson.downloadFileSizeBytes)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  asChild
                  variant="outline"
                  leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
                >
                  <a href={lesson.downloadUrl} target="_blank" rel="noreferrer">
                    Baixar material
                  </a>
                </Button>
                {!isComplete && (
                  <Button onClick={markComplete}>Marcar como concluída</Button>
                )}
              </div>
            </div>
          )}

          {lesson.type === "quiz" && quiz && (
            <div className="rounded-md border border-(--border) bg-(--surface) p-6">
              <QuizForm
                quiz={quiz}
                lastAttempt={lastAttempt}
                onSubmit={handleQuizSubmit}
              />
            </div>
          )}

          {isComplete && lesson.nextLessonId && (
            <Button variant="accent" onClick={goToNextLesson}>
              Próxima aula
            </Button>
          )}

          <section className="space-y-3 border-t border-(--divider) pt-6">
            <h2 className="font-(--font-display) text-base text-(--fg)">
              Discussão desta aula
            </h2>
            <DiscussionThread posts={posts} onSubmit={handleDiscussionSubmit} />
          </section>
        </div>

        <aside className="h-fit rounded-md border border-(--border) bg-(--surface) p-4">
          <h2 className="mb-1 px-1 text-sm font-semibold text-(--fg)">
            Módulos do curso
          </h2>
          <CourseSidebar
            modules={modules}
            lessons={lessons}
            progress={progress}
            currentLessonId={lesson.id}
            onSelectLesson={(l) =>
              router.push(`/curso/${course.slug}/aula/${l.id}`)
            }
          />
        </aside>
      </div>
    </div>
  );
}

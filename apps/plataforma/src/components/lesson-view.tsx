"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { PageHeader, Button, RichText } from "@hebron/ui";
import { CheckCircle2, Download, FileText } from "lucide-react";
import type {
  Course,
  CourseModule,
  Lesson,
  Progress,
  Quiz,
  QuizAnswer,
  QuizAttempt,
} from "@hebron/types/plataforma";
import { CourseSidebar } from "./course-sidebar";
import { LessonPlayer } from "./lesson-player";
import { QuizForm } from "./quiz-form";
import { DiscussionThread } from "./discussion-thread";
import { NoteWidget, type LessonNote } from "./note-widget";
import { markLessonComplete } from "../actions/progress";
import { submitQuizAttempt } from "../actions/quizzes";
import {
  createNote,
  updateNote,
  deleteNote,
  createDiscussionPost,
  updateDiscussionPost,
  deleteDiscussionPost,
} from "../actions/discussions";
import type { LessonDiscussionPost } from "../lib/queries";

export interface LessonViewProps {
  course: Course;
  modules: CourseModule[];
  lessons: Lesson[];
  lesson: Lesson;
  progress: Progress[];
  quiz: Quiz | null;
  lastAttempt: QuizAttempt | null;
  posts: LessonDiscussionPost[];
  notes: LessonNote[];
}

function formatFileSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function LessonView({
  course,
  modules,
  lessons,
  lesson,
  progress,
  quiz,
  lastAttempt,
  posts,
  notes,
}: LessonViewProps) {
  const router = useRouter();
  const [currentTimeSeconds, setCurrentTimeSeconds] = React.useState(0);

  const { execute: complete } = useAction(markLessonComplete, {
    onSuccess: () => router.refresh(),
  });
  const { execute: submitQuiz, status: quizStatus } = useAction(
    submitQuizAttempt,
    { onSuccess: () => router.refresh() },
  );
  const { execute: addNote } = useAction(createNote, {
    onSuccess: () => router.refresh(),
  });
  const { execute: editNote, status: editNoteStatus } = useAction(updateNote, {
    onSuccess: () => router.refresh(),
  });
  const { execute: removeNote, status: removeNoteStatus } = useAction(
    deleteNote,
    { onSuccess: () => router.refresh() },
  );
  const { execute: addPost, status: postStatus } = useAction(
    createDiscussionPost,
    { onSuccess: () => router.refresh() },
  );
  const { execute: editPost, status: editPostStatus } = useAction(
    updateDiscussionPost,
    { onSuccess: () => router.refresh() },
  );
  const { execute: removePost, status: removePostStatus } = useAction(
    deleteDiscussionPost,
    { onSuccess: () => router.refresh() },
  );

  const isMutatingNote =
    editNoteStatus === "executing" || removeNoteStatus === "executing";
  const isMutatingPost =
    editPostStatus === "executing" || removePostStatus === "executing";

  const isComplete = progress.some(
    (p) => p.lessonId === lesson.id && p.completedAt,
  );

  function markComplete() {
    complete({ lessonId: lesson.id });
  }

  function goToNextLesson() {
    if (lesson.nextLessonId) {
      router.push(`/curso/${course.slug}/aula/${lesson.nextLessonId}`);
    }
  }

  function handleQuizSubmit(answers: QuizAnswer[]) {
    if (!quiz) return;
    submitQuiz({ quizId: quiz.id, answers });
  }

  function handleDiscussionSubmit(
    content: string,
    parentPostId: string | null,
  ) {
    addPost({ lessonId: lesson.id, content, parentPostId });
  }

  function handleAddNote(content: string, timestampSeconds: number) {
    addNote({ lessonId: lesson.id, timestampSeconds, content });
  }

  function handleUpdateNote(noteId: string, content: string) {
    editNote({ noteId, content });
  }

  function handleDeleteNote(noteId: string) {
    removeNote({ noteId });
  }

  function handleUpdatePost(postId: string, content: string) {
    editPost({ postId, content });
  }

  function handleDeletePost(postId: string) {
    removePost({ postId });
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
                markers={notes.map((note) => ({
                  timeSeconds: note.timestampSeconds,
                  label: note.content,
                }))}
                onTimeUpdate={setCurrentTimeSeconds}
                onEnded={markComplete}
              />

              <NoteWidget
                notes={notes}
                currentTimeSeconds={currentTimeSeconds}
                onAddNote={handleAddNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                isMutating={isMutatingNote}
              />
            </>
          )}

          {lesson.type === "text" && lesson.textContent && (
            <div className="space-y-4 rounded-md border border-(--border) bg-(--surface) p-6">
              <RichText html={lesson.textContent} />
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
                lastAttempt={lastAttempt ?? undefined}
                onSubmit={handleQuizSubmit}
                isLoading={quizStatus === "executing"}
              />
            </div>
          )}

          {isComplete && lesson.nextLessonId && (
            <Button variant="accent" onClick={goToNextLesson}>
              Próxima aula
            </Button>
          )}

          <section className="space-y-3 border-t border-(--divider) pt-6">
            <h2 className="font-(family-name:--font-display) text-base text-(--fg)">
              Discussão desta aula
            </h2>
            <DiscussionThread
              lessonId={lesson.id}
              posts={posts}
              onSubmit={handleDiscussionSubmit}
              onUpdatePost={handleUpdatePost}
              onDeletePost={handleDeletePost}
              isLoading={postStatus === "executing"}
              isMutatingPost={isMutatingPost}
            />
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

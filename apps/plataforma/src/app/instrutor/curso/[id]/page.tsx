"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, EmptyState, Button, Input } from "@hebron/ui";
import {
  BookOpen,
  Download,
  FileText,
  GripVertical,
  PlayCircle,
  Plus,
  CheckCircle2,
} from "lucide-react";
import type { CourseModule, Lesson } from "@hebron/types/plataforma";
import {
  mockCourses,
  mockCourseModules,
  mockLessons,
} from "../../../../lib/mock-data";

const TYPE_ICON = {
  video: PlayCircle,
  text: FileText,
  quiz: CheckCircle2,
  download: Download,
} as const;

export default function EditorCursoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const course = mockCourses.find((c) => c.id === id);

  const [modules, setModules] = React.useState<CourseModule[]>(() =>
    mockCourseModules
      .filter((m) => m.courseId === id)
      .sort((a, b) => a.order - b.order),
  );
  const [lessons, setLessons] = React.useState<Lesson[]>(() =>
    mockLessons.filter((l) => l.courseId === id),
  );
  const [published, setPublished] = React.useState(
    course?.isPublished ?? false,
  );
  const [newModuleTitle, setNewModuleTitle] = React.useState("");

  const draggedModuleId = React.useRef<string | null>(null);
  const draggedLesson = React.useRef<{
    lessonId: string;
    moduleId: string;
  } | null>(null);

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          icon={BookOpen}
          title="Curso não encontrado"
          description="Este curso não existe ou foi removido."
          action={
            <Button variant="outline" onClick={() => router.push("/instrutor")}>
              Voltar ao painel
            </Button>
          }
          hideQuote
        />
      </div>
    );
  }

  const courseId = course.id;

  function reorder<T>(list: T[]): T[] {
    return list.map((item, index) => ({ ...item, order: index }) as T);
  }

  function handleModuleDrop(targetModuleId: string) {
    const draggedId = draggedModuleId.current;
    draggedModuleId.current = null;
    if (!draggedId || draggedId === targetModuleId) return;

    setModules((prev) => {
      const next = [...prev];
      const fromIndex = next.findIndex((m) => m.id === draggedId);
      const toIndex = next.findIndex((m) => m.id === targetModuleId);
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      return reorder(next);
    });
  }

  function handleLessonDrop(targetModuleId: string, targetLessonId: string) {
    const dragged = draggedLesson.current;
    draggedLesson.current = null;
    if (!dragged || dragged.lessonId === targetLessonId) return;
    if (dragged.moduleId !== targetModuleId) return; // reordena só dentro do módulo

    setLessons((prev) => {
      const moduleLessons = prev
        .filter((l) => l.moduleId === targetModuleId)
        .sort((a, b) => a.order - b.order);
      const otherLessons = prev.filter((l) => l.moduleId !== targetModuleId);

      const fromIndex = moduleLessons.findIndex(
        (l) => l.id === dragged.lessonId,
      );
      const toIndex = moduleLessons.findIndex((l) => l.id === targetLessonId);
      const [moved] = moduleLessons.splice(fromIndex, 1);
      if (!moved) return prev;
      moduleLessons.splice(toIndex, 0, moved);

      return [...otherLessons, ...reorder(moduleLessons)];
    });
  }

  function handleAddModule(e: React.FormEvent) {
    e.preventDefault();
    const title = newModuleTitle.trim();
    if (!title) return;
    const newModule: CourseModule = {
      id: `local-mod-${Date.now()}`,
      courseId,
      title,
      description: null,
      order: modules.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setModules((prev) => [...prev, newModule]);
    setNewModuleTitle("");
  }

  const sortedModules = [...modules].sort((a, b) => a.order - b.order);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <PageHeader
        breadcrumb={[
          { label: "Painel", href: "/instrutor" },
          { label: course.title },
        ]}
        title={course.title}
        description="Arraste módulos e aulas para reordenar a trilha do curso."
        actions={
          <Button
            variant={published ? "outline" : "accent"}
            onClick={() => setPublished((p) => !p)}
          >
            {published ? "Despublicar" : "Publicar curso"}
          </Button>
        }
      />

      <div className="space-y-4">
        {sortedModules.map((courseModule) => {
          const moduleLessons = lessons
            .filter((l) => l.moduleId === courseModule.id)
            .sort((a, b) => a.order - b.order);

          return (
            <div
              key={courseModule.id}
              draggable
              onDragStart={() => {
                draggedModuleId.current = courseModule.id;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleModuleDrop(courseModule.id)}
              className="rounded-(--radius-md) border border-(--border) bg-(--surface)"
            >
              <div className="flex items-center gap-2.5 border-b border-(--divider) px-4 py-3">
                <GripVertical
                  className="h-4 w-4 shrink-0 cursor-grab text-(--fg-subtle)"
                  aria-hidden="true"
                />
                <h3 className="min-w-0 flex-1 truncate font-(--font-display) text-sm font-(--font-weight-semibold) text-(--fg)">
                  {courseModule.title}
                </h3>
                <span className="shrink-0 text-xs text-(--fg-muted)">
                  {moduleLessons.length} aula
                  {moduleLessons.length === 1 ? "" : "s"}
                </span>
              </div>

              <ul className="flex flex-col">
                {moduleLessons.map((lesson) => {
                  const TypeIcon = TYPE_ICON[lesson.type];
                  const editHref =
                    lesson.type === "quiz" && lesson.quizId
                      ? `/instrutor/curso/${course.id}/quiz/${lesson.quizId}`
                      : `/instrutor/curso/${course.id}/aula/${lesson.id}`;

                  return (
                    <li
                      key={lesson.id}
                      draggable
                      onDragStart={() => {
                        draggedLesson.current = {
                          lessonId: lesson.id,
                          moduleId: courseModule.id,
                        };
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() =>
                        handleLessonDrop(courseModule.id, lesson.id)
                      }
                      className="flex items-center gap-2.5 border-b border-(--divider) px-4 py-2.5 last:border-b-0 hover:bg-(--surface-alt)"
                    >
                      <GripVertical
                        className="h-3.5 w-3.5 shrink-0 cursor-grab text-(--fg-subtle)"
                        aria-hidden="true"
                      />
                      <TypeIcon
                        className="h-3.5 w-3.5 shrink-0 text-(--fg-muted)"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-(--fg)">
                        {lesson.title}
                      </span>
                      <Link
                        href={editHref}
                        className="shrink-0 text-xs font-(--font-weight-medium) text-(--brand) hover:underline"
                      >
                        Editar
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        <form
          onSubmit={handleAddModule}
          className="flex items-center gap-2 rounded-(--radius-md) border border-dashed border-(--border) p-3"
        >
          <Input
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            placeholder="Título do novo módulo"
            className="flex-1"
            aria-label="Título do novo módulo"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Adicionar módulo
          </Button>
        </form>
      </div>
    </div>
  );
}

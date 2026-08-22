"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import {
  PageHeader,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  LoadingState,
} from "@hebron/ui";
import {
  Archive,
  Download,
  FileText,
  GripVertical,
  Pencil,
  PlayCircle,
  Plus,
  CheckCircle2,
} from "lucide-react";
import type {
  Course,
  CourseModule,
  Instructor,
  Lesson,
  Series,
} from "@hebron/types/plataforma";
import {
  CourseForm,
  CourseModuleForm,
  type CourseFormValues,
  type CourseModuleFormValues,
} from "./course-form";
import { LessonForm, type LessonFormValues } from "./lesson-form";
import {
  updateCourse,
  createCourseModule,
  updateCourseModule,
  reorderCourseModules,
  createLesson,
  reorderLessons,
  deleteCourse,
  deleteCourseModule,
  deleteLesson,
  getCourseEditOptions,
} from "../actions/courses";

const TYPE_ICON = {
  video: PlayCircle,
  text: FileText,
  quiz: CheckCircle2,
  download: Download,
} as const;

export interface CourseEditorViewProps {
  course: Course;
  modules: CourseModule[];
  lessons: Lesson[];
}

export function CourseEditorView({
  course,
  modules: initialModules,
  lessons: initialLessons,
}: CourseEditorViewProps) {
  const router = useRouter();

  const [modules, setModules] = React.useState<CourseModule[]>(initialModules);
  const [lessons, setLessons] = React.useState<Lesson[]>(initialLessons);
  const [addingModule, setAddingModule] = React.useState(false);
  const [addingLessonToModuleId, setAddingLessonToModuleId] = React.useState<
    string | null
  >(null);
  const [editingModuleId, setEditingModuleId] = React.useState<string | null>(
    null,
  );
  const [editingCourse, setEditingCourse] = React.useState(false);
  const [editOptions, setEditOptions] = React.useState<{
    instructors: Instructor[];
    series: Series[];
    categories: string[];
  } | null>(null);
  const [archiving, setArchiving] = React.useState<{
    kind: "course" | "module" | "lesson";
    id: string;
    label: string;
  } | null>(null);
  const [archiveError, setArchiveError] = React.useState<string | null>(null);

  React.useEffect(() => setModules(initialModules), [initialModules]);
  React.useEffect(() => setLessons(initialLessons), [initialLessons]);

  const draggedModuleId = React.useRef<string | null>(null);
  const draggedLesson = React.useRef<{
    lessonId: string;
    moduleId: string;
  } | null>(null);

  const { execute: togglePublish, status: publishStatus } = useAction(
    updateCourse,
    { onSuccess: () => router.refresh() },
  );
  const { execute: addModule, status: addModuleStatus } = useAction(
    createCourseModule,
    {
      onSuccess: () => {
        setAddingModule(false);
        router.refresh();
      },
    },
  );
  const { execute: doReorderModules } = useAction(reorderCourseModules);
  const { execute: doReorderLessons } = useAction(reorderLessons);
  const { execute: addLesson, status: addLessonStatus } = useAction(
    createLesson,
    {
      onSuccess: () => {
        setAddingLessonToModuleId(null);
        router.refresh();
      },
    },
  );
  const { execute: loadEditOptions, status: loadEditOptionsStatus } = useAction(
    getCourseEditOptions,
    {
      onSuccess: ({ data }) => {
        if (data) setEditOptions(data);
      },
    },
  );
  const { execute: editCourse, status: editCourseStatus } = useAction(
    updateCourse,
    {
      onSuccess: () => {
        setEditingCourse(false);
        router.refresh();
      },
    },
  );
  const { execute: editModule, status: editModuleStatus } = useAction(
    updateCourseModule,
    {
      onSuccess: () => {
        setEditingModuleId(null);
        router.refresh();
      },
    },
  );
  const { execute: archiveCourse, status: archiveCourseStatus } = useAction(
    deleteCourse,
    {
      onSuccess: () => router.push("/instrutor"),
      onError: ({ error }) =>
        setArchiveError(error.serverError ?? "Erro ao arquivar curso"),
    },
  );
  const { execute: archiveModule, status: archiveModuleStatus } = useAction(
    deleteCourseModule,
    {
      onSuccess: () => {
        setArchiving(null);
        setArchiveError(null);
        router.refresh();
      },
      onError: ({ error }) =>
        setArchiveError(error.serverError ?? "Erro ao arquivar módulo"),
    },
  );
  const { execute: archiveLesson, status: archiveLessonStatus } = useAction(
    deleteLesson,
    {
      onSuccess: () => {
        setArchiving(null);
        setArchiveError(null);
        router.refresh();
      },
      onError: ({ error }) =>
        setArchiveError(error.serverError ?? "Erro ao arquivar aula"),
    },
  );

  const isArchiving =
    archiveCourseStatus === "executing" ||
    archiveModuleStatus === "executing" ||
    archiveLessonStatus === "executing";

  function reorder<T extends { order: number }>(list: T[]): T[] {
    return list.map((item, index) => ({ ...item, order: index }));
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
      const reordered = reorder(next);
      doReorderModules({
        courseId: course.id,
        orderedModuleIds: reordered.map((m) => m.id),
      });
      return reordered;
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
      const reordered = reorder(moduleLessons);

      doReorderLessons({
        moduleId: targetModuleId,
        orderedLessonIds: reordered.map((l) => l.id),
      });

      return [...otherLessons, ...reordered];
    });
  }

  function handleTogglePublish() {
    togglePublish({
      courseId: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      category: course.category,
      instructorId: course.instructorId,
      seriesId: course.seriesId,
      coverImageUrl: course.coverImageUrl,
      isPublished: !course.isPublished,
    });
  }

  function handleAddModule(values: CourseModuleFormValues) {
    addModule({
      courseId: course.id,
      title: values.title,
      description: values.description,
      order: values.order,
    });
  }

  function handleEditModule(moduleId: string, values: CourseModuleFormValues) {
    editModule({
      moduleId,
      courseId: course.id,
      title: values.title,
      description: values.description,
      order: values.order,
    });
  }

  function openEditCourse() {
    setEditingCourse(true);
    if (!editOptions) loadEditOptions({});
  }

  function handleEditCourse(values: CourseFormValues) {
    editCourse({
      courseId: course.id,
      title: values.title,
      slug: values.slug,
      description: values.description,
      category: values.category,
      instructorId: values.instructorId,
      seriesId: values.seriesId,
      coverImageUrl: values.coverImageUrl,
      isPublished: course.isPublished,
    });
  }

  function openArchive(
    kind: "course" | "module" | "lesson",
    id: string,
    label: string,
  ) {
    setArchiveError(null);
    setArchiving({ kind, id, label });
  }

  function confirmArchive() {
    if (!archiving) return;
    setArchiveError(null);
    if (archiving.kind === "course") archiveCourse({ courseId: archiving.id });
    else if (archiving.kind === "module")
      archiveModule({ moduleId: archiving.id });
    else archiveLesson({ lessonId: archiving.id });
  }

  const ARCHIVE_COPY = {
    course: {
      title: "Arquivar curso",
      detail:
        "O curso sai do catálogo e do painel. Matrículas, progresso e certificados já emitidos continuam existindo e verificáveis.",
    },
    module: {
      title: "Arquivar módulo",
      detail:
        "O módulo e suas aulas saem da ementa do curso. Progresso de quem já cursou é preservado.",
    },
    lesson: {
      title: "Arquivar aula",
      detail:
        "A aula sai da ementa do curso. Progresso de quem já a concluiu é preservado.",
    },
  } as const;

  function handleAddLesson(moduleId: string, values: LessonFormValues) {
    const moduleLessonsCount = lessons.filter(
      (l) => l.moduleId === moduleId,
    ).length;
    addLesson({
      moduleId,
      courseId: course.id,
      title: values.title,
      type: values.type,
      order: moduleLessonsCount,
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={openEditCourse}
            >
              Editar curso
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Archive className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => openArchive("course", course.id, course.title)}
            >
              Arquivar curso
            </Button>
            <Button
              variant={course.isPublished ? "outline" : "accent"}
              onClick={handleTogglePublish}
              loading={publishStatus === "executing"}
              disabled={publishStatus === "executing"}
            >
              {course.isPublished ? "Despublicar" : "Publicar curso"}
            </Button>
          </div>
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
              className="rounded-md border border-(--border) bg-(--surface)"
            >
              <div className="flex items-center gap-2.5 border-b border-(--divider) px-4 py-3">
                <GripVertical
                  className="h-4 w-4 shrink-0 cursor-grab text-(--fg-subtle)"
                  aria-hidden="true"
                />
                {editingModuleId === courseModule.id ? (
                  <div className="min-w-0 flex-1">
                    <CourseModuleForm
                      courseId={course.id}
                      courseModule={courseModule}
                      onSubmit={(values) =>
                        handleEditModule(courseModule.id, values)
                      }
                      isLoading={editModuleStatus === "executing"}
                    />
                    <button
                      type="button"
                      onClick={() => setEditingModuleId(null)}
                      className="mt-2 text-xs text-(--fg-muted) hover:text-(--brand)"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="min-w-0 flex-1 truncate font-(family-name:--font-display) text-sm text-(--fg)">
                      {courseModule.title}
                    </h3>
                    <span className="shrink-0 text-xs text-(--fg-muted)">
                      {moduleLessons.length} aula
                      {moduleLessons.length === 1 ? "" : "s"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      aria-label={`Editar módulo ${courseModule.title}`}
                      onClick={() => setEditingModuleId(courseModule.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      aria-label={`Arquivar módulo ${courseModule.title}`}
                      onClick={() =>
                        openArchive(
                          "module",
                          courseModule.id,
                          courseModule.title,
                        )
                      }
                    >
                      <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </>
                )}
              </div>

              <ul className="flex flex-col">
                {moduleLessons.map((lesson) => {
                  const TypeIcon = TYPE_ICON[lesson.type];
                  const editHref =
                    lesson.type === "quiz"
                      ? lesson.quizId
                        ? `/instrutor/curso/${course.id}/quiz/${lesson.quizId}`
                        : `/instrutor/curso/${course.id}/quiz/novo?lessonId=${lesson.id}`
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
                        className="shrink-0 text-xs font-medium text-(--brand) hover:underline"
                      >
                        {lesson.type === "quiz" && !lesson.quizId
                          ? "Criar quiz"
                          : "Editar"}
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0"
                        aria-label={`Arquivar aula ${lesson.title}`}
                        onClick={() =>
                          openArchive("lesson", lesson.id, lesson.title)
                        }
                      >
                        <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-(--divider) p-3">
                {addingLessonToModuleId === courseModule.id ? (
                  <LessonForm
                    moduleId={courseModule.id}
                    courseId={course.id}
                    onSubmit={(values) =>
                      handleAddLesson(courseModule.id, values)
                    }
                    isLoading={addLessonStatus === "executing"}
                  />
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    }
                    onClick={() => setAddingLessonToModuleId(courseModule.id)}
                  >
                    Nova aula
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        <div className="rounded-md border border-dashed border-(--border) p-4">
          {addingModule ? (
            <CourseModuleForm
              courseId={course.id}
              nextOrder={modules.length}
              onSubmit={handleAddModule}
              isLoading={addModuleStatus === "executing"}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => setAddingModule(true)}
            >
              Adicionar módulo
            </Button>
          )}
        </div>
      </div>

      <Dialog open={editingCourse} onOpenChange={setEditingCourse}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar curso</DialogTitle>
            <DialogDescription>
              As alterações aparecem no catálogo assim que salvas.
            </DialogDescription>
          </DialogHeader>
          {editOptions ? (
            <CourseForm
              mode="edit"
              course={course}
              instructors={editOptions.instructors}
              series={editOptions.series}
              categories={editOptions.categories}
              onSubmit={handleEditCourse}
              isLoading={editCourseStatus === "executing"}
            />
          ) : (
            <LoadingState
              message={
                loadEditOptionsStatus === "hasErrored"
                  ? "Não foi possível carregar o formulário."
                  : "Carregando formulário…"
              }
              size="sm"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {archiving && ARCHIVE_COPY[archiving.kind].title}
            </DialogTitle>
            <DialogDescription>
              {archiving &&
                `Tem certeza que deseja arquivar "${archiving.label}"? ${ARCHIVE_COPY[archiving.kind].detail}`}
            </DialogDescription>
          </DialogHeader>
          {archiveError && (
            <p className="text-sm text-(--color-destructive)">{archiveError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiving(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isArchiving}
              loading={isArchiving}
              onClick={confirmArchive}
            >
              Arquivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

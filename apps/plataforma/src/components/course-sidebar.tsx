"use client";

import type { CourseModule, Lesson, Progress } from "@hebron/types/plataforma";
import {
  CheckCircle2,
  Circle,
  Download,
  FileText,
  Lock,
  PlayCircle,
} from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

type LessonStatus = "completo" | "em-andamento" | "disponivel" | "bloqueado";

const TYPE_ICON = {
  video: PlayCircle,
  text: FileText,
  quiz: CheckCircle2,
  download: Download,
} as const;

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

function computeStatus(
  lesson: Lesson,
  completedLessonIds: Set<string>,
  previousLessonId: string | undefined,
  currentLessonId: string | undefined,
): LessonStatus {
  if (completedLessonIds.has(lesson.id)) return "completo";
  if (lesson.id === currentLessonId) return "em-andamento";
  if (!lesson.requiresCompletion) return "disponivel";
  if (!previousLessonId || completedLessonIds.has(previousLessonId)) {
    return "disponivel";
  }
  return "bloqueado";
}

const STATUS_ICON: Record<
  LessonStatus,
  { icon: typeof CheckCircle2; className: string }
> = {
  completo: { icon: CheckCircle2, className: "text-(--hb-green-deep)" },
  "em-andamento": { icon: PlayCircle, className: "text-(--brand)" },
  disponivel: { icon: Circle, className: "text-(--fg-subtle)" },
  bloqueado: { icon: Lock, className: "text-(--fg-subtle)" },
};

export interface CourseSidebarProps {
  modules: CourseModule[];
  lessons: Lesson[];
  /** Progresso do usuário atual — usado para determinar aulas concluídas. */
  progress: Progress[];
  currentLessonId?: string;
  onSelectLesson?: (lesson: Lesson) => void;
  className?: string;
}

/** Navegação lateral de um curso: módulos e aulas com status de progresso
 * (completo / em andamento / disponível / bloqueado). Uma aula com
 * `requiresCompletion` só desbloqueia depois que a aula anterior da trilha
 * (via `nextLessonId`) é concluída (BRAIN §6.3). */
export function CourseSidebar({
  modules,
  lessons,
  progress,
  currentLessonId,
  onSelectLesson,
  className,
}: CourseSidebarProps) {
  const completedLessonIds = new Set(
    progress.filter((p) => p.completedAt).map((p) => p.lessonId),
  );

  const previousLessonIdByLessonId = new Map<string, string>();
  for (const lesson of lessons) {
    if (lesson.nextLessonId) {
      previousLessonIdByLessonId.set(lesson.nextLessonId, lesson.id);
    }
  }

  const sortedModules = [...modules].sort((a, b) => a.order - b.order);

  return (
    <nav
      aria-label="Módulos do curso"
      className={cn("flex flex-col", className)}
    >
      {sortedModules.map((courseModule) => {
        const moduleLessons = lessons
          .filter((lesson) => lesson.moduleId === courseModule.id)
          .sort((a, b) => a.order - b.order);

        return (
          <div
            key={courseModule.id}
            className="border-b border-(--divider) py-3 last:border-b-0"
          >
            <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-(--fg-muted)">
              {courseModule.title}
            </h3>

            <ul className="flex flex-col gap-0.5">
              {moduleLessons.map((lesson) => {
                const status = computeStatus(
                  lesson,
                  completedLessonIds,
                  previousLessonIdByLessonId.get(lesson.id),
                  currentLessonId,
                );
                const locked = status === "bloqueado";
                const TypeIcon = TYPE_ICON[lesson.type];
                const statusCfg = STATUS_ICON[status];
                const StatusIcon = statusCfg.icon;
                const duration = formatDuration(lesson.videoDurationSeconds);

                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      disabled={locked}
                      aria-current={
                        lesson.id === currentLessonId ? "true" : undefined
                      }
                      onClick={() => !locked && onSelectLesson?.(lesson)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm",
                        "transition-colors duration-(--transition-fast)",
                        locked
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer hover:bg-(--surface-alt)",
                        lesson.id === currentLessonId &&
                          "bg-(--brand-muted) font-medium",
                      )}
                    >
                      <StatusIcon
                        className={cn("h-4 w-4 shrink-0", statusCfg.className)}
                        aria-hidden="true"
                      />
                      <TypeIcon
                        className="h-3.5 w-3.5 shrink-0 text-(--fg-muted)"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-(--fg)">
                        {lesson.title}
                      </span>
                      {duration && (
                        <span className="shrink-0 text-xs text-(--fg-muted)">
                          {duration}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

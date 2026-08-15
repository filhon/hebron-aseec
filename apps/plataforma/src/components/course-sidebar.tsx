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
  currentLessonId: string | undefined,
): LessonStatus {
  if (completedLessonIds.has(lesson.id)) return "completo";
  if (lesson.id === currentLessonId) return "em-andamento";
  if (!lesson.unlocked) return "bloqueado";
  return "disponivel";
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
 * (completo / em andamento / disponível / bloqueado). `lesson.unlocked` já
 * vem calculado pela trilha sequencial no banco (plataforma.can_access_lesson
 * via course_outline, P-6.2b) — o componente não reconstrói a regra. */
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
                  currentLessonId,
                );
                const locked = status === "bloqueado";
                const TypeIcon = TYPE_ICON[lesson.type];
                const statusCfg = STATUS_ICON[status];
                const StatusIcon = statusCfg.icon;
                const duration = formatDuration(lesson.videoDurationSeconds);
                const lockReason = "Conclua a aula anterior para desbloquear";
                // Sem onSelectLesson (ementa antes da matrícula, P-6.2b item
                // 6), a aula "desbloqueada" da trilha continua só leitura —
                // sem afordance de clique, mas sem cadeado (esse é reservado
                // para o bloqueio de trilha de verdade).
                const interactive = !locked && !!onSelectLesson;

                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      disabled={locked}
                      aria-current={
                        lesson.id === currentLessonId ? "true" : undefined
                      }
                      aria-label={
                        locked ? `${lesson.title} — ${lockReason}` : undefined
                      }
                      title={locked ? lockReason : undefined}
                      onClick={() => interactive && onSelectLesson?.(lesson)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm",
                        "transition-colors duration-(--transition-fast)",
                        locked && "cursor-not-allowed opacity-60",
                        interactive &&
                          "cursor-pointer hover:bg-(--surface-alt)",
                        !locked && !interactive && "cursor-default",
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
                      {locked ? (
                        <span className="shrink-0 text-xs font-medium text-(--fg-subtle)">
                          Bloqueada
                        </span>
                      ) : (
                        duration && (
                          <span className="shrink-0 text-xs text-(--fg-muted)">
                            {duration}
                          </span>
                        )
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

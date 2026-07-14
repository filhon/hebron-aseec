import type { Course } from "@hebron/types/plataforma";
import { GraduationCap } from "lucide-react";
import { ProgressBar } from "./progress-bar";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

export interface CourseCardProps {
  course: Course;
  /** 0-100. Omitido quando o usuário ainda não está matriculado. */
  progressPercent?: number;
  href?: string;
  onClick?: () => void;
  className?: string;
}

/** Cartão de curso — capa, título, instrutor e progresso (quando matriculado).
 * Usado tanto no catálogo (sem progresso) quanto em "Meus cursos". */
export function CourseCard({
  course,
  progressPercent,
  href,
  onClick,
  className,
}: CourseCardProps) {
  const enrolled = progressPercent !== undefined;
  const interactive = Boolean(href || onClick);

  const wrapperClassName = cn(
    "group flex flex-col overflow-hidden rounded-(--radius-md) border border-(--border) bg-(--surface)",
    "transition-colors duration-(--transition-fast)",
    interactive &&
      "cursor-pointer hover:border-(--brand) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) focus-visible:ring-offset-2",
    className,
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  }

  const content = (
    <>
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-(--surface-alt)">
        {course.coverImageUrl ? (
          <img
            src={course.coverImageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-(--transition-medium) group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <GraduationCap
              className="h-9 w-9 text-(--fg-subtle)"
              aria-hidden="true"
            />
          </div>
        )}
        {!course.isPublished && (
          <span className="absolute left-2.5 top-2.5 rounded-(--radius-pill) bg-(--color-warning-muted) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--hb-orange-deep)">
            Em preparação
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="space-y-1">
          <span className="hb-eyebrow">{course.category}</span>
          <h3 className="line-clamp-2 font-(--font-display) text-base leading-snug text-(--fg)">
            {course.title}
          </h3>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-(--fg-muted)">
          {course.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-(--fg-muted)">
          <span className="truncate">{course.instructorName}</span>
        </div>

        {enrolled && (
          <ProgressBar value={progressPercent} showValue size="sm" />
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} className={wrapperClassName}>
        {content}
      </a>
    );
  }

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={wrapperClassName}
    >
      {content}
    </div>
  );
}

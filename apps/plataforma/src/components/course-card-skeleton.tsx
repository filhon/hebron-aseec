function Bone({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded bg-(--surface-alt) ${className}`} />
  );
}

/** Placeholder de carregamento com a mesma estrutura de `CourseCard` —
 * capa, categoria, título, descrição, instrutor e progresso. */
export function CourseCardSkeleton() {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className="flex flex-col overflow-hidden rounded-md border border-(--border) bg-(--surface)"
    >
      <Bone className="aspect-video w-full shrink-0 rounded-none" />

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="space-y-2">
          <Bone className="h-2.5 w-16" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-3/5" />
        </div>

        <div className="space-y-1.5">
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-4/5" />
        </div>

        <Bone className="mt-auto h-3 w-1/3" />

        <div className="space-y-1.5 pt-1">
          <div className="flex items-baseline justify-between gap-2">
            <Bone className="h-2.5 w-20" />
            <Bone className="h-2.5 w-8" />
          </div>
          <Bone className="h-1.5 w-full rounded-(--radius-pill)" />
        </div>
      </div>
    </div>
  );
}

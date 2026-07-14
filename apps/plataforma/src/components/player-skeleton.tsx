function Bone({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded bg-(--surface-alt) ${className}`} />
  );
}

/** Placeholder de carregamento do player de vídeo — mesma moldura escura de
 * `LessonPlayer`, com barra de progresso e controles simulados. */
export function PlayerSkeleton() {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className="relative aspect-video w-full overflow-hidden rounded-(--radius-md) bg-(--hb-ink)"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-14 w-14 animate-pulse rounded-full bg-white/10" />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-3 pb-2.5 pt-8">
        <div className="h-1.5 w-full rounded-(--radius-pill) bg-white/15" />
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
          <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
          <div className="ml-auto h-8 w-14 animate-pulse rounded-(--radius-sm) bg-white/10" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

/** Placeholder de carregamento da navegação lateral de módulos/aulas
 * (`CourseSidebar`) — usado junto com `PlayerSkeleton` enquanto a tela de
 * aula carrega. */
export function CourseSidebarSkeleton() {
  const groups = [3, 2, 4];
  return (
    <div role="presentation" aria-hidden="true" className="flex flex-col">
      {groups.map((rows, i) => (
        <div
          key={i}
          className="border-b border-(--divider) py-3 last:border-b-0"
        >
          <Bone className="mb-2 ml-1 h-2.5 w-24" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: rows }).map((_, j) => (
              <div key={j} className="flex items-center gap-2.5 px-2.5 py-2">
                <Bone className="h-4 w-4 shrink-0 rounded-full" />
                <Bone className="h-3.5 w-3.5 shrink-0" />
                <Bone className="h-3 flex-1" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

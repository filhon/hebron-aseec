function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

export function TaskListSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-(--radius) border border-(--border) bg-(--surface)"
      role="presentation"
      aria-hidden="true"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-(--border) px-4 py-3">
        <Bone className="h-7 w-56 rounded-full" />
        <Bone className="h-7 w-32 rounded-lg" />
        <Bone className="h-7 w-28 rounded-lg" />
        <Bone className="h-7 w-24 rounded-lg" />
        <Bone className="ml-auto h-3 w-16" />
      </div>

      {/* Rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-(--divider) px-3 py-3 last:border-b-0"
        >
          <Bone className="h-3 flex-1" />
          <Bone className="h-3 w-24 shrink-0" />
          <Bone className="h-6 w-16 shrink-0 rounded-full" />
          <Bone className="h-5 w-14 shrink-0 rounded-full" />
          <Bone className="h-3 w-12 shrink-0" />
          <Bone className="h-6 w-24 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function TreeViewSkeleton() {
  return (
    <div
      className="overflow-x-auto rounded-(--radius) border border-(--border) bg-(--surface) p-5"
      role="presentation"
      aria-hidden="true"
    >
      <div className="flex min-w-max items-start gap-6">
        <Bone className="h-9 w-24 shrink-0 self-start rounded-full" />

        <div className="flex flex-col gap-4 pt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="relative pl-6">
              <span
                className="absolute left-0 top-5 h-px w-6 bg-(--border)"
                aria-hidden="true"
              />
              <Bone className="h-9 w-40 rounded-full" />
              <div className="relative ml-3 mt-2 flex flex-col gap-1.5 border-l-2 border-(--border) py-1 pl-6">
                {Array.from({ length: 2 }).map((__, j) => (
                  <Bone key={j} className="h-8 w-52 rounded-sm" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

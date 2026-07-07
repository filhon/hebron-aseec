function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

export function CalendarSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-(--radius-md) border border-(--border) bg-(--surface)"
      role="presentation"
      aria-hidden="true"
    >
      <div className="grid grid-cols-7 border-b border-(--border) bg-(--surface-alt) p-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex justify-center px-2 py-1">
            <Bone className="h-2.5 w-8" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 42 }).map((_, i) => (
          <div
            key={i}
            className="flex min-h-24 flex-col gap-1.5 border-b border-r border-(--divider) p-1.5 last:border-r-0"
          >
            <Bone className="h-5 w-5 rounded-full" />
            {(i % 5 === 0 || i % 7 === 3) && (
              <Bone className="h-3 w-full rounded-(--radius-sm)" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocumentCardSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`hb-card hb-card-overflow flex flex-col ${className}`}>
      <div className="h-0.75 bg-(--border)" />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-20 rounded-full animate-pulse bg-(--bg-alt)" />
          <div className="h-5 w-14 rounded-full animate-pulse bg-(--bg-alt)" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-3.75 w-full rounded animate-pulse bg-(--bg-alt)" />
          <div className="h-3.75 w-4/5 rounded animate-pulse bg-(--bg-alt)" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-full rounded animate-pulse bg-(--bg-alt)" />
          <div className="h-3 w-5/6 rounded animate-pulse bg-(--bg-alt)" />
        </div>
        <div className="flex gap-1">
          <div className="h-5 w-12 rounded-full animate-pulse bg-(--bg-alt)" />
          <div className="h-5 w-16 rounded-full animate-pulse bg-(--bg-alt)" />
          <div className="h-5 w-10 rounded-full animate-pulse bg-(--bg-alt)" />
        </div>
        <div className="flex items-center justify-between pt-3 mt-auto border-t border-(--divider)">
          <div className="h-3 w-24 rounded animate-pulse bg-(--bg-alt)" />
          <div className="h-3 w-14 rounded animate-pulse bg-(--bg-alt)" />
        </div>
      </div>
    </div>
  );
}

export function EditalCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <article className={`hb-card hb-card-overflow flex flex-col ${className}`}>
      <div className="h-0.75 bg-(--border)" />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-28 rounded-full animate-pulse bg-(--bg-alt)" />
          <div className="h-5 w-16 rounded-full animate-pulse bg-(--bg-alt)" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-3.75 w-full rounded animate-pulse bg-(--bg-alt)" />
          <div className="h-3.75 w-3/4 rounded animate-pulse bg-(--bg-alt)" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-full rounded animate-pulse bg-(--bg-alt)" />
          <div className="h-3 w-2/3 rounded animate-pulse bg-(--bg-alt)" />
        </div>
        <div className="flex gap-1">
          <div className="h-5 w-16 rounded-full animate-pulse bg-(--bg-alt)" />
          <div className="h-5 w-12 rounded-full animate-pulse bg-(--bg-alt)" />
        </div>
        <div className="p-3 rounded-sm border border-(--divider)">
          <div className="h-3 w-16 rounded animate-pulse bg-(--bg-alt) mb-2" />
          <div className="h-3 w-36 rounded animate-pulse bg-(--bg-alt)" />
        </div>
        <div className="pt-3 mt-auto border-t border-(--divider)">
          <div className="h-8 w-full rounded-full animate-pulse bg-(--bg-alt)" />
        </div>
      </div>
    </article>
  );
}

const LIST_WIDTHS = [72, 85, 64, 78, 91, 68] as const;

export function DocumentListSkeleton({ rows = 6 }: { rows?: number }) {
  const count = Math.min(rows, LIST_WIDTHS.length);
  return (
    <div
      className="hb-card hb-card-padded hb-card-overflow"
      style={{ padding: "4px 0" }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="docs-row"
          style={{ padding: "14px 24px", pointerEvents: "none" }}
        >
          <div
            className="docs-row-icon animate-pulse bg-(--bg-alt)"
            style={{ border: "none" }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              className="h-[14.5px] rounded animate-pulse bg-(--bg-alt) mb-1.5"
              style={{ width: `${LIST_WIDTHS[i % LIST_WIDTHS.length]}%` }}
            />
            <div className="flex items-center gap-3">
              <div className="h-3 w-16 rounded animate-pulse bg-(--bg-alt)" />
              <div className="h-3 w-1 rounded animate-pulse bg-(--bg-alt)" />
              <div className="h-3 w-20 rounded animate-pulse bg-(--bg-alt)" />
            </div>
          </div>
          {i % 3 === 0 && (
            <div className="h-5 w-12 rounded-full animate-pulse bg-(--bg-alt)" />
          )}
        </div>
      ))}
    </div>
  );
}

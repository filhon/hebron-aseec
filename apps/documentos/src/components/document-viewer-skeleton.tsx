const LINE_WIDTHS = [
  100, 95, 88, 72, 100, 85, 91, 62, 97, 78, 83, 90, 55, 100, 76,
] as const;

export function DocumentViewerSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`hb-card hb-card-overflow flex flex-col ${className}`}
      style={{ minHeight: "480px" }}
    >
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-(--border) bg-(--bg-alt)">
        <div className="flex border border-(--border) rounded-sm overflow-hidden">
          <div
            className="animate-pulse bg-(--border)"
            style={{ width: 90, height: 29 }}
          />
          <div
            className="animate-pulse bg-(--bg-alt) border-l border-(--border)"
            style={{ width: 100, height: 29 }}
          />
        </div>
        <div className="flex-1" />
        <div className="h-6 w-19 rounded-full animate-pulse bg-(--bg-alt)" />
        <div className="h-6 w-14 rounded-full animate-pulse bg-(--bg-alt)" />
      </div>

      {/* Content skeleton — mimics a text document being loaded */}
      <div className="flex-1 p-6" style={{ minHeight: "420px" }}>
        <div className="h-7 w-2/3 rounded animate-pulse bg-(--bg-alt) mb-3" />
        <div className="h-4 w-1/4 rounded animate-pulse bg-(--bg-alt) mb-1" />

        <div
          className="border-t border-(--divider) mt-4 pt-4"
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          {LINE_WIDTHS.map((w, i) => (
            <div
              key={i}
              className="h-3.5 rounded animate-pulse bg-(--bg-alt)"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

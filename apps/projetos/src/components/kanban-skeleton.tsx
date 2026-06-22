function Bone({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-lg animate-pulse ${className ?? ""}`}
      style={{ backgroundColor: "var(--hb-gray-100)", ...style }}
      aria-hidden
    />
  );
}

const COLUMN_CARD_COUNTS = [2, 3, 1, 2, 1, 0, 0];

export function KanbanSkeleton() {
  return (
    <div
      className="px-4 sm:px-6 py-8 flex flex-col gap-6"
      aria-label="Carregando pipeline…"
      aria-busy
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <Bone className="h-3 w-16" />
          <Bone className="h-7 w-52" />
          <Bone className="h-3.5 w-44" />
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Bone
            className="h-7 w-28 rounded-full"
            style={{ borderRadius: 999 }}
          />
          <Bone
            className="h-7 w-36 rounded-full"
            style={{ borderRadius: 999 }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Bone
          className="h-8 w-20 rounded-(--radius)"
          style={{ borderRadius: "var(--radius)" }}
        />
        <Bone
          className="h-8 w-44 rounded-(--radius)"
          style={{ borderRadius: "var(--radius)" }}
        />
        <Bone
          className="h-8 w-32 rounded-(--radius)"
          style={{ borderRadius: "var(--radius)" }}
        />
        <Bone
          className="h-8 w-36 rounded-(--radius)"
          style={{ borderRadius: "var(--radius)" }}
        />
      </div>

      {/* Kanban columns */}
      <div
        className="flex gap-3 overflow-x-auto pb-4"
        style={{ minHeight: 320 }}
      >
        {COLUMN_CARD_COUNTS.map((cardCount, colIdx) => (
          <div key={colIdx} className="shrink-0 w-60 flex flex-col gap-2">
            {/* Column header */}
            <div
              className="rounded-sm px-3 py-2 flex items-center justify-between"
              style={{
                backgroundColor: "var(--hb-gray-50)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <Bone
                className="h-4 w-24"
                style={{ backgroundColor: "var(--hb-gray-200)" }}
              />
              <Bone
                className="h-5 w-7 rounded-full"
                style={{
                  backgroundColor: "var(--hb-gray-200)",
                  borderRadius: 999,
                }}
              />
            </div>

            {/* Cards */}
            {Array.from({ length: cardCount }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="border bg-(--surface) p-3 flex flex-col gap-2.5"
                style={{
                  borderColor: "var(--border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <div className="flex items-start gap-2">
                  <Bone className="h-4 flex-1" />
                  <Bone
                    className="h-5 w-14 rounded-full shrink-0"
                    style={{ borderRadius: 999 }}
                  />
                </div>
                <Bone className="h-3 w-32" />
                <div className="flex items-center justify-between">
                  <Bone className="h-3 w-20" />
                  <Bone className="h-3 w-14" />
                </div>
              </div>
            ))}

            {/* Empty column placeholder */}
            {cardCount === 0 && (
              <div
                className="rounded-md border border-dashed px-3 py-5 flex items-center justify-center"
                style={{
                  borderColor: "var(--hb-gray-100)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <Bone className="h-3 w-20" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

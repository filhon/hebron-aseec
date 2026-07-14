function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

function KanbanColumnSkeleton({ cards }: { cards: number }) {
  return (
    <div className="flex min-w-70 max-w-80 flex-1 flex-col rounded-md border-2 border-transparent bg-(--surface-alt)">
      <div className="flex items-center justify-between gap-2 rounded-t-[calc(var(--radius-md)-2px)] px-3.5 py-3">
        <div className="flex items-center gap-2">
          <Bone className="h-2 w-2 rounded-full" />
          <Bone className="h-2.5 w-20" />
        </div>
        <Bone className="h-5 w-5 rounded-full" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-sm border border-(--border) bg-(--surface) p-3"
          >
            <Bone className="h-3 w-4/5" />
            <Bone className="h-3 w-2/5" />
            <div className="mt-1 flex items-center gap-2">
              <Bone className="h-5 w-5 rounded-full" />
              <Bone className="h-2.5 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KanbanSkeleton() {
  const cardsPerColumn = [3, 2, 1, 2];
  return (
    <div
      className="flex gap-3 overflow-x-auto pb-3"
      role="presentation"
      aria-hidden="true"
    >
      {cardsPerColumn.map((cards, i) => (
        <KanbanColumnSkeleton key={i} cards={cards} />
      ))}
    </div>
  );
}

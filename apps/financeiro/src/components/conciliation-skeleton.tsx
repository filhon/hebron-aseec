function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

function ReconColumnSkeleton() {
  return (
    <div
      className="rounded-(--radius) border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="space-y-1.5">
          <Bone className="h-2.5 w-24 rounded" />
          <Bone className="h-5 w-36 rounded-lg" />
        </div>
        <div className="flex gap-1.5">
          <Bone className="h-7 w-20 rounded-lg" />
          <Bone className="h-7 w-7 rounded-lg" />
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="grid items-center gap-3 px-5 py-3.5 border-b last:border-b-0"
          style={{
            gridTemplateColumns: "72px 1fr 100px",
            borderColor: "var(--divider)",
          }}
        >
          <Bone className="h-3 w-full rounded" />
          <div className="space-y-1.5">
            <Bone className="h-3 w-3/4 rounded" />
            <Bone className="h-2.5 w-1/2 rounded" />
          </div>
          <Bone className="h-3 w-full rounded ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function ConciliationSkeleton() {
  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{ w: "w-32" }, { w: "w-36" }, { w: "w-28" }, { w: "w-24" }].map(
          (col, i) => (
            <div
              key={i}
              className="rounded-(--radius) border p-4 space-y-2"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <Bone className={`h-2.5 ${col.w} rounded`} />
              <Bone className="h-8 w-16 rounded-lg" />
            </div>
          ),
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2">
        <Bone className="h-8 w-28 rounded-lg" />
        <div className="ml-auto flex gap-2">
          <Bone className="h-8 w-20 rounded-lg" />
          <Bone className="h-8 w-20 rounded-lg" />
        </div>
      </div>

      {/* Two-column conciliation grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReconColumnSkeleton />
        <ReconColumnSkeleton />
      </div>
    </div>
  );
}

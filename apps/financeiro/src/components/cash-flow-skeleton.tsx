function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

function KpiBone({ accent }: { accent?: boolean }) {
  return (
    <div
      className="rounded-(--radius) border p-5 space-y-3"
      style={{
        background: accent ? "var(--hb-blue)" : "var(--surface)",
        borderColor: accent ? "transparent" : "var(--border)",
      }}
    >
      <div
        className="h-2.5 w-24 animate-pulse rounded"
        style={{
          background: accent ? "var(--fg-invert-tint)" : "var(--surface-alt)",
        }}
      />
      <div
        className="h-7 w-28 animate-pulse rounded-lg"
        style={{
          background: accent ? "var(--fg-invert-tint)" : "var(--surface-alt)",
        }}
      />
    </div>
  );
}

export function CashFlowSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5 space-y-1.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <Bone className="h-2.5 w-20 rounded" />
        <Bone className="h-6 w-36 rounded-lg" />
      </div>

      <div className="p-6 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiBone accent />
          <KpiBone />
          <KpiBone />
        </div>

        {/* Chart */}
        <div
          className="rounded-(--radius) border p-5"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-start justify-between mb-5">
            <Bone className="h-5 w-36 rounded-lg" />
            <div className="flex gap-1.5">
              <Bone className="h-6 w-10 rounded-full" />
              <Bone className="h-6 w-10 rounded-full" />
              <Bone className="h-6 w-10 rounded-full" />
            </div>
          </div>
          <Bone className="h-44 w-full rounded-(--radius)" />
        </div>

        {/* Upcoming events table */}
        <div
          className="rounded-(--radius) border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="px-5 py-3.5 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <Bone className="h-4 w-32 rounded-lg" />
          </div>
          <div
            className="flex items-center gap-6 px-4 py-2.5 border-b"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}
          >
            <Bone className="h-2.5 w-16 rounded" />
            <Bone className="h-2.5 w-32 rounded" />
            <Bone className="h-2.5 w-16 rounded" />
            <Bone className="h-2.5 w-16 rounded ml-auto" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-6 px-4 py-3.5 border-b last:border-b-0"
              style={{ borderColor: "var(--divider)" }}
            >
              <Bone className="h-3 w-16 rounded shrink-0" />
              <Bone className="h-3 flex-1 rounded" />
              <Bone className="h-5 w-16 rounded-full shrink-0" />
              <Bone className="h-3 w-20 rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
      <div
        className="h-3 w-28 animate-pulse rounded"
        style={{
          background: accent ? "var(--fg-invert-tint)" : "var(--surface-alt)",
        }}
      />
    </div>
  );
}

export function BudgetSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="space-y-1.5">
          <Bone className="h-2.5 w-20 rounded" />
          <Bone className="h-6 w-40 rounded-lg" />
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiBone />
          <KpiBone />
          <KpiBone />
          <KpiBone accent />
        </div>

        {/* Budget comparison card */}
        <div
          className="rounded-(--radius) border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="grid grid-cols-3 divide-x"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="px-5 py-4 space-y-2"
              style={{ background: "var(--hb-blue)" }}
            >
              <div
                className="h-2.5 w-24 animate-pulse rounded"
                style={{ background: "var(--fg-invert-tint)" }}
              />
              <div
                className="h-6 w-28 animate-pulse rounded-lg"
                style={{ background: "var(--fg-invert-tint)" }}
              />
            </div>
            <div className="px-5 py-4 space-y-2">
              <Bone className="h-2.5 w-24 rounded" />
              <Bone className="h-6 w-28 rounded-lg" />
            </div>
            <div className="px-5 py-4 space-y-2">
              <Bone className="h-2.5 w-24 rounded" />
              <Bone className="h-6 w-28 rounded-lg" />
            </div>
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-3.5 border-t"
              style={{ borderColor: "var(--divider)" }}
            >
              <Bone className="h-3 w-40 rounded" />
              <Bone className="h-2 flex-1 rounded-full" />
              <Bone className="h-3 w-16 rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

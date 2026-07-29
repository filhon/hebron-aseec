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
        className="h-3 w-32 animate-pulse rounded"
        style={{
          background: accent ? "var(--fg-invert-tint)" : "var(--surface-alt)",
        }}
      />
    </div>
  );
}

export function TransactionTableSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="space-y-1.5">
          <Bone className="h-2.5 w-20 rounded" />
          <Bone className="h-6 w-32 rounded-lg" />
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

        {/* Immutability notice */}
        <div
          className="rounded-(--radius) border px-4 py-3"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <Bone className="h-3 w-full max-w-md rounded" />
        </div>

        {/* Table */}
        <div
          className="rounded-(--radius) border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="flex items-center gap-6 px-4 py-2.5 border-b"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}
          >
            <Bone className="h-2.5 w-14 rounded" />
            <Bone className="h-2.5 w-32 rounded" />
            <Bone className="h-2.5 w-20 rounded" />
            <Bone className="h-2.5 w-16 rounded" />
            <Bone className="h-2.5 w-16 rounded ml-auto" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-6 px-4 py-3.5 border-b last:border-b-0"
              style={{ borderColor: "var(--divider)" }}
            >
              <Bone className="h-3 w-14 rounded shrink-0" />
              <Bone className="h-3 flex-1 rounded" />
              <Bone className="h-3 w-20 rounded shrink-0" />
              <Bone className="h-3 w-16 rounded shrink-0" />
              <Bone className="h-3 w-20 rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

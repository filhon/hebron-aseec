function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

function KpiBone() {
  return (
    <div
      className="rounded-(--radius) border p-5 space-y-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <Bone className="h-2.5 w-24 rounded" />
      <Bone className="h-7 w-28 rounded-lg" />
    </div>
  );
}

function ListCardBone() {
  return (
    <div
      className="rounded-(--radius) border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="px-5 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <Bone className="h-4 w-40 rounded-lg" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0"
          style={{ borderColor: "var(--divider)" }}
        >
          <Bone className="h-3 flex-1 rounded" />
          <Bone className="h-3 w-16 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function RelatoriosSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="border-b px-6 py-3.5 space-y-1.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <Bone className="h-2.5 w-20 rounded" />
        <Bone className="h-6 w-40 rounded-lg" />
      </div>

      {/* Tabs */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4">
          <Bone className="h-4 w-10 rounded" />
          <Bone className="h-4 w-36 rounded" />
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiBone />
          <KpiBone />
          <KpiBone />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <ListCardBone />
          <ListCardBone />
        </div>
      </div>
    </div>
  );
}

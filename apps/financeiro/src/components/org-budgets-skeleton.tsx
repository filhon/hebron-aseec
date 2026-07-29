function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

export function OrgBudgetsSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5 space-y-1.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <Bone className="h-2.5 w-20 rounded" />
        <Bone className="h-6 w-56 rounded-lg" />
        <Bone className="h-3 w-full max-w-lg rounded" />
      </div>

      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-(--radius) border overflow-hidden"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div
              className="flex items-center gap-6 px-4 py-2.5 border-b"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            >
              <Bone className="h-2.5 w-32 rounded" />
              <Bone className="h-2.5 w-12 rounded" />
              <Bone className="h-2.5 w-20 rounded ml-auto" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-6 px-4 py-3.5 border-b last:border-b-0"
                style={{ borderColor: "var(--divider)" }}
              >
                <Bone className="h-3 flex-1 rounded" />
                <Bone className="h-3 w-12 rounded shrink-0" />
                <Bone className="h-3 w-20 rounded shrink-0 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

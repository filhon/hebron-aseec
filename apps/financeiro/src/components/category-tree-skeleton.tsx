function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

function TreeRowBone({ depth }: { depth: 0 | 1 | 2 }) {
  return (
    <div
      className="flex items-center gap-2 py-2.5 border-b last:border-b-0"
      style={{
        borderColor: "var(--divider)",
        paddingLeft: 16 + depth * 24,
      }}
    >
      <Bone className="h-5 w-5 rounded-md shrink-0" />
      <Bone
        className={depth === 0 ? "h-3.5 w-40 rounded" : "h-3 w-32 rounded"}
      />
      {depth === 0 && <Bone className="h-4 w-16 rounded-full ml-2" />}
    </div>
  );
}

export function CategoryTreeSkeleton() {
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

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Tree */}
          <div
            className="rounded-(--radius) border overflow-hidden"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <TreeRowBone depth={0} />
            <TreeRowBone depth={1} />
            <TreeRowBone depth={2} />
            <TreeRowBone depth={2} />
            <TreeRowBone depth={1} />
            <TreeRowBone depth={0} />
            <TreeRowBone depth={1} />
            <TreeRowBone depth={2} />
          </div>

          {/* Side panel */}
          <div
            className="rounded-(--radius) border px-5 py-4 space-y-3"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <Bone className="h-2.5 w-32 rounded" />
            <div className="flex flex-wrap gap-2">
              <Bone className="h-6 w-28 rounded-full" />
              <Bone className="h-6 w-20 rounded-full" />
              <Bone className="h-6 w-24 rounded-full" />
            </div>
            <Bone className="h-3 w-full rounded" />
            <Bone className="h-3 w-3/4 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

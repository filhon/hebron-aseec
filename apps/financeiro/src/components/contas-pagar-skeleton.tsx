function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

function CardBone() {
  return (
    <div
      className="rounded-(--radius) border p-5 space-y-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <Bone className="h-3 w-32 rounded" />
        <Bone className="h-5 w-16 rounded-full" />
      </div>
      <Bone className="h-6 w-28 rounded-lg" />
      <Bone className="h-3 w-40 rounded" />
      <Bone className="h-8 w-full rounded-(--radius)" />
    </div>
  );
}

export function ContasPagarSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4">
          <div className="space-y-1.5">
            <Bone className="h-2.5 w-20 rounded" />
            <Bone className="h-6 w-36 rounded-lg" />
          </div>
          <Bone className="ml-auto h-8 w-36 rounded-(--radius)" />
        </div>
        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          <Bone className="h-7 w-40 rounded-lg" />
          <Bone className="h-7 w-28 rounded-lg" />
          <Bone className="h-7 w-28 rounded-lg" />
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Stage info banner */}
        <div
          className="rounded-(--radius) border px-5 py-4 space-y-1.5"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <Bone className="h-3.5 w-52 rounded" />
          <Bone className="h-3 w-full max-w-lg rounded" />
        </div>

        {/* Payables card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardBone />
          <CardBone />
          <CardBone />
          <CardBone />
        </div>
      </div>
    </div>
  );
}

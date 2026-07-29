function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

function SectionBone({ rows }: { rows: number }) {
  return (
    <div className="space-y-4">
      <Bone className="h-4 w-40 rounded" />
      <div
        className="rounded-(--radius) border p-5 space-y-3"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <Bone className="h-3 w-1/3 rounded" />
              <Bone className="h-2.5 w-2/3 rounded" />
            </div>
            <Bone className="h-6 w-10 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MeusDadosSkeleton() {
  return (
    <div className="hb-page">
      <header className="space-y-2 pb-6">
        <Bone className="h-7 w-32 rounded-lg" />
        <Bone className="h-4 w-72 max-w-full rounded" />
      </header>

      <div className="space-y-12">
        <SectionBone rows={3} />
        <SectionBone rows={2} />
        <SectionBone rows={1} />
        <SectionBone rows={1} />
      </div>
    </div>
  );
}

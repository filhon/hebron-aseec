function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

export function ImportWizardSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5 space-y-1.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <Bone className="h-2.5 w-20 rounded" />
        <Bone className="h-6 w-52 rounded-lg" />
      </div>

      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Stepper */}
          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Bone className="h-6 w-6 rounded-full shrink-0" />
                <Bone className="h-3 w-16 rounded" />
                {i < 3 && <Bone className="h-3 w-4 rounded shrink-0" />}
              </div>
            ))}
          </div>

          {/* Drop zone */}
          <div
            className="rounded-(--radius) border-2 border-dashed flex flex-col items-center justify-center gap-3 py-16"
            style={{ borderColor: "var(--border)" }}
          >
            <Bone className="h-10 w-10 rounded-full" />
            <Bone className="h-3.5 w-64 rounded" />
            <Bone className="h-3 w-40 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

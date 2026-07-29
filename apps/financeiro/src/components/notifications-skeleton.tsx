function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

export function NotificationsSkeleton() {
  return (
    <div className="hb-page">
      <header className="space-y-2 pb-6">
        <Bone className="h-7 w-40 rounded-lg" />
        <Bone className="h-4 w-80 max-w-full rounded" />
      </header>

      <div
        className="rounded-(--radius) border overflow-hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-5 py-4 border-b last:border-b-0"
            style={{ borderColor: "var(--divider)" }}
          >
            <Bone className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-2/3 rounded" />
              <Bone className="h-3 w-1/3 rounded" />
            </div>
            <Bone className="h-2.5 w-12 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

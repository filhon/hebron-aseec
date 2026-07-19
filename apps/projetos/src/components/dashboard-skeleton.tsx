function Bone({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-lg animate-pulse ${className ?? ""}`}
      style={{ backgroundColor: "var(--hb-gray-100)", ...style }}
      aria-hidden
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div
      className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8"
      aria-label="Carregando painel…"
      aria-busy
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <Bone className="h-3 w-24" />
          <Bone className="h-8 w-56" />
          <Bone className="h-3.5 w-72" />
        </div>
        <Bone
          className="h-10 w-36 rounded-md shrink-0"
          style={{ borderRadius: "var(--radius-md)" }}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-md border bg-(--surface) px-5 py-4"
            style={{
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-xs)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Bone
                className="w-8 h-8 rounded-(--radius) shrink-0"
                style={{ borderRadius: "var(--radius)" }}
              />
              <Bone className="h-3 w-28 flex-1" />
            </div>
            <Bone className="h-9 w-16 mb-1.5" />
            <Bone className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Projects section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <Bone className="h-5 w-32" />
          <Bone className="h-3.5 w-16" />
        </div>
        <div className="flex flex-col gap-3">
          {[140, 120, 160, 130].map((titleW, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border bg-(--surface) px-5 py-4"
              style={{
                borderColor: "var(--border)",
                boxShadow: "var(--shadow-xs)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <Bone
                className="w-1 h-11 rounded-full shrink-0"
                style={{ borderRadius: 999 }}
              />
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Bone className="h-4" style={{ width: titleW }} />
                  <Bone
                    className="h-5 w-20 rounded-full shrink-0"
                    style={{ borderRadius: 999 }}
                  />
                </div>
                <div className="flex gap-4">
                  <Bone className="h-3 w-28" />
                  <Bone className="h-3 w-16" />
                </div>
              </div>
              <Bone className="w-4 h-4 shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* Bottom two-column */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: 40, rows: 3, label: 0 },
          { title: 44, rows: 3, label: 0 },
        ].map((col, ci) => (
          <section key={ci}>
            <Bone className="h-5 mb-4" style={{ width: col.title + 96 }} />
            <div className="flex flex-col gap-2">
              {Array.from({ length: col.rows }).map((_, ri) => (
                <div
                  key={ri}
                  className="border bg-(--surface) px-4 py-3 flex items-start gap-3"
                  style={{
                    borderColor: "var(--border)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <Bone className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Bone className="h-4 w-full" />
                    <Bone className="h-3 w-3/5" />
                  </div>
                  <Bone className="h-4 w-10 shrink-0" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

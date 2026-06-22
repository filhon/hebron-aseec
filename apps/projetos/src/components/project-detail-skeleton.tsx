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

export function ProjectDetailSkeleton() {
  return (
    <div
      className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8"
      aria-label="Carregando projeto…"
      aria-busy
    >
      {/* Breadcrumb */}
      <Bone className="h-4 w-28" />

      {/* Project header card */}
      <div
        className="border bg-[--surface] overflow-hidden"
        style={{
          borderColor: "var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Stage stripe */}
        <Bone
          className="h-1.5 w-full rounded-none"
          style={{ borderRadius: 0 }}
        />

        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Bone
                  className="h-5 w-20 rounded-full"
                  style={{ borderRadius: 999 }}
                />
                <Bone
                  className="h-4 w-24 rounded-full"
                  style={{ borderRadius: 999 }}
                />
              </div>
              <Bone className="h-7 w-4/5" />
            </div>
            <Bone
              className="h-10 w-36 shrink-0"
              style={{ borderRadius: "var(--radius-md)" }}
            />
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            {[72, 64, 80, 56].map((w, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Bone className="h-3 w-16" />
                <Bone className="h-4.5" style={{ width: w }} />
              </div>
            ))}
          </div>
        </div>

        {/* Institution bar */}
        <div
          className="px-6 py-3 border-t flex items-center gap-3"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-alt)",
          }}
        >
          <Bone
            className="w-6 h-6 rounded-full"
            style={{ borderRadius: 999 }}
          />
          <Bone className="h-4 w-48" />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: content */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {[
            ["Objetivos", 4],
            ["Metodologia", 3],
          ].map(([label, rows]) => (
            <section key={label as string}>
              <Bone className="h-3.5 w-24 mb-3" />
              <div
                className="border bg-[--surface] px-5 py-4 flex flex-col gap-2"
                style={{
                  borderColor: "var(--border)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                {Array.from({ length: rows as number }).map((_, ri) => (
                  <Bone
                    key={ri}
                    className="h-3.5"
                    style={{
                      width: ri === (rows as number) - 1 ? "60%" : "100%",
                    }}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* Reports section */}
          <section>
            <Bone className="h-3.5 w-32 mb-3" />
            <div className="flex flex-col gap-3">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="border bg-[--surface] px-4 py-4 flex items-start gap-3"
                  style={{
                    borderColor: "var(--border)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <Bone
                    className="w-8 h-8 rounded-(--radius) shrink-0"
                    style={{ borderRadius: "var(--radius)" }}
                  />
                  <div className="flex-1 flex flex-col gap-2">
                    <Bone className="h-4 w-3/4" />
                    <Bone className="h-3 w-1/2" />
                  </div>
                  <Bone
                    className="h-5 w-16 rounded-full shrink-0"
                    style={{ borderRadius: 999 }}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: timeline */}
        <div className="lg:col-span-2">
          <Bone className="h-3.5 w-20 mb-3" />
          <div
            className="border bg-[--surface] px-4 py-5 flex flex-col gap-0"
            style={{
              borderColor: "var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <Bone
                    className="w-7 h-7 rounded-full shrink-0"
                    style={{ borderRadius: 999 }}
                  />
                  {i < 3 && (
                    <div
                      className="w-px h-8 animate-pulse"
                      style={{ backgroundColor: "var(--hb-gray-100)" }}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1.5 pt-1.5 pb-4">
                  <Bone className="h-4 w-32" />
                  <Bone className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

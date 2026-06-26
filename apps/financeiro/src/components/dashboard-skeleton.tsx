function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

export function DashboardSkeleton() {
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
            <Bone className="h-6 w-44 rounded-lg" />
          </div>
          <div className="ml-auto flex gap-2">
            <Bone className="h-9 w-24 rounded-xl" />
            <Bone className="h-9 w-36 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border p-5 space-y-3"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <Bone className="h-2.5 w-24 rounded" />
              <Bone className="h-7 w-32 rounded-lg" />
              <Bone className="h-2.5 w-20 rounded" />
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-5">
          {/* Left column */}
          <div className="space-y-5">
            {/* Cash flow chart */}
            <div
              className="rounded-xl border p-5"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="space-y-1.5">
                  <Bone className="h-2.5 w-28 rounded" />
                  <Bone className="h-5 w-36 rounded-lg" />
                </div>
                <div className="flex gap-1.5">
                  <Bone className="h-6 w-10 rounded-full" />
                  <Bone className="h-6 w-10 rounded-full" />
                  <Bone className="h-6 w-10 rounded-full" />
                </div>
              </div>
              <Bone className="h-44 w-full rounded-xl" />
              <div className="flex gap-4 mt-3">
                <Bone className="h-3 w-28 rounded" />
                <Bone className="h-3 w-28 rounded" />
                <Bone className="h-3 w-28 rounded" />
              </div>
            </div>

            {/* Bank accounts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <Bone className="h-2.5 w-16 rounded" />
                  <Bone className="h-5 w-48 rounded-lg" />
                </div>
                <Bone className="h-8 w-24 rounded-lg" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden rounded-xl border p-5 space-y-2"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <Bone className="absolute left-0 top-0 h-full w-1" />
                    <div className="flex items-center gap-2 mb-3">
                      <Bone className="h-6 w-6 rounded-md shrink-0" />
                      <Bone className="h-2.5 w-16 rounded" />
                    </div>
                    <Bone className="h-7 w-28 rounded-lg" />
                    <Bone className="h-2.5 w-20 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent transactions table */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <Bone className="h-5 w-40 rounded-lg" />
                <Bone className="h-4 w-16 rounded" />
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-3.5 border-b last:border-b-0"
                  style={{ borderColor: "var(--divider)" }}
                >
                  <Bone className="h-3 w-12 rounded shrink-0" />
                  <Bone className="h-3 flex-1 rounded" />
                  <Bone className="h-3 w-16 rounded shrink-0" />
                  <Bone className="h-5 w-20 rounded-full shrink-0" />
                  <Bone className="h-3 w-20 rounded shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Alert card */}
            <div
              className="rounded-xl border p-5 space-y-3"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-start gap-3">
                <Bone className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-2.5 w-28 rounded" />
                  <Bone className="h-5 w-44 rounded-lg" />
                  <Bone className="h-3 w-full rounded" />
                </div>
              </div>
              <div className="flex gap-2">
                <Bone className="h-9 flex-1 rounded-xl" />
                <Bone className="h-9 w-20 rounded-xl" />
              </div>
            </div>

            {/* Governance card */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="px-5 py-4 border-b space-y-1.5"
                style={{ borderColor: "var(--border)" }}
              >
                <Bone className="h-2.5 w-24 rounded" />
                <Bone className="h-5 w-36 rounded-lg" />
              </div>
              <div className="grid grid-cols-4 gap-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 px-1 py-1">
                    <Bone className="h-5 w-5 rounded-full" />
                    <Bone className="h-2.5 w-full rounded" />
                    <Bone className="h-2.5 w-3/4 rounded" />
                  </div>
                ))}
              </div>
              <div
                className="mx-5 my-3 p-3 rounded-xl"
                style={{ background: "var(--bg-alt)" }}
              >
                <Bone className="h-3 w-full rounded" />
              </div>
            </div>

            {/* Conciliation card */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="space-y-1.5">
                  <Bone className="h-2.5 w-24 rounded" />
                  <Bone className="h-5 w-36 rounded-lg" />
                </div>
                <Bone className="h-4 w-16 rounded" />
              </div>
              <div className="flex items-center gap-5 px-5 py-4">
                <div className="flex-1 space-y-2">
                  <Bone className="h-2.5 w-16 rounded" />
                  <Bone className="h-8 w-12 rounded-lg" />
                  <Bone className="h-2.5 w-28 rounded" />
                </div>
                <Bone className="h-20 w-20 rounded-full shrink-0" />
              </div>
            </div>

            {/* Verse card */}
            <div
              className="rounded-xl p-5 space-y-3"
              style={{ background: "var(--hb-blue)" }}
            >
              <div
                className="h-2.5 w-24 animate-pulse rounded"
                style={{ background: "rgba(255,255,255,0.15)" }}
              />
              <div
                className="h-4 w-full animate-pulse rounded"
                style={{ background: "rgba(255,255,255,0.12)" }}
              />
              <div
                className="h-4 w-4/5 animate-pulse rounded"
                style={{ background: "rgba(255,255,255,0.12)" }}
              />
              <div
                className="h-2.5 w-16 animate-pulse rounded"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

function CardShell({
  padding,
  children,
}: {
  padding: number | string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding,
      }}
    >
      {children}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="hb-page" aria-label="Carregando painel…" aria-busy>
      {/* Header */}
      <div className="flex items-end justify-between gap-6 flex-wrap mb-7">
        <div className="flex flex-col gap-2.5">
          <Bone className="h-3 w-24" />
          <Bone className="h-8 w-72" />
          <Bone className="h-4 w-56" />
        </div>
        <Bone
          className="h-11 w-48 shrink-0"
          style={{ borderRadius: "var(--radius-pill)" }}
        />
      </div>

      {/* 4 stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <CardShell key={i} padding={20}>
            <div className="flex items-center gap-2 mb-3">
              <Bone className="w-2.5 h-2.5 rounded-full shrink-0" />
              <Bone className="h-3 w-24 flex-1" />
            </div>
            <Bone className="h-9 w-16 mb-1.5" />
            <Bone className="h-3 w-28" />
          </CardShell>
        ))}
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5 items-start">
        {/* Left: Meus projetos */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
            padding: "8px 8px 12px",
          }}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <Bone className="h-5 w-32" />
          </div>
          <div className="flex flex-col">
            {[140, 120, 160].map((titleW, i) => (
              <div key={i}>
                {i > 0 && (
                  <div
                    style={{
                      height: 1,
                      background: "var(--divider)",
                      margin: "0 16px",
                    }}
                  />
                )}
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="flex items-center gap-2.5">
                      <Bone className="h-4" style={{ width: titleW }} />
                      <Bone
                        className="h-5 w-20 shrink-0"
                        style={{ borderRadius: "var(--radius-pill)" }}
                      />
                    </div>
                    <Bone className="h-3 w-40" />
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Bone className="h-4 w-16" />
                    <Bone className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: pagamentos + orçamento */}
        <div className="flex flex-col gap-5">
          <CardShell padding={20}>
            <Bone className="h-4 w-36 mb-4" />
            <div className="flex flex-col gap-3.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-8 w-8 shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Bone className="h-3.5 w-full" />
                    <Bone className="h-2.5 w-2/5" />
                  </div>
                  <Bone className="h-3.5 w-12 shrink-0" />
                </div>
              ))}
            </div>
          </CardShell>

          <CardShell padding={20}>
            <Bone className="h-4 w-40 mb-1.5" />
            <Bone className="h-2.5 w-24 mb-4" />
            <div className="flex items-baseline justify-between mb-2">
              <Bone className="h-7 w-24" />
              <Bone className="h-2.5 w-16" />
            </div>
            <Bone className="h-2.5 w-full mb-2.5" />
            <Bone className="h-2.5 w-full" />
          </CardShell>
        </div>
      </div>
    </div>
  );
}

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-lg animate-pulse ${className ?? ""}`}
      style={{ backgroundColor: "var(--hb-gray-100)" }}
      aria-hidden
    />
  );
}

function ReportListSkeleton() {
  return (
    <div className="hb-page" aria-label="Carregando relatórios…" aria-busy>
      <div className="flex flex-col gap-2.5 mb-7">
        <Bone className="h-3 w-32" />
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-80" />
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
          padding: "8px 8px 12px",
        }}
      >
        <div className="px-4 pt-4 pb-3">
          <Bone className="h-5 w-40" />
        </div>
        <div className="flex flex-col">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Bone className="h-10 w-10 shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <Bone className="h-4 w-52" />
                <Bone className="h-3 w-32" />
              </div>
              <Bone className="h-8 w-24 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return <ReportListSkeleton />;
}

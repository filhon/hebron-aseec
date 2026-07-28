function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-lg animate-pulse ${className ?? ""}`}
      style={{ backgroundColor: "var(--hb-gray-100)" }}
      aria-hidden
    />
  );
}

export default function Loading() {
  return (
    <div
      className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6"
      aria-label="Carregando instituições…"
      aria-busy
    >
      <div className="flex flex-col gap-2.5">
        <Bone className="h-3 w-16" />
        <Bone className="h-7 w-52" />
        <Bone className="h-4 w-72" />
      </div>

      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Bone className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Bone className="h-4 w-40" />
              <Bone className="h-3 w-24" />
            </div>
          </div>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-sm)",
              padding: 24,
            }}
          >
            <Bone className="h-10 w-full mb-2" />
            <Bone className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

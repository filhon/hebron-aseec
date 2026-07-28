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
      className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8"
      aria-label="Carregando pauta da reunião…"
      aria-busy
    >
      <div className="flex flex-col gap-2.5">
        <Bone className="h-3 w-16" />
        <Bone className="h-7 w-64" />
        <Bone className="h-4 w-52" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-sm)",
              padding: 20,
            }}
          >
            <Bone className="h-3 w-24 mb-3" />
            <Bone className="h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Bone className="h-5 w-40" />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <Bone className="h-4 flex-1" />
            <Bone className="h-5 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

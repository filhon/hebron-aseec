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
      className="max-w-2xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6"
      aria-label="Carregando formulário…"
      aria-busy
    >
      <div className="flex flex-col gap-2.5">
        <Bone className="h-3 w-28" />
        <Bone className="h-7 w-64" />
      </div>

      <div className="flex items-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-8 w-8 rounded-full shrink-0" />
        ))}
      </div>

      <div
        className="flex flex-col gap-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
          padding: 24,
        }}
      >
        <Bone className="h-4 w-40" />
        <Bone className="h-10 w-full" />
        <Bone className="h-4 w-32" />
        <Bone className="h-10 w-full" />
        <Bone className="h-24 w-full" />
      </div>
    </div>
  );
}

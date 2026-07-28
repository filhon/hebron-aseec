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
    <div className="hb-page" aria-label="Carregando instituição…" aria-busy>
      <div className="flex flex-col gap-2.5 mb-7">
        <Bone className="h-3 w-24" />
        <Bone className="h-7 w-56" />
        <Bone className="h-4 w-80" />
      </div>

      <div
        className="flex items-start gap-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
          padding: 24,
        }}
      >
        <Bone className="h-14 w-14 shrink-0" />
        <div className="flex-1 flex flex-col gap-2.5">
          <Bone className="h-6 w-64" />
          <Bone className="h-3.5 w-44" />
        </div>
      </div>
    </div>
  );
}

function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

const COLS = [
  { w: "w-14" },
  { w: "flex-1" },
  { w: "w-24" },
  { w: "w-20" },
  { w: "w-20" },
  { w: "w-24" },
  { w: "w-8" },
];

export function TransactionTableSkeleton() {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <Bone className="h-8 flex-1 max-w-xs rounded-full" />
        <Bone className="h-8 w-24 rounded-lg" />
        <Bone className="h-8 w-24 rounded-lg" />
        <div className="ml-auto flex gap-2">
          <Bone className="h-8 w-8 rounded-lg" />
          <Bone className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Active filters strip */}
      <div
        className="flex items-center gap-2 px-5 py-2.5 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {[60, 48, 56].map((w, i) => (
          <Bone
            key={i}
            className={`h-6 w-${w === 60 ? "16" : w === 48 ? "12" : "14"} rounded-full`}
          />
        ))}
      </div>

      {/* Column headers */}
      <div
        className="grid items-center gap-4 px-4 py-2.5 border-b"
        style={{
          gridTemplateColumns: "56px 1fr 96px 80px 80px 96px 32px",
          borderColor: "var(--border)",
          background: "var(--bg)",
        }}
      >
        {["Data", "Descrição", "Categoria", "Conta", "Status", "Valor", ""].map(
          (h) => (
            <Bone
              key={h}
              className={`h-2.5 rounded ${h === "" ? "w-0" : h === "Descrição" ? "w-20" : "w-14"}`}
            />
          ),
        )}
      </div>

      {/* Rows */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="grid items-center gap-4 px-4 py-3.5 border-b last:border-b-0"
          style={{
            gridTemplateColumns: "56px 1fr 96px 80px 80px 96px 32px",
            borderColor: "var(--divider)",
          }}
        >
          {COLS.map((col, j) => (
            <Bone
              key={j}
              className={`h-3 ${col.w} rounded ${j === 4 ? "h-5 rounded-full" : ""}`}
            />
          ))}
        </div>
      ))}

      {/* Pagination */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <Bone className="h-3 w-32 rounded" />
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Bone key={i} className="h-7 w-7 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

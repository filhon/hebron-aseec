// Skeleton for the Dashboard page.
// Mirrors: header · stat cards grid · role breakdown card · recent audit card.

// ─── Primitives ───────────────────────────────────────────────────────────────

function Bone({
  width,
  height,
  style,
}: {
  width: string;
  height: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="animate-pulse"
      aria-hidden="true"
      style={{
        backgroundColor: "var(--surface-alt)",
        borderRadius: "var(--radius)",
        width,
        height,
        ...style,
      }}
    />
  );
}

// ─── Stat card skeleton ────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div
      style={{
        backgroundColor: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: "1.25rem",
        display: "flex",
        alignItems: "flex-start",
        gap: "1rem",
      }}
    >
      <div
        className="animate-pulse"
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: "2.5rem",
          height: "2.5rem",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--surface-alt)",
        }}
      />
      <div
        style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}
      >
        <Bone width="2.5rem" height="1.5rem" />
        <Bone width="7rem" height="0.75rem" />
      </div>
    </div>
  );
}

// ─── Card with list rows ───────────────────────────────────────────────────────

function CardSkeleton({
  rows,
  rowWidths,
}: {
  rows: number;
  rowWidths?: string[];
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: "1.25rem",
      }}
    >
      <Bone width="8rem" height="0.875rem" />
      <ul
        aria-hidden="true"
        role="list"
        style={{
          marginTop: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {Array.from({ length: rows }, (_, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <Bone
              width={
                rowWidths
                  ? (rowWidths[i % rowWidths.length] ?? "70%")
                  : `${60 + (i % 4) * 8}%`
              }
              height="0.875rem"
            />
            <Bone width="40%" height="0.75rem" />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Role breakdown card ───────────────────────────────────────────────────────

function RoleBreakdownSkeleton() {
  const widths = ["72%", "64%", "55%", "80%", "48%", "60%"];

  return (
    <div
      style={{
        backgroundColor: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: "1.25rem",
      }}
    >
      <Bone width="9rem" height="0.875rem" />
      <ul
        aria-hidden="true"
        role="list"
        style={{
          marginTop: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.625rem",
        }}
      >
        {widths.map((w, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Bone width={w} height="0.875rem" />
            <Bone width="1.5rem" height="0.875rem" />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div
      aria-label="Carregando painel…"
      aria-busy="true"
      style={{
        padding: "1.5rem",
        maxWidth: "72rem",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      {/* Header */}
      <div
        style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}
      >
        <Bone width="7rem" height="1.75rem" />
        <Bone width="18rem" height="1rem" />
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))",
          gap: "1rem",
        }}
      >
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Role breakdown + Recent audit */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(20rem, 1fr))",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        <RoleBreakdownSkeleton />
        <CardSkeleton rows={8} />
      </div>
    </div>
  );
}

// Skeleton for the Auditoria page.
// Mirrors: filter bar (search + action select + clear) · table header · 10 rows.
// Columns: Data/hora · Ator · Ação · Entidade · ID alvo.

// ─── Primitives ───────────────────────────────────────────────────────────────

function Bone({
  width,
  height,
  radius,
}: {
  width: string;
  height: string;
  radius?: string;
}) {
  return (
    <div
      className="animate-pulse"
      aria-hidden="true"
      style={{
        backgroundColor: "var(--surface-alt)",
        borderRadius: radius ?? "var(--radius)",
        width,
        height,
      }}
    />
  );
}

// ─── Table row skeleton ────────────────────────────────────────────────────────

function TableRowSkeleton({ index }: { index: number }) {
  const actionWidth = `${7 + (index % 4) * 1.5}rem`;
  const actorWidth = `${5 + (index % 3)}rem`;

  return (
    <tr aria-hidden="true" style={{ borderBottom: "1px solid var(--border)" }}>
      {/* Data/hora — monospaced */}
      <td style={{ padding: "0.875rem 1rem", whiteSpace: "nowrap" }}>
        <Bone width="8rem" height="0.75rem" />
      </td>
      {/* Ator */}
      <td style={{ padding: "0.875rem 1rem" }}>
        <Bone width={actorWidth} height="0.875rem" />
      </td>
      {/* Ação badge */}
      <td style={{ padding: "0.875rem 1rem" }}>
        <Bone
          width={actionWidth}
          height="1.25rem"
          radius="var(--radius-full)"
        />
      </td>
      {/* Entidade pill */}
      <td style={{ padding: "0.875rem 1rem" }}>
        <Bone width="5.5rem" height="1.25rem" radius="var(--radius-full)" />
      </td>
      {/* ID alvo — monospaced, shorter */}
      <td style={{ padding: "0.875rem 1rem" }}>
        <Bone width="5rem" height="0.75rem" />
      </td>
    </tr>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function AuditLogSkeleton() {
  return (
    <div aria-label="Carregando registros de auditoria…" aria-busy="true">
      {/* Filter bar: search + action select + clear button */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div
          className="animate-pulse"
          aria-hidden="true"
          style={{
            flex: "1 1 16rem",
            height: "2.25rem",
            backgroundColor: "var(--surface-alt)",
            borderRadius: "var(--radius)",
          }}
        />
        <div
          className="animate-pulse"
          aria-hidden="true"
          style={{
            width: "11rem",
            height: "2.25rem",
            backgroundColor: "var(--surface-alt)",
            borderRadius: "var(--radius)",
          }}
        />
        <div
          className="animate-pulse"
          aria-hidden="true"
          style={{
            width: "2.25rem",
            height: "2.25rem",
            backgroundColor: "var(--surface-alt)",
            borderRadius: "var(--radius)",
          }}
        />
      </div>

      {/* Table */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          {/* Header */}
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                backgroundColor:
                  "color-mix(in sRGB, var(--surface-alt) 40%, transparent)",
              }}
            >
              {[
                { w: "5rem", label: "Data/hora" },
                { w: "4rem", label: "Ator" },
                { w: "5rem", label: "Ação" },
                { w: "5rem", label: "Entidade" },
                { w: "4rem", label: "ID alvo" },
              ].map(({ w, label }) => (
                <th
                  key={label}
                  aria-hidden="true"
                  style={{ padding: "0.75rem 1rem", textAlign: "left" }}
                >
                  <Bone width={w} height="0.75rem" />
                </th>
              ))}
            </tr>
          </thead>

          {/* Rows */}
          <tbody>
            {Array.from({ length: 10 }, (_, i) => (
              <TableRowSkeleton key={i} index={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Skeleton for the Users page.
// Mirrors: filter bar (search + status select + role select) · table header · 8 rows.

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
        backgroundColor: "var(--color-muted)",
        borderRadius: radius ?? "var(--radius)",
        width,
        height,
      }}
    />
  );
}

// ─── Table row skeleton ────────────────────────────────────────────────────────

function TableRowSkeleton({ index }: { index: number }) {
  // Vary widths slightly so rows look natural, not identical.
  const nameWidth = `${7 + (index % 3)}rem`;
  const emailWidth = `${10 + (index % 4)}rem`;

  return (
    <tr
      aria-hidden="true"
      style={{
        borderBottom: "1px solid var(--color-border)",
        transition: "background-color 0.15s",
      }}
    >
      {/* Usuário: avatar + name/email */}
      <td style={{ padding: "0.875rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div
            className="animate-pulse"
            style={{
              flexShrink: 0,
              width: "2rem",
              height: "2rem",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--color-muted)",
            }}
          />
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
          >
            <Bone width={nameWidth} height="0.875rem" />
            <Bone width={emailWidth} height="0.75rem" />
          </div>
        </div>
      </td>
      {/* Status badge */}
      <td style={{ padding: "0.875rem 1rem" }}>
        <Bone width="5.5rem" height="1.25rem" radius="var(--radius-full)" />
      </td>
      {/* Roles */}
      <td style={{ padding: "0.875rem 1rem" }}>
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          <Bone width="5rem" height="1.25rem" radius="var(--radius-full)" />
          {index % 2 === 0 && (
            <Bone width="4rem" height="1.25rem" radius="var(--radius-full)" />
          )}
        </div>
      </td>
      {/* Last seen */}
      <td style={{ padding: "0.875rem 1rem" }}>
        <Bone width="4rem" height="0.875rem" />
      </td>
      {/* Actions */}
      <td style={{ padding: "0.875rem 1rem" }}>
        <Bone width="2rem" height="2rem" />
      </td>
    </tr>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function UserTableSkeleton() {
  return (
    <div aria-label="Carregando usuários…" aria-busy="true">
      {/* Filter bar: search + status select + role select */}
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
            backgroundColor: "var(--color-muted)",
            borderRadius: "var(--radius)",
          }}
        />
        <div
          className="animate-pulse"
          aria-hidden="true"
          style={{
            width: "9rem",
            height: "2.25rem",
            backgroundColor: "var(--color-muted)",
            borderRadius: "var(--radius)",
          }}
        />
        <div
          className="animate-pulse"
          aria-hidden="true"
          style={{
            width: "9rem",
            height: "2.25rem",
            backgroundColor: "var(--color-muted)",
            borderRadius: "var(--radius)",
          }}
        />
      </div>

      {/* Table */}
      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          {/* Header */}
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--color-border)",
                backgroundColor:
                  "color-mix(in sRGB, var(--color-muted) 40%, transparent)",
              }}
            >
              {[
                { w: "40%", label: "Usuário" },
                { w: "55%", label: "Status" },
                { w: "50%", label: "Papéis" },
                { w: "45%", label: "Último acesso" },
                { w: "2rem", label: "Ações" },
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
            {Array.from({ length: 8 }, (_, i) => (
              <TableRowSkeleton key={i} index={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

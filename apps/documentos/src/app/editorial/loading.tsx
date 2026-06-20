export default function EditorialLoading() {
  return (
    <div>
      {/* Page header skeleton */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="h-3 w-24 rounded-full animate-pulse bg-[--bg-alt] mb-3" />
          <div className="h-8 w-72 rounded animate-pulse bg-[--bg-alt] mb-2" />
          <div className="h-3.5 w-96 rounded animate-pulse bg-[--bg-alt]" />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div
            className="animate-pulse bg-[--bg-alt] rounded-full"
            style={{ height: 32, width: 112 }}
          />
          <div
            className="animate-pulse bg-[--bg-alt] rounded-full"
            style={{ height: 32, width: 128 }}
          />
        </div>
      </div>

      {/* KPI grid skeleton */}
      <div className="docs-kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="hb-stat" style={{ pointerEvents: "none" }}>
            <div
              className="animate-pulse bg-[--bg-alt] rounded-full"
              style={{ width: 8, height: 8, marginBottom: 10 }}
            />
            <div className="h-3 w-28 rounded animate-pulse bg-[--bg-alt] mb-3" />
            <div className="h-9 w-16 rounded animate-pulse bg-[--bg-alt] mb-2" />
            <div className="h-3 w-32 rounded animate-pulse bg-[--bg-alt]" />
          </div>
        ))}
      </div>

      {/* Content grid skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* Table skeleton */}
        <div className="hb-card hb-card-overflow">
          <div className="hb-card-header">
            <div className="h-4 w-4 rounded animate-pulse bg-[--bg-alt]" />
            <div className="h-4 w-40 rounded animate-pulse bg-[--bg-alt]" />
          </div>
          <table className="hb-tbl">
            <thead>
              <tr>
                {[140, 72, 72, 80, 32].map((w, i) => (
                  <th key={i}>
                    <div
                      className="h-3 rounded animate-pulse bg-[--bg-alt]"
                      style={{ width: w }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map((row) => (
                <tr key={row}>
                  <td>
                    <div className="h-3.5 w-48 rounded animate-pulse bg-[--bg-alt] mb-1.5" />
                    <div className="h-3 w-28 rounded animate-pulse bg-[--bg-alt]" />
                  </td>
                  <td>
                    <div className="h-5 w-16 rounded animate-pulse bg-[--bg-alt]" />
                  </td>
                  <td>
                    <div className="h-5 w-20 rounded animate-pulse bg-[--bg-alt]" />
                  </td>
                  <td>
                    <div className="h-3 w-20 rounded animate-pulse bg-[--bg-alt]" />
                  </td>
                  <td>
                    <div className="h-6 w-6 rounded animate-pulse bg-[--bg-alt]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Side stack skeleton */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Active editais */}
          <div className="hb-card" style={{ padding: "20px 22px" }}>
            <div className="h-3 w-20 rounded-full animate-pulse bg-[--bg-alt] mb-2" />
            <div className="h-5 w-40 rounded animate-pulse bg-[--bg-alt] mb-4" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px 14px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <div className="h-5 w-16 rounded animate-pulse bg-[--bg-alt] mb-2" />
                  <div className="h-3.5 w-full rounded animate-pulse bg-[--bg-alt]" />
                </div>
              ))}
            </div>
          </div>

          {/* Review queue */}
          <div className="hb-card" style={{ padding: "20px 22px" }}>
            <div className="h-3 w-24 rounded-full animate-pulse bg-[--bg-alt] mb-2" />
            <div className="h-5 w-48 rounded animate-pulse bg-[--bg-alt] mb-4" />
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--divider)",
                }}
              >
                <div
                  className="animate-pulse bg-[--bg-alt] rounded"
                  style={{ width: 32, height: 32 }}
                />
                <div>
                  <div className="h-3.5 w-full rounded animate-pulse bg-[--bg-alt] mb-1" />
                  <div className="h-3 w-28 rounded animate-pulse bg-[--bg-alt]" />
                </div>
                <div
                  className="animate-pulse bg-[--bg-alt] rounded-full"
                  style={{ width: 56, height: 28 }}
                />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

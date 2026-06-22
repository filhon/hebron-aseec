export default function CategoriasLoading() {
  return (
    <div>
      {/* Breadcrumbs skeleton */}
      <nav className="docs-breadcrumbs" aria-label="Navegação estrutural">
        <div className="h-3 w-20 rounded animate-pulse bg-(--bg-alt)" />
        <div className="h-3 w-3 rounded animate-pulse bg-(--bg-alt)" />
        <div className="h-3 w-20 rounded animate-pulse bg-(--bg-alt)" />
      </nav>

      {/* Header skeleton */}
      <div style={{ marginBottom: 28 }}>
        <div className="h-3 w-24 rounded-full animate-pulse bg-(--bg-alt) mb-3" />
        <div className="h-7 w-40 rounded animate-pulse bg-(--bg-alt) mb-2" />
        <div className="h-3.5 w-72 rounded animate-pulse bg-(--bg-alt)" />
      </div>

      {/* CategoriesManager skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* Category tree */}
        <div className="hb-card hb-card-overflow">
          <div className="hb-card-header">
            <div className="h-4 w-4 rounded animate-pulse bg-(--bg-alt)" />
            <div className="h-4 w-32 rounded animate-pulse bg-(--bg-alt)" />
            <div
              className="animate-pulse bg-(--bg-alt) rounded-full ml-auto"
              style={{ width: 96, height: 28 }}
            />
          </div>
          <div style={{ padding: "8px 0" }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 20px",
                  borderBottom: "1px solid var(--divider)",
                }}
              >
                <div
                  className="animate-pulse bg-(--bg-alt) rounded"
                  style={{ width: 28, height: 28, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    className="h-3.5 rounded animate-pulse bg-(--bg-alt) mb-1"
                    style={{ width: `${[55, 72, 48, 64, 80, 58][i - 1]}%` }}
                  />
                  <div className="h-3 w-16 rounded animate-pulse bg-(--bg-alt)" />
                </div>
                <div className="flex gap-1">
                  <div
                    className="animate-pulse bg-(--bg-alt) rounded"
                    style={{ width: 28, height: 28 }}
                  />
                  <div
                    className="animate-pulse bg-(--bg-alt) rounded"
                    style={{ width: 28, height: 28 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form panel */}
        <div className="hb-card" style={{ padding: "24px" }}>
          <div className="h-5 w-36 rounded animate-pulse bg-(--bg-alt) mb-5" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div className="h-3 w-12 rounded animate-pulse bg-(--bg-alt) mb-2" />
              <div
                className="animate-pulse bg-(--bg-alt) rounded"
                style={{ height: 36, width: "100%" }}
              />
            </div>
            <div>
              <div className="h-3 w-24 rounded animate-pulse bg-(--bg-alt) mb-2" />
              <div
                className="animate-pulse bg-(--bg-alt) rounded"
                style={{ height: 36, width: "100%" }}
              />
            </div>
            <div
              className="animate-pulse bg-(--bg-alt) rounded-full mt-2"
              style={{ height: 36, width: 120 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

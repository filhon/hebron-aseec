const TITLE_WIDTHS = [68, 82, 55, 75, 90] as const;
const EXCERPT_WIDTHS = [100, 88, 95, 78, 92] as const;
const EXCERPT2_WIDTHS = [75, 62, 80, 55, 70] as const;

export function SearchResultsSkeleton({ count = 5 }: { count?: number }) {
  const total = Math.min(count, TITLE_WIDTHS.length);

  return (
    <div className="hb-card hb-card-overflow" style={{ padding: "0 24px" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="docs-search-result"
          style={{ pointerEvents: "none" }}
        >
          {/* Format icon placeholder */}
          <div
            className="docs-search-fmt animate-pulse bg-(--bg-alt)"
            style={{ border: "none" }}
          />

          <div style={{ minWidth: 0 }}>
            {/* Breadcrumb */}
            <div className="h-3 w-36 rounded animate-pulse bg-(--bg-alt) mb-2" />
            {/* Title */}
            <div
              className="h-4 rounded animate-pulse bg-(--bg-alt) mb-2.5"
              style={{ width: `${TITLE_WIDTHS[i % TITLE_WIDTHS.length]}%` }}
            />
            {/* Excerpt lines */}
            <div
              className="mb-2"
              style={{ display: "flex", flexDirection: "column", gap: 5 }}
            >
              <div
                className="h-3 rounded animate-pulse bg-(--bg-alt)"
                style={{
                  width: `${EXCERPT_WIDTHS[i % EXCERPT_WIDTHS.length]}%`,
                }}
              />
              <div
                className="h-3 rounded animate-pulse bg-(--bg-alt)"
                style={{
                  width: `${EXCERPT2_WIDTHS[i % EXCERPT2_WIDTHS.length]}%`,
                }}
              />
            </div>
            {/* Meta row */}
            <div className="flex gap-2">
              <div className="h-4 w-12 rounded animate-pulse bg-(--bg-alt)" />
              <div className="h-4 w-20 rounded animate-pulse bg-(--bg-alt)" />
              <div className="h-4 w-10 rounded animate-pulse bg-(--bg-alt)" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

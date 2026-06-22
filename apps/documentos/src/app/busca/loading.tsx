import { PublicNav } from "../../components/public-nav";
import { SearchResultsSkeleton } from "../../components/search-results-skeleton";

export default function BuscaLoading() {
  return (
    <>
      <PublicNav />

      <main className="docs-page-narrow">
        {/* Breadcrumb skeleton */}
        <nav className="docs-breadcrumbs" aria-label="Navegação estrutural">
          <div className="h-3 w-10 rounded animate-pulse bg-(--bg-alt)" />
          <div className="h-3 w-3 rounded animate-pulse bg-(--bg-alt)" />
          <div className="h-3 w-10 rounded animate-pulse bg-(--bg-alt)" />
        </nav>

        {/* Header skeleton */}
        <div style={{ marginBottom: 28 }}>
          <div className="h-3 w-28 rounded-full animate-pulse bg-(--bg-alt) mb-3" />
          <div className="h-10 w-3/4 rounded animate-pulse bg-(--bg-alt) mb-2" />
          <div className="h-4 w-48 rounded animate-pulse bg-(--bg-alt)" />
        </div>

        {/* Search field skeleton */}
        <div
          className="hb-field"
          style={{ fontSize: 15, marginBottom: 16, pointerEvents: "none" }}
        >
          <div className="h-4 w-4 rounded animate-pulse bg-(--bg-alt)" />
          <div
            className="animate-pulse bg-(--bg-alt) rounded"
            style={{ flex: 1, height: 20 }}
          />
          <div
            className="animate-pulse bg-(--bg-alt) rounded-full"
            style={{ height: 32, width: 72 }}
          />
        </div>

        {/* Type filter chips skeleton */}
        <div className="hb-chip-row" style={{ marginBottom: 20 }}>
          {[64, 80, 96].map((w, i) => (
            <div
              key={i}
              className="animate-pulse bg-(--bg-alt) rounded-full"
              style={{ height: 30, width: w }}
            />
          ))}
        </div>

        {/* Category filter skeleton */}
        <div
          className="hb-card"
          style={{ padding: "18px 22px", marginBottom: 20 }}
        >
          <div className="h-3 w-20 rounded animate-pulse bg-(--bg-alt) mb-3" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[48, 80, 96, 72, 64, 88].map((w, i) => (
              <div
                key={i}
                className="animate-pulse bg-(--bg-alt) rounded-full"
                style={{ height: 28, width: w }}
              />
            ))}
          </div>
        </div>

        {/* Results skeleton */}
        <SearchResultsSkeleton count={5} />
      </main>
    </>
  );
}

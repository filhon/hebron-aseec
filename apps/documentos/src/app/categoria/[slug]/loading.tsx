import { PublicNav } from "../../../components/public-nav";
import { DocumentCardSkeleton } from "../../../components/document-card-skeleton";

export default function CategoriaLoading() {
  return (
    <>
      <PublicNav />

      <main className="docs-page">
        {/* Breadcrumb skeleton */}
        <nav className="docs-breadcrumbs" aria-label="Navegação estrutural">
          <div className="h-3 w-10 rounded animate-pulse bg-(--bg-alt)" />
          <div className="h-3 w-3 rounded animate-pulse bg-(--bg-alt)" />
          <div className="h-3 w-16 rounded animate-pulse bg-(--bg-alt)" />
          <div className="h-3 w-3 rounded animate-pulse bg-(--bg-alt)" />
          <div className="h-3 w-24 rounded animate-pulse bg-(--bg-alt)" />
        </nav>

        {/* Header skeleton */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div
            className="animate-pulse bg-(--bg-alt)"
            style={{ width: 56, height: 56, borderRadius: 14, flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div className="h-3 w-20 rounded-full animate-pulse bg-(--bg-alt) mb-3" />
            <div className="h-9 w-1/2 rounded animate-pulse bg-(--bg-alt) mb-2" />
            <div className="h-4 w-56 rounded animate-pulse bg-(--bg-alt)" />
          </div>
        </div>

        {/* Chip rows skeleton */}
        <div className="hb-chip-row" style={{ marginBottom: 12 }}>
          {[64, 88, 76].map((w, i) => (
            <div
              key={i}
              className="animate-pulse bg-(--bg-alt) rounded-full"
              style={{ height: 30, width: w }}
            />
          ))}
        </div>
        <div className="hb-chip-row" style={{ marginBottom: 20 }}>
          {[120, 80, 80, 80].map((w, i) => (
            <div
              key={i}
              className="animate-pulse bg-(--bg-alt) rounded-full"
              style={{ height: 30, width: w }}
            />
          ))}
        </div>

        {/* Grid skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          <DocumentCardSkeleton />
          <DocumentCardSkeleton />
          <DocumentCardSkeleton />
          <DocumentCardSkeleton />
          <DocumentCardSkeleton />
          <DocumentCardSkeleton />
        </div>
      </main>
    </>
  );
}

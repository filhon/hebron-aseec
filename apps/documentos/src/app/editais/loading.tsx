import { PublicNav } from "../../components/public-nav";
import { EditalCardSkeleton } from "../../components/document-card-skeleton";

export default function EditaisLoading() {
  return (
    <>
      <PublicNav />

      <main className="docs-page">
        {/* Breadcrumb skeleton */}
        <nav className="docs-breadcrumbs" aria-label="Navegação estrutural">
          <div className="h-3 w-10 rounded animate-pulse bg-[--bg-alt]" />
          <div className="h-3 w-3 rounded animate-pulse bg-[--bg-alt]" />
          <div className="h-3 w-14 rounded animate-pulse bg-[--bg-alt]" />
        </nav>

        {/* Header skeleton */}
        <div style={{ marginBottom: 32 }}>
          <div className="h-3 w-32 rounded-full animate-pulse bg-[--bg-alt] mb-3" />
          <div className="h-11 w-3/4 rounded animate-pulse bg-[--bg-alt] mb-2" />
          <div className="h-11 w-1/2 rounded animate-pulse bg-[--bg-alt] mb-3" />
          <div className="h-4 w-full max-w-lg rounded animate-pulse bg-[--bg-alt] mb-1" />
          <div className="h-4 w-2/3 max-w-lg rounded animate-pulse bg-[--bg-alt]" />
        </div>

        {/* Filter chips skeleton */}
        <div className="hb-chip-row" style={{ marginBottom: 24 }}>
          {[72, 88, 80, 72].map((w, i) => (
            <div
              key={i}
              className="animate-pulse bg-[--bg-alt] rounded-full"
              style={{ height: 30, width: w }}
            />
          ))}
        </div>

        {/* Edital grid skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
            gap: 18,
          }}
        >
          <EditalCardSkeleton />
          <EditalCardSkeleton />
          <EditalCardSkeleton />
          <EditalCardSkeleton />
        </div>
      </main>
    </>
  );
}

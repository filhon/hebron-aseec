import { ChevronRight } from "lucide-react";
import { PublicNav } from "../../components/public-nav";
import { DocumentViewerSkeleton } from "../../components/document-viewer-skeleton";

export default function DocumentLoading() {
  return (
    <>
      <PublicNav />

      <main className="docs-page">
        {/* Breadcrumb skeleton */}
        <nav className="docs-breadcrumbs" aria-label="Navegação estrutural">
          <div className="h-3 w-10 rounded animate-pulse bg-(--bg-alt)" />
          <ChevronRight
            size={12}
            className="docs-breadcrumbs-sep"
            aria-hidden="true"
          />
          <div className="h-3 w-20 rounded animate-pulse bg-(--bg-alt)" />
          <ChevronRight
            size={12}
            className="docs-breadcrumbs-sep"
            aria-hidden="true"
          />
          <div className="h-3 w-40 rounded animate-pulse bg-(--bg-alt)" />
        </nav>

        <div className="docs-doc-layout">
          {/* Main column */}
          <div style={{ minWidth: 0 }}>
            {/* Header card skeleton */}
            <div
              className="hb-card"
              style={{ padding: "32px 36px", marginBottom: 20 }}
            >
              {/* Badge row */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                <div className="h-5 w-16 rounded-full animate-pulse bg-(--bg-alt)" />
                <div className="h-5 w-28 rounded-full animate-pulse bg-(--bg-alt)" />
                <div className="h-5 w-16 rounded-full animate-pulse bg-(--bg-alt)" />
                <div className="h-5 w-20 rounded-full animate-pulse bg-(--bg-alt) ml-auto" />
              </div>
              {/* Title */}
              <div className="h-10 w-4/5 rounded animate-pulse bg-(--bg-alt) mb-2" />
              <div className="h-10 w-3/5 rounded animate-pulse bg-(--bg-alt) mb-4" />
              {/* Description */}
              <div className="h-4 w-full rounded animate-pulse bg-(--bg-alt) mb-2" />
              <div className="h-4 w-2/3 rounded animate-pulse bg-(--bg-alt) mb-5" />
              {/* Action */}
              <div className="h-9 w-44 rounded-full animate-pulse bg-(--bg-alt)" />
            </div>

            {/* Viewer skeleton */}
            <DocumentViewerSkeleton />
          </div>

          {/* Aside skeleton */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Metadata card */}
            <div className="hb-card" style={{ padding: "20px 22px" }}>
              <div className="h-3 w-20 rounded-full animate-pulse bg-(--bg-alt) mb-4" />
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {[80, 56, 72, 64].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div className="h-3 w-20 rounded animate-pulse bg-(--bg-alt)" />
                    <div
                      className="h-3 rounded animate-pulse bg-(--bg-alt)"
                      style={{ width: w }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Tags card */}
            <div className="hb-card" style={{ padding: "20px 22px" }}>
              <div className="h-3 w-10 rounded-full animate-pulse bg-(--bg-alt) mb-4" />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <div className="h-5 w-14 rounded-full animate-pulse bg-(--bg-alt)" />
                <div className="h-5 w-20 rounded-full animate-pulse bg-(--bg-alt)" />
                <div className="h-5 w-12 rounded-full animate-pulse bg-(--bg-alt)" />
              </div>
            </div>

            {/* Version history card */}
            <div className="hb-card" style={{ padding: "20px 22px" }}>
              <div className="h-3 w-32 rounded-full animate-pulse bg-(--bg-alt) mb-4" />
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {[1].map((i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div className="h-6 w-6 rounded-full animate-pulse bg-(--bg-alt)" />
                    <div style={{ flex: 1 }}>
                      <div className="h-3 w-12 rounded animate-pulse bg-(--bg-alt) mb-1" />
                      <div className="h-3 w-24 rounded animate-pulse bg-(--bg-alt)" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

import { PublicNav } from "../components/public-nav";
import {
  DocumentCardSkeleton,
  DocumentListSkeleton,
  EditalCardSkeleton,
} from "../components/document-card-skeleton";

export default function HomeLoading() {
  return (
    <>
      <PublicNav />

      {/* Hero skeleton */}
      <div
        style={{
          background: "var(--hb-blue)",
          padding: "72px 36px 64px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            className="h-3 w-40 rounded-full animate-pulse mb-4"
            style={{ background: "rgba(255,255,255,0.18)" }}
          />
          <div
            className="h-14 w-2/3 rounded animate-pulse mb-3"
            style={{ background: "rgba(255,255,255,0.14)" }}
          />
          <div
            className="h-14 w-1/2 rounded animate-pulse mb-5"
            style={{ background: "rgba(255,255,255,0.10)" }}
          />
          <div
            className="h-5 w-3/4 rounded animate-pulse mb-2"
            style={{ background: "rgba(255,255,255,0.10)" }}
          />
          <div
            className="h-5 w-1/2 rounded animate-pulse mb-8"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div style={{ display: "flex", gap: 12 }}>
            <div
              className="h-10 w-36 rounded-full animate-pulse"
              style={{ background: "rgba(255,255,255,0.18)" }}
            />
            <div
              className="h-10 w-36 rounded-full animate-pulse"
              style={{ background: "rgba(255,255,255,0.10)" }}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 32,
              flexWrap: "wrap",
              marginTop: 48,
              paddingTop: 32,
              borderTop: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div
                  className="h-9 w-12 rounded animate-pulse mb-2"
                  style={{ background: "rgba(255,255,255,0.16)" }}
                />
                <div
                  className="h-3 w-24 rounded animate-pulse"
                  style={{ background: "rgba(255,255,255,0.10)" }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="docs-page">
        {/* Editais skeleton */}
        <section className="docs-section">
          <div className="docs-section-head">
            <div className="left">
              <div className="h-3 w-28 rounded-full animate-pulse bg-[--bg-alt] mb-2" />
              <div className="h-6 w-56 rounded animate-pulse bg-[--bg-alt]" />
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 18,
            }}
          >
            <EditalCardSkeleton />
            <EditalCardSkeleton />
          </div>
        </section>

        {/* Two-col skeleton */}
        <div className="docs-two-col">
          {/* Doc list skeleton */}
          <section>
            <div className="docs-section-head">
              <div className="left">
                <div className="h-3 w-28 rounded-full animate-pulse bg-[--bg-alt] mb-2" />
                <div className="h-6 w-40 rounded animate-pulse bg-[--bg-alt]" />
              </div>
            </div>
            <DocumentListSkeleton rows={6} />
          </section>

          {/* Category grid skeleton */}
          <section>
            <div className="docs-section-head">
              <div className="left">
                <div className="h-3 w-20 rounded-full animate-pulse bg-[--bg-alt] mb-2" />
                <div className="h-6 w-36 rounded animate-pulse bg-[--bg-alt]" />
              </div>
            </div>
            <div className="docs-cat-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="docs-cat-card"
                  style={{ pointerEvents: "none" }}
                >
                  <div
                    className="docs-cat-icon animate-pulse bg-[--bg-alt]"
                    style={{ border: "none" }}
                  />
                  <div className="h-3.5 w-24 rounded animate-pulse bg-[--bg-alt]" />
                  <div className="h-3 w-16 rounded animate-pulse bg-[--bg-alt]" />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Card grid skeleton */}
        <section className="docs-section">
          <div className="docs-section-head">
            <div className="left">
              <div className="h-3 w-24 rounded-full animate-pulse bg-[--bg-alt] mb-2" />
              <div className="h-6 w-48 rounded animate-pulse bg-[--bg-alt]" />
            </div>
          </div>
          <div
            className="hb-grid"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            }}
          >
            <DocumentCardSkeleton />
            <DocumentCardSkeleton />
            <DocumentCardSkeleton />
          </div>
        </section>
      </main>
    </>
  );
}

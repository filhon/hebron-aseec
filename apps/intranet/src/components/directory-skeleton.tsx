function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-xs ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

function DirectoryCardSkeleton() {
  return (
    <div
      className="hb-card hb-card-padded"
      style={{ display: "flex", gap: 14 }}
      aria-hidden="true"
    >
      <Bone className="h-11 w-11 shrink-0 rounded-full" />
      <div
        style={{
          minWidth: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <Bone className="h-3.5 w-32" />
        <Bone className="h-4 w-20 rounded-full" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginTop: 2,
          }}
        >
          <Bone className="h-3 w-36" />
          <Bone className="h-3 w-28" />
        </div>
      </div>
    </div>
  );
}

export interface DirectorySkeletonProps {
  count?: number;
}

export function DirectorySkeleton({ count = 6 }: DirectorySkeletonProps) {
  return (
    <div className="hb-grid hb-grid-3" aria-label="Carregando diretório">
      {Array.from({ length: count }).map((_, i) => (
        <DirectoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

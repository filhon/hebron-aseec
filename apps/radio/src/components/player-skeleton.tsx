function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} />;
}

/** Placeholder de carregamento do card "Tocando agora" da home — mesma
 * moldura escura do painel real (`page.tsx`), com disco, título/autor e
 * barra de progresso simulados. */
export function PlayerSkeleton() {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className="w-full max-w-sm rounded-(--radius-lg) border border-white/10 bg-white/5 p-6"
    >
      <Bone className="h-2.5 w-28" />

      <div className="mt-4 flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-white/10" />
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className="h-3.5 w-4/5" />
          <Bone className="h-3 w-3/5" />
        </div>
      </div>

      <Bone className="mt-4 h-1 w-full rounded-(--radius-pill)" />
      <div className="mt-1.5 flex justify-between">
        <Bone className="h-2.5 w-8" />
        <Bone className="h-2.5 w-8" />
      </div>
    </div>
  );
}

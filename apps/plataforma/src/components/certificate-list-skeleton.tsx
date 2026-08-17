function Bone({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded bg-(--surface-alt) ${className}`} />
  );
}

/** Placeholder de carregamento com a mesma estrutura de `CertificateCard` —
 * ícone, título, dados de emissão, código de verificação e ações. */
export function CertificateCardSkeleton() {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className="flex flex-col gap-4 rounded-md border border-(--border) bg-(--surface) p-5"
    >
      <div className="flex items-start gap-3.5">
        <Bone className="h-11 w-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Bone className="h-2.5 w-32" />
          <Bone className="h-4 w-4/5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Bone className="h-2.5 w-20" />
          <Bone className="h-3.5 w-24" />
        </div>
        <div className="space-y-1.5">
          <Bone className="h-2.5 w-20" />
          <Bone className="h-3.5 w-20" />
        </div>
      </div>

      <Bone className="h-8 w-full rounded-sm" />

      <div className="flex items-center gap-2">
        <Bone className="h-8 w-36 rounded-sm" />
        <Bone className="h-3.5 w-20" />
      </div>
    </div>
  );
}

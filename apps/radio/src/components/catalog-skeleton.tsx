function Bone({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded bg-(--surface-alt) ${className}`} />
  );
}

/** Placeholder de carregamento do grid de autores (`AuthorCard`) — avatar,
 * nome, bio e lista de séries. */
export function CatalogSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-(--radius-md) border border-(--border) bg-(--surface) p-5"
        >
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-(--surface-alt)" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bone className="h-4 w-3/4" />
              <Bone className="h-3 w-full" />
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-(--divider) pt-2">
            <Bone className="h-3 w-2/3" />
            <Bone className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Placeholder de carregamento da lista de materiais exclusivos
 * (`MaterialCard`) — ainda sem tela consumidora dentro do escopo de
 * Arquivos permitidos deste prompt (`materiais/page.tsx` fora da lista).
 * Fica pronto para consumo quando a integração trocar mocks por dados reais
 * (mesmo padrão de componente órfão registrado em P-4.5/P-6.5). */
export function MaterialListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div role="presentation" aria-hidden="true" className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-(--radius-md) border border-(--border) bg-(--surface) p-4"
        >
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-(--radius) bg-(--surface-alt)" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className="h-3.5 w-2/3" />
            <Bone className="h-3 w-1/3" />
          </div>
          <Bone className="h-8 w-24 rounded-(--radius)" />
        </div>
      ))}
    </div>
  );
}

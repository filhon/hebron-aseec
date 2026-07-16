function Bone({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded bg-(--surface-alt) ${className}`} />
  );
}

/** Placeholder de carregamento com a mesma estrutura de `AvailabilityCalendar`
 * (faixa de datas, 2 linhas de unidade com timeline, legenda) e da lista de
 * próximas estadias confirmadas abaixo dele. */
export function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div
        role="presentation"
        aria-hidden="true"
        className="rounded-(--radius) border border-(--border) bg-(--surface) p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <Bone className="h-3 w-14" />
          <Bone className="h-3 w-14" />
        </div>

        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-1.5 sm:flex-row sm:items-center"
            >
              <div className="w-full shrink-0 sm:w-32">
                <Bone className="h-4 w-20" />
              </div>
              <Bone className="h-9 w-full rounded-(--radius-sm)" />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-(--divider) pt-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Bone className="h-2 w-2 rounded-full" />
              <Bone className="h-2.5 w-16" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Bone className="h-5 w-56" />
        <div
          role="presentation"
          aria-hidden="true"
          className="flex flex-col divide-y divide-(--divider) rounded-(--radius) border border-(--border) bg-(--surface)"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <Bone className="h-3.5 w-32" />
                <Bone className="h-3 w-24" />
              </div>
              <Bone className="h-3 w-20 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

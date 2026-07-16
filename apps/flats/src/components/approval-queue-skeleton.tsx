function Bone({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded bg-(--surface-alt) ${className}`} />
  );
}

/** Placeholder de carregamento com a mesma estrutura de `ApprovalQueue` —
 * posição, avatar, nome/motivo, pontuação e ações de aprovar/rejeitar.
 * Ainda não conectado a uma tela (ver SESSIONS.md, P-7.5): a página que a
 * consome, `admin/aprovacao/page.tsx`, não está na lista de arquivos
 * permitidos deste prompt. Fica pronto para P-7.9. */
export function ApprovalQueueSkeleton() {
  return (
    <div role="presentation" aria-hidden="true" className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-(--radius) border border-(--border) bg-(--surface) p-4"
        >
          <div className="flex items-center gap-3">
            <Bone className="h-7 w-7 shrink-0 rounded-full" />
            <Bone className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Bone className="h-3.5 w-32" />
              <Bone className="h-3 w-44" />
            </div>
            <Bone className="h-5 w-10 shrink-0" />
          </div>

          <div className="flex gap-2 border-t border-(--divider) pt-3">
            <Bone className="h-8 flex-1 rounded-(--radius)" />
            <Bone className="h-8 flex-1 rounded-(--radius)" />
          </div>
        </div>
      ))}
    </div>
  );
}

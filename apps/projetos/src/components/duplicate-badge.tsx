import Link from "next/link";
import { Copy } from "lucide-react";

// Detecção de duplicidade via embeddings (P-2.14, BRAIN §6.2/§8, PATCH-012):
// sinaliza — nunca bloqueia nem decide — quando o conteúdo de um projeto é
// muito similar a outro já submetido (qualquer organização). Visível apenas
// a diretor/conselheiro/super_admin, mesma regra de score_ai (nunca ao
// submissor). A decisão de tratar como duplicata de fato é sempre da
// diretoria em validacao/votacao.

export interface DuplicateCandidate {
  projectId: string;
  title: string;
  orgName: string;
  /** Similaridade de cosseno no momento da submissão, 0–1 */
  similarity: number;
}

export function DuplicateBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${className ?? ""}`}
      style={{
        backgroundColor: "var(--color-warning-muted)",
        color: "var(--color-warning)",
      }}
      title="Possível duplicata — conteúdo similar a outro projeto já submetido"
    >
      <Copy className="w-3 h-3" aria-hidden />
      Possível duplicata
    </span>
  );
}

export function DuplicateCandidatesPanel({
  candidates,
}: {
  candidates: DuplicateCandidate[];
}) {
  if (candidates.length === 0) return null;

  return (
    <div
      className="rounded-md px-4 py-4"
      style={{
        backgroundColor: "var(--color-warning-muted)",
        border: "1px solid var(--color-warning)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Copy
          className="w-3.5 h-3.5"
          style={{ color: "var(--color-warning)" }}
          aria-hidden
        />
        <p
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--color-warning)" }}
        >
          Possíveis duplicatas ({candidates.length})
        </p>
      </div>
      <p className="text-xs text-(--fg-muted) mb-3">
        Conteúdo similar a projetos já submetidos, de qualquer organização. Isto
        não bloqueia o projeto — a decisão é sempre da diretoria.
      </p>
      <div className="flex flex-col gap-2">
        {candidates.map((c) => (
          <Link
            key={c.projectId}
            href={`/pipeline/${c.projectId}`}
            className="flex items-center justify-between gap-3 rounded-sm bg-(--surface) border border-(--border) px-3 py-2 text-xs hover:border-(--hb-blue) transition-colors"
          >
            <span className="min-w-0">
              <span className="block font-semibold text-(--fg) truncate">
                {c.title}
              </span>
              <span className="block text-(--fg-muted) truncate">
                {c.orgName}
              </span>
            </span>
            <span
              className="shrink-0 font-bold tabular-nums"
              style={{ color: "var(--color-warning)" }}
            >
              {Math.round(c.similarity * 100)}%
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

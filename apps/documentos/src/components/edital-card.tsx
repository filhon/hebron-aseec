import type { Edital } from "@hebron/types/documentos";
import { CalendarDays, ExternalLink, Folder } from "lucide-react";
import Link from "next/link";
import {
  EDITAL_STATUS,
  EditalStatusPill,
  resolveEditalStatus,
} from "./edital-status-pill";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function buildSubmitUrl(edital: Edital, projetosBaseUrl: string): string {
  const params = new URLSearchParams();
  params.set("edital", edital.id);
  if (edital.projectType) params.set("tipo", edital.projectType);
  if (edital.projectCategory) params.set("categoria", edital.projectCategory);
  return `${projetosBaseUrl}/novo?${params.toString()}`;
}

export interface EditalCardProps {
  edital: Edital;
  href: string;
  projetosBaseUrl?: string;
  className?: string;
}

export function EditalCard({
  edital,
  href,
  projetosBaseUrl = "https://projetos.hebronaseec.com.br",
  className = "",
}: EditalCardProps) {
  const status = resolveEditalStatus(edital);
  const cfg = EDITAL_STATUS[status];
  const isSubmittable =
    status === "open" || status === "closing_soon" || status === "permanent";
  const submitUrl = buildSubmitUrl(edital, projetosBaseUrl);

  return (
    <article
      className={`hb-card hb-card-overflow flex flex-col transition-all duration-(--dur-fast) hover:border-(--brand) hover:shadow-(--shadow-md) ${className}`}
    >
      {/* Status stripe */}
      <div className="h-0.75" style={{ backgroundColor: cfg.dotColor }} />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Header: category + status */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-(--fg-muted) text-[11.5px] font-medium min-w-0">
            <Folder size={12} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{edital.category.name}</span>
          </span>

          <EditalStatusPill status={status} className="shrink-0" />
        </div>

        {/* Title */}
        <Link
          href={href}
          className="font-(--font-display) text-[15px] leading-tight tracking-[-0.01em] text-(--fg) hover:text-(--brand) transition-colors duration-(--dur-fast) no-underline line-clamp-2"
        >
          {edital.title}
        </Link>

        {/* Description */}
        {edital.description && (
          <p className="text-(--fg-muted) text-[13px] leading-[1.55] line-clamp-2 flex-1">
            {edital.description}
          </p>
        )}

        {/* Tags */}
        {edital.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {edital.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-(--bg-alt) text-(--fg-muted) border border-(--border)"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Schedule */}
        {edital.cycleType === "anual" &&
          (edital.opensAt ?? edital.closesAt) && (
            <div className="flex flex-col gap-1.5 p-3 rounded-sm bg-(--bg-alt) border border-(--border)">
              <span className="hb-section-label mb-0">Cronograma</span>
              <div className="flex flex-wrap gap-3 text-[12.5px] text-(--fg-muted)">
                {edital.opensAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={12} aria-hidden="true" />
                    Abertura:{" "}
                    <strong className="text-(--fg) font-semibold">
                      {formatDate(edital.opensAt)}
                    </strong>
                  </span>
                )}
                {edital.closesAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={12} aria-hidden="true" />
                    Encerramento:{" "}
                    <strong className="text-(--fg) font-semibold">
                      {formatDate(edital.closesAt)}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          )}

        {/* CTA */}
        <div className="pt-3 mt-auto border-t border-(--divider)">
          {isSubmittable ? (
            <a
              href={submitUrl}
              className="hb-btn hb-btn-accent w-full justify-center"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={14} aria-hidden="true" />
              Submeter Projeto
            </a>
          ) : (
            <Link
              href={href}
              className="hb-btn hb-btn-secondary w-full justify-center"
            >
              Ver Edital
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

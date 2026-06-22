"use client";

import type { CompactProjectView, ProjectStage } from "@hebron/types";

function cn(...cls: (string | undefined | false | null)[]): string {
  return cls.filter(Boolean).join(" ");
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

type StageMeta = { label: string; pill: string; bar: string };

const STAGE: Record<ProjectStage, StageMeta> = {
  rascunho: {
    label: "Rascunho",
    pill: "border border-(--border) text-(--hb-gray-400)",
    bar: "var(--hb-gray-200)",
  },
  validacao: {
    label: "Validação",
    pill: "bg-(--hb-cyan-muted) text-(--hb-cyan-darker)",
    bar: "var(--hb-cyan)",
  },
  votacao: {
    label: "Votação",
    pill: "bg-(--brand-muted) text-(--brand)",
    bar: "var(--hb-blue)",
  },
  homologacao: {
    label: "Homologação",
    pill: "bg-(--hb-orange-muted) text-(--hb-orange-deep)",
    bar: "var(--hb-orange)",
  },
  aprovado: {
    label: "Aprovado",
    pill: "bg-(--hb-green-muted) text-(--hb-green-fg)",
    bar: "var(--hb-green)",
  },
  reprovado: {
    label: "Reprovado",
    pill: "bg-(--color-destructive-muted) text-(--color-destructive)",
    bar: "var(--color-destructive)",
  },
  em_execucao: {
    label: "Em Execução",
    pill: "bg-(--hb-cyan-muted) text-(--hb-cyan-fg)",
    bar: "var(--hb-cyan-deep)",
  },
  concluido: {
    label: "Concluído",
    pill: "bg-(--hb-green-muted) text-(--hb-green-fg)",
    bar: "var(--hb-green-deep)",
  },
  cancelado: {
    label: "Cancelado",
    pill: "bg-(--color-destructive-muted) text-(--hb-red-deep)",
    bar: "var(--hb-red)",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  evangelismo: "Evangelismo",
  missoes_transculturais: "Missões Transculturais",
  educacao_crista: "Educação Cristã",
  assistencia_social: "Assistência Social",
  saude: "Saúde",
  capacitacao_lideranca: "Liderança",
  infraestrutura_ministerial: "Infraestrutura",
  plantacao_de_igrejas: "Plantação de Igrejas",
  discipulado: "Discipulado",
  outros: "Outros",
};

function scoreColor(score: number): string {
  if (score >= 80) return "var(--hb-green)";
  if (score >= 60) return "var(--hb-cyan)";
  if (score >= 40) return "var(--hb-orange)";
  return "var(--hb-red)";
}

export interface ProjectCardProps {
  project: CompactProjectView;
  onClick?: () => void;
  selected?: boolean;
  showAiScore?: boolean;
  className?: string;
}

export function ProjectCard({
  project,
  onClick,
  selected = false,
  showAiScore = false,
  className,
}: ProjectCardProps) {
  const meta = STAGE[project.stage];
  const isInteractive = onClick !== undefined;

  return (
    <article
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "relative flex overflow-hidden rounded-md",
        "bg-(--surface) border border-(--border) shadow-(--shadow-sm)",
        "transition-all duration-(--dur-fast)",
        isInteractive &&
          "cursor-pointer hover:shadow-(--shadow-md) hover:border-(--hb-blue)",
        selected && "border-(--brand) ring-2 ring-(--brand) ring-offset-1",
        className,
      )}
    >
      {/* Stage color accent */}
      <div
        className="w-0.75 shrink-0"
        style={{ backgroundColor: meta.bar }}
        aria-hidden
      />

      <div className="flex flex-1 flex-col gap-3 p-4 min-w-0">
        {/* Title + stage badge */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="flex-1 min-w-0 text-lg font-semibold text-(--fg) leading-snug line-clamp-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {project.titulo}
          </h3>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5",
              "text-xs font-semibold whitespace-nowrap",
              meta.pill,
            )}
          >
            {meta.label}
          </span>
        </div>

        {/* Organization + category */}
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="text-sm text-(--fg) font-medium truncate">
            {project.organizacaoNome}
          </span>
          <span className="text-(--fg-subtle)" aria-hidden>
            ·
          </span>
          <span className="text-sm text-(--fg-muted)">
            {CATEGORY_LABELS[project.categoria] ?? project.categoria}
          </span>
        </div>

        {/* AI Score bar */}
        {showAiScore && project.aiScore !== null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-(--fg-muted) shrink-0 font-medium">
              Score IA
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-(--hb-gray-100) overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${project.aiScore}%`,
                  backgroundColor: scoreColor(project.aiScore),
                  transition: "width var(--dur-slow) var(--ease-out)",
                }}
              />
            </div>
            <span
              className="text-xs font-bold tabular-nums shrink-0 w-6 text-right"
              style={{ color: scoreColor(project.aiScore) }}
            >
              {project.aiScore}
            </span>
          </div>
        )}

        {/* Footer: value + type + warnings */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-(--border) mt-auto">
          <span className="text-sm font-semibold text-(--fg) tabular-nums">
            {BRL.format(project.valorTotal)}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={
                project.type === "anual"
                  ? {
                      backgroundColor: "var(--brand-muted)",
                      color: "var(--brand)",
                    }
                  : {
                      backgroundColor: "#ede8f8",
                      color: "var(--hb-purple)",
                    }
              }
            >
              {project.type === "anual" ? "Anual" : "Pontual"}
            </span>

            {project.pendingReports > 0 && (
              <span className="text-xs font-semibold text-(--color-destructive)">
                {project.pendingReports}{" "}
                {project.pendingReports === 1
                  ? "relatório pendente"
                  : "relatórios pendentes"}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

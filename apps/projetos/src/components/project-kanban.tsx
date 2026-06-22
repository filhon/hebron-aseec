"use client";

import { useState, useRef } from "react";
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

// Active pipeline stages shown as columns (cancelado/reprovado are in a separate group)
const PIPELINE_STAGES: ProjectStage[] = [
  "rascunho",
  "validacao",
  "votacao",
  "homologacao",
  "aprovado",
  "em_execucao",
  "concluido",
];

const CLOSED_STAGES: ProjectStage[] = ["reprovado", "cancelado"];

type StageConfig = {
  label: string;
  color: string;
  bg: string;
  headerBg: string;
};

const STAGE_CFG: Record<ProjectStage, StageConfig> = {
  rascunho: {
    label: "Rascunho",
    color: "var(--hb-gray-400)",
    bg: "var(--hb-gray-50)",
    headerBg: "var(--hb-gray-100)",
  },
  validacao: {
    label: "Validação",
    color: "var(--hb-cyan-deep)",
    bg: "var(--hb-cyan-muted)",
    headerBg: "var(--hb-cyan-muted)",
  },
  votacao: {
    label: "Votação",
    color: "var(--hb-blue)",
    bg: "var(--brand-muted)",
    headerBg: "var(--brand-muted)",
  },
  homologacao: {
    label: "Homologação",
    color: "var(--hb-orange-deep)",
    bg: "var(--hb-orange-muted)",
    headerBg: "var(--hb-orange-muted)",
  },
  aprovado: {
    label: "Aprovado",
    color: "var(--hb-green-deep)",
    bg: "var(--hb-green-muted)",
    headerBg: "var(--hb-green-muted)",
  },
  reprovado: {
    label: "Reprovado",
    color: "var(--color-destructive)",
    bg: "var(--color-destructive-muted)",
    headerBg: "var(--color-destructive-muted)",
  },
  em_execucao: {
    label: "Em Execução",
    color: "var(--hb-cyan-fg)",
    bg: "var(--hb-cyan-muted)",
    headerBg: "var(--hb-cyan-muted)",
  },
  concluido: {
    label: "Concluído",
    color: "var(--hb-green-fg)",
    bg: "var(--hb-green-muted)",
    headerBg: "var(--hb-green-muted)",
  },
  cancelado: {
    label: "Cancelado",
    color: "var(--hb-red-deep)",
    bg: "var(--color-destructive-muted)",
    headerBg: "var(--color-destructive-muted)",
  },
};

const CATEGORY_SHORT: Record<string, string> = {
  evangelismo: "Evangelismo",
  missoes_transculturais: "Missões",
  educacao_crista: "Educação",
  assistencia_social: "Assistência",
  saude: "Saúde",
  capacitacao_lideranca: "Liderança",
  infraestrutura_ministerial: "Infra",
  plantacao_de_igrejas: "Plantação",
  discipulado: "Discipulado",
  outros: "Outros",
};

// Mini card for kanban columns
interface KanbanCardProps {
  project: CompactProjectView;
  draggable: boolean;
  isDragging: boolean;
  onClick?: () => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

function KanbanCard({
  project,
  draggable,
  isDragging,
  onClick,
  onDragStart,
  onDragEnd,
}: KanbanCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      draggable={draggable}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", project.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(project.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-sm bg-(--surface) border border-(--border) p-3 shadow-(--shadow-xs)",
        "transition-all duration-(--dur-fast)",
        (draggable || onClick) &&
          "cursor-pointer hover:shadow-(--shadow-sm) hover:border-(--hb-blue)",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40 scale-95",
      )}
    >
      <p className="text-sm font-semibold text-(--fg) line-clamp-2 leading-snug mb-1.5">
        {project.titulo}
      </p>
      <p className="text-xs text-(--fg-muted) truncate mb-2">
        {project.organizacaoNome}
      </p>
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-semibold text-(--fg) tabular-nums">
          {BRL.format(project.valorTotal)}
        </span>
        <span className="text-xs text-(--fg-subtle)">
          {CATEGORY_SHORT[project.categoria] ?? ""}
        </span>
      </div>
      {project.pendingReports > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-(--color-destructive)">
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden
          >
            <circle
              cx="5"
              cy="5"
              r="4"
              stroke="currentColor"
              strokeWidth="1.25"
            />
            <path
              d="M5 3v2.5M5 7v.25"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </svg>
          {project.pendingReports} pendente
          {project.pendingReports > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

// Kanban column
interface KanbanColumnProps {
  stage: ProjectStage;
  projects: CompactProjectView[];
  canDrag: boolean;
  isDragTarget: boolean;
  draggedId: string | null;
  onCardClick?: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (stage: ProjectStage) => void;
  onDragOver: (stage: ProjectStage) => void;
}

function KanbanColumn({
  stage,
  projects,
  canDrag,
  isDragTarget,
  draggedId,
  onCardClick,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
}: KanbanColumnProps) {
  const cfg = STAGE_CFG[stage];

  return (
    <div
      className={cn(
        "flex flex-col min-w-55 max-w-65 rounded-md border-2 transition-all duration-(--dur-fast)",
        isDragTarget ? "border-dashed" : "border-transparent",
      )}
      style={{
        borderColor: isDragTarget ? cfg.color : "transparent",
        backgroundColor: isDragTarget ? cfg.bg : "var(--surface-alt)",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(stage);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(stage);
      }}
    >
      {/* Column header */}
      <div
        className="rounded-t-[calc(var(--radius-md)-2px)] px-3 py-2.5 flex items-center justify-between gap-2"
        style={{ backgroundColor: cfg.headerBg }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: cfg.color }}
            aria-hidden
          />
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>
        <span
          className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center text-(--fg-invert)"
          style={{ backgroundColor: cfg.color }}
        >
          {projects.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-20 overflow-y-auto max-h-150">
        {projects.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-6">
            <p className="text-xs text-(--fg-subtle) text-center">
              {canDrag ? "Arraste projetos aqui" : "Nenhum projeto"}
            </p>
          </div>
        )}
        {projects.map((p) => (
          <KanbanCard
            key={p.id}
            project={p}
            draggable={canDrag}
            isDragging={draggedId === p.id}
            onClick={onCardClick ? () => onCardClick(p.id) : undefined}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

export interface ProjectKanbanProps {
  projects: CompactProjectView[];
  canDrag?: boolean;
  showClosed?: boolean;
  onMove?: (projectId: string, targetStage: ProjectStage) => void;
  onCardClick?: (projectId: string) => void;
  className?: string;
}

export function ProjectKanban({
  projects,
  canDrag = false,
  showClosed = false,
  onMove,
  onCardClick,
  className,
}: ProjectKanbanProps) {
  // Track per-project stage overrides (optimistic updates)
  const [positions, setPositions] = useState<Map<string, ProjectStage>>(() => {
    const m = new Map<string, ProjectStage>();
    for (const p of projects) m.set(p.id, p.stage);
    return m;
  });

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<ProjectStage | null>(null);
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function getProjectsFor(stage: ProjectStage): CompactProjectView[] {
    return projects.filter((p) => (positions.get(p.id) ?? p.stage) === stage);
  }

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverStage(null);
    if (dragTimer.current) clearTimeout(dragTimer.current);
  }

  function handleDragOver(stage: ProjectStage) {
    setDragOverStage(stage);
    // Clear previous debounce
    if (dragTimer.current) clearTimeout(dragTimer.current);
    dragTimer.current = setTimeout(() => setDragOverStage(null), 300);
  }

  function handleDrop(targetStage: ProjectStage) {
    if (draggedId === null) return;
    setPositions((prev) => {
      const next = new Map(prev);
      next.set(draggedId, targetStage);
      return next;
    });
    onMove?.(draggedId, targetStage);
    setDraggedId(null);
    setDragOverStage(null);
  }

  const columnProps = {
    canDrag,
    draggedId,
    onCardClick,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDrop: handleDrop,
    onDragOver: handleDragOver,
  };

  const closedProjects = showClosed
    ? CLOSED_STAGES.flatMap((s) => getProjectsFor(s))
    : [];

  return (
    <div className={`flex flex-col gap-4 ${className ?? ""}`}>
      {!canDrag && (
        <p className="text-xs text-(--fg-muted) px-1">
          Somente diretores podem mover projetos entre estágios.
        </p>
      )}

      {/* Pipeline columns — horizontal scroll */}
      <div
        className="flex gap-3 overflow-x-auto pb-3"
        style={{ scrollbarWidth: "thin" }}
        role="group"
        aria-label="Pipeline de projetos"
      >
        {PIPELINE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            projects={getProjectsFor(stage)}
            isDragTarget={dragOverStage === stage && draggedId !== null}
            {...columnProps}
          />
        ))}
      </div>

      {/* Closed projects section */}
      {showClosed && closedProjects.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-(--fg-muted) hover:text-(--fg) transition-colors select-none list-none flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
              className="transition-transform group-open:rotate-90"
            >
              <path
                d="M5 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Encerrados ({closedProjects.length})
          </summary>
          <div className="flex gap-3 overflow-x-auto pt-3 pb-2">
            {CLOSED_STAGES.map((stage) => {
              const stageProjects = getProjectsFor(stage);
              if (stageProjects.length === 0) return null;
              return (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  projects={stageProjects}
                  isDragTarget={false}
                  canDrag={false}
                  draggedId={null}
                  onCardClick={onCardClick}
                  onDragStart={() => undefined}
                  onDragEnd={() => undefined}
                  onDrop={() => undefined}
                  onDragOver={() => undefined}
                />
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}

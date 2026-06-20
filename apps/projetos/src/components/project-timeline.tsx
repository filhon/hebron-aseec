import type { ProjectVersion, ProjectStage } from "@hebron/types";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const STAGE_LABELS: Record<ProjectStage, string> = {
  rascunho: "Rascunho",
  validacao: "Validação",
  votacao: "Votação",
  homologacao: "Homologação",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  em_execucao: "Em Execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STAGE_COLORS: Record<ProjectStage, string> = {
  rascunho: "var(--hb-gray-400)",
  validacao: "var(--hb-cyan)",
  votacao: "var(--hb-blue)",
  homologacao: "var(--hb-orange)",
  aprovado: "var(--hb-green)",
  reprovado: "var(--color-destructive)",
  em_execucao: "var(--hb-cyan-deep)",
  concluido: "var(--hb-green-deep)",
  cancelado: "var(--hb-red)",
};

interface TimelineEvent {
  id: string;
  stage: ProjectStage;
  label: string;
  detail: string;
  date: Date;
  actor: string;
  notes: string | null;
  isCurrent: boolean;
}

function buildEvents(
  versions: ProjectVersion[],
  currentStage: ProjectStage,
  createdAt: Date,
  createdByName: string,
): TimelineEvent[] {
  const sorted = [...versions].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const events: TimelineEvent[] = [
    {
      id: "created",
      stage: "rascunho",
      label: "Projeto criado",
      detail: STAGE_LABELS["rascunho"],
      date: createdAt,
      actor: createdByName,
      notes: null,
      isCurrent: sorted.length === 0 && currentStage === "rascunho",
    },
    ...sorted.map((v, idx) => ({
      id: v.id,
      stage: v.stage,
      label: `Transição para ${STAGE_LABELS[v.stage]}`,
      detail: STAGE_LABELS[v.stage],
      date: v.createdAt,
      actor: v.createdByName,
      notes: v.notes,
      isCurrent: idx === sorted.length - 1,
    })),
  ];

  return events;
}

export interface ProjectTimelineProps {
  versions: ProjectVersion[];
  currentStage: ProjectStage;
  createdAt: Date;
  createdByName: string;
  className?: string;
}

export function ProjectTimeline({
  versions,
  currentStage,
  createdAt,
  createdByName,
  className,
}: ProjectTimelineProps) {
  const events = buildEvents(versions, currentStage, createdAt, createdByName);

  return (
    <div className={`flex flex-col ${className ?? ""}`} role="list">
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;
        const color = STAGE_COLORS[event.stage];

        return (
          <div key={event.id} className="relative flex gap-4" role="listitem">
            {/* Timeline spine */}
            <div className="flex flex-col items-center">
              {/* Dot */}
              <div
                className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                style={{
                  backgroundColor: event.isCurrent
                    ? color
                    : "var(--surface-alt)",
                  border: `2px solid ${color}`,
                }}
              >
                {event.isCurrent ? (
                  <div
                    className="w-2 h-2 rounded-full bg-[--surface]"
                    aria-hidden
                  />
                ) : (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                )}
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  className="w-px flex-1 mt-1 mb-1"
                  style={{ backgroundColor: "var(--hb-gray-100)" }}
                  aria-hidden
                />
              )}
            </div>

            {/* Content */}
            <div className={`flex-1 min-w-0 pb-6 ${isLast ? "pb-0" : ""}`}>
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span
                  className="text-sm font-semibold"
                  style={{ color: event.isCurrent ? color : "var(--fg)" }}
                >
                  {event.label}
                </span>
                <span className="text-xs text-[--fg-muted] shrink-0 tabular-nums">
                  {formatDate(event.date)}
                </span>
              </div>
              <p className="text-xs text-[--fg-muted]">por {event.actor}</p>
              {event.notes && (
                <p className="mt-1.5 text-sm text-[--fg] bg-[--surface-alt] rounded-[--radius-sm] px-2.5 py-2 border-l-2 border-[--border-strong]">
                  {event.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

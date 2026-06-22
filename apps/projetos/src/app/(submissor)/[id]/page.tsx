import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Send,
} from "lucide-react";
import { getAuthUser, getSubmissorProjectDetail } from "../../../lib/queries";
import { ProjectTimeline } from "../../../components/project-timeline";
import type { ProjectVersion, ProjectStage } from "@hebron/types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const STAGE_LABELS: Record<string, string> = {
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

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  rascunho: { bg: "var(--hb-gray-50)", text: "var(--hb-gray-400)" },
  validacao: { bg: "var(--hb-cyan-muted)", text: "var(--hb-cyan-darker)" },
  votacao: { bg: "var(--brand-muted)", text: "var(--hb-blue)" },
  homologacao: { bg: "var(--hb-orange-muted)", text: "var(--hb-orange-deep)" },
  aprovado: { bg: "var(--hb-green-muted)", text: "var(--hb-green-fg)" },
  reprovado: {
    bg: "var(--color-destructive-muted)",
    text: "var(--color-destructive)",
  },
  em_execucao: { bg: "var(--hb-cyan-muted)", text: "var(--hb-cyan-fg)" },
  concluido: { bg: "var(--hb-green-muted)", text: "var(--hb-green-fg)" },
  cancelado: {
    bg: "var(--color-destructive-muted)",
    text: "var(--hb-red-deep)",
  },
};

function formatDate(d: Date | null | string): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d + "T12:00:00") : d;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ReportStatusBadge({
  status,
}: {
  status: "pendente" | "em_atraso" | "entregue" | "aceito";
}) {
  const styles = {
    pendente: { bg: "var(--hb-gray-50)", text: "var(--hb-gray-400)" },
    em_atraso: {
      bg: "var(--color-destructive-muted)",
      text: "var(--color-destructive)",
    },
    entregue: { bg: "var(--hb-cyan-muted)", text: "var(--hb-cyan-darker)" },
    aceito: { bg: "var(--hb-green-muted)", text: "var(--hb-green-fg)" },
  };
  const labels = {
    pendente: "Pendente",
    em_atraso: "Em Atraso",
    entregue: "Entregue",
    aceito: "Aceito",
  };
  const s = styles[status];
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {labels[status]}
    </span>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  const project = await getSubmissorProjectDetail(id, authUser.id);
  if (!project) notFound();

  const stage = STAGE_COLORS[project.stage] ?? {
    bg: "var(--hb-gray-50)",
    text: "var(--hb-gray-400)",
  };

  const canSendReport =
    project.stage === "em_execucao" || project.stage === "aprovado";

  const isAnnual = project.tipo === "anual";
  const snap = project.snapshot;

  // Build ProjectVersion[] for timeline
  const versions: ProjectVersion[] = project.versions.map((v) => ({
    id: v.id,
    projectId: project.id,
    version: 0,
    stage: v.stage as ProjectStage,
    snapshot: {},
    createdBy: "",
    createdByName: v.createdByName,
    createdAt: v.createdAt,
    notes: null,
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-(--fg-muted) hover:text-(--fg) transition-colors"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden />
        Meus Projetos
      </Link>

      {/* Project header */}
      <div className="rounded-lg border border-(--border) bg-(--surface) shadow-(--shadow-md) overflow-hidden">
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: stage.text }}
          aria-hidden
        />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: stage.bg, color: stage.text }}
                >
                  {STAGE_LABELS[project.stage]}
                </span>
                <span className="text-xs text-(--fg-muted)">
                  {isAnnual ? "Projeto Anual" : "Projeto Pontual"}
                </span>
              </div>
              <h1
                className="text-2xl font-bold text-(--fg) leading-snug"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {project.titulo}
              </h1>
            </div>

            {canSendReport && (
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white shrink-0 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "var(--hb-green)" }}
              >
                <Send className="w-4 h-4" aria-hidden />
                Enviar Relatório
              </button>
            )}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-(--fg-muted) mb-0.5">
                <MapPin className="w-3.5 h-3.5" aria-hidden />
                Região
              </div>
              <p className="text-sm font-semibold text-(--fg)">
                {project.ministryRegion ?? snap.regiao ?? "—"}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-(--fg-muted) mb-0.5">
                <DollarSign className="w-3.5 h-3.5" aria-hidden />
                Valor Total
              </div>
              <p className="text-sm font-bold text-(--fg) tabular-nums">
                {BRL.format(project.budgetTotal)}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-(--fg-muted) mb-0.5">
                <FileText className="w-3.5 h-3.5" aria-hidden />
                Beneficiários
              </div>
              <p className="text-sm font-semibold text-(--fg)">
                {snap.beneficiariosQuantidade ?? "—"} pessoas
              </p>
            </div>

            {isAnnual && project.parcelas !== null && (
              <div>
                <div className="flex items-center gap-1.5 text-xs text-(--fg-muted) mb-0.5">
                  <Calendar className="w-3.5 h-3.5" aria-hidden />
                  Parcelas
                </div>
                <p className="text-sm font-semibold text-(--fg)">
                  {project.parcelas}x{" "}
                  {BRL.format(
                    Math.round(project.budgetTotal / project.parcelas),
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Institution bar */}
        <div
          className="px-6 py-3 border-t border-(--border) flex items-center gap-2"
          style={{ backgroundColor: "var(--surface-alt)" }}
        >
          <span className="text-base" aria-hidden>
            🏛️
          </span>
          <p className="text-sm text-(--fg-muted)">
            <span className="font-semibold text-(--fg)">{project.orgNome}</span>
            {project.orgResponsavel ? ` · ${project.orgResponsavel}` : ""}
          </p>
        </div>
      </div>

      {/* Two columns: content + timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: project details */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {isAnnual && (
            <>
              {project.objectives && (
                <section>
                  <h2 className="text-sm font-bold text-(--fg-muted) uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" aria-hidden />
                    Objetivos
                  </h2>
                  <div className="rounded-md border border-(--border) bg-(--surface) px-5 py-4">
                    <p className="text-sm text-(--fg) leading-relaxed">
                      {project.objectives}
                    </p>
                  </div>
                </section>
              )}

              {snap.metodologia && (
                <section>
                  <h2 className="text-sm font-bold text-(--fg-muted) uppercase tracking-wider mb-3">
                    Metodologia
                  </h2>
                  <div className="rounded-md border border-(--border) bg-(--surface) px-5 py-4">
                    <p className="text-sm text-(--fg) leading-relaxed">
                      {snap.metodologia}
                    </p>
                  </div>
                </section>
              )}
            </>
          )}

          {!isAnnual && snap.descricao && (
            <section>
              <h2 className="text-sm font-bold text-(--fg-muted) uppercase tracking-wider mb-3">
                Descrição
              </h2>
              <div className="rounded-md border border-(--border) bg-(--surface) px-5 py-4">
                <p className="text-sm text-(--fg) leading-relaxed">
                  {snap.descricao}
                </p>
              </div>
            </section>
          )}

          {/* Reports */}
          {project.reports.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-(--fg-muted) uppercase tracking-wider mb-3">
                Relatórios ({project.reports.length})
              </h2>
              <div className="flex flex-col gap-3">
                {project.reports.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-md border bg-(--surface) shadow-(--shadow-sm) overflow-hidden ${r.status === "em_atraso" ? "border-(--color-destructive)" : "border-(--border)"}`}
                  >
                    <div className="flex items-start justify-between gap-3 p-4 border-b border-(--border)">
                      <div>
                        <p
                          className="text-base font-semibold text-(--fg)"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          Período {r.period}
                        </p>
                        <p className="text-xs text-(--fg-muted) mt-0.5">
                          {r.periodStart ? formatDate(r.periodStart) : "—"} —{" "}
                          {r.periodEnd ? formatDate(r.periodEnd) : "—"}
                        </p>
                      </div>
                      <ReportStatusBadge status={r.status} />
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                      {(r.status === "em_atraso" ||
                        r.status === "pendente") && (
                        <p className="text-sm text-(--fg-muted)">
                          {r.status === "em_atraso" ? "Vencido em" : "Vence em"}{" "}
                          {r.dueAt ? formatDate(r.dueAt) : "—"}
                        </p>
                      )}
                      {r.narrativa && (
                        <p className="text-sm text-(--fg) leading-relaxed line-clamp-3">
                          {r.narrativa}
                        </p>
                      )}
                      {r.submittedAt && (
                        <p className="text-xs text-(--fg-muted)">
                          Entregue por {r.submittedByName ?? "—"} em{" "}
                          {formatDate(r.submittedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right: timeline */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section>
            <h2 className="text-sm font-bold text-(--fg-muted) uppercase tracking-wider mb-3">
              Histórico
            </h2>
            <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4 shadow-(--shadow-xs)">
              <ProjectTimeline
                versions={versions}
                currentStage={project.stage as ProjectStage}
                createdAt={project.createdAt}
                createdByName={project.submitterName ?? "Você"}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

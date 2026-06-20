import Link from "next/link";
import {
  ChevronLeft,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  FileText,
  Send,
} from "lucide-react";
import { mockProjects } from "../../../lib/mock-data";
import { ProjectTimeline } from "../../../components/project-timeline";
import { ReportCard } from "../../../components/report-card";
import type { AnnualProject, PontualProject } from "@hebron/types";

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

const CATEGORY_LABELS: Record<string, string> = {
  evangelismo: "Evangelismo",
  missoes_transculturais: "Missões Transculturais",
  educacao_crista: "Educação Cristã",
  assistencia_social: "Assistência Social",
  saude: "Saúde",
  capacitacao_lideranca: "Capacitação de Liderança",
  infraestrutura_ministerial: "Infraestrutura Ministerial",
  plantacao_de_igrejas: "Plantação de Igrejas",
  discipulado: "Discipulado",
  outros: "Outros",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fallback to proj-001 for mock purposes
  const project = mockProjects.find((p) => p.id === id) ?? mockProjects[0];

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-[--fg-muted]">Projeto não encontrado.</p>
        <Link
          href="/"
          className="text-[--brand] text-sm hover:underline mt-2 block"
        >
          Voltar ao dashboard
        </Link>
      </div>
    );
  }

  const stage = STAGE_COLORS[project.stage] ?? {
    bg: "var(--hb-gray-50)",
    text: "var(--hb-gray-400)",
  };

  const isAnnual = project.type === "anual";
  const annual = isAnnual ? (project as AnnualProject) : null;
  const pontual = !isAnnual ? (project as PontualProject) : null;

  const canSendReport =
    project.stage === "em_execucao" || project.stage === "aprovado";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[--fg-muted] hover:text-[--fg] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden />
        Meus Projetos
      </Link>

      {/* Project header */}
      <div className="rounded-[--radius-lg] border border-[--border] bg-[--surface] shadow-[--shadow-md] overflow-hidden">
        {/* Stage color stripe */}
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
                <span className="text-xs text-[--fg-muted]">
                  {project.type === "anual"
                    ? "Projeto Anual"
                    : "Projeto Pontual"}
                </span>
              </div>
              <h1
                className="text-2xl font-bold text-[--fg] leading-snug"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {project.titulo}
              </h1>
            </div>

            {canSendReport && (
              <button
                type="button"
                className="flex items-center gap-2 rounded-[--radius-md] px-4 py-2.5 text-sm font-semibold text-white shrink-0 hover:opacity-90 transition-opacity"
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
              <div className="flex items-center gap-1.5 text-xs text-[--fg-muted] mb-0.5">
                <MapPin className="w-3.5 h-3.5" aria-hidden />
                Região
              </div>
              <p className="text-sm font-semibold text-[--fg]">
                {annual?.regiao ??
                  pontual?.regiao ??
                  project.organizacao.region}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-[--fg-muted] mb-0.5">
                <DollarSign className="w-3.5 h-3.5" aria-hidden />
                Valor Total
              </div>
              <p className="text-sm font-bold text-[--fg] tabular-nums">
                {BRL.format(project.valorTotal)}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-[--fg-muted] mb-0.5">
                <Users className="w-3.5 h-3.5" aria-hidden />
                Beneficiários
              </div>
              <p className="text-sm font-semibold text-[--fg]">
                {project.type === "anual"
                  ? (project as AnnualProject).beneficiariosQuantidade
                  : (project as PontualProject).beneficiariosQuantidade}{" "}
                pessoas
              </p>
            </div>

            {annual && (
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[--fg-muted] mb-0.5">
                  <Calendar className="w-3.5 h-3.5" aria-hidden />
                  Parcelas
                </div>
                <p className="text-sm font-semibold text-[--fg]">
                  {annual.numeroParcelas}x{" "}
                  {BRL.format(
                    Math.round(annual.valorTotal / annual.numeroParcelas),
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Institution bar */}
        <div
          className="px-6 py-3 border-t border-[--border] flex items-center gap-2"
          style={{ backgroundColor: "var(--surface-alt)" }}
        >
          <span className="text-base" aria-hidden>
            {project.organizacao.country === "Brasil"
              ? "🇧🇷"
              : project.organizacao.country === "Moçambique"
                ? "🇲🇿"
                : project.organizacao.country === "Portugal"
                  ? "🇵🇹"
                  : "🌍"}
          </span>
          <p className="text-sm text-[--fg-muted]">
            <span className="font-semibold text-[--fg]">
              {project.organizacao.name}
            </span>{" "}
            · {project.organizacao.contactName}
          </p>
          {annual && (
            <span className="ml-auto text-xs text-[--fg-muted]">
              {CATEGORY_LABELS[project.categoria] ?? project.categoria}
            </span>
          )}
        </div>
      </div>

      {/* Two columns: objectives + timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: project details */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {annual && (
            <>
              {annual.objetivos && (
                <section>
                  <h2 className="text-sm font-bold text-[--fg-muted] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" aria-hidden />
                    Objetivos
                  </h2>
                  <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-5 py-4">
                    <p className="text-sm text-[--fg] leading-relaxed">
                      {annual.objetivos}
                    </p>
                  </div>
                </section>
              )}

              {annual.metodologia && (
                <section>
                  <h2 className="text-sm font-bold text-[--fg-muted] uppercase tracking-wider mb-3">
                    Metodologia
                  </h2>
                  <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-5 py-4">
                    <p className="text-sm text-[--fg] leading-relaxed">
                      {annual.metodologia}
                    </p>
                  </div>
                </section>
              )}
            </>
          )}

          {pontual && pontual.descricao && (
            <section>
              <h2 className="text-sm font-bold text-[--fg-muted] uppercase tracking-wider mb-3">
                Descrição
              </h2>
              <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-5 py-4">
                <p className="text-sm text-[--fg] leading-relaxed">
                  {pontual.descricao}
                </p>
              </div>
            </section>
          )}

          {/* Reports */}
          {project.reports.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-[--fg-muted] uppercase tracking-wider mb-3">
                Relatórios ({project.reports.length})
              </h2>
              <div className="flex flex-col gap-3">
                {project.reports.map((r) => (
                  <ReportCard key={r.id} report={r} />
                ))}
              </div>
            </section>
          )}

          {project.reports.length === 0 && canSendReport && (
            <div className="rounded-[--radius-md] border border-dashed border-[--border] bg-[--surface-alt] px-6 py-8 text-center">
              <p className="text-sm font-semibold text-[--fg] mb-1">
                Nenhum relatório enviado ainda
              </p>
              <p className="text-xs text-[--fg-muted] mb-4">
                "Aquele que é fiel no pouco também é fiel no muito." — Lc 16:10
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-[--radius-md] px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--hb-green)" }}
              >
                <Send className="w-4 h-4" aria-hidden />
                Enviar Primeiro Relatório
              </button>
            </div>
          )}
        </div>

        {/* Right: timeline */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-bold text-[--fg-muted] uppercase tracking-wider mb-3">
            Histórico
          </h2>
          <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-4 py-5">
            <ProjectTimeline
              versions={project.versions}
              currentStage={project.stage}
              createdAt={project.createdAt}
              createdByName={project.submittedByName ?? "Desconhecido"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

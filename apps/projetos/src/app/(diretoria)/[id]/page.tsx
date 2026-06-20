import Link from "next/link";
import {
  ChevronLeft,
  MapPin,
  Users,
  DollarSign,
  Calendar,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { mockProjects } from "../../../lib/mock-data";
import { ScoreIndicator } from "../../../components/score-indicator";
import { EvaluationCard } from "../../../components/evaluation-card";
import { VotePanel } from "../../../components/vote-panel";
import { ProjectTimeline } from "../../../components/project-timeline";
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

// Simulated AI risk extraction from summary
function parseRisks(project: AnnualProject): string[] {
  const riscos: string[] = [];
  if (project.riscos) riscos.push(project.riscos);
  if (project.aiScore !== null && project.aiScore < 60)
    riscos.push("Score de aderência abaixo de 60 — requer atenção especial.");
  if (!project.cartaRecomendacao) riscos.push("Carta de recomendação ausente.");
  if (project.cofinancimento)
    riscos.push("Depende de cofinanciamento externo.");
  return riscos.slice(0, 3);
}

function AIRiskItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-[--border] last:border-0">
      <AlertTriangle
        className="w-4 h-4 shrink-0 mt-0.5"
        style={{ color: "var(--hb-orange)" }}
        aria-hidden
      />
      <p className="text-sm text-[--fg] leading-relaxed">{text}</p>
    </div>
  );
}

export default async function DirectorProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = mockProjects.find((p) => p.id === id) ?? mockProjects[0];

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-[--fg-muted]">Projeto não encontrado.</p>
        <Link
          href="/"
          className="text-[--brand] text-sm hover:underline mt-2 block"
        >
          Voltar ao pipeline
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

  const risks = annual ? parseRisks(annual) : [];

  const pendingReports = project.reports.filter(
    (r) => r.status === "pendente" || r.status === "em_atraso",
  ).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[--fg-muted] hover:text-[--fg] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden />
        Pipeline
      </Link>

      {/* Main content — 3 column layout on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: AI Panel */}
        <div className="flex flex-col gap-4">
          {/* Score card */}
          <div className="rounded-[--radius-lg] border border-[--border] bg-[--surface] shadow-[--shadow-md] overflow-hidden">
            <div
              className="px-5 py-3 flex items-center gap-2 border-b border-[--border]"
              style={{ backgroundColor: "var(--surface-alt)" }}
            >
              <Sparkles
                className="w-4 h-4"
                style={{ color: "var(--hb-purple)" }}
                aria-hidden
              />
              <p className="text-xs font-bold uppercase tracking-wider text-[--fg-muted]">
                Análise IA
              </p>
            </div>

            <div className="px-5 py-5 flex flex-col gap-4">
              {project.aiScore !== null ? (
                <>
                  <ScoreIndicator
                    score={project.aiScore}
                    role="diretor"
                    showLabel
                  />

                  {project.aiSummary && (
                    <div>
                      <p className="text-xs font-semibold text-[--fg-muted] uppercase tracking-wider mb-2">
                        Resumo
                      </p>
                      <p className="text-sm text-[--fg] leading-relaxed">
                        {project.aiSummary}
                      </p>
                    </div>
                  )}

                  {risks.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[--fg-muted] uppercase tracking-wider mb-2">
                        Riscos Identificados
                      </p>
                      <div
                        className="rounded-[--radius-sm] border border-[--hb-orange-muted] overflow-hidden"
                        style={{ backgroundColor: "var(--hb-orange-muted)" }}
                      >
                        {risks.map((r, i) => (
                          <AIRiskItem key={i} text={r} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-4 text-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: "var(--hb-gray-50)" }}
                  >
                    <Sparkles
                      className="w-5 h-5 text-[--fg-subtle]"
                      aria-hidden
                    />
                  </div>
                  <p className="text-sm text-[--fg-muted]">
                    Análise de IA não disponível para este projeto.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Compact version */}
          {project.compactVersion && (
            <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-4 py-4 shadow-[--shadow-xs]">
              <p className="text-xs font-bold uppercase tracking-wider text-[--fg-muted] mb-2">
                Resumo Compacto
              </p>
              <p className="text-sm text-[--fg] leading-relaxed">
                {project.compactVersion.content}
              </p>
              <p className="text-xs text-[--fg-subtle] mt-2">
                Gerado por IA em{" "}
                {project.compactVersion.generatedAt.toLocaleDateString("pt-BR")}
              </p>
            </div>
          )}

          {/* Alerts */}
          {pendingReports > 0 && (
            <div
              className="rounded-[--radius-md] px-4 py-3 flex items-center gap-3"
              style={{
                backgroundColor: "var(--color-destructive-muted)",
                border: "1px solid var(--color-destructive)",
              }}
            >
              <AlertTriangle
                className="w-4 h-4 shrink-0"
                style={{ color: "var(--color-destructive)" }}
                aria-hidden
              />
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-destructive)" }}
              >
                {pendingReports} relatório{pendingReports > 1 ? "s" : ""} em
                atraso
              </p>
            </div>
          )}

          {/* Contestations */}
          {project.contestations.length > 0 && (
            <div className="rounded-[--radius-md] border border-[--hb-orange] bg-[--hb-orange-muted] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[--hb-orange-deep] mb-2">
                Contestações ({project.contestations.length})
              </p>
              {project.contestations.map((c) => (
                <div key={c.id} className="text-sm text-[--fg]">
                  <p className="font-semibold">{c.contestantName}</p>
                  <p className="text-[--fg-muted] text-xs leading-relaxed">
                    {c.reason}
                  </p>
                  {c.resolvedAt && (
                    <p className="text-xs text-[--hb-green-fg] mt-1 font-medium">
                      Resolvida em {c.resolvedAt.toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CENTER COLUMN: Project details */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Header card */}
          <div className="rounded-[--radius-lg] border border-[--border] bg-[--surface] shadow-[--shadow-md] overflow-hidden">
            <div
              className="h-1.5 w-full"
              style={{ backgroundColor: stage.text }}
              aria-hidden
            />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: stage.bg, color: stage.text }}
                >
                  {STAGE_LABELS[project.stage]}
                </span>
                <span className="text-xs text-[--fg-muted]">
                  {project.type === "anual" ? "Anual" : "Pontual"}
                </span>
              </div>
              <h1
                className="text-xl font-bold text-[--fg] leading-snug mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {project.titulo}
              </h1>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[--fg-muted] mb-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" aria-hidden />
                    Região
                  </p>
                  <p className="font-semibold text-[--fg]">
                    {annual?.regiao ?? pontual?.regiao ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[--fg-muted] mb-0.5 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" aria-hidden />
                    Valor Total
                  </p>
                  <p className="font-bold text-[--fg] tabular-nums">
                    {BRL.format(project.valorTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-[--fg-muted] mb-0.5 flex items-center gap-1">
                    <Users className="w-3 h-3" aria-hidden />
                    Beneficiários
                  </p>
                  <p className="font-semibold text-[--fg]">
                    {isAnnual
                      ? (project as AnnualProject).beneficiariosQuantidade
                      : (project as PontualProject).beneficiariosQuantidade}
                  </p>
                </div>
                {annual && (
                  <div>
                    <p className="text-[--fg-muted] mb-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" aria-hidden />
                      Parcelas
                    </p>
                    <p className="font-semibold text-[--fg]">
                      {annual.numeroParcelas}x
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div
              className="px-5 py-2.5 border-t border-[--border] flex items-center gap-2"
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
              <p className="text-xs text-[--fg-muted] truncate">
                <span className="font-semibold text-[--fg]">
                  {project.organizacao.name}
                </span>{" "}
                · {project.submittedByName}
              </p>
            </div>
          </div>

          {/* Objectives */}
          {annual?.objetivos && (
            <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-4 py-4 shadow-[--shadow-xs]">
              <p className="text-xs font-bold uppercase tracking-wider text-[--fg-muted] mb-2">
                Objetivos
              </p>
              <p className="text-sm text-[--fg] leading-relaxed">
                {annual.objetivos}
              </p>
            </div>
          )}

          {/* Results expected */}
          {annual?.resultadosEsperados && (
            <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-4 py-4 shadow-[--shadow-xs]">
              <p className="text-xs font-bold uppercase tracking-wider text-[--fg-muted] mb-2">
                Resultados Esperados
              </p>
              <p className="text-sm text-[--fg] leading-relaxed">
                {annual.resultadosEsperados}
              </p>
            </div>
          )}

          {/* Vote summary */}
          {project.voteSummary && (
            <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-4 py-4 shadow-[--shadow-xs]">
              <p className="text-xs font-bold uppercase tracking-wider text-[--fg-muted] mb-3">
                Resultado da Votação
              </p>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--hb-green)",
                    }}
                  >
                    {project.voteSummary.inFavor}
                  </p>
                  <p className="text-xs text-[--fg-muted] flex items-center gap-1 justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />A favor
                  </p>
                </div>
                <div
                  className="w-px h-12"
                  style={{ backgroundColor: "var(--border)" }}
                  aria-hidden
                />
                <div className="text-center">
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--color-destructive)",
                    }}
                  >
                    {project.voteSummary.against}
                  </p>
                  <p className="text-xs text-[--fg-muted] flex items-center gap-1 justify-center">
                    <XCircle className="w-3.5 h-3.5" aria-hidden />
                    Contra
                  </p>
                </div>
                <div
                  className="w-px h-12"
                  style={{ backgroundColor: "var(--border)" }}
                  aria-hidden
                />
                <div className="text-center">
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: project.voteSummary.quorumMet
                        ? "var(--hb-green)"
                        : "var(--hb-orange)",
                    }}
                  >
                    {project.voteSummary.totalVoted}/
                    {project.voteSummary.totalEligible}
                  </p>
                  <p className="text-xs text-[--fg-muted]">
                    {project.voteSummary.quorumMet ? "Quórum ✓" : "Sem quórum"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-4 py-4 shadow-[--shadow-xs]">
            <p className="text-xs font-bold uppercase tracking-wider text-[--fg-muted] mb-3">
              Histórico
            </p>
            <ProjectTimeline
              versions={project.versions}
              currentStage={project.stage}
              createdAt={project.createdAt}
              createdByName={project.submittedByName ?? "Desconhecido"}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Evaluation + Voting */}
        <div className="flex flex-col gap-4">
          {/* Vote panel (only for votacao stage) */}
          {project.stage === "votacao" && project.voteSummary && (
            <VotePanel
              projectTitle={project.titulo}
              voteSummary={project.voteSummary}
              hasVoted={false}
              onVote={(inFavor) =>
                console.log("Vote:", inFavor ? "Sim" : "Não")
              }
            />
          )}

          {/* Evaluations */}
          {project.evaluations.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[--fg-muted] mb-3">
                Avaliações ({project.evaluations.length})
              </p>
              <div className="flex flex-col gap-3">
                {project.evaluations.map((e) => (
                  <EvaluationCard key={e.id} evaluation={e} />
                ))}
              </div>
            </div>
          )}

          {/* Add evaluation placeholder */}
          <div className="rounded-[--radius-md] border border-dashed border-[--border] bg-[--surface-alt] px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[--fg-muted] mb-3">
              Registrar Avaliação
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                {(["sim", "nao"] as const).map((rec) => (
                  <button
                    key={rec}
                    type="button"
                    className="flex-1 rounded-[--radius] border-2 py-2 text-xs font-bold transition-all duration-[--dur-fast]"
                    style={{
                      borderColor:
                        rec === "sim"
                          ? "var(--hb-green)"
                          : "var(--color-destructive)",
                      backgroundColor:
                        rec === "sim"
                          ? "var(--hb-green-muted)"
                          : "var(--color-destructive-muted)",
                      color:
                        rec === "sim"
                          ? "var(--hb-green-fg)"
                          : "var(--color-destructive)",
                    }}
                  >
                    {rec === "sim" ? "✓ Favorável" : "✗ Desfavorável"}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                placeholder="Deixe suas notas e comentários sobre este projeto..."
                className="w-full rounded-[--radius] border border-[--border] bg-[--surface] px-3 py-2.5 text-sm text-[--fg] placeholder:text-[--fg-subtle] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand] resize-none"
              />
              <button
                type="button"
                className="w-full rounded-[--radius] bg-[--brand] text-[--brand-fg] py-2 text-sm font-semibold hover:bg-[--hb-blue-soft] transition-colors"
              >
                Salvar Avaliação
              </button>
            </div>
          </div>

          {/* Category + indicators */}
          {annual && (
            <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-4 py-4 shadow-[--shadow-xs]">
              <p className="text-xs font-bold uppercase tracking-wider text-[--fg-muted] mb-3">
                Informações Adicionais
              </p>
              <div className="flex flex-col gap-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[--fg-muted]">Categoria</span>
                  <span className="font-semibold text-[--fg]">
                    {CATEGORY_LABELS[project.categoria] ?? project.categoria}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--fg-muted]">Meses de pagamento</span>
                  <span className="font-semibold text-[--fg]">
                    {annual.numeroParcelas}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--fg-muted]">Carta de rec.</span>
                  <span
                    className="font-semibold"
                    style={{
                      color: annual.cartaRecomendacao
                        ? "var(--hb-green-fg)"
                        : "var(--color-destructive)",
                    }}
                  >
                    {annual.cartaRecomendacao ? "Sim" : "Não"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--fg-muted]">País</span>
                  <span className="font-semibold text-[--fg]">
                    {annual.pais}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--fg-muted]">Anos de ministério</span>
                  <span className="font-semibold text-[--fg]">
                    {annual.tempoMinisterioAnos} anos
                  </span>
                </div>
                {annual.parcerias && (
                  <div className="pt-2 border-t border-[--border]">
                    <p className="text-[--fg-muted] text-xs mb-1">Parcerias</p>
                    <p className="text-[--fg] text-xs">{annual.parcerias}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

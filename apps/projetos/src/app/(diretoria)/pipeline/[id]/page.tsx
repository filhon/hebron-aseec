import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
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
  Building2,
  FileText,
  Pencil,
} from "lucide-react";
import {
  getAuthUser,
  getDirectorProjectDetail,
  getEligibleEvaluators,
  getMyPendingEvaluation,
} from "../../../../lib/queries";
import { requireDiretorSession } from "../../../../lib/session";
import { ScoreIndicator } from "../../../../components/score-indicator";
import { EvaluationCard } from "../../../../components/evaluation-card";
import { EvaluatorPanel } from "../../../../components/evaluator-panel";
import { EvaluationForm } from "../../../../components/evaluation-form";
import { ContestationForm } from "../../../../components/contestation-form";
import { SubmitterContestationPanel } from "../../../../components/submitter-contestation-panel";
import { VotingAdminActions } from "../../../../components/voting-admin-actions";
import { DeleteProjectButton } from "../../../../components/delete-project-button";
import { ReportRequestForm } from "../../../../components/report-request-form";
import { ReportReviewActions } from "../../../../components/report-review-actions";
import { VotePanelWrapper } from "../../../../components/vote-panel-wrapper";
import { DecisionPanel } from "../../../../components/decision-panel";
import { ProjectTimeline } from "../../../../components/project-timeline";
import {
  DuplicateBadge,
  DuplicateCandidatesPanel,
} from "../../../../components/duplicate-badge";
import {
  BRL,
  STAGE_LABELS,
  CATEGORY_LABELS,
  getStageBadge,
} from "../../../../lib/stage-utils";
import type {
  Evaluation,
  ProjectVersion,
  ProjectStage,
  VoteSummary,
} from "@hebron/types";

type ScoreRole = "super_admin" | "diretor" | "conselheiro";

function highestScoreRole(roles: string[]): ScoreRole {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("diretor")) return "diretor";
  return "conselheiro";
}

export default async function DirectorProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await requireDiretorSession();
  const authUser = await getAuthUser();
  if (!authUser) redirect(CANONICAL_LOGIN_URL);

  const project = await getDirectorProjectDetail(id, authUser.id);
  if (!project) notFound();

  const isSuperAdmin = session.roles.includes("super_admin");
  const viewerScoreRole = highestScoreRole(session.roles);

  const [eligibleEvaluators, myPendingEvaluation] = await Promise.all([
    project.stage === "validacao"
      ? getEligibleEvaluators(project.id)
      : Promise.resolve([]),
    getMyPendingEvaluation(project.id, authUser.id),
  ]);

  const stage = getStageBadge(project.stage);

  const isAnnual = project.tipo === "anual";
  const snap = project.snapshot;

  // Risks derived from AI score + snapshot fields
  const risks: string[] = [];
  if (project.scoreAi !== null && project.scoreAi < 60)
    risks.push("Score de aderência abaixo de 60 — requer atenção especial.");
  if (snap.cartaRecomendacao === false)
    risks.push("Carta de recomendação ausente.");
  if (snap.riscos) risks.push(snap.riscos);

  // Map evaluations to @hebron/types Evaluation shape for EvaluationCard
  const evaluations: Evaluation[] = project.evaluations.map((e) => ({
    id: e.id,
    projectId: id,
    evaluatorId: "",
    evaluatorName: e.evaluatorName,
    recommendation: e.recommendation,
    notes: e.notes ?? "",
    createdAt: e.createdAt,
    updatedAt: e.createdAt,
  }));

  // Build ProjectVersion[] for timeline
  const versions: ProjectVersion[] = project.versions.map((v) => ({
    id: v.id,
    projectId: id,
    version: 0,
    stage: v.stage as ProjectStage,
    snapshot: {},
    createdBy: "",
    createdByName: v.createdByName,
    createdAt: v.createdAt,
    notes: null,
  }));

  // Build VoteSummary if available
  const voteSummary: VoteSummary | null = project.voteSummary;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/pipeline"
          className="inline-flex items-center gap-1.5 text-sm text-(--fg-muted) hover:text-(--fg) transition-colors"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          Pipeline
        </Link>

        {/* Editar em validação — só super_admin (Q23, Q38, P-2.16
            CORRETIVO): updateProjectInValidation é a única action de
            escrita que aceita stage validacao, e só ela avisa o submissor
            por email a cada alteração. */}
        {isSuperAdmin && project.stage === "validacao" && (
          <Link
            href={`/pipeline/${project.id}/editar`}
            className="inline-flex items-center gap-1.5 rounded-md border border-(--border) px-3 py-1.5 text-xs font-semibold text-(--fg-muted) hover:border-(--brand) hover:text-(--brand) transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden />
            Editar projeto
          </Link>
        )}
      </div>

      {/* Main content — 3 column layout on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: AI Panel */}
        <div className="flex flex-col gap-4">
          {/* Score card */}
          <div className="rounded-lg border border-(--border) bg-(--surface) shadow-(--shadow-md) overflow-hidden">
            <div
              className="px-5 py-3 flex items-center gap-2 border-b border-(--border)"
              style={{ backgroundColor: "var(--surface-alt)" }}
            >
              <Sparkles
                className="w-4 h-4"
                style={{ color: "var(--hb-purple)" }}
                aria-hidden
              />
              <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted)">
                Análise IA
              </p>
            </div>

            <div className="px-5 py-5 flex flex-col gap-4">
              {project.scoreAi !== null ? (
                <>
                  <ScoreIndicator
                    score={project.scoreAi}
                    role={viewerScoreRole}
                    showLabel
                  />

                  {risks.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-(--fg-muted) uppercase tracking-wider mb-2">
                        Riscos Identificados
                      </p>
                      <div
                        className="rounded-sm border border-(--hb-orange-muted) overflow-hidden"
                        style={{ backgroundColor: "var(--hb-orange-muted)" }}
                      >
                        {risks.slice(0, 3).map((r, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5 py-2.5 border-b border-(--border) last:border-0"
                          >
                            <AlertTriangle
                              className="w-4 h-4 shrink-0 mt-0.5"
                              style={{ color: "var(--hb-orange)" }}
                              aria-hidden
                            />
                            <p className="text-sm text-(--fg) leading-relaxed">
                              {r}
                            </p>
                          </div>
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
                      className="w-5 h-5 text-(--fg-subtle)"
                      aria-hidden
                    />
                  </div>
                  <p className="text-sm text-(--fg-muted)">
                    Análise de IA não disponível para este projeto.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Compact version */}
          {project.compactVersionContent && (
            <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4 shadow-(--shadow-xs)">
              <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-2">
                Resumo Compacto
              </p>
              <p className="text-sm text-(--fg) leading-relaxed">
                {project.compactVersionContent}
              </p>
              {project.compactVersionCreatedAt && (
                <p className="text-xs text-(--fg-subtle) mt-2">
                  Gerado por IA em{" "}
                  {project.compactVersionCreatedAt.toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          )}

          {/* Alerts */}
          {project.pendingReports > 0 && (
            <div
              className="rounded-md px-4 py-3 flex items-center gap-3"
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
                {project.pendingReports} relatório
                {project.pendingReports > 1 ? "s" : ""} em atraso
              </p>
            </div>
          )}

          {/* Duplicate detection (P-2.14) */}
          <DuplicateCandidatesPanel candidates={project.duplicateCandidates} />

          {/* Contestação do submissor (P-2.17 CORRETIVO, PATCH-029) —
              resolução é super_admin-only; a fila é a notificação (leva
              direto ao projeto) + este painel embutido no detalhe. */}
          {isSuperAdmin && (
            <SubmitterContestationPanel
              contestations={project.submitterContestations}
            />
          )}

          {/* Contestations (diretor/conselheiro, homologação) */}
          {project.contestations.length > 0 && (
            <div className="rounded-md border border-(--hb-orange) bg-(--hb-orange-muted) px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-(--hb-orange-deep) mb-2">
                Contestações ({project.contestations.length})
              </p>
              {project.contestations.map((c) => (
                <div key={c.id} className="text-sm text-(--fg)">
                  <p className="font-semibold">{c.contestantName}</p>
                  <p className="text-(--fg-muted) text-xs leading-relaxed">
                    {c.reason}
                  </p>
                  {c.resolvedAt && (
                    <p className="text-xs text-(--hb-green-fg) mt-1 font-medium">
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
          <div className="rounded-lg border border-(--border) bg-(--surface) shadow-(--shadow-md) overflow-hidden">
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
                <span className="text-xs text-(--fg-muted)">
                  {isAnnual ? "Anual" : "Pontual"}
                </span>
                {project.duplicateCandidates.length > 0 && <DuplicateBadge />}
              </div>
              <h1
                className="text-xl font-bold text-(--fg) leading-snug mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {project.titulo}
              </h1>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-(--fg-muted) mb-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" aria-hidden />
                    Região
                  </p>
                  <p className="font-semibold text-(--fg)">
                    {project.ministryRegion ?? snap.regiao ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-(--fg-muted) mb-0.5 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" aria-hidden />
                    Valor Total
                  </p>
                  <p className="font-bold text-(--fg) tabular-nums">
                    {BRL.format(project.budgetTotal)}
                  </p>
                  {project.approvedAmount !== null &&
                    project.approvedAmount !== project.budgetTotal && (
                      <p className="text-(--fg-muted) tabular-nums">
                        Aprovado: {BRL.format(project.approvedAmount)}
                      </p>
                    )}
                </div>
                <div>
                  <p className="text-(--fg-muted) mb-0.5 flex items-center gap-1">
                    <Users className="w-3 h-3" aria-hidden />
                    Beneficiários
                  </p>
                  <p className="font-semibold text-(--fg)">
                    {snap.beneficiariosQuantidade ?? "—"}
                  </p>
                </div>
                {isAnnual && project.parcelas !== null && (
                  <div>
                    <p className="text-(--fg-muted) mb-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" aria-hidden />
                      Parcelas
                    </p>
                    <p className="font-semibold text-(--fg)">
                      {project.parcelas}x
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div
              className="px-5 py-2.5 border-t border-(--border) flex items-center gap-2"
              style={{ backgroundColor: "var(--surface-alt)" }}
            >
              <Building2
                className="w-4 h-4 shrink-0 text-(--fg-muted)"
                aria-hidden
              />
              <p className="text-xs text-(--fg-muted) truncate">
                <span className="font-semibold text-(--fg)">
                  {project.orgNome}
                </span>{" "}
                {project.submitterName ? `· ${project.submitterName}` : ""}
              </p>
            </div>
          </div>

          {/* Objectives */}
          {project.objectives && (
            <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4 shadow-(--shadow-xs)">
              <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-2">
                Objetivos
              </p>
              <p className="text-sm text-(--fg) leading-relaxed">
                {project.objectives}
              </p>
            </div>
          )}

          {/* Expected results */}
          {project.expectedResults && (
            <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4 shadow-(--shadow-xs)">
              <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-2">
                Resultados Esperados
              </p>
              <p className="text-sm text-(--fg) leading-relaxed">
                {project.expectedResults}
              </p>
            </div>
          )}

          {/* Vote summary (informational, outside voting period) */}
          {voteSummary && project.stage !== "votacao" && (
            <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4 shadow-(--shadow-xs)">
              <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-3">
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
                    {voteSummary.inFavor}
                  </p>
                  <p className="text-xs text-(--fg-muted) flex items-center gap-1 justify-center">
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
                    {voteSummary.against}
                  </p>
                  <p className="text-xs text-(--fg-muted) flex items-center gap-1 justify-center">
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
                      color: voteSummary.quorumMet
                        ? "var(--hb-green)"
                        : "var(--hb-orange)",
                    }}
                  >
                    {voteSummary.totalVoted}/{voteSummary.totalEligible}
                  </p>
                  <p className="text-xs text-(--fg-muted)">
                    {voteSummary.quorumMet ? "Quórum ✓" : "Sem quórum"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4 shadow-(--shadow-xs)">
            <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-3">
              Histórico
            </p>
            <ProjectTimeline
              versions={versions}
              currentStage={project.stage as ProjectStage}
              createdAt={project.createdAt}
              createdByName={project.submitterName ?? "Desconhecido"}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Evaluation + Voting */}
        <div className="flex flex-col gap-4">
          {/* Vote panel (only during votacao stage) */}
          {project.stage === "votacao" && voteSummary && (
            <VotePanelWrapper
              projectId={project.id}
              projectTitle={project.titulo}
              voteSummary={voteSummary}
              hasVoted={project.hasVoted}
            />
          )}

          {/* Panic / manual close (votacao, super_admin only) */}
          {project.stage === "votacao" && voteSummary && isSuperAdmin && (
            <VotingAdminActions
              projectId={project.id}
              quorumMet={voteSummary.quorumMet}
            />
          )}

          {/* Decisão da diretoria — validacao (pontual) ou homologacao
              (anual), os únicos estágios que admitem "aprovado" no mapa de
              transições (VALID_STAGE_TRANSITIONS). Único caminho para
              aprovar: transitionProjectStage recusa "→ aprovado" sem
              decisão registrada (P-2.15 CORRETIVO). */}
          {(project.stage === "validacao" ||
            project.stage === "homologacao") && (
            <DecisionPanel
              projectId={project.id}
              requestedAmount={project.budgetTotal}
              isPontual={!isAnnual}
            />
          )}

          {/* Contestation (homologacao) */}
          {project.stage === "homologacao" && (
            <ContestationForm projectId={project.id} />
          )}

          {/* Evaluator assignment (validacao) */}
          {project.stage === "validacao" && (
            <EvaluatorPanel
              projectId={project.id}
              evaluators={eligibleEvaluators}
            />
          )}

          {/* Evaluations */}
          {evaluations.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-3">
                Avaliações ({evaluations.length})
              </p>
              <div className="flex flex-col gap-3">
                {evaluations.map((e) => (
                  <EvaluationCard key={e.id} evaluation={e} />
                ))}
              </div>
            </div>
          )}

          {/* Registrar avaliação — só para o avaliador designado, com
              avaliação ainda pendente (F2-P1: o box antigo era decorativo,
              sempre visível, sem checar designação nem submeter nada). */}
          {myPendingEvaluation && <EvaluationForm projectId={project.id} />}

          {/* Reports */}
          <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4 shadow-(--shadow-xs)">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" aria-hidden />
                Relatórios
              </p>
              {project.stage === "em_execucao" && (
                <ReportRequestForm projectId={project.id} />
              )}
            </div>
            {project.reports.length === 0 ? (
              <p className="text-xs text-(--fg-muted)">
                Nenhum relatório solicitado ainda.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {project.reports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-(--radius) border border-(--border) px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-semibold text-(--fg)">
                        Período {r.period}
                      </p>
                      <p className="text-xs text-(--fg-muted)">
                        {r.status === "pendente" && "Pendente"}
                        {r.status === "submitted" && "Aguardando revisão"}
                        {r.status === "approved" && "Aprovado"}
                        {r.status === "rejected" && "Rejeitado"}
                      </p>
                    </div>
                    {r.status === "submitted" && (
                      <ReportReviewActions reportId={r.id} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete project */}
          <div className="flex justify-end">
            <DeleteProjectButton
              projectId={project.id}
              redirectTo="/pipeline"
            />
          </div>

          {/* Category + indicators */}
          {isAnnual && (
            <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4 shadow-(--shadow-xs)">
              <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-3">
                Informações Adicionais
              </p>
              <div className="flex flex-col gap-2.5 text-sm">
                {project.categorySlug && (
                  <div className="flex justify-between">
                    <span className="text-(--fg-muted)">Categoria</span>
                    <span className="font-semibold text-(--fg)">
                      {CATEGORY_LABELS[project.categorySlug] ??
                        project.categorySlug}
                    </span>
                  </div>
                )}
                {project.parcelas !== null && (
                  <div className="flex justify-between">
                    <span className="text-(--fg-muted)">
                      Meses de pagamento
                    </span>
                    <span className="font-semibold text-(--fg)">
                      {project.parcelas}
                    </span>
                  </div>
                )}
                {snap.cartaRecomendacao !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-(--fg-muted)">Carta de rec.</span>
                    <span
                      className="font-semibold"
                      style={{
                        color: snap.cartaRecomendacao
                          ? "var(--hb-green-fg)"
                          : "var(--color-destructive)",
                      }}
                    >
                      {snap.cartaRecomendacao ? "Sim" : "Não"}
                    </span>
                  </div>
                )}
                {snap.pais && (
                  <div className="flex justify-between">
                    <span className="text-(--fg-muted)">País</span>
                    <span className="font-semibold text-(--fg)">
                      {snap.pais}
                    </span>
                  </div>
                )}
                {snap.tempoMinisterioAnos !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-(--fg-muted)">
                      Anos de ministério
                    </span>
                    <span className="font-semibold text-(--fg)">
                      {snap.tempoMinisterioAnos} anos
                    </span>
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

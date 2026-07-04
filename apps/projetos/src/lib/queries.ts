"use server";

import { db } from "@hebron/db/client";
import { cookies } from "next/headers";
import { createSupabaseServerActionClient } from "@hebron/auth/server";
import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  compactVersions,
  contestations,
  evaluations,
  organizationMembers,
  organizations,
  paymentSchedules,
  projectCategories,
  projectVersions,
  projects,
  reports,
  roleAssignments,
  users,
  votes,
} from "@hebron/db/schema";
import type { CompactProjectView, ProjectStage } from "@hebron/types";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function getAuthUser(): Promise<{
  id: string;
  fullName: string | null;
  email: string | null;
} | null> {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerActionClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      } catch {
        // Server Component — não pode setar cookies, ignorar
      }
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return {
    id: user.id,
    fullName: rows[0]?.fullName ?? null,
    email: user.email ?? null,
  };
}

// ---------------------------------------------------------------------------
// Organizations (wizard)
// ---------------------------------------------------------------------------

export type OrgOption = { id: string; nome: string; cnpj: string | null };

export async function getMyOrganizations(): Promise<OrgOption[]> {
  const authUser = await getAuthUser();
  if (!authUser) return [];

  return db
    .select({
      id: organizations.id,
      nome: organizations.nome,
      cnpj: organizations.cnpj,
    })
    .from(organizations)
    .innerJoin(
      organizationMembers,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, authUser.id));
}

// ---------------------------------------------------------------------------
// Submissor dashboard
// ---------------------------------------------------------------------------

export type DashboardProject = {
  id: string;
  titulo: string;
  stage: string;
  tipo: "anual" | "pontual";
  budgetTotal: number;
  parcelas: number | null;
  evaluationYear: number | null;
  orgNome: string;
  paidCount: number;
  totalSchedules: number;
};

export type DashboardPayment = {
  id: string;
  projectId: string;
  projectTitle: string;
  amount: number;
  dueDate: string;
  month: number;
  parcelNum: number;
  parcelTotal: number | null;
};

export type DashboardReport = {
  id: string;
  projectId: string;
  projectTitle: string;
  dueDate: string | null;
  isOverdue: boolean;
};

export type DashboardData = {
  projects: DashboardProject[];
  upcomingPayments: DashboardPayment[];
  pendingReports: DashboardReport[];
  committedBudget: number;
  institutions: { id: string; nome: string }[];
};

export async function getSubmissorDashboard(
  userId: string,
): Promise<DashboardData> {
  const projectRows = await db
    .select({
      id: projects.id,
      title: projects.title,
      stage: projects.stage,
      tipo: projects.tipo,
      budgetTotal: projects.budgetTotal,
      parcelas: projects.parcelas,
      evaluationYear: projects.evaluationYear,
      orgNome: organizations.nome,
    })
    .from(projects)
    .leftJoin(organizations, eq(projects.organizationId, organizations.id))
    .where(and(eq(projects.submitterId, userId), isNull(projects.deletedAt)))
    .orderBy(projects.updatedAt);

  const projectIds = projectRows.map((p) => p.id);

  // Paid installment counts per project
  const paidRows =
    projectIds.length > 0
      ? await db
          .select({
            projectId: paymentSchedules.projectId,
            paidCount: count(),
          })
          .from(paymentSchedules)
          .where(
            and(
              inArray(paymentSchedules.projectId, projectIds),
              eq(paymentSchedules.status, "pago"),
            ),
          )
          .groupBy(paymentSchedules.projectId)
      : [];

  const totalRows =
    projectIds.length > 0
      ? await db
          .select({
            projectId: paymentSchedules.projectId,
            totalCount: count(),
          })
          .from(paymentSchedules)
          .where(inArray(paymentSchedules.projectId, projectIds))
          .groupBy(paymentSchedules.projectId)
      : [];

  const paidMap = new Map(paidRows.map((r) => [r.projectId, r.paidCount]));
  const totalMap = new Map(totalRows.map((r) => [r.projectId, r.totalCount]));

  const mappedProjects: DashboardProject[] = projectRows.map((p) => ({
    id: p.id,
    titulo: p.title,
    stage: p.stage,
    tipo: p.tipo,
    budgetTotal: parseFloat(p.budgetTotal ?? "0"),
    parcelas: p.parcelas,
    evaluationYear: p.evaluationYear,
    orgNome: p.orgNome ?? "Instituição",
    paidCount: paidMap.get(p.id) ?? 0,
    totalSchedules: totalMap.get(p.id) ?? 0,
  }));

  // Upcoming payments (next 3 months)
  const todayStr = new Date().toISOString().split("T")[0];
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  const threeMonthsStr = threeMonthsLater.toISOString().split("T")[0];

  const paymentRows =
    projectIds.length > 0
      ? await db
          .select({
            id: paymentSchedules.id,
            projectId: paymentSchedules.projectId,
            projectTitle: projects.title,
            amount: paymentSchedules.amount,
            dueDate: paymentSchedules.dueDate,
            month: paymentSchedules.month,
            parcelas: projects.parcelas,
          })
          .from(paymentSchedules)
          .innerJoin(projects, eq(paymentSchedules.projectId, projects.id))
          .where(
            and(
              inArray(paymentSchedules.projectId, projectIds),
              eq(paymentSchedules.status, "pendente"),
              sql`${paymentSchedules.dueDate} >= ${todayStr}`,
              sql`${paymentSchedules.dueDate} <= ${threeMonthsStr}`,
            ),
          )
          .orderBy(paymentSchedules.dueDate)
          .limit(3)
      : [];

  // To compute parcel number, count how many payments come before this one per project
  const upcomingPayments: DashboardPayment[] = [];
  for (const pay of paymentRows) {
    const parcelsBefore = await db
      .select({ cnt: count() })
      .from(paymentSchedules)
      .where(
        and(
          eq(paymentSchedules.projectId, pay.projectId),
          sql`${paymentSchedules.dueDate} < ${pay.dueDate}`,
        ),
      );
    const parcelNum = (parcelsBefore[0]?.cnt ?? 0) + 1;
    upcomingPayments.push({
      id: pay.id,
      projectId: pay.projectId,
      projectTitle: pay.projectTitle,
      amount: parseFloat(pay.amount),
      dueDate: pay.dueDate,
      month: pay.month,
      parcelNum,
      parcelTotal: pay.parcelas,
    });
  }

  // Pending reports
  const reportRows =
    projectIds.length > 0
      ? await db
          .select({
            id: reports.id,
            projectId: reports.projectId,
            projectTitle: projects.title,
            dueDate: reports.dueDate,
          })
          .from(reports)
          .innerJoin(projects, eq(reports.projectId, projects.id))
          .where(
            and(
              inArray(reports.projectId, projectIds),
              eq(reports.status, "pendente"),
            ),
          )
          .orderBy(reports.dueDate)
      : [];

  const nowStr = new Date().toISOString().split("T")[0] ?? "";
  const pendingReports: DashboardReport[] = reportRows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    projectTitle: r.projectTitle,
    dueDate: r.dueDate,
    isOverdue: r.dueDate !== null && r.dueDate < nowStr,
  }));

  const committedBudget = mappedProjects
    .filter((p) => !["reprovado", "rascunho"].includes(p.stage))
    .reduce((s, p) => s + p.budgetTotal, 0);

  const myOrgs = await db
    .select({ id: organizations.id, nome: organizations.nome })
    .from(organizations)
    .innerJoin(
      organizationMembers,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, userId));

  return {
    projects: mappedProjects,
    upcomingPayments,
    pendingReports,
    committedBudget,
    institutions: myOrgs,
  };
}

// ---------------------------------------------------------------------------
// Submissor project detail
// ---------------------------------------------------------------------------

type VersionSnapshotData = {
  metodologia?: string;
  contextoMinisterial?: string;
  tempoMinisterioAnos?: number;
  regiao?: string;
  pais?: string;
  resultadosEsperados?: string;
  beneficiariosQuantidade?: number;
  beneficiariosDescricao?: string;
  cartaRecomendacao?: boolean;
  motivoEmergencial?: string;
  descricao?: string;
  prazoNecessidade?: string;
  riscos?: string;
  parcerias?: string;
};

export type SubmissorProjectDetail = {
  id: string;
  titulo: string;
  stage: string;
  tipo: "anual" | "pontual";
  budgetTotal: number;
  parcelas: number | null;
  evaluationYear: number | null;
  orgNome: string;
  orgResponsavel: string | null;
  ministryRegion: string | null;
  objectives: string | null;
  justification: string | null;
  snapshot: VersionSnapshotData;
  createdAt: Date;
  submitterName: string | null;
  reports: SubmissorReport[];
  versions: SubmissorVersion[];
};

export type SubmissorReport = {
  id: string;
  period: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  dueAt: Date | null;
  status: "pendente" | "em_atraso" | "entregue" | "aceito";
  narrativa: string | null;
  submittedByName: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
};

export type SubmissorVersion = {
  id: string;
  stage: string;
  createdAt: Date;
  createdByName: string;
};

function mapReportStatus(
  dbStatus: string,
  dueDate: string | null,
): "pendente" | "em_atraso" | "entregue" | "aceito" {
  const nowStr = new Date().toISOString().split("T")[0] ?? "";
  if (dbStatus === "submitted") return "entregue";
  if (dbStatus === "approved") return "aceito";
  if (dbStatus === "rejected") return "pendente";
  if (dueDate !== null && dueDate < nowStr) return "em_atraso";
  return "pendente";
}

export async function getSubmissorProjectDetail(
  projectId: string,
  userId: string,
): Promise<SubmissorProjectDetail | null> {
  const rows = await db
    .select({
      id: projects.id,
      title: projects.title,
      stage: projects.stage,
      tipo: projects.tipo,
      budgetTotal: projects.budgetTotal,
      parcelas: projects.parcelas,
      evaluationYear: projects.evaluationYear,
      objectives: projects.objectives,
      justification: projects.justification,
      ministryRegion: projects.ministryRegion,
      createdAt: projects.createdAt,
      orgNome: organizations.nome,
      orgResponsavel: organizations.responsavelLegal,
      submitterName: users.fullName,
    })
    .from(projects)
    .leftJoin(organizations, eq(projects.organizationId, organizations.id))
    .leftJoin(users, eq(projects.submitterId, users.id))
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.submitterId, userId),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);

  const project = rows[0];
  if (!project) return null;

  // Version snapshot (first version contains full form data)
  const versionRows = await db
    .select({
      id: projectVersions.id,
      stage: projectVersions.stage,
      data: projectVersions.data,
      createdAt: projectVersions.createdAt,
      createdByName: users.fullName,
    })
    .from(projectVersions)
    .leftJoin(users, eq(projectVersions.createdBy, users.id))
    .where(eq(projectVersions.projectId, projectId))
    .orderBy(projectVersions.versionNumber);

  const snapshot =
    versionRows.length > 0 ? (versionRows[0]?.data as VersionSnapshotData) : {};

  const submissorVersions: SubmissorVersion[] = versionRows.map((v) => ({
    id: v.id,
    stage: v.stage,
    createdAt: v.createdAt,
    createdByName: v.createdByName ?? "Sistema",
  }));

  // Reports
  const reportRows = await db
    .select({
      id: reports.id,
      content: reports.content,
      status: reports.status,
      dueDate: reports.dueDate,
      periodStart: reports.periodStart,
      periodEnd: reports.periodEnd,
      submittedAt: reports.submittedAt,
      reviewedAt: reports.reviewedAt,
      submitterName: users.fullName,
    })
    .from(reports)
    .leftJoin(users, eq(reports.submittedBy, users.id))
    .where(eq(reports.projectId, projectId))
    .orderBy(reports.dueDate);

  const submissorReports: SubmissorReport[] = reportRows.map((r) => {
    const periodStr =
      r.periodStart !== null
        ? (() => {
            const d = new Date(r.periodStart);
            const q = Math.ceil((d.getMonth() + 1) / 3);
            return `${d.getFullYear()}-Q${q}`;
          })()
        : "—";
    return {
      id: r.id,
      period: periodStr,
      periodStart: r.periodStart !== null ? new Date(r.periodStart) : null,
      periodEnd: r.periodEnd !== null ? new Date(r.periodEnd) : null,
      dueAt: r.dueDate !== null ? new Date(r.dueDate) : null,
      status: mapReportStatus(r.status, r.dueDate),
      narrativa: r.content,
      submittedByName: r.submitterName,
      submittedAt: r.submittedAt,
      reviewedAt: r.reviewedAt,
    };
  });

  return {
    id: project.id,
    titulo: project.title,
    stage: project.stage,
    tipo: project.tipo,
    budgetTotal: parseFloat(project.budgetTotal ?? "0"),
    parcelas: project.parcelas,
    evaluationYear: project.evaluationYear,
    orgNome: project.orgNome ?? "Instituição",
    orgResponsavel: project.orgResponsavel,
    ministryRegion: project.ministryRegion,
    objectives: project.objectives,
    justification: project.justification,
    snapshot,
    createdAt: project.createdAt,
    submitterName: project.submitterName,
    reports: submissorReports,
    versions: submissorVersions,
  };
}

// ---------------------------------------------------------------------------
// Kanban (director pipeline)
// ---------------------------------------------------------------------------

export async function getKanbanProjects(): Promise<CompactProjectView[]> {
  const rows = await db
    .select({
      id: projects.id,
      tipo: projects.tipo,
      stage: projects.stage,
      title: projects.title,
      categorySlug: projectCategories.slug,
      orgNome: organizations.nome,
      submitterName: users.fullName,
      budgetTotal: projects.budgetTotal,
      evaluationYear: projects.evaluationYear,
      scoreAi: projects.scoreAi,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .leftJoin(organizations, eq(projects.organizationId, organizations.id))
    .leftJoin(users, eq(projects.submitterId, users.id))
    .leftJoin(projectCategories, eq(projects.categoryId, projectCategories.id))
    .where(isNull(projects.deletedAt))
    .orderBy(projects.updatedAt);

  const projectIds = rows.map((r) => r.id);

  const pendingCounts =
    projectIds.length > 0
      ? await db
          .select({
            projectId: reports.projectId,
            pendingCount: count(),
          })
          .from(reports)
          .where(
            and(
              inArray(reports.projectId, projectIds),
              eq(reports.status, "pendente"),
            ),
          )
          .groupBy(reports.projectId)
      : [];

  const pendingMap = new Map(
    pendingCounts.map((r) => [r.projectId, r.pendingCount]),
  );

  return rows.map((r) => ({
    id: r.id,
    type: r.tipo,
    stage: r.stage as ProjectStage,
    titulo: r.title,
    categoria: (r.categorySlug ?? "outros") as CompactProjectView["categoria"],
    organizacaoNome: r.orgNome ?? "Instituição",
    submittedByName: r.submitterName ?? "—",
    valorTotal: parseFloat(r.budgetTotal ?? "0"),
    anoReferencia: r.evaluationYear,
    aiScore: r.scoreAi !== null ? parseFloat(r.scoreAi) : null,
    pendingReports: pendingMap.get(r.id) ?? 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

// ---------------------------------------------------------------------------
// Director project detail
// ---------------------------------------------------------------------------

export type DirectorEvaluation = {
  id: string;
  evaluatorName: string;
  recommendation: "sim" | "nao";
  notes: string | null;
  createdAt: Date;
};

export type DirectorContestation = {
  id: string;
  contestantName: string;
  reason: string;
  resolvedAt: Date | null;
};

export type DirectorProjectDetail = {
  id: string;
  titulo: string;
  stage: string;
  tipo: "anual" | "pontual";
  budgetTotal: number;
  parcelas: number | null;
  scoreAi: number | null;
  orgNome: string;
  submitterName: string | null;
  ministryRegion: string | null;
  objectives: string | null;
  expectedResults: string | null;
  categorySlug: string | null;
  createdAt: Date;
  snapshot: VersionSnapshotData;
  compactVersionContent: string | null;
  compactVersionCreatedAt: Date | null;
  voteSummary: {
    projectId: string;
    totalEligible: number;
    totalVoted: number;
    inFavor: number;
    against: number;
    quorumMet: boolean;
    approved: boolean | null;
  } | null;
  hasVoted: boolean;
  evaluations: DirectorEvaluation[];
  contestations: DirectorContestation[];
  versions: SubmissorVersion[];
  pendingReports: number;
};

export async function getDirectorProjectDetail(
  projectId: string,
  currentUserId: string,
): Promise<DirectorProjectDetail | null> {
  const rows = await db
    .select({
      id: projects.id,
      title: projects.title,
      stage: projects.stage,
      tipo: projects.tipo,
      budgetTotal: projects.budgetTotal,
      parcelas: projects.parcelas,
      scoreAi: projects.scoreAi,
      objectives: projects.objectives,
      expectedResults: projects.expectedResults,
      ministryRegion: projects.ministryRegion,
      createdAt: projects.createdAt,
      orgNome: organizations.nome,
      submitterName: users.fullName,
      categorySlug: projectCategories.slug,
    })
    .from(projects)
    .leftJoin(organizations, eq(projects.organizationId, organizations.id))
    .leftJoin(users, eq(projects.submitterId, users.id))
    .leftJoin(projectCategories, eq(projects.categoryId, projectCategories.id))
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  const project = rows[0];
  if (!project) return null;

  // Version snapshots
  const versionRows = await db
    .select({
      id: projectVersions.id,
      stage: projectVersions.stage,
      data: projectVersions.data,
      createdAt: projectVersions.createdAt,
      createdByName: users.fullName,
    })
    .from(projectVersions)
    .leftJoin(users, eq(projectVersions.createdBy, users.id))
    .where(eq(projectVersions.projectId, projectId))
    .orderBy(projectVersions.versionNumber);

  const snapshot =
    versionRows.length > 0 ? (versionRows[0]?.data as VersionSnapshotData) : {};

  const versions: SubmissorVersion[] = versionRows.map((v) => ({
    id: v.id,
    stage: v.stage,
    createdAt: v.createdAt,
    createdByName: v.createdByName ?? "Sistema",
  }));

  // Compact version
  const cvRows = await db
    .select({
      content: compactVersions.content,
      createdAt: compactVersions.createdAt,
    })
    .from(compactVersions)
    .where(eq(compactVersions.projectId, projectId))
    .orderBy(compactVersions.createdAt)
    .limit(1);

  // Evaluations
  const evalRows = await db
    .select({
      id: evaluations.id,
      recommendation: evaluations.recommendation,
      notes: evaluations.notes,
      createdAt: evaluations.createdAt,
      evaluatorName: users.fullName,
    })
    .from(evaluations)
    .leftJoin(users, eq(evaluations.evaluatorId, users.id))
    .where(eq(evaluations.projectId, projectId))
    .orderBy(evaluations.createdAt);

  const mappedEvaluations: DirectorEvaluation[] = evalRows.map((e) => ({
    id: e.id,
    evaluatorName: e.evaluatorName ?? "Avaliador",
    recommendation: e.recommendation === "approved" ? "sim" : "nao",
    notes: e.notes,
    createdAt: e.createdAt,
  }));

  // Contestations
  const cRows = await db
    .select({
      id: contestations.id,
      justification: contestations.justification,
      reviewedAt: contestations.reviewedAt,
      contestantName: users.fullName,
    })
    .from(contestations)
    .leftJoin(users, eq(contestations.userId, users.id))
    .where(eq(contestations.projectId, projectId))
    .orderBy(contestations.createdAt);

  const mappedContestations: DirectorContestation[] = cRows.map((c) => ({
    id: c.id,
    contestantName: c.contestantName ?? "Contestante",
    reason: c.justification,
    resolvedAt: c.reviewedAt,
  }));

  // Vote summary (only relevant when stage is votacao or later)
  let voteSummary: DirectorProjectDetail["voteSummary"] = null;
  let hasVoted = false;

  if (
    ["votacao", "homologacao", "aprovado", "reprovado"].includes(project.stage)
  ) {
    const voteRows = await db
      .select({ value: votes.value, userId: votes.userId })
      .from(votes)
      .where(eq(votes.projectId, projectId));

    const eligibleRows = await db
      .select({ cnt: count() })
      .from(roleAssignments)
      .where(inArray(roleAssignments.role, ["diretor", "conselheiro"]));

    const totalEligible = eligibleRows[0]?.cnt ?? 0;
    const totalVoted = voteRows.length;
    const inFavor = voteRows.filter((v) => v.value).length;
    const against = totalVoted - inFavor;
    const quorumMet = totalVoted >= Math.ceil(totalEligible / 2);
    const approved = quorumMet ? inFavor > against : null;

    hasVoted = voteRows.some((v) => v.userId === currentUserId);

    voteSummary = {
      projectId,
      totalEligible,
      totalVoted,
      inFavor,
      against,
      quorumMet,
      approved,
    };
  }

  // Pending reports count
  const pendingReportCount = await db
    .select({ cnt: count() })
    .from(reports)
    .where(
      and(eq(reports.projectId, projectId), eq(reports.status, "pendente")),
    );

  return {
    id: project.id,
    titulo: project.title,
    stage: project.stage,
    tipo: project.tipo,
    budgetTotal: parseFloat(project.budgetTotal ?? "0"),
    parcelas: project.parcelas,
    scoreAi: project.scoreAi !== null ? parseFloat(project.scoreAi) : null,
    orgNome: project.orgNome ?? "Instituição",
    submitterName: project.submitterName,
    ministryRegion: project.ministryRegion,
    objectives: project.objectives,
    expectedResults: project.expectedResults,
    categorySlug: project.categorySlug,
    createdAt: project.createdAt,
    snapshot,
    compactVersionContent: cvRows[0]?.content ?? null,
    compactVersionCreatedAt: cvRows[0]?.createdAt ?? null,
    voteSummary,
    hasVoted,
    evaluations: mappedEvaluations,
    contestations: mappedContestations,
    versions,
    pendingReports: pendingReportCount[0]?.cnt ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Meeting BI data
// ---------------------------------------------------------------------------

export type MeetingBIData = {
  activeProjectsCount: number;
  totalBudgetActive: number;
  pendingReportsCount: number;
  inVotacaoCount: number;
  inValidacaoCount: number;
  inExecucaoCount: number;
  approvedCount: number;
};

export async function getMeetingBIData(): Promise<MeetingBIData> {
  const rows = await db
    .select({
      stage: projects.stage,
      budgetTotal: projects.budgetTotal,
    })
    .from(projects)
    .where(isNull(projects.deletedAt));

  const activeStages = new Set([
    "em_execucao",
    "aprovado",
    "homologacao",
    "votacao",
    "validacao",
  ]);

  let totalBudgetActive = 0;
  let inVotacaoCount = 0;
  let inValidacaoCount = 0;
  let inExecucaoCount = 0;
  let approvedCount = 0;
  let activeProjectsCount = 0;

  for (const r of rows) {
    if (activeStages.has(r.stage)) {
      activeProjectsCount++;
      totalBudgetActive += parseFloat(r.budgetTotal ?? "0");
    }
    if (r.stage === "votacao") inVotacaoCount++;
    if (r.stage === "validacao") inValidacaoCount++;
    if (r.stage === "em_execucao") inExecucaoCount++;
    if (r.stage === "aprovado") approvedCount++;
  }

  const pendingReportResult = await db
    .select({ cnt: count() })
    .from(reports)
    .where(eq(reports.status, "pendente"));

  return {
    activeProjectsCount,
    totalBudgetActive,
    pendingReportsCount: pendingReportResult[0]?.cnt ?? 0,
    inVotacaoCount,
    inValidacaoCount,
    inExecucaoCount,
    approvedCount,
  };
}

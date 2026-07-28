"use server";

import { db } from "@hebron/db/client";
import { cookies } from "next/headers";
import { createSupabaseServerActionClient } from "@hebron/auth/server";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  and,
  count,
  countDistinct,
  eq,
  gte,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";
import {
  compactVersions,
  contestations,
  evaluations,
  meetingSessions,
  organizationMembers,
  organizations,
  paymentSchedules,
  projectCategories,
  projectVersions,
  projects,
  reportAttachments,
  reports,
  roleAssignments,
  users,
  votes,
} from "@hebron/db/schema";
import type {
  CompactProjectView,
  MeetingAgenda,
  MeetingAgendaItem,
  ProjectStage,
} from "@hebron/types";
import { getEditalPrefill as getEditalPrefillRaw } from "@hebron/integrations/documentos-projetos";
import type { EditalPrefill } from "@hebron/integrations/documentos-projetos";
import { BRL } from "./stage-utils";

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

  return withAuthenticatedContext({ actorId: authUser.id }, (tx) =>
    tx
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
      .where(eq(organizationMembers.userId, authUser.id)),
  );
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
  return withAuthenticatedContext({ actorId: userId }, async (tx) => {
    const projectRows = await tx
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
        ? await tx
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
        ? await tx
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
        ? await tx
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

    // Número da parcela = quantas vencem antes dela no mesmo projeto. Uma
    // única consulta agrupada por (projeto, vencimento) substitui o COUNT por
    // linha que rodava aqui (N+1, P-9.3); a soma dos anteriores é feita em
    // memória, como no restante deste arquivo.
    const payProjectIds = [...new Set(paymentRows.map((p) => p.projectId))];
    const scheduleDateRows =
      payProjectIds.length > 0
        ? await tx
            .select({
              projectId: paymentSchedules.projectId,
              dueDate: paymentSchedules.dueDate,
              cnt: count(),
            })
            .from(paymentSchedules)
            .where(inArray(paymentSchedules.projectId, payProjectIds))
            .groupBy(paymentSchedules.projectId, paymentSchedules.dueDate)
        : [];

    const datesByProject = new Map<
      string,
      { dueDate: string; cnt: number }[]
    >();
    for (const row of scheduleDateRows) {
      const list = datesByProject.get(row.projectId) ?? [];
      list.push({ dueDate: row.dueDate, cnt: row.cnt });
      datesByProject.set(row.projectId, list);
    }

    const upcomingPayments: DashboardPayment[] = [];
    for (const pay of paymentRows) {
      const parcelsBefore = (datesByProject.get(pay.projectId) ?? []).reduce(
        (sum, row) => (row.dueDate < pay.dueDate ? sum + row.cnt : sum),
        0,
      );
      const parcelNum = parcelsBefore + 1;
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
        ? await tx
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

    const myOrgs = await tx
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
  });
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
  submitterId: string;
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
  return withAuthenticatedContext({ actorId: userId }, async (tx) => {
    const rows = await tx
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
        submitterId: projects.submitterId,
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
    const versionRows = await tx
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
      versionRows.length > 0
        ? (versionRows[0]?.data as VersionSnapshotData)
        : {};

    const submissorVersions: SubmissorVersion[] = versionRows.map((v) => ({
      id: v.id,
      stage: v.stage,
      createdAt: v.createdAt,
      createdByName: v.createdByName ?? "Sistema",
    }));

    // Reports
    const reportRows = await tx
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
      submitterId: project.submitterId,
      snapshot,
      createdAt: project.createdAt,
      submitterName: project.submitterName,
      reports: submissorReports,
      versions: submissorVersions,
    };
  });
}

// ---------------------------------------------------------------------------
// Kanban (director pipeline)
// ---------------------------------------------------------------------------

export async function getKanbanProjects(): Promise<CompactProjectView[]> {
  const authUser = await getAuthUser();
  if (!authUser) return [];

  return withAuthenticatedContext({ actorId: authUser.id }, async (tx) => {
    const rows = await tx
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
      .leftJoin(
        projectCategories,
        eq(projects.categoryId, projectCategories.id),
      )
      .where(isNull(projects.deletedAt))
      .orderBy(projects.updatedAt);

    const projectIds = rows.map((r) => r.id);

    const pendingCounts =
      projectIds.length > 0
        ? await tx
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
      categoria: (r.categorySlug ??
        "outros") as CompactProjectView["categoria"],
      organizacaoNome: r.orgNome ?? "Instituição",
      submittedByName: r.submitterName ?? "—",
      valorTotal: parseFloat(r.budgetTotal ?? "0"),
      anoReferencia: r.evaluationYear,
      aiScore: r.scoreAi !== null ? parseFloat(r.scoreAi) : null,
      pendingReports: pendingMap.get(r.id) ?? 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  });
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

// Mapeamento exaustivo (checado pelo compilador): se o enum do banco ganhar
// um novo valor, este objeto literal para de compilar em vez de silenciosamente
// coagir o valor novo em "nao" (P-2.1b — era o defeito de queries.ts:780).
const RECOMMENDATION_LABEL: Record<"approved" | "rejected", "sim" | "nao"> = {
  approved: "sim",
  rejected: "nao",
};

export type DirectorContestation = {
  id: string;
  contestantName: string;
  reason: string;
  resolvedAt: Date | null;
};

export type DirectorReport = {
  id: string;
  period: string;
  status: string;
  dueDate: string | null;
  submittedAt: Date | null;
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
  submitterId: string;
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
  reports: DirectorReport[];
  versions: SubmissorVersion[];
  pendingReports: number;
};

export async function getDirectorProjectDetail(
  projectId: string,
  currentUserId: string,
): Promise<DirectorProjectDetail | null> {
  return withAuthenticatedContext({ actorId: currentUserId }, async (tx) => {
    const rows = await tx
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
        submitterId: projects.submitterId,
        orgNome: organizations.nome,
        submitterName: users.fullName,
        categorySlug: projectCategories.slug,
      })
      .from(projects)
      .leftJoin(organizations, eq(projects.organizationId, organizations.id))
      .leftJoin(users, eq(projects.submitterId, users.id))
      .leftJoin(
        projectCategories,
        eq(projects.categoryId, projectCategories.id),
      )
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    const project = rows[0];
    if (!project) return null;

    // Version snapshots
    const versionRows = await tx
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
      versionRows.length > 0
        ? (versionRows[0]?.data as VersionSnapshotData)
        : {};

    const versions: SubmissorVersion[] = versionRows.map((v) => ({
      id: v.id,
      stage: v.stage,
      createdAt: v.createdAt,
      createdByName: v.createdByName ?? "Sistema",
    }));

    // Compact version
    const cvRows = await tx
      .select({
        content: compactVersions.content,
        createdAt: compactVersions.createdAt,
      })
      .from(compactVersions)
      .where(eq(compactVersions.projectId, projectId))
      .orderBy(compactVersions.createdAt)
      .limit(1);

    // Evaluations
    const evalRows = await tx
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

    const mappedEvaluations: DirectorEvaluation[] = evalRows
      .filter(
        (e): e is typeof e & { recommendation: "approved" | "rejected" } =>
          e.recommendation !== null,
      )
      .map((e) => ({
        id: e.id,
        evaluatorName: e.evaluatorName ?? "Avaliador",
        recommendation: RECOMMENDATION_LABEL[e.recommendation],
        notes: e.notes,
        createdAt: e.createdAt,
      }));

    // Contestations
    const cRows = await tx
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

    // Reports
    const reportRows = await tx
      .select({
        id: reports.id,
        status: reports.status,
        dueDate: reports.dueDate,
        periodStart: reports.periodStart,
        submittedAt: reports.submittedAt,
      })
      .from(reports)
      .where(eq(reports.projectId, projectId))
      .orderBy(reports.dueDate);

    const mappedReports: DirectorReport[] = reportRows.map((r) => {
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
        status: r.status,
        dueDate: r.dueDate,
        submittedAt: r.submittedAt,
      };
    });

    // Vote summary (only relevant when stage is votacao or later)
    let voteSummary: DirectorProjectDetail["voteSummary"] = null;
    let hasVoted = false;

    if (
      ["votacao", "homologacao", "aprovado", "reprovado"].includes(
        project.stage,
      )
    ) {
      const voteRows = await tx
        .select({ value: votes.value, userId: votes.userId })
        .from(votes)
        .where(eq(votes.projectId, projectId));

      // Quórum conta PESSOAS distintas, não atribuições de papel (F2-P5:
      // um usuário com diretor+conselheiro contava duas vezes).
      const eligibleRows = await tx
        .select({ cnt: countDistinct(roleAssignments.userId) })
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
    const pendingReportCount = await tx
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
      submitterId: project.submitterId,
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
      reports: mappedReports,
      versions,
      pendingReports: pendingReportCount[0]?.cnt ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Evaluators (diretoria)
// ---------------------------------------------------------------------------

export type EvaluatorOption = { id: string; fullName: string | null };

/** Diretores e conselheiros elegíveis para designação como avaliador. */
export async function getEligibleEvaluators(
  projectId: string,
): Promise<EvaluatorOption[]> {
  const authUser = await getAuthUser();
  if (!authUser) return [];

  return withAuthenticatedContext({ actorId: authUser.id }, async (tx) => {
    const alreadyAssigned = await tx
      .select({ evaluatorId: evaluations.evaluatorId })
      .from(evaluations)
      .where(eq(evaluations.projectId, projectId));
    const assignedIds = new Set(alreadyAssigned.map((r) => r.evaluatorId));

    const rows = await tx
      .selectDistinct({ id: users.id, fullName: users.fullName })
      .from(users)
      .innerJoin(roleAssignments, eq(roleAssignments.userId, users.id))
      .where(inArray(roleAssignments.role, ["diretor", "conselheiro"]));

    return rows.filter((r) => !assignedIds.has(r.id));
  });
}

/** Avaliação pendente designada ao usuário atual para este projeto, se houver. */
export async function getMyPendingEvaluation(
  projectId: string,
  actorId: string,
): Promise<{ id: string } | null> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const rows = await tx
      .select({ id: evaluations.id })
      .from(evaluations)
      .where(
        and(
          eq(evaluations.projectId, projectId),
          eq(evaluations.evaluatorId, actorId),
          isNull(evaluations.submittedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  });
}

// ---------------------------------------------------------------------------
// Reports overview (diretoria)
// ---------------------------------------------------------------------------

export type ReportOverviewRow = {
  id: string;
  projectId: string;
  projectTitle: string;
  orgNome: string;
  status: string;
  dueDate: string | null;
  submittedAt: Date | null;
};

export async function getDirectorReportsOverview(): Promise<
  ReportOverviewRow[]
> {
  const authUser = await getAuthUser();
  if (!authUser) return [];

  return withAuthenticatedContext({ actorId: authUser.id }, async (tx) => {
    const rows = await tx
      .select({
        id: reports.id,
        projectId: reports.projectId,
        projectTitle: projects.title,
        orgNome: organizations.nome,
        status: reports.status,
        dueDate: reports.dueDate,
        submittedAt: reports.submittedAt,
      })
      .from(reports)
      .innerJoin(projects, eq(reports.projectId, projects.id))
      .leftJoin(organizations, eq(projects.organizationId, organizations.id))
      .where(isNull(projects.deletedAt))
      .orderBy(reports.dueDate);

    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      projectTitle: r.projectTitle,
      orgNome: r.orgNome ?? "Instituição",
      status: r.status,
      dueDate: r.dueDate,
      submittedAt: r.submittedAt,
    }));
  });
}

export type ReportAttachmentRow = {
  id: string;
  fileUrl: string;
  fileName: string;
};

/** Anexos de um relatório submetido — usado na revisão pela diretoria. */
export async function getReportAttachments(
  reportId: string,
): Promise<ReportAttachmentRow[]> {
  const authUser = await getAuthUser();
  if (!authUser) return [];

  return withAuthenticatedContext({ actorId: authUser.id }, (tx) =>
    tx
      .select({
        id: reportAttachments.id,
        fileUrl: reportAttachments.fileUrl,
        fileName: reportAttachments.fileName,
      })
      .from(reportAttachments)
      .where(eq(reportAttachments.reportId, reportId)),
  );
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
  /** Parcelas pendentes ainda a vencer no ano-calendário corrente, somadas
   * entre os projetos anuais em execução (critério "meses restantes" de
   * P-2.3). */
  mesesRestantesAnoCalendario: number;
};

export async function getMeetingBIData(): Promise<MeetingBIData> {
  const authUser = await getAuthUser();
  if (!authUser) {
    return {
      activeProjectsCount: 0,
      totalBudgetActive: 0,
      pendingReportsCount: 0,
      inVotacaoCount: 0,
      inValidacaoCount: 0,
      inExecucaoCount: 0,
      approvedCount: 0,
      mesesRestantesAnoCalendario: 0,
    };
  }

  return withAuthenticatedContext({ actorId: authUser.id }, async (tx) => {
    const rows = await tx
      .select({
        id: projects.id,
        tipo: projects.tipo,
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
    const anualEmExecucaoIds: string[] = [];

    for (const r of rows) {
      if (activeStages.has(r.stage)) {
        activeProjectsCount++;
        totalBudgetActive += parseFloat(r.budgetTotal ?? "0");
      }
      if (r.stage === "votacao") inVotacaoCount++;
      if (r.stage === "validacao") inValidacaoCount++;
      if (r.stage === "em_execucao") inExecucaoCount++;
      if (r.stage === "aprovado") approvedCount++;
      if (r.stage === "em_execucao" && r.tipo === "anual") {
        anualEmExecucaoIds.push(r.id);
      }
    }

    const pendingReportResult = await tx
      .select({ cnt: count() })
      .from(reports)
      .where(eq(reports.status, "pendente"));

    let mesesRestantesAnoCalendario = 0;
    if (anualEmExecucaoIds.length > 0) {
      const currentYear = new Date().getUTCFullYear();
      const yearEnd = `${currentYear}-12-31`;

      const remainingResult = await tx
        .select({ cnt: count() })
        .from(paymentSchedules)
        .where(
          and(
            inArray(paymentSchedules.projectId, anualEmExecucaoIds),
            eq(paymentSchedules.status, "pendente"),
            sql`${paymentSchedules.dueDate} <= ${yearEnd}`,
          ),
        );
      mesesRestantesAnoCalendario = remainingResult[0]?.cnt ?? 0;
    }

    return {
      activeProjectsCount,
      totalBudgetActive,
      pendingReportsCount: pendingReportResult[0]?.cnt ?? 0,
      inVotacaoCount,
      inValidacaoCount,
      inExecucaoCount,
      approvedCount,
      mesesRestantesAnoCalendario,
    };
  });
}

// ---------------------------------------------------------------------------
// Meeting agenda (pauta) — projetos pontuais aguardando deliberação
// ---------------------------------------------------------------------------

export async function getMeetingAgenda(): Promise<MeetingAgenda | null> {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  return withAuthenticatedContext({ actorId: authUser.id }, async (tx) => {
    const sessionRows = await tx
      .select({
        id: meetingSessions.id,
        date: meetingSessions.date,
        type: meetingSessions.type,
        status: meetingSessions.status,
        chairUserId: meetingSessions.chairUserId,
        chairName: users.fullName,
        createdAt: meetingSessions.createdAt,
        updatedAt: meetingSessions.updatedAt,
      })
      .from(meetingSessions)
      .leftJoin(users, eq(meetingSessions.chairUserId, users.id))
      .where(
        and(
          eq(meetingSessions.status, "scheduled"),
          gte(meetingSessions.date, new Date()),
        ),
      )
      .orderBy(meetingSessions.date)
      .limit(1);

    const session = sessionRows[0];
    if (!session) return null;

    const pontualRows = await tx
      .select({
        id: projects.id,
        title: projects.title,
        budgetTotal: projects.budgetTotal,
        orgNome: organizations.nome,
        categoryName: projectCategories.name,
      })
      .from(projects)
      .leftJoin(organizations, eq(projects.organizationId, organizations.id))
      .leftJoin(
        projectCategories,
        eq(projects.categoryId, projectCategories.id),
      )
      .where(
        and(
          eq(projects.tipo, "pontual"),
          inArray(projects.stage, ["validacao", "votacao", "homologacao"]),
          isNull(projects.deletedAt),
        ),
      )
      .orderBy(projects.createdAt);

    const items: MeetingAgendaItem[] = pontualRows.map((p, index) => ({
      id: p.id,
      order: index + 1,
      title: p.title,
      description: `${p.orgNome ?? "Instituição não informada"} · ${
        p.categoryName ?? "Sem categoria"
      } · ${BRL.format(parseFloat(p.budgetTotal ?? "0"))}`,
      projectId: p.id,
      durationMinutes: null,
    }));

    const meetingTitles: Record<string, string> = {
      mensal: "Reunião Mensal de Diretoria",
      ordinaria: "Reunião Ordinária de Diretoria",
      extraordinaria: "Reunião Extraordinária de Diretoria",
    };

    return {
      id: session.id,
      date: session.date,
      type: session.type,
      status: session.status,
      title: meetingTitles[session.type] ?? "Reunião de Diretoria",
      location: null,
      items,
      minutesText: null,
      closedAt: null,
      chairUserId: session.chairUserId ?? "",
      chairName: session.chairName ?? "A definir",
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  });
}

// ---------------------------------------------------------------------------
// Edital prefill (Documentos → Projetos, F2-P3)
// ---------------------------------------------------------------------------

export async function getEditalPrefillForWizard(
  editalId: string,
): Promise<EditalPrefill | null> {
  return getEditalPrefillRaw(editalId);
}

/**
 * projetos-homologacao.test.ts — runHomologacaoAutoApprove (P-0.14)
 *
 * O executor que faltava para "após 7 dias sem contestação, o projeto será
 * automaticamente aprovado" (AUDIT/01-specs.md:107). Testa: elegibilidade
 * por idade do snapshot de homologação (>=7 dias), bloqueio por
 * contestação, e os efeitos colaterais replicados de
 * transitionProjectStage (payment schedule + cost center + audit).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";

// Sem verificação de domínio no Resend em ambiente de teste — mesmo padrão
// já usado em apps/admin/src/__tests__/actions.test.ts.
vi.mock("@hebron/email", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "mock-notif-id" }),
}));
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  organizations,
  organizationMembers,
  projects,
  projectVersions,
  contestations,
  paymentSchedules,
  costCenters,
  payables,
  auditLog,
} from "@hebron/db/schema";
import { runHomologacaoAutoApprove } from "../crons/projetos";

const IDS = {
  submitter: "faaa0000-0000-0000-0000-000000000001",
  org: "fabb0000-0000-0000-0000-000000000001",
  eligibleProject: "facc0000-0000-0000-0000-000000000001",
  contestedProject: "facc0000-0000-0000-0000-000000000002",
  recentProject: "facc0000-0000-0000-0000-000000000003",
  rejectedProject: "facc0000-0000-0000-0000-000000000004",
  contester: "faaa0000-0000-0000-0000-000000000002",
};

async function insertHomologVersion(
  projectId: string,
  createdAt: Date,
  data: Record<string, unknown> = { _source: "test-fixture" },
) {
  await db.insert(projectVersions).values({
    projectId,
    versionNumber: 1,
    stage: "homologacao",
    data,
    createdBy: IDS.submitter,
    createdAt,
  });
}

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.submitter,
        email: "homolog-sub@test.hebron",
        fullName: "Submissor",
      },
      {
        id: IDS.contester,
        email: "homolog-contest@test.hebron",
        fullName: "Contestador",
      },
    ])
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: IDS.submitter, role: "submissor" })
    .onConflictDoNothing();
  await db
    .insert(organizations)
    .values({ id: IDS.org, nome: "Org Homolog Test", createdBy: IDS.submitter })
    .onConflictDoNothing();
  await db
    .insert(organizationMembers)
    .values({ organizationId: IDS.org, userId: IDS.submitter })
    .onConflictDoNothing();

  const eightDaysAgo = new Date();
  eightDaysAgo.setUTCDate(eightDaysAgo.getUTCDate() - 8);
  const twoDaysAgo = new Date();
  twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);

  await db.insert(projects).values([
    {
      id: IDS.eligibleProject,
      title: "Projeto elegível para aprovação automática",
      tipo: "anual",
      stage: "homologacao",
      submitterId: IDS.submitter,
      organizationId: IDS.org,
      parcelas: 3,
      meses: 3,
      budgetTotal: "9000.00",
      evaluationYear: new Date().getFullYear(),
    },
    {
      id: IDS.contestedProject,
      title: "Projeto contestado — não deve auto-aprovar",
      tipo: "anual",
      stage: "homologacao",
      submitterId: IDS.submitter,
      organizationId: IDS.org,
    },
    {
      id: IDS.recentProject,
      title: "Projeto recente — ainda dentro da janela de 7 dias",
      tipo: "anual",
      stage: "homologacao",
      submitterId: IDS.submitter,
      organizationId: IDS.org,
    },
    {
      id: IDS.rejectedProject,
      title: "Projeto reprovado na votação — não deve auto-aprovar (P-2.8b)",
      tipo: "anual",
      stage: "homologacao",
      submitterId: IDS.submitter,
      organizationId: IDS.org,
    },
  ]);

  await insertHomologVersion(IDS.eligibleProject, eightDaysAgo);
  await insertHomologVersion(IDS.contestedProject, eightDaysAgo);
  await insertHomologVersion(IDS.recentProject, twoDaysAgo);
  // Snapshot como o gravado por castVote/closeVoting/triggerPanicButton
  // (apps/projetos/src/actions/voting.ts) quando a votação REPROVA — sem o
  // fix de P-2.8b, este cron aprovaria por omissão após 7 dias.
  await insertHomologVersion(IDS.rejectedProject, eightDaysAgo, {
    trigger: "vote_complete",
    voteApproved: false,
  });

  await db.insert(contestations).values({
    projectId: IDS.contestedProject,
    userId: IDS.contester,
    justification: "Justificativa de teste com mais de trinta caracteres.",
  });
});

afterAll(async () => {
  // P-3.11: onProjectApproved agora também cria financeiro.payables (FK
  // RESTRICT para payment_schedules e cost_centers) — precisam ser
  // removidos antes das linhas que referenciam, na ordem inversa da criação.
  const [costCenter] = await db
    .select({ id: costCenters.id })
    .from(costCenters)
    .where(eq(costCenters.projectId, IDS.eligibleProject));
  if (costCenter) {
    const createdPayables = await db
      .select({ id: payables.id })
      .from(payables)
      .where(eq(payables.costCenterId, costCenter.id));
    for (const p of createdPayables) {
      await db.delete(auditLog).where(eq(auditLog.entityId, p.id));
    }
    await db.delete(payables).where(eq(payables.costCenterId, costCenter.id));
  }
  await db
    .delete(paymentSchedules)
    .where(eq(paymentSchedules.projectId, IDS.eligibleProject));
  await db
    .delete(costCenters)
    .where(eq(costCenters.projectId, IDS.eligibleProject));
  await db
    .delete(contestations)
    .where(eq(contestations.projectId, IDS.contestedProject));
  await db
    .delete(projectVersions)
    .where(eq(projectVersions.projectId, IDS.eligibleProject));
  await db
    .delete(projectVersions)
    .where(eq(projectVersions.projectId, IDS.contestedProject));
  await db
    .delete(projectVersions)
    .where(eq(projectVersions.projectId, IDS.recentProject));
  await db
    .delete(projectVersions)
    .where(eq(projectVersions.projectId, IDS.rejectedProject));
  await db.delete(projects).where(eq(projects.id, IDS.eligibleProject));
  await db.delete(projects).where(eq(projects.id, IDS.contestedProject));
  await db.delete(projects).where(eq(projects.id, IDS.recentProject));
  await db.delete(projects).where(eq(projects.id, IDS.rejectedProject));
  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.organizationId, IDS.org));
  await db.delete(organizations).where(eq(organizations.id, IDS.org));
  await db.delete(auditLog).where(eq(auditLog.entityId, IDS.eligibleProject));
  await db.delete(auditLog).where(eq(auditLog.entityId, IDS.rejectedProject));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.submitter));
  await db.delete(users).where(eq(users.id, IDS.submitter));
  await db.delete(users).where(eq(users.id, IDS.contester));
});

describe("runHomologacaoAutoApprove", () => {
  it("aprova projeto elegível (>=7 dias, sem contestação) e gera payment schedule + cost center + audit; reprova projeto cuja votação decisiva foi contra (P-2.8b)", async () => {
    const { approved, rejected } = await runHomologacaoAutoApprove();
    expect(approved).toContain(IDS.eligibleProject);
    expect(approved).not.toContain(IDS.contestedProject);
    expect(approved).not.toContain(IDS.recentProject);
    expect(approved).not.toContain(IDS.rejectedProject);
    expect(rejected).toContain(IDS.rejectedProject);

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, IDS.eligibleProject));
    expect(project?.stage).toBe("aprovado");
    expect(project?.approvedAt).toBeTruthy();

    // voteApproved=false não vira aprovação por omissão — confirma a
    // reprovação (não fica preso em homologação nem inverte o resultado).
    const [rejectedRow] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, IDS.rejectedProject));
    expect(rejectedRow?.stage).toBe("reprovado");
    expect(rejectedRow?.approvedAt).toBeNull();

    const rejectedAudit = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, IDS.rejectedProject));
    expect(
      rejectedAudit.some((a) => a.action === "project.stage_transition"),
    ).toBe(true);

    const schedule = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, IDS.eligibleProject));
    expect(schedule.length).toBe(3);

    const [costCenter] = await db
      .select()
      .from(costCenters)
      .where(eq(costCenters.projectId, IDS.eligibleProject));
    expect(costCenter).toBeTruthy();

    const audit = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, IDS.eligibleProject));
    expect(audit.some((a) => a.action === "project.stage_transition")).toBe(
      true,
    );
  });

  it("é idempotente — segunda execução não aprova/reprova de novo (já não está mais em homologacao)", async () => {
    const { approved, rejected } = await runHomologacaoAutoApprove();
    expect(approved).not.toContain(IDS.eligibleProject);
    expect(rejected).not.toContain(IDS.rejectedProject);
  });
});

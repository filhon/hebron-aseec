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
import type * as ProjetosApproval from "@hebron/db/projetos-approval";

// Sem verificação de domínio no Resend em ambiente de teste — mesmo padrão
// já usado em apps/admin/src/__tests__/actions.test.ts.
vi.mock("@hebron/email", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "mock-notif-id" }),
}));

// P-0.14b — para provar a atomicidade é preciso um erro NO MEIO da sequência.
// `approvalFailures` guarda os ids cujo provisionamento financeiro deve
// explodir; os demais passam direto para a implementação real, então o
// caminho feliz continua sendo testado de ponta a ponta.
// `notifyProjectApprovalFailure` é stub: a real notificaria todos os
// super_admins do banco de dev compartilhado.
const { approvalFailures } = vi.hoisted(() => ({
  approvalFailures: new Set<string>(),
}));

vi.mock("@hebron/db/projetos-approval", async (importOriginal) => {
  const actual = await importOriginal<typeof ProjetosApproval>();
  return {
    ...actual,
    onProjectApproved: vi.fn(
      async (
        projectId: string,
        dbHandle?: Parameters<typeof actual.onProjectApproved>[1],
      ) => {
        if (approvalFailures.has(projectId)) {
          throw new Error("falha simulada no provisionamento financeiro");
        }
        await actual.onProjectApproved(projectId, dbHandle);
      },
    ),
    notifyProjectApprovalFailure: vi.fn().mockResolvedValue(undefined),
  };
});

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
import {
  generatePaymentSchedule,
  onProjectApproved,
  notifyProjectApprovalFailure,
} from "@hebron/db/projetos-approval";
import { runHomologacaoAutoApprove } from "../crons/projetos";

const IDS = {
  submitter: "faaa0000-0000-0000-0000-000000000001",
  org: "fabb0000-0000-0000-0000-000000000001",
  eligibleProject: "facc0000-0000-0000-0000-000000000001",
  contestedProject: "facc0000-0000-0000-0000-000000000002",
  recentProject: "facc0000-0000-0000-0000-000000000003",
  rejectedProject: "facc0000-0000-0000-0000-000000000004",
  failingProject: "facc0000-0000-0000-0000-000000000005",
  siblingProject: "facc0000-0000-0000-0000-000000000006",
  directCallProject: "facc0000-0000-0000-0000-000000000007",
  // P-2.18 CORRETIVO: pontual passa a entrar em homologacao (manualmente,
  // via transitionProjectStage — nunca por votação), então o snapshot de
  // entrada nunca tem `voteApproved`. Prova que o cron não depende de haver
  // votos para resolver um pontual.
  pontualEligibleProject: "facc0000-0000-0000-0000-000000000008",
  contester: "faaa0000-0000-0000-0000-000000000002",
};

/**
 * Remove, na ordem inversa da criação, tudo que uma aprovação produz para um
 * projeto (payables → cost center → schedules → versions → audit → project).
 * `payables` tem FK RESTRICT para `payment_schedules` e `cost_centers`.
 */
async function cleanupApprovedProject(projectId: string) {
  const [costCenter] = await db
    .select({ id: costCenters.id })
    .from(costCenters)
    .where(eq(costCenters.projectId, projectId));
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
    .where(eq(paymentSchedules.projectId, projectId));
  await db.delete(costCenters).where(eq(costCenters.projectId, projectId));
  await db
    .delete(projectVersions)
    .where(eq(projectVersions.projectId, projectId));
  await db.delete(auditLog).where(eq(auditLog.entityId, projectId));
  await db.delete(projects).where(eq(projects.id, projectId));
}

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
    {
      id: IDS.pontualEligibleProject,
      title: "Pontual elegível para aprovação automática (P-2.18 CORRETIVO)",
      tipo: "pontual",
      stage: "homologacao",
      submitterId: IDS.submitter,
      organizationId: IDS.org,
      parcelas: 1,
      meses: 1,
      budgetTotal: "3000.00",
      evaluationYear: new Date().getFullYear(),
    },
  ]);

  await insertHomologVersion(IDS.eligibleProject, eightDaysAgo);
  await insertHomologVersion(IDS.contestedProject, eightDaysAgo);
  await insertHomologVersion(IDS.recentProject, twoDaysAgo);
  // Snapshot igual ao gravado por transitionProjectStage (entrada manual,
  // sem voteApproved) — é o caminho real do pontual, que nunca vota.
  await insertHomologVersion(IDS.pontualEligibleProject, eightDaysAgo);
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
  // eligibleProject (anual) e pontualEligibleProject (P-2.18 CORRETIVO)
  // passam ambos pelo provisionamento financeiro.
  for (const projectId of [IDS.eligibleProject, IDS.pontualEligibleProject]) {
    const [costCenter] = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(eq(costCenters.projectId, projectId));
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
      .where(eq(paymentSchedules.projectId, projectId));
    await db.delete(costCenters).where(eq(costCenters.projectId, projectId));
  }
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
  await db
    .delete(projectVersions)
    .where(eq(projectVersions.projectId, IDS.pontualEligibleProject));
  await db.delete(projects).where(eq(projects.id, IDS.eligibleProject));
  await db.delete(projects).where(eq(projects.id, IDS.contestedProject));
  await db.delete(projects).where(eq(projects.id, IDS.recentProject));
  await db.delete(projects).where(eq(projects.id, IDS.rejectedProject));
  await db.delete(projects).where(eq(projects.id, IDS.pontualEligibleProject));
  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.organizationId, IDS.org));
  await db.delete(organizations).where(eq(organizations.id, IDS.org));
  await db.delete(auditLog).where(eq(auditLog.entityId, IDS.eligibleProject));
  await db.delete(auditLog).where(eq(auditLog.entityId, IDS.rejectedProject));
  await db
    .delete(auditLog)
    .where(eq(auditLog.entityId, IDS.pontualEligibleProject));
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

    // P-2.18 CORRETIVO: pontual sem voteApproved no snapshot (nunca votou)
    // ainda assim resolve para aprovado — o cron não depende de haver votos.
    expect(approved).toContain(IDS.pontualEligibleProject);
    const [pontual] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, IDS.pontualEligibleProject));
    expect(pontual?.stage).toBe("aprovado");
    expect(pontual?.approvedAt).toBeTruthy();

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

// ---------------------------------------------------------------------------
// P-0.14b — atomicidade da resolução de homologação.
//
// Antes, cada projeto passava por uma sequência de escritas independentes
// (UPDATE stage, INSERT version, logAudit, onProjectApproved). Uma falha no
// meio deixava o projeto marcado "aprovado" sem snapshot, sem centro de custo
// e sem payables — e o cron nunca reprocessava, porque o projeto já tinha
// saído de `homologacao`. As fixtures deste bloco nascem no `beforeAll` do
// próprio describe (não no do arquivo) para não entrarem no lote dos testes
// acima, que rodam primeiro.
// ---------------------------------------------------------------------------
describe("runHomologacaoAutoApprove — atomicidade (P-0.14b)", () => {
  beforeAll(async () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setUTCDate(eightDaysAgo.getUTCDate() - 8);

    await db.insert(projects).values([
      {
        id: IDS.failingProject,
        title: "Projeto cujo provisionamento financeiro falha",
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
        id: IDS.siblingProject,
        title: "Projeto do mesmo lote — não pode ser afetado pela falha",
        tipo: "anual",
        stage: "homologacao",
        submitterId: IDS.submitter,
        organizationId: IDS.org,
        parcelas: 2,
        meses: 2,
        budgetTotal: "4000.00",
        evaluationYear: new Date().getFullYear(),
      },
    ]);

    await insertHomologVersion(IDS.failingProject, eightDaysAgo);
    await insertHomologVersion(IDS.siblingProject, eightDaysAgo);
  });

  afterAll(async () => {
    approvalFailures.clear();
    await cleanupApprovedProject(IDS.failingProject);
    await cleanupApprovedProject(IDS.siblingProject);
    await cleanupApprovedProject(IDS.directCallProject);
  });

  it("falha no provisionamento financeiro reverte a aprovação inteira e não contamina os demais do lote", async () => {
    approvalFailures.add(IDS.failingProject);

    const { approved } = await runHomologacaoAutoApprove();

    expect(approved).not.toContain(IDS.failingProject);

    // O projeto que falhou não avançou nada: nem stage, nem snapshot, nem
    // schedule, nem centro de custo, nem audit da transição.
    const [failing] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, IDS.failingProject));
    expect(failing?.stage).toBe("homologacao");
    expect(failing?.approvedAt).toBeNull();

    const versions = await db
      .select()
      .from(projectVersions)
      .where(eq(projectVersions.projectId, IDS.failingProject));
    expect(versions.length).toBe(1); // só o snapshot de entrada em homologação
    expect(versions.some((v) => v.stage === "aprovado")).toBe(false);

    const schedules = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, IDS.failingProject));
    expect(schedules.length).toBe(0);

    const failingCostCenters = await db
      .select()
      .from(costCenters)
      .where(eq(costCenters.projectId, IDS.failingProject));
    expect(failingCostCenters.length).toBe(0);

    const failingAudit = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, IDS.failingProject));
    expect(
      failingAudit.some((a) => a.action === "project.stage_transition"),
    ).toBe(false);

    // Falha registrada, não engolida.
    expect(notifyProjectApprovalFailure).toHaveBeenCalledWith(
      IDS.failingProject,
      expect.stringContaining("falha simulada"),
    );

    // O vizinho do mesmo lote foi aprovado normalmente.
    expect(approved).toContain(IDS.siblingProject);
    const [sibling] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, IDS.siblingProject));
    expect(sibling?.stage).toBe("aprovado");

    const siblingSchedules = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, IDS.siblingProject));
    expect(siblingSchedules.length).toBe(2);

    const [siblingCostCenter] = await db
      .select()
      .from(costCenters)
      .where(eq(costCenters.projectId, IDS.siblingProject));
    expect(siblingCostCenter).toBeTruthy();
  });

  it("o projeto que falhou continua elegível e é resolvido na execução seguinte", async () => {
    approvalFailures.delete(IDS.failingProject);

    const { approved } = await runHomologacaoAutoApprove();
    expect(approved).toContain(IDS.failingProject);

    const [failing] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, IDS.failingProject));
    expect(failing?.stage).toBe("aprovado");
    expect(failing?.approvedAt).toBeTruthy();

    const schedules = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, IDS.failingProject));
    expect(schedules.length).toBe(3);

    const [costCenter] = await db
      .select()
      .from(costCenters)
      .where(eq(costCenters.projectId, IDS.failingProject));
    expect(costCenter).toBeTruthy();

    const createdPayables = await db
      .select()
      .from(payables)
      .where(eq(payables.costCenterId, costCenter?.id ?? ""));
    expect(createdPayables.length).toBe(3);

    const versions = await db
      .select()
      .from(projectVersions)
      .where(eq(projectVersions.projectId, IDS.failingProject));
    expect(versions.some((v) => v.stage === "aprovado")).toBe(true);
  });

  it("regressão: chamadas sem handle de transação continuam se comportando igual", async () => {
    // Fora do fluxo do cron (stage já "aprovado", nunca é candidato): exercita
    // exatamente a assinatura antiga, sem o segundo argumento.
    await db.insert(projects).values({
      id: IDS.directCallProject,
      title: "Projeto para chamada direta sem tx",
      tipo: "anual",
      stage: "aprovado",
      submitterId: IDS.submitter,
      organizationId: IDS.org,
      parcelas: 2,
      meses: 2,
      budgetTotal: "1000.00",
      evaluationYear: new Date().getFullYear(),
    });

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, IDS.directCallProject));
    if (!project) throw new Error("fixture não inserida");

    await generatePaymentSchedule(project);
    await onProjectApproved(IDS.directCallProject);

    const schedules = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, IDS.directCallProject));
    expect(schedules.length).toBe(2);
    // Centavos exatos (P-2.6c) preservados pelo novo parâmetro opcional.
    expect(
      schedules.reduce((sum, s) => sum + Math.round(Number(s.amount) * 100), 0),
    ).toBe(100000);

    const [costCenter] = await db
      .select()
      .from(costCenters)
      .where(eq(costCenters.projectId, IDS.directCallProject));
    expect(costCenter).toBeTruthy();

    const createdPayables = await db
      .select()
      .from(payables)
      .where(eq(payables.costCenterId, costCenter?.id ?? ""));
    expect(createdPayables.length).toBe(2);
  });
});

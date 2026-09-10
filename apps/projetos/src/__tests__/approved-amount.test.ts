/**
 * approved-amount.test.ts — Valor aprovado (P-2.15 CORRETIVO)
 *
 * AUDIT/06 §1.1: `projetos.projects` só guardava `budget_total` (o valor
 * PEDIDO). Aprovar R$ 30 mil de um pedido de R$ 50 mil gerava cronograma e
 * `financeiro.payables` de R$ 50 mil — o sistema nunca aprendia o valor
 * efetivamente concedido. Este arquivo cobre o painel de decisão
 * (`registerProjectDecision`), o novo gate de `transitionProjectStage`, o
 * fallback de `generatePaymentSchedule` e o `COALESCE` de
 * `checkOrganizationBudget`.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  organizations,
  projects,
  projectVersions,
  paymentSchedules,
  organizationBudgets,
  costCenters,
  payables,
  auditLog,
} from "@hebron/db/schema";
import { generatePaymentSchedule } from "@hebron/db/projetos-approval";
import {
  checkOrganizationBudget,
  getOrganizationBudgetStatus,
} from "@hebron/integrations/projetos";

// registerProjectDecision/transitionProjectStage rodam pelo pipeline real de
// Server Action (diretorAction) — precisa de sessão mockada, mesmo padrão de
// state-machine.test.ts/voting.test.ts.
const resolveSessionMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));
vi.mock("@hebron/auth/server", () => ({
  resolveSession: (...args: unknown[]) => resolveSessionMock(...args),
}));

const IDS = {
  submitter: "f9aa0000-0000-0000-0000-000000000001",
  diretor: "f9aa0000-0000-0000-0000-000000000002",
  superAdmin: "f9aa0000-0000-0000-0000-000000000003",
  org: "f9bb0000-0000-0000-0000-000000000001",
} as const;

const YEAR = 2033; // ano isolado, sem colisão com outras suítes

// Projeto pontual — pré-decisão em `stage: "homologacao"` (P-2.18
// CORRETIVO: pontual passou a exigir homologação antes de aprovado/
// reprovado, como o anual — validacao só avança para homologacao agora).
// Ator super_admin por convenção deste arquivo, não por necessidade de RLS
// (homologacao já é visível a diretor comum via `projects_select_reviewer`).
const PONTUAL_PARTIAL_ID = "f9cc0000-0000-0000-0000-000000000001";
const PONTUAL_SPLIT_ID = "f9cc0000-0000-0000-0000-000000000002";
const HOMOLOG_NO_DECISION_ID = "f9cc0000-0000-0000-0000-000000000003";
const HOMOLOG_REJECT_ID = "f9cc0000-0000-0000-0000-000000000004";
const GATE_SUBMISSOR_ID = "f9cc0000-0000-0000-0000-000000000005";

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.submitter,
        email: "aa-sub@test.hebron",
        fullName: "AA Submissor",
      },
      { id: IDS.diretor, email: "aa-dir@test.hebron", fullName: "AA Diretor" },
      { id: IDS.superAdmin, email: "aa-adm@test.hebron", fullName: "AA Admin" },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      { userId: IDS.submitter, role: "submissor", grantedBy: IDS.submitter },
      { userId: IDS.diretor, role: "diretor", grantedBy: IDS.submitter },
      {
        userId: IDS.superAdmin,
        role: "super_admin",
        grantedBy: IDS.submitter,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(organizations)
    .values({ id: IDS.org, nome: "Org AA Test", createdBy: IDS.submitter })
    .onConflictDoNothing();

  await db.insert(projects).values([
    {
      id: PONTUAL_PARTIAL_ID,
      title: "Pontual — aprovação parcial",
      tipo: "pontual",
      stage: "homologacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      evaluationYear: YEAR,
      budgetTotal: "50000.00",
      parcelas: 1,
      meses: 1,
    },
    {
      id: PONTUAL_SPLIT_ID,
      title: "Pontual — dividido em parcelas na aprovação",
      tipo: "pontual",
      stage: "homologacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      evaluationYear: YEAR,
      budgetTotal: "100.00",
      parcelas: 1,
      meses: 1,
    },
    {
      id: HOMOLOG_NO_DECISION_ID,
      title: "Anual — homologacao sem decisão",
      tipo: "anual",
      stage: "homologacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      evaluationYear: YEAR,
      budgetTotal: "12000.00",
      parcelas: 1,
      meses: 1,
    },
    {
      id: HOMOLOG_REJECT_ID,
      title: "Anual — reprovado pelo painel",
      tipo: "anual",
      stage: "homologacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      evaluationYear: YEAR,
      budgetTotal: "8000.00",
      parcelas: 1,
      meses: 1,
    },
    {
      id: GATE_SUBMISSOR_ID,
      title: "Anual — gate de papel",
      tipo: "anual",
      stage: "homologacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      evaluationYear: YEAR,
      budgetTotal: "5000.00",
      parcelas: 1,
      meses: 1,
    },
  ]);
});

afterAll(async () => {
  const projectIds = [
    PONTUAL_PARTIAL_ID,
    PONTUAL_SPLIT_ID,
    HOMOLOG_NO_DECISION_ID,
    HOMOLOG_REJECT_ID,
    GATE_SUBMISSOR_ID,
  ];

  for (const projectId of projectIds) {
    const [costCenter] = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(eq(costCenters.projectId, projectId));
    if (costCenter) {
      const orphanPayables = await db
        .select({ id: payables.id })
        .from(payables)
        .where(eq(payables.costCenterId, costCenter.id));
      for (const p of orphanPayables) {
        await db.delete(auditLog).where(eq(auditLog.entityId, p.id));
      }
      await db.delete(payables).where(eq(payables.costCenterId, costCenter.id));
      await db.delete(costCenters).where(eq(costCenters.id, costCenter.id));
    }
    await db
      .delete(paymentSchedules)
      .where(eq(paymentSchedules.projectId, projectId));
    await db.delete(auditLog).where(eq(auditLog.entityId, projectId));
  }

  await db.delete(projects).where(eq(projects.organizationId, IDS.org));
  await db
    .delete(organizationBudgets)
    .where(eq(organizationBudgets.organizationId, IDS.org));
  await db.delete(organizations).where(eq(organizations.id, IDS.org));
  await db.delete(auditLog).where(eq(auditLog.actorId, IDS.diretor));
  await db.delete(auditLog).where(eq(auditLog.actorId, IDS.superAdmin));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.submitter));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.diretor));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.superAdmin));
  await db.delete(users).where(eq(users.id, IDS.submitter));
  await db.delete(users).where(eq(users.id, IDS.diretor));
  await db.delete(users).where(eq(users.id, IDS.superAdmin));
});

// ── generatePaymentSchedule: fallback para projeto anterior à migration ───────

describe("generatePaymentSchedule — fallback budgetTotal (sem approvedAmount)", () => {
  const LEGACY_ID = "f9cc0000-0000-0000-0000-000000000009";

  beforeAll(async () => {
    await db.insert(projects).values({
      id: LEGACY_ID,
      title: "Anual — aprovado antes da migration 0093 (fallback)",
      tipo: "anual",
      stage: "aprovado",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      evaluationYear: YEAR,
      budgetTotal: "1000.00",
      parcelas: 2,
      meses: 2,
      mesesPagamento: [3, 9],
      // approvedAmount/approvedParcelas/approvedMesesPagamento ficam NULL —
      // simula um projeto aprovado antes desta migration.
    });
  });

  afterAll(async () => {
    await db
      .delete(paymentSchedules)
      .where(eq(paymentSchedules.projectId, LEGACY_ID));
    await db.delete(projects).where(eq(projects.id, LEGACY_ID));
  });

  it("projeto sem approvedAmount/approvedParcelas gera cronograma idêntico ao anterior à 0093", async () => {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, LEGACY_ID));
    if (!project) throw new Error("Fixture não encontrada");

    await generatePaymentSchedule(project);

    const rows = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, LEGACY_ID));

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.month).sort((a, b) => a - b)).toEqual([3, 9]);
    const total = rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    expect(total).toBeCloseTo(1000, 2);
  });
});

// ── registerProjectDecision: aprovação parcial (integração real) ─────────────

describe("registerProjectDecision — aprovação parcial de pontual (R$ 50.000 pedido, R$ 30.000 aprovado)", () => {
  it("gera payment_schedules e financeiro.payables somando exatamente o valor aprovado", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.superAdmin,
      roles: ["super_admin"],
    });
    const { registerProjectDecision } = await import("../actions/projects");
    const result = await registerProjectDecision({
      projectId: PONTUAL_PARTIAL_ID,
      decision: "aprovado",
      approvedAmount: 30000,
      notes: "Aprovado parcialmente — orçamento reduzido pela diretoria.",
    });

    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select({
        stage: projects.stage,
        approvedAmount: projects.approvedAmount,
        budgetTotal: projects.budgetTotal,
        approvedBy: projects.approvedBy,
        approvedDecisionAt: projects.approvedDecisionAt,
      })
      .from(projects)
      .where(eq(projects.id, PONTUAL_PARTIAL_ID));

    expect(row?.stage).toBe("aprovado");
    expect(row?.approvedAmount).toBe("30000.00");
    expect(row?.budgetTotal).toBe("50000.00"); // o pedido original não muda
    expect(row?.approvedBy).toBe(IDS.superAdmin);
    expect(row?.approvedDecisionAt).not.toBeNull();

    const versions = await db
      .select()
      .from(projectVersions)
      .where(eq(projectVersions.projectId, PONTUAL_PARTIAL_ID));
    expect(versions.some((v) => v.stage === "aprovado")).toBe(true);

    const schedules = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, PONTUAL_PARTIAL_ID));
    const scheduleTotal = schedules.reduce(
      (sum, s) => sum + parseFloat(s.amount),
      0,
    );
    expect(scheduleTotal).toBeCloseTo(30000, 2);

    const [costCenter] = await db
      .select()
      .from(costCenters)
      .where(eq(costCenters.projectId, PONTUAL_PARTIAL_ID));
    if (!costCenter) throw new Error("Centro de custo não criado");
    expect(costCenter.budgetTotal).toBe("30000.00");

    const createdPayables = await db
      .select()
      .from(payables)
      .where(eq(payables.costCenterId, costCenter.id));
    const payableTotal = createdPayables.reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0,
    );
    expect(payableTotal).toBeCloseTo(30000, 2);

    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, PONTUAL_PARTIAL_ID));
    const decisionAudit = audits.find(
      (a) => a.action === "project.decision_registered",
    );
    expect(decisionAudit).toBeTruthy();
    expect(JSON.stringify(decisionAudit?.diff)).toContain("30000.00");
    expect(JSON.stringify(decisionAudit?.diff)).toContain("50000.00");
  });
});

describe("registerProjectDecision — pontual dividido em parcelas na aprovação (Q54)", () => {
  it("gera 3 parcelas nos meses escolhidos, somando o valor aprovado ao centavo", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.superAdmin,
      roles: ["super_admin"],
    });
    const { registerProjectDecision } = await import("../actions/projects");
    const result = await registerProjectDecision({
      projectId: PONTUAL_SPLIT_ID,
      decision: "aprovado",
      approvedAmount: 100,
      approvedParcelas: 3,
      approvedMesesPagamento: [2, 5, 8],
    });

    expect(result?.serverError).toBeUndefined();

    const schedules = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, PONTUAL_SPLIT_ID));

    expect(schedules).toHaveLength(3);
    expect(schedules.map((s) => s.month).sort((a, b) => a - b)).toEqual([
      2, 5, 8,
    ]);
    const total = schedules.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    expect(total).toBeCloseTo(100, 2);
  });
});

// ── transitionProjectStage: bloqueio sem decisão registrada ───────────────────

describe("transitionProjectStage — recusa '→ aprovado' sem decisão registrada", () => {
  it("homologacao → aprovado via transitionProjectStage falha com erro de negócio", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.diretor,
      roles: ["diretor"],
    });
    const { transitionProjectStage } = await import("../actions/projects");
    const result = await transitionProjectStage({
      projectId: HOMOLOG_NO_DECISION_ID,
      toStage: "aprovado",
    });

    expect(result?.serverError).toBeDefined();

    const [row] = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, HOMOLOG_NO_DECISION_ID));
    expect(row?.stage).toBe("homologacao");
  });
});

// ── registerProjectDecision: reprovação e gate de papel ───────────────────────

describe("registerProjectDecision — reprovação e RLS/gate por papel", () => {
  it("diretor grava a decisão de reprovação pela action (projeto visível via RLS em homologacao)", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.diretor,
      roles: ["diretor"],
    });
    const { registerProjectDecision } = await import("../actions/projects");
    const result = await registerProjectDecision({
      projectId: HOMOLOG_REJECT_ID,
      decision: "reprovado",
      notes: "Fora de escopo estatutário.",
    });

    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select({
        stage: projects.stage,
        approvedAmount: projects.approvedAmount,
        approvedBy: projects.approvedBy,
        approvedNotes: projects.approvedNotes,
      })
      .from(projects)
      .where(eq(projects.id, HOMOLOG_REJECT_ID));

    expect(row?.stage).toBe("reprovado");
    expect(row?.approvedAmount).toBeNull(); // reprovado não aprova valor algum
    expect(row?.approvedBy).toBe(IDS.diretor);
    expect(row?.approvedNotes).toBe("Fora de escopo estatutário.");
  });

  it("submissor não pode registrar decisão — gate de diretorAction recusa antes de tocar o banco", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.submitter,
      roles: ["submissor"],
    });
    const { registerProjectDecision } = await import("../actions/projects");
    const result = await registerProjectDecision({
      projectId: GATE_SUBMISSOR_ID,
      decision: "aprovado",
      approvedAmount: 5000,
    });

    expect(result?.serverError).toBeDefined();

    const [row] = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, GATE_SUBMISSOR_ID));
    expect(row?.stage).toBe("homologacao"); // inalterado
  });
});

// ── checkOrganizationBudget: COALESCE(approved_amount, budget_total) ─────────

describe("checkOrganizationBudget/getOrganizationBudgetStatus — considera o valor aprovado", () => {
  const BUDGET_YEAR = YEAR + 1; // isolado dos testes de decisão acima
  const APPROVED_ID = "f9cc0000-0000-0000-0000-000000000006";
  const PENDING_ID = "f9cc0000-0000-0000-0000-000000000007";

  beforeAll(async () => {
    await db.insert(organizationBudgets).values({
      organizationId: IDS.org,
      year: BUDGET_YEAR,
      amount: "50000.00",
      createdBy: IDS.submitter,
    });
    await db.insert(projects).values([
      {
        id: APPROVED_ID,
        title: "Projeto já aprovado parcialmente",
        tipo: "anual",
        stage: "aprovado",
        organizationId: IDS.org,
        submitterId: IDS.submitter,
        evaluationYear: BUDGET_YEAR,
        budgetTotal: "80000.00", // pedido — NÃO deve entrar no cálculo
        approvedAmount: "20000.00",
      },
      {
        id: PENDING_ID,
        title: "Projeto ainda sem decisão",
        tipo: "anual",
        stage: "homologacao",
        organizationId: IDS.org,
        submitterId: IDS.submitter,
        evaluationYear: BUDGET_YEAR,
        budgetTotal: "10000.00", // sem approvedAmount — fallback budgetTotal
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(projects).where(eq(projects.id, APPROVED_ID));
    await db.delete(projects).where(eq(projects.id, PENDING_ID));
    await db
      .delete(organizationBudgets)
      .where(eq(organizationBudgets.organizationId, IDS.org));
  });

  it("comprometido soma approvedAmount do aprovado + budgetTotal do pendente (30.000, não 90.000)", async () => {
    const status = await getOrganizationBudgetStatus(IDS.org, BUDGET_YEAR);
    expect(status.limit).toBe(50000);
    expect(status.committed).toBe(30000);
  });

  it("passa quando comprometido (30.000) + novo cabe no teto (50.000)", async () => {
    await expect(
      checkOrganizationBudget(IDS.org, BUDGET_YEAR, 15000),
    ).resolves.toBeUndefined();
  });

  it("bloqueia quando comprometido (30.000) + novo excede o teto (50.000)", async () => {
    await expect(
      checkOrganizationBudget(IDS.org, BUDGET_YEAR, 25000),
    ).rejects.toThrow(/Orçamento da instituição excedido/);
  });

  it("excludeProjectId evita contar o próprio projeto em decisão duas vezes", async () => {
    // Sem excluir APPROVED_ID, o comprometido incluiria seus 20.000 de novo.
    await expect(
      checkOrganizationBudget(IDS.org, BUDGET_YEAR, 20000, APPROVED_ID),
    ).resolves.toBeUndefined(); // 10.000 (pendente) + 20.000 (novo) = 30.000 ≤ 50.000
  });
});

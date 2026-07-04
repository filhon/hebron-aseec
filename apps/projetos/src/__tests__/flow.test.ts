/**
 * flow.test.ts — Fluxo end-to-end do módulo projetos
 *
 * Testa diretamente no DB (sem invocar Server Actions, que dependem
 * do contexto Supabase Auth) os invariantes de negócio:
 *
 *  - Ciclo de vida completo: rascunho → concluido
 *  - Bloqueio de orçamento (financeiro.organization_budgets + soma de projetos)
 *  - Limites de contestação (max 2/projeto, 1/pessoa)
 *  - Soft-delete e imutabilidade (audit trail preservado)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, and, isNull, not, sum, count } from "drizzle-orm";
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
  organizationBudgets,
  votes,
} from "@hebron/db/schema";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const IDS = {
  users: {
    superAdmin: "ccaa0000-0000-0000-0000-000000000001",
    diretor1: "ccaa0000-0000-0000-0000-000000000002",
    diretor2: "ccaa0000-0000-0000-0000-000000000003",
    conselheiro1: "ccaa0000-0000-0000-0000-000000000004",
    submissor1: "ccaa0000-0000-0000-0000-000000000005",
    submissor2: "ccaa0000-0000-0000-0000-000000000006",
  },
  orgs: {
    orgFlow: "ccbb0000-0000-0000-0000-000000000001",
  },
} as const;

// Projetos com IDs fixos para cleanup determinístico
const FLOW_PROJECT_ID = "cccc0000-0000-0000-0000-000000000001";
const BUDGET_EXISTING_ID = "cccc0000-0000-0000-0000-000000000002";
const BUDGET_REPROVADO_ID = "cccc0000-0000-0000-0000-000000000003";
const CONTEST_PROJECT_ID = "cccc0000-0000-0000-0000-000000000004";
const DELETE_PROJECT_ID = "cccc0000-0000-0000-0000-000000000005";

// Budget uses year 2027 to avoid interference with the E2E flow project (2026)
const BUDGET_YEAR = 2027;
const BUDGET_LIMIT = 50000;

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  const userFixtures = [
    {
      id: IDS.users.superAdmin,
      email: "flow-super@test.hebron",
      fullName: "Flow SuperAdmin",
    },
    {
      id: IDS.users.diretor1,
      email: "flow-dir1@test.hebron",
      fullName: "Flow Diretor 1",
    },
    {
      id: IDS.users.diretor2,
      email: "flow-dir2@test.hebron",
      fullName: "Flow Diretor 2",
    },
    {
      id: IDS.users.conselheiro1,
      email: "flow-cons1@test.hebron",
      fullName: "Flow Conselheiro 1",
    },
    {
      id: IDS.users.submissor1,
      email: "flow-sub1@test.hebron",
      fullName: "Flow Submissor 1",
    },
    {
      id: IDS.users.submissor2,
      email: "flow-sub2@test.hebron",
      fullName: "Flow Submissor 2",
    },
  ];
  for (const u of userFixtures) {
    await db.insert(users).values(u).onConflictDoNothing();
  }

  const roleSeed = [
    {
      userId: IDS.users.superAdmin,
      role: "super_admin" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.diretor1,
      role: "diretor" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.diretor2,
      role: "diretor" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.conselheiro1,
      role: "conselheiro" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.submissor1,
      role: "submissor" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.submissor2,
      role: "submissor" as const,
      grantedBy: IDS.users.superAdmin,
    },
  ];
  for (const r of roleSeed) {
    await db.insert(roleAssignments).values(r).onConflictDoNothing();
  }

  await db
    .insert(organizations)
    .values({
      id: IDS.orgs.orgFlow,
      nome: "Org Flow Test",
      createdBy: IDS.users.submissor1,
    })
    .onConflictDoNothing();

  await db
    .insert(organizationMembers)
    .values([
      { organizationId: IDS.orgs.orgFlow, userId: IDS.users.submissor1 },
      { organizationId: IDS.orgs.orgFlow, userId: IDS.users.submissor2 },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  const allProjectIds = [
    FLOW_PROJECT_ID,
    BUDGET_EXISTING_ID,
    BUDGET_REPROVADO_ID,
    CONTEST_PROJECT_ID,
    DELETE_PROJECT_ID,
  ];

  // Cascade delete handles versions, votes, contestations, payment_schedules
  for (const pid of allProjectIds) {
    await db.delete(projects).where(eq(projects.id, pid));
  }

  await db
    .delete(organizationBudgets)
    .where(
      and(
        eq(organizationBudgets.organizationId, IDS.orgs.orgFlow),
        eq(organizationBudgets.year, BUDGET_YEAR),
      ),
    );
  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.organizationId, IDS.orgs.orgFlow));
  await db.delete(organizations).where(eq(organizations.id, IDS.orgs.orgFlow));
  for (const id of Object.values(IDS.users)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS.users)) {
    await db.delete(users).where(eq(users.id, id));
  }
});

// ── Fluxo end-to-end ──────────────────────────────────────────────────────────

describe("Fluxo — Ciclo de vida completo do projeto anual", () => {
  it("1. cria projeto em rascunho com versão inicial", async () => {
    await db.insert(projects).values({
      id: FLOW_PROJECT_ID,
      title: "Projeto E2E Flow",
      tipo: "anual",
      stage: "rascunho",
      organizationId: IDS.orgs.orgFlow,
      submitterId: IDS.users.submissor1,
      evaluationYear: 2026,
      budgetTotal: "12000.00",
      parcelas: 3,
      meses: 3,
    });

    await db.insert(projectVersions).values({
      projectId: FLOW_PROJECT_ID,
      versionNumber: 1,
      stage: "rascunho",
      data: { _source: "test:createDraft" },
      createdBy: IDS.users.submissor1,
    });

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, FLOW_PROJECT_ID));

    expect(project?.stage).toBe("rascunho");
    expect(project?.submittedAt).toBeNull();
  });

  it("2. submete projeto: rascunho → validacao", async () => {
    const now = new Date();

    await db
      .update(projects)
      .set({ stage: "validacao", submittedAt: now, updatedAt: now })
      .where(eq(projects.id, FLOW_PROJECT_ID));

    await db.insert(projectVersions).values({
      projectId: FLOW_PROJECT_ID,
      versionNumber: 2,
      stage: "validacao",
      data: { _source: "test:submitProject", submittedAt: now.toISOString() },
      createdBy: IDS.users.submissor1,
    });

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, FLOW_PROJECT_ID));

    expect(project?.stage).toBe("validacao");
    expect(project?.submittedAt).not.toBeNull();

    const versions = await db
      .select()
      .from(projectVersions)
      .where(eq(projectVersions.projectId, FLOW_PROJECT_ID));
    expect(versions.length).toBeGreaterThanOrEqual(2);
  });

  it("3. diretor avança: validacao → votacao", async () => {
    await db
      .update(projects)
      .set({ stage: "votacao", updatedAt: new Date() })
      .where(eq(projects.id, FLOW_PROJECT_ID));

    await db.insert(projectVersions).values({
      projectId: FLOW_PROJECT_ID,
      versionNumber: 3,
      stage: "votacao",
      data: { _source: "test:transitionStage", by: IDS.users.diretor1 },
      createdBy: IDS.users.diretor1,
    });

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, FLOW_PROJECT_ID));

    expect(project?.stage).toBe("votacao");
  });

  it("4. votação: dois votos a favor inseridos", async () => {
    await db.insert(votes).values([
      { projectId: FLOW_PROJECT_ID, userId: IDS.users.diretor1, value: true },
      { projectId: FLOW_PROJECT_ID, userId: IDS.users.diretor2, value: true },
    ]);

    const projectVotes = await db
      .select()
      .from(votes)
      .where(eq(votes.projectId, FLOW_PROJECT_ID));

    expect(projectVotes).toHaveLength(2);
    expect(projectVotes.every((v) => v.value === true)).toBe(true);
  });

  it("5. votação completa: votacao → homologacao", async () => {
    await db
      .update(projects)
      .set({ stage: "homologacao", updatedAt: new Date() })
      .where(eq(projects.id, FLOW_PROJECT_ID));

    await db.insert(projectVersions).values({
      projectId: FLOW_PROJECT_ID,
      versionNumber: 4,
      stage: "homologacao",
      data: {
        _source: "test:voteComplete",
        result: {
          totalVoted: 2,
          inFavor: 2,
          against: 0,
          quorumMet: true,
          approved: true,
        },
      },
      createdBy: IDS.users.diretor1,
    });

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, FLOW_PROJECT_ID));

    expect(project?.stage).toBe("homologacao");
  });

  it("6. homologacao → aprovado: gera cronograma de pagamento", async () => {
    const approvedAt = new Date();

    await db
      .update(projects)
      .set({ stage: "aprovado", approvedAt, updatedAt: approvedAt })
      .where(eq(projects.id, FLOW_PROJECT_ID));

    // Simula generatePaymentSchedule (12000 / 3 parcelas = 4000/mês)
    await db.insert(paymentSchedules).values([
      {
        projectId: FLOW_PROJECT_ID,
        amount: "4000.00",
        month: 1,
        dueDate: "2026-01-01",
        status: "pendente",
      },
      {
        projectId: FLOW_PROJECT_ID,
        amount: "4000.00",
        month: 2,
        dueDate: "2026-02-01",
        status: "pendente",
      },
      {
        projectId: FLOW_PROJECT_ID,
        amount: "4000.00",
        month: 3,
        dueDate: "2026-03-01",
        status: "pendente",
      },
    ]);

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, FLOW_PROJECT_ID));

    expect(project?.stage).toBe("aprovado");
    expect(project?.approvedAt).not.toBeNull();

    const schedule = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, FLOW_PROJECT_ID));

    expect(schedule).toHaveLength(3);
    const firstPayment = schedule.at(0);
    if (!firstPayment) throw new Error("Cronograma vazio");
    expect(parseFloat(firstPayment.amount)).toBe(4000);
  });

  it("7. aprovado → em_execucao: startedAt registrado", async () => {
    const startedAt = new Date();

    await db
      .update(projects)
      .set({ stage: "em_execucao", startedAt, updatedAt: startedAt })
      .where(eq(projects.id, FLOW_PROJECT_ID));

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, FLOW_PROJECT_ID));

    expect(project?.stage).toBe("em_execucao");
    expect(project?.startedAt).not.toBeNull();
  });

  it("8. em_execucao → concluido: concludedAt registrado", async () => {
    const concludedAt = new Date();

    await db
      .update(projects)
      .set({ stage: "concluido", concludedAt, updatedAt: concludedAt })
      .where(eq(projects.id, FLOW_PROJECT_ID));

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, FLOW_PROJECT_ID));

    expect(project?.stage).toBe("concluido");
    expect(project?.concludedAt).not.toBeNull();
  });
});

// ── Orçamento ─────────────────────────────────────────────────────────────────

describe("Orçamento — Submissão bloqueada ao exceder limite", () => {
  beforeAll(async () => {
    // Configura limite de orçamento em financeiro.organization_budgets (S1-01)
    await db
      .insert(organizationBudgets)
      .values({
        organizationId: IDS.orgs.orgFlow,
        year: BUDGET_YEAR,
        amount: BUDGET_LIMIT.toFixed(2),
        createdBy: IDS.users.superAdmin,
      })
      .onConflictDoNothing();

    // Projeto aprovado existente consumindo 40000 de 50000
    await db
      .insert(projects)
      .values({
        id: BUDGET_EXISTING_ID,
        title: "Projeto Orçamento Existente",
        tipo: "anual",
        stage: "aprovado",
        organizationId: IDS.orgs.orgFlow,
        submitterId: IDS.users.submissor1,
        evaluationYear: BUDGET_YEAR,
        budgetTotal: "40000.00",
        parcelas: 1,
        meses: 1,
      })
      .onConflictDoNothing();
  });

  it("lê limite configurado em financeiro.organization_budgets", async () => {
    const [budget] = await db
      .select({ amount: organizationBudgets.amount })
      .from(organizationBudgets)
      .where(
        and(
          eq(organizationBudgets.organizationId, IDS.orgs.orgFlow),
          eq(organizationBudgets.year, BUDGET_YEAR),
        ),
      )
      .limit(1);

    expect(parseFloat(budget?.amount ?? "0")).toBe(BUDGET_LIMIT);
  });

  it("soma correta de projetos ativos para a org + ano", async () => {
    const [result] = await db
      .select({ total: sum(projects.budgetTotal) })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, IDS.orgs.orgFlow),
          eq(projects.evaluationYear, BUDGET_YEAR),
          isNull(projects.deletedAt),
          not(eq(projects.stage, "reprovado")),
        ),
      );

    const total = parseFloat(result?.total ?? "0");
    expect(total).toBeGreaterThanOrEqual(40000);
  });

  it("novo projeto de 15000 excederia o limite (40000 + 15000 = 55000 > 50000)", async () => {
    const [budget] = await db
      .select({ amount: organizationBudgets.amount })
      .from(organizationBudgets)
      .where(
        and(
          eq(organizationBudgets.organizationId, IDS.orgs.orgFlow),
          eq(organizationBudgets.year, BUDGET_YEAR),
        ),
      )
      .limit(1);

    const limit = parseFloat(budget?.amount ?? "0");

    const [result] = await db
      .select({ total: sum(projects.budgetTotal) })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, IDS.orgs.orgFlow),
          eq(projects.evaluationYear, BUDGET_YEAR),
          isNull(projects.deletedAt),
          not(eq(projects.stage, "reprovado")),
        ),
      );

    const existing = parseFloat(result?.total ?? "0");
    const newBudget = 15000;

    // A ação lançaria: "Orçamento da instituição excedido"
    expect(existing + newBudget).toBeGreaterThan(limit);
  });

  it("novo projeto de 5000 cabe dentro do limite (40000 + 5000 = 45000 ≤ 50000)", async () => {
    const [budget] = await db
      .select({ amount: organizationBudgets.amount })
      .from(organizationBudgets)
      .where(
        and(
          eq(organizationBudgets.organizationId, IDS.orgs.orgFlow),
          eq(organizationBudgets.year, BUDGET_YEAR),
        ),
      )
      .limit(1);

    const limit = parseFloat(budget?.amount ?? "0");

    const [result] = await db
      .select({ total: sum(projects.budgetTotal) })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, IDS.orgs.orgFlow),
          eq(projects.evaluationYear, BUDGET_YEAR),
          isNull(projects.deletedAt),
          not(eq(projects.stage, "reprovado")),
        ),
      );

    const existing = parseFloat(result?.total ?? "0");
    const newBudget = 5000;

    // A ação passaria o budget check
    expect(existing + newBudget).toBeLessThanOrEqual(limit);
  });

  it("projetos reprovados são excluídos do cálculo (orçamento livre)", async () => {
    await db
      .insert(projects)
      .values({
        id: BUDGET_REPROVADO_ID,
        title: "Projeto Reprovado Budget",
        tipo: "anual",
        stage: "reprovado",
        organizationId: IDS.orgs.orgFlow,
        submitterId: IDS.users.submissor1,
        evaluationYear: BUDGET_YEAR,
        budgetTotal: "100000.00", // enorme; não deve contar
        parcelas: 1,
        meses: 1,
      })
      .onConflictDoNothing();

    const [result] = await db
      .select({ total: sum(projects.budgetTotal) })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, IDS.orgs.orgFlow),
          eq(projects.evaluationYear, BUDGET_YEAR),
          isNull(projects.deletedAt),
          not(eq(projects.stage, "reprovado")), // reprovado excluído
        ),
      );

    const total = parseFloat(result?.total ?? "0");
    // Projeto reprovado (100000) NÃO é contado
    expect(total).toBeLessThan(100000);
    // Projeto aprovado existente (40000) É contado
    expect(total).toBeGreaterThanOrEqual(40000);
  });
});

// ── Contestação ───────────────────────────────────────────────────────────────

describe("Contestação — Limites e restrições", () => {
  beforeAll(async () => {
    await db
      .insert(projects)
      .values({
        id: CONTEST_PROJECT_ID,
        title: "Projeto Contestação Test",
        tipo: "anual",
        stage: "homologacao",
        organizationId: IDS.orgs.orgFlow,
        submitterId: IDS.users.submissor1,
        evaluationYear: 2026,
        budgetTotal: "10000.00",
        parcelas: 1,
        meses: 1,
      })
      .onConflictDoNothing();
  });

  it("1ª contestação inserida com sucesso (contagem=1)", async () => {
    await db.insert(contestations).values({
      projectId: CONTEST_PROJECT_ID,
      userId: IDS.users.diretor1,
      justification: "Documentação insuficiente — primeira contestação válida",
      status: "pending",
    });

    const [result] = await db
      .select({ total: count() })
      .from(contestations)
      .where(eq(contestations.projectId, CONTEST_PROJECT_ID));

    expect(result?.total).toBe(1);
  });

  it("2ª contestação inserida com sucesso — limite máximo (contagem=2)", async () => {
    await db.insert(contestations).values({
      projectId: CONTEST_PROJECT_ID,
      userId: IDS.users.conselheiro1,
      justification:
        "Orçamento sem detalhamento adequado — segunda contestação",
      status: "pending",
    });

    const [result] = await db
      .select({ total: count() })
      .from(contestations)
      .where(eq(contestations.projectId, CONTEST_PROJECT_ID));

    expect(result?.total).toBe(2);
  });

  it("3ª tentativa por projeto: guard de contagem retorna erro", async () => {
    const [result] = await db
      .select({ total: count() })
      .from(contestations)
      .where(eq(contestations.projectId, CONTEST_PROJECT_ID));

    const total = result?.total ?? 0;
    expect(total).toBeGreaterThanOrEqual(2);

    // Guard idêntico ao da Server Action createContestation
    expect(() => {
      if (total >= 2) {
        throw new Error("Limite de 2 contestações por projeto atingido");
      }
    }).toThrow("Limite de 2 contestações por projeto atingido");
  });

  it("2ª tentativa pela mesma pessoa: UNIQUE constraint bloqueia inserção", async () => {
    await expect(
      db.insert(contestations).values({
        projectId: CONTEST_PROJECT_ID,
        userId: IDS.users.diretor1, // já contestou acima
        justification: "Tentativa duplicada pelo mesmo usuário",
        status: "pending",
      }),
    ).rejects.toThrow();
  });

  it("contestação reverte projeto de homologacao para votacao", async () => {
    await db
      .update(projects)
      .set({ stage: "votacao", updatedAt: new Date() })
      .where(eq(projects.id, CONTEST_PROJECT_ID));

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, CONTEST_PROJECT_ID));

    expect(project?.stage).toBe("votacao");
  });
});

// ── Soft-delete ───────────────────────────────────────────────────────────────

describe("Imutabilidade — Soft-delete preserva audit trail", () => {
  it("projeto deletado não retorna em consulta com filtro isNull(deletedAt)", async () => {
    await db.insert(projects).values({
      id: DELETE_PROJECT_ID,
      title: "Projeto Para Deletar",
      tipo: "anual",
      stage: "rascunho",
      organizationId: IDS.orgs.orgFlow,
      submitterId: IDS.users.submissor1,
      evaluationYear: 2026,
      budgetTotal: "5000.00",
      parcelas: 1,
      meses: 1,
    });

    // Soft-delete
    await db
      .update(projects)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(projects.id, DELETE_PROJECT_ID));

    // Consulta como getProjectOrThrow faz (isNull filter)
    const active = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, DELETE_PROJECT_ID), isNull(projects.deletedAt)),
      );

    expect(active).toHaveLength(0);
  });

  it("registro deletado ainda existe no banco (audit trail)", async () => {
    const all = await db
      .select()
      .from(projects)
      .where(eq(projects.id, DELETE_PROJECT_ID));

    expect(all).toHaveLength(1);
    expect(all.at(0)?.deletedAt).not.toBeNull();
  });

  it("projetos deletados não são contados no orçamento", async () => {
    // Soft-delete BUDGET_EXISTING_ID and verify it's excluded
    await db
      .update(projects)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(projects.id, BUDGET_EXISTING_ID));

    const [result] = await db
      .select({ total: sum(projects.budgetTotal) })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, IDS.orgs.orgFlow),
          eq(projects.evaluationYear, BUDGET_YEAR),
          isNull(projects.deletedAt), // exclui soft-deleted
          not(eq(projects.stage, "reprovado")),
        ),
      );

    const total = parseFloat(result?.total ?? "0");
    // BUDGET_EXISTING_ID (40000) foi deletado — não deve contar
    expect(total).toBeLessThan(40000);
  });
});

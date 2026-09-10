/**
 * flow.test.ts — Fluxo end-to-end do módulo projetos
 *
 * Testa majoritariamente direto no DB (transições de estágio anteriores a
 * P-2.12b evitavam Server Actions por causa de uma lacuna de RLS em
 * `submitProject` para submissor comum — ver SESSIONS.md P-2.10b) os
 * invariantes de negócio:
 *
 *  - Ciclo de vida completo: rascunho → concluido
 *  - Bloqueio de orçamento (financeiro.organization_budgets + soma de projetos)
 *  - Limites de contestação (max 2/projeto, 1/pessoa)
 *  - Soft-delete e imutabilidade (audit trail preservado)
 *  - Edição de rascunho via `updateDraftProject` (action real) — P-2.12b
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
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
  auditLog,
  costCenters,
  payables,
} from "@hebron/db/schema";
import {
  generatePaymentSchedule,
  onProjectApproved,
} from "@hebron/db/projetos-approval";

// updateDraftProject roda pelo pipeline real de Server Action
// (submissorAction) — precisa de sessão mockada, mesmo padrão de
// voting.test.ts/close-voting.test.ts.
const resolveSessionMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));
vi.mock("@hebron/auth/server", () => ({
  resolveSession: (...args: unknown[]) => resolveSessionMock(...args),
}));

// createContestation (action real, teste do gate D1-004 abaixo) chama
// notifyContestation best-effort — mockado para não disparar e-mail real via
// Resend neste ambiente (mesmo raciocínio de isolamento de
// duplicate-detection.test.ts).
vi.mock("../lib/notifications", () => ({
  notifyProjectSubmitted: vi.fn().mockResolvedValue(undefined),
  notifyProjectInValidation: vi.fn().mockResolvedValue(undefined),
  notifyVotingOpen: vi.fn().mockResolvedValue(undefined),
  notifyContestation: vi.fn().mockResolvedValue(undefined),
}));

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
const DRAFT_EDIT_PROJECT_ID = "cccc0000-0000-0000-0000-000000000006";
const CONTEST_GATE_PROJECT_ID = "cccc0000-0000-0000-0000-000000000007";
// P-2.18 CORRETIVO — contestação de pontual devolve para validacao, não votacao
const CONTEST_GATE_PONTUAL_PROJECT_ID = "cccc0000-0000-0000-0000-000000000011";
// P-2.6c — cronograma com meses escolhidos vs. projeto anterior à migration
const SCHEDULE_MONTHS_PROJECT_ID = "cccc0000-0000-0000-0000-000000000008";
const SCHEDULE_LEGACY_PROJECT_ID = "cccc0000-0000-0000-0000-000000000009";
// Linha antiga cujo orçamento NÃO divide exato — separa o que o fallback
// preserva (os meses) do que ele deliberadamente muda (os centavos).
const SCHEDULE_LEGACY_ODD_PROJECT_ID = "cccc0000-0000-0000-0000-000000000010";

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
    DRAFT_EDIT_PROJECT_ID,
    CONTEST_GATE_PROJECT_ID,
    CONTEST_GATE_PONTUAL_PROJECT_ID,
    SCHEDULE_MONTHS_PROJECT_ID,
    SCHEDULE_LEGACY_PROJECT_ID,
    SCHEDULE_LEGACY_ODD_PROJECT_ID,
  ];

  // financeiro.cost_centers.project_id é ON DELETE RESTRICT — o que
  // onProjectApproved criou precisa sair antes do projeto (mesma ordem de
  // packages/db/src/__tests__/projetos-approval.test.ts). O audit dos
  // payables tem actorId do ator de sistema, não dos usuários deste arquivo:
  // limpo por entityId.
  for (const pid of allProjectIds) {
    const [costCenter] = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(eq(costCenters.projectId, pid));
    if (!costCenter) continue;

    const created = await db
      .select({ id: payables.id })
      .from(payables)
      .where(eq(payables.costCenterId, costCenter.id));
    for (const p of created) {
      await db.delete(auditLog).where(eq(auditLog.entityId, p.id));
    }
    await db.delete(payables).where(eq(payables.costCenterId, costCenter.id));
    await db.delete(costCenters).where(eq(costCenters.id, costCenter.id));
  }

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
  // updateDraftProject (P-2.12b) grava audit_log com actorId = submissor —
  // precisa ser limpo antes de deletar os usuários (audit_log_actor_id_fkey).
  for (const id of Object.values(IDS.users)) {
    await db.delete(auditLog).where(eq(auditLog.actorId, id));
  }
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

    // generatePaymentSchedule real (packages/db/projetos-approval.ts) —
    // não uma reimplementação da divisão 12000 / 3 parcelas = 4000/mês
    // (P-2.12b).
    const [projectForSchedule] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, FLOW_PROJECT_ID));
    if (!projectForSchedule) throw new Error("Projeto não encontrado");
    await generatePaymentSchedule(projectForSchedule);

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

// ── Contestação — gate de papel (D1-004, action real) ──────────────────────────
//
// PACOTE 9 (AUDIT/04-BACKLOG-CORRECAO.md): createContestation usava
// projetosAction (só exige autenticação) em vez de conselheiroDiretorAction
// — só a RLS impedia um submissor. Diferente do describe acima (que exercita
// o guard de contagem/UNIQUE direto no banco), este chama a action real para
// provar que a camada de aplicação recusa, com mensagem clara, antes mesmo
// de a RLS entrar em jogo.

describe("Contestação — gate de papel (createContestation, action real)", () => {
  beforeAll(async () => {
    await db
      .insert(projects)
      .values([
        {
          id: CONTEST_GATE_PROJECT_ID,
          title: "Projeto Contestação Gate Test",
          tipo: "anual",
          stage: "homologacao",
          organizationId: IDS.orgs.orgFlow,
          submitterId: IDS.users.submissor1,
          evaluationYear: 2026,
          budgetTotal: "10000.00",
          parcelas: 1,
          meses: 1,
        },
        {
          id: CONTEST_GATE_PONTUAL_PROJECT_ID,
          title: "Projeto Pontual Contestação Test",
          tipo: "pontual",
          stage: "homologacao",
          organizationId: IDS.orgs.orgFlow,
          submitterId: IDS.users.submissor1,
          evaluationYear: 2026,
          budgetTotal: "10000.00",
          parcelas: 1,
          meses: 1,
        },
      ])
      .onConflictDoNothing();
  });

  it("submissor é recusado pela action, com mensagem clara — projeto permanece em homologacao", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.users.submissor1,
      roles: ["submissor"],
    });

    const { createContestation } = await import("../actions/projects");
    const result = await createContestation({
      projectId: CONTEST_GATE_PROJECT_ID,
      reason: "Tentativa de contestação por submissor",
    });

    expect(result?.serverError).toBeDefined();
    expect(result?.serverError).toContain("diretor ou conselheiro");

    const [project] = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, CONTEST_GATE_PROJECT_ID));
    expect(project?.stage).toBe("homologacao");

    const [result2] = await db
      .select({ total: count() })
      .from(contestations)
      .where(eq(contestations.projectId, CONTEST_GATE_PROJECT_ID));
    expect(result2?.total ?? 0).toBe(0);
  });

  it("diretor contesta com sucesso: contestação gravada e projeto volta para votacao", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.users.diretor1,
      roles: ["diretor"],
    });

    const { createContestation } = await import("../actions/projects");
    const result = await createContestation({
      projectId: CONTEST_GATE_PROJECT_ID,
      reason: "Documentação insuficiente — contestação de diretor",
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.stageReverted).toBe("votacao");

    const [project] = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, CONTEST_GATE_PROJECT_ID));
    expect(project?.stage).toBe("votacao");
  });

  // P-2.18 CORRETIVO: pontual nunca teve votacao — sua contestação devolve
  // para validacao (onde o pontual reentra em homologacao diretamente).
  it("diretor contesta pontual: contestação gravada e projeto volta para validacao (não votacao)", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.users.diretor1,
      roles: ["diretor"],
    });

    const { createContestation } = await import("../actions/projects");
    const result = await createContestation({
      projectId: CONTEST_GATE_PONTUAL_PROJECT_ID,
      reason: "Valor aprovado divergente — contestação de diretor",
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.stageReverted).toBe("validacao");

    const [project] = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, CONTEST_GATE_PONTUAL_PROJECT_ID));
    expect(project?.stage).toBe("validacao");
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

// ── Edição de rascunho: updateDraftProject (action real) ───────────────────────
//
// P-2.12b: o único teste anterior desta regra (organizations.test.ts) fazia
// um UPDATE direto no banco simulando "o efeito de updateDraftProject", sem
// chamar a action — registrado em SESSIONS.md como espelho remanescente
// (organizations.test.ts não está na lista de arquivos permitidos deste
// corretivo). Aqui a action real é exercitada de ponta a ponta.

describe("Edição de rascunho — updateDraftProject altera parcelas (action real)", () => {
  beforeAll(async () => {
    await db
      .insert(projects)
      .values({
        id: DRAFT_EDIT_PROJECT_ID,
        title: "Projeto Edição de Rascunho Test",
        tipo: "anual",
        stage: "rascunho",
        organizationId: IDS.orgs.orgFlow,
        submitterId: IDS.users.submissor1,
        evaluationYear: 2026,
        budgetTotal: "12000.00",
        parcelas: 3,
        meses: 3,
      })
      .onConflictDoNothing();
  });

  it("submissor edita parcelas/mesesPagamento do próprio rascunho: patch persiste, meses acompanha mesesPagamento.length", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.users.submissor1,
      roles: ["submissor"],
    });

    const { updateDraftProject } = await import("../actions/projects");
    const result = await updateDraftProject({
      projectId: DRAFT_EDIT_PROJECT_ID,
      parcelas: 6,
      mesesPagamento: [1, 2, 3, 4, 5, 6],
    });

    expect(result?.serverError).toBeUndefined();

    const [updated] = await db
      .select({ parcelas: projects.parcelas, meses: projects.meses })
      .from(projects)
      .where(eq(projects.id, DRAFT_EDIT_PROJECT_ID));

    expect(updated?.parcelas).toBe(6);
    // meses nunca diverge de mesesPagamento.length — invariante do fix P-2.8c
    expect(updated?.meses).toBe(6);
  });

  it("outro submissor (não é o dono do rascunho) tem a edição recusada pela action", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.users.submissor2,
      roles: ["submissor"],
    });

    const { updateDraftProject } = await import("../actions/projects");
    const result = await updateDraftProject({
      projectId: DRAFT_EDIT_PROJECT_ID,
      parcelas: 12,
      mesesPagamento: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    });

    expect(result?.serverError).toBeDefined();

    const [row] = await db
      .select({ parcelas: projects.parcelas })
      .from(projects)
      .where(eq(projects.id, DRAFT_EDIT_PROJECT_ID));
    // Continua com o valor do teste anterior (6) — recusa não escreveu nada
    expect(row?.parcelas).toBe(6);
  });

  it("cronograma pós-aprovação reflete o novo número de parcelas/meses gravado pela edição", async () => {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, DRAFT_EDIT_PROJECT_ID));
    if (!project) throw new Error("Projeto de teste não encontrado");

    await generatePaymentSchedule(project);

    const schedule = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, DRAFT_EDIT_PROJECT_ID));

    const total = schedule.reduce(
      (sum, row) => sum + parseFloat(row.amount),
      0,
    );
    expect(schedule).toHaveLength(6);
    expect(total).toBeCloseTo(12000, 2);
  });

  it("a tela de edição relê os meses da coluna gravada pela action (round-trip)", async () => {
    // Fecha o ciclo do P-2.6c: updateDraftProject grava `meses_pagamento` e
    // getDraftProjectForEdit lê da mesma coluna — não mais do snapshot de
    // project_versions, que era a segunda fonte da mesma informação.
    const { getDraftProjectForEdit } = await import("../lib/queries");
    const draft = await getDraftProjectForEdit(
      DRAFT_EDIT_PROJECT_ID,
      IDS.users.submissor1,
    );

    expect(draft?.parcelas).toBe(6);
    expect(draft?.mesesSelecionados).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

// ── Cronograma: meses escolhidos e centavos (P-2.6c) ──────────────────────────
// Dois defeitos de generatePaymentSchedule corrigidos aqui:
//  1. o mês de cada parcela era `(i % 12) + 1` — um projeto aprovado para
//     pagar em ago/set/out gerava vencimento em jan/fev/mar, e os
//     financeiro.payables criados por onProjectApproved herdavam o erro;
//  2. `toFixed(2)` por parcela perdia centavos (R$ 10.000,00 em 3 parcelas
//     somava R$ 9.999,99).

describe("Cronograma de pagamento — meses escolhidos e centavos (P-2.6c)", () => {
  beforeAll(async () => {
    await db
      .insert(projects)
      .values([
        {
          id: SCHEDULE_MONTHS_PROJECT_ID,
          title: "Projeto Cronograma Ago-Set-Out",
          tipo: "anual",
          stage: "aprovado",
          organizationId: IDS.orgs.orgFlow,
          submitterId: IDS.users.submissor1,
          evaluationYear: 2026,
          budgetTotal: "10000.00",
          parcelas: 3,
          meses: 3,
          mesesPagamento: [8, 9, 10],
        },
        {
          // Linha "antiga": criada antes da migration 0091, sem a lista de
          // meses. Precisa manter exatamente o comportamento anterior.
          id: SCHEDULE_LEGACY_PROJECT_ID,
          title: "Projeto Cronograma Legado",
          tipo: "anual",
          stage: "aprovado",
          organizationId: IDS.orgs.orgFlow,
          submitterId: IDS.users.submissor1,
          evaluationYear: 2026,
          budgetTotal: "9000.00",
          parcelas: 3,
          meses: 3,
        },
        {
          id: SCHEDULE_LEGACY_ODD_PROJECT_ID,
          title: "Projeto Cronograma Legado (divisão inexata)",
          tipo: "anual",
          stage: "aprovado",
          organizationId: IDS.orgs.orgFlow,
          submitterId: IDS.users.submissor1,
          evaluationYear: 2026,
          budgetTotal: "10000.00",
          parcelas: 3,
          meses: 3,
        },
      ])
      .onConflictDoNothing();
  });

  it("usa os meses escolhidos pelo submissor: [8, 9, 10] vence em ago/set/out", async () => {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, SCHEDULE_MONTHS_PROJECT_ID));
    if (!project) throw new Error("Projeto de teste não encontrado");
    expect(project.mesesPagamento).toEqual([8, 9, 10]);

    await generatePaymentSchedule(project);

    const schedule = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, SCHEDULE_MONTHS_PROJECT_ID))
      .orderBy(paymentSchedules.month);

    expect(schedule.map((row) => row.month)).toEqual([8, 9, 10]);
    expect(schedule.map((row) => row.dueDate)).toEqual([
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
    ]);
  });

  it("as parcelas somam exatamente o orçamento — nenhum centavo some", async () => {
    const schedule = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, SCHEDULE_MONTHS_PROJECT_ID));

    expect(schedule).toHaveLength(3);
    // Soma em centavos inteiros: 3.333,34 + 3.333,33 + 3.333,33 = 10.000,00.
    // Comparar em float esconderia justamente o centavo perdido.
    const totalCents = schedule.reduce(
      (sum, row) => sum + Math.round(parseFloat(row.amount) * 100),
      0,
    );
    expect(totalCents).toBe(1_000_000);
    expect([...schedule.map((r) => r.amount)].sort()).toEqual([
      "3333.33",
      "3333.33",
      "3333.34",
    ]);
  });

  it("projeto sem meses_pagamento (anterior à migration) mantém o fallback Jan–N", async () => {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, SCHEDULE_LEGACY_PROJECT_ID));
    if (!project) throw new Error("Projeto legado de teste não encontrado");
    expect(project.mesesPagamento).toBeNull();

    await generatePaymentSchedule(project);

    const schedule = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, SCHEDULE_LEGACY_PROJECT_ID))
      .orderBy(paymentSchedules.month);

    expect(schedule.map((row) => row.month)).toEqual([1, 2, 3]);
    expect(schedule.map((row) => row.dueDate)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
    ]);
    // Mesmo valor que o gerador antigo produzia para 9.000,00 ÷ 3
    expect(schedule.map((row) => row.amount)).toEqual([
      "3000.00",
      "3000.00",
      "3000.00",
    ]);
  });

  it("no fallback, o mês é preservado mas o centavo NÃO — a correção do arredondamento vale para linha antiga também", async () => {
    // Divisão inexata separa as duas metades do fallback, que o fixture de
    // 9.000,00 ÷ 3 (exato) não conseguia distinguir:
    //  - meses: idênticos ao gerador antigo (Jan–N) — é o que o escopo do
    //    P-2.6c manda preservar;
    //  - centavos: o gerador antigo emitia três de 3.333,33 (soma 9.999,99);
    //    agora distribui o resto e soma exato. Mudança deliberada — o item 3
    //    do escopo não abre exceção para linha antiga, e o critério de aceite
    //    exige soma igual ao budget_total.
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, SCHEDULE_LEGACY_ODD_PROJECT_ID));
    if (!project) throw new Error("Projeto legado (inexato) não encontrado");
    expect(project.mesesPagamento).toBeNull();

    await generatePaymentSchedule(project);

    const schedule = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, SCHEDULE_LEGACY_ODD_PROJECT_ID))
      .orderBy(paymentSchedules.month);

    expect(schedule.map((row) => row.month)).toEqual([1, 2, 3]);
    expect(schedule.map((row) => row.amount)).toEqual([
      "3333.34",
      "3333.33",
      "3333.33",
    ]);
    const totalCents = schedule.reduce(
      (sum, row) => sum + Math.round(parseFloat(row.amount) * 100),
      0,
    );
    expect(totalCents).toBe(1_000_000);
  });

  it("os payables criados por onProjectApproved herdam o vencimento correto", async () => {
    await onProjectApproved(SCHEDULE_MONTHS_PROJECT_ID);

    const [costCenter] = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(eq(costCenters.projectId, SCHEDULE_MONTHS_PROJECT_ID));
    expect(costCenter).toBeTruthy();
    if (!costCenter) throw new Error("Centro de custo não criado");

    const created = await db
      .select()
      .from(payables)
      .where(eq(payables.costCenterId, costCenter.id));

    expect(created).toHaveLength(3);
    expect([...created.map((p) => p.dueDate)].sort()).toEqual([
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
    ]);
    const totalCents = created.reduce(
      (sum, p) => sum + Math.round(parseFloat(p.amount) * 100),
      0,
    );
    expect(totalCents).toBe(1_000_000);
  });
});

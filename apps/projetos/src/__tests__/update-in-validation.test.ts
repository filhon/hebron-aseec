/**
 * update-in-validation.test.ts — P-2.16 CORRETIVO
 *
 * AUDIT/06 §1.2/§1.3: `updateDraftProject` era a única action de escrita
 * sobre `projetos.projects` — recusava qualquer stage diferente de
 * "rascunho", então "editar em validação" na prática só existia via
 * `transitionProjectStage` (que só muda o nome do estágio). Este arquivo
 * cobre a nova action `updateProjectInValidation` (Q23/Q38: só super_admin
 * altera um projeto em validação, e pode alterar qualquer campo), o novo
 * gate de `transitionProjectStage` para `votacao → validacao` (também
 * restrito a super_admin), e a preservação dos votos ao ir e voltar entre
 * os dois estágios.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, and } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  organizations,
  projects,
  projectVersions,
  votes,
  notifications,
  auditLog,
  paymentSchedules,
  costCenters,
  payables,
} from "@hebron/db/schema";

// updateProjectInValidation/transitionProjectStage rodam pelo pipeline real
// de Server Action — precisa de sessão mockada, mesmo padrão de
// approved-amount.test.ts/state-machine.test.ts.
const resolveSessionMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));
vi.mock("@hebron/auth/server", () => ({
  resolveSession: (...args: unknown[]) => resolveSessionMock(...args),
}));

const IDS = {
  submitter: "faaa0000-0000-0000-0000-000000000001",
  diretor: "faaa0000-0000-0000-0000-000000000002",
  superAdmin: "faaa0000-0000-0000-0000-000000000003",
  org: "fabb0000-0000-0000-0000-000000000001",
} as const;

const YEAR = 2034; // ano isolado, sem colisão com outras suítes

const EDIT_ID = "facc0000-0000-0000-0000-000000000001";
const GATE_DIRETOR_ID = "facc0000-0000-0000-0000-000000000002";
const GATE_SUBMISSOR_ID = "facc0000-0000-0000-0000-000000000003";
const RETURN_TO_VALIDATION_ID = "facc0000-0000-0000-0000-000000000004";
const RETURN_GATE_DIRETOR_ID = "facc0000-0000-0000-0000-000000000005";
const EDIT_THEN_APPROVE_ID = "facc0000-0000-0000-0000-000000000006";

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.submitter,
        email: "uv-sub@test.hebron",
        fullName: "UV Submissor",
      },
      { id: IDS.diretor, email: "uv-dir@test.hebron", fullName: "UV Diretor" },
      { id: IDS.superAdmin, email: "uv-adm@test.hebron", fullName: "UV Admin" },
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
    .values({ id: IDS.org, nome: "Org UV Test", createdBy: IDS.submitter })
    .onConflictDoNothing();

  await db.insert(projects).values([
    {
      id: EDIT_ID,
      title: "Anual — edição em validação",
      tipo: "anual",
      stage: "validacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      evaluationYear: YEAR,
      objectives:
        "Objetivos originais do projeto, com no mínimo cinquenta caracteres.",
      justification:
        "Justificativa original do projeto, com no mínimo cinquenta caracteres.",
      budgetTotal: "50000.00",
      parcelas: 2,
      meses: 2,
      mesesPagamento: [3, 9],
    },
    {
      id: GATE_DIRETOR_ID,
      title: "Anual — gate de papel (diretor)",
      tipo: "anual",
      stage: "validacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      evaluationYear: YEAR,
      budgetTotal: "10000.00",
      parcelas: 1,
      meses: 1,
    },
    {
      id: GATE_SUBMISSOR_ID,
      title: "Anual — gate de papel (submissor)",
      tipo: "anual",
      stage: "validacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      evaluationYear: YEAR,
      budgetTotal: "10000.00",
      parcelas: 1,
      meses: 1,
    },
    {
      id: RETURN_TO_VALIDATION_ID,
      title: "Anual — retorno votacao → validacao preserva votos",
      tipo: "anual",
      stage: "votacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      evaluationYear: YEAR,
      budgetTotal: "20000.00",
      parcelas: 1,
      meses: 1,
    },
    {
      id: RETURN_GATE_DIRETOR_ID,
      title: "Anual — gate de papel no retorno (diretor)",
      tipo: "anual",
      stage: "votacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      evaluationYear: YEAR,
      budgetTotal: "10000.00",
      parcelas: 1,
      meses: 1,
    },
    {
      id: EDIT_THEN_APPROVE_ID,
      title: "Pontual — editar valor em validação e reaprovar (P-2.15)",
      tipo: "pontual",
      stage: "validacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      evaluationYear: YEAR,
      budgetTotal: "9000.00",
      parcelas: 1,
      meses: 1,
    },
  ]);

  // Voto pré-existente no projeto que vai e volta de validação — a
  // preservação é o que este arquivo verifica.
  await db.insert(votes).values({
    projectId: RETURN_TO_VALIDATION_ID,
    userId: IDS.diretor,
    value: true,
  });
});

afterAll(async () => {
  const projectIds = [
    EDIT_ID,
    GATE_DIRETOR_ID,
    GATE_SUBMISSOR_ID,
    RETURN_TO_VALIDATION_ID,
    RETURN_GATE_DIRETOR_ID,
    EDIT_THEN_APPROVE_ID,
  ];
  for (const projectId of projectIds) {
    // Financeiro provisionado por registerProjectDecision (EDIT_THEN_APPROVE_ID)
    // — payables/cost_centers/payment_schedules primeiro, mesma ordem de
    // approved-amount.test.ts (FKs).
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
    await db.delete(votes).where(eq(votes.projectId, projectId));
    await db
      .delete(notifications)
      .where(eq(notifications.userId, IDS.submitter));
    await db.delete(auditLog).where(eq(auditLog.entityId, projectId));
  }
  await db.delete(projects).where(eq(projects.organizationId, IDS.org));
  await db.delete(organizations).where(eq(organizations.id, IDS.org));
  // Todos os role_assignments primeiro, depois os users: as três linhas têm
  // grantedBy = IDS.submitter (role_assignments_granted_by_users_id_fk) —
  // apagar em um único loop userId-a-userId derruba o FK ao tentar excluir
  // o submissor enquanto as linhas de diretor/superAdmin ainda o referenciam.
  for (const id of [IDS.submitter, IDS.diretor, IDS.superAdmin]) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of [IDS.submitter, IDS.diretor, IDS.superAdmin]) {
    await db.delete(users).where(eq(users.id, id));
  }
});

describe("updateProjectInValidation — super_admin altera qualquer campo em validacao", () => {
  it("altera título/valor/parcelas/meses, grava versão e audita com diff explícito", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.superAdmin,
      roles: ["super_admin"],
    });
    const { updateProjectInValidation } = await import("../actions/projects");
    const result = await updateProjectInValidation({
      projectId: EDIT_ID,
      title: "Anual — edição em validação (corrigido)",
      budgetTotal: 38000,
      parcelas: 3,
      mesesPagamento: [2, 6, 10],
    });

    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select({
        title: projects.title,
        budgetTotal: projects.budgetTotal,
        parcelas: projects.parcelas,
        mesesPagamento: projects.mesesPagamento,
        stage: projects.stage,
      })
      .from(projects)
      .where(eq(projects.id, EDIT_ID));

    expect(row?.title).toBe("Anual — edição em validação (corrigido)");
    expect(row?.budgetTotal).toBe("38000.00");
    expect(row?.parcelas).toBe(3);
    expect(row?.mesesPagamento).toEqual([2, 6, 10]);
    expect(row?.stage).toBe("validacao"); // a edição não muda o estágio

    const versions = await db
      .select()
      .from(projectVersions)
      .where(eq(projectVersions.projectId, EDIT_ID));
    expect(
      versions.some(
        (v) =>
          v.stage === "validacao" &&
          (v.data as Record<string, unknown>)._source ===
            "updateProjectInValidation",
      ),
    ).toBe(true);

    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, EDIT_ID));
    const updateAudit = audits.find(
      (a) => a.action === "project.updated_in_validation",
    );
    expect(updateAudit).toBeTruthy();
    expect(JSON.stringify(updateAudit?.diff)).toContain("38000.00");
    expect(JSON.stringify(updateAudit?.diff)).toContain("50000.00");

    // Notificação ao submissor (PRD item 8) — best-effort, mas o insert
    // in_app não depende de RESEND_API_KEY estar configurado.
    const [notif] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, IDS.submitter),
          eq(notifications.type, "project.updated_in_validation"),
          eq(notifications.channel, "in_app"),
        ),
      );
    expect(notif).toBeDefined();
  });

  it("diretor recebe erro de negócio — gate de superAdminAction recusa antes de tocar o banco", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.diretor,
      roles: ["diretor"],
    });
    const { updateProjectInValidation } = await import("../actions/projects");
    const result = await updateProjectInValidation({
      projectId: GATE_DIRETOR_ID,
      title: "Não deveria mudar",
    });

    expect(result?.serverError).toBeDefined();

    const [row] = await db
      .select({ title: projects.title })
      .from(projects)
      .where(eq(projects.id, GATE_DIRETOR_ID));
    expect(row?.title).toBe("Anual — gate de papel (diretor)");
  });

  it("submissor recebe erro de negócio — gate de superAdminAction recusa antes de tocar o banco", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.submitter,
      roles: ["submissor"],
    });
    const { updateProjectInValidation } = await import("../actions/projects");
    const result = await updateProjectInValidation({
      projectId: GATE_SUBMISSOR_ID,
      title: "Não deveria mudar",
    });

    expect(result?.serverError).toBeDefined();

    const [row] = await db
      .select({ title: projects.title })
      .from(projects)
      .where(eq(projects.id, GATE_SUBMISSOR_ID));
    expect(row?.title).toBe("Anual — gate de papel (submissor)");
  });

  it("altera o valor pedido em validação e a reaprovação gera payables com o novo valor (integra com P-2.15)", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.superAdmin,
      roles: ["super_admin"],
    });
    const { updateProjectInValidation, registerProjectDecision } =
      await import("../actions/projects");

    const editResult = await updateProjectInValidation({
      projectId: EDIT_THEN_APPROVE_ID,
      budgetTotal: 4200,
    });
    expect(editResult?.serverError).toBeUndefined();

    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.superAdmin,
      roles: ["super_admin"],
    });
    const decisionResult = await registerProjectDecision({
      projectId: EDIT_THEN_APPROVE_ID,
      decision: "aprovado",
      approvedAmount: 4200,
    });
    expect(decisionResult?.serverError).toBeUndefined();

    const [row] = await db
      .select({
        stage: projects.stage,
        budgetTotal: projects.budgetTotal,
        approvedAmount: projects.approvedAmount,
      })
      .from(projects)
      .where(eq(projects.id, EDIT_THEN_APPROVE_ID));
    expect(row?.stage).toBe("aprovado");
    expect(row?.budgetTotal).toBe("4200.00"); // o valor editado em validação
    expect(row?.approvedAmount).toBe("4200.00");

    const schedules = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, EDIT_THEN_APPROVE_ID));
    const scheduleTotal = schedules.reduce(
      (sum, s) => sum + parseFloat(s.amount),
      0,
    );
    expect(scheduleTotal).toBeCloseTo(4200, 2);

    const [costCenter] = await db
      .select()
      .from(costCenters)
      .where(eq(costCenters.projectId, EDIT_THEN_APPROVE_ID));
    if (!costCenter) throw new Error("Centro de custo não criado");

    const createdPayables = await db
      .select()
      .from(payables)
      .where(eq(payables.costCenterId, costCenter.id));
    const payableTotal = createdPayables.reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0,
    );
    expect(payableTotal).toBeCloseTo(4200, 2);
  });
});

describe("transitionProjectStage — votacao → validacao restrito a super_admin", () => {
  it("super_admin retorna o projeto de votacao para validacao", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.superAdmin,
      roles: ["super_admin"],
    });
    const { transitionProjectStage } = await import("../actions/projects");
    const result = await transitionProjectStage({
      projectId: RETURN_TO_VALIDATION_ID,
      toStage: "validacao",
    });

    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, RETURN_TO_VALIDATION_ID));
    expect(row?.stage).toBe("validacao");

    // Voto pré-existente preservado — nem transitionProjectStage nem
    // createContestation tocam projetos.votes (mesmo precedente de
    // homologacao → votacao).
    const preservedVotes = await db
      .select()
      .from(votes)
      .where(eq(votes.projectId, RETURN_TO_VALIDATION_ID));
    expect(preservedVotes).toHaveLength(1);
    expect(preservedVotes[0]?.userId).toBe(IDS.diretor);
    expect(preservedVotes[0]?.value).toBe(true);
  });

  it("validacao → votacao de volta: mesma transição de sempre, voto continua intacto", async () => {
    // Ator super_admin, não diretor: a RLS "projects_select_reviewer"
    // (0007_projetos_rls.sql) só dá SELECT a diretor/conselheiro em
    // projetos com stage IN (votacao, homologacao, aprovado, reprovado,
    // em_execucao, concluido) — "validacao" não está nessa lista, então
    // getProjectOrThrow devolveria "Projeto não encontrado" para um
    // diretor aqui (achado pré-existente, já registrado em SESSIONS.md via
    // state-machine.test.ts, fora do escopo de arquivos permitidos deste
    // corretivo). super_admin tem SELECT irrestrito e exercita a transição
    // real.
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.superAdmin,
      roles: ["super_admin"],
    });
    const { transitionProjectStage } = await import("../actions/projects");
    const result = await transitionProjectStage({
      projectId: RETURN_TO_VALIDATION_ID,
      toStage: "votacao",
    });

    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, RETURN_TO_VALIDATION_ID));
    expect(row?.stage).toBe("votacao");

    const preservedVotes = await db
      .select()
      .from(votes)
      .where(eq(votes.projectId, RETURN_TO_VALIDATION_ID));
    expect(preservedVotes).toHaveLength(1);
  });

  it("diretor não pode retornar votacao → validacao — gate específico recusa mesmo com diretorAction", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.diretor,
      roles: ["diretor"],
    });
    const { transitionProjectStage } = await import("../actions/projects");
    const result = await transitionProjectStage({
      projectId: RETURN_GATE_DIRETOR_ID,
      toStage: "validacao",
    });

    expect(result?.serverError).toBeDefined();

    const [row] = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, RETURN_GATE_DIRETOR_ID));
    expect(row?.stage).toBe("votacao"); // inalterado
  });
});

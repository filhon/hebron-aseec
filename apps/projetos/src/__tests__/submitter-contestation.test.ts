/**
 * submitter-contestation.test.ts — P-2.17 CORRETIVO (PATCH-029)
 *
 * `AUDIT/06 §1.4`: o submissor não tinha canal para contestar alterações
 * feitas pelo super_admin durante a validação (Q11/Q32/Q33/Q75). Cobre as
 * novas actions `createSubmitterContestation` (submissor, gate de
 * propriedade + estágio + prazo + "uma vez por alteração") e
 * `resolveSubmitterContestation` (super_admin, aceita/rejeita com resposta
 * obrigatória), e a notificação em cada ponta.
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
  submitterContestations,
  meetingSessions,
  notifications,
  auditLog,
} from "@hebron/db/schema";

const resolveSessionMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));
vi.mock("@hebron/auth/server", () => ({
  resolveSession: (...args: unknown[]) => resolveSessionMock(...args),
}));

const IDS = {
  submitter: "fdaa0000-0000-0000-0000-000000000001",
  otherSubmitter: "fdaa0000-0000-0000-0000-000000000002",
  superAdmin: "fdaa0000-0000-0000-0000-000000000003",
  diretor: "fdaa0000-0000-0000-0000-000000000004",
  org: "fdbb0000-0000-0000-0000-000000000001",
} as const;

const PROJECT_DEADLINE_OK_ID = "fdcc0000-0000-0000-0000-000000000001";
const PROJECT_DEADLINE_BLOCKED_ID = "fdcc0000-0000-0000-0000-000000000002";
const PROJECT_GATE_OWNER_ID = "fdcc0000-0000-0000-0000-000000000003";
const PROJECT_NO_EDIT_ID = "fdcc0000-0000-0000-0000-000000000004";
const PROJECT_WRONG_STAGE_ID = "fdcc0000-0000-0000-0000-000000000005";
const PROJECT_RESOLVE_FLOW_ID = "fdcc0000-0000-0000-0000-000000000006";

const MEETING_ID = "fddd0000-0000-0000-0000-000000000001";

async function insertEditableVersion(projectId: string): Promise<void> {
  await db.insert(projectVersions).values({
    projectId,
    versionNumber: 1,
    stage: "validacao",
    data: { _source: "updateProjectInValidation" },
    createdBy: IDS.superAdmin,
  });
}

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.submitter,
        email: "sc-sub@test.hebron",
        fullName: "SC Submissor",
      },
      {
        id: IDS.otherSubmitter,
        email: "sc-sub2@test.hebron",
        fullName: "SC Outro Submissor",
      },
      {
        id: IDS.superAdmin,
        email: "sc-adm@test.hebron",
        fullName: "SC Admin",
      },
      { id: IDS.diretor, email: "sc-dir@test.hebron", fullName: "SC Diretor" },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      { userId: IDS.submitter, role: "submissor", grantedBy: IDS.submitter },
      {
        userId: IDS.otherSubmitter,
        role: "submissor",
        grantedBy: IDS.submitter,
      },
      {
        userId: IDS.superAdmin,
        role: "super_admin",
        grantedBy: IDS.submitter,
      },
      { userId: IDS.diretor, role: "diretor", grantedBy: IDS.submitter },
    ])
    .onConflictDoNothing();

  await db
    .insert(organizations)
    .values({ id: IDS.org, nome: "Org SC Test", createdBy: IDS.submitter })
    .onConflictDoNothing();

  await db.insert(projects).values([
    {
      id: PROJECT_DEADLINE_OK_ID,
      title: "SC — prazo com folga",
      tipo: "anual",
      stage: "validacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      budgetTotal: "10000.00",
    },
    {
      id: PROJECT_DEADLINE_BLOCKED_ID,
      title: "SC — prazo encerrado",
      tipo: "anual",
      stage: "validacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      budgetTotal: "10000.00",
    },
    {
      id: PROJECT_GATE_OWNER_ID,
      title: "SC — gate de propriedade",
      tipo: "anual",
      stage: "validacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      budgetTotal: "10000.00",
    },
    {
      id: PROJECT_NO_EDIT_ID,
      title: "SC — sem alteração para contestar",
      tipo: "anual",
      stage: "validacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      budgetTotal: "10000.00",
    },
    {
      id: PROJECT_WRONG_STAGE_ID,
      title: "SC — fora de validação",
      tipo: "anual",
      stage: "votacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      budgetTotal: "10000.00",
    },
    {
      id: PROJECT_RESOLVE_FLOW_ID,
      title: "SC — fluxo completo de resolução",
      tipo: "anual",
      stage: "validacao",
      organizationId: IDS.org,
      submitterId: IDS.submitter,
      budgetTotal: "10000.00",
    },
  ]);

  await Promise.all([
    insertEditableVersion(PROJECT_DEADLINE_OK_ID),
    insertEditableVersion(PROJECT_DEADLINE_BLOCKED_ID),
    insertEditableVersion(PROJECT_GATE_OWNER_ID),
    insertEditableVersion(PROJECT_WRONG_STAGE_ID),
    insertEditableVersion(PROJECT_RESOLVE_FLOW_ID),
  ]);
});

afterAll(async () => {
  const projectIds = [
    PROJECT_DEADLINE_OK_ID,
    PROJECT_DEADLINE_BLOCKED_ID,
    PROJECT_GATE_OWNER_ID,
    PROJECT_NO_EDIT_ID,
    PROJECT_WRONG_STAGE_ID,
    PROJECT_RESOLVE_FLOW_ID,
  ];
  await db
    .delete(submitterContestations)
    .where(eq(submitterContestations.submitterId, IDS.submitter));
  for (const projectId of projectIds) {
    await db
      .delete(projectVersions)
      .where(eq(projectVersions.projectId, projectId));
  }
  // audit_log de submitter_contestation.* referencia entityId = contestation.id
  // (não projectId) — limpar por actorId cobre os dois módulos numa passada
  // só, mesmo padrão de update-in-validation.test.ts (que só precisa de
  // entityId=projectId porque suas actions auditam com esse entityId).
  for (const id of [
    IDS.submitter,
    IDS.otherSubmitter,
    IDS.superAdmin,
    IDS.diretor,
  ]) {
    await db.delete(auditLog).where(eq(auditLog.actorId, id));
  }
  await db.delete(notifications).where(eq(notifications.userId, IDS.submitter));
  await db
    .delete(notifications)
    .where(eq(notifications.userId, IDS.superAdmin));
  await db.delete(meetingSessions).where(eq(meetingSessions.id, MEETING_ID));
  await db.delete(projects).where(eq(projects.organizationId, IDS.org));
  await db.delete(organizations).where(eq(organizations.id, IDS.org));
  for (const id of [
    IDS.submitter,
    IDS.otherSubmitter,
    IDS.superAdmin,
    IDS.diretor,
  ]) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of [
    IDS.submitter,
    IDS.otherSubmitter,
    IDS.superAdmin,
    IDS.diretor,
  ]) {
    await db.delete(users).where(eq(users.id, id));
  }
});

describe("createSubmitterContestation — prazo (Q33: 7 dias antes da reunião)", () => {
  // A reunião é removida ao final deste bloco (não só no afterAll do
  // arquivo) — os testes de "gates de negócio" abaixo precisam do canal
  // aberto (sem prazo iminente) para isolar exatamente a regra que cada um
  // exercita, sem herdar o prazo já vencido do teste "6 dias" acima.
  afterAll(async () => {
    await db.delete(meetingSessions).where(eq(meetingSessions.id, MEETING_ID));
  });

  it("contesta com 8 dias de folga até a reunião (deadline ainda não passou)", async () => {
    await db.insert(meetingSessions).values({
      id: MEETING_ID,
      date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      type: "mensal",
      status: "scheduled",
    });

    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.submitter,
      roles: ["submissor"],
    });
    const { createSubmitterContestation } = await import("../actions/projects");
    const result = await createSubmitterContestation({
      projectId: PROJECT_DEADLINE_OK_ID,
      reason: "O valor foi reduzido sem justificativa suficiente no email.",
    });

    expect(result?.serverError).toBeUndefined();

    const rows = await db
      .select()
      .from(submitterContestations)
      .where(eq(submitterContestations.projectId, PROJECT_DEADLINE_OK_ID));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("pending");

    // Notificação aos super_admins (Q32)
    const [notif] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, IDS.superAdmin));
    expect(notif).toBeDefined();
    expect(notif?.type).toBe("submitter_contestation.created");
  });

  it("não permite contestar com apenas 6 dias de folga (deadline já passou)", async () => {
    await db
      .update(meetingSessions)
      .set({ date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) })
      .where(eq(meetingSessions.id, MEETING_ID));

    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.submitter,
      roles: ["submissor"],
    });
    const { createSubmitterContestation } = await import("../actions/projects");
    const result = await createSubmitterContestation({
      projectId: PROJECT_DEADLINE_BLOCKED_ID,
      reason: "Contestação tentada fora do prazo permitido pela regra.",
    });

    expect(result?.serverError).toBeDefined();

    const rows = await db
      .select()
      .from(submitterContestations)
      .where(eq(submitterContestations.projectId, PROJECT_DEADLINE_BLOCKED_ID));
    expect(rows).toHaveLength(0);
  });
});

describe("createSubmitterContestation — gates de negócio", () => {
  it("outro submissor não pode contestar um projeto que não é seu", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.otherSubmitter,
      roles: ["submissor"],
    });
    const { createSubmitterContestation } = await import("../actions/projects");
    const result = await createSubmitterContestation({
      projectId: PROJECT_GATE_OWNER_ID,
      reason: "Tentativa de contestação por quem não é o submissor.",
    });

    expect(result?.serverError).toBeDefined();
  });

  it("recusa quando não há alteração da diretoria pendente de contestação", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.submitter,
      roles: ["submissor"],
    });
    const { createSubmitterContestation } = await import("../actions/projects");
    const result = await createSubmitterContestation({
      projectId: PROJECT_NO_EDIT_ID,
      reason: "Não deveria ser possível — nenhuma edição registrada ainda.",
    });

    expect(result?.serverError).toBeDefined();
  });

  it("recusa fora do estágio de validação", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.submitter,
      roles: ["submissor"],
    });
    const { createSubmitterContestation } = await import("../actions/projects");
    const result = await createSubmitterContestation({
      projectId: PROJECT_WRONG_STAGE_ID,
      reason: "Projeto já saiu de validação — não deveria aceitar.",
    });

    expect(result?.serverError).toBeDefined();
  });
});

describe("createSubmitterContestation + resolveSubmitterContestation — fluxo completo", () => {
  it("submissor contesta, super_admin resolve (aceita) com resposta, e uma segunda contestação sobre o mesmo evento é recusada", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.submitter,
      roles: ["submissor"],
    });
    const { createSubmitterContestation, resolveSubmitterContestation } =
      await import("../actions/projects");

    const createResult = await createSubmitterContestation({
      projectId: PROJECT_RESOLVE_FLOW_ID,
      reason: "O prazo de pagamento foi alterado sem consulta prévia.",
    });
    expect(createResult?.serverError).toBeUndefined();
    const contestationId = createResult?.data?.contestation.id;
    if (!contestationId) throw new Error("Contestação não criada");

    // Diretor não pode resolver — gate de superAdminAction
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.diretor,
      roles: ["diretor"],
    });
    const diretorAttempt = await resolveSubmitterContestation({
      contestationId,
      decision: "accepted",
      response: "Não deveria conseguir resolver.",
    });
    expect(diretorAttempt?.serverError).toBeDefined();

    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.superAdmin,
      roles: ["super_admin"],
    });
    const resolveResult = await resolveSubmitterContestation({
      contestationId,
      decision: "accepted",
      response: "Você tem razão, vamos ajustar o cronograma.",
    });
    expect(resolveResult?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(submitterContestations)
      .where(eq(submitterContestations.id, contestationId));
    expect(row?.status).toBe("accepted");
    expect(row?.response).toBe("Você tem razão, vamos ajustar o cronograma.");
    expect(row?.resolvedBy).toBe(IDS.superAdmin);
    expect(row?.resolvedAt).not.toBeNull();

    // Notificação ao submissor (P-2.17 CORRETIVO)
    const submitterNotifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, IDS.submitter));
    expect(
      submitterNotifs.some((n) => n.type === "submitter_contestation.resolved"),
    ).toBe(true);

    // Resolver de novo é recusado — ciclo já fechou
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.superAdmin,
      roles: ["super_admin"],
    });
    const doubleResolve = await resolveSubmitterContestation({
      contestationId,
      decision: "rejected",
      response: "Tentativa de resolver de novo.",
    });
    expect(doubleResolve?.serverError).toBeDefined();

    // Uma segunda contestação sobre o mesmo evento (sem nova edição) é
    // recusada — "uma vez por alteração".
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.submitter,
      roles: ["submissor"],
    });
    const secondAttempt = await createSubmitterContestation({
      projectId: PROJECT_RESOLVE_FLOW_ID,
      reason: "Segunda tentativa sobre a mesma alteração já contestada.",
    });
    expect(secondAttempt?.serverError).toBeDefined();
  });
});

/**
 * meeting-decisions.test.ts — PATCH-017: quem preside a reunião
 * (admin.meeting_sessions.chair_user_id) registra e atualiza o status de
 * decisões da própria sessão; super_admin continua podendo mutar qualquer
 * uma (0040_intranet_meeting_decisions_chair_rls.sql). diretor/conselheiro
 * que não presidem a sessão são barrados.
 *
 * Mesmo padrão de runtime-rls.test.ts: chama as Server Actions exportadas
 * de verdade, com atores reais em public.role_assignments. Um teste extra
 * insere direto via withAuthenticatedContext, ignorando o gate JS da
 * action, para provar que quem barra é a RLS — não só a checagem da
 * aplicação.
 *
 * notifyMeetingDecisionCreated é mockada: sem o mock, cada decisão criada
 * dispararia notificação in_app para todo diretor/conselheiro/super_admin
 * já cadastrados no banco (não só os atores de teste abaixo).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  users,
  roleAssignments,
  meetingSessions,
  meetingDecisions,
  auditLog,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

vi.mock("../lib/notifications", () => ({
  notifyMeetingDecisionCreated: vi.fn(),
}));

async function actingAs(userId: string, roles: string[]): Promise<void> {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId: userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roles: roles as any,
    designations: [],
  });
}

const IDS = {
  chairDiretor: "e2000000-0000-0000-0000-000000000001",
  nonChairDiretor: "e2000000-0000-0000-0000-000000000002",
  chairConselheiro: "e2000000-0000-0000-0000-000000000003",
  superAdmin: "e2000000-0000-0000-0000-000000000004",
};

const SESSION_IDS = {
  chairedByDiretor: "e2100000-0000-0000-0000-000000000001",
  chairedByConselheiro: "e2100000-0000-0000-0000-000000000002",
};

beforeAll(async () => {
  await db
    .insert(users)
    .values(
      Object.entries(IDS).map(([key, id]) => ({
        id,
        email: `meeting-decisions-${key}@test.hebron`,
        fullName: `Meeting Decisions ${key}`,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      {
        userId: IDS.chairDiretor,
        role: "diretor",
        grantedBy: IDS.superAdmin,
      },
      {
        userId: IDS.nonChairDiretor,
        role: "diretor",
        grantedBy: IDS.superAdmin,
      },
      {
        userId: IDS.chairConselheiro,
        role: "conselheiro",
        grantedBy: IDS.superAdmin,
      },
      {
        userId: IDS.superAdmin,
        role: "super_admin",
        grantedBy: IDS.superAdmin,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(meetingSessions)
    .values([
      {
        id: SESSION_IDS.chairedByDiretor,
        date: new Date("2026-06-01T14:00:00Z"),
        type: "ordinaria",
        chairUserId: IDS.chairDiretor,
      },
      {
        id: SESSION_IDS.chairedByConselheiro,
        date: new Date("2026-06-08T14:00:00Z"),
        type: "ordinaria",
        chairUserId: IDS.chairConselheiro,
      },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(auditLog)
    .where(inArray(auditLog.actorId, Object.values(IDS)));
  await db
    .delete(meetingDecisions)
    .where(
      inArray(meetingDecisions.meetingSessionId, Object.values(SESSION_IDS)),
    );
  await db
    .delete(meetingSessions)
    .where(inArray(meetingSessions.id, Object.values(SESSION_IDS)));
  for (const id of Object.values(IDS)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS)) {
    await db.delete(users).where(eq(users.id, id));
  }
});

describe("createMeetingDecision — presidente da sessão (PATCH-017)", () => {
  it("presidente diretor registra decisão da própria sessão", async () => {
    await actingAs(IDS.chairDiretor, ["diretor"]);
    const { createMeetingDecision } = await import("../actions/decisions");

    const result = await createMeetingDecision({
      meetingSessionId: SESSION_IDS.chairedByDiretor,
      description: "Aprovar orçamento do próximo trimestre.",
      responsibleId: IDS.chairDiretor,
      createTask: false,
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.decision.meetingSessionId).toBe(
      SESSION_IDS.chairedByDiretor,
    );

    const decisionId = result?.data?.decision.id;
    expect(decisionId).toBeDefined();
    if (!decisionId) throw new Error("decision id not found");

    const [audit] = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(eq(auditLog.entityId, decisionId));
    expect(audit?.action).toBe("meeting_decision.created");
  });

  it("diretor não-presidente não registra decisão de sessão alheia", async () => {
    await actingAs(IDS.nonChairDiretor, ["diretor"]);
    const { createMeetingDecision } = await import("../actions/decisions");

    const result = await createMeetingDecision({
      meetingSessionId: SESSION_IDS.chairedByDiretor,
      description: "Tentativa de decisão fora da própria sessão.",
      responsibleId: IDS.nonChairDiretor,
      createTask: false,
    });

    expect(result?.serverError).toBeDefined();
  });

  it("conselheiro presidente registra decisão da própria sessão", async () => {
    await actingAs(IDS.chairConselheiro, ["conselheiro"]);
    const { createMeetingDecision } = await import("../actions/decisions");

    const result = await createMeetingDecision({
      meetingSessionId: SESSION_IDS.chairedByConselheiro,
      description: "Aprovar parceria com nova instituição.",
      responsibleId: IDS.chairConselheiro,
      createTask: false,
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.decision.meetingSessionId).toBe(
      SESSION_IDS.chairedByConselheiro,
    );
  });

  it("super_admin registra decisão em qualquer sessão", async () => {
    await actingAs(IDS.superAdmin, ["super_admin"]);
    const { createMeetingDecision } = await import("../actions/decisions");

    const result = await createMeetingDecision({
      meetingSessionId: SESSION_IDS.chairedByDiretor,
      description: "Decisão registrada diretamente pelo super_admin.",
      responsibleId: IDS.superAdmin,
      createTask: false,
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.decision.meetingSessionId).toBe(
      SESSION_IDS.chairedByDiretor,
    );
  });
});

describe("updateMeetingDecisionStatus — mesmas regras de permissão", () => {
  it("presidente da sessão atualiza status da própria decisão", async () => {
    await actingAs(IDS.chairDiretor, ["diretor"]);
    const { createMeetingDecision, updateMeetingDecisionStatus } =
      await import("../actions/decisions");

    const created = await createMeetingDecision({
      meetingSessionId: SESSION_IDS.chairedByDiretor,
      description: "Decisão para teste de atualização de status.",
      responsibleId: IDS.chairDiretor,
      createTask: false,
    });
    const decisionId = created?.data?.decision.id;
    expect(decisionId).toBeDefined();
    if (!decisionId) throw new Error("decision id not found");

    await actingAs(IDS.chairDiretor, ["diretor"]);
    const updated = await updateMeetingDecisionStatus({
      meetingDecisionId: decisionId,
      status: "em_andamento",
    });

    expect(updated?.serverError).toBeUndefined();
    expect(updated?.data?.decision.status).toBe("em_andamento");

    const [audit] = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entityId, decisionId),
          eq(auditLog.action, "meeting_decision.status_updated"),
        ),
      );
    expect(audit?.action).toBe("meeting_decision.status_updated");
  });

  it("diretor não-presidente não atualiza status de decisão alheia", async () => {
    await actingAs(IDS.chairDiretor, ["diretor"]);
    const { createMeetingDecision } = await import("../actions/decisions");
    const created = await createMeetingDecision({
      meetingSessionId: SESSION_IDS.chairedByDiretor,
      description: "Decisão de outro presidente, para teste de negação.",
      responsibleId: IDS.chairDiretor,
      createTask: false,
    });
    const decisionId = created?.data?.decision.id;
    expect(decisionId).toBeDefined();
    if (!decisionId) throw new Error("decision id not found");

    await actingAs(IDS.nonChairDiretor, ["diretor"]);
    const { updateMeetingDecisionStatus } =
      await import("../actions/decisions");
    const result = await updateMeetingDecisionStatus({
      meetingDecisionId: decisionId,
      status: "concluida",
    });

    expect(result?.serverError).toBeDefined();
  });

  it("super_admin atualiza status de qualquer decisão", async () => {
    await actingAs(IDS.chairConselheiro, ["conselheiro"]);
    const { createMeetingDecision } = await import("../actions/decisions");
    const created = await createMeetingDecision({
      meetingSessionId: SESSION_IDS.chairedByConselheiro,
      description: "Decisão do conselheiro, atualizada pelo super_admin.",
      responsibleId: IDS.chairConselheiro,
      createTask: false,
    });
    const decisionId = created?.data?.decision.id;
    expect(decisionId).toBeDefined();
    if (!decisionId) throw new Error("decision id not found");

    await actingAs(IDS.superAdmin, ["super_admin"]);
    const { updateMeetingDecisionStatus } =
      await import("../actions/decisions");
    const result = await updateMeetingDecisionStatus({
      meetingDecisionId: decisionId,
      status: "concluida",
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.decision.status).toBe("concluida");
  });
});

describe("RLS real em intranet.meeting_decisions — não é só o gate JS da action", () => {
  it("Postgres rejeita INSERT de diretor que não preside a sessão, mesmo ignorando o gate JS da action", async () => {
    await expect(
      withAuthenticatedContext({ actorId: IDS.nonChairDiretor }, (tx) =>
        tx.insert(meetingDecisions).values({
          meetingSessionId: SESSION_IDS.chairedByDiretor,
          description: "INSERT direto ignorando o gate JS da action.",
          responsibleId: IDS.nonChairDiretor,
        }),
      ),
    ).rejects.toThrow();
  });

  it("Postgres permite INSERT do presidente real da sessão via authenticated", async () => {
    await expect(
      withAuthenticatedContext({ actorId: IDS.chairConselheiro }, (tx) =>
        tx.insert(meetingDecisions).values({
          meetingSessionId: SESSION_IDS.chairedByConselheiro,
          description: "INSERT direto do presidente real, via RLS.",
          responsibleId: IDS.chairConselheiro,
        }),
      ),
    ).resolves.not.toThrow();
  });
});

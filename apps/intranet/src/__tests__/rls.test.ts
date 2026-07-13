/**
 * rls.test.ts — P-5.12: cobre os critérios de aceite que não têm arquivo
 * dedicado ("RLS: colaborador não cria anúncios; diretor sim", "Dashboard
 * config persiste e carrega", "Decisão → tarefa funciona").
 *
 * "RLS: colaborador não cria anúncios; diretor sim" já tinha cobertura do
 * gate JS + de um ator "fantasma" (claim de diretor sem role_assignments
 * real) em runtime-rls.test.ts (PATCH-016/P-0.17). Este arquivo cobre o caso
 * que faltava: um COLABORADOR real (role_assignments verdadeiro) tentando
 * INSERT direto em intranet.announcements via withAuthenticatedContext,
 * ignorando o gate JS de createAnnouncement (boardAction) — só
 * announcements_insert_board (0037_intranet_rls.sql) pode barrar, provando
 * que a RLS em si, não só a aplicação, nega o colaborador.
 *
 * "Decisão → tarefa" já tinha cobertura do contrato createAutoTask isolado
 * em packages/integrations/src/__tests__/tarefas.test.ts (P-5.11). Aqui o
 * teste é end-to-end pela Server Action real (createMeetingDecision com
 * createTask: true), verificando que a tarefa criada em tarefas.tasks é a
 * mesma referenciada por meeting_decisions.task_id.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  users,
  roleAssignments,
  announcements,
  auditLog,
  dashboardConfigs,
  meetingSessions,
  meetingDecisions,
  tasks,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

vi.mock("../lib/notifications", () => ({
  notifyUrgentAnnouncement: vi.fn(),
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
  colaborador: "e4000000-0000-0000-0000-000000000001",
  diretor: "e4000000-0000-0000-0000-000000000002",
  superAdmin: "e4000000-0000-0000-0000-000000000003",
};

const SESSION_ID = "e4100000-0000-0000-0000-000000000001";

beforeAll(async () => {
  await db
    .insert(users)
    .values(
      Object.entries(IDS).map(([key, id]) => ({
        id,
        email: `rls-test-${key}@test.hebron`,
        fullName: `RLS Test ${key}`,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      {
        userId: IDS.colaborador,
        role: "colaborador",
        grantedBy: IDS.superAdmin,
      },
      { userId: IDS.diretor, role: "diretor", grantedBy: IDS.superAdmin },
      {
        userId: IDS.superAdmin,
        role: "super_admin",
        grantedBy: IDS.superAdmin,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(meetingSessions)
    .values({
      id: SESSION_ID,
      date: new Date("2026-07-01T14:00:00Z"),
      type: "ordinaria",
      chairUserId: IDS.diretor,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  const decisionRows = await db
    .select({ id: meetingDecisions.id, taskId: meetingDecisions.taskId })
    .from(meetingDecisions)
    .where(eq(meetingDecisions.meetingSessionId, SESSION_ID));
  const taskIds = decisionRows
    .map((r) => r.taskId)
    .filter((id): id is string => id !== null);

  await db
    .delete(meetingDecisions)
    .where(eq(meetingDecisions.meetingSessionId, SESSION_ID));
  if (taskIds.length > 0) {
    await db.delete(tasks).where(inArray(tasks.id, taskIds));
  }
  await db.delete(meetingSessions).where(eq(meetingSessions.id, SESSION_ID));

  await db
    .delete(auditLog)
    .where(inArray(auditLog.actorId, Object.values(IDS)));
  await db
    .delete(announcements)
    .where(inArray(announcements.authorId, Object.values(IDS)));
  await db
    .delete(dashboardConfigs)
    .where(inArray(dashboardConfigs.userId, Object.values(IDS)));
  for (const id of Object.values(IDS)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS)) {
    await db.delete(users).where(eq(users.id, id));
  }
});

describe("RLS real em intranet.announcements — colaborador não publica, diretor sim", () => {
  it("Postgres rejeita INSERT de colaborador real, mesmo ignorando o gate JS de createAnnouncement", async () => {
    await expect(
      withAuthenticatedContext({ actorId: IDS.colaborador }, (tx) =>
        tx.insert(announcements).values({
          title: "Tentativa de anúncio por colaborador",
          body: "INSERT direto ignorando o gate JS da action, via colaborador real.",
          priority: "normal",
          authorId: IDS.colaborador,
        }),
      ),
    ).rejects.toThrow();

    const rows = await db
      .select({ id: announcements.id })
      .from(announcements)
      .where(eq(announcements.authorId, IDS.colaborador));
    expect(rows).toHaveLength(0);
  });

  it("Postgres permite INSERT de diretor real via authenticated", async () => {
    await expect(
      withAuthenticatedContext({ actorId: IDS.diretor }, (tx) =>
        tx.insert(announcements).values({
          title: "Anúncio de diretor real",
          body: "INSERT direto do diretor real, via RLS.",
          priority: "normal",
          authorId: IDS.diretor,
        }),
      ),
    ).resolves.not.toThrow();
  });

  it("createAnnouncement (Server Action): colaborador é barrado, diretor publica", async () => {
    await actingAs(IDS.colaborador, ["colaborador"]);
    const { createAnnouncement } = await import("../actions/announcements");

    const denied = await createAnnouncement({
      title: "Anúncio via action, colaborador",
      body: "Corpo do anúncio de teste com mais de dez caracteres.",
      priority: "normal",
    });
    expect(denied?.serverError).toBeDefined();

    await actingAs(IDS.diretor, ["diretor"]);
    const allowed = await createAnnouncement({
      title: "Anúncio via action, diretor",
      body: "Corpo do anúncio de teste com mais de dez caracteres.",
      priority: "normal",
    });
    expect(allowed?.serverError).toBeUndefined();
    expect(allowed?.data?.announcement.authorId).toBe(IDS.diretor);
  });
});

describe("Dashboard config — persiste e carrega (dashboard_configs_write_own)", () => {
  it("salva e recarrega o arranjo de widgets do usuário autenticado", async () => {
    await actingAs(IDS.colaborador, ["colaborador"]);
    const { saveDashboardConfig, getDashboardConfig } =
      await import("../actions/dashboard");

    const widgetId = "b1000000-0000-0000-0000-000000000001";
    const saved = await saveDashboardConfig({
      widgets: [{ id: widgetId, type: "kpi", position: 0, config: {} }],
    });
    expect(saved?.serverError).toBeUndefined();
    expect(saved?.data?.config.widgets).toEqual([
      { id: widgetId, type: "kpi", position: 0, config: {} },
    ]);

    await actingAs(IDS.colaborador, ["colaborador"]);
    const loaded = await getDashboardConfig({});
    expect(loaded?.serverError).toBeUndefined();
    expect(loaded?.data?.config?.userId).toBe(IDS.colaborador);
    expect(loaded?.data?.config?.widgets).toEqual([
      { id: widgetId, type: "kpi", position: 0, config: {} },
    ]);

    // Upsert: uma segunda gravação substitui o arranjo (1 linha por usuário).
    const widgetId2 = "b1000000-0000-0000-0000-000000000002";
    await actingAs(IDS.colaborador, ["colaborador"]);
    await saveDashboardConfig({
      widgets: [{ id: widgetId2, type: "chart", position: 0, config: {} }],
    });

    await actingAs(IDS.colaborador, ["colaborador"]);
    const reloaded = await getDashboardConfig({});
    expect(reloaded?.data?.config?.widgets).toEqual([
      { id: widgetId2, type: "chart", position: 0, config: {} },
    ]);
  });
});

describe("Decisão de reunião → tarefa (createMeetingDecision createTask=true)", () => {
  it("cria a tarefa via createAutoTask e vincula meeting_decisions.task_id à tarefa real", async () => {
    await actingAs(IDS.diretor, ["diretor"]);
    const { createMeetingDecision } = await import("../actions/decisions");

    const result = await createMeetingDecision({
      meetingSessionId: SESSION_ID,
      description: "Revisar contrato de manutenção do prédio-sede.",
      responsibleId: IDS.diretor,
      createTask: true,
    });

    expect(result?.serverError).toBeUndefined();
    const decision = result?.data?.decision;
    expect(decision?.taskId).toBeTruthy();
    if (!decision?.taskId) throw new Error("taskId não retornado");

    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, decision.taskId));
    expect(task).toBeDefined();
    expect(task?.source).toBe("auto");
    expect(task?.needsManualAssignment).toBe(true);
    expect(task?.sourceRef).toEqual({
      sourceModule: "intranet",
      sourceId: decision.id,
    });

    const [storedDecision] = await db
      .select({ taskId: meetingDecisions.taskId })
      .from(meetingDecisions)
      .where(eq(meetingDecisions.id, decision.id));
    expect(storedDecision?.taskId).toBe(decision.taskId);
  });
});

/**
 * auto-assignment.test.ts — fecha o ciclo de tarefas automáticas órfãs (P-4.8b)
 *
 * BRAIN §6.9: "Tarefas auto-geradas de outros módulos: super_admin atribui
 * manualmente após criação." `assignTaskManually` (P-4.8) escrevia isso, mas
 * não tinha consumidor de UI e `updateTask` nunca desligava
 * `needs_manual_assignment` — cobre as duas metades do ciclo:
 *  - createAutoTask cria a tarefa SEM assignee, com a flag ligada;
 *  - assignTaskManually e updateTask (super_admin, responsáveis não-vazios)
 *    desligam a flag da mesma forma;
 *  - remover o responsável de uma tarefa `source = 'auto'` volta a marcá-la
 *    como órfã; uma tarefa `source = 'manual'` nunca liga a flag;
 *  - colaborador sem papel super_admin não passa pelo gate de
 *    assignTaskManually (defense in depth, G6.1).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, roleAssignments, tasks, assignees } from "@hebron/db/schema";
import { createAutoTask } from "@hebron/integrations/tarefas";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
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
  colaborador: "ea000000-0000-0000-0000-000000000001",
  superAdmin: "ea000000-0000-0000-0000-000000000002",
  responsavel: "ea000000-0000-0000-0000-000000000003",
};

const createdTaskIds = new Set<string>();

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.colaborador,
        email: "auto-assign-colab@test.hebron",
        fullName: "Auto Assignment Colaborador",
      },
      {
        id: IDS.superAdmin,
        email: "auto-assign-super@test.hebron",
        fullName: "Auto Assignment SuperAdmin",
      },
      {
        id: IDS.responsavel,
        email: "auto-assign-resp@test.hebron",
        fullName: "Auto Assignment Responsável",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      {
        userId: IDS.colaborador,
        role: "colaborador",
        grantedBy: IDS.superAdmin,
      },
      {
        userId: IDS.superAdmin,
        role: "super_admin",
        grantedBy: IDS.superAdmin,
      },
      {
        userId: IDS.responsavel,
        role: "colaborador",
        grantedBy: IDS.superAdmin,
      },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  if (createdTaskIds.size > 0) {
    const ids = Array.from(createdTaskIds);
    await db.delete(assignees).where(inArray(assignees.taskId, ids));
    await db.delete(tasks).where(inArray(tasks.id, ids));
  }
  for (const id of Object.values(IDS)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS)) {
    await db.delete(users).where(eq(users.id, id));
  }
});

async function spawnAutoTask(sourceId: string): Promise<string> {
  const { taskId } = await createAutoTask({
    title: `Tarefa automática (teste P-4.8b) ${sourceId}`,
    workspace: "administrativo",
    sourceModule: "flats",
    sourceId,
  });
  createdTaskIds.add(taskId);
  return taskId;
}

describe("createAutoTask — nasce sem assignee e com needs_manual_assignment ligada", () => {
  it("tarefa automática nasce órfã", async () => {
    const taskId = await spawnAutoTask("reserva-teste-nasce-orfa");

    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    expect(task?.source).toBe("auto");
    expect(task?.needsManualAssignment).toBe(true);

    const rows = await db
      .select()
      .from(assignees)
      .where(eq(assignees.taskId, taskId));
    expect(rows).toHaveLength(0);
  });
});

describe("assignTaskManually — fecha o ciclo: liga o assignee e desliga a flag", () => {
  it("super_admin atribui responsável: assignee gravado e flag desliga", async () => {
    const taskId = await spawnAutoTask("reserva-teste-assign-manually");

    await actingAs(IDS.superAdmin, ["super_admin"]);
    const { assignTaskManually } = await import("../actions/tasks");
    const result = await assignTaskManually({
      taskId,
      assigneeIds: [IDS.responsavel],
    });
    expect(result?.serverError).toBeUndefined();

    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    expect(task?.needsManualAssignment).toBe(false);

    const rows = await db
      .select()
      .from(assignees)
      .where(eq(assignees.taskId, taskId));
    expect(rows.map((r) => r.userId)).toEqual([IDS.responsavel]);
  });

  it("colaborador não é super_admin: gate da action bloqueia antes de tocar no banco", async () => {
    const taskId = await spawnAutoTask("reserva-teste-gate-colaborador");

    await actingAs(IDS.colaborador, ["colaborador"]);
    const { assignTaskManually } = await import("../actions/tasks");
    const result = await assignTaskManually({
      taskId,
      assigneeIds: [IDS.colaborador],
    });
    expect(result?.serverError).toBeDefined();

    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    expect(task?.needsManualAssignment).toBe(true);

    const rows = await db
      .select()
      .from(assignees)
      .where(eq(assignees.taskId, taskId));
    expect(rows).toHaveLength(0);
  });
});

describe("updateTask — atribuir/remover responsável sincroniza needs_manual_assignment", () => {
  it("super_admin atribui responsável via updateTask: mesmo efeito de assignTaskManually", async () => {
    const taskId = await spawnAutoTask("reserva-teste-update-atribui");

    await actingAs(IDS.superAdmin, ["super_admin"]);
    const { updateTask } = await import("../actions/tasks");
    const result = await updateTask({
      taskId,
      assigneeIds: [IDS.responsavel],
    });
    expect(result?.serverError).toBeUndefined();

    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    expect(task?.needsManualAssignment).toBe(false);
  });

  it("remover o único responsável de uma tarefa automática volta a marcá-la como órfã", async () => {
    const taskId = await spawnAutoTask("reserva-teste-update-remove");

    await actingAs(IDS.superAdmin, ["super_admin"]);
    const { updateTask } = await import("../actions/tasks");

    const assigned = await updateTask({
      taskId,
      assigneeIds: [IDS.responsavel],
    });
    expect(assigned?.serverError).toBeUndefined();

    await actingAs(IDS.superAdmin, ["super_admin"]);
    const removed = await updateTask({ taskId, assigneeIds: [] });
    expect(removed?.serverError).toBeUndefined();

    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    expect(task?.needsManualAssignment).toBe(true);
  });

  it("tarefa manual nunca liga a flag, mesmo removendo o responsável", async () => {
    await actingAs(IDS.colaborador, ["colaborador"]);
    const { createTask, updateTask } = await import("../actions/tasks");

    const created = await createTask({
      title: "Tarefa manual (teste P-4.8b)",
      workspace: "administrativo",
      priority: "media",
      assigneeIds: [IDS.responsavel],
      tagIds: [],
    });
    expect(created?.serverError).toBeUndefined();
    const taskId = created?.data?.task.id as unknown as string;
    createdTaskIds.add(taskId);

    await actingAs(IDS.colaborador, ["colaborador"]);
    const removed = await updateTask({ taskId, assigneeIds: [] });
    expect(removed?.serverError).toBeUndefined();

    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    expect(task?.source).toBe("manual");
    expect(task?.needsManualAssignment).toBe(false);
  });
});

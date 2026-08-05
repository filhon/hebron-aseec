/**
 * tasks.test.ts — P-4.8d (CORRETIVO): as duas metades faltantes do CRUD de
 * tarefas. `updateTask` passa a aceitar `workspace` (move a tarefa de quadro,
 * com evento registrado) e `deleteTask` — que já fazia soft-delete desde
 * PATCH-015, mas não tinha consumidor de UI nem teste que exercitasse o
 * caminho completo (tarefa some das queries, linha permanece no banco).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  workspaces,
  tasks,
  taskEvents,
} from "@hebron/db/schema";

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
  colaboradorA: "fa000000-0000-0000-0000-000000000001",
  colaboradorB: "fa000000-0000-0000-0000-000000000002",
};

let administrativoId: string;
let financeiroId: string;

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.colaboradorA,
        email: "tasks-colab-a@test.hebron",
        fullName: "Tasks Colaborador A",
      },
      {
        id: IDS.colaboradorB,
        email: "tasks-colab-b@test.hebron",
        fullName: "Tasks Colaborador B",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      {
        userId: IDS.colaboradorA,
        role: "colaborador",
        grantedBy: IDS.colaboradorA,
      },
      {
        userId: IDS.colaboradorB,
        role: "colaborador",
        grantedBy: IDS.colaboradorA,
      },
    ])
    .onConflictDoNothing();

  const rows = await db
    .select({ id: workspaces.id, slug: workspaces.slug })
    .from(workspaces)
    .where(inArray(workspaces.slug, ["administrativo", "financeiro"]));
  const admin = rows.find((r) => r.slug === "administrativo");
  const fin = rows.find((r) => r.slug === "financeiro");
  if (!admin || !fin)
    throw new Error("Workspaces administrativo/financeiro não encontrados");
  administrativoId = admin.id;
  financeiroId = fin.id;
});

afterAll(async () => {
  for (const id of Object.values(IDS)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS)) {
    await db.delete(users).where(eq(users.id, id));
  }
});

// ---------------------------------------------------------------------------
// updateTask — mover de módulo
// ---------------------------------------------------------------------------

describe("updateTask — trocar o módulo move a tarefa de quadro", () => {
  const taskId = "fa110000-0000-0000-0000-000000000001";

  beforeAll(async () => {
    await db
      .insert(tasks)
      .values({
        id: taskId,
        title: "Tarefa que nasceu no módulo errado",
        workspaceId: administrativoId,
        createdBy: IDS.colaboradorA,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await db.delete(tasks).where(eq(tasks.id, taskId));
  });

  it("persiste, aparece no módulo de destino, some do de origem, e registra evento", async () => {
    const { updateTask } = await import("../actions/tasks");
    const { getTasksByWorkspace, getTaskById } = await import("../lib/queries");

    await actingAs(IDS.colaboradorA, ["colaborador"]);
    const result = await updateTask({
      taskId,
      workspace: "financeiro",
    });
    expect(result?.serverError).toBeUndefined();

    await actingAs(IDS.colaboradorA, ["colaborador"]);
    const financeiroTasks = await getTasksByWorkspace("financeiro");
    expect(financeiroTasks.some((t) => t.id === taskId)).toBe(true);

    await actingAs(IDS.colaboradorA, ["colaborador"]);
    const administrativoTasks = await getTasksByWorkspace("administrativo");
    expect(administrativoTasks.some((t) => t.id === taskId)).toBe(false);

    await actingAs(IDS.colaboradorA, ["colaborador"]);
    const task = await getTaskById(taskId);
    expect(task?.workspace).toBe("financeiro");

    const events = await db
      .select()
      .from(taskEvents)
      .where(eq(taskEvents.taskId, taskId));
    expect(
      events.some(
        (e) =>
          e.eventType === "updated" &&
          (e.diff as Record<string, unknown> | null)?.workspaceId ===
            financeiroId,
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// deleteTask — soft-delete some das queries, permanece no banco
// ---------------------------------------------------------------------------

describe("deleteTask — some das listas, do quadro e do calendário", () => {
  const taskId = "fa220000-0000-0000-0000-000000000001";

  beforeAll(async () => {
    await db
      .insert(tasks)
      .values({
        id: taskId,
        title: "Tarefa criada por engano",
        workspaceId: administrativoId,
        createdBy: IDS.colaboradorA,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await db.delete(tasks).where(eq(tasks.id, taskId));
  });

  it("criador exclui: tarefa some de getTasks/getTasksByWorkspace/getTaskById, linha permanece com deleted_at", async () => {
    const { deleteTask } = await import("../actions/tasks");
    const { getTasks, getTasksByWorkspace, getTaskById } =
      await import("../lib/queries");

    await actingAs(IDS.colaboradorA, ["colaborador"]);
    const result = await deleteTask({ taskId });
    expect(result?.data?.task).toBeDefined();

    await actingAs(IDS.colaboradorA, ["colaborador"]);
    const all = await getTasks();
    expect(all.some((t) => t.id === taskId)).toBe(false);

    await actingAs(IDS.colaboradorA, ["colaborador"]);
    const byWorkspace = await getTasksByWorkspace("administrativo");
    expect(byWorkspace.some((t) => t.id === taskId)).toBe(false);

    await actingAs(IDS.colaboradorA, ["colaborador"]);
    const byId = await getTaskById(taskId);
    expect(byId).toBeNull();

    const [row] = await db
      .select({ deletedAt: tasks.deletedAt })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    expect(row?.deletedAt).not.toBeNull();
  });
});

describe("deleteTask — colaborador sem vínculo não exclui", () => {
  const taskId = "fa220000-0000-0000-0000-000000000002";

  beforeAll(async () => {
    await db
      .insert(tasks)
      .values({
        id: taskId,
        title: "Tarefa de colaboradorA",
        workspaceId: administrativoId,
        createdBy: IDS.colaboradorA,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await db.delete(tasks).where(eq(tasks.id, taskId));
  });

  it("colaboradorB (não é criador nem responsável) não exclui a tarefa de colaboradorA", async () => {
    const { deleteTask } = await import("../actions/tasks");

    await actingAs(IDS.colaboradorB, ["colaborador"]);
    const result = await deleteTask({ taskId });
    expect(result?.serverError).toBeDefined();

    const [row] = await db
      .select({ deletedAt: tasks.deletedAt })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    expect(row?.deletedAt).toBeNull();
  });
});

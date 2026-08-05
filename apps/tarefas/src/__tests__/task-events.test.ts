/**
 * task-events.test.ts — P-4.6b (CORRETIVO): getTaskEvents lê o log que os
 * oito call-sites de actions/tasks.ts já gravam em tarefas.task_events
 * (schema em packages/db/src/schema/tarefas.ts:418-438). Antes deste prompt
 * nada lia a tabela — só o painel "Atividade" da tela de detalhe, que
 * mostrava carimbos derivados de `tasks`, nunca o log em si.
 *
 * Cobre: uma sequência real de mutações produz os eventos esperados na
 * ordem esperada (mais recente primeiro) com o ator certo; um colaborador
 * sem vínculo com a tarefa lê o histórico inteiro (transparência interna,
 * BRAIN §6.9); um papel externo não lê nada (RLS task_events_select_staff,
 * 0033_tarefas_rls.sql:357-362 — devolve lista vazia, não erro).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  tasks,
  subtasks,
  taskEvents,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

/** Troca o ator/papel só para a próxima chamada de resolveSession (action ou
 * getActorId de queries.ts) — mesmo padrão de tasks.test.ts/attachments.test.ts. */
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
  autor: "eb000000-0000-0000-0000-000000000001",
  colaboradorSemVinculo: "eb000000-0000-0000-0000-000000000002",
  submissor: "eb000000-0000-0000-0000-000000000003",
};

const createdTaskIds = new Set<string>();

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.autor,
        email: "task-events-autor@test.hebron",
        fullName: "Task Events Autor",
      },
      {
        id: IDS.colaboradorSemVinculo,
        email: "task-events-colab@test.hebron",
        fullName: "Task Events Colaborador",
      },
      {
        id: IDS.submissor,
        email: "task-events-submissor@test.hebron",
        fullName: "Task Events Submissor",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      { userId: IDS.autor, role: "colaborador", grantedBy: IDS.autor },
      {
        userId: IDS.colaboradorSemVinculo,
        role: "colaborador",
        grantedBy: IDS.autor,
      },
      { userId: IDS.submissor, role: "submissor", grantedBy: IDS.autor },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  const taskIds = Array.from(createdTaskIds);
  if (taskIds.length > 0) {
    await db.delete(taskEvents).where(inArray(taskEvents.taskId, taskIds));
    await db.delete(subtasks).where(inArray(subtasks.taskId, taskIds));
    await db.delete(tasks).where(inArray(tasks.id, taskIds));
  }
  const userIds = Object.values(IDS);
  await db
    .delete(roleAssignments)
    .where(inArray(roleAssignments.userId, userIds));
  await db.delete(users).where(inArray(users.id, userIds));
});

describe("getTaskEvents — criar → mover → adicionar subtarefa → concluir", () => {
  let taskId: string;

  beforeAll(async () => {
    const { createTask } = await import("../actions/tasks");
    const { updateTaskStatus, createSubtask } =
      await import("../actions/tasks");

    await actingAs(IDS.autor, ["colaborador"]);
    const created = await createTask({
      title: "Tarefa para o log de atividade",
      description: null,
      workspace: "administrativo",
      priority: "media",
      dueDate: null,
      assigneeIds: [],
      tagIds: [],
      recurrenceRule: null,
    });
    if (!created?.data?.task) throw new Error("Falha ao criar tarefa base");
    taskId = created.data.task.id;
    createdTaskIds.add(taskId);

    await actingAs(IDS.autor, ["colaborador"]);
    await updateTaskStatus({ taskId, status: "em_progresso" });

    await actingAs(IDS.autor, ["colaborador"]);
    await createSubtask({
      taskId,
      title: "Revisar rascunho",
      assigneeId: null,
    });

    await actingAs(IDS.autor, ["colaborador"]);
    await updateTaskStatus({ taskId, status: "concluido" });
  });

  it("devolve os quatro eventos em ordem cronológica inversa, com o ator certo", async () => {
    const { getTaskEvents } = await import("../lib/queries");

    await actingAs(IDS.autor, ["colaborador"]);
    const events = await getTaskEvents(taskId);

    expect(events.map((e) => e.eventType)).toEqual([
      "status_changed",
      "subtask_created",
      "status_changed",
      "created",
    ]);
    expect(events.every((e) => e.actorId === IDS.autor)).toBe(true);
    expect(events.every((e) => e.actorName === "Task Events Autor")).toBe(true);

    // Mais recente primeiro: o "concluido" vem antes do "em_progresso".
    expect(events[0]?.diff).toMatchObject({ status: "concluido" });
    expect(events[1]?.diff).toMatchObject({ title: "Revisar rascunho" });
    expect(events[2]?.diff).toMatchObject({ status: "em_progresso" });
    expect(events[3]?.diff).toBeNull();
  });

  it("um colaborador sem vínculo com a tarefa lê o histórico inteiro (transparência interna)", async () => {
    const { getTaskEvents } = await import("../lib/queries");

    await actingAs(IDS.colaboradorSemVinculo, ["colaborador"]);
    const events = await getTaskEvents(taskId);

    expect(events).toHaveLength(4);
  });

  it("um papel externo (submissor) não lê nenhum evento", async () => {
    const { getTaskEvents } = await import("../lib/queries");

    await actingAs(IDS.submissor, ["submissor"]);
    const events = await getTaskEvents(taskId);

    expect(events).toEqual([]);
  });
});

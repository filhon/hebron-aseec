/**
 * time-tracking.test.ts — lançamento manual de horas (P-4.4c: actions/time-tracking.ts::createManualTimeEntry)
 *
 * Cobre a lacuna registrada em S-76: createManualTimeEntry existia desde
 * P-4.8 sem nenhum consumidor de UI e sem cobertura própria. Valida o
 * contrato que o TimeTracker passa a usar: lançamento válido soma ao total
 * da tarefa, fim antes do início é recusado por createTimeEntrySchema
 * (refine, validationErrors) e sobreposição com um cronômetro em andamento
 * do mesmo usuário é recusada na action — mesma regra que startTimeEntry já
 * aplica para um segundo cronômetro simultâneo.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  workspaces,
  tasks,
  taskEvents,
  timeEntries,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const ACTOR_ID = "ec400000-0000-0000-0000-000000000001";

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: ACTOR_ID,
    roles: ["colaborador"],
    designations: [],
  }),
}));

let taskId: string;

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: ACTOR_ID,
      email: "time-tracking-test@test.hebron",
      fullName: "Time Tracking Tester",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: ACTOR_ID, role: "colaborador", grantedBy: ACTOR_ID })
    .onConflictDoNothing();

  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "tecnologia_inovacao"))
    .limit(1);
  if (!ws) {
    throw new Error(
      "Workspace tecnologia_inovacao não encontrado (seed ausente)",
    );
  }

  const [task] = await db
    .insert(tasks)
    .values({
      title: "Tarefa base para lançamento de tempo",
      workspaceId: ws.id,
      priority: "media",
      source: "manual",
      createdBy: ACTOR_ID,
    })
    .returning();
  if (!task) throw new Error("Falha ao criar tarefa base");
  taskId = task.id;
});

afterEach(async () => {
  await db.delete(timeEntries).where(eq(timeEntries.taskId, taskId));
});

afterAll(async () => {
  await db.delete(taskEvents).where(eq(taskEvents.taskId, taskId));
  await db.delete(tasks).where(eq(tasks.id, taskId));
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, ACTOR_ID));
  await db.delete(users).where(eq(users.id, ACTOR_ID));
});

describe("createManualTimeEntry — lançamento válido", () => {
  it("lançar 90 minutos de ontem soma ao total da tarefa", async () => {
    const { createManualTimeEntry } = await import("../actions/time-tracking");

    const startedAt = new Date(Date.now() - 26 * 60 * 60 * 1000);
    const endedAt = new Date(startedAt.getTime() + 90 * 60 * 1000);

    const result = await createManualTimeEntry({
      taskId,
      startedAt,
      endedAt,
      notes: "Trabalho de ontem",
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.entry.durationMinutes).toBe(90);

    const rows = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.taskId, taskId));
    const totalMinutes = rows.reduce(
      (sum, row) => sum + (row.durationMinutes ?? 0),
      0,
    );
    expect(totalMinutes).toBe(90);
  });
});

describe("createManualTimeEntry — validações", () => {
  it("recusa fim antes do início", async () => {
    const { createManualTimeEntry } = await import("../actions/time-tracking");

    const startedAt = new Date();
    const endedAt = new Date(startedAt.getTime() - 60 * 60 * 1000);

    const result = await createManualTimeEntry({
      taskId,
      startedAt,
      endedAt,
      notes: null,
    });

    expect(result?.validationErrors).toBeDefined();
    const endedAtErrors = (
      result?.validationErrors as
        | { endedAt?: { _errors?: string[] } }
        | undefined
    )?.endedAt?._errors;
    expect(endedAtErrors?.[0]).toMatch(/depois do início/i);

    const rows = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.taskId, taskId));
    expect(rows).toHaveLength(0);
  });

  it("recusa sobreposição com cronômetro em andamento do mesmo usuário", async () => {
    const { startTimeEntry, stopTimeEntry, createManualTimeEntry } =
      await import("../actions/time-tracking");

    const startResult = await startTimeEntry({ taskId });
    expect(startResult?.serverError).toBeUndefined();
    const runningEntryId = startResult?.data?.entry.id as unknown as string;

    try {
      const manualStartedAt = new Date(Date.now() - 30 * 60 * 1000);
      const manualEndedAt = new Date();

      const result = await createManualTimeEntry({
        taskId,
        startedAt: manualStartedAt,
        endedAt: manualEndedAt,
        notes: null,
      });

      // apps/tarefas/src/lib/safe-action.ts não define handleServerError, então
      // o serverError aqui é sempre a mensagem genérica do next-safe-action —
      // mesma convenção documentada em flats/reservations.test.ts. A mensagem
      // em português desta regra é a que o TimeTracker mostra client-side
      // (mesmos dados de timeEntries), antes mesmo de chamar a action; este
      // teste cobre a camada de defesa do servidor.
      expect(result?.serverError).toBeDefined();
    } finally {
      await stopTimeEntry({ timeEntryId: runningEntryId });
    }
  });
});

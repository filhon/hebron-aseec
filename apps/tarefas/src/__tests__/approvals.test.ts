/**
 * approvals.test.ts — P-4.8c (CORRETIVO): o pedido corrente é o mais recente
 * por requested_at (nunca escolhido por sobrescrita de Map/ordem física de
 * SELECT), no máximo um 'pendente' por tarefa (guard na action + índice
 * único parcial na migration 0076) e histórico de pedidos anteriores visível
 * em getTaskById.
 *
 * O fluxo completo enviar → aprovar/rejeitar → status, com audit central
 * abortando em falha, já é coberto em integrations.test.ts — este arquivo
 * cobre só o que P-4.8c mudou.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  workspaces,
  tasks,
  approvalRequests,
  auditLog,
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
  colaborador: "ee000000-0000-0000-0000-000000000001",
  diretor1: "ee000000-0000-0000-0000-000000000002",
  diretor2: "ee000000-0000-0000-0000-000000000003",
};

let workspaceId: string;

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.colaborador,
        email: "approvals-colab@test.hebron",
        fullName: "Approvals Colaborador",
      },
      {
        id: IDS.diretor1,
        email: "approvals-diretor1@test.hebron",
        fullName: "Approvals Diretor Um",
      },
      {
        id: IDS.diretor2,
        email: "approvals-diretor2@test.hebron",
        fullName: "Approvals Diretor Dois",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      {
        userId: IDS.colaborador,
        role: "colaborador",
        grantedBy: IDS.colaborador,
      },
      { userId: IDS.diretor1, role: "diretor", grantedBy: IDS.colaborador },
      { userId: IDS.diretor2, role: "diretor", grantedBy: IDS.colaborador },
    ])
    .onConflictDoNothing();

  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "eclesiastico"))
    .limit(1);
  if (!ws)
    throw new Error("Workspace eclesiastico não encontrado (seed ausente)");
  workspaceId = ws.id;
});

afterAll(async () => {
  // requestApproval/resolveApprovalRequest gravam admin.audit_log com estes
  // atores (G6.3) — sem apagar essas linhas primeiro, o DELETE de users
  // abaixo esbarra em audit_log_actor_id_fkey (mesmo padrão de
  // integrations.test.ts).
  await db
    .delete(auditLog)
    .where(inArray(auditLog.actorId, Object.values(IDS)));
  for (const id of Object.values(IDS)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS)) {
    await db.delete(users).where(eq(users.id, id));
  }
});

// ---------------------------------------------------------------------------
// Pedido corrente = mais recente por requested_at + histórico
// ---------------------------------------------------------------------------

describe("getTaskById — pedido corrente e histórico", () => {
  const taskId = "ee110000-0000-0000-0000-000000000001";

  beforeAll(async () => {
    await db
      .insert(tasks)
      .values({
        id: taskId,
        title: "Tarefa com pedido refeito após rejeição",
        workspaceId,
        createdBy: IDS.colaborador,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await db
      .delete(approvalRequests)
      .where(eq(approvalRequests.taskId, taskId));
    await db.delete(tasks).where(eq(tasks.id, taskId));
  });

  it("após rejeição, o novo pedido pendente passa a ser o corrente e o rejeitado vira histórico — estável em dez leituras seguidas", async () => {
    const { requestApproval, resolveApprovalRequest } =
      await import("../actions/approvals");
    const { getTaskById } = await import("../lib/queries");

    await actingAs(IDS.colaborador, ["colaborador"]);
    const first = await requestApproval({
      taskId,
      requestedStatus: "em_revisao",
      approverId: IDS.diretor1,
      notes: null,
    });
    expect(first?.serverError).toBeUndefined();
    const firstId = first?.data?.request.id as unknown as string;

    await actingAs(IDS.diretor1, ["diretor"]);
    const rejected = await resolveApprovalRequest({
      approvalRequestId: firstId,
      decision: "rejeitado",
      notes: "Faltam evidências",
    });
    expect(rejected?.serverError).toBeUndefined();

    await actingAs(IDS.colaborador, ["colaborador"]);
    const second = await requestApproval({
      taskId,
      requestedStatus: "em_revisao",
      approverId: IDS.diretor2,
      notes: null,
    });
    expect(second?.serverError).toBeUndefined();

    for (let i = 0; i < 10; i++) {
      await actingAs(IDS.colaborador, ["colaborador"]);
      const task = await getTaskById(taskId);

      // Corrente: o pedido novo, pendente, endereçado ao diretor2 — o
      // diretor certo vê os botões (canResolveApproval na UI depende
      // exatamente destes dois campos).
      expect(task?.approvalRequest?.status).toBe("pendente");
      expect(task?.approvalRequest?.approverId).toBe(IDS.diretor2);

      // Histórico: só o pedido rejeitado, nunca o corrente.
      expect(task?.approvalHistory).toHaveLength(1);
      expect(task?.approvalHistory[0]?.status).toBe("rejeitado");
      expect(task?.approvalHistory[0]?.approverId).toBe(IDS.diretor1);
    }
  }, 120_000);
});

// ---------------------------------------------------------------------------
// No máximo um pendente por tarefa — guard na action + índice no banco
// ---------------------------------------------------------------------------

describe("Unicidade de pedido pendente por tarefa", () => {
  const taskGuardAction = "ee220000-0000-0000-0000-000000000001";
  const taskGuardIndex = "ee220000-0000-0000-0000-000000000002";

  beforeAll(async () => {
    await db
      .insert(tasks)
      .values([
        {
          id: taskGuardAction,
          title: "Guard da action",
          workspaceId,
          createdBy: IDS.colaborador,
        },
        {
          id: taskGuardIndex,
          title: "Índice único do banco",
          workspaceId,
          createdBy: IDS.colaborador,
        },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await db
      .delete(approvalRequests)
      .where(
        inArray(approvalRequests.taskId, [taskGuardAction, taskGuardIndex]),
      );
    await db
      .delete(tasks)
      .where(inArray(tasks.id, [taskGuardAction, taskGuardIndex]));
  });

  it("requestApproval: segundo pedido pendente na mesma tarefa é recusado", async () => {
    const { requestApproval } = await import("../actions/approvals");

    await actingAs(IDS.colaborador, ["colaborador"]);
    const first = await requestApproval({
      taskId: taskGuardAction,
      requestedStatus: "concluido",
      approverId: IDS.diretor1,
      notes: null,
    });
    expect(first?.serverError).toBeUndefined();

    await actingAs(IDS.colaborador, ["colaborador"]);
    const second = await requestApproval({
      taskId: taskGuardAction,
      requestedStatus: "concluido",
      approverId: IDS.diretor2,
      notes: null,
    });
    expect(second?.serverError).toBeDefined();

    const rows = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.taskId, taskGuardAction));
    expect(rows.filter((r) => r.status === "pendente")).toHaveLength(1);
  });

  it("banco: índice único parcial rejeita um segundo INSERT pendente, mesmo por fora da action", async () => {
    await db.insert(approvalRequests).values({
      taskId: taskGuardIndex,
      requestedStatus: "concluido",
      requestedBy: IDS.colaborador,
      approverId: IDS.diretor1,
    });

    await expect(
      db.insert(approvalRequests).values({
        taskId: taskGuardIndex,
        requestedStatus: "concluido",
        requestedBy: IDS.colaborador,
        approverId: IDS.diretor2,
      }),
    ).rejects.toThrow();
  });
});

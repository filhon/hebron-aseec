/**
 * notifications.test.ts — P-4.10b (CORRETIVO): nenhuma notificação in-app do
 * módulo Tarefas fica sem `module`/`href` no payload (contrato P-0.6b,
 * packages/ui/src/components/ecosystem-apps.ts:80-107). Cobre os três
 * call-sites que criam notificação a partir de uma action deste app:
 * createComment (@menção), requestApproval (pedido ao diretor) e
 * resolveApprovalRequest (resposta ao solicitante) — os dois últimos
 * cobertos apenas parcialmente em approvals.test.ts/integrations.test.ts, que
 * não olham para o payload.
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
  comments,
  notifications,
  auditLog,
} from "@hebron/db/schema";
import { resolveNotificationHref } from "@hebron/ui/components/ecosystem-apps";

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
  colaborador: "ef000000-0000-0000-0000-000000000001",
  diretor: "ef000000-0000-0000-0000-000000000002",
};

let workspaceId: string;

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.colaborador,
        email: "notif-colab@test.hebron",
        fullName: "Notificações Colaborador",
      },
      {
        id: IDS.diretor,
        email: "notif-diretor@test.hebron",
        fullName: "Notificações Diretor",
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
      { userId: IDS.diretor, role: "diretor", grantedBy: IDS.colaborador },
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
  await db
    .delete(notifications)
    .where(inArray(notifications.userId, Object.values(IDS)));
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
// Toda notificação in-app gravada por este módulo carrega module + href
// resolvíveis para uma URL absoluta de tarefas.hebronaseec.com.br
// ---------------------------------------------------------------------------

describe("Payload de notificação — module + href nunca ausentes", () => {
  const taskId = "ef110000-0000-0000-0000-000000000001";

  beforeAll(async () => {
    await db
      .insert(tasks)
      .values({
        id: taskId,
        title: "Tarefa para verificação de payload de notificação",
        workspaceId,
        createdBy: IDS.colaborador,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await db.delete(comments).where(eq(comments.taskId, taskId));
    await db
      .delete(approvalRequests)
      .where(eq(approvalRequests.taskId, taskId));
    await db.delete(tasks).where(eq(tasks.id, taskId));
  });

  function expectResolvesInsideTarefas(
    payload: Record<string, unknown> | null,
  ): void {
    expect(payload).not.toBeNull();
    expect(payload?.["module"]).toBe("tarefas");
    expect(payload?.["href"]).not.toBe("/");
    expect(typeof payload?.["href"]).toBe("string");

    // Lida do sino de outro app (Intranet): resolveNotificationHref precisa
    // devolver uma URL absoluta do módulo Tarefas, nunca o href relativo cru
    // (que o app de leitura trataria como rota própria) nem "/".
    const resolved = resolveNotificationHref(payload, "intranet");
    expect(resolved).not.toBe("/");
    expect(resolved.startsWith("https://tarefas.hebronaseec.com.br/")).toBe(
      true,
    );

    // Lida de dentro do próprio Tarefas: o href relativo já é a rota certa.
    const resolvedSameApp = resolveNotificationHref(payload, "tarefas");
    expect(resolvedSameApp).toBe(payload?.["href"]);
  }

  it("createComment: @menção notifica o mencionado com module + href da tarefa", async () => {
    const { createComment } = await import("../actions/comments");

    await actingAs(IDS.colaborador, ["colaborador"]);
    const result = await createComment({
      taskId,
      content: "Confere isso @diretor",
      mentions: [IDS.diretor],
    });
    expect(result?.serverError).toBeUndefined();

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, IDS.diretor));
    const notification = rows.find((r) => r.type === "task.comment.mention");

    expectResolvesInsideTarefas(
      notification?.payload as Record<string, unknown> | null,
    );
    expect(
      (notification?.payload as Record<string, unknown> | null)?.["href"],
    ).toBe(`/tarefa/${taskId}`);
  });

  it("requestApproval: pedido ao diretor notifica com module + href da tarefa", async () => {
    const { requestApproval } = await import("../actions/approvals");

    await actingAs(IDS.colaborador, ["colaborador"]);
    const result = await requestApproval({
      taskId,
      requestedStatus: "em_revisao",
      approverId: IDS.diretor,
      notes: null,
    });
    expect(result?.serverError).toBeUndefined();

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, IDS.diretor));
    const notification = rows.find((r) => r.type === "task.approval_requested");

    expectResolvesInsideTarefas(
      notification?.payload as Record<string, unknown> | null,
    );
    expect(
      (notification?.payload as Record<string, unknown> | null)?.["href"],
    ).toBe(`/tarefa/${taskId}`);
  });

  it("resolveApprovalRequest: aprovado/rejeitado notifica o solicitante com module + href da tarefa", async () => {
    const [pending] = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.taskId, taskId));
    const requestId = pending?.id as string;

    await actingAs(IDS.diretor, ["diretor"]);
    const { resolveApprovalRequest } = await import("../actions/approvals");
    const result = await resolveApprovalRequest({
      approvalRequestId: requestId,
      decision: "aprovado",
      notes: null,
    });
    expect(result?.serverError).toBeUndefined();

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, IDS.colaborador));
    const notification = rows.find((r) => r.type === "task.aprovado");

    expectResolvesInsideTarefas(
      notification?.payload as Record<string, unknown> | null,
    );
    expect(
      (notification?.payload as Record<string, unknown> | null)?.["href"],
    ).toBe(`/tarefa/${taskId}`);
  });
});

/**
 * integrations.test.ts — mutações críticas e cross-app do módulo tarefas
 *
 * Cobre três critérios de P-4.12 que não têm arquivo dedicado próprio:
 *  - Subtarefas: completar atualiza o progresso agregado do pai (lido em
 *    apps/tarefas/src/lib/queries.ts::getTaskById).
 *  - Approval: fluxo enviar → aprovar/rejeitar → status, com audit central
 *    (admin.audit_log) abortando a operação em falha (mesmo padrão de
 *    apps/projetos/src/__tests__/audit-abort.test.ts).
 *  - Integração Projetos → Tarefas: onProjectSubmitted (packages/integrations
 *    /src/projetos-tarefas.ts) cria o checklist de análise; falha na criação
 *    não é engolida (log estruturado + notificação in-app a todo super_admin).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import type * as AuditModule from "@hebron/db/audit";
import {
  users,
  roleAssignments,
  workspaces,
  tasks,
  subtasks,
  approvalRequests,
  taskTemplates,
  templateItems,
  auditLog,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

vi.mock("@hebron/db/audit", async (importOriginal) => {
  const actual = await importOriginal<typeof AuditModule>();
  return { ...actual, logAudit: vi.fn(actual.logAudit) };
});

vi.mock("@hebron/db/settings", () => ({
  getSystemSetting: vi.fn(),
}));

// notifyChecklistCreationFailure (packages/integrations/src/projetos-tarefas.ts)
// notifica TODO super_admin real encontrado via query — sem mock, o teste de
// falha de configuração escreveria notificações reais para qualquer
// super_admin que já exista no banco de teste (mesmo cuidado de
// apps/financeiro/src/__tests__/governance.test.ts com createWeeklyBatch).
const insertNotificationMock = vi
  .fn()
  .mockResolvedValue({ id: "mock-notification-id" });
vi.mock("@hebron/db/notifications", () => ({
  makeNotificationInserter: () => (data: unknown) =>
    insertNotificationMock(data),
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
  colaborador: "ed000000-0000-0000-0000-000000000001",
  diretor: "ed000000-0000-0000-0000-000000000002",
  superAdmin: "ed000000-0000-0000-0000-000000000003",
};

let workspaceId: string;

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.colaborador,
        email: "integrations-colab@test.hebron",
        fullName: "Integrations Colaborador",
      },
      {
        id: IDS.diretor,
        email: "integrations-diretor@test.hebron",
        fullName: "Integrations Diretor",
      },
      {
        id: IDS.superAdmin,
        email: "integrations-super@test.hebron",
        fullName: "Integrations SuperAdmin",
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
      { userId: IDS.diretor, role: "diretor", grantedBy: IDS.superAdmin },
      {
        userId: IDS.superAdmin,
        role: "super_admin",
        grantedBy: IDS.superAdmin,
      },
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
// Subtarefas: progresso agregado do pai
// ---------------------------------------------------------------------------

describe("Subtarefas — completar atualiza o progresso agregado da tarefa-mãe", () => {
  const taskId = "ed110000-0000-0000-0000-000000000001";

  beforeAll(async () => {
    await db
      .insert(tasks)
      .values({
        id: taskId,
        title: "Tarefa com subtarefas",
        workspaceId,
        createdBy: IDS.colaborador,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await db.delete(subtasks).where(eq(subtasks.taskId, taskId));
    await db.delete(tasks).where(eq(tasks.id, taskId));
  });

  it("3/5 subtarefas concluídas → subtaskProgress = { done: 3, total: 5 }", async () => {
    const { createSubtask, toggleSubtask } = await import("../actions/tasks");
    const { getTaskById } = await import("../lib/queries");

    const subtaskIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      await actingAs(IDS.colaborador, ["colaborador"]);
      const result = await createSubtask({
        taskId,
        title: `Subtarefa ${i + 1}`,
        assigneeId: null,
      });
      expect(result?.serverError).toBeUndefined();
      subtaskIds.push(result?.data?.subtask.id as unknown as string);
    }

    for (const subtaskId of subtaskIds.slice(0, 3)) {
      await actingAs(IDS.colaborador, ["colaborador"]);
      const result = await toggleSubtask({ subtaskId, isDone: true });
      expect(result?.serverError).toBeUndefined();
    }

    // getTaskById agora resolve a sessão via resolveSession (P-9.1b-6,
    // mesmo padrão de apps/intranet/src/lib/queries.ts::getActorId) — o
    // mock de resolveSession é mockResolvedValueOnce, então precisa de
    // mais um actingAs para esta leitura fora de uma Server Action.
    await actingAs(IDS.colaborador, ["colaborador"]);
    const task = await getTaskById(taskId);
    expect(task?.subtaskProgress).toEqual({ done: 3, total: 5 });
  }, // 9 chamadas nesta única `it` agora abrem 9 transações autenticadas
  // reais (cada uma com round-trips extra de SET LOCAL ROLE/RESET ROLE)
  // contra o Supabase de dev compartilhado, em vez das leituras/escritas
  // via pool cru de antes — acima do testTimeout padrão de 30s do
  // vitest.config.ts sob latência de rede real (mesma causa documentada
  // em SESSIONS.md S-33: concorrência/latência do pooler compartilhado,
  // não falha de código).
  60_000);
});

// ---------------------------------------------------------------------------
// Approval: enviar → aprovar/rejeitar → status, com audit abortando em falha
// ---------------------------------------------------------------------------

describe("Approval — fluxo completo com audit central abortando em falha", () => {
  const taskAbort = "ed220000-0000-0000-0000-000000000001";
  const taskControlApprove = "ed220000-0000-0000-0000-000000000002";
  const taskControlReject = "ed220000-0000-0000-0000-000000000003";
  const taskResolveAbort = "ed220000-0000-0000-0000-000000000004";

  beforeAll(async () => {
    await db
      .insert(tasks)
      .values([
        {
          id: taskAbort,
          title: "Approval abort",
          workspaceId,
          createdBy: IDS.colaborador,
        },
        {
          id: taskControlApprove,
          title: "Approval controle aprovado",
          workspaceId,
          createdBy: IDS.colaborador,
        },
        {
          id: taskControlReject,
          title: "Approval controle rejeitado",
          workspaceId,
          createdBy: IDS.colaborador,
        },
        {
          id: taskResolveAbort,
          title: "Resolve abort",
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
        inArray(approvalRequests.taskId, [
          taskAbort,
          taskControlApprove,
          taskControlReject,
          taskResolveAbort,
        ]),
      );
    await db
      .delete(tasks)
      .where(
        inArray(tasks.id, [
          taskAbort,
          taskControlApprove,
          taskControlReject,
          taskResolveAbort,
        ]),
      );
  });

  it("requestApproval: falha no audit ABORTA o pedido (rollback real, nenhuma linha órfã)", async () => {
    const { logAudit } = await import("@hebron/db/audit");
    vi.mocked(logAudit).mockRejectedValueOnce(
      new Error("audit boom (simulado)"),
    );

    await actingAs(IDS.colaborador, ["colaborador"]);
    const { requestApproval } = await import("../actions/approvals");
    const result = await requestApproval({
      taskId: taskAbort,
      requestedStatus: "concluido",
      approverId: IDS.diretor,
      notes: null,
    });

    expect(result?.serverError).toBeDefined();

    const rows = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.taskId, taskAbort));
    expect(rows).toHaveLength(0);
  });

  it("requestApproval: controle — com audit funcionando, o pedido é criado", async () => {
    await actingAs(IDS.colaborador, ["colaborador"]);
    const { requestApproval } = await import("../actions/approvals");
    const result = await requestApproval({
      taskId: taskControlApprove,
      requestedStatus: "concluido",
      approverId: IDS.diretor,
      notes: null,
    });

    expect(result?.serverError).toBeUndefined();
    const rows = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.taskId, taskControlApprove));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("pendente");
  });

  it("resolveApprovalRequest: falha no audit ABORTA a resolução (status da tarefa e do pedido não mudam)", async () => {
    await actingAs(IDS.colaborador, ["colaborador"]);
    const { requestApproval } = await import("../actions/approvals");
    const created = await requestApproval({
      taskId: taskResolveAbort,
      requestedStatus: "concluido",
      approverId: IDS.diretor,
      notes: null,
    });
    expect(created?.serverError).toBeUndefined();
    const requestId = created?.data?.request.id as unknown as string;

    const { logAudit } = await import("@hebron/db/audit");
    vi.mocked(logAudit).mockRejectedValueOnce(
      new Error("audit boom (simulado)"),
    );

    await actingAs(IDS.diretor, ["diretor"]);
    const { resolveApprovalRequest } = await import("../actions/approvals");
    const resolved = await resolveApprovalRequest({
      approvalRequestId: requestId,
      decision: "aprovado",
      notes: null,
    });
    expect(resolved?.serverError).toBeDefined();

    const [request] = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, requestId));
    expect(request?.status).toBe("pendente");

    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskResolveAbort));
    expect(task?.status).toBe("a_fazer");
  });

  it("resolveApprovalRequest: aprovar avança o status real da tarefa", async () => {
    const [existing] = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.taskId, taskControlApprove));
    const requestId = existing?.id as string;

    await actingAs(IDS.diretor, ["diretor"]);
    const { resolveApprovalRequest } = await import("../actions/approvals");
    const result = await resolveApprovalRequest({
      approvalRequestId: requestId,
      decision: "aprovado",
      notes: null,
    });
    expect(result?.serverError).toBeUndefined();

    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskControlApprove));
    expect(task?.status).toBe("concluido");

    const [request] = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, requestId));
    expect(request?.status).toBe("aprovado");
  });

  it("resolveApprovalRequest: rejeitar NÃO avança o status da tarefa", async () => {
    await actingAs(IDS.colaborador, ["colaborador"]);
    const { requestApproval } = await import("../actions/approvals");
    const created = await requestApproval({
      taskId: taskControlReject,
      requestedStatus: "concluido",
      approverId: IDS.diretor,
      notes: null,
    });
    const requestId = created?.data?.request.id as unknown as string;

    await actingAs(IDS.diretor, ["diretor"]);
    const { resolveApprovalRequest } = await import("../actions/approvals");
    const result = await resolveApprovalRequest({
      approvalRequestId: requestId,
      decision: "rejeitado",
      notes: "Faltam evidências",
    });
    expect(result?.serverError).toBeUndefined();

    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskControlReject));
    expect(task?.status).toBe("a_fazer");

    const [request] = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, requestId));
    expect(request?.status).toBe("rejeitado");
  });
});

// ---------------------------------------------------------------------------
// Integração Projetos → Tarefas (packages/integrations/src/projetos-tarefas.ts)
// ---------------------------------------------------------------------------

describe("Integração Projetos → Tarefas — onProjectSubmitted cria o checklist de análise", () => {
  const templateId = "ed330000-0000-0000-0000-000000000001";
  const fakeProjectIdOk = "ed440000-0000-0000-0000-000000000001";
  const fakeProjectIdFail = "ed440000-0000-0000-0000-000000000002";
  const createdTaskIds = new Set<string>();

  beforeAll(async () => {
    await db
      .insert(taskTemplates)
      .values({
        id: templateId,
        name: "Checklist de Análise de Projeto (teste)",
        workspaceId,
        createdBy: IDS.superAdmin,
      })
      .onConflictDoNothing();

    await db
      .insert(templateItems)
      .values([
        {
          taskTemplateId: templateId,
          title: "Conferir documentação do projeto",
          priority: "media",
          subtasks: ["Conferir CNPJ", "Conferir orçamento"],
          order: 0,
        },
        {
          taskTemplateId: templateId,
          title: "Emitir parecer preliminar",
          priority: "alta",
          subtasks: [],
          order: 1,
        },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    if (createdTaskIds.size > 0) {
      const ids = Array.from(createdTaskIds);
      await db.delete(subtasks).where(inArray(subtasks.taskId, ids));
      await db.delete(tasks).where(inArray(tasks.id, ids));
    }
    await db
      .delete(templateItems)
      .where(eq(templateItems.taskTemplateId, templateId));
    await db.delete(taskTemplates).where(eq(taskTemplates.id, templateId));
  });

  it("configurado corretamente: cria uma tarefa automática por item do template, sem responsável", async () => {
    const { getSystemSetting } = await import("@hebron/db/settings");
    vi.mocked(getSystemSetting).mockResolvedValueOnce(templateId);

    const { onProjectSubmitted } =
      await import("@hebron/integrations/projetos-tarefas");
    await onProjectSubmitted(fakeProjectIdOk);

    const createdTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.workspaceId, workspaceId));
    const autoTasks = createdTasks.filter(
      (t) =>
        t.source === "auto" &&
        (t.sourceRef as { sourceModule: string; sourceId: string } | null)
          ?.sourceId === fakeProjectIdOk,
    );
    autoTasks.forEach((t) => createdTaskIds.add(t.id));

    expect(autoTasks).toHaveLength(2);
    expect(
      autoTasks.every(
        (t) =>
          t.needsManualAssignment === true &&
          (t.sourceRef as { sourceModule: string })?.sourceModule ===
            "projetos",
      ),
    ).toBe(true);
  });

  it("template não configurado: falha não é engolida — log estruturado + notificação in-app a super_admin", async () => {
    const { getSystemSetting } = await import("@hebron/db/settings");
    vi.mocked(getSystemSetting).mockResolvedValueOnce(null);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const { onProjectSubmitted } =
      await import("@hebron/integrations/projetos-tarefas");
    await expect(onProjectSubmitted(fakeProjectIdFail)).rejects.toThrow(
      /não configurado/,
    );

    const structuredCall = consoleErrorSpy.mock.calls.find((call) =>
      String(call[0]).includes("cross_app_integration_failure"),
    );
    expect(structuredCall).toBeDefined();

    expect(insertNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: IDS.superAdmin,
        type: "projeto.checklist_analise_falhou",
      }),
    );

    consoleErrorSpy.mockRestore();
  });
});

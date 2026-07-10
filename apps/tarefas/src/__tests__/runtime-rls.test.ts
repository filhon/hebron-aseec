/**
 * runtime-rls.test.ts — PATCH-016/P-0.17: prova que as Server Actions de
 * mutação do módulo tarefas rodam de fato sob o papel `authenticated`
 * (withAuthenticatedContext, decisão B/P-0.10), não sob a conexão superuser
 * de `@hebron/db/client` — que sempre ignorou RLS.
 *
 * Diferença deliberada para rls.test.ts (que exercita policies via SQL bruto
 * numa transação manual): aqui chamamos as Server Actions exportadas de
 * verdade (createTask, requestApproval). Para isolar "o gate JS da action"
 * de "a policy de RLS no Postgres", o cenário de negação usa um ator cujo
 * claim de papel (devolvido por `resolveSession`, mockado) diverge da
 * verdade em `public.role_assignments` — simula o gate de aplicação estar
 * (hipoteticamente) errado/desatualizado e confirma que a RLS ainda barra a
 * escrita, exatamente o objetivo de "defense in depth" (G do CLAUDE.md).
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
  // "claims colaborador mas sem role_assignments real" — simula gate de
  // aplicação desatualizado; só a RLS pode barrar este ator.
  ghostColaborador: "ec000000-0000-0000-0000-000000000001",
  realColaborador: "ec000000-0000-0000-0000-000000000002",
  superAdmin: "ec000000-0000-0000-0000-000000000003",
  diretorReal: "ec000000-0000-0000-0000-000000000004",
  diretorGhost: "ec000000-0000-0000-0000-000000000005",
};

let workspaceId: string;

beforeAll(async () => {
  await db
    .insert(users)
    .values(
      Object.entries(IDS).map(([key, id]) => ({
        id,
        email: `runtime-rls-${key}@test.hebron`,
        fullName: `Runtime RLS ${key}`,
      })),
    )
    .onConflictDoNothing();

  // Nota: ghostColaborador e diretorGhost DELIBERADAMENTE não recebem
  // role_assignments — é o ponto do teste.
  await db
    .insert(roleAssignments)
    .values([
      {
        userId: IDS.realColaborador,
        role: "colaborador",
        grantedBy: IDS.superAdmin,
      },
      {
        userId: IDS.superAdmin,
        role: "super_admin",
        grantedBy: IDS.superAdmin,
      },
      {
        userId: IDS.diretorReal,
        role: "diretor",
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
  await db.delete(tasks).where(eq(tasks.workspaceId, workspaceId));
  for (const id of Object.values(IDS)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS)) {
    await db.delete(users).where(eq(users.id, id));
  }
});

// ---------------------------------------------------------------------------
// createTask — tarefas.tasks_insert_collab exige public.has_role('colaborador')
// ---------------------------------------------------------------------------

describe("createTask — INSERT em tarefas.tasks roda sob RLS real", () => {
  it("ator sem role_assignments real é barrado pela RLS mesmo com claim de colaborador no gate JS", async () => {
    await actingAs(IDS.ghostColaborador, ["colaborador"]);
    const { createTask } = await import("../actions/tasks");

    const result = await createTask({
      title: "Tarefa de ator fantasma",
      workspace: "eclesiastico",
      priority: "media",
      assigneeIds: [],
      tagIds: [],
    });

    expect(result?.serverError).toBeDefined();

    const rows = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.createdBy, IDS.ghostColaborador));
    expect(rows).toHaveLength(0);
  });

  it("colaborador com role_assignments real cria a tarefa (caminho autenticado funciona)", async () => {
    await actingAs(IDS.realColaborador, ["colaborador"]);
    const { createTask } = await import("../actions/tasks");

    const result = await createTask({
      title: "Tarefa de colaborador real",
      workspace: "eclesiastico",
      priority: "media",
      assigneeIds: [],
      tagIds: [],
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.task.createdBy).toBe(IDS.realColaborador);

    const [row] = await db
      .select({ id: tasks.id, createdBy: tasks.createdBy })
      .from(tasks)
      .where(eq(tasks.createdBy, IDS.realColaborador));
    expect(row).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// resolveApprovalRequest — mutação crítica (G6.3): approval_requests + audit
// atômicos via withAuthenticatedContext/withSystemRole.
// ---------------------------------------------------------------------------

describe("resolveApprovalRequest — mutação crítica roda sob RLS real, audit atômico", () => {
  const taskId = "ec110000-0000-0000-0000-000000000001";
  const approvalId = "ec220000-0000-0000-0000-000000000001";

  beforeAll(async () => {
    await db
      .insert(tasks)
      .values({
        id: taskId,
        title: "Tarefa aguardando aprovação",
        workspaceId,
        createdBy: IDS.realColaborador,
        status: "a_fazer",
      })
      .onConflictDoNothing();

    await db
      .insert(approvalRequests)
      .values({
        id: approvalId,
        taskId,
        requestedStatus: "concluido",
        requestedBy: IDS.realColaborador,
        approverId: IDS.diretorReal,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await db
      .delete(approvalRequests)
      .where(eq(approvalRequests.id, approvalId));
    await db.delete(tasks).where(eq(tasks.id, taskId));
  });

  it("diretor endereçado sem role_assignments real é barrado (approval_requests_update_addressed exige diretor de verdade)", async () => {
    await actingAs(IDS.diretorGhost, ["diretor"]);
    // approverId do pedido é diretorReal — diretorGhost nem é o endereçado
    // nem tem papel real; o teste de "endereçado errado" já é coberto em
    // rls.test.ts, aqui o ponto é confirmar que a ausência de role_assignments
    // por si só barra a escrita via o caminho real da action.
    const { resolveApprovalRequest } = await import("../actions/approvals");

    const result = await resolveApprovalRequest({
      approvalRequestId: approvalId,
      decision: "aprovado",
      notes: null,
    });

    expect(result?.serverError).toBeDefined();

    const [request] = await db
      .select({ status: approvalRequests.status })
      .from(approvalRequests)
      .where(eq(approvalRequests.id, approvalId));
    expect(request?.status).toBe("pendente");
  });

  it("diretor endereçado com role_assignments real aprova: approval_request e task avançam, audit gravado atomicamente", async () => {
    await actingAs(IDS.diretorReal, ["diretor"]);
    const { resolveApprovalRequest } = await import("../actions/approvals");

    const result = await resolveApprovalRequest({
      approvalRequestId: approvalId,
      decision: "aprovado",
      notes: null,
    });

    expect(result?.serverError).toBeUndefined();

    const [request] = await db
      .select({ status: approvalRequests.status })
      .from(approvalRequests)
      .where(eq(approvalRequests.id, approvalId));
    expect(request?.status).toBe("aprovado");

    const [task] = await db
      .select({ status: tasks.status })
      .from(tasks)
      .where(eq(tasks.id, taskId));
    expect(task?.status).toBe("concluido");

    const [audit] = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(eq(auditLog.entityId, approvalId));
    expect(audit?.action).toBe("task.approved");
  });
});

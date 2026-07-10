/**
 * runtime-rls.test.ts — PATCH-016/P-0.17: prova que as Server Actions de
 * governança do módulo financeiro (approval.ts) rodam sob o papel
 * `authenticated` (withAuthenticatedContext, decisão B/P-0.10), não sob a
 * conexão superuser de `@hebron/db/client`.
 *
 * Mesmo padrão de apps/tarefas e apps/intranet: o cenário de negação usa um
 * ator cujo claim de designation (devolvido por `resolveSession`, mockado)
 * diverge da verdade em `public.designations` — só a RLS barra esse ator, o
 * gate JS (`diretorWithDesignationAction`) confiaria nele.
 *
 * Cobre também a descoberta feita ao ativar RLS de verdade nesta sessão:
 * `financeiro.batch_approvals_update_gestor` (0011_financeiro_rls.sql) só
 * concede UPDATE a diretor com designation 'gestor' (+ super_admin) — não
 * cobre o autorizador (segundo papel da governança dual), então
 * `authorizeBatch` precisou de `withSystemRole` para o UPDATE de
 * `batch_approvals` especificamente (ver comentário em actions/approval.ts).
 * O teste "autorizador real autoriza" abaixo prova que esse caminho continua
 * funcionando fim-a-fim pela action real, não apenas que a policy existe.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  designations,
  payables,
  batchApprovals,
  batchApprovalItems,
  auditLog,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

const createNotificationMock = vi.fn().mockResolvedValue({ id: "mock-id" });
vi.mock("@hebron/email", () => ({
  createNotification: (...args: unknown[]) => createNotificationMock(...args),
}));

async function actingAs(
  userId: string,
  roles: string[],
  userDesignations: string[],
): Promise<void> {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId: userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roles: roles as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    designations: userDesignations as any,
  });
}

const IDS = {
  // Claim de "gestor" via resolveSession mockado, sem designation real —
  // simula gate de aplicação desatualizado; só a RLS barra.
  ghostGestor: "f1000000-0000-0000-0000-000000000001",
  realGestor: "f1000000-0000-0000-0000-000000000002",
  realAutorizador: "f1000000-0000-0000-0000-000000000003",
} as const;

let weekCounter = 0;

async function seedPayableAndBatch(
  payableId: string,
  batchId: string,
): Promise<void> {
  weekCounter++;
  const day = String(weekCounter).padStart(2, "0");
  const weekStart = `2099-09-${day}`;
  const weekEnd = `2099-09-${String(weekCounter + 15).padStart(2, "0")}`;

  await db.insert(payables).values({
    id: payableId,
    description: `Runtime RLS Test ${payableId}`,
    amount: "777.00",
    dueDate: weekStart,
    status: "pendente",
    createdBy: IDS.realGestor,
  });
  await db.insert(batchApprovals).values({ id: batchId, weekStart, weekEnd });
  await db
    .insert(batchApprovalItems)
    .values({ batchApprovalId: batchId, payableId });
}

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

  await db
    .insert(roleAssignments)
    .values([
      { userId: IDS.realGestor, role: "diretor", grantedBy: IDS.realGestor },
      {
        userId: IDS.realAutorizador,
        role: "diretor",
        grantedBy: IDS.realGestor,
      },
    ])
    .onConflictDoNothing();

  // ghostGestor DELIBERADAMENTE não recebe designation real — é o ponto
  // do primeiro teste.
  await db
    .insert(designations)
    .values([
      {
        type: "gestor",
        userId: IDS.realGestor,
        assignedBy: IDS.realGestor,
      },
      {
        type: "autorizador",
        userId: IDS.realAutorizador,
        assignedBy: IDS.realGestor,
      },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  for (const uid of Object.values(IDS)) {
    await db.delete(auditLog).where(eq(auditLog.actorId, uid));
    await db.delete(designations).where(eq(designations.userId, uid));
    await db.delete(designations).where(eq(designations.assignedBy, uid));
  }
  await db
    .delete(roleAssignments)
    .where(inArray(roleAssignments.userId, Object.values(IDS)));
  await db.delete(users).where(inArray(users.id, Object.values(IDS)));
});

describe("approveBatch — UPDATE em financeiro.batch_approvals roda sob RLS real", () => {
  const payableId = "f2000000-0000-0000-0000-000000000001";
  const batchId = "f3000000-0000-0000-0000-000000000001";

  beforeAll(() => seedPayableAndBatch(payableId, batchId));
  afterAll(async () => {
    await db
      .delete(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, batchId));
    await db.delete(batchApprovals).where(eq(batchApprovals.id, batchId));
    await db.delete(payables).where(eq(payables.id, payableId));
  });

  it("ator sem designation real é barrado pela RLS mesmo com claim de gestor no gate JS", async () => {
    await actingAs(IDS.ghostGestor, ["diretor"], ["gestor"]);
    const { approveBatch } = await import("../actions/approval");

    const result = await approveBatch({ batchId });

    expect(result?.serverError).toBeDefined();

    const [batch] = await db
      .select({ approvedBy: batchApprovals.approvedBy })
      .from(batchApprovals)
      .where(eq(batchApprovals.id, batchId));
    expect(batch?.approvedBy).toBeNull();
  });

  it("gestor com designation real aprova: lote e payables avançam, audit gravado", async () => {
    await actingAs(IDS.realGestor, ["diretor"], ["gestor"]);
    const { approveBatch } = await import("../actions/approval");

    const result = await approveBatch({ batchId });

    expect(result?.serverError).toBeUndefined();

    const [batch] = await db
      .select({ approvedBy: batchApprovals.approvedBy })
      .from(batchApprovals)
      .where(eq(batchApprovals.id, batchId));
    expect(batch?.approvedBy).toBe(IDS.realGestor);

    const [payable] = await db
      .select({ status: payables.status })
      .from(payables)
      .where(eq(payables.id, payableId));
    expect(payable?.status).toBe("aprovado");

    const [audit] = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(eq(auditLog.entityId, batchId));
    expect(audit?.action).toBe("financeiro.batch.approved");
  });
});

describe("authorizeBatch — batch_approvals_update_gestor não cobre autorizador; withSystemRole fecha o caminho", () => {
  const payableId = "f2000000-0000-0000-0000-000000000002";
  const batchId = "f3000000-0000-0000-0000-000000000002";

  beforeAll(async () => {
    await seedPayableAndBatch(payableId, batchId);
    // Pré-aprovado pelo gestor real via SQL direto — o foco deste describe é
    // authorizeBatch, não repetir a aprovação já coberta acima.
    await db
      .update(batchApprovals)
      .set({ approvedBy: IDS.realGestor, approvedAt: new Date() })
      .where(eq(batchApprovals.id, batchId));
    await db
      .update(payables)
      .set({ status: "aprovado", approvedBy: IDS.realGestor })
      .where(eq(payables.id, payableId));
  });

  afterAll(async () => {
    await db
      .delete(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, batchId));
    await db.delete(batchApprovals).where(eq(batchApprovals.id, batchId));
    await db.delete(payables).where(eq(payables.id, payableId));
  });

  it("autorizador real (diferente do gestor) autoriza: lote e payables avançam, audit atômico via withSystemRole", async () => {
    await actingAs(IDS.realAutorizador, ["diretor"], ["autorizador"]);
    const { authorizeBatch } = await import("../actions/approval");

    const result = await authorizeBatch({ batchId });

    expect(result?.serverError).toBeUndefined();

    const [batch] = await db
      .select({ authorizedBy: batchApprovals.authorizedBy })
      .from(batchApprovals)
      .where(eq(batchApprovals.id, batchId));
    expect(batch?.authorizedBy).toBe(IDS.realAutorizador);

    const [payable] = await db
      .select({ status: payables.status })
      .from(payables)
      .where(eq(payables.id, payableId));
    expect(payable?.status).toBe("autorizado");

    const [audit] = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(eq(auditLog.entityId, batchId));
    expect(audit?.action).toBe("financeiro.batch.authorized");
  });
});

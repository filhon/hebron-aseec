/**
 * runtime-rls.test.ts — PATCH-016/P-0.17: prova que as Server Actions de
 * mutação do módulo intranet rodam sob o papel `authenticated`
 * (withAuthenticatedContext, decisão B/P-0.10), não sob a conexão superuser
 * de `@hebron/db/client`.
 *
 * Mesmo padrão de apps/tarefas/src/__tests__/runtime-rls.test.ts: chama as
 * Server Actions exportadas de verdade, e o cenário de negação usa um ator
 * cujo claim de papel (devolvido por `resolveSession`, mockado) diverge da
 * verdade em `public.role_assignments` — só a RLS pode barrar esse ator, o
 * gate JS da action confiaria nele.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  announcements,
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
  // Claim de "diretor" via resolveSession mockado, sem role_assignments
  // real — simula gate de aplicação desatualizado; só a RLS barra.
  ghostDiretor: "e1000000-0000-0000-0000-000000000001",
  realDiretor: "e1000000-0000-0000-0000-000000000002",
  superAdmin: "e1000000-0000-0000-0000-000000000003",
};

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
      {
        userId: IDS.realDiretor,
        role: "diretor",
        grantedBy: IDS.superAdmin,
      },
      {
        userId: IDS.superAdmin,
        role: "super_admin",
        grantedBy: IDS.superAdmin,
      },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(auditLog)
    .where(inArray(auditLog.actorId, Object.values(IDS)));
  await db
    .delete(announcements)
    .where(inArray(announcements.authorId, Object.values(IDS)));
  for (const id of Object.values(IDS)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS)) {
    await db.delete(users).where(eq(users.id, id));
  }
});

// ---------------------------------------------------------------------------
// createAnnouncement — intranet.announcements_insert_board exige
// public.has_role('diretor', 'conselheiro') real + author_id = auth.uid().
// ---------------------------------------------------------------------------

describe("createAnnouncement — INSERT em intranet.announcements roda sob RLS real", () => {
  it("ator sem role_assignments real é barrado pela RLS mesmo com claim de diretor no gate JS", async () => {
    await actingAs(IDS.ghostDiretor, ["diretor"]);
    const { createAnnouncement } = await import("../actions/announcements");

    const result = await createAnnouncement({
      title: "Anúncio de ator fantasma",
      body: "Corpo do anúncio de teste com mais de dez caracteres.",
      priority: "normal",
    });

    expect(result?.serverError).toBeDefined();

    const rows = await db
      .select({ id: announcements.id })
      .from(announcements)
      .where(eq(announcements.authorId, IDS.ghostDiretor));
    expect(rows).toHaveLength(0);
  });

  it("diretor com role_assignments real publica: anúncio e audit atômicos", async () => {
    await actingAs(IDS.realDiretor, ["diretor"]);
    const { createAnnouncement } = await import("../actions/announcements");

    const result = await createAnnouncement({
      title: "Anúncio de diretor real",
      body: "Corpo do anúncio de teste com mais de dez caracteres.",
      priority: "normal",
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.announcement.authorId).toBe(IDS.realDiretor);

    const [row] = await db
      .select({ id: announcements.id })
      .from(announcements)
      .where(eq(announcements.authorId, IDS.realDiretor));
    expect(row).toBeDefined();
    if (!row) throw new Error("announcement row not found");

    const [audit] = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(eq(auditLog.entityId, row.id));
    expect(audit?.action).toBe("announcement.created");
  });
});

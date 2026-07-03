/**
 * audit-abort.test.ts
 *
 * Regressão para CS-4/F3-Q4: votação é um módulo de governança — uma falha
 * ao gravar o audit deve ABORTAR o voto (não apenas logar e seguir em
 * frente, como o antigo try/catch em lib/audit.ts fazia). castVote agora
 * roda dentro de um db.transaction junto com o audit, então a falha
 * simulada abaixo deve não só fazer a action falhar, como também garantir
 * que NENHUM voto fique persistido (rollback real, não apenas erro
 * reportado com dado órfão no banco).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, and } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  organizations,
  organizationMembers,
  projects,
  votes,
  auditLog,
} from "@hebron/db/schema";
import type * as AuditModule from "@hebron/db/audit";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const DIRETOR_ID = "cdaa0000-0000-0000-0000-000000000001";

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: DIRETOR_ID,
    roles: ["diretor"],
  }),
}));

vi.mock("@hebron/db/audit", async (importOriginal) => {
  const actual = await importOriginal<typeof AuditModule>();
  return { ...actual, logAudit: vi.fn(actual.logAudit) };
});

const IDS = {
  users: {
    diretor: DIRETOR_ID,
    diretor2: "cdaa0000-0000-0000-0000-000000000002",
    conselheiro: "cdaa0000-0000-0000-0000-000000000003",
    submissor: "cdaa0000-0000-0000-0000-000000000004",
  },
  org: "cdbb0000-0000-0000-0000-000000000001",
  project: "cdcc0000-0000-0000-0000-000000000001",
} as const;

beforeAll(async () => {
  const userFixtures = [
    {
      id: IDS.users.diretor,
      email: "abort-dir1@test.hebron",
      fullName: "Abort Diretor 1",
    },
    {
      id: IDS.users.diretor2,
      email: "abort-dir2@test.hebron",
      fullName: "Abort Diretor 2",
    },
    {
      id: IDS.users.conselheiro,
      email: "abort-cons@test.hebron",
      fullName: "Abort Conselheiro",
    },
    {
      id: IDS.users.submissor,
      email: "abort-sub@test.hebron",
      fullName: "Abort Submissor",
    },
  ];
  for (const u of userFixtures) {
    await db.insert(users).values(u).onConflictDoNothing();
  }

  const roleSeed = [
    {
      userId: IDS.users.diretor,
      role: "diretor" as const,
      grantedBy: IDS.users.diretor,
    },
    {
      userId: IDS.users.diretor2,
      role: "diretor" as const,
      grantedBy: IDS.users.diretor,
    },
    {
      userId: IDS.users.conselheiro,
      role: "conselheiro" as const,
      grantedBy: IDS.users.diretor,
    },
    {
      userId: IDS.users.submissor,
      role: "submissor" as const,
      grantedBy: IDS.users.diretor,
    },
  ];
  for (const r of roleSeed) {
    await db.insert(roleAssignments).values(r).onConflictDoNothing();
  }

  await db
    .insert(organizations)
    .values({
      id: IDS.org,
      nome: "Org Audit Abort Test",
      createdBy: IDS.users.submissor,
    })
    .onConflictDoNothing();

  await db
    .insert(organizationMembers)
    .values({ organizationId: IDS.org, userId: IDS.users.submissor })
    .onConflictDoNothing();

  // 3 eligible voters (diretor, diretor2, conselheiro) → quorum = ceil(3/2) = 2.
  // A single vote below never reaches quorum, so only the "vote.cast" audit
  // fires — no stage-transition branch to worry about.
  await db
    .insert(projects)
    .values({
      id: IDS.project,
      title: "Projeto Audit Abort Test",
      tipo: "anual",
      stage: "votacao",
      organizationId: IDS.org,
      submitterId: IDS.users.submissor,
      evaluationYear: 2026,
      budgetTotal: "5000.00",
      parcelas: 1,
      meses: 1,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(votes).where(eq(votes.projectId, IDS.project));
  await db.delete(projects).where(eq(projects.id, IDS.project));
  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.organizationId, IDS.org));
  await db.delete(organizations).where(eq(organizations.id, IDS.org));
  for (const id of Object.values(IDS.users)) {
    await db.delete(auditLog).where(eq(auditLog.actorId, id));
  }
  for (const id of Object.values(IDS.users)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS.users)) {
    await db.delete(users).where(eq(users.id, id));
  }
});

describe("castVote — falha de audit aborta o voto (governança)", () => {
  it("audit falhando: action retorna erro E nenhum voto é persistido (rollback real)", async () => {
    const { logAudit } = await import("@hebron/db/audit");
    vi.mocked(logAudit).mockRejectedValueOnce(
      new Error("audit boom (simulado)"),
    );

    const { castVote } = await import("../actions/voting");
    const result = await castVote({ projectId: IDS.project, value: true });

    expect(result?.serverError).toBeDefined();

    const rows = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.projectId, IDS.project),
          eq(votes.userId, IDS.users.diretor),
        ),
      );
    expect(rows).toHaveLength(0);
  });

  it("controle: com audit funcionando, o voto é persistido normalmente", async () => {
    const { castVote } = await import("../actions/voting");
    const result = await castVote({ projectId: IDS.project, value: true });

    expect(result?.serverError).toBeUndefined();

    const rows = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.projectId, IDS.project),
          eq(votes.userId, IDS.users.diretor),
        ),
      );
    expect(rows).toHaveLength(1);
  });
});

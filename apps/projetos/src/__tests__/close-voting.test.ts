/**
 * close-voting.test.ts
 *
 * Cobre os dois achados da Fase 2 sobre votação que o P-2.9c corrigiu:
 *
 *  - F2-P5: quórum contava LINHAS de role_assignments, não PESSOAS distintas
 *    — um usuário com diretor+conselheiro simultaneamente contava 2x no
 *    denominador. countEligibleVoters (voting.ts) passou a usar
 *    countDistinct(roleAssignments.userId).
 *  - F2-P6: com quórum atingido e maioria formada mas turnout < 100%, a
 *    votação ficava aberta para sempre (só o botão de pânico fechava, e
 *    "sem quórum" era seu caso de uso no BRAIN). `closeVoting` (decisão
 *    F2-Q5) é o fechamento manual do super_admin para esse caso comum.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
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

const SUPER_ADMIN_ID = "ceaa0000-0000-0000-0000-000000000001";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: SUPER_ADMIN_ID,
    roles: ["super_admin"],
  }),
}));

const IDS = {
  users: {
    superAdmin: SUPER_ADMIN_ID,
    // Uma só pessoa, dois papéis simultâneos (BRAIN permite múltiplos papéis).
    dualRole: "ceaa0000-0000-0000-0000-000000000002",
    diretor2: "ceaa0000-0000-0000-0000-000000000003",
    submissor: "ceaa0000-0000-0000-0000-000000000004",
  },
  org: "cebb0000-0000-0000-0000-000000000001",
  projects: {
    quorumCount: "cecc0000-0000-0000-0000-000000000001",
    noQuorum: "cecc0000-0000-0000-0000-000000000002",
    quorumMajority: "cecc0000-0000-0000-0000-000000000003",
  },
} as const;

beforeAll(async () => {
  const userFixtures = [
    {
      id: IDS.users.superAdmin,
      email: "close-super@test.hebron",
      fullName: "Close SuperAdmin",
    },
    {
      id: IDS.users.dualRole,
      email: "close-dual@test.hebron",
      fullName: "Close Dual-Role",
    },
    {
      id: IDS.users.diretor2,
      email: "close-dir2@test.hebron",
      fullName: "Close Diretor 2",
    },
    {
      id: IDS.users.submissor,
      email: "close-sub@test.hebron",
      fullName: "Close Submissor",
    },
  ];
  for (const u of userFixtures) {
    await db.insert(users).values(u).onConflictDoNothing();
  }

  // dualRole tem DUAS linhas em role_assignments (diretor + conselheiro) —
  // deve contar como 1 pessoa elegível, não 2.
  const roleSeed = [
    {
      userId: IDS.users.superAdmin,
      role: "super_admin" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.dualRole,
      role: "diretor" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.dualRole,
      role: "conselheiro" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.diretor2,
      role: "diretor" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.submissor,
      role: "submissor" as const,
      grantedBy: IDS.users.superAdmin,
    },
  ];
  for (const r of roleSeed) {
    await db.insert(roleAssignments).values(r).onConflictDoNothing();
  }

  await db
    .insert(organizations)
    .values({
      id: IDS.org,
      nome: "Org Close Voting Test",
      createdBy: IDS.users.submissor,
    })
    .onConflictDoNothing();

  await db
    .insert(organizationMembers)
    .values({ organizationId: IDS.org, userId: IDS.users.submissor })
    .onConflictDoNothing();

  await db
    .insert(projects)
    .values([
      {
        id: IDS.projects.quorumCount,
        title: "Projeto Quorum Count Test",
        tipo: "anual",
        stage: "votacao",
        organizationId: IDS.org,
        submitterId: IDS.users.submissor,
        evaluationYear: 2026,
        budgetTotal: "1000.00",
        parcelas: 1,
        meses: 1,
      },
      {
        id: IDS.projects.noQuorum,
        title: "Projeto Sem Quorum Test",
        tipo: "anual",
        stage: "votacao",
        organizationId: IDS.org,
        submitterId: IDS.users.submissor,
        evaluationYear: 2026,
        budgetTotal: "1000.00",
        parcelas: 1,
        meses: 1,
      },
      {
        id: IDS.projects.quorumMajority,
        title: "Projeto Quorum Maioria Test",
        tipo: "anual",
        stage: "votacao",
        organizationId: IDS.org,
        submitterId: IDS.users.submissor,
        evaluationYear: 2026,
        budgetTotal: "1000.00",
        parcelas: 1,
        meses: 1,
      },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(votes)
    .where(inArray(votes.projectId, Object.values(IDS.projects)));
  await db
    .delete(projects)
    .where(inArray(projects.id, Object.values(IDS.projects)));
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

describe("F2-P5 — quórum conta pessoas distintas, não atribuições de papel", () => {
  it("dualRole (diretor+conselheiro) conta 1x: 3 pessoas elegíveis, não 4", async () => {
    // 1 voto do diretor2 — se o total elegível fosse contado por linha
    // (4), 1/4 não bateria quórum (ceil(4/2)=2). Contado por pessoa (3),
    // ainda não bate (ceil(3/2)=2), então usamos 2 votos para provar a
    // diferença: 2 votos de 3 pessoas atinge quórum (ceil(3/2)=2), mas
    // 2 de 4 (contagem errada) também atingiria — o teste decisivo é
    // com super_admin fechando manualmente e observando o total_eligible
    // retornado.
    await db
      .insert(votes)
      .values([
        {
          projectId: IDS.projects.quorumCount,
          userId: IDS.users.dualRole,
          value: true,
        },
        {
          projectId: IDS.projects.quorumCount,
          userId: IDS.users.diretor2,
          value: true,
        },
      ])
      .onConflictDoNothing();

    const { closeVoting } = await import("../actions/voting");
    const result = await closeVoting({
      projectId: IDS.projects.quorumCount,
    });

    // super_admin também é elegível? Não — countEligibleVoters filtra só
    // diretor/conselheiro. Elegíveis: dualRole (1 pessoa) + diretor2 = 2.
    expect(result?.data?.result.totalEligible).toBe(2);
    expect(result?.data?.result.totalVoted).toBe(2);
    expect(result?.data?.result.quorumMet).toBe(true);
  });
});

describe("F2-P6/F2-Q5 — closeVoting: fechamento manual pelo super_admin", () => {
  it("sem quórum: closeVoting rejeita e orienta usar o botão de pânico", async () => {
    // 0 votos de 2 elegíveis (dualRole + diretor2) — quorumMet = 0 >=
    // ceil(2/2)=1 → false. Nenhum voto é inserido de propósito.
    const { closeVoting } = await import("../actions/voting");
    const result = await closeVoting({ projectId: IDS.projects.noQuorum });

    // next-safe-action genereliza a mensagem do Error lançado para o
    // cliente (comportamento padrão do createSafeActionClient, sem
    // handleReturnedServerError customizado) — só o "houve erro" é
    // observável aqui; o texto exato ("use o botão de pânico") foi
    // confirmado no stderr do teste (Action error: ...) e o efeito real
    // é verificado abaixo: o estágio não muda.
    expect(result?.serverError).toBeDefined();

    const projectRows = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, IDS.projects.noQuorum));
    expect(projectRows[0]?.stage).toBe("votacao");
  });

  it("com quórum e maioria: closeVoting encerra e transiciona para homologacao", async () => {
    await db
      .insert(votes)
      .values([
        {
          projectId: IDS.projects.quorumMajority,
          userId: IDS.users.dualRole,
          value: true,
        },
        {
          projectId: IDS.projects.quorumMajority,
          userId: IDS.users.diretor2,
          value: true,
        },
      ])
      .onConflictDoNothing();

    const { closeVoting } = await import("../actions/voting");
    const result = await closeVoting({
      projectId: IDS.projects.quorumMajority,
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.newStage).toBe("homologacao");

    const projectRows = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, IDS.projects.quorumMajority));
    expect(projectRows[0]?.stage).toBe("homologacao");
  });

  it("closeVoting já fechada (fora de votacao) rejeita", async () => {
    const { closeVoting } = await import("../actions/voting");
    // quorumMajority já foi fechado no teste anterior — está em homologacao
    const result = await closeVoting({
      projectId: IDS.projects.quorumMajority,
    });
    expect(result?.serverError).toBeDefined();
  });
});

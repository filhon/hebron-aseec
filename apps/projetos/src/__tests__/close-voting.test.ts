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
import { eq, inArray, and, isNull, desc } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  organizations,
  organizationMembers,
  projects,
  projectVersions,
  votes,
  auditLog,
} from "@hebron/db/schema";

const SUPER_ADMIN_ID = "ceaa0000-0000-0000-0000-000000000001";

// O banco de dev compartilhado acumula fixtures órfãs de outros apps (ver
// SESSIONS.md) em role_assignments — o total elegível real não é
// previsível. Em vez de fixar um número de votos, consultamos o mesmo
// predicado usado por countEligibleVoters (voting.ts) e fazemos 100% desses
// votarem, o que bate quórum de forma determinística independente da
// poluição ambiente (P-2.8b).
async function activeEligibleVoterIds(): Promise<string[]> {
  const rows = await db
    .select({ userId: roleAssignments.userId })
    .from(roleAssignments)
    .where(
      and(
        inArray(roleAssignments.role, ["diretor", "conselheiro"]),
        isNull(roleAssignments.revokedAt),
      ),
    );
  return [...new Set(rows.map((r) => r.userId))];
}

async function voteAllEligible(
  projectId: string,
  value: boolean,
): Promise<string[]> {
  const ids = await activeEligibleVoterIds();
  await db
    .insert(votes)
    .values(ids.map((userId) => ({ projectId, userId, value })))
    .onConflictDoNothing();
  return ids;
}

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
    revokedDiretor: "ceaa0000-0000-0000-0000-000000000005",
  },
  org: "cebb0000-0000-0000-0000-000000000001",
  projects: {
    quorumCount: "cecc0000-0000-0000-0000-000000000001",
    noQuorum: "cecc0000-0000-0000-0000-000000000002",
    quorumMajority: "cecc0000-0000-0000-0000-000000000003",
    quorumRejected: "cecc0000-0000-0000-0000-000000000004",
    panicReject: "cecc0000-0000-0000-0000-000000000005",
    revokedQuorum: "cecc0000-0000-0000-0000-000000000006",
    softDeleted: "cecc0000-0000-0000-0000-000000000007",
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
    {
      id: IDS.users.revokedDiretor,
      email: "close-revoked@test.hebron",
      fullName: "Close Diretor Revogado",
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
    // Papel revogado (P-2.8b) — não deve contar no denominador do quórum.
    {
      userId: IDS.users.revokedDiretor,
      role: "diretor" as const,
      grantedBy: IDS.users.superAdmin,
      revokedAt: new Date(),
      revokedBy: IDS.users.superAdmin,
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
      {
        id: IDS.projects.quorumRejected,
        title: "Projeto Quorum Reprovado Test",
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
        id: IDS.projects.panicReject,
        title: "Projeto Pânico Reprovado Test",
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
        id: IDS.projects.revokedQuorum,
        title: "Projeto Quorum Diretor Revogado Test",
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
        id: IDS.projects.softDeleted,
        title: "Projeto Soft-Deleted Test",
        tipo: "anual",
        stage: "votacao",
        organizationId: IDS.org,
        submitterId: IDS.users.submissor,
        evaluationYear: 2026,
        budgetTotal: "1000.00",
        parcelas: 1,
        meses: 1,
        deletedAt: new Date(),
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
  it("dualRole (diretor+conselheiro) conta 1x: turnout de 100% dos elegíveis bate o total elegível calculado por pessoa distinta", async () => {
    // dualRole tem DUAS linhas em role_assignments (diretor + conselheiro)
    // — se o total elegível fosse contado por linha em vez de pessoa
    // distinta, o total_eligible retornado seria maior que a contagem de
    // IDs distintos que fizemos aqui, e este assert pegaria a diferença
    // independente de quantas outras pessoas elegíveis existirem no banco
    // (P-2.8b: banco de dev compartilhado tem fixtures órfãs de outros
    // apps — não fixamos mais um número absoluto).
    const eligibleIds = await voteAllEligible(IDS.projects.quorumCount, true);
    expect(eligibleIds).toContain(IDS.users.dualRole);
    expect(eligibleIds).toContain(IDS.users.diretor2);

    const { closeVoting } = await import("../actions/voting");
    const result = await closeVoting({
      projectId: IDS.projects.quorumCount,
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.result.totalEligible).toBe(eligibleIds.length);
    expect(result?.data?.result.totalVoted).toBe(eligibleIds.length);
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
    await voteAllEligible(IDS.projects.quorumMajority, true);

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

// ---------------------------------------------------------------------------
// P-2.8b — reprovação decisiva não fica presa em votacao. VALID_STAGE_
// TRANSITIONS não permite votacao → reprovado direto: closeVoting e
// triggerPanicButton escreviam "reprovado" sem validar contra o mapa (o
// caminho que transitionProjectStage recusaria). Agora as três actions
// convergem no mesmo destino — homologacao — carregando `voteApproved` no
// snapshot para runHomologacaoAutoApprove (packages/jobs) resolver.
// ---------------------------------------------------------------------------

describe("F2-P6/P-2.8b — closeVoting: reprovação decisiva vai para homologacao", () => {
  it("com quórum e maioria contra: closeVoting encerra e transiciona para homologacao (não 'reprovado' direto)", async () => {
    await voteAllEligible(IDS.projects.quorumRejected, false);

    const { closeVoting } = await import("../actions/voting");
    const result = await closeVoting({
      projectId: IDS.projects.quorumRejected,
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.newStage).toBe("homologacao");
    expect(result?.data?.result.approved).toBe(false);

    const projectRows = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, IDS.projects.quorumRejected));
    expect(projectRows[0]?.stage).toBe("homologacao");

    const [version] = await db
      .select({ data: projectVersions.data })
      .from(projectVersions)
      .where(eq(projectVersions.projectId, IDS.projects.quorumRejected))
      .orderBy(desc(projectVersions.versionNumber))
      .limit(1);
    expect((version?.data as { voteApproved?: boolean })?.voteApproved).toBe(
      false,
    );
  });
});

describe("P-2.8b — triggerPanicButton: reprovação sem quórum vai para homologacao", () => {
  it("maioria contra sem quórum: projeto sai de votacao para homologacao (não 'reprovado' direto)", async () => {
    // 1 voto contra de 2 elegíveis (dualRole + diretor2) — sem quórum
    // (ceil(2/2)=2). O botão de pânico ignora o quórum de propósito.
    await db
      .insert(votes)
      .values({
        projectId: IDS.projects.panicReject,
        userId: IDS.users.dualRole,
        value: false,
      })
      .onConflictDoNothing();

    const { triggerPanicButton } = await import("../actions/voting");
    const result = await triggerPanicButton({
      projectId: IDS.projects.panicReject,
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.newStage).toBe("homologacao");

    const projectRows = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, IDS.projects.panicReject));
    expect(projectRows[0]?.stage).toBe("homologacao");

    const [version] = await db
      .select({ data: projectVersions.data })
      .from(projectVersions)
      .where(eq(projectVersions.projectId, IDS.projects.panicReject))
      .orderBy(desc(projectVersions.versionNumber))
      .limit(1);
    expect((version?.data as { voteApproved?: boolean })?.voteApproved).toBe(
      false,
    );
  });
});

describe("P-2.8b — diretor com papel revogado não conta no denominador do quórum", () => {
  it("countEligibleVoters (via closeVoting) ignora role_assignments com revoked_at preenchido", async () => {
    // revokedDiretor tem uma linha ativa de papel "diretor", mas com
    // revoked_at preenchido. voteAllEligible consulta o mesmo predicado que
    // countEligibleVoters (revokedAt IS NULL) — se a implementação real
    // regredisse e voltasse a contar papéis revogados, totalEligible viria
    // 1 a mais que eligibleIds.length e este assert pegaria a diferença.
    const eligibleIds = await voteAllEligible(IDS.projects.revokedQuorum, true);
    expect(eligibleIds).not.toContain(IDS.users.revokedDiretor);

    const { closeVoting } = await import("../actions/voting");
    const result = await closeVoting({
      projectId: IDS.projects.revokedQuorum,
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.result.totalEligible).toBe(eligibleIds.length);
    expect(result?.data?.result.totalVoted).toBe(eligibleIds.length);
  });
});

describe("P-2.8b — projeto soft-deleted não aceita voto nem fechamento", () => {
  it("closeVoting em projeto com deletedAt preenchido rejeita como 'não encontrado'", async () => {
    const { closeVoting } = await import("../actions/voting");
    const result = await closeVoting({
      projectId: IDS.projects.softDeleted,
    });
    expect(result?.serverError).toBeDefined();

    const projectRows = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, IDS.projects.softDeleted));
    // Stage inalterado — a rejeição aconteceu antes de qualquer escrita.
    expect(projectRows[0]?.stage).toBe("votacao");
  });
});

/**
 * voting.test.ts — Votação de projetos
 *
 * Cobre:
 *  - Lógica de quórum e maioria (função pura que espelha voting.ts)
 *  - Botão de pânico (super_admin force-close)
 *  - Restrição DB: 1 voto por pessoa por projeto (UNIQUE constraint)
 *  - RLS: cédula secreta — apenas super_admin pode SELECT votos
 *  - Contrato de falha de `castVote` no cliente (VotePanelWrapper) — P-2.2b
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import postgres from "postgres";
import { eq, and, inArray, isNull, desc } from "drizzle-orm";
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
import { deriveVoteState } from "../components/vote-panel-wrapper";

// castVote roda pelo pipeline real de Server Action (conselheiroDiretorAction)
// — precisa de sessão mockada. Cada teste injeta o ator via
// mockResolvedValueOnce (um por voto, já que cada voto é uma pessoa distinta).
const resolveSessionMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));
vi.mock("@hebron/auth/server", () => ({
  resolveSession: (...args: unknown[]) => resolveSessionMock(...args),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const IDS = {
  users: {
    superAdmin: "bbaa0000-0000-0000-0000-000000000001",
    diretor1: "bbaa0000-0000-0000-0000-000000000002",
    diretor2: "bbaa0000-0000-0000-0000-000000000003",
    conselheiro1: "bbaa0000-0000-0000-0000-000000000004",
    submissor1: "bbaa0000-0000-0000-0000-000000000005",
  },
  orgs: {
    orgVoting: "bbbb0000-0000-0000-0000-000000000001",
  },
  projects: {
    projectVoting: "bbcc0000-0000-0000-0000-000000000001",
    projectPanic: "bbcc0000-0000-0000-0000-000000000002",
    projectCastReject: "bbcc0000-0000-0000-0000-000000000003",
  },
} as const;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for voting tests");
const sql = postgres(DATABASE_URL, { prepare: false, max: 3 });

// ── Helpers ───────────────────────────────────────────────────────────────────

async function queryAs(userId: string, query: string): Promise<postgres.Row[]> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  let rows: postgres.Row[] = [];

  try {
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
      rows = await tx.unsafe(query);
      throw new Error("__rls_test_rollback__");
    });
  } catch (err) {
    if (err instanceof Error && err.message !== "__rls_test_rollback__") {
      throw err;
    }
  }

  return rows;
}

/**
 * Espelha computeVoteResult em voting.ts (lógica pura, sem acesso ao DB).
 * totalEligible: contagem de diretor + conselheiro no sistema
 */
function computeQuorum(
  totalEligible: number,
  totalVoted: number,
  inFavor: number,
): { quorumMet: boolean; approved: boolean | null } {
  const quorumMet = totalVoted >= Math.ceil(totalEligible / 2);
  const against = totalVoted - inFavor;
  const approved = quorumMet ? inFavor > against : null;
  return { quorumMet, approved };
}

/**
 * Espelha a decisão do botão de pânico em voting.ts:
 * maioria entre votos existentes vence; empate resolve para reprovado.
 */
function panicApproved(inFavor: number, against: number): boolean {
  return inFavor > against;
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  const userFixtures = [
    {
      id: IDS.users.superAdmin,
      email: "vote-super@test.hebron",
      fullName: "Vote SuperAdmin",
    },
    {
      id: IDS.users.diretor1,
      email: "vote-dir1@test.hebron",
      fullName: "Vote Diretor 1",
    },
    {
      id: IDS.users.diretor2,
      email: "vote-dir2@test.hebron",
      fullName: "Vote Diretor 2",
    },
    {
      id: IDS.users.conselheiro1,
      email: "vote-cons1@test.hebron",
      fullName: "Vote Conselheiro 1",
    },
    {
      id: IDS.users.submissor1,
      email: "vote-sub1@test.hebron",
      fullName: "Vote Submissor 1",
    },
  ];
  for (const u of userFixtures) {
    await db.insert(users).values(u).onConflictDoNothing();
  }

  const roleSeed = [
    {
      userId: IDS.users.superAdmin,
      role: "super_admin" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.diretor1,
      role: "diretor" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.diretor2,
      role: "diretor" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.conselheiro1,
      role: "conselheiro" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.submissor1,
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
      id: IDS.orgs.orgVoting,
      nome: "Org Voting Test",
      createdBy: IDS.users.submissor1,
    })
    .onConflictDoNothing();

  await db
    .insert(organizationMembers)
    .values({
      organizationId: IDS.orgs.orgVoting,
      userId: IDS.users.submissor1,
    })
    .onConflictDoNothing();

  await db
    .insert(projects)
    .values([
      {
        id: IDS.projects.projectVoting,
        title: "Projeto Votação Test",
        tipo: "anual",
        stage: "votacao",
        organizationId: IDS.orgs.orgVoting,
        submitterId: IDS.users.submissor1,
        evaluationYear: 2026,
        budgetTotal: "10000.00",
        parcelas: 3,
        meses: 3,
      },
      {
        id: IDS.projects.projectPanic,
        title: "Projeto Pânico Test",
        tipo: "anual",
        stage: "votacao",
        organizationId: IDS.orgs.orgVoting,
        submitterId: IDS.users.submissor1,
        evaluationYear: 2026,
        budgetTotal: "15000.00",
        parcelas: 3,
        meses: 3,
      },
      {
        id: IDS.projects.projectCastReject,
        title: "Projeto Reprovação Decisiva Test",
        tipo: "anual",
        stage: "votacao",
        organizationId: IDS.orgs.orgVoting,
        submitterId: IDS.users.submissor1,
        evaluationYear: 2026,
        budgetTotal: "5000.00",
        parcelas: 1,
        meses: 1,
      },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  // Cascade delete votes, versions via project FK
  await db
    .delete(projects)
    .where(inArray(projects.id, Object.values(IDS.projects)));
  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.organizationId, IDS.orgs.orgVoting));
  await db
    .delete(organizations)
    .where(eq(organizations.id, IDS.orgs.orgVoting));
  // castVote (P-2.8b) grava audit_log com actorId = votante — precisa ser
  // limpo antes de deletar os usuários (audit_log_actor_id_fkey).
  await db
    .delete(auditLog)
    .where(eq(auditLog.entityId, IDS.projects.projectCastReject));
  for (const id of Object.values(IDS.users)) {
    await db.delete(auditLog).where(eq(auditLog.actorId, id));
  }
  for (const id of Object.values(IDS.users)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS.users)) {
    await db.delete(users).where(eq(users.id, id));
  }

  await sql.end();
});

// ── Quórum: lógica pura ───────────────────────────────────────────────────────

describe("Votação — Quórum: sem quórum → não aprova", () => {
  it("1 voto de 3 elegíveis → quorumMet=false, approved=null", () => {
    const result = computeQuorum(3, 1, 1);
    expect(result.quorumMet).toBe(false);
    expect(result.approved).toBeNull();
  });

  it("0 votos de 4 elegíveis → quorumMet=false", () => {
    const result = computeQuorum(4, 0, 0);
    expect(result.quorumMet).toBe(false);
    expect(result.approved).toBeNull();
  });

  it("quórum é ceil(elegíveis/2): 3 elegíveis → precisa de 2 votos (ceil(3/2)=2)", () => {
    expect(Math.ceil(3 / 2)).toBe(2);
    const semQuorum = computeQuorum(3, 1, 1);
    const comQuorum = computeQuorum(3, 2, 2);
    expect(semQuorum.quorumMet).toBe(false);
    expect(comQuorum.quorumMet).toBe(true);
  });

  it("4 elegíveis → precisa de 2 votos (ceil(4/2)=2)", () => {
    expect(Math.ceil(4 / 2)).toBe(2);
    const comQuorum = computeQuorum(4, 2, 2);
    expect(comQuorum.quorumMet).toBe(true);
  });
});

describe("Votação — Quórum: com quórum + maioria → aprova", () => {
  it("todos votaram, maioria a favor → approved=true", () => {
    const result = computeQuorum(2, 2, 2);
    expect(result.quorumMet).toBe(true);
    expect(result.approved).toBe(true);
  });

  it("quórum atingido, mais a favor do que contra → approved=true", () => {
    const result = computeQuorum(4, 3, 2); // 2 a favor, 1 contra
    expect(result.quorumMet).toBe(true);
    expect(result.approved).toBe(true);
  });

  it("quórum atingido, empate (1×1) → approved=false (não é maioria)", () => {
    const result = computeQuorum(2, 2, 1); // 1 a favor, 1 contra
    expect(result.quorumMet).toBe(true);
    expect(result.approved).toBe(false);
  });

  it("quórum atingido, maioria contra → approved=false", () => {
    const result = computeQuorum(4, 4, 1); // 1 a favor, 3 contra
    expect(result.quorumMet).toBe(true);
    expect(result.approved).toBe(false);
  });

  it("votação completa (todos votaram) → quórum garantido", () => {
    const result = computeQuorum(4, 4, 3);
    expect(result.quorumMet).toBe(true);
    expect(result.approved).toBe(true);
  });
});

// ── Botão de pânico ───────────────────────────────────────────────────────────

describe("Votação — Botão de pânico (force-close sem quórum)", () => {
  it("maioria a favor → aprovado", () => {
    expect(panicApproved(3, 1)).toBe(true);
  });

  it("maioria contra → reprovado", () => {
    expect(panicApproved(1, 3)).toBe(false);
  });

  it("empate → reprovado (padrão conservador: inFavor > against é false)", () => {
    expect(panicApproved(2, 2)).toBe(false);
  });

  it("0 votos → reprovado (0 não é > 0)", () => {
    expect(panicApproved(0, 0)).toBe(false);
  });

  it("pânico com quórum já atingido: maioria ainda decide", () => {
    // 4 elegíveis, 4 votos (quórum atingido), 3×1 → aprovado
    expect(panicApproved(3, 1)).toBe(true);
  });
});

// ── castVote: fechamento por reprovação decisiva (P-2.8b) ──────────────────
//
// VALID_STAGE_TRANSITIONS não permite votacao → reprovado direto — antes
// deste fix, castVote calculava newStage="reprovado", a checagem contra o
// mapa falhava e o `if` inteiro era pulado em silêncio: quórum total,
// maioria contra, projeto ficava preso em votação para sempre. Agora toda
// votação conclusiva (aprovação ou reprovação) entra em homologação —
// nunca fica presa em votação — carregando `voteApproved` no snapshot para
// runHomologacaoAutoApprove (packages/jobs) resolver depois.

describe("Votação — castVote: reprovação decisiva não fica presa em votação (P-2.8b)", () => {
  it("turnout total (100% dos elegíveis) + maioria contra: projeto sai de votacao para homologacao, snapshot registra voteApproved=false", async () => {
    const { castVote } = await import("../actions/voting");

    // countEligibleVoters (voting.ts) conta diretor+conselheiro no sistema
    // inteiro, não escopado por org — o banco de dev compartilhado acumula
    // fixtures órfãs de outros apps (ver SESSIONS.md) e outros arquivos de
    // teste deste mesmo app rodam concorrentemente (vitest
    // fileParallelism), então o total elegível pode crescer entre a
    // leitura e o voto. Uma sequência de N chamadas reais a castVote (uma
    // por pessoa) alonga demais a janela de corrida — em vez disso,
    // inserimos o voto de todos menos um diretamente (rápido, uma única
    // ida ao banco, mesmo padrão de voteAllEligible em
    // close-voting.test.ts) e só o último voto passa pelo caminho real
    // (castVote), que é o que precisa disparar o auto-close.
    const eligibleRows = await db
      .select({ userId: roleAssignments.userId })
      .from(roleAssignments)
      .where(
        and(
          inArray(roleAssignments.role, ["diretor", "conselheiro"]),
          isNull(roleAssignments.revokedAt),
        ),
      );
    const eligibleIds = [...new Set(eligibleRows.map((r) => r.userId))];
    const [lastVoter, ...restVoters] = eligibleIds;
    if (!lastVoter)
      throw new Error("Nenhum diretor/conselheiro elegível encontrado");

    if (restVoters.length > 0) {
      await db
        .insert(votes)
        .values(
          restVoters.map((userId) => ({
            projectId: IDS.projects.projectCastReject,
            userId,
            value: false,
          })),
        )
        .onConflictDoNothing();
    }

    resolveSessionMock.mockResolvedValueOnce({
      actorId: lastVoter,
      roles: ["diretor"],
    });
    const result = await castVote({
      projectId: IDS.projects.projectCastReject,
      value: false,
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.stageTransitioned).toBe(true);

    const [project] = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, IDS.projects.projectCastReject));
    expect(project?.stage).toBe("homologacao");
    expect(project?.stage).not.toBe("votacao");

    const [version] = await db
      .select({ data: projectVersions.data })
      .from(projectVersions)
      .where(eq(projectVersions.projectId, IDS.projects.projectCastReject))
      .orderBy(desc(projectVersions.versionNumber))
      .limit(1);
    expect((version?.data as { voteApproved?: boolean })?.voteApproved).toBe(
      false,
    );
  });
});

// ── Cliente: caminho de falha de castVote (VotePanelWrapper) ───────────────────

describe("Votação — VotePanelWrapper: castVote falhando nunca mostra 'Voto registrado'", () => {
  it("pendente: status='pending', não confirmado", () => {
    const result = deriveVoteState({
      isPending: true,
      errorMessage: null,
      confirmedValue: null,
      hasVoted: false,
    });
    expect(result.status).toBe("pending");
    expect(result.hasVoted).toBe(false);
  });

  it("castVote rejeita (onError disparou): status='error', hasVoted continua false", () => {
    const result = deriveVoteState({
      isPending: false,
      errorMessage: "Votação encerrada.",
      confirmedValue: null,
      hasVoted: false,
    });
    expect(result.status).toBe("error");
    expect(result.hasVoted).toBe(false);
  });

  it("retry limpa o erro e devolve ao estado votável (idle)", () => {
    // onRetry apenas zera errorMessage — isPending e confirmedValue não mudam
    const result = deriveVoteState({
      isPending: false,
      errorMessage: null,
      confirmedValue: null,
      hasVoted: false,
    });
    expect(result.status).toBe("idle");
    expect(result.hasVoted).toBe(false);
  });

  it("castVote confirma (onSuccess disparou): status='idle', hasVoted=true — só depois do servidor responder", () => {
    const result = deriveVoteState({
      isPending: false,
      errorMessage: null,
      confirmedValue: true,
      hasVoted: false,
    });
    expect(result.status).toBe("idle");
    expect(result.hasVoted).toBe(true);
  });

  it("hasVoted vindo do servidor no carregamento da página é respeitado mesmo sem confirmedValue local", () => {
    const result = deriveVoteState({
      isPending: false,
      errorMessage: null,
      confirmedValue: null,
      hasVoted: true,
    });
    expect(result.hasVoted).toBe(true);
  });
});

// ── DB: restrição de voto único ───────────────────────────────────────────────

describe("Votação — DB: 1 voto por pessoa por projeto (UNIQUE constraint)", () => {
  afterEach(async () => {
    await db
      .delete(votes)
      .where(
        and(
          eq(votes.projectId, IDS.projects.projectVoting),
          eq(votes.userId, IDS.users.diretor1),
        ),
      );
  });

  it("primeiro voto é inserido com sucesso", async () => {
    const [vote] = await db
      .insert(votes)
      .values({
        projectId: IDS.projects.projectVoting,
        userId: IDS.users.diretor1,
        value: true,
      })
      .returning();

    if (!vote) throw new Error("Voto não foi inserido");
    expect(vote.value).toBe(true);
  });

  it("segundo voto do mesmo usuário é ignorado via onConflictDoNothing", async () => {
    // Primeiro voto
    await db
      .insert(votes)
      .values({
        projectId: IDS.projects.projectVoting,
        userId: IDS.users.diretor1,
        value: true,
      })
      .onConflictDoNothing();

    // Tentativa de segundo voto (valor diferente)
    const second = await db
      .insert(votes)
      .values({
        projectId: IDS.projects.projectVoting,
        userId: IDS.users.diretor1,
        value: false,
      })
      .onConflictDoNothing()
      .returning();

    expect(second).toHaveLength(0); // conflito ignorado

    // Valor original preservado
    const allVotes = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.projectId, IDS.projects.projectVoting),
          eq(votes.userId, IDS.users.diretor1),
        ),
      );
    expect(allVotes).toHaveLength(1);
    expect(allVotes.at(0)?.value).toBe(true);
  });

  it("usuários diferentes podem votar no mesmo projeto", async () => {
    await db
      .insert(votes)
      .values({
        projectId: IDS.projects.projectVoting,
        userId: IDS.users.diretor1,
        value: true,
      })
      .onConflictDoNothing();

    await db
      .insert(votes)
      .values({
        projectId: IDS.projects.projectVoting,
        userId: IDS.users.diretor2,
        value: false,
      })
      .onConflictDoNothing();

    const allVotes = await db
      .select()
      .from(votes)
      .where(eq(votes.projectId, IDS.projects.projectVoting));

    expect(allVotes.length).toBeGreaterThanOrEqual(2);

    // Cleanup diretor2's vote too
    await db
      .delete(votes)
      .where(
        and(
          eq(votes.projectId, IDS.projects.projectVoting),
          eq(votes.userId, IDS.users.diretor2),
        ),
      );
  });
});

// ── RLS: voto secreto ─────────────────────────────────────────────────────────

describe("Votação — RLS: cédula secreta", () => {
  beforeAll(async () => {
    await db
      .insert(votes)
      .values([
        {
          projectId: IDS.projects.projectPanic,
          userId: IDS.users.diretor1,
          value: true,
        },
        {
          projectId: IDS.projects.projectPanic,
          userId: IDS.users.diretor2,
          value: false,
        },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await db
      .delete(votes)
      .where(eq(votes.projectId, IDS.projects.projectPanic));
  });

  it("submissor NÃO vê votos", async () => {
    const rows = await queryAs(
      IDS.users.submissor1,
      `SELECT id FROM projetos.votes WHERE project_id = '${IDS.projects.projectPanic}'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("conselheiro NÃO vê votos (nem os próprios)", async () => {
    const rows = await queryAs(
      IDS.users.conselheiro1,
      `SELECT id FROM projetos.votes WHERE project_id = '${IDS.projects.projectPanic}'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("diretor NÃO vê votos (nem os próprios)", async () => {
    const rows = await queryAs(
      IDS.users.diretor1,
      `SELECT id FROM projetos.votes WHERE project_id = '${IDS.projects.projectPanic}'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("super_admin VÊ todos os votos do projeto", async () => {
    const rows = await queryAs(
      IDS.users.superAdmin,
      `SELECT id FROM projetos.votes WHERE project_id = '${IDS.projects.projectPanic}'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});

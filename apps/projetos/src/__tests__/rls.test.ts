/**
 * rls.test.ts — Políticas RLS do módulo projetos
 *
 * Testa via conexão direta (postgres.js) com SET LOCAL ROLE authenticated
 * e request.jwt.claims para simular diferentes usuários.
 *
 * Os GRANTs para `authenticated` no schema projetos são permanentes
 * (0014_grants_authenticated.sql, P-0.10) — este arquivo não precisa mais
 * concedê-los/revogá-los ao redor da suíte. `anon` nunca recebe grant algum
 * em projetos.* (schema inteiro é interno).
 *
 * Coberturas:
 *  - projetos.projects: submissor vê apenas org própria; diretor/conselheiro vê votacao+;
 *    super_admin vê tudo
 *  - projetos.votes: cédula secreta — apenas super_admin pode SELECT
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { eq, inArray, sql as drizzleSql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  users,
  roleAssignments,
  organizations,
  organizationMembers,
  projects,
  votes,
} from "@hebron/db/schema";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const IDS = {
  users: {
    superAdmin: "aaaa0000-0000-0000-0000-000000000001",
    diretor1: "aaaa0000-0000-0000-0000-000000000002",
    conselheiro1: "aaaa0000-0000-0000-0000-000000000003",
    submissorA: "aaaa0000-0000-0000-0000-000000000004",
    submissorB: "aaaa0000-0000-0000-0000-000000000005",
  },
  orgs: {
    orgA: "aabb0000-0000-0000-0000-000000000001",
    orgB: "aabb0000-0000-0000-0000-000000000002",
  },
  projects: {
    projectARascunho: "aacc0000-0000-0000-0000-000000000001",
    projectAVotacao: "aacc0000-0000-0000-0000-000000000002",
    projectBVotacao: "aacc0000-0000-0000-0000-000000000003",
  },
} as const;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for RLS tests");
const sql = postgres(DATABASE_URL, { prepare: false, max: 3 });

// ── Helper ────────────────────────────────────────────────────────────────────

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

async function queryAsAnon(query: string): Promise<postgres.Row[]> {
  let rows: postgres.Row[] = [];
  try {
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE anon`;
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

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  // Users
  const userFixtures = [
    {
      id: IDS.users.superAdmin,
      email: "rls-proj-super@test.hebron",
      fullName: "RLS Proj SuperAdmin",
    },
    {
      id: IDS.users.diretor1,
      email: "rls-proj-dir@test.hebron",
      fullName: "RLS Proj Diretor",
    },
    {
      id: IDS.users.conselheiro1,
      email: "rls-proj-cons@test.hebron",
      fullName: "RLS Proj Conselheiro",
    },
    {
      id: IDS.users.submissorA,
      email: "rls-proj-sub-a@test.hebron",
      fullName: "RLS Proj Submissor A",
    },
    {
      id: IDS.users.submissorB,
      email: "rls-proj-sub-b@test.hebron",
      fullName: "RLS Proj Submissor B",
    },
  ];
  for (const u of userFixtures) {
    await db.insert(users).values(u).onConflictDoNothing();
  }

  // Role assignments
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
      userId: IDS.users.conselheiro1,
      role: "conselheiro" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.submissorA,
      role: "submissor" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.submissorB,
      role: "submissor" as const,
      grantedBy: IDS.users.superAdmin,
    },
  ];
  for (const r of roleSeed) {
    await db.insert(roleAssignments).values(r).onConflictDoNothing();
  }

  // Organizations
  await db
    .insert(organizations)
    .values([
      { id: IDS.orgs.orgA, nome: "Org RLS A", createdBy: IDS.users.submissorA },
      { id: IDS.orgs.orgB, nome: "Org RLS B", createdBy: IDS.users.submissorB },
    ])
    .onConflictDoNothing();

  // Organization members
  await db
    .insert(organizationMembers)
    .values([
      { organizationId: IDS.orgs.orgA, userId: IDS.users.submissorA },
      { organizationId: IDS.orgs.orgB, userId: IDS.users.submissorB },
    ])
    .onConflictDoNothing();

  // Projects at different stages
  await db
    .insert(projects)
    .values([
      {
        id: IDS.projects.projectARascunho,
        title: "Projeto A Rascunho",
        tipo: "anual",
        stage: "rascunho",
        organizationId: IDS.orgs.orgA,
        submitterId: IDS.users.submissorA,
        evaluationYear: 2026,
        budgetTotal: "10000.00",
        parcelas: 1,
        meses: 1,
      },
      {
        id: IDS.projects.projectAVotacao,
        title: "Projeto A Votacao",
        tipo: "anual",
        stage: "votacao",
        organizationId: IDS.orgs.orgA,
        submitterId: IDS.users.submissorA,
        evaluationYear: 2026,
        budgetTotal: "15000.00",
        parcelas: 3,
        meses: 3,
      },
      {
        id: IDS.projects.projectBVotacao,
        title: "Projeto B Votacao",
        tipo: "anual",
        stage: "votacao",
        organizationId: IDS.orgs.orgB,
        submitterId: IDS.users.submissorB,
        evaluationYear: 2026,
        budgetTotal: "20000.00",
        parcelas: 6,
        meses: 6,
      },
    ])
    .onConflictDoNothing();

  // Votes on projectAVotacao (for secrecy test)
  await db
    .insert(votes)
    .values([
      {
        projectId: IDS.projects.projectAVotacao,
        userId: IDS.users.diretor1,
        value: true,
      },
      {
        projectId: IDS.projects.projectAVotacao,
        userId: IDS.users.conselheiro1,
        value: false,
      },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  // Cleanup in FK-safe order (project cascade deletes votes)
  await db
    .delete(projects)
    .where(inArray(projects.id, Object.values(IDS.projects)));
  await db
    .delete(organizations)
    .where(inArray(organizations.id, Object.values(IDS.orgs)));
  for (const id of Object.values(IDS.users)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS.users)) {
    await db.delete(users).where(eq(users.id, id));
  }

  await sql.end();
});

// ── RLS: projetos.projects — submissor ────────────────────────────────────────

describe("RLS — projetos.projects: submissor vê apenas a própria org", () => {
  it("submissorA vê projetos da org A (rascunho + votacao)", async () => {
    const rows = await queryAs(
      IDS.users.submissorA,
      "SELECT id FROM projetos.projects WHERE deleted_at IS NULL",
    );
    const ids = rows.map((r) => r["id"]);
    expect(ids).toContain(IDS.projects.projectARascunho);
    expect(ids).toContain(IDS.projects.projectAVotacao);
  });

  it("submissorA NÃO vê projetos da org B", async () => {
    const rows = await queryAs(
      IDS.users.submissorA,
      `SELECT id FROM projetos.projects WHERE id = '${IDS.projects.projectBVotacao}'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("submissorB NÃO vê projetos da org A", async () => {
    const rows = await queryAs(
      IDS.users.submissorB,
      `SELECT id FROM projetos.projects WHERE id IN ('${IDS.projects.projectARascunho}','${IDS.projects.projectAVotacao}')`,
    );
    expect(rows).toHaveLength(0);
  });

  it("submissorB vê projetos da própria org B", async () => {
    const rows = await queryAs(
      IDS.users.submissorB,
      `SELECT id FROM projetos.projects WHERE id = '${IDS.projects.projectBVotacao}'`,
    );
    expect(rows).toHaveLength(1);
  });
});

// ── RLS: projetos.projects — diretor/conselheiro ──────────────────────────────

describe("RLS — projetos.projects: diretor/conselheiro vê votacao+, não rascunho", () => {
  it("diretor vê projetos em votacao de qualquer org", async () => {
    const rows = await queryAs(
      IDS.users.diretor1,
      "SELECT id FROM projetos.projects WHERE deleted_at IS NULL",
    );
    const ids = rows.map((r) => r["id"]);
    expect(ids).toContain(IDS.projects.projectAVotacao);
    expect(ids).toContain(IDS.projects.projectBVotacao);
  });

  it("diretor NÃO vê projetos em rascunho", async () => {
    const rows = await queryAs(
      IDS.users.diretor1,
      `SELECT id FROM projetos.projects WHERE id = '${IDS.projects.projectARascunho}'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("conselheiro vê projetos em votacao de qualquer org", async () => {
    const rows = await queryAs(
      IDS.users.conselheiro1,
      `SELECT id FROM projetos.projects WHERE id IN ('${IDS.projects.projectAVotacao}','${IDS.projects.projectBVotacao}')`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it("conselheiro NÃO vê projetos em rascunho", async () => {
    const rows = await queryAs(
      IDS.users.conselheiro1,
      `SELECT id FROM projetos.projects WHERE id = '${IDS.projects.projectARascunho}'`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ── RLS: projetos.projects — super_admin ──────────────────────────────────────

describe("RLS — projetos.projects: super_admin vê tudo", () => {
  it("super_admin vê todos os projetos incluindo rascunho", async () => {
    const rows = await queryAs(
      IDS.users.superAdmin,
      "SELECT id FROM projetos.projects WHERE deleted_at IS NULL",
    );
    const ids = rows.map((r) => r["id"]);
    expect(ids).toContain(IDS.projects.projectARascunho);
    expect(ids).toContain(IDS.projects.projectAVotacao);
    expect(ids).toContain(IDS.projects.projectBVotacao);
  });
});

// ── RLS: projetos.votes — cédula secreta ──────────────────────────────────────

describe("RLS — projetos.votes: cédula secreta (apenas super_admin lê)", () => {
  it("submissor NÃO vê votos", async () => {
    const rows = await queryAs(
      IDS.users.submissorA,
      "SELECT id FROM projetos.votes LIMIT 10",
    );
    expect(rows).toHaveLength(0);
  });

  it("conselheiro NÃO vê votos (nem os próprios)", async () => {
    const rows = await queryAs(
      IDS.users.conselheiro1,
      "SELECT id FROM projetos.votes LIMIT 10",
    );
    expect(rows).toHaveLength(0);
  });

  it("diretor NÃO vê votos (nem os próprios)", async () => {
    const rows = await queryAs(
      IDS.users.diretor1,
      "SELECT id FROM projetos.votes LIMIT 10",
    );
    expect(rows).toHaveLength(0);
  });

  it("super_admin VÊ todos os votos", async () => {
    const rows = await queryAs(
      IDS.users.superAdmin,
      `SELECT id FROM projetos.votes WHERE project_id = '${IDS.projects.projectAVotacao}'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});

// ── anon não lê nada de projetos.* ────────────────────────────────────────────
// `anon` nunca recebe GRANT USAGE em projetos (0014_grants_authenticated.sql):
// a negação acontece na camada de GRANT, antes de qualquer RLS ser avaliada.

describe("RLS — anon não lê nada de projetos.*", () => {
  it("anon NÃO lê projetos.projects (permission denied — sem USAGE no schema)", async () => {
    await expect(
      queryAsAnon("SELECT id FROM projetos.projects LIMIT 10"),
    ).rejects.toThrow(/permission denied for schema projetos/i);
  });

  it("anon NÃO lê projetos.votes (permission denied — sem USAGE no schema)", async () => {
    await expect(
      queryAsAnon("SELECT id FROM projetos.votes LIMIT 10"),
    ).rejects.toThrow(/permission denied for schema projetos/i);
  });

  it("anon NÃO lê projetos.organizations (permission denied — sem USAGE no schema)", async () => {
    await expect(
      queryAsAnon("SELECT id FROM projetos.organizations LIMIT 10"),
    ).rejects.toThrow(/permission denied for schema projetos/i);
  });
});

// ── Regressão F2-P4 ────────────────────────────────────────────────────────────
// "Área (diretoria) de Projetos exige só login, sem papel [...] submissor
// autenticado vê score IA, breakdown, versão compacta e votos". A causa raiz
// (leitura via `db` superuser) é a mesma dos outros achados F2 — este teste
// prova que, através do client autenticado (P-0.10), um submissor não lê a
// cédula de votação nem versões compactas destinadas a avaliadores.
//
// Nota: score_ai/score_ai_breakdown são colunas, não linhas — RLS não as
// mascara (ver comentário em 0007_projetos_rls.sql). Esse mascaramento
// continua sendo responsabilidade da camada de Server Action, no escopo de
// P-2.9c, não deste prompt.

describe("Regressão F2-P4 — leitura via client autenticado não vaza votos", () => {
  it("submissor autenticado via withAuthenticatedContext não lê projetos.votes", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.users.submissorA },
      async (tx) =>
        tx.execute(
          drizzleSql`SELECT id FROM projetos.votes WHERE project_id = ${IDS.projects.projectAVotacao}`,
        ),
    );
    expect(Array.from(rows)).toHaveLength(0);
  });

  it("submissor autenticado via withAuthenticatedContext não lê compact_versions de outra org", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.users.submissorA },
      async (tx) =>
        tx.execute(
          drizzleSql`SELECT id FROM projetos.projects WHERE id = ${IDS.projects.projectBVotacao}`,
        ),
    );
    expect(Array.from(rows)).toHaveLength(0);
  });

  it("super_admin via withAuthenticatedContext lê projetos.votes normalmente", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.users.superAdmin },
      async (tx) =>
        tx.execute(
          drizzleSql`SELECT id FROM projetos.votes WHERE project_id = ${IDS.projects.projectAVotacao}`,
        ),
    );
    expect(Array.from(rows).length).toBeGreaterThanOrEqual(2);
  });
});

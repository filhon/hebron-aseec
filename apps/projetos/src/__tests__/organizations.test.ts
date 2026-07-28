/**
 * organizations.test.ts — Corretivo P-2.8c
 *
 * Cobre os defeitos do prompt corretivo "Quatro actions sem porta de
 * entrada": updateOrganization, addOrganizationMember,
 * removeOrganizationMember e a coerência meses/parcelas de updateDraftProject.
 *
 *  - updateOrganization: gate criador OU diretor/super_admin — mirror da RLS
 *    "organizations_update_owner_or_admin" (0007_projetos.sql)
 *  - addOrganizationMember/removeOrganizationMember: apenas diretor/super_admin
 *    — mirror da RLS "org_members_write_admin"; decisão de governança, não
 *    self-service do criador (perguntado ao Filipe, ver SESSIONS.md)
 *  - Segundo membro de uma organização enxerga os projetos da organização
 *    (RLS projects_select_own_or_org) depois de adicionado pela diretoria
 *  - updateDraftProject: parcelas e meses não podem divergir — mesma
 *    checkMesesPagamentoCoherence usada na criação, e o cronograma aprovado
 *    soma o budget_total mesmo após a edição do número de parcelas
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  users,
  roleAssignments,
  organizations,
  organizationMembers,
  projects,
  paymentSchedules,
} from "@hebron/db/schema";
import { checkMesesPagamentoCoherence } from "@hebron/validators/projetos";
import { generatePaymentSchedule } from "@hebron/db/projetos-approval";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const IDS = {
  users: {
    superAdmin: "ccdd0000-0000-0000-0000-000000000001",
    diretor1: "ccdd0000-0000-0000-0000-000000000002",
    creator: "ccdd0000-0000-0000-0000-000000000003",
    member2: "ccdd0000-0000-0000-0000-000000000004",
    outsider: "ccdd0000-0000-0000-0000-000000000005",
  },
  org: "ccee0000-0000-0000-0000-000000000001",
} as const;

const EDIT_PROJECT_ID = "ccff0000-0000-0000-0000-000000000001";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for RLS tests");
const sql = postgres(DATABASE_URL, { prepare: false, max: 3 });

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

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  const userFixtures = [
    {
      id: IDS.users.superAdmin,
      email: "org-super@test.hebron",
      fullName: "Org SuperAdmin",
    },
    {
      id: IDS.users.diretor1,
      email: "org-dir1@test.hebron",
      fullName: "Org Diretor 1",
    },
    {
      id: IDS.users.creator,
      email: "org-creator@test.hebron",
      fullName: "Org Creator",
    },
    {
      id: IDS.users.member2,
      email: "org-member2@test.hebron",
      fullName: "Org Member 2",
    },
    {
      id: IDS.users.outsider,
      email: "org-outsider@test.hebron",
      fullName: "Org Outsider",
    },
  ];
  for (const u of userFixtures) {
    await db.insert(users).values(u).onConflictDoNothing();
  }

  await db
    .insert(roleAssignments)
    .values([
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
        userId: IDS.users.creator,
        role: "submissor" as const,
        grantedBy: IDS.users.superAdmin,
      },
      {
        userId: IDS.users.member2,
        role: "submissor" as const,
        grantedBy: IDS.users.superAdmin,
      },
      {
        userId: IDS.users.outsider,
        role: "submissor" as const,
        grantedBy: IDS.users.superAdmin,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(organizations)
    .values({
      id: IDS.org,
      nome: "Org Gates Test",
      createdBy: IDS.users.creator,
    })
    .onConflictDoNothing();

  await db
    .insert(organizationMembers)
    .values({ organizationId: IDS.org, userId: IDS.users.creator })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(projects).where(eq(projects.id, EDIT_PROJECT_ID));
  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.organizationId, IDS.org));
  await db.delete(organizations).where(eq(organizations.id, IDS.org));
  for (const id of Object.values(IDS.users)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS.users)) {
    await db.delete(users).where(eq(users.id, id));
  }

  await sql.end();
});

// ── RLS organizations_update_owner_or_admin — mirror do gate de updateOrganization ──

describe("RLS — organizations_update_owner_or_admin (updateOrganization)", () => {
  it("o criador atualiza os próprios dados da organização", async () => {
    const rows = await queryAs(
      IDS.users.creator,
      `UPDATE projetos.organizations SET telefone = '11999999999' WHERE id = '${IDS.org}' RETURNING id`,
    );
    expect(rows).toHaveLength(1);
  });

  it("diretor atualiza a organização mesmo sem ser o criador", async () => {
    const rows = await queryAs(
      IDS.users.diretor1,
      `UPDATE projetos.organizations SET telefone = '11888888888' WHERE id = '${IDS.org}' RETURNING id`,
    );
    expect(rows).toHaveLength(1);
  });

  it("um outsider (não-membro, não-diretoria) NÃO atualiza a organização", async () => {
    const rows = await queryAs(
      IDS.users.outsider,
      `UPDATE projetos.organizations SET telefone = '11777777777' WHERE id = '${IDS.org}' RETURNING id`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ── RLS org_members_write_admin — mirror do gate de add/removeOrganizationMember ──

describe("RLS — org_members_write_admin (addOrganizationMember/removeOrganizationMember)", () => {
  it("diretor adiciona um segundo membro à organização", async () => {
    const rows = await queryAs(
      IDS.users.diretor1,
      `INSERT INTO projetos.organization_members (organization_id, user_id) VALUES ('${IDS.org}', '${IDS.users.member2}') RETURNING user_id`,
    );
    expect(rows).toHaveLength(1);
  });

  it("o criador (não-diretoria) NÃO consegue adicionar membro por conta própria", async () => {
    await expect(
      queryAs(
        IDS.users.creator,
        `INSERT INTO projetos.organization_members (organization_id, user_id) VALUES ('${IDS.org}', '${IDS.users.outsider}') RETURNING user_id`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});

// ── Segundo membro enxerga os projetos da organização (projects_select_own_or_org) ──

describe("Segundo membro vê os projetos da organização após ser adicionado pela diretoria", () => {
  beforeAll(async () => {
    // member2 já foi inserido pelo teste de INSERT acima (diretor); garante
    // idempotência caso a suíte rode este describe isoladamente.
    await db
      .insert(organizationMembers)
      .values({ organizationId: IDS.org, userId: IDS.users.member2 })
      .onConflictDoNothing();

    await db
      .insert(projects)
      .values({
        id: EDIT_PROJECT_ID,
        title: "Projeto Segundo Membro",
        tipo: "anual",
        stage: "rascunho",
        organizationId: IDS.org,
        submitterId: IDS.users.creator,
        evaluationYear: 2026,
        budgetTotal: "12000.00",
        parcelas: 3,
        meses: 3,
      })
      .onConflictDoNothing();
  });

  it("member2 (não é o submitter) enxerga o projeto da própria organização", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.users.member2 },
      (tx) =>
        tx
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.id, EDIT_PROJECT_ID)),
    );
    expect(rows).toHaveLength(1);
  });

  it("outsider (não-membro) NÃO enxerga o projeto desta organização", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.users.outsider },
      (tx) =>
        tx
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.id, EDIT_PROJECT_ID)),
    );
    expect(rows).toHaveLength(0);
  });
});

// ── updateDraftProject: parcelas/meses não podem divergir (P-2.8c) ─────────

describe("updateDraftProject — coerência meses/parcelas via checkMesesPagamentoCoherence", () => {
  it("rejeita parcelas sem o mesmo número de meses selecionados (mesma função da criação)", () => {
    const result = z
      .object({ parcelas: z.number(), mesesPagamento: z.array(z.number()) })
      .superRefine((data, ctx) =>
        checkMesesPagamentoCoherence(data.mesesPagamento, data.parcelas, ctx),
      )
      .safeParse({ parcelas: 6, mesesPagamento: [1, 2, 3] });

    expect(result.success).toBe(false);
  });

  it("aceita quando parcelas e meses selecionados coincidem", () => {
    const result = z
      .object({ parcelas: z.number(), mesesPagamento: z.array(z.number()) })
      .superRefine((data, ctx) =>
        checkMesesPagamentoCoherence(data.mesesPagamento, data.parcelas, ctx),
      )
      .safeParse({ parcelas: 3, mesesPagamento: [1, 5, 9] });

    expect(result.success).toBe(true);
  });

  it("rascunho editado com novo número de parcelas → cronograma aprovado soma o budget_total", async () => {
    // Simula o efeito de updateDraftProject mudando parcelas de 3 para 6:
    // `meses` acompanha sempre mesesPagamento.length, nunca diverge (fix
    // aplicado em actions/projects.ts).
    await db
      .update(projects)
      .set({ parcelas: 6, meses: 6 })
      .where(eq(projects.id, EDIT_PROJECT_ID));

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, EDIT_PROJECT_ID));
    if (!project) throw new Error("Projeto de teste não encontrado");

    await generatePaymentSchedule(project);

    const schedule = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, EDIT_PROJECT_ID));

    const total = schedule.reduce(
      (sum, row) => sum + parseFloat(row.amount),
      0,
    );
    expect(schedule).toHaveLength(6);
    expect(total).toBeCloseTo(12000, 2);
  });
});

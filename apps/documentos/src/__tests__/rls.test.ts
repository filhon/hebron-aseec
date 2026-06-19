/**
 * rls.test.ts — RLS policies do schema documentos.
 *
 * Simula acesso anon e authenticated com diferentes papéis usando
 * SET LOCAL ROLE + request.jwt.claims dentro de transações com ROLLBACK.
 *
 * Requer: DATABASE_URL (superuser) + schema migrado.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  categories,
  documents,
  documentVersions,
  subscriptions,
} from "@hebron/db/schema";

// ── UUIDs fixos (prefixo f1) para cleanup determinístico ─────────────────────

const IDS = {
  admin: "f1000000-0000-0000-0000-000000000001",
  conselheiro: "f1000000-0000-0000-0000-000000000002",
  hospede: "f1000000-0000-0000-0000-000000000003",
} as const;

const DOC_IDS = {
  public: "f1000000-0000-0000-0000-000000000010",
  internal: "f1000000-0000-0000-0000-000000000011",
  restricted: "f1000000-0000-0000-0000-000000000012",
} as const;

const CAT_ID = "f1000000-0000-0000-0000-000000000020";
const SUB_ID = "f1000000-0000-0000-0000-000000000030";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for RLS tests");
const sql = postgres(DATABASE_URL, { prepare: false, max: 3 });

// ── Helpers ───────────────────────────────────────────────────────────────────

async function queryAsAnon(query: string): Promise<postgres.Row[]> {
  let rows: postgres.Row[] = [];
  try {
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE anon`;
      rows = await tx.unsafe(query);
      throw new Error("__rls_rollback__");
    });
  } catch (err) {
    if (err instanceof Error && err.message !== "__rls_rollback__") throw err;
  }
  return rows;
}

async function queryAs(userId: string, query: string): Promise<postgres.Row[]> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  let rows: postgres.Row[] = [];
  try {
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
      rows = await tx.unsafe(query);
      throw new Error("__rls_rollback__");
    });
  } catch (err) {
    if (err instanceof Error && err.message !== "__rls_rollback__") throw err;
  }
  return rows;
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  // Users
  const userFixtures = [
    {
      id: IDS.admin,
      email: "rls-docs-admin@test.hebron",
      fullName: "RLS Docs Admin",
    },
    {
      id: IDS.conselheiro,
      email: "rls-docs-conselheiro@test.hebron",
      fullName: "RLS Docs Conselheiro",
    },
    {
      id: IDS.hospede,
      email: "rls-docs-hospede@test.hebron",
      fullName: "RLS Docs Hóspede",
    },
  ];
  for (const u of userFixtures) {
    await db.insert(users).values(u).onConflictDoNothing();
  }

  // Role assignments
  const roleFixtures = [
    { userId: IDS.admin, role: "super_admin" as const, grantedBy: IDS.admin },
    {
      userId: IDS.conselheiro,
      role: "conselheiro" as const,
      grantedBy: IDS.admin,
    },
    { userId: IDS.hospede, role: "hospede" as const, grantedBy: IDS.admin },
  ];
  for (const r of roleFixtures) {
    await db.insert(roleAssignments).values(r).onConflictDoNothing();
  }

  // Category
  await db
    .insert(categories)
    .values({
      id: CAT_ID,
      name: "RLS Test Category",
      slug: "rls-test-category-docs",
    })
    .onConflictDoNothing();

  // Documents: um de cada visibilidade, publicados
  const now = new Date();
  const docFixtures = [
    {
      id: DOC_IDS.public,
      title: "RLS Public Doc",
      slug: "rls-public-doc",
      visibility: "public" as const,
      authorId: IDS.admin,
      publishedAt: now,
      categoryId: CAT_ID,
    },
    {
      id: DOC_IDS.internal,
      title: "RLS Internal Doc",
      slug: "rls-internal-doc",
      visibility: "internal" as const,
      authorId: IDS.admin,
      publishedAt: now,
      categoryId: CAT_ID,
    },
    {
      id: DOC_IDS.restricted,
      title: "RLS Restricted Doc",
      slug: "rls-restricted-doc",
      visibility: "restricted" as const,
      authorId: IDS.admin,
      publishedAt: now,
      categoryId: CAT_ID,
    },
  ];
  for (const d of docFixtures) {
    await db.insert(documents).values(d).onConflictDoNothing();
  }

  // Versões (uma por documento)
  for (const docId of Object.values(DOC_IDS)) {
    await db
      .insert(documentVersions)
      .values({ documentId: docId, versionNumber: 1, createdBy: IDS.admin })
      .onConflictDoNothing();
  }

  // Inscrição: hospede assina a categoria
  await db
    .insert(subscriptions)
    .values({ id: SUB_ID, userId: IDS.hospede, categoryId: CAT_ID })
    .onConflictDoNothing();

  // Grants necessários para que anon e authenticated possam consultar o schema
  await sql`GRANT USAGE ON SCHEMA documentos TO anon`;
  await sql`GRANT USAGE ON SCHEMA documentos TO authenticated`;
  await sql`GRANT SELECT ON ALL TABLES IN SCHEMA documentos TO anon`;
  await sql`GRANT SELECT ON ALL TABLES IN SCHEMA documentos TO authenticated`;
});

afterAll(async () => {
  // Cleanup em ordem inversa de FK
  await db.delete(subscriptions).where(eq(subscriptions.id, SUB_ID));
  await db
    .delete(documentVersions)
    .where(inArray(documentVersions.documentId, Object.values(DOC_IDS)));
  await db
    .delete(documents)
    .where(inArray(documents.id, Object.values(DOC_IDS)));
  await db.delete(categories).where(eq(categories.id, CAT_ID));
  for (const id of Object.values(IDS)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS)) {
    await db.delete(users).where(eq(users.id, id));
  }
  await sql.end();
});

// ── documentos.documents ──────────────────────────────────────────────────────

describe("RLS — documentos.documents", () => {
  const Q = `
    SELECT id FROM documentos.documents
    WHERE id IN (
      '${DOC_IDS.public}',
      '${DOC_IDS.internal}',
      '${DOC_IDS.restricted}'
    )
  `;

  it("anon vê apenas documentos públicos", async () => {
    const rows = await queryAsAnon(Q);
    const ids = rows.map((r) => r["id"] as string);
    expect(ids).toContain(DOC_IDS.public);
    expect(ids).not.toContain(DOC_IDS.internal);
    expect(ids).not.toContain(DOC_IDS.restricted);
  });

  it("hospede (autenticado, sem papel especial) vê public + internal", async () => {
    const rows = await queryAs(IDS.hospede, Q);
    const ids = rows.map((r) => r["id"] as string);
    expect(ids).toContain(DOC_IDS.public);
    expect(ids).toContain(DOC_IDS.internal);
    expect(ids).not.toContain(DOC_IDS.restricted);
  });

  it("conselheiro vê public, internal e restricted", async () => {
    const rows = await queryAs(IDS.conselheiro, Q);
    const ids = rows.map((r) => r["id"] as string);
    expect(ids).toContain(DOC_IDS.public);
    expect(ids).toContain(DOC_IDS.internal);
    expect(ids).toContain(DOC_IDS.restricted);
  });

  it("super_admin vê todos os documentos", async () => {
    const rows = await queryAs(IDS.admin, Q);
    const ids = rows.map((r) => r["id"] as string);
    expect(ids).toContain(DOC_IDS.public);
    expect(ids).toContain(DOC_IDS.internal);
    expect(ids).toContain(DOC_IDS.restricted);
  });

  it("anon NÃO vê documento deletado mesmo que público", async () => {
    // Simula documento deletado: deleted_at preenchido
    await db
      .update(documents)
      .set({ deletedAt: new Date() })
      .where(eq(documents.id, DOC_IDS.public));

    const rows = await queryAsAnon(
      `SELECT id FROM documentos.documents WHERE id = '${DOC_IDS.public}'`,
    );
    expect(rows).toHaveLength(0);

    // Restaura
    await db
      .update(documents)
      .set({ deletedAt: null })
      .where(eq(documents.id, DOC_IDS.public));
  });
});

// ── documentos.document_versions (herdam visibilidade do pai) ─────────────────

describe("RLS — documentos.document_versions", () => {
  it("anon vê versões do documento público", async () => {
    const rows = await queryAsAnon(
      `SELECT id FROM documentos.document_versions WHERE document_id = '${DOC_IDS.public}'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("anon NÃO vê versões do documento interno", async () => {
    const rows = await queryAsAnon(
      `SELECT id FROM documentos.document_versions WHERE document_id = '${DOC_IDS.internal}'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("anon NÃO vê versões do documento restricted", async () => {
    const rows = await queryAsAnon(
      `SELECT id FROM documentos.document_versions WHERE document_id = '${DOC_IDS.restricted}'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("hospede vê versões de public e internal, mas não de restricted", async () => {
    const pubRows = await queryAs(
      IDS.hospede,
      `SELECT id FROM documentos.document_versions WHERE document_id = '${DOC_IDS.public}'`,
    );
    const intRows = await queryAs(
      IDS.hospede,
      `SELECT id FROM documentos.document_versions WHERE document_id = '${DOC_IDS.internal}'`,
    );
    const rstRows = await queryAs(
      IDS.hospede,
      `SELECT id FROM documentos.document_versions WHERE document_id = '${DOC_IDS.restricted}'`,
    );
    expect(pubRows.length).toBeGreaterThanOrEqual(1);
    expect(intRows.length).toBeGreaterThanOrEqual(1);
    expect(rstRows).toHaveLength(0);
  });

  it("conselheiro vê versões de todos os documentos", async () => {
    const rows = await queryAs(
      IDS.conselheiro,
      `SELECT document_id FROM documentos.document_versions
       WHERE document_id IN (
         '${DOC_IDS.public}', '${DOC_IDS.internal}', '${DOC_IDS.restricted}'
       )`,
    );
    const docIds = rows.map((r) => r["document_id"] as string);
    expect(docIds).toContain(DOC_IDS.public);
    expect(docIds).toContain(DOC_IDS.internal);
    expect(docIds).toContain(DOC_IDS.restricted);
  });
});

// ── documentos.categories (acesso público) ────────────────────────────────────

describe("RLS — documentos.categories", () => {
  it("anon pode listar categorias", async () => {
    const rows = await queryAsAnon(
      `SELECT id FROM documentos.categories WHERE id = '${CAT_ID}'`,
    );
    expect(rows.length).toBe(1);
  });

  it("hospede pode listar categorias", async () => {
    const rows = await queryAs(
      IDS.hospede,
      `SELECT id FROM documentos.categories WHERE id = '${CAT_ID}'`,
    );
    expect(rows.length).toBe(1);
  });
});

// ── documentos.subscriptions (only own / admin) ───────────────────────────────

describe("RLS — documentos.subscriptions", () => {
  it("usuário vê a própria inscrição", async () => {
    const rows = await queryAs(
      IDS.hospede,
      `SELECT id FROM documentos.subscriptions WHERE id = '${SUB_ID}'`,
    );
    expect(rows.length).toBe(1);
  });

  it("outro usuário sem papel admin NÃO vê inscrições alheias", async () => {
    const rows = await queryAs(
      IDS.conselheiro,
      `SELECT id FROM documentos.subscriptions WHERE id = '${SUB_ID}'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("super_admin vê todas as inscrições", async () => {
    const rows = await queryAs(
      IDS.admin,
      `SELECT id FROM documentos.subscriptions WHERE id = '${SUB_ID}'`,
    );
    expect(rows.length).toBe(1);
  });
});

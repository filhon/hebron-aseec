/**
 * rls.test.ts — RLS policies do schema documentos.
 *
 * Simula acesso anon e authenticated com diferentes papéis usando
 * SET LOCAL ROLE + request.jwt.claims dentro de transações com ROLLBACK.
 *
 * Os GRANTs para `authenticated`/`anon` no schema documentos são permanentes
 * (0014_grants_authenticated.sql, P-0.10) — este arquivo não precisa mais
 * concedê-los ao redor da suíte.
 *
 * Requer: DATABASE_URL (superuser) + schema migrado.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { eq, inArray, sql as drizzleSql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
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
  colaboradorAuthor: "f1000000-0000-0000-0000-000000000004",
  colaboradorOther: "f1000000-0000-0000-0000-000000000005",
} as const;

const DOC_IDS = {
  public: "f1000000-0000-0000-0000-000000000010",
  internal: "f1000000-0000-0000-0000-000000000011",
  restricted: "f1000000-0000-0000-0000-000000000012",
  draft: "f1000000-0000-0000-0000-000000000013",
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
    {
      id: IDS.colaboradorAuthor,
      email: "rls-docs-colaborador-autor@test.hebron",
      fullName: "RLS Docs Colaborador Autor",
    },
    {
      id: IDS.colaboradorOther,
      email: "rls-docs-colaborador-outro@test.hebron",
      fullName: "RLS Docs Colaborador Outro",
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
    {
      userId: IDS.colaboradorAuthor,
      role: "colaborador" as const,
      grantedBy: IDS.admin,
    },
    {
      userId: IDS.colaboradorOther,
      role: "colaborador" as const,
      grantedBy: IDS.admin,
    },
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
    {
      id: DOC_IDS.draft,
      title: "RLS Draft Doc",
      slug: "rls-draft-doc",
      visibility: "internal" as const,
      authorId: IDS.colaboradorAuthor,
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

// ── Regressão F2-D1 / F2-D2 ───────────────────────────────────────────────────
// F2-D1: "página `[slug]` não tem filtro de visibility algum — um documento
// `restricted` publicado é renderizado por completo para qualquer anônimo".
// F2-D2: "Área editorial sem nenhuma autenticação [...] rascunhos e KPIs
// renderizados a anônimos". Causa raiz comum: a página lia via `db`
// (superuser), que ignora RLS. `withAuthenticatedContext` é o caminho que
// as páginas devem adotar (P-0.10 escopo) — provado aqui pela mesma consulta
// por slug que a página pública faz.

describe("Regressão F2-D1/F2-D2 — leitura via client autenticado respeita visibilidade", () => {
  it("anon consultando por slug (como a página [slug] faz) não recebe o documento restricted", async () => {
    const rows = await withAuthenticatedContext(null, async (tx) => {
      return tx.execute(
        drizzleSql`SELECT id, file_url FROM documentos.documents WHERE slug = 'rls-restricted-doc'`,
      );
    });
    expect(Array.from(rows)).toHaveLength(0);
  });

  it("anon consultando por slug não recebe o documento internal", async () => {
    const rows = await withAuthenticatedContext(null, async (tx) => {
      return tx.execute(
        drizzleSql`SELECT id FROM documentos.documents WHERE slug = 'rls-internal-doc'`,
      );
    });
    expect(Array.from(rows)).toHaveLength(0);
  });

  it("anon consultando por slug recebe apenas o documento public", async () => {
    const rows = await withAuthenticatedContext(null, async (tx) => {
      return tx.execute(
        drizzleSql`SELECT id FROM documentos.documents WHERE slug = 'rls-public-doc'`,
      );
    });
    expect(Array.from(rows)).toHaveLength(1);
  });

  it("hóspede autenticado (sem papel editorial) não enxerga documento restricted via client autenticado", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.hospede },
      async (tx) =>
        tx.execute(
          drizzleSql`SELECT id FROM documentos.documents WHERE slug = 'rls-restricted-doc'`,
        ),
    );
    expect(Array.from(rows)).toHaveLength(0);
  });
});

// ── Regressão P-1.15b ─────────────────────────────────────────────────────────
// A rota `/categoria/[slug]` (P-1.15b) lista documentos por `category_id IN
// (cat.id, ...subcategorias)` via `withAuthenticatedContext` — mesma consulta
// abaixo, agora usando `CAT_ID` (que tem um documento de cada visibilidade).
// Garante que nem a listagem nem a contagem exponham `internal`/`restricted`
// para quem não tem papel para vê-los.

describe("Regressão P-1.15b — /categoria/[slug] respeita visibilidade na listagem", () => {
  const byCategory = drizzleSql`
    SELECT id FROM documentos.documents
    WHERE category_id = ${CAT_ID}
      AND deleted_at IS NULL
      AND published_at IS NOT NULL
  `;

  it("anônimo só recebe o documento public da categoria", async () => {
    const rows = await withAuthenticatedContext(null, (tx) =>
      tx.execute(byCategory),
    );
    const ids = Array.from(rows).map((r) => r["id"] as string);
    expect(ids).toContain(DOC_IDS.public);
    expect(ids).not.toContain(DOC_IDS.internal);
    expect(ids).not.toContain(DOC_IDS.restricted);
  });

  it("hóspede (autenticado, sem papel especial) recebe public + internal, mas não restricted", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.hospede },
      (tx) => tx.execute(byCategory),
    );
    const ids = Array.from(rows).map((r) => r["id"] as string);
    expect(ids).toContain(DOC_IDS.public);
    expect(ids).toContain(DOC_IDS.internal);
    expect(ids).not.toContain(DOC_IDS.restricted);
  });

  it("conselheiro recebe os três documentos da categoria", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.conselheiro },
      (tx) => tx.execute(byCategory),
    );
    const ids = Array.from(rows).map((r) => r["id"] as string);
    expect(ids).toContain(DOC_IDS.public);
    expect(ids).toContain(DOC_IDS.internal);
    expect(ids).toContain(DOC_IDS.restricted);
  });
});

// ── Regressão P-1.19b (item 1) — rascunho e lixeira ────────────────────────────
// Antes desta migration, as 3 policies de SELECT em documents não filtravam
// published_at (rascunho vazava por visibility) e nenhuma policy alcançava
// deleted_at IS NOT NULL (soft-delete ficava invisível para todo mundo,
// inclusive quem apagou). documents_select_own_draft cobre os dois casos.

describe("RLS — documentos.documents (rascunho)", () => {
  const Q = `SELECT id FROM documentos.documents WHERE id = '${DOC_IDS.draft}'`;

  it("anon NÃO vê o rascunho, mesmo sendo visibility internal/public", async () => {
    const rows = await queryAsAnon(Q);
    expect(rows).toHaveLength(0);
  });

  it("colaborador não-autor NÃO vê o rascunho alheio", async () => {
    const rows = await queryAs(IDS.colaboradorOther, Q);
    expect(rows).toHaveLength(0);
  });

  it("autor vê o próprio rascunho", async () => {
    const rows = await queryAs(IDS.colaboradorAuthor, Q);
    expect(rows).toHaveLength(1);
  });

  it("super_admin vê o rascunho de outro autor", async () => {
    const rows = await queryAs(IDS.admin, Q);
    expect(rows).toHaveLength(1);
  });
});

describe("RLS — documentos.documents (lixeira)", () => {
  beforeAll(async () => {
    await db
      .update(documents)
      .set({ deletedAt: new Date() })
      .where(eq(documents.id, DOC_IDS.public));
  });

  afterAll(async () => {
    await db
      .update(documents)
      .set({ deletedAt: null })
      .where(eq(documents.id, DOC_IDS.public));
  });

  const Q = `SELECT id FROM documentos.documents WHERE id = '${DOC_IDS.public}'`;

  it("anon NÃO vê o documento removido", async () => {
    const rows = await queryAsAnon(Q);
    expect(rows).toHaveLength(0);
  });

  it("colaborador não-autor NÃO vê o documento removido alheio", async () => {
    const rows = await queryAs(IDS.colaboradorOther, Q);
    expect(rows).toHaveLength(0);
  });

  it("autor (admin) vê o próprio documento removido", async () => {
    const rows = await queryAs(IDS.admin, Q);
    expect(rows).toHaveLength(1);
  });
});

// ── Regressão P-1.19b (item 3) — escrita por papel ─────────────────────────────
// documentos.documents: authenticated tem GRANT SELECT/INSERT/UPDATE (sem
// DELETE — soft delete via UPDATE); anon só tem SELECT (0014_grants_authenticated).
// Um INSERT/UPDATE como anon já falha no GRANT, antes de qualquer policy.

describe("RLS — documentos.documents (INSERT)", () => {
  const insertAs = (authorId: string) => `
    INSERT INTO documentos.documents (id, title, slug, visibility, type, author_id)
    VALUES (
      'f1000000-0000-0000-0000-000000000040',
      'RLS Insert Test',
      'rls-insert-test-' || gen_random_uuid(),
      'internal',
      'other',
      '${authorId}'
    )
    RETURNING id
  `;

  it("anon NÃO pode inserir documento (sem GRANT)", async () => {
    await expect(queryAsAnon(insertAs(IDS.hospede))).rejects.toThrow();
  });

  it("hospede (autenticado, sem papel editorial) NÃO pode inserir documento", async () => {
    await expect(queryAs(IDS.hospede, insertAs(IDS.hospede))).rejects.toThrow();
  });

  it("conselheiro NÃO pode inserir documento (é somente-leitura)", async () => {
    await expect(
      queryAs(IDS.conselheiro, insertAs(IDS.conselheiro)),
    ).rejects.toThrow();
  });

  it("colaborador NÃO pode inserir documento com author_id alheio", async () => {
    await expect(
      queryAs(IDS.colaboradorAuthor, insertAs(IDS.admin)),
    ).rejects.toThrow();
  });

  it("colaborador pode inserir documento com author_id = si mesmo", async () => {
    const rows = await queryAs(
      IDS.colaboradorAuthor,
      insertAs(IDS.colaboradorAuthor),
    );
    expect(rows).toHaveLength(1);
  });

  it("super_admin pode inserir documento (author_id = si mesmo)", async () => {
    // documents_insert_editor (0005_documentos_rls.sql, inalterada aqui)
    // exige author_id = auth.uid() para todo mundo, inclusive super_admin —
    // não existe insert em nome de terceiros.
    const rows = await queryAs(IDS.admin, insertAs(IDS.admin));
    expect(rows).toHaveLength(1);
  });
});

describe("RLS — documentos.documents (UPDATE)", () => {
  const updateTitle = (docId: string) => `
    UPDATE documentos.documents SET title = 'RLS Update Test'
    WHERE id = '${docId}'
    RETURNING id
  `;

  it("anon NÃO pode atualizar documento (sem GRANT)", async () => {
    await expect(queryAsAnon(updateTitle(DOC_IDS.public))).rejects.toThrow();
  });

  it("autor atualiza o próprio documento", async () => {
    const rows = await queryAs(
      IDS.colaboradorAuthor,
      updateTitle(DOC_IDS.draft),
    );
    expect(rows).toHaveLength(1);
  });

  it("colaborador NÃO atualiza documento de terceiro (0 linhas, sem erro)", async () => {
    const rows = await queryAs(
      IDS.colaboradorOther,
      updateTitle(DOC_IDS.draft),
    );
    expect(rows).toHaveLength(0);
  });

  it("conselheiro NÃO atualiza nenhum documento (é somente-leitura)", async () => {
    const rows = await queryAs(IDS.conselheiro, updateTitle(DOC_IDS.public));
    expect(rows).toHaveLength(0);
  });

  it("hospede NÃO atualiza nenhum documento", async () => {
    const rows = await queryAs(IDS.hospede, updateTitle(DOC_IDS.public));
    expect(rows).toHaveLength(0);
  });

  it("super_admin atualiza qualquer documento", async () => {
    const rows = await queryAs(IDS.admin, updateTitle(DOC_IDS.public));
    expect(rows).toHaveLength(1);
  });
});

describe("RLS — documentos.documents (soft-delete / restore)", () => {
  it("autor soft-deleta e restaura o próprio documento", async () => {
    const deleted = await queryAs(
      IDS.colaboradorAuthor,
      `UPDATE documentos.documents SET deleted_at = now()
       WHERE id = '${DOC_IDS.draft}' RETURNING id, deleted_at`,
    );
    expect(deleted).toHaveLength(1);
    expect(deleted[0]?.["deleted_at"]).not.toBeNull();

    const restored = await queryAs(
      IDS.colaboradorAuthor,
      `UPDATE documentos.documents SET deleted_at = NULL
       WHERE id = '${DOC_IDS.draft}' RETURNING id, deleted_at`,
    );
    expect(restored).toHaveLength(1);
    expect(restored[0]?.["deleted_at"]).toBeNull();
  });

  it("colaborador NÃO soft-deleta documento de terceiro (0 linhas)", async () => {
    const rows = await queryAs(
      IDS.colaboradorOther,
      `UPDATE documentos.documents SET deleted_at = now()
       WHERE id = '${DOC_IDS.public}' RETURNING id`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ── Regressão P-1.19b (item 4) — document_versions: created_by alheio ─────────
// document_versions só recebe GRANT SELECT/INSERT (sem UPDATE/DELETE —
// versões são imutáveis); WITH CHECK exige created_by = auth.uid().

describe("RLS — documentos.document_versions (INSERT)", () => {
  it("colaborador NÃO insere versão com created_by alheio", async () => {
    await expect(
      queryAs(
        IDS.colaboradorAuthor,
        `INSERT INTO documentos.document_versions (id, document_id, version_number, created_by)
         VALUES ('f1000000-0000-0000-0000-000000000041', '${DOC_IDS.draft}', 99, '${IDS.admin}')
         RETURNING id`,
      ),
    ).rejects.toThrow();
  });

  it("colaborador insere versão com created_by = si mesmo", async () => {
    const rows = await queryAs(
      IDS.colaboradorAuthor,
      `INSERT INTO documentos.document_versions (id, document_id, version_number, created_by)
       VALUES ('f1000000-0000-0000-0000-000000000042', '${DOC_IDS.draft}', 98, '${IDS.colaboradorAuthor}')
       RETURNING id`,
    );
    expect(rows).toHaveLength(1);
  });
});

// ── Regressão P-1.21b — área editorial lê via client autenticado ──────────────
// P-1.21b: nove páginas da área editorial liam via `db` (superuser), que
// ignora RLS — um `colaborador` navegando `/editorial/documentos` ou
// `/editorial/[id]/editar` enxergava documentos `restricted`/rascunhos de
// terceiros por completo. Mesma classe de falha de F2-D1/F2-D2, um andar
// acima do portal público: aqui a prova é a mesma consulta que a listagem e
// a tela de edição fazem, rodada via `withAuthenticatedContext`.

describe("Regressão P-1.21b — /editorial/documentos respeita RLS na listagem", () => {
  it("colaborador não-autor não recebe documento restricted alheio na consulta da listagem editorial", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.colaboradorOther },
      (tx) =>
        tx.execute(
          drizzleSql`SELECT id FROM documentos.documents WHERE id = ${DOC_IDS.restricted}`,
        ),
    );
    expect(Array.from(rows)).toHaveLength(0);
  });

  it("conselheiro recebe o documento restricted na consulta da listagem editorial", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.conselheiro },
      (tx) =>
        tx.execute(
          drizzleSql`SELECT id FROM documentos.documents WHERE id = ${DOC_IDS.restricted}`,
        ),
    );
    expect(Array.from(rows)).toHaveLength(1);
  });

  it("super_admin recebe o documento restricted na consulta da listagem editorial", async () => {
    const rows = await withAuthenticatedContext({ actorId: IDS.admin }, (tx) =>
      tx.execute(
        drizzleSql`SELECT id FROM documentos.documents WHERE id = ${DOC_IDS.restricted}`,
      ),
    );
    expect(Array.from(rows)).toHaveLength(1);
  });
});

describe("Regressão P-1.21b — /editorial/[id]/editar respeita RLS na leitura", () => {
  it("colaborador não-autor não recebe o documento restricted alheio pela consulta de edição", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.colaboradorOther },
      (tx) =>
        tx.execute(
          drizzleSql`SELECT id FROM documentos.documents WHERE id = ${DOC_IDS.restricted}`,
        ),
    );
    expect(Array.from(rows)).toHaveLength(0);
  });

  it("colaborador não-autor não recebe o rascunho alheio pela consulta de edição", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.colaboradorOther },
      (tx) =>
        tx.execute(
          drizzleSql`SELECT id FROM documentos.documents WHERE id = ${DOC_IDS.draft}`,
        ),
    );
    expect(Array.from(rows)).toHaveLength(0);
  });

  it("colaborador autor recebe o próprio rascunho pela consulta de edição", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.colaboradorAuthor },
      (tx) =>
        tx.execute(
          drizzleSql`SELECT id FROM documentos.documents WHERE id = ${DOC_IDS.draft}`,
        ),
    );
    expect(Array.from(rows)).toHaveLength(1);
  });

  it("super_admin recebe o rascunho de outro autor pela consulta de edição", async () => {
    const rows = await withAuthenticatedContext({ actorId: IDS.admin }, (tx) =>
      tx.execute(
        drizzleSql`SELECT id FROM documentos.documents WHERE id = ${DOC_IDS.draft}`,
      ),
    );
    expect(Array.from(rows)).toHaveLength(1);
  });
});

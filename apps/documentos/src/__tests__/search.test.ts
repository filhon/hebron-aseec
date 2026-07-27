/**
 * search.test.ts — busca de documentos do módulo documentos.
 *
 * Exercita `searchDocumentsQuery` (lib/search-query.ts) diretamente — o mesmo
 * módulo consumido por `app/busca/page.tsx`, a tela que o usuário realmente
 * usa. `actions/search.ts` foi removido em P-1.20b: `searchDocuments` nunca
 * teve chamador fora deste arquivo (S-29b registrou o motivo, mas a action
 * ficou órfã e testada em separado da consulta real).
 *
 * Mocks:
 *   - next/headers      → cookies sem contexto de request
 *   - @supabase/supabase-js → ACTOR_ID como usuário autenticado
 *
 * Requer: DATABASE_URL migrado (inclui 0063_documentos_busca.sql: unaccent,
 * pg_trgm, documents.search_text).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  users,
  categories,
  tags,
  documents,
  documentTags,
  documentVersions,
} from "@hebron/db/schema";
import { searchDocumentsQuery } from "../lib/search-query";

// ── IDs fixos (prefixo e3) ────────────────────────────────────────────────────

const ACTOR_ID = "e3000000-0000-0000-0000-000000000001";
const ACTOR_EMAIL = "srch-docs-actor@test.hebron";

const CAT_A_ID = "e3000000-0000-0000-0000-000000000010";
const CAT_B_ID = "e3000000-0000-0000-0000-000000000011";
const TAG_ID = "e3000000-0000-0000-0000-000000000020";

// Tokens únicos para minimizar colisões com outros dados no banco
const TOKEN_TITLE = "SRCHTITLE_ALFA_7x3q";
const TOKEN_CONTENT = "SRCCONTENT_BRAVO_9k2m";
const TOKEN_TAG = "srctag-charlie-4p8w";
const TOKEN_CATFILT = "SRCCATFILT_DELTA_1n5r";
const TOKEN_UNPUB = "SRCUNPUB_ECHO_6s0j";
const TOKEN_DELETED = "SRCDEL_FOXTROT_2b7v";
const TOKEN_ACCENT = "SRCHACC_GOLF_3q9z"; // combinado com "Orçamento" no título

const DOC_IDS = {
  byTitle: "e3000000-0000-0000-0000-000000000030",
  byContent: "e3000000-0000-0000-0000-000000000031",
  byTag: "e3000000-0000-0000-0000-000000000032",
  byCat: "e3000000-0000-0000-0000-000000000033",
  unpublished: "e3000000-0000-0000-0000-000000000034",
  deleted: "e3000000-0000-0000-0000-000000000035",
  accented: "e3000000-0000-0000-0000-000000000036",
} as const;

// ── Mocks globais ─────────────────────────────────────────────────────────────

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
  }),
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: ACTOR_ID,
    roles: ["colaborador"],
  }),
}));

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  const now = new Date();

  // Usuário autor (necessário para FK author_id)
  await db
    .insert(users)
    .values({ id: ACTOR_ID, email: ACTOR_EMAIL, fullName: "Search Docs Actor" })
    .onConflictDoNothing();

  // Categorias
  await db
    .insert(categories)
    .values([
      { id: CAT_A_ID, name: "Search Category A", slug: "srch-cat-a-e3" },
      { id: CAT_B_ID, name: "Search Category B", slug: "srch-cat-b-e3" },
    ])
    .onConflictDoNothing();

  // Tag
  await db
    .insert(tags)
    .values({ id: TAG_ID, name: TOKEN_TAG, slug: `slug-${TOKEN_TAG}` })
    .onConflictDoNothing();

  // Documentos publicados
  await db
    .insert(documents)
    .values([
      {
        id: DOC_IDS.byTitle,
        title: `Documento ${TOKEN_TITLE}`,
        slug: `doc-by-title-e3`,
        contentMd: "conteúdo genérico",
        visibility: "public" as const,
        authorId: ACTOR_ID,
        publishedAt: now,
        categoryId: CAT_A_ID,
      },
      {
        id: DOC_IDS.byContent,
        title: "Documento de Conteúdo Search",
        slug: `doc-by-content-e3`,
        contentMd: `Parágrafo com ${TOKEN_CONTENT} no meio do texto`,
        visibility: "public" as const,
        authorId: ACTOR_ID,
        publishedAt: now,
        categoryId: CAT_A_ID,
      },
      {
        id: DOC_IDS.byTag,
        title: "Documento com Tag Search",
        slug: `doc-by-tag-e3`,
        contentMd: "conteúdo sem termo especial",
        visibility: "public" as const,
        authorId: ACTOR_ID,
        publishedAt: now,
        categoryId: CAT_A_ID,
      },
      {
        id: DOC_IDS.byCat,
        title: `Documento ${TOKEN_CATFILT}`,
        slug: `doc-by-cat-e3`,
        contentMd: "conteúdo genérico",
        visibility: "public" as const,
        authorId: ACTOR_ID,
        publishedAt: now,
        categoryId: CAT_B_ID,
      },
      // Não publicado
      {
        id: DOC_IDS.unpublished,
        title: `Documento ${TOKEN_UNPUB}`,
        slug: `doc-unpub-e3`,
        contentMd: "conteúdo genérico",
        visibility: "public" as const,
        authorId: ACTOR_ID,
        publishedAt: null,
        categoryId: CAT_A_ID,
      },
      // Deletado (soft delete)
      {
        id: DOC_IDS.deleted,
        title: `Documento ${TOKEN_DELETED}`,
        slug: `doc-deleted-e3`,
        contentMd: "conteúdo genérico",
        visibility: "public" as const,
        authorId: ACTOR_ID,
        publishedAt: now,
        deletedAt: now,
        categoryId: CAT_A_ID,
      },
      // Título acentuado — casos de acento/maiúsculas
      {
        id: DOC_IDS.accented,
        title: `Orçamento ${TOKEN_ACCENT}`,
        slug: `doc-accented-e3`,
        contentMd: "conteúdo genérico",
        visibility: "public" as const,
        authorId: ACTOR_ID,
        publishedAt: now,
        categoryId: CAT_A_ID,
      },
    ])
    .onConflictDoNothing();

  // Versões (obrigatório para integridade; search não as usa, mas FK exige)
  for (const docId of Object.values(DOC_IDS)) {
    await db
      .insert(documentVersions)
      .values({ documentId: docId, versionNumber: 1, createdBy: ACTOR_ID })
      .onConflictDoNothing();
  }

  // Tag no documento byTag
  await db
    .insert(documentTags)
    .values({ documentId: DOC_IDS.byTag, tagId: TAG_ID })
    .onConflictDoNothing();
});

afterAll(async () => {
  const allDocIds = Object.values(DOC_IDS);
  await db
    .delete(documentTags)
    .where(inArray(documentTags.documentId, allDocIds));
  await db
    .delete(documentVersions)
    .where(inArray(documentVersions.documentId, allDocIds));
  await db.delete(documents).where(inArray(documents.id, allDocIds));
  await db.delete(tags).where(eq(tags.id, TAG_ID));
  await db
    .delete(categories)
    .where(inArray(categories.id, [CAT_A_ID, CAT_B_ID]));
  await db.delete(users).where(eq(users.id, ACTOR_ID));
});

// Helper: roda searchDocumentsQuery sob o mesmo contexto autenticado que a
// tela /busca usa (withAuthenticatedContext), como app/busca/page.tsx faz.
async function search(filters: Parameters<typeof searchDocumentsQuery>[1]) {
  return withAuthenticatedContext({ actorId: ACTOR_ID }, (tx) =>
    searchDocumentsQuery(tx, filters),
  );
}

// ── Busca por título / conteúdo ────────────────────────────────────────────────

describe("searchDocumentsQuery — busca por título", () => {
  it("retorna documento cujo título contém o termo", async () => {
    const rows = await search({ query: TOKEN_TITLE });
    expect(rows.map((r) => r.id)).toContain(DOC_IDS.byTitle);
  });

  it("NÃO retorna documentos sem o termo no título", async () => {
    const rows = await search({ query: TOKEN_TITLE });
    expect(rows.map((r) => r.id)).not.toContain(DOC_IDS.byContent);
  });
});

describe("searchDocumentsQuery — busca por conteúdo", () => {
  it("retorna documento cujo contentMd contém o termo", async () => {
    const rows = await search({ query: TOKEN_CONTENT });
    expect(rows.map((r) => r.id)).toContain(DOC_IDS.byContent);
  });
});

// ── Acento e caixa (P-1.20b) ────────────────────────────────────────────────────

describe("searchDocumentsQuery — insensível a acento e caixa", () => {
  it("termo sem acento encontra título acentuado (orcamento → Orçamento)", async () => {
    const rows = await search({ query: `orcamento ${TOKEN_ACCENT}` });
    expect(rows.map((r) => r.id)).toContain(DOC_IDS.accented);
  });

  it("termo acentuado encontra o mesmo documento (Orçamento → Orçamento)", async () => {
    const rows = await search({ query: `Orçamento ${TOKEN_ACCENT}` });
    expect(rows.map((r) => r.id)).toContain(DOC_IDS.accented);
  });

  it("é insensível a maiúsculas/minúsculas", async () => {
    const rows = await search({ query: TOKEN_ACCENT.toLowerCase() });
    expect(rows.map((r) => r.id)).toContain(DOC_IDS.accented);
  });
});

// ── Busca por tag (comportamento legado de searchDocuments) ─────────────────────

describe("searchDocumentsQuery — busca por nome de tag (matchTagNames)", () => {
  it("retorna documento que tem tag com nome correspondente", async () => {
    const rows = await search({ query: TOKEN_TAG, matchTagNames: true });
    expect(rows.map((r) => r.id)).toContain(DOC_IDS.byTag);
  });

  it("sem matchTagNames, não casa pelo nome da tag", async () => {
    const rows = await search({ query: TOKEN_TAG });
    expect(rows.map((r) => r.id)).not.toContain(DOC_IDS.byTag);
  });
});

// ── Filtros ──────────────────────────────────────────────────────────────────────

describe("searchDocumentsQuery — filtro por categoria", () => {
  it("retorna apenas documentos da categoria especificada", async () => {
    const rows = await search({
      query: TOKEN_CATFILT,
      categoryId: CAT_B_ID,
    });
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(DOC_IDS.byCat);
    expect(ids).not.toContain(DOC_IDS.byTitle);
  });
});

// ── Visibilidade ─────────────────────────────────────────────────────────────────

describe("searchDocumentsQuery — documentos não visíveis", () => {
  it("NÃO retorna documentos não publicados (publishedAt nulo)", async () => {
    const rows = await search({ query: TOKEN_UNPUB });
    expect(rows.map((r) => r.id)).not.toContain(DOC_IDS.unpublished);
  });

  it("NÃO retorna documentos com soft delete (deletedAt preenchido)", async () => {
    const rows = await search({ query: TOKEN_DELETED });
    expect(rows.map((r) => r.id)).not.toContain(DOC_IDS.deleted);
  });
});

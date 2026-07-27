import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { SQLWrapper } from "drizzle-orm";
import type { AuthenticatedTx } from "@hebron/db/authenticated";
import { categories, documentTags, documents, tags } from "@hebron/db/schema";

/**
 * Consulta única de busca de documentos (P-1.20b): usada tanto por
 * `app/busca/page.tsx` (busca pública) quanto pelos testes que antes
 * exercitavam `actions/search.ts` — a action foi removida por não ter
 * chamador fora dos próprios testes (S-29b nunca resolveu isso).
 *
 * Compara sempre `unaccent(lower(...))` dos dois lados via `documents.search_text`
 * (coluna gerada, 0063_documentos_busca.sql) e o índice GIN trgm equivalente —
 * "orcamento" encontra "Orçamento" e vice-versa, sem sensibilidade a acento
 * ou caixa, mantendo a semântica atual de substring (não `tsquery`).
 */

export type DocumentVisibility = (typeof documents.$inferSelect)["visibility"];
export type EditalFilter = "any" | "only" | "exclude";

export interface DocumentSearchFilters {
  query: string;
  categoryId?: string;
  visibility?: DocumentVisibility;
  /** Filtro exato por tags selecionadas (chips da tela /busca). */
  tagIds?: string[];
  /** Também encontra documentos cujo nome de tag contém o termo (comportamento herdado de searchDocuments). */
  matchTagNames?: boolean;
  editalFilter?: EditalFilter;
  orderBy?: "publishedAt" | "updatedAt";
  limit?: number;
  offset?: number;
}

export interface DocumentSearchRow {
  id: string;
  title: string;
  slug: string;
  contentMd: string | null;
  fileUrl: string | null;
  visibility: DocumentVisibility;
  categoryId: string | null;
  authorId: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  categoryName: string | null;
  categorySlug: string | null;
}

const SELECTION = {
  id: documents.id,
  title: documents.title,
  slug: documents.slug,
  contentMd: documents.contentMd,
  fileUrl: documents.fileUrl,
  visibility: documents.visibility,
  categoryId: documents.categoryId,
  authorId: documents.authorId,
  publishedAt: documents.publishedAt,
  createdAt: documents.createdAt,
  updatedAt: documents.updatedAt,
  categoryName: categories.name,
  categorySlug: categories.slug,
};

function documentTextMatch(term: string) {
  return sql`${documents.searchText} ILIKE '%' || documentos.f_unaccent(lower(${term})) || '%'`;
}

function tagNameMatch(term: string) {
  return sql`documentos.f_unaccent(lower(${tags.name})) ILIKE '%' || documentos.f_unaccent(lower(${term})) || '%'`;
}

function matchingTagDocumentIds(tx: AuthenticatedTx, term: string) {
  return tx
    .select({ documentId: documentTags.documentId })
    .from(documentTags)
    .innerJoin(tags, eq(tags.id, documentTags.tagId))
    .where(tagNameMatch(term));
}

export async function searchDocumentsQuery(
  tx: AuthenticatedTx,
  filters: DocumentSearchFilters,
): Promise<DocumentSearchRow[]> {
  const {
    query,
    categoryId,
    visibility,
    tagIds,
    matchTagNames = false,
    editalFilter = "any",
    orderBy = "publishedAt",
    limit = 20,
    offset = 0,
  } = filters;

  const term = query.trim();

  const conditions: (SQLWrapper | undefined)[] = [
    isNull(documents.deletedAt),
    isNotNull(documents.publishedAt),
  ];

  if (term) {
    conditions.push(
      matchTagNames
        ? sql`(${documentTextMatch(term)} OR ${documents.id} IN ${matchingTagDocumentIds(tx, term)})`
        : documentTextMatch(term),
    );
  }

  if (categoryId) conditions.push(eq(documents.categoryId, categoryId));
  if (visibility) conditions.push(eq(documents.visibility, visibility));

  if (tagIds && tagIds.length > 0) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM ${documentTags}
      WHERE ${documentTags.documentId} = ${documents.id}
        AND ${inArray(documentTags.tagId, tagIds)}
    )`);
  }

  if (editalFilter === "only") {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM documentos.editals e WHERE e.id = ${documents.id})`,
    );
  } else if (editalFilter === "exclude") {
    conditions.push(
      sql`NOT EXISTS (SELECT 1 FROM documentos.editals e WHERE e.id = ${documents.id})`,
    );
  }

  const orderColumn =
    orderBy === "updatedAt" ? documents.updatedAt : documents.publishedAt;

  return tx
    .select(SELECTION)
    .from(documents)
    .leftJoin(categories, eq(categories.id, documents.categoryId))
    .where(and(...conditions))
    .orderBy(desc(orderColumn))
    .limit(limit)
    .offset(offset);
}

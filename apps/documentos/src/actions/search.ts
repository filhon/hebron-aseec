"use server";

import { z } from "zod";
import { and, isNull, or, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { categories, documentTags, documents, tags } from "@hebron/db/schema";
import { authenticatedAction } from "../lib/safe-action";

const visibilityEnum = z.enum(["public", "internal", "restricted"]);

// ─── searchDocuments ──────────────────────────────────────────────────────────
// Busca full-text por título, conteúdo Markdown e tags via ILIKE + plainto_tsquery.
// Retorna apenas documentos publicados e não deletados.

export const searchDocuments = authenticatedAction
  .schema(
    z.object({
      query: z.string().min(1).max(200),
      categoryId: z.string().uuid().optional(),
      visibility: visibilityEnum.optional(),
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).default(0),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { query, categoryId, visibility, limit, offset } = parsedInput;
    const pattern = `%${query}%`;

    // Subquery: IDs dos documentos que têm alguma tag correspondente
    const matchingTagDocIds = db
      .select({ documentId: documentTags.documentId })
      .from(documentTags)
      .innerJoin(tags, sql`${tags.id} = ${documentTags.tagId}`)
      .where(sql`${tags.name} ILIKE ${pattern}`);

    const conditions = [
      isNull(documents.deletedAt),
      sql`${documents.publishedAt} IS NOT NULL`,
      or(
        sql`${documents.title} ILIKE ${pattern}`,
        sql`${documents.contentMd} ILIKE ${pattern}`,
        sql`${documents.id} IN ${matchingTagDocIds}`,
      ),
    ];

    if (categoryId) {
      conditions.push(sql`${documents.categoryId} = ${categoryId}::uuid`);
    }
    if (visibility) {
      conditions.push(
        sql`${documents.visibility} = ${visibility}::documentos.visibility`,
      );
    }

    const rows = await db
      .select({
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
      })
      .from(documents)
      .leftJoin(categories, sql`${categories.id} = ${documents.categoryId}`)
      .where(and(...conditions))
      .orderBy(sql`${documents.publishedAt} DESC`)
      .limit(limit)
      .offset(offset);

    return { results: rows, total: rows.length, query };
  });

// ─── searchCategories ─────────────────────────────────────────────────────────

export const searchCategories = authenticatedAction
  .schema(z.object({ query: z.string().min(1).max(100) }))
  .action(async ({ parsedInput }) => {
    const pattern = `%${parsedInput.query}%`;

    const rows = await db
      .select()
      .from(categories)
      .where(sql`${categories.name} ILIKE ${pattern}`)
      .orderBy(categories.name)
      .limit(20);

    return { results: rows };
  });

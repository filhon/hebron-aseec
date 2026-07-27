import { notFound } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  categories,
  documentTags,
  documents,
  editals,
  tags,
} from "@hebron/db/schema";
import type { Category } from "@hebron/types/documentos";
import { EditDocumentClient } from "./_client";
import { requireEditorSession } from "../../../../lib/session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function buildTree(
  rows: Array<{
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    documentCount: number;
  }>,
): Category[] {
  const map = new Map<string, Category>();
  for (const row of rows) {
    map.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: null,
      parentId: row.parentId,
      children: [],
      documentCount: row.documentCount,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  const roots: Category[] = [];
  for (const cat of map.values()) {
    if (cat.parentId !== null) {
      const parent = map.get(cat.parentId);
      if (parent) {
        parent.children.push(cat);
        continue;
      }
    }
    roots.push(cat);
  }
  function sortChildren(cats: Category[]) {
    cats.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    cats.forEach((c) => sortChildren(c.children));
  }
  sortChildren(roots);
  return roots;
}

export default async function EditarDocumentoPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireEditorSession();

  const { row, catRows, tagRows, docTagRows } = await withAuthenticatedContext(
    { actorId: session.actorId },
    async (tx) => {
      const [row] = await tx
        .select({
          id: documents.id,
          title: documents.title,
          contentMd: documents.contentMd,
          fileUrl: documents.fileUrl,
          visibility: documents.visibility,
          categoryId: documents.categoryId,
          isEdital: editals.id,
          editalOpensAt: editals.opensAt,
          editalClosesAt: editals.closesAt,
          editalProjectType: editals.projectType,
          editalFaq: editals.faq,
        })
        .from(documents)
        .leftJoin(editals, eq(editals.id, documents.id))
        .where(and(eq(documents.id, id), isNull(documents.deletedAt)))
        .limit(1);

      if (!row) return { row: null, catRows: [], tagRows: [], docTagRows: [] };

      const [catRows, tagRows, docTagRows] = await Promise.all([
        tx
          .select({
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            parentId: categories.parentId,
            documentCount: sql<number>`count(${documents.id})::int`,
          })
          .from(categories)
          .leftJoin(
            documents,
            and(
              eq(documents.categoryId, categories.id),
              isNull(documents.deletedAt),
            ),
          )
          .groupBy(categories.id)
          .orderBy(categories.name),

        tx
          .select({ id: tags.id, name: tags.name, slug: tags.slug })
          .from(tags)
          .orderBy(tags.name),

        tx
          .select({ tagId: documentTags.tagId })
          .from(documentTags)
          .where(eq(documentTags.documentId, id)),
      ]);

      return { row, catRows, tagRows, docTagRows };
    },
  );

  if (!row) notFound();

  return (
    <EditDocumentClient
      doc={{
        id: row.id,
        title: row.title,
        contentMd: row.contentMd,
        fileUrl: row.fileUrl,
        visibility: row.visibility as "public" | "internal" | "restricted",
        categoryId: row.categoryId,
        tagIds: docTagRows.map((t) => t.tagId),
        isEdital: row.isEdital !== null,
        editalOpensAt: row.editalOpensAt ?? null,
        editalClosesAt: row.editalClosesAt ?? null,
        editalProjectType: row.editalProjectType ?? null,
        editalFaq: row.editalFaq ?? [],
      }}
      categories={buildTree(catRows)}
      availableTags={tagRows.map((t) => ({ ...t, color: null }))}
    />
  );
}

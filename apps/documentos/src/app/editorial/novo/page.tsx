import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { categories, documents, tags } from "@hebron/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Category } from "@hebron/types/documentos";
import { NovoDocumentoClient } from "./_client";
import { requireEditorSession } from "../../../lib/session";

export const dynamic = "force-dynamic";

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

export default async function NovoDocumentoPage() {
  const session = await requireEditorSession();

  const [catRows, tagRows] = await withAuthenticatedContext(
    { actorId: session.actorId },
    (tx) =>
      Promise.all([
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
      ]),
  );

  const tree = buildTree(catRows);
  const availableTags = tagRows.map((t) => ({ ...t, color: null }));

  return (
    <NovoDocumentoClient categories={tree} availableTags={availableTags} />
  );
}

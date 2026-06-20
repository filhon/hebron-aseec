import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { categories, documents } from "@hebron/db/schema";
import { CategoriesManager } from "../../../components/categories-manager";
import type { Category } from "@hebron/types/documentos";

export const dynamic = "force-dynamic";

// ─── buildTree ────────────────────────────────────────────────────────────────

function buildTree(
  rows: Array<{
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    documentCount: number;
    createdAt: Date;
    updatedAt: Date;
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
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
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

  // Sort children alphabetically at each level
  function sortChildren(cats: Category[]) {
    cats.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    cats.forEach((c) => sortChildren(c.children));
  }
  sortChildren(roots);

  return roots;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CategoriasPage() {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      parentId: categories.parentId,
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
      documentCount: sql<number>`count(${documents.id})::int`,
    })
    .from(categories)
    .leftJoin(
      documents,
      and(eq(documents.categoryId, categories.id), isNull(documents.deletedAt)),
    )
    .groupBy(categories.id)
    .orderBy(categories.name);

  const tree = buildTree(rows);

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="docs-breadcrumbs" aria-label="Navegação estrutural">
        <Link href="/editorial">Área editorial</Link>
        <ChevronRight
          size={12}
          className="docs-breadcrumbs-sep"
          aria-hidden="true"
        />
        <span style={{ color: "var(--fg)" }}>Categorias</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <span className="hb-eyebrow">Configuração</span>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            margin: "6px 0 4px",
            color: "var(--fg)",
          }}
        >
          Categorias
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>
          Organize os documentos em categorias hierárquicas.
        </p>
      </div>

      <CategoriesManager initialTree={tree} />
    </div>
  );
}

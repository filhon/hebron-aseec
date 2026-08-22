import type { MetadataRoute } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { categories, documents, editals } from "@hebron/db/schema";

// NEG-011 (PACOTE 11, AUDIT/04-BACKLOG-CORRECAO.md): portal público sem
// sitemap. `withAuthenticatedContext(null, ...)` roda como `anon` — a RLS
// (`documents_select_public`, 0062_documentos_rls_rascunho_lixeira.sql) já
// restringe a documentos publicados, não excluídos e de visibilidade
// "public", sem repetir a regra aqui.
const BASE_URL = "https://docs.hebronaseec.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [documentRows, editalRows, categoryRows] =
    await withAuthenticatedContext(null, async (tx) => {
      const [docs, edts, cats] = await Promise.all([
        tx
          .select({ slug: documents.slug, updatedAt: documents.updatedAt })
          .from(documents)
          .leftJoin(editals, eq(editals.id, documents.id))
          .where(and(isNull(editals.id))),
        tx
          .select({ slug: documents.slug, updatedAt: documents.updatedAt })
          .from(editals)
          .innerJoin(documents, eq(documents.id, editals.id)),
        tx.select({ slug: categories.slug }).from(categories),
      ]);
      return [docs, edts, cats];
    });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/editais`, changeFrequency: "daily", priority: 0.8 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categoryRows.map((c) => ({
    url: `${BASE_URL}/categoria/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const documentRoutes: MetadataRoute.Sitemap = documentRows.map((d) => ({
    url: `${BASE_URL}/${d.slug}`,
    lastModified: d.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const editalRoutes: MetadataRoute.Sitemap = editalRows.map((e) => ({
    url: `${BASE_URL}/editais/${e.slug}`,
    lastModified: e.updatedAt,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...documentRoutes,
    ...editalRoutes,
  ];
}

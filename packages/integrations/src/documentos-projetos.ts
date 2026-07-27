import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { documents, editals } from "@hebron/db/schema";

export * from "./documentos-projetos-client";

// ---------------------------------------------------------------------------
// getEditalPrefill — Documentos → Projetos
//
// Retorna dados do edital para pré-preencher o wizard de criação de projeto.
// Chamada pelo wizard quando recebe ?edital_id=<uuid> na URL.
//
// Integração de leitura: falha degrada para `null` (o wizard some sem
// pré-preenchimento) e o erro é logado de forma estruturada pelo chamador —
// nunca lançar sem contexto para o caller decidir o fallback.
//
// Fica neste arquivo (e não em documentos-projetos-client.ts) porque importa
// `@hebron/db` — um componente "use client" que precisasse só do contrato de
// URL deve importar de "@hebron/integrations/documentos-projetos-client"
// para não puxar o driver Postgres para o bundle do navegador.
// ---------------------------------------------------------------------------

export type EditalPrefill = {
  editalId: string;
  editalTitle: string;
  /** Ciclo do edital — computado de opensAt/closesAt, igual à página pública do edital. */
  ciclo: "anual" | "pontual";
  /** Tipo de projeto do edital (missionário, educacional...) — só exibição. */
  tipo: string | null;
  /** Slug de projetos.categories, já pronto para pré-selecionar o wizard. */
  categoria: string | null;
  closesAt: Date | null;
};

export async function getEditalPrefill(
  editalId: string,
): Promise<EditalPrefill | null> {
  const [row] = await db
    .select({
      id: editals.id,
      title: documents.title,
      projectType: editals.projectType,
      projectCategorySlug: editals.projectCategorySlug,
      opensAt: editals.opensAt,
      closesAt: editals.closesAt,
    })
    .from(editals)
    .innerJoin(documents, eq(documents.id, editals.id))
    .where(eq(editals.id, editalId))
    .limit(1);

  if (!row) return null;

  return {
    editalId: row.id,
    editalTitle: row.title,
    ciclo: !row.opensAt && !row.closesAt ? "pontual" : "anual",
    tipo: row.projectType,
    categoria: row.projectCategorySlug,
    closesAt: row.closesAt ?? null,
  };
}

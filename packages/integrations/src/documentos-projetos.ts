import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { documents, editals } from "@hebron/db/schema";

// ---------------------------------------------------------------------------
// getEditalPrefill — Documentos → Projetos
//
// Retorna dados do edital para pré-preencher o wizard de criação de projeto.
// Chamada pelo wizard quando recebe ?editalId=<uuid> na URL.
//
// Integração de leitura: falha degrada para `null` (o wizard some sem
// pré-preenchimento) e o erro é logado de forma estruturada pelo chamador —
// nunca lançar sem contexto para o caller decidir o fallback.
// ---------------------------------------------------------------------------

export type EditalPrefill = {
  editalId: string;
  editalTitle: string;
  tipo: "pontual" | "anual" | null;
  projectCategoryId: string | null;
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
      projectCategoryId: editals.projectCategoryId,
      closesAt: editals.closesAt,
    })
    .from(editals)
    .innerJoin(documents, eq(documents.id, editals.id))
    .where(eq(editals.id, editalId))
    .limit(1);

  if (!row) return null;

  const tipo = row.projectType as "pontual" | "anual" | null;

  return {
    editalId: row.id,
    editalTitle: row.title,
    tipo: tipo ?? null,
    // projectCategoryId referencia documentos.categories; o wizard usa
    // projetos.projectCategories — o mapeamento é feito pelo componente
    // com base no slug da categoria quando o módulo financeiro estiver completo.
    projectCategoryId: row.projectCategoryId,
    closesAt: row.closesAt ?? null,
  };
}

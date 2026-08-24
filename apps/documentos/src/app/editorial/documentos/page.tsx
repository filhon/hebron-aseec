import Link from "next/link";
import { ChevronRight, FileText, Plus } from "lucide-react";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  documents,
  categories,
  editals,
  views,
  viewsMonthlyAgg,
} from "@hebron/db/schema";
import { and, desc, eq, isNull, isNotNull, inArray, sql } from "drizzle-orm";
import { DocumentRowActions } from "../../../components/document-row-actions";
import { VisibilityBadge } from "../../../components/visibility-badge";
import {
  requireEditorSession,
  hasDocumentWriteRole,
} from "../../../lib/session";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function EditorialDocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const session = await requireEditorSession();
  const canWrite = hasDocumentWriteRole(session.roles);

  const { filtro } = await searchParams;
  const showRemovidos = canWrite && filtro === "removidos";

  const { rows, readCounts } = await withAuthenticatedContext(
    { actorId: session.actorId },
    async (tx) => {
      const rows = await tx
        .select({
          id: documents.id,
          title: documents.title,
          visibility: documents.visibility,
          categoryName: categories.name,
          publishedAt: documents.publishedAt,
          deletedAt: documents.deletedAt,
          updatedAt: documents.updatedAt,
        })
        .from(documents)
        .leftJoin(categories, eq(categories.id, documents.categoryId))
        .leftJoin(editals, eq(editals.id, documents.id))
        .where(
          and(
            showRemovidos
              ? isNotNull(documents.deletedAt)
              : isNull(documents.deletedAt),
            isNull(editals.id),
          ),
        )
        .orderBy(desc(documents.updatedAt));

      // Total de leituras por documento: views (< 6 meses) + views_monthly_agg
      // (agregado retido após a purga mensal) — mesmo critério do painel
      // editorial (P-1.20c).
      const rowIds = rows.map((r) => r.id);
      const readCounts = new Map<string, number>();
      if (rowIds.length > 0) {
        const [rawCounts, aggCounts] = await Promise.all([
          tx
            .select({
              documentId: views.documentId,
              n: sql<number>`count(*)::int`,
            })
            .from(views)
            .where(inArray(views.documentId, rowIds))
            .groupBy(views.documentId),
          tx
            .select({
              documentId: viewsMonthlyAgg.documentId,
              n: sql<number>`coalesce(sum(${viewsMonthlyAgg.viewCount}), 0)::int`,
            })
            .from(viewsMonthlyAgg)
            .where(inArray(viewsMonthlyAgg.documentId, rowIds))
            .groupBy(viewsMonthlyAgg.documentId),
        ]);
        for (const row of rawCounts) {
          readCounts.set(
            row.documentId,
            (readCounts.get(row.documentId) ?? 0) + row.n,
          );
        }
        for (const row of aggCounts) {
          readCounts.set(
            row.documentId,
            (readCounts.get(row.documentId) ?? 0) + row.n,
          );
        }
      }

      return { rows, readCounts };
    },
  );

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
        <span style={{ color: "var(--fg)" }}>Documentos</span>
      </nav>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span className="hb-eyebrow">Conteúdo</span>
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
            Documentos
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>
            {showRemovidos
              ? `${rows.length} documento${rows.length === 1 ? "" : "s"} removido${rows.length === 1 ? "" : "s"}.`
              : `${rows.length} documento${rows.length === 1 ? "" : "s"} (exclui editais, listados separadamente).`}
          </p>
        </div>

        {canWrite && (
          <Link href="/editorial/novo" className="hb-btn hb-btn-primary">
            <Plus size={15} aria-hidden="true" />
            Novo documento
          </Link>
        )}
      </div>

      {canWrite && (
        <div
          className="hb-tabs"
          role="tablist"
          aria-label="Filtro de documentos"
        >
          <Link
            href="/editorial/documentos"
            role="tab"
            aria-selected={!showRemovidos}
            className={`hb-tab${!showRemovidos ? " active" : ""}`}
          >
            Ativos
          </Link>
          <Link
            href="/editorial/documentos?filtro=removidos"
            role="tab"
            aria-selected={showRemovidos}
            className={`hb-tab${showRemovidos ? " active" : ""}`}
          >
            Removidos
          </Link>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="hb-empty" style={{ padding: "40px 20px" }}>
          <div className="hb-empty-icon">
            <FileText size={24} aria-hidden="true" />
          </div>
          <b>
            {showRemovidos
              ? "Nenhum documento removido"
              : "Nenhum documento ainda"}
          </b>
          <p className="hb-empty-body">
            {showRemovidos
              ? "Documentos removidos aparecem aqui e podem ser restaurados."
              : canWrite
                ? "Crie o primeiro documento da área editorial."
                : "Os documentos da área editorial aparecem aqui."}
          </p>
        </div>
      ) : (
        <div className="hb-card hb-card-overflow">
          <table className="hb-tbl">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Categoria</th>
                <th>Visibilidade</th>
                <th>Status</th>
                <th>Leituras</th>
                <th>Atualizado</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: 13.5,
                        color: "var(--brand)",
                      }}
                    >
                      {doc.title}
                    </div>
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                    {doc.categoryName ?? "—"}
                  </td>
                  <td>
                    <VisibilityBadge
                      visibility={doc.visibility}
                      withIcon={false}
                    />
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                    {doc.deletedAt
                      ? "Removido"
                      : doc.publishedAt
                        ? "Publicado"
                        : "Rascunho"}
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                    {readCounts.get(doc.id) ?? 0}
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                    {formatDate(doc.updatedAt)}
                  </td>
                  <td>
                    <DocumentRowActions
                      id={doc.id}
                      isPublished={!!doc.publishedAt}
                      isEdital={false}
                      isDeleted={!!doc.deletedAt}
                      canWrite={canWrite}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

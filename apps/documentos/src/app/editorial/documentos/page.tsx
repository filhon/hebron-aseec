import Link from "next/link";
import { ChevronRight, FileText, Plus } from "lucide-react";
import { db } from "@hebron/db/client";
import { documents, categories, editals } from "@hebron/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { DocumentRowActions } from "../../../components/document-row-actions";
import { VisibilityBadge } from "../../../components/visibility-badge";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function EditorialDocumentosPage() {
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      visibility: documents.visibility,
      categoryName: categories.name,
      publishedAt: documents.publishedAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .leftJoin(categories, eq(categories.id, documents.categoryId))
    .leftJoin(editals, eq(editals.id, documents.id))
    .where(and(isNull(documents.deletedAt), isNull(editals.id)))
    .orderBy(desc(documents.updatedAt));

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
            {rows.length} documento{rows.length === 1 ? "" : "s"} (exclui
            editais, listados separadamente).
          </p>
        </div>

        <Link href="/editorial/novo" className="hb-btn hb-btn-primary">
          <Plus size={15} aria-hidden="true" />
          Novo documento
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="hb-empty" style={{ padding: "40px 20px" }}>
          <div className="hb-empty-icon">
            <FileText size={24} aria-hidden="true" />
          </div>
          <b>Nenhum documento ainda</b>
          <p className="hb-empty-body">
            Crie o primeiro documento da área editorial.
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
                    {doc.publishedAt ? "Publicado" : "Rascunho"}
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                    {formatDate(doc.updatedAt)}
                  </td>
                  <td>
                    <DocumentRowActions
                      id={doc.id}
                      isPublished={!!doc.publishedAt}
                      isEdital={false}
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

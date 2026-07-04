import Link from "next/link";
import { ChevronRight, Scroll, Plus } from "lucide-react";
import { db } from "@hebron/db/client";
import { documents, categories, editals } from "@hebron/db/schema";
import { desc, eq, isNull } from "drizzle-orm";
import { DocumentRowActions } from "../../../components/document-row-actions";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getStatus(e: {
  opensAt: Date | null;
  closesAt: Date | null;
  publishedAt: Date | null;
}): { label: string; color: string } {
  if (!e.publishedAt) return { label: "Rascunho", color: "var(--fg-muted)" };
  if (!e.opensAt && !e.closesAt)
    return { label: "Permanente", color: "var(--hb-cyan)" };
  const now = new Date();
  if (e.opensAt && now < new Date(e.opensAt))
    return { label: "Em breve", color: "var(--hb-orange)" };
  if (e.closesAt && now > new Date(e.closesAt))
    return { label: "Encerrado", color: "var(--hb-red)" };
  return { label: "Aberto", color: "var(--hb-green)" };
}

export default async function EditorialEditaisPage() {
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      categoryName: categories.name,
      publishedAt: documents.publishedAt,
      opensAt: editals.opensAt,
      closesAt: editals.closesAt,
      updatedAt: documents.updatedAt,
    })
    .from(editals)
    .innerJoin(documents, eq(editals.id, documents.id))
    .leftJoin(categories, eq(categories.id, documents.categoryId))
    .where(isNull(documents.deletedAt))
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
        <span style={{ color: "var(--fg)" }}>Editais</span>
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
            Editais
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>
            {rows.length} edital{rows.length === 1 ? "" : "is"} cadastrado
            {rows.length === 1 ? "" : "s"}.
          </p>
        </div>

        <Link href="/editorial/novo" className="hb-btn hb-btn-primary">
          <Plus size={15} aria-hidden="true" />
          Novo edital
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="hb-empty" style={{ padding: "40px 20px" }}>
          <div className="hb-empty-icon">
            <Scroll size={24} aria-hidden="true" />
          </div>
          <b>Nenhum edital ainda</b>
          <p className="hb-empty-body">Crie o primeiro edital.</p>
        </div>
      ) : (
        <div className="hb-card hb-card-overflow">
          <table className="hb-tbl">
            <thead>
              <tr>
                <th>Edital</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Encerramento</th>
                <th>Atualizado</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = getStatus(row);
                return (
                  <tr key={row.id}>
                    <td>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 600,
                          fontSize: 13.5,
                          color: "var(--brand)",
                        }}
                      >
                        {row.title}
                      </div>
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                      {row.categoryName ?? "—"}
                    </td>
                    <td>
                      <span
                        className="hb-badge"
                        style={{
                          background: `color-mix(in srgb, ${status.color} 14%, transparent)`,
                          color: status.color,
                        }}
                      >
                        <span
                          className="hb-badge-dot"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                      {formatDate(row.closesAt)}
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                      {formatDate(row.updatedAt)}
                    </td>
                    <td>
                      <DocumentRowActions
                        id={row.id}
                        isPublished={!!row.publishedAt}
                        isEdital={true}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

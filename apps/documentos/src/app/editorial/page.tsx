import Link from "next/link";
import {
  Plus,
  Upload,
  TrendingUp,
  Eye,
  Scroll,
  Edit,
  Clock,
} from "lucide-react";
import { db } from "@hebron/db/client";
import {
  documents,
  editals,
  categories,
  views,
  subscriptions,
  documentVersions,
} from "@hebron/db/schema";
import { and, eq, isNull, isNotNull, desc, sql, gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getEditalStatus(e: {
  editalOpensAt: Date | null;
  editalClosesAt: Date | null;
}): "open" | "closed" | "permanent" | "upcoming" {
  if (!e.editalOpensAt && !e.editalClosesAt) return "permanent";
  const now = new Date();
  if (e.editalOpensAt && now < new Date(e.editalOpensAt)) return "upcoming";
  if (e.editalClosesAt && now > new Date(e.editalClosesAt)) return "closed";
  return "open";
}

const VISIBILITY_LABEL: Record<string, string> = {
  public: "Público",
  internal: "Interno",
  restricted: "Restrito",
};

const VISIBILITY_CLS: Record<string, string> = {
  public: "bg-(--hb-green-muted) text-(--hb-green-fg)",
  internal: "bg-(--hb-cyan-muted) text-(--hb-cyan-fg)",
  restricted: "bg-(--color-destructive-muted) text-(--hb-red)",
};

const STATUS_COLOR: Record<string, string> = {
  open: "var(--hb-green)",
  closed: "var(--hb-red)",
  permanent: "var(--hb-cyan)",
  upcoming: "var(--hb-orange)",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  closed: "Encerrado",
  permanent: "Permanente",
  upcoming: "Em breve",
};

export default async function EditorialDashboardPage() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    [totalRow],
    [openEditaisRow],
    [viewsRow],
    [subscriptionsRow],
    recentlyUpdated,
    activeEditais,
    draftQueue,
  ] = await Promise.all([
    // Total published documents
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(documents)
      .where(
        and(isNull(documents.deletedAt), isNotNull(documents.publishedAt)),
      ),

    // Open editals count
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(editals)
      .innerJoin(documents, eq(editals.id, documents.id))
      .where(
        and(isNull(documents.deletedAt), isNotNull(documents.publishedAt)),
      ),

    // Views in last 30 days
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(views)
      .where(gt(views.viewedAt, thirtyDaysAgo)),

    // Active subscriptions
    db.select({ n: sql<number>`count(*)::int` }).from(subscriptions),

    // Recently updated documents (incl. editals)
    db
      .select({
        id: documents.id,
        title: documents.title,
        slug: documents.slug,
        visibility: documents.visibility,
        categoryName: categories.name,
        updatedAt: documents.updatedAt,
        publishedAt: documents.publishedAt,
        isEdital: sql<boolean>`${editals.id} IS NOT NULL`,
        editalOpensAt: editals.opensAt,
        editalClosesAt: editals.closesAt,
        versionNumber: sql<number | null>`(
          SELECT MAX(${documentVersions.versionNumber})
          FROM ${documentVersions}
          WHERE ${documentVersions.documentId} = ${documents.id}
        )`,
      })
      .from(documents)
      .leftJoin(categories, eq(categories.id, documents.categoryId))
      .leftJoin(editals, eq(editals.id, documents.id))
      .where(isNull(documents.deletedAt))
      .orderBy(desc(documents.updatedAt))
      .limit(8),

    // Active editais for pipeline
    db
      .select({
        id: documents.id,
        title: documents.title,
        editalOpensAt: editals.opensAt,
        editalClosesAt: editals.closesAt,
      })
      .from(editals)
      .innerJoin(documents, eq(editals.id, documents.id))
      .where(and(isNull(documents.deletedAt), isNotNull(documents.publishedAt)))
      .orderBy(desc(documents.updatedAt))
      .limit(5),

    // Draft queue (unpublished, non-deleted)
    db
      .select({
        id: documents.id,
        title: documents.title,
        categoryName: categories.name,
        authorId: documents.authorId,
        createdAt: documents.createdAt,
        isEdital: sql<boolean>`${editals.id} IS NOT NULL`,
      })
      .from(documents)
      .leftJoin(categories, eq(categories.id, documents.categoryId))
      .leftJoin(editals, eq(editals.id, documents.id))
      .where(and(isNull(documents.deletedAt), isNull(documents.publishedAt)))
      .orderBy(desc(documents.createdAt))
      .limit(5),
  ]);

  const totalDocs = totalRow?.n ?? 0;
  const openEditaisCount = openEditaisRow?.n ?? 0;
  const viewCount = viewsRow?.n ?? 0;
  const subscriptionCount = subscriptionsRow?.n ?? 0;

  const kpis = [
    {
      label: "Total publicado",
      value: totalDocs,
      delta: `${activeEditais.length} editais ativos`,
      up: true,
      color: "var(--hb-blue)",
    },
    {
      label: "Editais abertos",
      value: openEditaisCount,
      delta: `${activeEditais.length} total no sistema`,
      up: false,
      color: "var(--hb-orange)",
    },
    {
      label: "Visualizações (30 dias)",
      value:
        viewCount >= 1000
          ? `${(viewCount / 1000).toFixed(1)}k`
          : String(viewCount),
      delta: "Analytics do período",
      up: true,
      color: "var(--hb-cyan)",
    },
    {
      label: "Assinaturas ativas",
      value: subscriptionCount,
      delta: `${draftQueue.length} rascunhos pendentes`,
      up: true,
      color: "var(--hb-green)",
    },
  ];

  return (
    <div>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span className="hb-eyebrow">Área editorial</span>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              margin: "6px 0 4px",
              color: "var(--fg)",
            }}
          >
            Painel da equipe editorial
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--fg-muted)" }}>
            Publicações, edição e versionamento. Apenas super_admins e editores
            designados acessam esta área.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="hb-btn hb-btn-ghost hb-btn-sm">
            <Upload size={14} aria-hidden="true" />
            Importar PDF
          </button>
          <Link href="/editorial/novo" className="hb-btn hb-btn-primary">
            <Plus size={15} aria-hidden="true" />
            Novo documento
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="docs-kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="hb-stat">
            <div
              className="hb-stat-dot"
              style={{ background: kpi.color }}
              aria-hidden="true"
            />
            <div className="hb-stat-label">{kpi.label}</div>
            <div className="hb-stat-value">{kpi.value}</div>
            <div className={`hb-stat-trend ${kpi.up ? "up" : ""}`}>
              {kpi.up && <TrendingUp size={12} aria-hidden="true" />}
              {kpi.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* Recently updated table */}
        <section>
          <div className="hb-card hb-card-overflow">
            <div className="hb-card-header">
              <Eye
                size={16}
                style={{ color: "var(--brand)" }}
                aria-hidden="true"
              />
              <h3>Últimas atualizações</h3>
            </div>

            {recentlyUpdated.length === 0 ? (
              <div className="hb-empty" style={{ padding: "32px 20px" }}>
                <b>Nenhum documento ainda</b>
                <p className="hb-empty-body">
                  Crie o primeiro documento da área editorial.
                </p>
                <Link
                  href="/editorial/novo"
                  className="hb-btn hb-btn-primary"
                  style={{ marginTop: 12 }}
                >
                  <Plus size={13} aria-hidden="true" />
                  Criar documento
                </Link>
              </div>
            ) : (
              <table className="hb-tbl">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Categoria</th>
                    <th>Visibilidade</th>
                    <th>Versão</th>
                    <th>Atualizado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentlyUpdated.map((doc) => (
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
                        {doc.isEdital && (
                          <span
                            style={{
                              fontSize: 10,
                              background: "rgba(234,90,6,0.12)",
                              color: "var(--hb-orange)",
                              padding: "1px 5px",
                              borderRadius: 3,
                              display: "inline-block",
                              marginTop: 2,
                            }}
                          >
                            edital
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                        {doc.categoryName ?? "—"}
                      </td>
                      <td>
                        <span
                          className={`hb-badge ${VISIBILITY_CLS[doc.visibility] ?? ""}`}
                        >
                          {VISIBILITY_LABEL[doc.visibility] ?? doc.visibility}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--fg-muted)",
                          }}
                        >
                          v{doc.versionNumber ?? 1}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                        {formatDate(doc.updatedAt)}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Link
                            href={`/editorial/${doc.id}/editar`}
                            className="hb-btn hb-btn-ghost hb-btn-xs"
                            title="Editar"
                          >
                            <Edit size={13} aria-hidden="true" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Side stack */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Active editais */}
          <div className="hb-card" style={{ padding: "20px 22px" }}>
            <span className="hb-eyebrow">Editais ativos</span>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 700,
                margin: "4px 0 16px",
              }}
            >
              Estado da pipeline
            </h3>

            {activeEditais.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--fg-muted)", margin: 0 }}>
                Nenhum edital publicado.
              </p>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {activeEditais.map((e) => {
                  const s = getEditalStatus(e);
                  return (
                    <div
                      key={e.id}
                      style={{
                        padding: "12px 14px",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <span
                          className="hb-badge"
                          style={{
                            background: `color-mix(in srgb, ${STATUS_COLOR[s]} 14%, transparent)`,
                            color: STATUS_COLOR[s],
                            fontSize: 11,
                          }}
                        >
                          <span
                            className="hb-badge-dot"
                            style={{ backgroundColor: STATUS_COLOR[s] }}
                          />
                          {STATUS_LABEL[s]}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 14,
                          fontWeight: 700,
                          letterSpacing: "-0.01em",
                          lineHeight: 1.25,
                        }}
                      >
                        {e.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Review queue */}
          <div className="hb-card" style={{ padding: "20px 22px" }}>
            <span className="hb-eyebrow">Fila de revisão</span>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 700,
                margin: "4px 0 14px",
              }}
            >
              Aguardando publicação
            </h3>

            {draftQueue.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--fg-muted)", margin: 0 }}>
                Nenhum rascunho na fila. Tudo em dia.
              </p>
            ) : (
              draftQueue.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--divider)",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background: item.isEdital
                        ? "rgba(234,90,6,0.12)"
                        : "rgba(7,180,231,0.12)",
                      color: item.isEdital
                        ? "var(--hb-orange)"
                        : "var(--hb-cyan)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Clock size={15} aria-hidden="true" />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13.5,
                        color: "var(--fg)",
                        lineHeight: 1.3,
                      }}
                    >
                      {item.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                      Rascunho · {item.categoryName ?? "sem categoria"}
                    </div>
                  </div>
                  <Link
                    href={`/editorial/${item.id}/editar`}
                    className="hb-btn hb-btn-ghost hb-btn-xs"
                  >
                    <Scroll size={12} aria-hidden="true" />
                    Abrir
                  </Link>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ChevronRight, Bell, Mail } from "lucide-react";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { categories, subscriptions, users } from "@hebron/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireEditorSession } from "../../../lib/session";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function EditorialAssinaturasPage() {
  const session = await requireEditorSession();

  const [perCategory, recent] = await withAuthenticatedContext(
    { actorId: session.actorId },
    (tx) =>
      Promise.all([
        tx
          .select({
            categoryId: categories.id,
            categoryName: categories.name,
            count: sql<number>`count(${subscriptions.id})::int`,
          })
          .from(categories)
          .leftJoin(subscriptions, eq(subscriptions.categoryId, categories.id))
          .groupBy(categories.id)
          .orderBy(categories.name),

        tx
          .select({
            id: subscriptions.id,
            userName: users.fullName,
            userEmail: users.email,
            categoryName: categories.name,
            createdAt: subscriptions.createdAt,
          })
          .from(subscriptions)
          .innerJoin(users, eq(users.id, subscriptions.userId))
          .innerJoin(categories, eq(categories.id, subscriptions.categoryId))
          .orderBy(desc(subscriptions.createdAt))
          .limit(20),
      ]),
  );

  const total = perCategory.reduce((sum, c) => sum + c.count, 0);

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
        <span style={{ color: "var(--fg)" }}>Assinaturas</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <span className="hb-eyebrow">Sistema</span>
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
          Assinaturas
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>
          {total} assinatura{total === 1 ? "" : "s"} ativa
          {total === 1 ? "" : "s"} em {perCategory.length} categoria
          {perCategory.length === 1 ? "" : "s"}.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* Per-category counts */}
        <div className="hb-card" style={{ padding: "20px 22px" }}>
          <p className="hb-section-label" style={{ marginBottom: 14 }}>
            Por categoria
          </p>
          {perCategory.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--fg-muted)", margin: 0 }}>
              Nenhuma categoria cadastrada.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {perCategory.map((c) => (
                <div
                  key={c.categoryId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 0",
                    borderBottom: "1px solid var(--divider)",
                    fontSize: 13.5,
                  }}
                >
                  <span style={{ color: "var(--fg)" }}>{c.categoryName}</span>
                  <span
                    className="hb-badge"
                    style={{
                      background: "var(--bg-alt)",
                      color: "var(--fg-muted)",
                    }}
                  >
                    <Bell size={10} aria-hidden="true" />
                    {c.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent subscriptions */}
        <div className="hb-card hb-card-overflow">
          <div className="hb-card-header">
            <Mail
              size={16}
              style={{ color: "var(--brand)" }}
              aria-hidden="true"
            />
            <h3>Assinaturas recentes</h3>
          </div>

          {recent.length === 0 ? (
            <div className="hb-empty" style={{ padding: "32px 20px" }}>
              <b>Nenhuma assinatura ainda</b>
              <p className="hb-empty-body">
                Assinaturas por categoria aparecem aqui assim que alguém se
                inscrever em <Link href="/assinaturas">/assinaturas</Link>.
              </p>
            </div>
          ) : (
            <table className="hb-tbl">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Categoria</th>
                  <th>Desde</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 500, color: "var(--fg)" }}>
                        {r.userName ?? r.userEmail}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>
                        {r.userEmail}
                      </div>
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                      {r.categoryName}
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                      {formatDate(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

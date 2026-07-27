import Link from "next/link";
import { ChevronRight, ShieldAlert } from "lucide-react";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { auditLog, users } from "@hebron/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { requireEditorSession } from "../../../lib/session";

export const dynamic = "force-dynamic";

const DOCUMENTOS_ENTITIES = ["document", "edital", "category"] as const;

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function EditorialAuditoriaPage() {
  const session = await requireEditorSession();

  // admin.audit_log só tem policy de SELECT para super_admin (0003_admin_rls.sql)
  // — não existe policy que alcance diretor/conselheiro/colaborador, que ainda
  // assim navegam a área editorial (EDITOR_ROLES). Usa withSystemRole,
  // explicitamente, porque a regra de visibilidade aqui é própria do audit
  // trail, não da RLS de documentos.* (P-1.21b, item 2 do escopo).
  const entries = await withAuthenticatedContext(
    { actorId: session.actorId },
    (tx) =>
      withSystemRole(tx, (sysTx) =>
        sysTx
          .select({
            id: auditLog.id,
            action: auditLog.action,
            actorName: users.fullName,
            entity: auditLog.entity,
            entityId: auditLog.entityId,
            createdAt: auditLog.createdAt,
          })
          .from(auditLog)
          .innerJoin(users, eq(auditLog.actorId, users.id))
          .where(inArray(auditLog.entity, [...DOCUMENTOS_ENTITIES]))
          .orderBy(desc(auditLog.createdAt))
          .limit(200),
      ),
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
        <span style={{ color: "var(--fg)" }}>Auditoria</span>
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
          Auditoria
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>
          Mutações em documentos, editais e categorias. Trilha imutável,
          particionada por mês em <code>admin.audit_log</code>.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="hb-card">
          <div className="hb-empty">
            <div className="hb-empty-icon">
              <ShieldAlert size={22} aria-hidden="true" />
            </div>
            <b>Nenhum registro de auditoria encontrado</b>
          </div>
        </div>
      ) : (
        <div className="hb-card hb-card-overflow">
          <table className="hb-tbl">
            <thead>
              <tr>
                <th style={{ width: 150 }}>Quando</th>
                <th>Ator</th>
                <th>Ação</th>
                <th>Entidade</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                    {formatDateTime(entry.createdAt)}
                  </td>
                  <td style={{ fontSize: 13.5, fontWeight: 500 }}>
                    {entry.actorName ?? "—"}
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: "ui-monospace,monospace",
                        fontSize: 11.5,
                        background: "var(--bg-alt)",
                        padding: "2px 8px",
                        borderRadius: 6,
                        display: "inline-block",
                      }}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: "var(--fg-muted)" }}>
                    {entry.entity}
                    {entry.entityId && (
                      <span
                        style={{
                          fontFamily: "ui-monospace,monospace",
                          fontSize: 11,
                          color: "var(--fg-subtle)",
                          marginLeft: 6,
                        }}
                      >
                        {entry.entityId.slice(0, 8)}…
                      </span>
                    )}
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

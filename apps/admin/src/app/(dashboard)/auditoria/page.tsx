import { Suspense } from "react";
import { db } from "@hebron/db/client";
import { eq, desc, count, sql } from "drizzle-orm";
import { users } from "@hebron/db/schema";
import { auditLog } from "@hebron/db/schema";
import { Download, ShieldAlert, FileText, RotateCcw } from "lucide-react";
import { ErrorState, Button } from "@hebron/ui";

// ─── DB ───────────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffMin < 2) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffH < 24) return `há ${diffH}h`;
  if (diffD === 1) return "ontem";
  return `há ${diffD} dias`;
}

function isImpersonation(action: string): boolean {
  return action.startsWith("user.impersonated");
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCardSmall({
  label,
  value,
  dot,
}: {
  label: string;
  value: string | number;
  dot: string;
}) {
  return (
    <div className="hb-stat" style={{ padding: "16px 18px" }}>
      <div
        className="hb-stat-dot"
        style={{ background: dot, width: 48, height: 48 }}
      />
      <div className="hb-stat-label" style={{ fontSize: 11.5 }}>
        {label}
      </div>
      <div className="hb-stat-value" style={{ fontSize: 30 }}>
        {value}
      </div>
    </div>
  );
}

// ─── Audit Content ────────────────────────────────────────────────────────────

async function AuditContent() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [entries, statsRows] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        actorId: auditLog.actorId,
        actorName: users.fullName,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        diff: auditLog.diff,
        ip: auditLog.ip,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .innerJoin(users, eq(auditLog.actorId, users.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(200),

    db
      .select({
        total: count(),
        todayCount: sql<number>`count(case when ${auditLog.createdAt} >= ${todayStart.toISOString()}::timestamptz then 1 end)::int`,
        impersonations: sql<number>`count(case when ${auditLog.action} = 'user.impersonated' then 1 end)::int`,
      })
      .from(auditLog),
  ]);

  const stats = statsRows[0] ?? { total: 0, todayCount: 0, impersonations: 0 };

  if (entries.length === 0) {
    return (
      <div className="hb-card">
        <div className="hb-empty">
          <div className="hb-empty-icon">
            <ShieldAlert size={22} aria-hidden="true" />
          </div>
          <b>Nenhum registro de auditoria encontrado.</b>
          <div className="hb-empty-quote">
            "Não há nada oculto que não venha a ser revelado"
            <cite className="hb-empty-cite">— Lucas 8:17</cite>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Stats */}
      <div className="hb-grid hb-grid-4" style={{ marginBottom: 22 }}>
        <StatCardSmall
          label="Eventos hoje"
          value={stats.todayCount ?? 0}
          dot="#202c85"
        />
        <StatCardSmall
          label="Total de eventos"
          value={stats.total}
          dot="#07b4e7"
        />
        <StatCardSmall
          label="Impersonações"
          value={stats.impersonations ?? 0}
          dot="#ea5a06"
        />
        <StatCardSmall label="Falhas de login" value="—" dot="#a1c520" />
      </div>

      {/* Table */}
      <div className="hb-card" style={{ overflow: "hidden" }}>
        <table className="hb-tbl" aria-label="Trilha de auditoria">
          <thead>
            <tr>
              <th style={{ width: 150 }}>Quando</th>
              <th>Ator</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th style={{ width: 120 }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const imp = isImpersonation(entry.action);
              return (
                <tr key={entry.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 13, color: "#131737" }}>
                      {formatDateTime(entry.createdAt)}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}
                    >
                      {formatRelative(entry.createdAt)}
                    </div>
                  </td>
                  <td
                    style={{
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: "#131737",
                    }}
                  >
                    {entry.actorName ?? "—"}
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: "ui-monospace,monospace",
                        fontSize: 11.5,
                        background: imp ? "rgba(234,90,6,0.12)" : "#f7f8fc",
                        color: imp ? "#c24a03" : "#131737",
                        padding: "2px 8px",
                        borderRadius: 6,
                        display: "inline-block",
                      }}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td
                    style={{
                      fontSize: 13,
                      color: imp ? "#7a2614" : "#131737",
                      maxWidth: 360,
                    }}
                  >
                    <span style={{ color: "#6b7280" }}>{entry.entity}</span>
                    {entry.entityId && (
                      <span
                        style={{
                          fontFamily: "ui-monospace,monospace",
                          fontSize: 11,
                          color: "#b7bdd0",
                          marginLeft: 6,
                        }}
                      >
                        {entry.entityId.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      fontFamily: "ui-monospace,monospace",
                      fontSize: 11.5,
                      color: "#6b7280",
                    }}
                  >
                    {entry.ip ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div
        style={{
          marginTop: 16,
          fontSize: 12,
          color: "#6b7280",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <ShieldAlert size={13} aria-hidden="true" />A trilha é imutável — apenas{" "}
        <b>super_admin</b> pode visualizar. Particionada por mês em{" "}
        <code style={{ fontFamily: "ui-monospace,monospace", fontSize: 11 }}>
          admin.audit_log
        </code>
        .
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;

  return (
    <div className="hb-page">
      {/* Header */}
      <div className="hb-page-header">
        <div className="hb-page-header-meta">
          <div className="hb-eyebrow">Trilha imutável · LGPD compliant</div>
          <h1 className="hb-page-title">Auditoria</h1>
          <p className="hb-page-subtitle">
            Toda mutação no ecossistema é registrada com ator, ação, entidade e
            IP. Particionado por mês — imutável por design.
          </p>
        </div>
        <div className="hb-page-header-actions">
          <button className="hb-btn hb-btn-ghost hb-btn-sm" type="button">
            <FileText size={14} aria-hidden="true" />
            JSON
          </button>
          <button className="hb-btn hb-btn-secondary hb-btn-sm" type="button">
            <Download size={14} aria-hidden="true" />
            Exportar CSV
          </button>
        </div>
      </div>

      {state === "error" ? (
        <ErrorState
          title="Não foi possível carregar o registro de auditoria"
          description="Verifique sua conexão e tente novamente."
          action={
            <form method="get">
              <Button
                type="submit"
                leftIcon={<RotateCcw size={14} aria-hidden="true" />}
              >
                Tentar novamente
              </Button>
            </form>
          }
        />
      ) : (
        <Suspense
          fallback={
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 56,
                    borderRadius: 14,
                    background: "#eef0f6",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          }
        >
          <AuditContent />
        </Suspense>
      )}
    </div>
  );
}

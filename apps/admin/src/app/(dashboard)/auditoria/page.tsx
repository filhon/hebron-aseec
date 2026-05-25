import { Suspense } from "react";
import { Download, ShieldAlert, FileText, RotateCcw } from "lucide-react";
import { mockAuditLog } from "../../../lib/mock-data";
import { ErrorState, Button } from "@hebron/ui";

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
  const now = new Date("2026-05-23T10:00:00Z");
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

// ─── Stat Card Small ──────────────────────────────────────────────────────────

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
  const entries = [...mockAuditLog].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const today = new Date("2026-05-23T00:00:00Z");
  const todayCount = entries.filter((e) => e.createdAt >= today).length;
  const impersonations = entries.filter((e) =>
    isImpersonation(e.action),
  ).length;

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
        <StatCardSmall label="Eventos hoje" value={todayCount} dot="#202c85" />
        <StatCardSmall
          label="Total de eventos"
          value={entries.length}
          dot="#07b4e7"
        />
        <StatCardSmall
          label="Impersonações"
          value={impersonations}
          dot="#ea5a06"
        />
        <StatCardSmall label="Falhas de login" value="0" dot="#a1c520" />
      </div>

      {/* Table */}
      <div className="hb-card" style={{ overflow: "hidden" }}>
        <table className="hb-tbl" aria-label="Trilha de auditoria">
          <thead>
            <tr>
              <th style={{ width: 150 }}>Quando</th>
              <th>Ator</th>
              <th>Ação</th>
              <th>Resumo</th>
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
                    {entry.actorName}
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
                    {(entry.payload as { summary?: string }).summary ?? "—"}
                  </td>
                  <td
                    style={{
                      fontFamily: "ui-monospace,monospace",
                      fontSize: 11.5,
                      color: "#6b7280",
                    }}
                  >
                    {entry.ipAddress ?? "—"}
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

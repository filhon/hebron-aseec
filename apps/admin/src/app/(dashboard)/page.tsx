import { Suspense } from "react";
import Link from "next/link";
import {
  Users,
  Shield,
  Activity,
  ChevronRight,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  mockUsers,
  mockInvitations,
  mockRoleAssignments,
  mockAuditLog,
  mockMeetingSessions,
} from "../../lib/mock-data";
import { ErrorState, Button } from "@hebron/ui";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getTimelineClass(action: string): string {
  if (action.startsWith("user.impersonated")) return "warm";
  if (action.startsWith("user.login") || action.startsWith("user.created"))
    return "cool";
  if (action.startsWith("meeting")) return "life";
  return "";
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  dotColor,
  flag,
  up,
}: {
  label: string;
  value: number | string;
  sub?: string;
  dotColor: string;
  flag?: boolean;
  up?: boolean;
}) {
  return (
    <div className="hb-stat">
      <div className="hb-stat-dot" style={{ background: dotColor }} />
      <div className="hb-stat-label">{label}</div>
      <div className="hb-stat-value">{value}</div>
      {sub && (
        <div
          className={`hb-stat-trend${up ? " up" : ""}${flag ? " flag" : ""}`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Content ────────────────────────────────────────────────────────

async function DashboardContent() {
  const activeUsers = mockUsers.filter((u) => u.status === "active").length;
  const pendingApproval = mockUsers.filter(
    (u) => u.status === "pending_approval",
  ).length;
  const pendingInvites = mockInvitations.filter(
    (i) => i.status === "pending",
  ).length;

  const roleCountMap = mockRoleAssignments
    .filter((ra) => ra.revokedAt === null)
    .reduce<Record<string, number>>((acc, ra) => {
      acc[ra.role] = (acc[ra.role] ?? 0) + 1;
      return acc;
    }, {});

  const rolePalette: Record<string, string> = {
    super_admin: "#202c85",
    diretor: "#ea5a06",
    conselheiro: "#07b4e7",
    colaborador: "#a1c520",
    submissor: "#6b4ec8",
    aluno: "#0a8a7d",
    hospede: "#b8852a",
    ouvinte: "#b7bdd0",
  };

  const recentAudit = [...mockAuditLog]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);

  const upcomingMeetings = mockMeetingSessions
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 2);

  const pendingUsers = mockUsers.filter((u) => u.status === "pending_approval");

  const totalRoles = Object.values(roleCountMap).reduce((a, b) => a + b, 0);

  return (
    <div className="hb-page">
      {/* Welcome card */}
      <div className="hb-welcome-card">
        <div className="hb-welcome-card-inner">
          <div className="hb-welcome-eyebrow">
            Painel administrativo · 23 maio 2026
          </div>
          <h2>
            Bom dia, Filipe. Hoje há{" "}
            <span style={{ color: "#07b4e7" }}>
              {pendingApproval} cadastros
            </span>{" "}
            aguardando aprovação e{" "}
            <span style={{ color: "#ea5a06" }}>{pendingInvites} convites</span>{" "}
            em aberto.
          </h2>
          <p>
            A janela de submissão de projetos anuais 2026 abre em 01/07.
            Mantenha designações e templates de email em dia antes disso.
          </p>
          <div className="hb-welcome-actions">
            <Link href="/convites" className="hb-btn hb-btn-welcome-primary">
              <Plus size={15} aria-hidden="true" />
              Novo convite
            </Link>
            <Link href="/usuarios" className="hb-btn hb-btn-welcome-secondary">
              <Users size={15} aria-hidden="true" />
              Aprovar cadastros
            </Link>
          </div>
        </div>
        {/* Decorative circles */}
        <svg
          className="hb-welcome-deco-circles"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="65" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="40" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="15" fill="white" opacity="0.3" />
        </svg>
      </div>

      {/* Stat cards */}
      <div className="hb-grid hb-grid-4" style={{ marginBottom: 22 }}>
        <StatCard
          label="Usuários ativos"
          value={activeUsers}
          sub={`${mockUsers.length} no total`}
          dotColor="#a1c520"
        />
        <StatCard
          label="Pendentes de aprovação"
          value={pendingApproval}
          sub={pendingApproval > 0 ? "requer ação" : "tudo em dia"}
          dotColor="#ea5a06"
          flag={pendingApproval > 0}
        />
        <StatCard
          label="Convites em aberto"
          value={pendingInvites}
          sub="expiram em 7 dias"
          dotColor="#07b4e7"
        />
        <StatCard
          label="Cobertura MFA"
          value="100%"
          sub="diretores + super_admin"
          dotColor="#202c85"
          up
        />
      </div>

      {/* Activity + Roles */}
      <div className="hb-grid hb-grid-stat" style={{ marginBottom: 22 }}>
        {/* Recent activity */}
        <div className="hb-card">
          <div className="hb-card-header">
            <h3>Atividade recente</h3>
            <div className="hb-card-header-actions">
              <Link href="/auditoria" className="hb-btn hb-btn-ghost hb-btn-sm">
                <Activity size={14} aria-hidden="true" />
                Ver trilha
              </Link>
            </div>
          </div>
          <div
            className="hb-card-body"
            style={{ paddingTop: 8, paddingBottom: 8 }}
          >
            <ul className="hb-timeline" aria-label="Atividade recente">
              {recentAudit.map((entry) => (
                <li
                  key={entry.id}
                  className={`hb-timeline-item ${getTimelineClass(entry.action)}`}
                >
                  <div className="hb-timeline-time">
                    {formatRelative(entry.createdAt)}
                    {" · "}
                    <span
                      style={{
                        fontFamily: "ui-monospace,monospace",
                        fontSize: 11,
                      }}
                    >
                      {entry.action}
                    </span>
                  </div>
                  <div className="hb-timeline-text">
                    <b>{entry.actorName}</b>
                    {(entry.payload as { summary?: string }).summary
                      ? ` · ${(entry.payload as { summary?: string }).summary}`
                      : ""}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Roles + Meetings */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Role distribution */}
          <div className="hb-card">
            <div className="hb-card-header">
              <h3>Distribuição de papéis</h3>
            </div>
            <div className="hb-card-body">
              <div className="hb-role-count-list">
                {Object.entries(roleCountMap)
                  .sort((a, b) => b[1] - a[1])
                  .map(([role, count]) => {
                    const pct = Math.round(
                      (count / Math.max(1, totalRoles)) * 100,
                    );
                    const color = rolePalette[role] ?? "#b7bdd0";
                    const label = role
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ");
                    return (
                      <div key={role} className="hb-role-count-row">
                        <span
                          className="hb-role-count-swatch"
                          style={{ background: color }}
                        />
                        <span className="hb-role-count-name">{label}</span>
                        <div className="hb-role-count-bar">
                          <div
                            className="hb-role-count-fill"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                        <span className="hb-role-count-value">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Upcoming meetings */}
          {upcomingMeetings.length > 0 && (
            <div className="hb-card">
              <div className="hb-card-header">
                <h3>Próximas reuniões</h3>
                <div className="hb-card-header-actions">
                  <Link
                    href="/reunioes"
                    className="hb-btn hb-btn-ghost hb-btn-sm"
                  >
                    Abrir
                    <ChevronRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <div
                className="hb-card-body"
                style={{ padding: "6px 22px 18px" }}
              >
                {upcomingMeetings.map((m) => {
                  const d = m.date;
                  const day = d.toLocaleDateString("pt-BR", { day: "2-digit" });
                  const month = d
                    .toLocaleDateString("pt-BR", { month: "short" })
                    .replace(".", "")
                    .toUpperCase();
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: "12px 0",
                        borderBottom: "1px solid rgba(19,23,55,0.07)",
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          textAlign: "center",
                          background: "#f7f8fc",
                          borderRadius: 10,
                          padding: "8px 4px",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            fontFamily:
                              "var(--font-display,'Parkinsans',sans-serif)",
                            fontSize: 20,
                            fontWeight: 700,
                            color: "#202c85",
                            lineHeight: 1,
                          }}
                        >
                          {day}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#6b7280",
                            marginTop: 4,
                          }}
                        >
                          {month}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13.5,
                            color: "#131737",
                          }}
                        >
                          Reunião{" "}
                          {m.type === "mensal" ? "mensal" : "extraordinária"}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            marginTop: 2,
                          }}
                        >
                          {d.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pending approvals */}
      {pendingUsers.length > 0 && (
        <div className="hb-card">
          <div className="hb-card-header">
            <h3>Cadastros aguardando aprovação</h3>
            <div className="hb-card-header-actions">
              <Link href="/usuarios" className="hb-btn hb-btn-ghost hb-btn-sm">
                Ver todos
              </Link>
            </div>
          </div>
          <div style={{ padding: "4px 22px 14px" }}>
            {pendingUsers.map((u) => {
              const initials = u.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase();
              return (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 0",
                    borderBottom: "1px solid rgba(19,23,55,0.07)",
                  }}
                >
                  <div
                    className="hb-avatar"
                    style={{ background: "#202c85" }}
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#131737",
                      }}
                    >
                      {u.name}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#6b7280" }}>
                      {u.email}
                    </div>
                  </div>
                  <span className="hb-badge hb-status-pendente">
                    <span className="hb-badge-dot" />
                    Pendente
                  </span>
                  <Link
                    href={`/usuarios/${u.id}`}
                    className="hb-btn hb-btn-primary hb-btn-sm"
                  >
                    <Shield size={13} aria-hidden="true" />
                    Aprovar
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;

  if (state === "error") {
    return (
      <div className="hb-page">
        <ErrorState
          title="Não foi possível carregar o painel"
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
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="hb-page">
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                style={{
                  height: 80,
                  borderRadius: 16,
                  background: "#eef0f6",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

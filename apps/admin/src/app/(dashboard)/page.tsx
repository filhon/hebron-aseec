import { Suspense } from "react";
import Link from "next/link";
import { db } from "@hebron/db/client";
import { eq, desc, asc, count, isNull, gte, sql, and } from "drizzle-orm";
import { users, roleAssignments } from "@hebron/db/schema";
import { auditLog, invitations, meetingSessions } from "@hebron/db/schema";
import { Users, Activity, ChevronRight, Plus, RotateCcw } from "lucide-react";
import { ErrorState, Button } from "@hebron/ui";
import { DashboardSkeleton } from "../../components/dashboard-skeleton";

// ─── DB ───────────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const now = new Date();

  const [
    userCountRows,
    pendingInviteRows,
    roleDistRows,
    recentAuditRows,
    upcomingMeetingRows,
  ] = await Promise.all([
    db
      .select({
        total: count(),
        suspended: sql<number>`count(case when ${users.suspendedModules} @> '["global"]'::jsonb then 1 end)::int`,
      })
      .from(users),

    db
      .select({ total: count() })
      .from(invitations)
      .where(
        and(
          isNull(invitations.revokedAt),
          isNull(invitations.acceptedAt),
          gte(invitations.expiresAt, now),
        ),
      ),

    db
      .select({ role: roleAssignments.role, total: count() })
      .from(roleAssignments)
      .groupBy(roleAssignments.role),

    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        actorName: users.fullName,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .innerJoin(users, eq(auditLog.actorId, users.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(6),

    db
      .select({
        id: meetingSessions.id,
        date: meetingSessions.date,
        type: meetingSessions.type,
        chairName: users.fullName,
      })
      .from(meetingSessions)
      .leftJoin(users, eq(meetingSessions.chairUserId, users.id))
      .where(eq(meetingSessions.status, "scheduled"))
      .orderBy(asc(meetingSessions.date))
      .limit(2),
  ]);

  const userStats = userCountRows[0] ?? { total: 0, suspended: 0 };
  const suspended = userStats.suspended ?? 0;
  const activeUsers = userStats.total - suspended;
  const pendingInvites = pendingInviteRows[0]?.total ?? 0;

  const roleCountMap = roleDistRows.reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.role] = row.total;
      return acc;
    },
    {},
  );
  const totalRoles = roleDistRows.reduce((s, r) => s + r.total, 0);

  const rolePalette: Record<string, string> = {
    super_admin: "var(--hb-blue)",
    diretor: "var(--hb-orange)",
    conselheiro: "var(--hb-cyan)",
    colaborador: "var(--hb-green)",
    submissor: "var(--hb-purple)",
    aluno: "var(--hb-teal)",
    hospede: "var(--hb-gold)",
    ouvinte: "var(--hb-gray-200)",
  };

  return (
    <div className="hb-page">
      {/* Welcome card */}
      <div className="hb-welcome-card">
        <div className="hb-welcome-card-inner">
          <div className="hb-welcome-eyebrow">Painel administrativo</div>
          <h2>
            {pendingInvites > 0 ? (
              <>
                Há{" "}
                <span style={{ color: "var(--hb-cyan)" }}>
                  {pendingInvites} convite{pendingInvites !== 1 ? "s" : ""}
                </span>{" "}
                em aberto
                {suspended > 0 && (
                  <>
                    {" "}
                    e{" "}
                    <span style={{ color: "var(--hb-orange)" }}>
                      {suspended} suspenso{suspended !== 1 ? "s" : ""}
                    </span>
                  </>
                )}
                .
              </>
            ) : suspended > 0 ? (
              <>
                Há{" "}
                <span style={{ color: "var(--hb-orange)" }}>
                  {suspended} conta{suspended !== 1 ? "s" : ""} suspensa
                  {suspended !== 1 ? "s" : ""}
                </span>{" "}
                para verificar.
              </>
            ) : (
              "Nenhuma ação pendente no momento."
            )}
          </h2>
          <p>
            Gerencie usuários, convites, designações e reuniões do ecossistema
            Hebron Aseec.
          </p>
          <div className="hb-welcome-actions">
            <Button asChild variant="accent" className="rounded-full">
              <Link href="/convites">
                <Plus size={15} aria-hidden="true" />
                Novo convite
              </Link>
            </Button>
            <Link href="/usuarios" className="hb-btn hb-btn-welcome-secondary">
              <Users size={15} aria-hidden="true" />
              Usuários
            </Link>
          </div>
        </div>
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
          sub={`${userStats.total} no total`}
          dotColor="var(--hb-green)"
        />
        <StatCard
          label="Contas suspensas"
          value={suspended}
          sub={suspended > 0 ? "requer verificação" : "tudo em dia"}
          dotColor="var(--hb-orange)"
          flag={suspended > 0}
        />
        <StatCard
          label="Convites em aberto"
          value={pendingInvites}
          sub="expiram em até 7 dias"
          dotColor="var(--hb-cyan)"
        />
        <StatCard
          label="Total de papéis"
          value={totalRoles}
          sub={`${Object.keys(roleCountMap).length} tipos`}
          dotColor="var(--hb-blue)"
        />
      </div>

      {/* Activity + Roles */}
      <div className="hb-grid hb-grid-stat" style={{ marginBottom: 22 }}>
        {/* Recent activity */}
        <div className="hb-card">
          <div className="hb-card-header">
            <h3>Atividade recente</h3>
            <div className="hb-card-header-actions">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="rounded-full"
              >
                <Link href="/auditoria">
                  <Activity size={14} aria-hidden="true" />
                  Ver trilha
                </Link>
              </Button>
            </div>
          </div>
          <div
            className="hb-card-body"
            style={{ paddingTop: 8, paddingBottom: 8 }}
          >
            {recentAuditRows.length === 0 ? (
              <p
                style={{
                  padding: "16px 0",
                  color: "var(--fg-muted)",
                  fontSize: 13,
                }}
              >
                Nenhuma atividade registrada.
              </p>
            ) : (
              <ul className="hb-timeline" aria-label="Atividade recente">
                {recentAuditRows.map((entry) => (
                  <li
                    key={entry.id}
                    className={`hb-timeline-item ${getTimelineClass(entry.action)}`}
                  >
                    <div className="hb-timeline-time">
                      {formatRelative(entry.createdAt)}
                      {" · "}
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                        }}
                      >
                        {entry.action}
                      </span>
                    </div>
                    <div className="hb-timeline-text">
                      <b>{entry.actorName ?? "—"}</b>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
              {Object.keys(roleCountMap).length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--fg-muted)" }}>
                  Nenhum papel atribuído.
                </p>
              ) : (
                <div className="hb-role-count-list">
                  {Object.entries(roleCountMap)
                    .sort((a, b) => b[1] - a[1])
                    .map(([role, cnt]) => {
                      const pct = Math.round(
                        (cnt / Math.max(1, totalRoles)) * 100,
                      );
                      const color = rolePalette[role] ?? "var(--fg-subtle)";
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
                          <span className="hb-role-count-value">{cnt}</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming meetings */}
          {upcomingMeetingRows.length > 0 && (
            <div className="hb-card">
              <div className="hb-card-header">
                <h3>Próximas reuniões</h3>
                <div className="hb-card-header-actions">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                  >
                    <Link href="/reunioes">
                      Abrir
                      <ChevronRight size={13} aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div
                className="hb-card-body"
                style={{ padding: "6px 22px 18px" }}
              >
                {upcomingMeetingRows.map((m) => {
                  const d = m.date;
                  const day = d.toLocaleDateString("pt-BR", { day: "2-digit" });
                  const month = d
                    .toLocaleDateString("pt-BR", { month: "short" })
                    .replace(".", "")
                    .toUpperCase();
                  return (
                    <div key={m.id} className="hb-meeting-row">
                      <div className="hb-meeting-date">
                        <div className="hb-meeting-date-day">{day}</div>
                        <div className="hb-meeting-date-month">{month}</div>
                      </div>
                      <div className="hb-meeting-info">
                        <div className="hb-meeting-title">
                          Reunião{" "}
                          {m.type === "mensal" ? "mensal" : "extraordinária"}
                        </div>
                        <div className="hb-meeting-meta">
                          {d.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {m.chairName ? ` · ${m.chairName}` : ""}
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
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

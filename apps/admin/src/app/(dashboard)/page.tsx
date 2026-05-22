import { Users, Mail, AlertTriangle, Activity, Shield } from "lucide-react";
import {
  mockUsers,
  mockInvitations,
  mockRoleAssignments,
  mockAuditLog,
} from "../../lib/mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(date: Date): string {
  const now = new Date("2026-05-22T12:00:00Z");
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return "ontem";
  return `há ${diffDays} dias`;
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    "user.created": "Usuário criado",
    "user.approved": "Usuário aprovado",
    "user.suspended": "Usuário suspenso",
    "user.updated": "Usuário editado",
    "user.impersonated": "Acesso impersonificado",
    "role.granted": "Papel concedido",
    "role.revoked": "Papel revogado",
    "invitation.created": "Convite enviado",
    "invitation.revoked": "Convite revogado",
    "setting.updated": "Configuração alterada",
    "feature_flag.toggled": "Feature flag alterada",
    "email_template.updated": "Template de e-mail editado",
    "meeting.created": "Reunião criada",
    "meeting.updated": "Reunião atualizada",
    "designation.assigned": "Designação atribuída",
    "designation.revoked": "Designação removida",
  };
  return labels[action] ?? action;
}

// ─── Computed data ─────────────────────────────────────────────────────────────

const activeUsers = mockUsers.filter((u) => u.status === "active").length;
const pendingApproval = mockUsers.filter(
  (u) => u.status === "pending_approval",
).length;
const pendingInvites = mockInvitations.filter(
  (i) => i.status === "pending",
).length;
const suspendedUsers = mockUsers.filter((u) => u.status === "suspended").length;

const roleCountMap = mockRoleAssignments
  .filter((ra) => ra.revokedAt === null)
  .reduce<Record<string, number>>((acc, ra) => {
    acc[ra.role] = (acc[ra.role] ?? 0) + 1;
    return acc;
  }, {});

const recentAudit = [...mockAuditLog]
  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  .slice(0, 8);

// ─── Sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  variant?: "default" | "warning" | "danger" | "info";
}

function StatCard({ label, value, icon, variant = "default" }: StatCardProps) {
  const colors: Record<string, string> = {
    default: "var(--color-primary)",
    warning: "var(--color-accent)",
    danger: "var(--color-destructive)",
    info: "var(--color-support-sky)",
  };
  const bgColors: Record<string, string> = {
    default: "var(--color-primary-muted)",
    warning: "var(--color-accent-muted)",
    danger: "var(--color-destructive-muted)",
    info: "var(--color-support-sky-muted)",
  };

  return (
    <div
      style={{
        backgroundColor: "var(--color-background)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: "1.25rem",
        display: "flex",
        alignItems: "flex-start",
        gap: "1rem",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: "2.5rem",
          height: "2.5rem",
          borderRadius: "var(--radius-md)",
          backgroundColor: bgColors[variant],
          color: colors[variant],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: "var(--text-2xl)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--color-foreground)",
            lineHeight: "1.2",
          }}
        >
          {value}
        </p>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-muted-foreground)",
            marginTop: "0.125rem",
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div
      style={{
        padding: "1.5rem",
        maxWidth: "72rem",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: "var(--text-2xl)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--color-foreground)",
          }}
        >
          Dashboard
        </h1>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--color-muted-foreground)",
            marginTop: "0.25rem",
          }}
        >
          Visão geral do ecossistema Hebron Aseec
        </p>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))",
          gap: "1rem",
        }}
      >
        <StatCard
          label="Usuários ativos"
          value={activeUsers}
          icon={<Users size={20} />}
        />
        <StatCard
          label="Convites pendentes"
          value={pendingInvites}
          icon={<Mail size={20} />}
          variant="info"
        />
        {pendingApproval > 0 && (
          <StatCard
            label="Aguardando aprovação"
            value={pendingApproval}
            icon={<AlertTriangle size={20} />}
            variant="warning"
          />
        )}
        {suspendedUsers > 0 && (
          <StatCard
            label="Suspensos"
            value={suspendedUsers}
            icon={<Shield size={20} />}
            variant="danger"
          />
        )}
        <StatCard
          label="Total de usuários"
          value={mockUsers.length}
          icon={<Activity size={20} />}
        />
      </div>

      {/* Role breakdown + Recent audit */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(20rem, 1fr))",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* Role breakdown */}
        <section
          aria-labelledby="roles-heading"
          style={{
            backgroundColor: "var(--color-background)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
            padding: "1.25rem",
          }}
        >
          <h2
            id="roles-heading"
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-foreground)",
              marginBottom: "1rem",
            }}
          >
            Usuários por papel
          </h2>
          <ul
            role="list"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
            }}
          >
            {Object.entries(roleCountMap)
              .sort((a, b) => b[1] - a[1])
              .map(([role, count]) => (
                <li
                  key={role}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  <span style={{ color: "var(--color-foreground)" }}>
                    {role.replace("_", " ")}
                  </span>
                  <span
                    style={{
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--color-primary)",
                      minWidth: "1.5rem",
                      textAlign: "right",
                    }}
                  >
                    {count}
                  </span>
                </li>
              ))}
          </ul>
        </section>

        {/* Recent audit activity */}
        <section
          aria-labelledby="audit-heading"
          style={{
            backgroundColor: "var(--color-background)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
            padding: "1.25rem",
          }}
        >
          <h2
            id="audit-heading"
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-foreground)",
              marginBottom: "1rem",
            }}
          >
            Últimas ações
          </h2>
          <ul
            role="list"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {recentAudit.map((entry) => (
              <li
                key={entry.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.125rem",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--color-foreground)",
                  }}
                >
                  {getActionLabel(entry.action)}
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: "0.375rem",
                    fontSize: "var(--text-xs)",
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  <span>{entry.actorName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatRelativeDate(entry.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

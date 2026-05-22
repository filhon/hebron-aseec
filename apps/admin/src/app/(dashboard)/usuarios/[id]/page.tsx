import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, Clock } from "lucide-react";
import {
  mockUsers,
  mockRoleAssignments,
  mockAuditLog,
} from "../../../../lib/mock-data";
import { RoleBadge } from "../../../../components/role-badge";
import { StatusBadge } from "../../../../components/status-badge";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDate(date: Date | null): string {
  if (!date) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    "user.created": "Conta criada",
    "user.approved": "Conta aprovada",
    "user.suspended": "Conta suspensa",
    "user.updated": "Dados editados",
    "user.impersonated": "Acesso impersonificado",
    "role.granted": "Papel concedido",
    "role.revoked": "Papel revogado",
    "invitation.created": "Convite enviado",
    "setting.updated": "Configuração alterada",
    "feature_flag.toggled": "Feature flag alterada",
    "meeting.created": "Reunião criada",
    "designation.assigned": "Designação atribuída",
    "designation.revoked": "Designação removida",
  };
  return labels[action] ?? action;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;

  const user = mockUsers.find((u) => u.id === id);
  if (!user) notFound();

  const roles = mockRoleAssignments
    .filter((ra) => ra.userId === user.id && ra.revokedAt === null)
    .map((ra) => ra.role);

  const revokedRoles = mockRoleAssignments
    .filter((ra) => ra.userId === user.id && ra.revokedAt !== null)
    .sort(
      (a, b) => (b.revokedAt?.getTime() ?? 0) - (a.revokedAt?.getTime() ?? 0),
    );

  const activityLog = mockAuditLog
    .filter((e) => e.actorId === user.id || e.targetId === user.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const approvedByUser = user.approvedBy
    ? mockUsers.find((u) => u.id === user.approvedBy)
    : null;

  return (
    <div
      style={{
        padding: "1.5rem",
        maxWidth: "56rem",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      {/* Back link */}
      <Link
        href="/usuarios"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "var(--text-sm)",
          color: "var(--color-muted-foreground)",
          textDecoration: "none",
        }}
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Voltar para usuários
      </Link>

      {/* Profile card */}
      <section
        aria-labelledby="profile-heading"
        style={{
          backgroundColor: "var(--color-background)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Avatar + name + email */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: "4rem",
              height: "4rem",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--color-primary-muted)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "var(--text-xl)",
              fontWeight: "var(--font-weight-semibold)",
              overflow: "hidden",
            }}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              getInitials(user.name)
            )}
          </div>
          <div>
            <h1
              id="profile-heading"
              style={{
                fontSize: "var(--text-xl)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--color-foreground)",
              }}
            >
              {user.name}
            </h1>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-muted-foreground)",
                marginTop: "0.125rem",
              }}
            >
              {user.email}
            </p>
          </div>
        </div>

        {/* Status + MFA */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <StatusBadge status={user.status} />
          {user.mfaEnabled && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "var(--text-xs)",
                color: "var(--color-support-sky)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              <Shield size={13} />
              MFA ativado
            </span>
          )}
        </div>

        {/* Roles */}
        {roles.length > 0 && (
          <div>
            <p
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-muted-foreground)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.5rem",
              }}
            >
              Papéis ativos
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {roles.map((role) => (
                <RoleBadge key={role} role={role} />
              ))}
            </div>
          </div>
        )}

        {/* Meta info */}
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))",
            gap: "0.75rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          {[
            { label: "Cadastrado em", value: formatShortDate(user.createdAt) },
            { label: "Último acesso", value: formatDate(user.lastLoginAt) },
            {
              label: "Aprovado por",
              value: approvedByUser?.name ?? "—",
            },
            {
              label: "Aprovado em",
              value: user.approvedAt ? formatShortDate(user.approvedAt) : "—",
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-muted-foreground)",
                  marginBottom: "0.125rem",
                }}
              >
                {label}
              </dt>
              <dd
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-weight-medium)",
                  color: "var(--color-foreground)",
                }}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {/* Actions */}
        {user.status === "active" && (
          <div style={{ paddingTop: "0.5rem" }}>
            <button
              type="button"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-destructive)",
                backgroundColor: "transparent",
                border: "1px solid var(--color-destructive)",
                borderRadius: "var(--radius)",
                cursor: "pointer",
              }}
              aria-label={`Suspender conta de ${user.name}`}
            >
              Suspender conta
            </button>
          </div>
        )}
        {user.status === "suspended" && (
          <div style={{ paddingTop: "0.5rem" }}>
            <button
              type="button"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-support-green)",
                backgroundColor: "transparent",
                border: "1px solid var(--color-support-green)",
                borderRadius: "var(--radius)",
                cursor: "pointer",
              }}
              aria-label={`Reativar conta de ${user.name}`}
            >
              Reativar conta
            </button>
          </div>
        )}
        {user.status === "pending_approval" && (
          <div style={{ paddingTop: "0.5rem" }}>
            <button
              type="button"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-accent-foreground)",
                backgroundColor: "var(--color-accent)",
                border: "none",
                borderRadius: "var(--radius)",
                cursor: "pointer",
              }}
              aria-label={`Aprovar conta de ${user.name}`}
            >
              Aprovar acesso
            </button>
          </div>
        )}
      </section>

      {/* Revoked roles history */}
      {revokedRoles.length > 0 && (
        <section
          aria-labelledby="revoked-roles-heading"
          style={{
            backgroundColor: "var(--color-background)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
            padding: "1.25rem",
          }}
        >
          <h2
            id="revoked-roles-heading"
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-foreground)",
              marginBottom: "0.75rem",
            }}
          >
            Papéis anteriores
          </h2>
          <ul
            role="list"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {revokedRoles.map((ra) => (
              <li
                key={ra.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-muted-foreground)",
                }}
              >
                <RoleBadge role={ra.role} size="sm" />
                <span>
                  removido em{" "}
                  {ra.revokedAt ? formatShortDate(ra.revokedAt) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Activity log */}
      <section
        aria-labelledby="activity-heading"
        style={{
          backgroundColor: "var(--color-background)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
          padding: "1.25rem",
        }}
      >
        <h2
          id="activity-heading"
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-foreground)",
            marginBottom: "0.75rem",
          }}
        >
          Histórico de atividade
        </h2>

        {activityLog.length === 0 ? (
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-muted-foreground)",
              fontStyle: "italic",
            }}
          >
            Nenhuma atividade registrada.
          </p>
        ) : (
          <ul
            role="list"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0",
            }}
          >
            {activityLog.map((entry, i) => (
              <li
                key={entry.id}
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  paddingBottom: i < activityLog.length - 1 ? "1rem" : "0",
                  paddingTop: i > 0 ? "1rem" : "0",
                  borderTop: i > 0 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    marginTop: "0.125rem",
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  <Clock size={14} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--color-foreground)",
                    }}
                  >
                    {getActionLabel(entry.action)}
                  </p>
                  <p
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--color-muted-foreground)",
                      marginTop: "0.125rem",
                    }}
                  >
                    {entry.actorName} · {formatDate(entry.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Shield, Clock, Edit, KeyRound, Eye } from "lucide-react";
import {
  mockUsers,
  mockRoleAssignments,
  mockAuditLog,
} from "../../../../lib/mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  const palette = [
    "#202c85",
    "#ea5a06",
    "#07b4e7",
    "#a1c520",
    "#6b4ec8",
    "#0a8a7d",
    "#b8852a",
  ];
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return palette[hash % palette.length] ?? "#202c85";
}

function formatDateTime(date: Date | null): string {
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
    "meeting.created": "Reunião criada",
    "designation.assigned": "Designação atribuída",
  };
  return labels[action] ?? action;
}

function getTimelineClass(action: string): string {
  if (action.startsWith("user.impersonated")) return "warm";
  if (action.startsWith("user.created") || action.startsWith("user.approved"))
    return "cool";
  return "";
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  diretor: "Diretor",
  conselheiro: "Conselheiro",
  colaborador: "Colaborador",
  submissor: "Submissor",
  aluno: "Aluno",
  hospede: "Hóspede",
  ouvinte: "Ouvinte",
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active: { label: "Ativo", cls: "hb-status-active" },
  pending_approval: { label: "Pendente", cls: "hb-status-pending_approval" },
  suspended: { label: "Suspenso", cls: "hb-status-suspended" },
};

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
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  const approvedByUser = user.approvedBy
    ? mockUsers.find((u) => u.id === user.approvedBy)
    : null;

  const initials = getInitials(user.name);
  const bg = getAvatarColor(user.name);
  const statusCfg = STATUS_CONFIG[user.status] ?? {
    label: user.status,
    cls: "",
  };

  return (
    <div className="hb-page">
      {/* Back */}
      <Link href="/usuarios" className="hb-back-link">
        <ChevronLeft size={14} aria-hidden="true" />
        Voltar para usuários
      </Link>

      {/* Profile header */}
      <div className="hb-detail-header">
        <div
          className="hb-avatar hb-avatar-xl"
          style={{ background: bg }}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="hb-detail-header-meta">
          <div className="hb-role-stack" style={{ marginBottom: 6 }}>
            {roles.map((r) => (
              <span key={r} className={`hb-badge hb-role-${r}`}>
                {ROLE_LABELS[r] ?? r}
              </span>
            ))}
          </div>
          <h1>{user.name}</h1>
          <div className="hb-detail-email">{user.email}</div>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              fontSize: 13,
            }}
          >
            <span>
              <b style={{ color: "#131737" }}>Status:</b>{" "}
              <span
                className={`hb-badge ${statusCfg.cls}`}
                style={{ marginLeft: 4 }}
              >
                <span className="hb-badge-dot" />
                {statusCfg.label}
              </span>
            </span>
            <span style={{ color: "#6b7280" }}>
              <b style={{ color: "#131737" }}>Criado em:</b>{" "}
              {formatShortDate(user.createdAt)}
            </span>
            <span style={{ color: "#6b7280" }}>
              <b style={{ color: "#131737" }}>Último acesso:</b>{" "}
              {formatDateTime(user.lastLoginAt)}
            </span>
          </div>
        </div>
        <div className="hb-detail-header-actions">
          <button className="hb-btn hb-btn-secondary hb-btn-sm" type="button">
            <Edit size={13} aria-hidden="true" />
            Editar
          </button>
          <button className="hb-btn hb-btn-secondary hb-btn-sm" type="button">
            <KeyRound size={13} aria-hidden="true" />
            Resetar senha
          </button>
          {user.status !== "active" && (
            <button className="hb-btn hb-btn-primary hb-btn-sm" type="button">
              Aprovar acesso
            </button>
          )}
          {user.status === "active" && (
            <button className="hb-btn hb-btn-accent hb-btn-sm" type="button">
              <Eye size={13} aria-hidden="true" />
              Impersonar
            </button>
          )}
        </div>
      </div>

      <div className="hb-grid hb-grid-stat">
        {/* Left col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Activity */}
          <div className="hb-card">
            <div className="hb-card-header">
              <h3>Atividade recente</h3>
            </div>
            <div
              className="hb-card-body"
              style={{ paddingTop: 8, paddingBottom: 8 }}
            >
              {activityLog.length === 0 ? (
                <div className="hb-empty" style={{ padding: "32px 20px" }}>
                  <b>Sem atividade registrada</b>
                  <div className="hb-empty-quote">
                    "Mesmo o que ainda não fez, será feito a seu tempo."
                    <cite className="hb-empty-cite">— Eclesiastes 3:11</cite>
                  </div>
                </div>
              ) : (
                <ul className="hb-timeline" aria-label="Atividade do usuário">
                  {activityLog.map((entry) => (
                    <li
                      key={entry.id}
                      className={`hb-timeline-item ${getTimelineClass(entry.action)}`}
                    >
                      <div className="hb-timeline-time">
                        {formatDateTime(entry.createdAt)}
                        {" · "}
                        <span
                          style={{
                            fontFamily: "ui-monospace,monospace",
                            fontSize: 10.5,
                          }}
                        >
                          {entry.action}
                        </span>
                      </div>
                      <div className="hb-timeline-text">
                        {(entry.payload as { summary?: string }).summary ??
                          getActionLabel(entry.action)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Revoked roles */}
          {revokedRoles.length > 0 && (
            <div className="hb-card">
              <div className="hb-card-header">
                <h3>Papéis anteriores</h3>
              </div>
              <div
                className="hb-card-body"
                style={{ paddingTop: 6, paddingBottom: 6 }}
              >
                {revokedRoles.map((ra) => (
                  <div
                    key={ra.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom: "1px solid rgba(19,23,55,0.07)",
                      opacity: 0.7,
                    }}
                  >
                    <span className={`hb-badge hb-role-${ra.role}`}>
                      {ROLE_LABELS[ra.role] ?? ra.role}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginLeft: "auto",
                      }}
                    >
                      removido em{" "}
                      {ra.revokedAt ? formatShortDate(ra.revokedAt) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Identity & security */}
          <div className="hb-card">
            <div className="hb-card-header">
              <h3>Identidade & segurança</h3>
            </div>
            <div className="hb-card-body">
              <dl className="hb-meta-list">
                <dt>ID interno</dt>
                <dd
                  style={{ fontFamily: "ui-monospace,monospace", fontSize: 12 }}
                >
                  {user.id}
                </dd>
                <dt>Email</dt>
                <dd>{user.email}</dd>
                <dt>MFA (TOTP)</dt>
                <dd>
                  {user.mfaEnabled ? (
                    <span
                      style={{
                        color: "#5e7a10",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Shield size={13} aria-hidden="true" /> Habilitado
                    </span>
                  ) : (
                    <span style={{ color: "#c24a03", fontWeight: 600 }}>
                      Não habilitado
                    </span>
                  )}
                </dd>
                <dt>Cadastrado em</dt>
                <dd>{formatShortDate(user.createdAt)}</dd>
                <dt>Aprovado por</dt>
                <dd>{approvedByUser?.name ?? "—"}</dd>
                <dt>Aprovado em</dt>
                <dd>
                  {user.approvedAt ? formatShortDate(user.approvedAt) : "—"}
                </dd>
              </dl>
            </div>
          </div>

          {/* Pending approval callout */}
          {user.status === "pending_approval" && (
            <div
              className="hb-card"
              style={{
                borderColor: "rgba(234,90,6,0.3)",
                background: "rgba(234,90,6,0.03)",
              }}
            >
              <div className="hb-card-body">
                <div
                  style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      background: "#ea5a06",
                      color: "white",
                      borderRadius: 8,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Clock size={16} aria-hidden="true" />
                  </div>
                  <div>
                    <b
                      style={{
                        fontFamily:
                          "var(--font-display,'Parkinsans',sans-serif)",
                        fontSize: 14.5,
                      }}
                    >
                      Aprovação pendente
                    </b>
                    <p
                      style={{
                        margin: "4px 0 14px",
                        fontSize: 13,
                        color: "#6b7280",
                      }}
                    >
                      Este usuário se auto-cadastrou. Valide vínculo e papéis
                      antes de liberar o acesso.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="hb-btn hb-btn-primary hb-btn-sm"
                        type="button"
                      >
                        Aprovar cadastro
                      </button>
                      <button
                        className="hb-btn hb-btn-ghost hb-btn-sm"
                        type="button"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suspended callout */}
          {user.status === "suspended" && (
            <div
              className="hb-card"
              style={{
                borderColor: "rgba(184,51,26,0.25)",
                background: "rgba(184,51,26,0.03)",
              }}
            >
              <div className="hb-card-body">
                <b style={{ fontSize: 14, color: "#b8331a" }}>Conta suspensa</b>
                <p
                  style={{
                    margin: "4px 0 12px",
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  O usuário não tem acesso a nenhum módulo do ecossistema.
                </p>
                <button
                  className="hb-btn hb-btn-secondary hb-btn-sm"
                  type="button"
                >
                  Reativar conta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { db } from "@hebron/db/client";
import { eq, or, desc } from "drizzle-orm";
import { users, roleAssignments } from "@hebron/db/schema";
import { auditLog } from "@hebron/db/schema";
import { ChevronLeft, Shield, KeyRound, UserCog } from "lucide-react";
import {
  suspendUser,
  unsuspendUser,
  resetPassword,
} from "../../../../actions/users";
import { startImpersonationAction } from "../../../../actions/impersonation";

// ─── DB ───────────────────────────────────────────────────────────────────────

// ─── Server Actions ───────────────────────────────────────────────────────────

async function handleSuspendUser(formData: FormData) {
  "use server";
  const id = formData.get("userId") as string;
  const result = await suspendUser({ id, modules: ["global"] });
  if (result?.serverError) {
    redirect(`/usuarios/${id}?error=${encodeURIComponent(result.serverError)}`);
  }
  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${id}`);
  redirect(`/usuarios/${id}?success=suspenso`);
}

async function handleUnsuspendUser(formData: FormData) {
  "use server";
  const id = formData.get("userId") as string;
  const result = await unsuspendUser({ id, modules: ["global"] });
  if (result?.serverError) {
    redirect(`/usuarios/${id}?error=${encodeURIComponent(result.serverError)}`);
  }
  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${id}`);
  redirect(`/usuarios/${id}?success=reativado`);
}

async function handleResetPassword(formData: FormData) {
  "use server";
  const id = formData.get("userId") as string;
  const result = await resetPassword({ id });
  if (result?.serverError) {
    redirect(`/usuarios/${id}?error=${encodeURIComponent(result.serverError)}`);
  }
  revalidatePath(`/usuarios/${id}`);
  redirect(`/usuarios/${id}?success=reset-enviado`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

function getAvatarColor(name: string | null): string {
  const palette = [
    "#202c85",
    "#ea5a06",
    "#07b4e7",
    "#a1c520",
    "#6b4ec8",
    "#0a8a7d",
    "#b8852a",
  ];
  if (!name) return palette[0] ?? "#202c85";
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

function getUserStatus(suspendedModules: string[]): "active" | "suspended" {
  return suspendedModules.includes("global") ? "suspended" : "active";
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
  suspended: { label: "Suspenso", cls: "hb-status-suspended" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}

export default async function UserDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { success, error } = await searchParams;

  const [userRows, userRoles, activityRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, id)),

    db.select().from(roleAssignments).where(eq(roleAssignments.userId, id)),

    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        actorId: auditLog.actorId,
        entityId: auditLog.entityId,
        diff: auditLog.diff,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .where(or(eq(auditLog.actorId, id), eq(auditLog.entityId, id)))
      .orderBy(desc(auditLog.createdAt))
      .limit(10),
  ]);

  const user = userRows[0];
  if (!user) notFound();

  const roles = userRoles.map((ra) => ra.role);
  const status = getUserStatus(user.suspendedModules);
  const statusCfg = STATUS_CONFIG[status] ?? { label: status, cls: "" };
  const initials = getInitials(user.fullName);
  const bg = getAvatarColor(user.fullName);

  return (
    <div className="hb-page">
      {/* Back */}
      <Link href="/usuarios" className="hb-back-link">
        <ChevronLeft size={14} aria-hidden="true" />
        Voltar para usuários
      </Link>

      {/* Feedback banners */}
      {success && (
        <div
          style={{
            background: "rgba(161,197,32,0.12)",
            border: "1px solid rgba(161,197,32,0.4)",
            borderRadius: 12,
            padding: "12px 18px",
            fontSize: 13.5,
            color: "#4a6009",
            marginBottom: 16,
          }}
        >
          {success === "aprovado" && "Conta aprovada com sucesso."}
          {success === "suspenso" && "Conta suspensa com sucesso."}
          {success === "reativado" && "Conta reativada com sucesso."}
          {success === "reset-enviado" &&
            "Link de redefinição de senha enviado."}
          {success === "impersonation-started" &&
            "Impersonação iniciada. O banner de alerta está visível no topo."}
        </div>
      )}
      {error && (
        <div
          style={{
            background: "rgba(184,51,26,0.08)",
            border: "1px solid rgba(184,51,26,0.3)",
            borderRadius: 12,
            padding: "12px 18px",
            fontSize: 13.5,
            color: "#b8331a",
            marginBottom: 16,
          }}
        >
          {decodeURIComponent(error)}
        </div>
      )}

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
          <h1>{user.fullName ?? user.email}</h1>
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
              <b style={{ color: "#131737" }}>Cadastrado em:</b>{" "}
              {formatShortDate(user.createdAt)}
            </span>
          </div>
        </div>
        <div className="hb-detail-header-actions">
          {/* Impersonate */}
          <form action={startImpersonationAction}>
            <input type="hidden" name="userId" value={user.id} />
            <button type="submit" className="hb-btn hb-btn-ghost hb-btn-sm">
              <UserCog size={13} aria-hidden="true" />
              Impersonar
            </button>
          </form>

          {/* Reset password */}
          <form action={handleResetPassword}>
            <input type="hidden" name="userId" value={user.id} />
            <button type="submit" className="hb-btn hb-btn-secondary hb-btn-sm">
              <KeyRound size={13} aria-hidden="true" />
              Resetar senha
            </button>
          </form>

          {/* Suspend / Unsuspend */}
          {status === "active" && (
            <form action={handleSuspendUser}>
              <input type="hidden" name="userId" value={user.id} />
              <button type="submit" className="hb-btn hb-btn-accent hb-btn-sm">
                Suspender
              </button>
            </form>
          )}
          {status === "suspended" && (
            <form action={handleUnsuspendUser}>
              <input type="hidden" name="userId" value={user.id} />
              <button type="submit" className="hb-btn hb-btn-primary hb-btn-sm">
                Reativar conta
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="hb-grid hb-grid-stat">
        {/* Left col — Activity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="hb-card">
            <div className="hb-card-header">
              <h3>Atividade recente</h3>
            </div>
            <div
              className="hb-card-body"
              style={{ paddingTop: 8, paddingBottom: 8 }}
            >
              {activityRows.length === 0 ? (
                <div className="hb-empty" style={{ padding: "32px 20px" }}>
                  <b>Sem atividade registrada</b>
                  <div className="hb-empty-quote">
                    "Mesmo o que ainda não fez, será feito a seu tempo."
                    <cite className="hb-empty-cite">— Eclesiastes 3:11</cite>
                  </div>
                </div>
              ) : (
                <ul className="hb-timeline" aria-label="Atividade do usuário">
                  {activityRows.map((entry) => (
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
                        {getActionLabel(entry.action)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
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
                <dt>Telefone</dt>
                <dd>{user.phone ?? "—"}</dd>
                <dt>Módulos suspensos</dt>
                <dd>
                  {user.suspendedModules.length === 0
                    ? "Nenhum"
                    : user.suspendedModules.join(", ")}
                </dd>
                <dt>Cadastrado em</dt>
                <dd>{formatShortDate(user.createdAt)}</dd>
                <dt>Atualizado em</dt>
                <dd>{formatShortDate(user.updatedAt)}</dd>
              </dl>
            </div>
          </div>

          {/* Suspended callout */}
          {status === "suspended" && (
            <div
              className="hb-card"
              style={{
                borderColor: "rgba(184,51,26,0.25)",
                background: "rgba(184,51,26,0.03)",
              }}
            >
              <div className="hb-card-body">
                <b style={{ fontSize: 14, color: "#b8331a" }}>
                  Conta suspensa globalmente
                </b>
                <p
                  style={{
                    margin: "4px 0 12px",
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  O usuário não tem acesso a nenhum módulo do ecossistema.
                </p>
                <form action={handleUnsuspendUser}>
                  <input type="hidden" name="userId" value={user.id} />
                  <button
                    type="submit"
                    className="hb-btn hb-btn-secondary hb-btn-sm"
                  >
                    Reativar conta
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Roles card */}
          <div className="hb-card">
            <div className="hb-card-header">
              <h3>Papéis ativos</h3>
              <div className="hb-card-header-actions">
                <Link
                  href={`/configuracoes?tab=roles&userId=${user.id}`}
                  className="hb-btn hb-btn-ghost hb-btn-sm"
                >
                  <Shield size={13} aria-hidden="true" />
                  Gerenciar
                </Link>
              </div>
            </div>
            <div
              className="hb-card-body"
              style={{ paddingTop: 6, paddingBottom: 6 }}
            >
              {roles.length === 0 ? (
                <p style={{ fontSize: 13, color: "#6b7280", padding: "8px 0" }}>
                  Nenhum papel atribuído.
                </p>
              ) : (
                <div
                  className="hb-role-stack"
                  style={{ flexWrap: "wrap", padding: "8px 0" }}
                >
                  {roles.map((r) => (
                    <span key={r} className={`hb-badge hb-role-${r}`}>
                      {ROLE_LABELS[r] ?? r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
